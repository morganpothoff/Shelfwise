import { Router } from 'express';
import db from '../db/index.js';
import { lookupISBN, searchByTitleAuthor } from '../services/isbnLookup.js';
import {
  validateBook,
  validateUnifiedIdParam,
  validateISBNScan,
  validateSearch
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

// Helper to build a de-duplication key from a book (exported for testing)
export function dedupeKey(book) {
  const keys = [];
  if (book.isbn) {
    keys.push(`isbn:${book.isbn}`);
  }
  if (book.title && book.author) {
    keys.push(`ta:${book.title.toLowerCase()}|${book.author.toLowerCase()}`);
  }
  return keys;
}

// Helper to format a library book as a unified completed book (exported for testing)
export function formatLibraryBook(book) {
  return {
    ...book,
    id: `library_${book.id}`,
    source: 'library',
    owned: 1,
    tags: book.tags ? JSON.parse(book.tags) : []
  };
}

// Helper to format a completed book as a unified completed book (exported for testing)
export function formatCompletedBook(book) {
  return {
    ...book,
    id: `completed_${book.id}`,
    source: 'completed',
    tags: book.tags ? JSON.parse(book.tags) : []
  };
}

// GET /api/completed-books - Unified list of all read books for the authenticated user
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;

    // Get library books marked as read
    const libraryBooks = db.prepare(
      "SELECT * FROM books WHERE reading_status = 'read' AND user_id = ?"
    ).all(userId);

    // Get completed books
    const completedBooks = db.prepare(
      'SELECT * FROM books_completed WHERE user_id = ?'
    ).all(userId);

    // Build de-duplication set from library books (library wins)
    const libraryKeys = new Set();
    for (const book of libraryBooks) {
      for (const key of dedupeKey(book)) {
        libraryKeys.add(key);
      }
    }

    // Format library books
    const unified = libraryBooks.map(formatLibraryBook);

    // Add completed books that don't duplicate library books
    for (const book of completedBooks) {
      const keys = dedupeKey(book);
      const isDuplicate = keys.some(key => libraryKeys.has(key));
      if (!isDuplicate) {
        unified.push(formatCompletedBook(book));
      }
    }

    // Sort by date_finished DESC, then created_at DESC
    unified.sort((a, b) => {
      const dateA = a.date_finished || '';
      const dateB = b.date_finished || '';
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      const createdA = a.created_at || '';
      const createdB = b.created_at || '';
      return createdB.localeCompare(createdA);
    });

    res.json(unified);
  } catch (error) {
    handleError(res, error, 'Failed to fetch completed books');
  }
});

// GET /api/completed-books/export - Export unified completed books
router.get('/export', (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'comprehensive', format = 'json' } = req.query;

    // Get unified list (same logic as GET /)
    const libraryBooks = db.prepare(
      "SELECT * FROM books WHERE reading_status = 'read' AND user_id = ?"
    ).all(userId);
    const completedBooks = db.prepare(
      'SELECT * FROM books_completed WHERE user_id = ?'
    ).all(userId);

    const libraryKeys = new Set();
    for (const book of libraryBooks) {
      for (const key of dedupeKey(book)) {
        libraryKeys.add(key);
      }
    }

    const allBooks = [
      ...libraryBooks.map(b => ({ ...b, owned: 1, tags: b.tags ? JSON.parse(b.tags) : [] })),
      ...completedBooks
        .filter(b => !dedupeKey(b).some(k => libraryKeys.has(k)))
        .map(b => ({ ...b, tags: b.tags ? JSON.parse(b.tags) : [] }))
    ];

    allBooks.sort((a, b) => {
      const dateA = a.date_finished || '';
      const dateB = b.date_finished || '';
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      return (a.title || '').localeCompare(b.title || '');
    });

    let exportData;

    if (type === 'minimal') {
      exportData = allBooks.map(book => ({
        isbn: book.isbn || '',
        title: book.title,
        author: book.author || '',
        series_name: book.series_name || '',
        series_position: book.series_position || null,
        date_finished: book.date_finished || '',
        owned: book.owned ? 'yes' : 'no'
      }));
    } else {
      exportData = allBooks.map(book => ({
        isbn: book.isbn || '',
        title: book.title,
        author: book.author || '',
        page_count: book.page_count || null,
        genre: book.genre || '',
        synopsis: book.synopsis || '',
        tags: book.tags || [],
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

// Helper to strip Goodreads ISBN format: ="0060590297" -> 0060590297
function cleanGoodreadsValue(value) {
  if (typeof value !== 'string') return value;
  // Goodreads wraps ISBNs as ="VALUE" — strip the ="..." wrapper
  const match = value.match(/^="?(.*?)"?$/);
  if (match) return match[1];
  return value;
}

// Detect if a parsed CSV looks like a Goodreads export based on header names
function isGoodreadsFormat(headers) {
  const goodreadsHeaders = ['book_id', 'exclusive_shelf', 'bookshelves', 'my_rating', 'average_rating', 'author_l-f'];
  return goodreadsHeaders.filter(h => headers.includes(h)).length >= 3;
}

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
    const goodreads = isGoodreadsFormat(headers);

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const book = {};
      headers.forEach((header, index) => {
        let val = values[index] || '';
        // Clean Goodreads ="..." ISBN format
        if (goodreads && (header === 'isbn' || header === 'isbn13')) {
          val = cleanGoodreadsValue(val);
        }
        book[header] = val;
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

  // Handle Goodreads ISBN format — prefer isbn13, clean ="..." wrapper
  let rawIsbn = book.isbn13 || book.isbn_13 || book.isbn || book.isbn10 || book.isbn_10 || '';
  rawIsbn = String(rawIsbn);
  // Strip Goodreads ="..." wrapper if still present
  rawIsbn = rawIsbn.replace(/^="?(.*?)"?$/, '$1');
  const isbn = rawIsbn.replace(/[-\s]/g, '');

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
  // Goodreads: use bookshelves as tags if no tags provided
  if (tags.length === 0 && book.bookshelves) {
    tags = String(book.bookshelves).split(/[,;]/).map(t => t.trim()).filter(t => t);
  }

  const seriesName = book.series_name || book.series || '';
  const seriesPosition = parseFloat(book.series_position || book.series_number || book.book_number || '') || null;

  // Parse date finished — Goodreads uses YYYY/MM/DD format
  let dateFinished = book.date_finished || book.date_read || book.finished_date || book.read_date || book.date_completed || '';
  if (dateFinished) {
    // Normalize Goodreads YYYY/MM/DD to YYYY-MM-DD
    const slashMatch = String(dateFinished).match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (slashMatch) {
      dateFinished = `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
    } else {
      const parsedDate = new Date(dateFinished);
      if (!isNaN(parsedDate.getTime())) {
        dateFinished = parsedDate.toISOString().split('T')[0];
      } else {
        dateFinished = null;
      }
    }
  } else {
    dateFinished = null;
  }

  // Parse owned flag - default to false unless explicitly yes
  // Goodreads: owned_copies > 0 means owned
  const ownedValue = (book.owned || '').toString().toLowerCase();
  const ownedCopies = parseInt(book.owned_copies || '0', 10);
  const owned = ownedValue === 'yes' || ownedValue === 'true' || ownedValue === '1' || ownedCopies > 0;

  return { title, author, isbn, pageCount, genre, synopsis, tags, seriesName, seriesPosition, dateFinished, owned };
}

// POST /api/completed-books/import/parse - Parse file and lookup ISBNs, return results for user review
router.post('/import/parse', async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, format } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    const allBooks = parseImportData(data, format);

    // For Goodreads imports, filter to only "read" books for the completed books section
    const books = allBooks.filter(book => {
      const shelf = (book.exclusive_shelf || '').toLowerCase().trim();
      // If the book has an exclusive_shelf field (Goodreads), only include "read" books
      if (shelf && shelf !== 'read') return false;
      return true;
    });

    const results = {
      found: [],           // Books with ISBN data found - will be imported with full metadata
      notFound: [],        // Books where ISBN lookup failed - needs manual review
      duplicates: [],      // Books already in completed books table
      libraryUpdates: [],  // Books in library that will be marked as read
      invalid: [],         // Books with missing title
      skippedShelves: allBooks.length - books.length  // Books on other shelves (Goodreads)
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
      skippedShelves: results.skippedShelves || 0,
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
      addedToLibrary: 0,
      failed: 0,
      errors: [],
      books: [],
      updatedLibraryBooks: [],
      newLibraryBooks: []
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
      const insertCompletedStmt = db.prepare(`
        INSERT INTO books_completed (user_id, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, date_finished, owned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertLibraryStmt = db.prepare(`
        INSERT INTO books (user_id, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, reading_status, date_finished)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'read', ?)
      `);

      for (const book of booksToImport) {
        try {
          // Final duplicate check for completed books
          let existingCompleted = null;
          if (book.isbn) {
            existingCompleted = db.prepare('SELECT id FROM books_completed WHERE isbn = ? AND user_id = ?').get(book.isbn, userId);
          }
          if (!existingCompleted && book.title && book.author) {
            existingCompleted = db.prepare('SELECT id FROM books_completed WHERE title = ? AND author = ? AND user_id = ?').get(book.title, book.author, userId);
          }

          if (existingCompleted) {
            results.errors.push(`Skipped "${book.title}": already in completed books`);
            results.failed++;
            continue;
          }

          const tagsJson = Array.isArray(book.tags) ? JSON.stringify(book.tags) : '[]';

          // Insert into completed books
          const result = insertCompletedStmt.run(
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

          // If book is owned, also add to library (if not already there)
          if (book.owned) {
            let existingLibrary = null;
            if (book.isbn) {
              existingLibrary = db.prepare('SELECT id FROM books WHERE isbn = ? AND user_id = ?').get(book.isbn, userId);
            }
            if (!existingLibrary && book.title && book.author) {
              existingLibrary = db.prepare('SELECT id FROM books WHERE LOWER(title) = LOWER(?) AND LOWER(author) = LOWER(?) AND user_id = ?').get(book.title, book.author, userId);
            }

            if (!existingLibrary) {
              try {
                const libraryResult = insertLibraryStmt.run(
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

                const newLibraryBook = db.prepare('SELECT * FROM books WHERE id = ?').get(libraryResult.lastInsertRowid);
                newLibraryBook.tags = newLibraryBook.tags ? JSON.parse(newLibraryBook.tags) : [];
                results.newLibraryBooks.push(newLibraryBook);
                results.addedToLibrary++;
              } catch (libraryErr) {
                console.error(`Failed to add "${book.title}" to library:`, libraryErr.message);
              }
            }
          }
        } catch (err) {
          results.errors.push(`Error importing "${book.title}": ${err.message}`);
          results.failed++;
        }
      }
    }

    const libraryMsg = results.addedToLibrary > 0 ? `, ${results.addedToLibrary} added to library` : '';
    res.json({
      message: `Import complete: ${results.imported} books imported, ${results.updated} library books updated${libraryMsg}, ${results.failed} failed`,
      imported: results.imported,
      updated: results.updated,
      addedToLibrary: results.addedToLibrary,
      failed: results.failed,
      errors: results.errors,
      books: results.books,
      updatedLibraryBooks: results.updatedLibraryBooks,
      newLibraryBooks: results.newLibraryBooks
    });
  } catch (error) {
    handleError(res, error, 'Failed to import completed books');
  }
});

// GET /api/completed-books/series/list - Get all unique series names from both tables
router.get('/series/list', (req, res) => {
  try {
    const userId = req.user.id;
    const series = db.prepare(`
      SELECT DISTINCT series_name FROM (
        SELECT series_name FROM books WHERE reading_status = 'read' AND user_id = ? AND series_name IS NOT NULL AND series_name != ''
        UNION
        SELECT series_name FROM books_completed WHERE user_id = ? AND series_name IS NOT NULL AND series_name != ''
      )
      ORDER BY series_name
    `).all(userId, userId);
    res.json(series.map(s => s.series_name));
  } catch (error) {
    handleError(res, error, 'Failed to fetch series');
  }
});

// POST /api/completed-books/lookup/isbn - Look up book by ISBN (no insert, for add-to-completed flow)
router.post('/lookup/isbn', validateISBNScan, async (req, res) => {
  try {
    const { isbn } = req.body;
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    const bookData = await lookupISBN(cleanIsbn);
    if (!bookData) {
      return res.status(404).json({
        error: 'Book not found',
        message: 'Could not find book information for this ISBN.',
        isbn: cleanIsbn
      });
    }
    res.json({ book: bookData });
  } catch (error) {
    handleError(res, error, 'Failed to lookup book');
  }
});

// POST /api/completed-books/lookup/search - Look up book by title/author (no insert, for add-to-completed flow)
router.post('/lookup/search', validateSearch, async (req, res) => {
  try {
    const { title, author, isbn } = req.body;
    const searchData = await searchByTitleAuthor(title, author, isbn || null);
    if (!searchData.isbn) {
      return res.status(404).json({
        error: 'ISBN not found',
        message: 'Could not find an ISBN for this book.',
        title,
        author
      });
    }
    const bookData = await lookupISBN(searchData.isbn);
    const finalData = bookData || searchData;
    res.json({ book: finalData });
  } catch (error) {
    handleError(res, error, 'Failed to lookup book');
  }
});

// GET /api/completed-books/:id - Get single book from unified view
router.get('/:id', validateUnifiedIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const { source, numericId } = req.params;

    if (source === 'library') {
      const book = db.prepare("SELECT * FROM books WHERE id = ? AND user_id = ? AND reading_status = 'read'").get(numericId, userId);
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
      res.json(formatLibraryBook(book));
    } else {
      const book = db.prepare('SELECT * FROM books_completed WHERE id = ? AND user_id = ?').get(numericId, userId);
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
      res.json(formatCompletedBook(book));
    }
  } catch (error) {
    handleError(res, error, 'Failed to fetch completed book');
  }
});

// POST /api/completed-books - Add completed book manually (always goes to books_completed)
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
    res.status(201).json(formatCompletedBook(newBook));
  } catch (error) {
    handleError(res, error, 'Failed to add completed book');
  }
});

// POST /api/completed-books/:id/add-to-library - Migrate a completed book to the library
router.post('/:id/add-to-library', validateUnifiedIdParam, async (req, res) => {
  try {
    const userId = req.user.id;
    const { source, numericId } = req.params;

    if (source === 'library') {
      return res.status(400).json({ error: 'Book is already in your library' });
    }

    // Get the completed book
    const completedBook = db.prepare('SELECT * FROM books_completed WHERE id = ? AND user_id = ?').get(numericId, userId);
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
      // Book already in library — update it to read status, migrate rating, delete completed entry
      db.prepare("UPDATE books SET reading_status = 'read', date_finished = COALESCE(?, date_finished), updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(completedBook.date_finished, existingLibraryBook.id);

      // Migrate rating if exists
      const completedRating = db.prepare('SELECT * FROM completed_book_ratings WHERE book_id = ? AND user_id = ?').get(numericId, userId);
      if (completedRating) {
        const existingLibraryRating = db.prepare('SELECT id FROM book_ratings WHERE book_id = ? AND user_id = ?').get(existingLibraryBook.id, userId);
        if (!existingLibraryRating) {
          db.prepare('INSERT INTO book_ratings (book_id, user_id, rating, comment) VALUES (?, ?, ?, ?)').run(existingLibraryBook.id, userId, completedRating.rating, completedRating.comment);
        }
        db.prepare('DELETE FROM completed_book_ratings WHERE book_id = ? AND user_id = ?').run(numericId, userId);
      }

      // Delete the completed book entry
      db.prepare('DELETE FROM books_completed WHERE id = ? AND user_id = ?').run(numericId, userId);

      const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(existingLibraryBook.id);
      updatedBook.tags = updatedBook.tags ? JSON.parse(updatedBook.tags) : [];

      return res.status(200).json({
        book: { ...updatedBook, id: `library_${updatedBook.id}`, source: 'library', owned: 1 },
        message: 'Book already exists in library — merged and updated',
        isExisting: true
      });
    }

    // Add to library as a new book
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

    const newLibraryBookId = result.lastInsertRowid;

    // Migrate rating if exists
    const completedRating = db.prepare('SELECT * FROM completed_book_ratings WHERE book_id = ? AND user_id = ?').get(numericId, userId);
    if (completedRating) {
      db.prepare('INSERT INTO book_ratings (book_id, user_id, rating, comment) VALUES (?, ?, ?, ?)').run(newLibraryBookId, userId, completedRating.rating, completedRating.comment);
      db.prepare('DELETE FROM completed_book_ratings WHERE book_id = ? AND user_id = ?').run(numericId, userId);
    }

    // Delete the completed book entry
    db.prepare('DELETE FROM books_completed WHERE id = ? AND user_id = ?').run(numericId, userId);

    const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(newLibraryBookId);
    newBook.tags = newBook.tags ? JSON.parse(newBook.tags) : [];

    res.status(201).json({
      book: { ...newBook, id: `library_${newBook.id}`, source: 'library', owned: 1 },
      message: 'Book added to library successfully',
      isExisting: false
    });
  } catch (error) {
    handleError(res, error, 'Failed to add book to library');
  }
});

// PUT /api/completed-books/:id - Update book in unified view
router.put('/:id', validateUnifiedIdParam, validateBook, (req, res) => {
  try {
    const userId = req.user.id;
    const { source, numericId } = req.params;
    const { title, author, page_count, genre, synopsis, tags, series_name, series_position, date_finished, owned } = req.body;

    if (source === 'library') {
      const existing = db.prepare("SELECT * FROM books WHERE id = ? AND user_id = ? AND reading_status = 'read'").get(numericId, userId);
      if (!existing) {
        return res.status(404).json({ error: 'Book not found' });
      }

      db.prepare(`
        UPDATE books
        SET title = ?, author = ?, page_count = ?, genre = ?, synopsis = ?, tags = ?,
            series_name = ?, series_position = ?, date_finished = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).run(
        title ?? existing.title,
        author ?? existing.author,
        page_count ?? existing.page_count,
        genre ?? existing.genre,
        synopsis ?? existing.synopsis,
        Array.isArray(tags) ? JSON.stringify(tags) : tags ?? existing.tags,
        series_name !== undefined ? series_name : existing.series_name,
        series_position !== undefined ? series_position : existing.series_position,
        date_finished !== undefined ? date_finished : existing.date_finished,
        numericId,
        userId
      );

      const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(numericId);
      res.json(formatLibraryBook(updatedBook));
    } else {
      const existing = db.prepare('SELECT * FROM books_completed WHERE id = ? AND user_id = ?').get(numericId, userId);
      if (!existing) {
        return res.status(404).json({ error: 'Book not found' });
      }

      db.prepare(`
        UPDATE books_completed
        SET title = ?, author = ?, page_count = ?, genre = ?, synopsis = ?, tags = ?,
            series_name = ?, series_position = ?, date_finished = ?, owned = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).run(
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
        numericId,
        userId
      );

      const updatedBook = db.prepare('SELECT * FROM books_completed WHERE id = ?').get(numericId);
      res.json(formatCompletedBook(updatedBook));
    }
  } catch (error) {
    handleError(res, error, 'Failed to update completed book');
  }
});

// DELETE /api/completed-books/:id - Remove from unified view
router.delete('/:id', validateUnifiedIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const { source, numericId } = req.params;

    if (source === 'library') {
      // Don't delete the book — just mark as unread and clear date_finished
      const result = db.prepare(`
        UPDATE books SET reading_status = 'unread', date_finished = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ? AND reading_status = 'read'
      `).run(numericId, userId);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Book not found' });
      }
      res.json({ message: 'Book marked as unread' });
    } else {
      const result = db.prepare('DELETE FROM books_completed WHERE id = ? AND user_id = ?').run(numericId, userId);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Book not found' });
      }
      res.json({ message: 'Completed book deleted successfully' });
    }
  } catch (error) {
    handleError(res, error, 'Failed to delete completed book');
  }
});

// ============ COMPLETED BOOK RATINGS (unified) ============

// GET /api/completed-books/:id/rating - Get rating for a book in the unified view
router.get('/:id/rating', validateUnifiedIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const { source, numericId } = req.params;

    if (source === 'library') {
      const book = db.prepare("SELECT id FROM books WHERE id = ? AND user_id = ? AND reading_status = 'read'").get(numericId, userId);
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
      const rating = db.prepare('SELECT * FROM book_ratings WHERE book_id = ? AND user_id = ?').get(numericId, userId);
      res.json(rating || null);
    } else {
      const book = db.prepare('SELECT id FROM books_completed WHERE id = ? AND user_id = ?').get(numericId, userId);
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
      const rating = db.prepare('SELECT * FROM completed_book_ratings WHERE book_id = ? AND user_id = ?').get(numericId, userId);
      res.json(rating || null);
    }
  } catch (error) {
    handleError(res, error, 'Failed to fetch rating');
  }
});

// POST /api/completed-books/:id/rating - Create or update rating
router.post('/:id/rating', validateUnifiedIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const { source, numericId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    if (comment && comment.length > 5000) {
      return res.status(400).json({ error: 'Comment must be less than 5000 characters' });
    }

    const ratingsTable = source === 'library' ? 'book_ratings' : 'completed_book_ratings';
    const booksTable = source === 'library' ? 'books' : 'books_completed';
    const bookCondition = source === 'library'
      ? "id = ? AND user_id = ? AND reading_status = 'read'"
      : 'id = ? AND user_id = ?';

    const book = db.prepare(`SELECT id FROM ${booksTable} WHERE ${bookCondition}`).get(numericId, userId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const existingRating = db.prepare(`SELECT id FROM ${ratingsTable} WHERE book_id = ? AND user_id = ?`).get(numericId, userId);

    if (existingRating) {
      db.prepare(`
        UPDATE ${ratingsTable}
        SET rating = ?, comment = ?, updated_at = CURRENT_TIMESTAMP
        WHERE book_id = ? AND user_id = ?
      `).run(rating, comment || null, numericId, userId);
    } else {
      db.prepare(`
        INSERT INTO ${ratingsTable} (book_id, user_id, rating, comment)
        VALUES (?, ?, ?, ?)
      `).run(numericId, userId, rating, comment || null);
    }

    const savedRating = db.prepare(`SELECT * FROM ${ratingsTable} WHERE book_id = ? AND user_id = ?`).get(numericId, userId);
    res.status(existingRating ? 200 : 201).json(savedRating);
  } catch (error) {
    handleError(res, error, 'Failed to save rating');
  }
});

// DELETE /api/completed-books/:id/rating - Delete rating
router.delete('/:id/rating', validateUnifiedIdParam, (req, res) => {
  try {
    const userId = req.user.id;
    const { source, numericId } = req.params;

    const ratingsTable = source === 'library' ? 'book_ratings' : 'completed_book_ratings';
    const booksTable = source === 'library' ? 'books' : 'books_completed';
    const bookCondition = source === 'library'
      ? "id = ? AND user_id = ? AND reading_status = 'read'"
      : 'id = ? AND user_id = ?';

    const book = db.prepare(`SELECT id FROM ${booksTable} WHERE ${bookCondition}`).get(numericId, userId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const result = db.prepare(`DELETE FROM ${ratingsTable} WHERE book_id = ? AND user_id = ?`).run(numericId, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    handleError(res, error, 'Failed to delete rating');
  }
});

export default router;
