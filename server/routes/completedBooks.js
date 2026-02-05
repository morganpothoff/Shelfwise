import { Router } from 'express';
import db from '../db/index.js';
import { lookupISBN, searchByTitleAuthor, searchEnglishISBN } from '../services/isbnLookup.js';
import {
  validateBook,
  validateIdParam
} from '../middleware/validation.js';

const router = Router();

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Helper to sanitize error messages
function handleError(res, error, publicMessage) {
  console.error(publicMessage + ':', error);
  res.status(500).json({ error: isProduction ? publicMessage : error.message });
}

// Helper to parse tags
function parseBookTags(book) {
  return {
    ...book,
    tags: book.tags ? JSON.parse(book.tags) : []
  };
}

// GET /api/completed-books - List all completed books for the current user
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const books = db.prepare(`
      SELECT * FROM completed_books
      WHERE user_id = ?
      ORDER BY date_finished DESC, created_at DESC
    `).all(userId);

    const parsedBooks = books.map(parseBookTags);
    res.json(parsedBooks);
  } catch (error) {
    handleError(res, error, 'Failed to fetch completed books');
  }
});

// GET /api/completed-books/:id - Get single completed book
router.get('/:id', validateIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const book = db.prepare(`
      SELECT * FROM completed_books
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, userId);

    if (!book) {
      return res.status(404).json({ error: 'Completed book not found' });
    }

    res.json(parseBookTags(book));
  } catch (error) {
    handleError(res, error, 'Failed to fetch completed book');
  }
});

// POST /api/completed-books - Add a completed book manually
router.post('/', validateBook, (req, res) => {
  try {
    const userId = req.user.id;
    const { isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, date_finished, library_book_id } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO completed_books (user_id, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, date_finished, library_book_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      isbn || null,
      title,
      author || null,
      page_count || null,
      genre || null,
      synopsis || null,
      Array.isArray(tags) ? JSON.stringify(tags) : '[]',
      series_name || null,
      series_position || null,
      date_finished || null,
      library_book_id || null
    );

    const newBook = db.prepare('SELECT * FROM completed_books WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(parseBookTags(newBook));
  } catch (error) {
    handleError(res, error, 'Failed to add completed book');
  }
});

// PUT /api/completed-books/:id - Update completed book
router.put('/:id', validateIdParam, validateBook, (req, res) => {
  try {
    const userId = req.user.id;
    const bookId = req.params.id;
    const { title, author, page_count, genre, synopsis, tags, series_name, series_position, date_finished } = req.body;

    const existing = db.prepare('SELECT * FROM completed_books WHERE id = ? AND user_id = ?').get(bookId, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Completed book not found' });
    }

    const stmt = db.prepare(`
      UPDATE completed_books
      SET title = ?, author = ?, page_count = ?, genre = ?, synopsis = ?, tags = ?,
          series_name = ?, series_position = ?, date_finished = ?, updated_at = CURRENT_TIMESTAMP
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
      date_finished !== undefined ? date_finished : existing.date_finished,
      bookId,
      userId
    );

    const updatedBook = db.prepare('SELECT * FROM completed_books WHERE id = ?').get(bookId);
    res.json(parseBookTags(updatedBook));
  } catch (error) {
    handleError(res, error, 'Failed to update completed book');
  }
});

// DELETE /api/completed-books/:id - Delete completed book
router.delete('/:id', validateIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const result = db.prepare('DELETE FROM completed_books WHERE id = ? AND user_id = ?').run(req.params.id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Completed book not found' });
    }

    res.json({ message: 'Completed book deleted successfully' });
  } catch (error) {
    handleError(res, error, 'Failed to delete completed book');
  }
});

// POST /api/completed-books/:id/add-to-library - Add a completed book to the user's library
router.post('/:id/add-to-library', validateIdParam, async (req, res) => {
  try {
    const userId = req.user.id;
    const completedBook = db.prepare('SELECT * FROM completed_books WHERE id = ? AND user_id = ?').get(req.params.id, userId);

    if (!completedBook) {
      return res.status(404).json({ error: 'Completed book not found' });
    }

    // Check if already linked to a library book
    if (completedBook.library_book_id) {
      const existingLibraryBook = db.prepare('SELECT * FROM books WHERE id = ?').get(completedBook.library_book_id);
      if (existingLibraryBook) {
        return res.status(409).json({
          error: 'Book already in library',
          book: parseBookTags(existingLibraryBook)
        });
      }
    }

    // Check if a book with this ISBN already exists in library
    if (completedBook.isbn) {
      const existingByIsbn = db.prepare('SELECT * FROM books WHERE isbn = ?').get(completedBook.isbn);
      if (existingByIsbn) {
        // Link the completed book to the existing library book
        db.prepare('UPDATE completed_books SET library_book_id = ? WHERE id = ?').run(existingByIsbn.id, completedBook.id);
        return res.status(200).json({
          book: parseBookTags(existingByIsbn),
          message: 'Book already exists in library, linked completed book to it',
          isExisting: true
        });
      }
    }

    // Add the book to the library
    const stmt = db.prepare(`
      INSERT INTO books (isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      completedBook.isbn,
      completedBook.title,
      completedBook.author,
      completedBook.page_count,
      completedBook.genre,
      completedBook.synopsis,
      completedBook.tags,
      completedBook.series_name,
      completedBook.series_position
    );

    // Update the completed book to reference the new library book
    db.prepare('UPDATE completed_books SET library_book_id = ? WHERE id = ?').run(result.lastInsertRowid, completedBook.id);

    const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      book: parseBookTags(newBook),
      message: 'Book added to library successfully',
      isExisting: false
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'A book with this ISBN already exists in library' });
    }
    handleError(res, error, 'Failed to add book to library');
  }
});

// POST /api/completed-books/import - Import completed books from CSV/JSON data
router.post('/import', async (req, res) => {
  try {
    const userId = req.user.id;
    const { books: booksToImport } = req.body;

    if (!Array.isArray(booksToImport) || booksToImport.length === 0) {
      return res.status(400).json({ error: 'No books provided for import' });
    }

    const results = {
      imported: [],
      needsReview: [],
      errors: []
    };

    for (const bookData of booksToImport) {
      try {
        const result = await processBookImport(bookData, userId);
        if (result.needsReview) {
          results.needsReview.push(result);
        } else {
          results.imported.push(result.book);
        }
      } catch (error) {
        results.errors.push({
          book: bookData,
          error: error.message
        });
      }
    }

    res.json(results);
  } catch (error) {
    handleError(res, error, 'Failed to import books');
  }
});

// Helper function to process a single book import
async function processBookImport(bookData, userId) {
  const { isbn, title, author, date_finished, date_completed, owned } = bookData;
  const dateFinished = date_finished || date_completed || null;
  const shouldAddToLibrary = owned?.toString().toLowerCase() === 'yes';

  // Step 1: Is the ISBN provided?
  if (isbn) {
    const cleanIsbn = isbn.toString().replace(/[-\s]/g, '');

    // Check if it's in the user's library
    const libraryBook = db.prepare('SELECT * FROM books WHERE isbn = ?').get(cleanIsbn);

    if (libraryBook) {
      // Book is in library - check if already marked as completed
      const existingCompleted = db.prepare(`
        SELECT * FROM completed_books
        WHERE user_id = ? AND library_book_id = ?
      `).get(userId, libraryBook.id);

      if (existingCompleted) {
        // Update the date if provided
        if (dateFinished) {
          db.prepare('UPDATE completed_books SET date_finished = ? WHERE id = ?').run(dateFinished, existingCompleted.id);
        }
        const updated = db.prepare('SELECT * FROM completed_books WHERE id = ?').get(existingCompleted.id);
        return { book: parseBookTags(updated), needsReview: false };
      }

      // Add as completed and link to library book
      const stmt = db.prepare(`
        INSERT INTO completed_books (user_id, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, date_finished, library_book_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        userId,
        libraryBook.isbn,
        libraryBook.title,
        libraryBook.author,
        libraryBook.page_count,
        libraryBook.genre,
        libraryBook.synopsis,
        libraryBook.tags,
        libraryBook.series_name,
        libraryBook.series_position,
        dateFinished,
        libraryBook.id
      );
      const newCompleted = db.prepare('SELECT * FROM completed_books WHERE id = last_insert_rowid()').get();
      return { book: parseBookTags(newCompleted), needsReview: false };
    }

    // ISBN not in library - look it up
    const lookupData = await lookupISBN(cleanIsbn);
    if (lookupData) {
      return await createCompletedBook(lookupData, userId, dateFinished, shouldAddToLibrary);
    }
  }

  // Step 2: Is the title present with an author?
  if (title && author) {
    // Look up English version ISBN
    const englishIsbn = await searchEnglishISBN(title, author);

    if (englishIsbn) {
      // Found an English ISBN - look up full book data
      const lookupData = await lookupISBN(englishIsbn);
      if (lookupData) {
        return await createCompletedBook(lookupData, userId, dateFinished, shouldAddToLibrary);
      }
    }

    // No English ISBN found - needs manual review
    return {
      needsReview: true,
      originalData: bookData,
      reason: 'Could not find English version ISBN',
      title,
      author,
      date_finished: dateFinished
    };
  }

  // Not enough information - needs manual review
  return {
    needsReview: true,
    originalData: bookData,
    reason: 'Missing required fields (need ISBN or both title and author)',
    title: title || null,
    author: author || null,
    date_finished: dateFinished
  };
}

// Helper to create a completed book entry
async function createCompletedBook(bookData, userId, dateFinished, shouldAddToLibrary) {
  let libraryBookId = null;

  // Check if should add to library
  if (shouldAddToLibrary) {
    // Check if already in library by ISBN
    if (bookData.isbn) {
      const existingLibrary = db.prepare('SELECT id FROM books WHERE isbn = ?').get(bookData.isbn);
      if (existingLibrary) {
        libraryBookId = existingLibrary.id;
      } else {
        // Add to library
        const libStmt = db.prepare(`
          INSERT INTO books (isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const libResult = libStmt.run(
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
        libraryBookId = libResult.lastInsertRowid;
      }
    }
  }

  // Create completed book entry
  const stmt = db.prepare(`
    INSERT INTO completed_books (user_id, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, date_finished, library_book_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    userId,
    bookData.isbn,
    bookData.title,
    bookData.author,
    bookData.page_count,
    bookData.genre,
    bookData.synopsis,
    bookData.tags,
    bookData.series_name,
    bookData.series_position,
    dateFinished,
    libraryBookId
  );

  const newCompleted = db.prepare('SELECT * FROM completed_books WHERE id = last_insert_rowid()').get();
  return { book: parseBookTags(newCompleted), needsReview: false };
}

// POST /api/completed-books/import/manual - Add a book from manual review (without additional lookup)
router.post('/import/manual', async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, author, isbn, date_finished, addToLibrary } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let libraryBookId = null;

    // If addToLibrary is true, add it to the library first
    if (addToLibrary) {
      const cleanIsbn = isbn ? isbn.toString().replace(/[-\s]/g, '') : null;

      // Check if already in library by ISBN
      if (cleanIsbn) {
        const existingLibrary = db.prepare('SELECT id FROM books WHERE isbn = ?').get(cleanIsbn);
        if (existingLibrary) {
          libraryBookId = existingLibrary.id;
        }
      }

      if (!libraryBookId) {
        const libStmt = db.prepare(`
          INSERT INTO books (isbn, title, author)
          VALUES (?, ?, ?)
        `);
        const libResult = libStmt.run(cleanIsbn, title, author || null);
        libraryBookId = libResult.lastInsertRowid;
      }
    }

    // Create completed book entry with minimal data
    const stmt = db.prepare(`
      INSERT INTO completed_books (user_id, isbn, title, author, date_finished, library_book_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const cleanIsbn = isbn ? isbn.toString().replace(/[-\s]/g, '') : null;
    stmt.run(userId, cleanIsbn, title, author || null, date_finished || null, libraryBookId);

    const newCompleted = db.prepare('SELECT * FROM completed_books WHERE id = last_insert_rowid()').get();
    res.status(201).json(parseBookTags(newCompleted));
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'A book with this ISBN already exists in library' });
    }
    handleError(res, error, 'Failed to add book from manual review');
  }
});

export default router;
