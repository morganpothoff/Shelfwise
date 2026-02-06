import { Router } from 'express';
import db from '../db/index.js';
import { lookupISBN, searchByTitleAuthor } from '../services/isbnLookup.js';
import {
  validateBook,
  validateIdParam
} from '../middleware/validation.js';
import * as XLSX from 'xlsx';

const router = Router();

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Helper to sanitize error messages
function handleError(res, error, publicMessage) {
  console.error(publicMessage + ':', error);
  res.status(500).json({ error: isProduction ? publicMessage : error.message });
}

// GET /api/completed-books - List all completed books for the authenticated user
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const books = db.prepare('SELECT * FROM books_completed WHERE user_id = ? ORDER BY date_finished DESC, created_at DESC').all(userId);
    // Parse tags JSON for each book
    const parsedBooks = books.map(book => ({
      ...book,
      tags: book.tags ? JSON.parse(book.tags) : []
    }));
    res.json(parsedBooks);
  } catch (error) {
    handleError(res, error, 'Failed to fetch completed books');
  }
});

// GET /api/completed-books/export - Export completed books for the authenticated user
router.get('/export', (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'comprehensive', format = 'json' } = req.query;

    const books = db.prepare('SELECT * FROM books_completed WHERE user_id = ? ORDER BY date_finished DESC, title').all(userId);

    let exportData;

    if (type === 'minimal') {
      exportData = books.map(book => ({
        isbn: book.isbn || '',
        title: book.title,
        author: book.author || '',
        series_name: book.series_name || '',
        series_position: book.series_position || null,
        date_finished: book.date_finished || '',
        owned: book.owned ? 'yes' : 'no'
      }));
    } else {
      exportData = books.map(book => ({
        isbn: book.isbn || '',
        title: book.title,
        author: book.author || '',
        page_count: book.page_count || null,
        genre: book.genre || '',
        synopsis: book.synopsis || '',
        tags: book.tags ? JSON.parse(book.tags) : [],
        series_name: book.series_name || '',
        series_position: book.series_position || null,
        date_finished: book.date_finished || '',
        owned: book.owned ? 'yes' : 'no',
        created_at: book.created_at,
        updated_at: book.updated_at
      }));
    }

    if (format === 'csv') {
      const headers = type === 'minimal'
        ? ['isbn', 'title', 'author', 'series_name', 'series_position', 'date_finished', 'owned']
        : ['isbn', 'title', 'author', 'page_count', 'genre', 'synopsis', 'tags', 'series_name', 'series_position', 'date_finished', 'owned', 'created_at', 'updated_at'];

      const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const str = Array.isArray(value) ? value.join('; ') : String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = [
        headers.join(','),
        ...exportData.map(book => headers.map(h => escapeCSV(book[h])).join(','))
      ];

      const csv = csvRows.join('\n');
      const filename = `shelfwise-completed-books-${type}-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    const filename = `shelfwise-completed-books-${type}-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({
      exportedAt: new Date().toISOString(),
      exportType: type,
      totalBooks: exportData.length,
      books: exportData
    });
  } catch (error) {
    handleError(res, error, 'Failed to export completed books');
  }
});

// Helper function to parse import file data
function parseImportData(data, format) {
  let books = [];

  if (format === 'json') {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    books = Array.isArray(parsed) ? parsed : (parsed.books || []);
  } else if (format === 'csv') {
    const lines = data.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have a header row and at least one data row');
    }

    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const book = {};
      headers.forEach((header, index) => {
        book[header] = values[index] || '';
      });
      books.push(book);
    }
  } else if (format === 'xlsx' || format === 'xls') {
    const buffer = Buffer.from(data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    books = jsonData.map(row => {
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
        normalizedRow[normalizedKey] = row[key];
      });
      return normalizedRow;
    });
  } else {
    throw new Error('Unsupported format. Use json, csv, xlsx, or xls');
  }

  return books;
}

// Helper to extract and normalize book fields from import row
function normalizeBookFields(book) {
  const title = book.title || book.book_title || book.name || '';
  const author = book.author || book.authors || book.book_author || '';
  const isbn = String(book.isbn || book.isbn13 || book.isbn_13 || book.isbn10 || book.isbn_10 || '').replace(/[-\s]/g, '');
  const pageCount = parseInt(book.page_count || book.pages || book.num_pages || book.number_of_pages || '', 10) || null;
  const genre = book.genre || book.genres || book.category || '';
  const synopsis = book.synopsis || book.description || book.summary || '';

  let tags = [];
  if (book.tags) {
    if (Array.isArray(book.tags)) {
      tags = book.tags;
    } else if (typeof book.tags === 'string') {
      tags = book.tags.split(/[,;]/).map(t => t.trim()).filter(t => t);
    }
  }

  const seriesName = book.series_name || book.series || '';
  const seriesPosition = parseFloat(book.series_position || book.series_number || book.book_number || '') || null;

  // Parse date finished
  let dateFinished = book.date_finished || book.date_read || book.finished_date || book.read_date || book.date_completed || '';
  if (dateFinished) {
    const parsedDate = new Date(dateFinished);
    if (!isNaN(parsedDate.getTime())) {
      dateFinished = parsedDate.toISOString().split('T')[0];
    } else {
      dateFinished = null;
    }
  } else {
    dateFinished = null;
  }

  // Parse owned flag - default to false unless explicitly yes
  const ownedValue = (book.owned || '').toString().toLowerCase();
  const owned = ownedValue === 'yes' || ownedValue === 'true' || ownedValue === '1';

  return { title, author, isbn, pageCount, genre, synopsis, tags, seriesName, seriesPosition, dateFinished, owned };
}

// POST /api/completed-books/import/parse - Parse file and lookup ISBNs, return results for user review
// Flow for importing read books:
// 1. Is ISBN provided?
//    a. Yes - is it in user's library (books table)?
//       i. Yes - update the book to be listed as read, update date if provided (handled separately)
//       ii. No - go to step 2
//    b. No - go to step 2
// 2. Is title present with author?
//    a. Yes - look up ENGLISH version ISBN
//       i. ISBN found - import book by ISBN as is done with scanning feature
//       ii. No - add to list of books to manually review
//    b. No - add to list of books to manually review
router.post('/import/parse', async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, format } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    const books = parseImportData(data, format);

    const results = {
      found: [],           // Books with ISBN data found - will be imported with full metadata
      notFound: [],        // Books where ISBN lookup failed - needs manual review
      duplicates: [],      // Books already in completed books table
      libraryUpdates: [],  // Books in library that will be marked as read
      invalid: []          // Books with missing title
    };

    for (const book of books) {
      const normalized = normalizeBookFields(book);

      // Invalid: missing title
      if (!normalized.title) {
        results.invalid.push({ original: book, reason: 'Missing title' });
        continue;
      }

      // Check if already in completed books table
      let existingCompleted = null;
      if (normalized.isbn) {
        existingCompleted = db.prepare('SELECT id, title FROM books_completed WHERE isbn = ? AND user_id = ?').get(normalized.isbn, userId);
      }
      if (!existingCompleted && normalized.title && normalized.author) {
        existingCompleted = db.prepare('SELECT id, title FROM books_completed WHERE LOWER(title) = LOWER(?) AND LOWER(author) = LOWER(?) AND user_id = ?').get(normalized.title, normalized.author, userId);
      }

      if (existingCompleted) {
        results.duplicates.push({
          original: normalized,
          existingId: existingCompleted.id,
          existingTitle: existingCompleted.title
        });
        continue;
      }

      // Step 1: Check if ISBN is in user's library
      let libraryBook = null;
      if (normalized.isbn) {
        libraryBook = db.prepare('SELECT id, title, reading_status, date_finished FROM books WHERE isbn = ? AND user_id = ?').get(normalized.isbn, userId);
      }

      if (libraryBook) {
        // Step 1a.i: Book is in library - will update to read status
        results.libraryUpdates.push({
          original: normalized,
          libraryBookId: libraryBook.id,
          libraryTitle: libraryBook.title,
          currentStatus: libraryBook.reading_status,
          currentDateFinished: libraryBook.date_finished,
          newDateFinished: normalized.dateFinished
        });
        continue;
      }

      // Step 2: Look up book by title/author to find English ISBN
      let lookupData = null;
      let foundIsbn = null;

      try {
        // Step 2a: Title and author present - search for English ISBN
        if (normalized.title && normalized.author) {
          const searchResult = await searchByTitleAuthor(normalized.title, normalized.author, normalized.isbn);

          if (searchResult && searchResult.isbn) {
            foundIsbn = searchResult.isbn;

            // Check if this found ISBN is already in completed books
            const existingByFoundIsbn = db.prepare('SELECT id, title FROM books_completed WHERE isbn = ? AND user_id = ?').get(foundIsbn, userId);
            if (existingByFoundIsbn) {
              results.duplicates.push({
                original: normalized,
                existingId: existingByFoundIsbn.id,
                existingTitle: existingByFoundIsbn.title
              });
              continue;
            }

            // Also check if it's in the library
            const libraryByFoundIsbn = db.prepare('SELECT id, title, reading_status, date_finished FROM books WHERE isbn = ? AND user_id = ?').get(foundIsbn, userId);
            if (libraryByFoundIsbn) {
              results.libraryUpdates.push({
                original: normalized,
                libraryBookId: libraryByFoundIsbn.id,
                libraryTitle: libraryByFoundIsbn.title,
                currentStatus: libraryByFoundIsbn.reading_status,
                currentDateFinished: libraryByFoundIsbn.date_finished,
                newDateFinished: normalized.dateFinished
              });
              continue;
            }

            // Step 2a.i: ISBN found - look up full metadata (like scan feature)
            lookupData = await lookupISBN(foundIsbn);
            if (!lookupData) {
              // If lookupISBN fails, use the search result data
              lookupData = searchResult;
            }
          }
        } else if (normalized.title && normalized.isbn) {
          // Has title and ISBN but no author - try direct ISBN lookup
          lookupData = await lookupISBN(normalized.isbn);
          if (lookupData) {
            foundIsbn = normalized.isbn;
          }
        }
      } catch (err) {
        console.error(`Lookup failed for "${normalized.title}":`, err.message);
      }

      if (lookupData && foundIsbn) {
        // Book found with metadata - will be imported like scan feature
        const seriesName = lookupData.series_name || normalized.seriesName || null;
        const seriesPosition = lookupData.series_position ?? normalized.seriesPosition ?? null;

        results.found.push({
          original: normalized,
          lookup: {
            isbn: foundIsbn,
            title: lookupData.title || normalized.title,
            author: lookupData.author || normalized.author,
            page_count: lookupData.page_count || normalized.pageCount,
            genre: lookupData.genre || normalized.genre,
            synopsis: lookupData.synopsis || normalized.synopsis,
            tags: lookupData.tags ? (typeof lookupData.tags === 'string' ? JSON.parse(lookupData.tags) : lookupData.tags) : normalized.tags,
            series_name: seriesName,
            series_position: seriesPosition,
            date_finished: normalized.dateFinished,
            owned: normalized.owned
          }
        });
      } else {
        // Step 2a.ii / 2b: No ISBN found - add to manual review list
        results.notFound.push({
          original: normalized,
          fallback: {
            isbn: null,
            title: normalized.title,
            author: normalized.author || null,
            page_count: normalized.pageCount,
            genre: normalized.genre || null,
            synopsis: normalized.synopsis || null,
            tags: normalized.tags || [],
            series_name: normalized.seriesName || null,
            series_position: normalized.seriesPosition,
            date_finished: normalized.dateFinished,
            owned: normalized.owned
          }
        });
      }
    }

    res.json({
      total: books.length,
      found: results.found.length,
      notFound: results.notFound.length,
      duplicates: results.duplicates.length,
      libraryUpdates: results.libraryUpdates.length,
      invalid: results.invalid.length,
      results
    });
  } catch (error) {
    handleError(res, error, 'Failed to parse import file');
  }
});

// POST /api/completed-books/import/confirm - Actually import the confirmed books
router.post('/import/confirm', async (req, res) => {
  try {
    const userId = req.user.id;
    const { booksToImport, libraryUpdates } = req.body;

    const results = {
      imported: 0,
      updated: 0,
      failed: 0,
      errors: [],
      books: [],
      updatedLibraryBooks: []
    };

    // Process library updates - mark existing library books as read
    if (libraryUpdates && Array.isArray(libraryUpdates)) {
      const updateStmt = db.prepare(`
        UPDATE books
        SET reading_status = 'read', date_finished = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `);

      for (const update of libraryUpdates) {
        try {
          updateStmt.run(update.newDateFinished || null, update.libraryBookId, userId);
          const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(update.libraryBookId);
          if (updatedBook) {
            updatedBook.tags = updatedBook.tags ? JSON.parse(updatedBook.tags) : [];
            results.updatedLibraryBooks.push(updatedBook);
            results.updated++;
          }
        } catch (err) {
          results.errors.push(`Error updating library book "${update.libraryTitle}": ${err.message}`);
          results.failed++;
        }
      }
    }

    // Process new completed books
    if (booksToImport && Array.isArray(booksToImport)) {
      const insertStmt = db.prepare(`
        INSERT INTO books_completed (user_id, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, date_finished, owned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const book of booksToImport) {
        try {
          // Final duplicate check
          let existingBook = null;
          if (book.isbn) {
            existingBook = db.prepare('SELECT id FROM books_completed WHERE isbn = ? AND user_id = ?').get(book.isbn, userId);
          }
          if (!existingBook && book.title && book.author) {
            existingBook = db.prepare('SELECT id FROM books_completed WHERE title = ? AND author = ? AND user_id = ?').get(book.title, book.author, userId);
          }

          if (existingBook) {
            results.errors.push(`Skipped "${book.title}": already in completed books`);
            results.failed++;
            continue;
          }

          const tagsJson = Array.isArray(book.tags) ? JSON.stringify(book.tags) : '[]';

          const result = insertStmt.run(
            userId,
            book.isbn || null,
            book.title,
            book.author || null,
            book.page_count || null,
            book.genre || null,
            book.synopsis || null,
            tagsJson,
            book.series_name || null,
            book.series_position || null,
            book.date_finished || null,
            book.owned ? 1 : 0
          );

          const newBook = db.prepare('SELECT * FROM books_completed WHERE id = ?').get(result.lastInsertRowid);
          newBook.tags = newBook.tags ? JSON.parse(newBook.tags) : [];
          results.books.push(newBook);
          results.imported++;
        } catch (err) {
          results.errors.push(`Error importing "${book.title}": ${err.message}`);
          results.failed++;
        }
      }
    }

    res.json({
      message: `Import complete: ${results.imported} books imported, ${results.updated} library books updated, ${results.failed} failed`,
      imported: results.imported,
      updated: results.updated,
      failed: results.failed,
      errors: results.errors,
      books: results.books,
      updatedLibraryBooks: results.updatedLibraryBooks
    });
  } catch (error) {
    handleError(res, error, 'Failed to import completed books');
  }
});

// GET /api/completed-books/series/list - Get all unique series names for completed books
router.get('/series/list', (req, res) => {
  try {
    const userId = req.user.id;
    const series = db.prepare(`
      SELECT DISTINCT series_name
      FROM books_completed
      WHERE user_id = ? AND series_name IS NOT NULL AND series_name != ''
      ORDER BY series_name
    `).all(userId);
    res.json(series.map(s => s.series_name));
  } catch (error) {
    handleError(res, error, 'Failed to fetch series');
  }
});

// GET /api/completed-books/:id - Get single completed book
router.get('/:id', validateIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const book = db.prepare('SELECT * FROM books_completed WHERE id = ? AND user_id = ?').get(req.params.id, userId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    book.tags = book.tags ? JSON.parse(book.tags) : [];
    res.json(book);
  } catch (error) {
    handleError(res, error, 'Failed to fetch completed book');
  }
});

// POST /api/completed-books - Add completed book manually
router.post('/', validateBook, (req, res) => {
  try {
    const userId = req.user.id;
    const { isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, date_finished, owned } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO books_completed (user_id, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, date_finished, owned)
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
      owned ? 1 : 0
    );

    const newBook = db.prepare('SELECT * FROM books_completed WHERE id = ?').get(result.lastInsertRowid);
    newBook.tags = newBook.tags ? JSON.parse(newBook.tags) : [];

    res.status(201).json(newBook);
  } catch (error) {
    handleError(res, error, 'Failed to add completed book');
  }
});

// POST /api/completed-books/:id/add-to-library - Add a completed book to the user's library
router.post('/:id/add-to-library', validateIdParam, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookId = req.params.id;

    // Get the completed book
    const completedBook = db.prepare('SELECT * FROM books_completed WHERE id = ? AND user_id = ?').get(bookId, userId);
    if (!completedBook) {
      return res.status(404).json({ error: 'Completed book not found' });
    }

    // Check if already in library by ISBN or title+author
    let existingLibraryBook = null;
    if (completedBook.isbn) {
      existingLibraryBook = db.prepare('SELECT * FROM books WHERE isbn = ? AND user_id = ?').get(completedBook.isbn, userId);
    }
    if (!existingLibraryBook && completedBook.title && completedBook.author) {
      existingLibraryBook = db.prepare('SELECT * FROM books WHERE LOWER(title) = LOWER(?) AND LOWER(author) = LOWER(?) AND user_id = ?').get(completedBook.title, completedBook.author, userId);
    }

    if (existingLibraryBook) {
      existingLibraryBook.tags = existingLibraryBook.tags ? JSON.parse(existingLibraryBook.tags) : [];
      return res.status(200).json({
        book: existingLibraryBook,
        message: 'Book already exists in library',
        isExisting: true
      });
    }

    // Add to library
    const insertStmt = db.prepare(`
      INSERT INTO books (user_id, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, reading_status, date_finished)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'read', ?)
    `);

    const result = insertStmt.run(
      userId,
      completedBook.isbn,
      completedBook.title,
      completedBook.author,
      completedBook.page_count,
      completedBook.genre,
      completedBook.synopsis,
      completedBook.tags,
      completedBook.series_name,
      completedBook.series_position,
      completedBook.date_finished
    );

    const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    newBook.tags = newBook.tags ? JSON.parse(newBook.tags) : [];

    // Update the completed book to mark as owned
    db.prepare('UPDATE books_completed SET owned = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(bookId);

    res.status(201).json({
      book: newBook,
      message: 'Book added to library successfully',
      isExisting: false
    });
  } catch (error) {
    handleError(res, error, 'Failed to add book to library');
  }
});

// PUT /api/completed-books/:id - Update completed book
router.put('/:id', validateIdParam, validateBook, (req, res) => {
  try {
    const userId = req.user.id;
    const { title, author, page_count, genre, synopsis, tags, series_name, series_position, date_finished, owned } = req.body;
    const bookId = req.params.id;

    const existing = db.prepare('SELECT * FROM books_completed WHERE id = ? AND user_id = ?').get(bookId, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const stmt = db.prepare(`
      UPDATE books_completed
      SET title = ?, author = ?, page_count = ?, genre = ?, synopsis = ?, tags = ?,
          series_name = ?, series_position = ?, date_finished = ?, owned = ?, updated_at = CURRENT_TIMESTAMP
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
      owned !== undefined ? (owned ? 1 : 0) : existing.owned,
      bookId,
      userId
    );

    const updatedBook = db.prepare('SELECT * FROM books_completed WHERE id = ?').get(bookId);
    updatedBook.tags = updatedBook.tags ? JSON.parse(updatedBook.tags) : [];

    res.json(updatedBook);
  } catch (error) {
    handleError(res, error, 'Failed to update completed book');
  }
});

// DELETE /api/completed-books/:id - Delete completed book
router.delete('/:id', validateIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const result = db.prepare('DELETE FROM books_completed WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Completed book deleted successfully' });
  } catch (error) {
    handleError(res, error, 'Failed to delete completed book');
  }
});

// ============ COMPLETED BOOK RATINGS ============

// GET /api/completed-books/:id/rating - Get rating for a completed book
router.get('/:id/rating', validateIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const bookId = req.params.id;

    const book = db.prepare('SELECT id FROM books_completed WHERE id = ? AND user_id = ?').get(bookId, userId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const rating = db.prepare('SELECT * FROM completed_book_ratings WHERE book_id = ? AND user_id = ?').get(bookId, userId);
    res.json(rating || null);
  } catch (error) {
    handleError(res, error, 'Failed to fetch rating');
  }
});

// POST /api/completed-books/:id/rating - Create or update rating for a completed book
router.post('/:id/rating', validateIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const bookId = req.params.id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    if (comment && comment.length > 5000) {
      return res.status(400).json({ error: 'Comment must be less than 5000 characters' });
    }

    const book = db.prepare('SELECT id FROM books_completed WHERE id = ? AND user_id = ?').get(bookId, userId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const existingRating = db.prepare('SELECT id FROM completed_book_ratings WHERE book_id = ? AND user_id = ?').get(bookId, userId);

    if (existingRating) {
      db.prepare(`
        UPDATE completed_book_ratings
        SET rating = ?, comment = ?, updated_at = CURRENT_TIMESTAMP
        WHERE book_id = ? AND user_id = ?
      `).run(rating, comment || null, bookId, userId);
    } else {
      db.prepare(`
        INSERT INTO completed_book_ratings (book_id, user_id, rating, comment)
        VALUES (?, ?, ?, ?)
      `).run(bookId, userId, rating, comment || null);
    }

    const savedRating = db.prepare('SELECT * FROM completed_book_ratings WHERE book_id = ? AND user_id = ?').get(bookId, userId);
    res.status(existingRating ? 200 : 201).json(savedRating);
  } catch (error) {
    handleError(res, error, 'Failed to save rating');
  }
});

// DELETE /api/completed-books/:id/rating - Delete rating for a completed book
router.delete('/:id/rating', validateIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const bookId = req.params.id;

    const book = db.prepare('SELECT id FROM books_completed WHERE id = ? AND user_id = ?').get(bookId, userId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const result = db.prepare('DELETE FROM completed_book_ratings WHERE book_id = ? AND user_id = ?').run(bookId, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    handleError(res, error, 'Failed to delete rating');
  }
});

export default router;
