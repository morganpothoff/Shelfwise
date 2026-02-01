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

// GET /api/books - List all books
router.get('/', (req, res) => {
  try {
    const books = db.prepare('SELECT * FROM books ORDER BY created_at DESC').all();
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

// GET /api/books/series/list - Get all unique series names (must be before /:id)
router.get('/series/list', (req, res) => {
  try {
    const series = db.prepare(`
      SELECT DISTINCT series_name
      FROM books
      WHERE series_name IS NOT NULL AND series_name != ''
      ORDER BY series_name
    `).all();
    res.json(series.map(s => s.series_name));
  } catch (error) {
    handleError(res, error, 'Failed to fetch series');
  }
});

// GET /api/books/:id - Get single book
router.get('/:id', validateIdParam, (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
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
    const { isbn, title, author, page_count, genre, synopsis, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO books (isbn, title, author, page_count, genre, synopsis, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
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
router.post('/search', validateSearch, async (req, res) => {
  try {
    const { title, author, isbn } = req.body;

    // Search for book data from external APIs
    const bookData = await searchByTitleAuthor(title, author, isbn);

    // Insert the book into the database
    const stmt = db.prepare(`
      INSERT INTO books (isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
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
    handleError(res, error, 'Failed to add book');
  }
});

// POST /api/books/scan - Add book via ISBN scan
router.post('/scan', validateISBNScan, async (req, res) => {
  try {
    const { isbn } = req.body;

    // Clean the ISBN
    const cleanIsbn = isbn.replace(/[-\s]/g, '');

    // Check if book already exists
    const existingBook = db.prepare('SELECT * FROM books WHERE isbn = ?').get(cleanIsbn);
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
      INSERT INTO books (isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
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

// PUT /api/books/:id - Update book
router.put('/:id', validateIdParam, validateBook, (req, res) => {
  try {
    const { title, author, page_count, genre, synopsis, tags, series_name, series_position } = req.body;
    const bookId = req.params.id;

    const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    if (!existing) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const stmt = db.prepare(`
      UPDATE books
      SET title = ?, author = ?, page_count = ?, genre = ?, synopsis = ?, tags = ?,
          series_name = ?, series_position = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
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
      bookId
    );

    const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    updatedBook.tags = updatedBook.tags ? JSON.parse(updatedBook.tags) : [];

    res.json(updatedBook);
  } catch (error) {
    handleError(res, error, 'Failed to update book');
  }
});

// DELETE /api/books/:id - Delete book
router.delete('/:id', validateIdParam, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    handleError(res, error, 'Failed to delete book');
  }
});

export default router;
