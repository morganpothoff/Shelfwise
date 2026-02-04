import { Router } from 'express';
import db from '../db/index.js';
import { lookupISBN, searchByTitleAuthor } from '../services/isbnLookup.js';
import {
  validateBook,
  validateISBNScan,
  validateSearch,
  validateIdParam
} from '../middleware/validation.js';

const router = Router();

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Helper to sanitize error messages
function handleError(res, error, publicMessage) {
  console.error(publicMessage + ':', error);

  // Handle known error types
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'A book with this ISBN already exists' });
  }

  // Don't leak internal details in production
  res.status(500).json({ error: isProduction ? publicMessage : error.message });
}

// GET /api/books - List all books for the authenticated user
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const books = db.prepare('SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    // Parse tags JSON for each book
    const parsedBooks = books.map(book => ({
      ...book,
      tags: book.tags ? JSON.parse(book.tags) : []
    }));
    res.json(parsedBooks);
  } catch (error) {
    handleError(res, error, 'Failed to fetch books');
  }
});

// GET /api/books/series/list - Get all unique series names for the authenticated user (must be before /:id)
router.get('/series/list', (req, res) => {
  try {
    const userId = req.user.id;
    const series = db.prepare(`
      SELECT DISTINCT series_name
      FROM books
      WHERE user_id = ? AND series_name IS NOT NULL AND series_name != ''
      ORDER BY series_name
    `).all(userId);
    res.json(series.map(s => s.series_name));
  } catch (error) {
    handleError(res, error, 'Failed to fetch series');
  }
});

// GET /api/books/:id - Get single book (only if owned by authenticated user)
router.get('/:id', validateIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const book = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(req.params.id, userId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    book.tags = book.tags ? JSON.parse(book.tags) : [];
    res.json(book);
  } catch (error) {
    handleError(res, error, 'Failed to fetch book');
  }
});

// POST /api/books - Add book manually
router.post('/', validateBook, (req, res) => {
  try {
    const userId = req.user.id;
    const { isbn, title, author, page_count, genre, synopsis, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO books (user_id, isbn, title, author, page_count, genre, synopsis, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      isbn || null,
      title,
      author || null,
      page_count || null,
      genre || null,
      synopsis || null,
      Array.isArray(tags) ? JSON.stringify(tags) : '[]'
    );

    const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    newBook.tags = newBook.tags ? JSON.parse(newBook.tags) : [];

    res.status(201).json(newBook);
  } catch (error) {
    handleError(res, error, 'Failed to add book');
  }
});

// POST /api/books/search - Search and add book by title/author
// Requires finding an ISBN before adding - book is added as if scanned by ISBN
router.post('/search', validateSearch, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, author, isbn } = req.body;

    // Search for book data from external APIs to find an ISBN
    const searchData = await searchByTitleAuthor(title, author, isbn);

    // ISBN is required - if not found, return an error
    if (!searchData.isbn) {
      return res.status(404).json({
        error: 'ISBN not found',
        message: 'Could not find an ISBN for this book. Please try a different title/author or add using an ISBN directly.',
        title,
        author
      });
    }

    const foundIsbn = searchData.isbn;

    // Check if book already exists for this user (same as ISBN scan flow)
    const existingBook = db.prepare('SELECT * FROM books WHERE isbn = ? AND user_id = ?').get(foundIsbn, userId);
    if (existingBook) {
      existingBook.tags = existingBook.tags ? JSON.parse(existingBook.tags) : [];
      return res.status(200).json({
        book: existingBook,
        message: 'Book already exists in library',
        isExisting: true
      });
    }

    // Look up complete book data using the found ISBN (same as ISBN scan flow)
    const bookData = await lookupISBN(foundIsbn);

    // Use the ISBN lookup data, falling back to search data if lookup fails
    const finalData = bookData || searchData;

    // Insert the book into the database
    const stmt = db.prepare(`
      INSERT INTO books (user_id, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      foundIsbn,
      finalData.title,
      finalData.author,
      finalData.page_count,
      finalData.genre,
      finalData.synopsis,
      finalData.tags,
      finalData.series_name,
      finalData.series_position
    );

    const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    newBook.tags = newBook.tags ? JSON.parse(newBook.tags) : [];

    res.status(201).json({
      book: newBook,
      message: 'Book added successfully',
      isExisting: false
    });
  } catch (error) {
    handleError(res, error, 'Failed to add book');
  }
});

// POST /api/books/scan - Add book via ISBN scan
router.post('/scan', validateISBNScan, async (req, res) => {
  try {
    const userId = req.user.id;
    const { isbn } = req.body;

    // Clean the ISBN
    const cleanIsbn = isbn.replace(/[-\s]/g, '');

    // Check if book already exists for this user
    const existingBook = db.prepare('SELECT * FROM books WHERE isbn = ? AND user_id = ?').get(cleanIsbn, userId);
    if (existingBook) {
      existingBook.tags = existingBook.tags ? JSON.parse(existingBook.tags) : [];
      return res.status(200).json({
        book: existingBook,
        message: 'Book already exists in library',
        isExisting: true
      });
    }

    // Look up book data from external APIs
    const bookData = await lookupISBN(cleanIsbn);

    if (!bookData) {
      return res.status(404).json({
        error: 'Book not found',
        message: 'Could not find book information for this ISBN. You can add it manually.',
        isbn: cleanIsbn
      });
    }

    // Insert the book into the database
    const stmt = db.prepare(`
      INSERT INTO books (user_id, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      bookData.isbn,
      bookData.title,
      bookData.author,
      bookData.page_count,
      bookData.genre,
      bookData.synopsis,
      bookData.tags,
      bookData.series_name,
      bookData.series_position
    );

    const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    newBook.tags = newBook.tags ? JSON.parse(newBook.tags) : [];

    res.status(201).json({
      book: newBook,
      message: 'Book added successfully',
      isExisting: false
    });
  } catch (error) {
    handleError(res, error, 'Failed to scan book');
  }
});

// PUT /api/books/:id - Update book (only if owned by authenticated user)
router.put('/:id', validateIdParam, validateBook, (req, res) => {
  try {
    const userId = req.user.id;
    const { title, author, page_count, genre, synopsis, tags, series_name, series_position } = req.body;
    const bookId = req.params.id;

    const existing = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(bookId, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const stmt = db.prepare(`
      UPDATE books
      SET title = ?, author = ?, page_count = ?, genre = ?, synopsis = ?, tags = ?,
          series_name = ?, series_position = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(
      title ?? existing.title,
      author ?? existing.author,
      page_count ?? existing.page_count,
      genre ?? existing.genre,
      synopsis ?? existing.synopsis,
      Array.isArray(tags) ? JSON.stringify(tags) : tags ?? existing.tags,
      series_name !== undefined ? series_name : existing.series_name,
      series_position !== undefined ? series_position : existing.series_position,
      bookId,
      userId
    );

    const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    updatedBook.tags = updatedBook.tags ? JSON.parse(updatedBook.tags) : [];

    res.json(updatedBook);
  } catch (error) {
    handleError(res, error, 'Failed to update book');
  }
});

// DELETE /api/books/:id - Delete book (only if owned by authenticated user)
router.delete('/:id', validateIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const result = db.prepare('DELETE FROM books WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    handleError(res, error, 'Failed to delete book');
  }
});

// ============ BOOK RATINGS ============

// GET /api/books/:id/rating - Get rating for a book (only the authenticated user's rating)
router.get('/:id/rating', validateIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const bookId = req.params.id;

    // Verify the book belongs to the user
    const book = db.prepare('SELECT id FROM books WHERE id = ? AND user_id = ?').get(bookId, userId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const rating = db.prepare('SELECT * FROM book_ratings WHERE book_id = ? AND user_id = ?').get(bookId, userId);
    res.json(rating || null);
  } catch (error) {
    handleError(res, error, 'Failed to fetch rating');
  }
});

// POST /api/books/:id/rating - Create or update rating for a book
router.post('/:id/rating', validateIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const bookId = req.params.id;
    const { rating, comment } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // Validate comment length
    if (comment && comment.length > 5000) {
      return res.status(400).json({ error: 'Comment must be less than 5000 characters' });
    }

    // Verify the book belongs to the user
    const book = db.prepare('SELECT id FROM books WHERE id = ? AND user_id = ?').get(bookId, userId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if rating already exists
    const existingRating = db.prepare('SELECT id FROM book_ratings WHERE book_id = ? AND user_id = ?').get(bookId, userId);

    if (existingRating) {
      // Update existing rating
      db.prepare(`
        UPDATE book_ratings
        SET rating = ?, comment = ?, updated_at = CURRENT_TIMESTAMP
        WHERE book_id = ? AND user_id = ?
      `).run(rating, comment || null, bookId, userId);
    } else {
      // Create new rating
      db.prepare(`
        INSERT INTO book_ratings (book_id, user_id, rating, comment)
        VALUES (?, ?, ?, ?)
      `).run(bookId, userId, rating, comment || null);
    }

    const savedRating = db.prepare('SELECT * FROM book_ratings WHERE book_id = ? AND user_id = ?').get(bookId, userId);
    res.status(existingRating ? 200 : 201).json(savedRating);
  } catch (error) {
    handleError(res, error, 'Failed to save rating');
  }
});

// DELETE /api/books/:id/rating - Delete rating for a book
router.delete('/:id/rating', validateIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const bookId = req.params.id;

    // Verify the book belongs to the user
    const book = db.prepare('SELECT id FROM books WHERE id = ? AND user_id = ?').get(bookId, userId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const result = db.prepare('DELETE FROM book_ratings WHERE book_id = ? AND user_id = ?').run(bookId, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    handleError(res, error, 'Failed to delete rating');
  }
});

export default router;
