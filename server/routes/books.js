import { Router } from 'express';
import db from '../db/index.js';
import { lookupISBN, searchByTitleAuthor } from '../services/isbnLookup.js';
import {
  validateBook,
  validateISBNScan,
  validateSearch,
  validateIdParam
} from '../middleware/validation.js';
import * as XLSX from 'xlsx';

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

// GET /api/books/export - Export books for the authenticated user
// Query params: type=comprehensive|minimal, format=json|csv
router.get('/export', (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'comprehensive', format = 'json' } = req.query;

    // Fetch all books for the user
    const books = db.prepare('SELECT * FROM books WHERE user_id = ? ORDER BY series_name, series_position, title').all(userId);

    let exportData;

    if (type === 'minimal') {
      // Minimal export: ISBN, title, series info, and author only
      exportData = books.map(book => ({
        isbn: book.isbn || '',
        title: book.title,
        author: book.author || '',
        series_name: book.series_name || '',
        series_position: book.series_position || null
      }));
    } else {
      // Comprehensive export: all book data with parsed tags
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
        reading_status: book.reading_status || 'unread',
        date_finished: book.date_finished || '',
        created_at: book.created_at,
        updated_at: book.updated_at
      }));
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = type === 'minimal'
        ? ['isbn', 'title', 'author', 'series_name', 'series_position']
        : ['isbn', 'title', 'author', 'page_count', 'genre', 'synopsis', 'tags', 'series_name', 'series_position', 'reading_status', 'date_finished', 'created_at', 'updated_at'];

      const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const str = Array.isArray(value) ? value.join('; ') : String(value);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
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
      const filename = `shelfwise-library-${type}-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    // Default: JSON format
    const filename = `shelfwise-library-${type}-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({
      exportedAt: new Date().toISOString(),
      exportType: type,
      totalBooks: exportData.length,
      books: exportData
    });
  } catch (error) {
    handleError(res, error, 'Failed to export books');
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

  let readingStatus = (book.reading_status || book.status || book.read_status || '').toLowerCase();
  if (readingStatus === 'read' || readingStatus === 'finished' || readingStatus === 'completed') {
    readingStatus = 'read';
  } else if (readingStatus === 'reading' || readingStatus === 'currently_reading' || readingStatus === 'in_progress') {
    readingStatus = 'reading';
  } else {
    readingStatus = 'unread';
  }

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

  if (dateFinished && readingStatus === 'unread') {
    readingStatus = 'read';
  }

  return { title, author, isbn, pageCount, genre, synopsis, tags, seriesName, seriesPosition, readingStatus, dateFinished };
}

// POST /api/books/import/parse - Parse file and lookup ISBNs, return results for user review
// Flow:
// 1. Is ISBN provided?
//    a. Yes - is it in user's library?
//       i. Yes - skip (duplicate)
//       ii. No - go to step 2
//    b. No - go to step 2
// 2. Is title present with author?
//    a. Yes - look up English version ISBN
//       i. ISBN found - import with full metadata (like scan feature)
//       ii. No ISBN found - add to manual review list
//    b. No - add to manual review list (or invalid if no title)
// 3. Books in manual review get added WITHOUT additional info if user selects "add anyway"
router.post('/import/parse', async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, format } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    const books = parseImportData(data, format);

    const results = {
      found: [],      // Books with ISBN data found - will be imported with full metadata
      notFound: [],   // Books where ISBN lookup failed - needs manual review
      duplicates: [], // Books already in library (by ISBN)
      invalid: []     // Books with missing title
    };

    for (const book of books) {
      const normalized = normalizeBookFields(book);

      // Invalid: missing title
      if (!normalized.title) {
        results.invalid.push({ original: book, reason: 'Missing title' });
        continue;
      }

      // Step 1: Check for duplicates by ISBN OR title+author
      let existingBook = null;

      // Check by ISBN first (if provided)
      if (normalized.isbn) {
        existingBook = db.prepare('SELECT id, title FROM books WHERE isbn = ? AND user_id = ?').get(normalized.isbn, userId);
      }

      // Also check by title+author combination
      if (!existingBook && normalized.title && normalized.author) {
        existingBook = db.prepare('SELECT id, title FROM books WHERE LOWER(title) = LOWER(?) AND LOWER(author) = LOWER(?) AND user_id = ?').get(normalized.title, normalized.author, userId);
      }

      if (existingBook) {
        // Already in library - skip
        results.duplicates.push({
          original: normalized,
          existingId: existingBook.id,
          existingTitle: existingBook.title
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

            // Check if this found ISBN is already in library
            const existingByFoundIsbn = db.prepare('SELECT id, title FROM books WHERE isbn = ? AND user_id = ?').get(foundIsbn, userId);
            if (existingByFoundIsbn) {
              results.duplicates.push({
                original: normalized,
                existingId: existingByFoundIsbn.id,
                existingTitle: existingByFoundIsbn.title
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
            reading_status: normalized.readingStatus,
            date_finished: normalized.dateFinished
          }
        });
      } else {
        // Step 2a.ii / 2b: No ISBN found - add to manual review list
        // These books will be added with ONLY the basic info from import file if user selects "add anyway"
        results.notFound.push({
          original: normalized,
          fallback: {
            isbn: null, // No valid ISBN found
            title: normalized.title,
            author: normalized.author || null,
            page_count: normalized.pageCount,
            genre: normalized.genre || null,
            synopsis: normalized.synopsis || null,
            tags: normalized.tags || [],
            series_name: normalized.seriesName || null,
            series_position: normalized.seriesPosition,
            reading_status: normalized.readingStatus,
            date_finished: normalized.dateFinished
          }
        });
      }
    }

    res.json({
      total: books.length,
      found: results.found.length,
      notFound: results.notFound.length,
      duplicates: results.duplicates.length,
      invalid: results.invalid.length,
      results
    });
  } catch (error) {
    handleError(res, error, 'Failed to parse import file');
  }
});

// POST /api/books/import/confirm - Actually import the confirmed books
router.post('/import/confirm', async (req, res) => {
  try {
    const userId = req.user.id;
    const { booksToImport } = req.body;

    if (!booksToImport || !Array.isArray(booksToImport)) {
      return res.status(400).json({ error: 'No books provided' });
    }

    const results = {
      imported: 0,
      failed: 0,
      errors: [],
      books: []
    };

    const insertStmt = db.prepare(`
      INSERT INTO books (user_id, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, reading_status, date_finished)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCompletedStmt = db.prepare(`
      INSERT INTO books_completed (user_id, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, date_finished, owned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    for (const book of booksToImport) {
      try {
        // Final duplicate check
        let existingBook = null;
        if (book.isbn) {
          existingBook = db.prepare('SELECT id FROM books WHERE isbn = ? AND user_id = ?').get(book.isbn, userId);
        }
        if (!existingBook && book.title && book.author) {
          existingBook = db.prepare('SELECT id FROM books WHERE title = ? AND author = ? AND user_id = ?').get(book.title, book.author, userId);
        }

        if (existingBook) {
          results.errors.push(`Skipped "${book.title}": already in library`);
          results.failed++;
          continue;
        }

        const tagsJson = Array.isArray(book.tags) ? JSON.stringify(book.tags) : '[]';
        const readingStatus = book.reading_status || 'unread';

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
          readingStatus,
          book.date_finished || null
        );

        // If book is marked as read, also add to books_completed
        if (readingStatus === 'read') {
          // Check if already in books_completed
          let existingCompleted = null;
          if (book.isbn) {
            existingCompleted = db.prepare('SELECT id FROM books_completed WHERE isbn = ? AND user_id = ?').get(book.isbn, userId);
          }
          if (!existingCompleted && book.title && book.author) {
            existingCompleted = db.prepare('SELECT id FROM books_completed WHERE LOWER(title) = LOWER(?) AND LOWER(author) = LOWER(?) AND user_id = ?').get(book.title, book.author, userId);
          }

          if (existingCompleted) {
            // Update existing completed book
            db.prepare(`
              UPDATE books_completed
              SET title = ?, author = ?, page_count = ?, genre = ?, synopsis = ?, tags = ?,
                  series_name = ?, series_position = ?, date_finished = ?, owned = 1, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(
              book.title,
              book.author || null,
              book.page_count || null,
              book.genre || null,
              book.synopsis || null,
              tagsJson,
              book.series_name || null,
              book.series_position || null,
              book.date_finished || null,
              existingCompleted.id
            );
          } else {
            // Insert new completed book
            insertCompletedStmt.run(
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
              book.date_finished || null
            );
          }
        }

        const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
        newBook.tags = newBook.tags ? JSON.parse(newBook.tags) : [];
        results.books.push(newBook);
        results.imported++;
      } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          results.errors.push(`Skipped "${book.title}": duplicate ISBN`);
        } else {
          results.errors.push(`Error importing "${book.title}": ${err.message}`);
        }
        results.failed++;
      }
    }

    res.json({
      message: `Import complete: ${results.imported} books imported, ${results.failed} failed`,
      imported: results.imported,
      failed: results.failed,
      errors: results.errors,
      books: results.books
    });
  } catch (error) {
    handleError(res, error, 'Failed to import books');
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
    const { title, author, page_count, genre, synopsis, tags, series_name, series_position, reading_status, date_finished } = req.body;
    const bookId = req.params.id;

    const existing = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(bookId, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Validate reading_status if provided
    const validStatuses = ['unread', 'reading', 'read'];
    if (reading_status && !validStatuses.includes(reading_status)) {
      return res.status(400).json({ error: 'Invalid reading status. Must be: unread, reading, or read' });
    }

    const stmt = db.prepare(`
      UPDATE books
      SET title = ?, author = ?, page_count = ?, genre = ?, synopsis = ?, tags = ?,
          series_name = ?, series_position = ?, reading_status = ?, date_finished = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);

    const finalReadingStatus = reading_status !== undefined ? reading_status : existing.reading_status;
    const finalDateFinished = date_finished !== undefined ? date_finished : existing.date_finished;
    const finalTitle = title ?? existing.title;
    const finalAuthor = author ?? existing.author;
    const finalPageCount = page_count ?? existing.page_count;
    const finalGenre = genre ?? existing.genre;
    const finalSynopsis = synopsis ?? existing.synopsis;
    const finalTags = Array.isArray(tags) ? JSON.stringify(tags) : tags ?? existing.tags;
    const finalSeriesName = series_name !== undefined ? series_name : existing.series_name;
    const finalSeriesPosition = series_position !== undefined ? series_position : existing.series_position;

    stmt.run(
      finalTitle,
      finalAuthor,
      finalPageCount,
      finalGenre,
      finalSynopsis,
      finalTags,
      finalSeriesName,
      finalSeriesPosition,
      finalReadingStatus,
      finalDateFinished,
      bookId,
      userId
    );

    // If book is marked as read, add/update it in books_completed table
    if (finalReadingStatus === 'read') {
      // Check if already in books_completed by ISBN or title+author
      let existingCompleted = null;
      if (existing.isbn) {
        existingCompleted = db.prepare('SELECT id FROM books_completed WHERE isbn = ? AND user_id = ?').get(existing.isbn, userId);
      }
      if (!existingCompleted && finalTitle && finalAuthor) {
        existingCompleted = db.prepare('SELECT id FROM books_completed WHERE LOWER(title) = LOWER(?) AND LOWER(author) = LOWER(?) AND user_id = ?').get(finalTitle, finalAuthor, userId);
      }

      if (existingCompleted) {
        // Update existing completed book
        db.prepare(`
          UPDATE books_completed
          SET title = ?, author = ?, page_count = ?, genre = ?, synopsis = ?, tags = ?,
              series_name = ?, series_position = ?, date_finished = ?, owned = 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          finalTitle,
          finalAuthor,
          finalPageCount,
          finalGenre,
          finalSynopsis,
          finalTags,
          finalSeriesName,
          finalSeriesPosition,
          finalDateFinished,
          existingCompleted.id
        );
      } else {
        // Insert new completed book
        db.prepare(`
          INSERT INTO books_completed (user_id, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, date_finished, owned)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
          userId,
          existing.isbn,
          finalTitle,
          finalAuthor,
          finalPageCount,
          finalGenre,
          finalSynopsis,
          finalTags,
          finalSeriesName,
          finalSeriesPosition,
          finalDateFinished
        );
      }
    }

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
