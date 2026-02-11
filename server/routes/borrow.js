import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production';

function handleError(res, error, publicMessage) {
  console.error(publicMessage + ':', error);
  res.status(500).json({ error: isProduction ? publicMessage : error.message });
}

// POST /api/borrow/request - Send a borrow request
router.post('/request', (req, res) => {
  try {
    const userId = req.user.id;
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ error: 'Book ID is required' });
    }

    const parsedBookId = parseInt(bookId, 10);
    if (isNaN(parsedBookId) || parsedBookId < 1) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    // Look up the book
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(parsedBookId);

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Cannot borrow your own book
    if (book.user_id === userId) {
      return res.status(400).json({ error: 'You cannot borrow your own book' });
    }

    // Verify friendship
    const friendship = db.prepare(
      'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?'
    ).get(userId, book.user_id);

    if (!friendship) {
      return res.status(403).json({ error: 'You must be friends with the book owner' });
    }

    // Check book is available
    if (book.visibility === 'not_available') {
      return res.status(400).json({ error: 'This book is not available' });
    }

    if (book.visibility === 'hidden') {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (book.borrow_status) {
      return res.status(400).json({ error: 'This book is already borrowed' });
    }

    // Check for existing pending request
    const existingPending = db.prepare(
      `SELECT id FROM borrow_requests
       WHERE from_user_id = ? AND book_id = ? AND status = 'pending'`
    ).get(userId, parsedBookId);

    if (existingPending) {
      return res.status(409).json({ error: 'You already have a pending request for this book' });
    }

    // Delete any previously declined request to allow re-requesting
    db.prepare(
      `DELETE FROM borrow_requests
       WHERE from_user_id = ? AND book_id = ? AND status = 'declined'`
    ).run(userId, parsedBookId);

    // Create the borrow request
    const result = db.prepare(
      'INSERT INTO borrow_requests (from_user_id, to_user_id, book_id, status) VALUES (?, ?, ?, ?)'
    ).run(userId, book.user_id, parsedBookId, 'pending');

    res.status(201).json({
      message: 'Borrow request sent!',
      requestId: result.lastInsertRowid
    });
  } catch (error) {
    handleError(res, error, 'Failed to send borrow request');
  }
});

// GET /api/borrow/requests - Get pending borrow requests for current user (as book owner)
router.get('/requests', (req, res) => {
  try {
    const userId = req.user.id;

    const requests = db.prepare(`
      SELECT br.id, br.from_user_id, br.book_id, br.status, br.created_at,
             u.email as from_email, u.name as from_name,
             b.title as book_title, b.author as book_author
      FROM borrow_requests br
      JOIN users u ON br.from_user_id = u.id
      JOIN books b ON br.book_id = b.id
      WHERE br.to_user_id = ? AND br.status = 'pending'
      ORDER BY br.created_at DESC
    `).all(userId);

    res.json(requests);
  } catch (error) {
    handleError(res, error, 'Failed to fetch borrow requests');
  }
});

// GET /api/borrow/requests/count - Get pending borrow request count
router.get('/requests/count', (req, res) => {
  try {
    const userId = req.user.id;
    const result = db.prepare(
      `SELECT COUNT(*) as count FROM borrow_requests WHERE to_user_id = ? AND status = 'pending'`
    ).get(userId);
    res.json({ count: result.count });
  } catch (error) {
    handleError(res, error, 'Failed to fetch borrow request count');
  }
});

// POST /api/borrow/requests/:id/accept - Accept a borrow request
router.post('/requests/:id/accept', (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = parseInt(req.params.id, 10);

    if (isNaN(requestId) || requestId < 1) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    const request = db.prepare(
      `SELECT * FROM borrow_requests WHERE id = ? AND to_user_id = ? AND status = 'pending'`
    ).get(requestId, userId);

    if (!request) {
      return res.status(404).json({ error: 'Borrow request not found' });
    }

    const acceptTransaction = db.transaction(() => {
      // Accept this request
      db.prepare("UPDATE borrow_requests SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(requestId);

      // Update the book to mark as borrowed
      db.prepare("UPDATE books SET borrowed_by_user_id = ?, borrow_status = 'borrowed' WHERE id = ?")
        .run(request.from_user_id, request.book_id);

      // Decline any other pending requests for the same book
      db.prepare(
        `UPDATE borrow_requests SET status = 'declined', updated_at = CURRENT_TIMESTAMP
         WHERE book_id = ? AND status = 'pending' AND id != ?`
      ).run(request.book_id, requestId);
    });

    acceptTransaction();

    res.json({ message: 'Borrow request accepted!' });
  } catch (error) {
    handleError(res, error, 'Failed to accept borrow request');
  }
});

// POST /api/borrow/requests/:id/decline - Decline a borrow request
router.post('/requests/:id/decline', (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = parseInt(req.params.id, 10);

    if (isNaN(requestId) || requestId < 1) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    const request = db.prepare(
      `SELECT * FROM borrow_requests WHERE id = ? AND to_user_id = ? AND status = 'pending'`
    ).get(requestId, userId);

    if (!request) {
      return res.status(404).json({ error: 'Borrow request not found' });
    }

    db.prepare("UPDATE borrow_requests SET status = 'declined', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(requestId);

    res.json({ message: 'Borrow request declined' });
  } catch (error) {
    handleError(res, error, 'Failed to decline borrow request');
  }
});

// GET /api/borrow/lending - Get books current user has lent out
router.get('/lending', (req, res) => {
  try {
    const userId = req.user.id;

    const books = db.prepare(`
      SELECT b.id, b.title, b.author, b.isbn, b.borrow_status,
             b.borrowed_by_user_id, b.series_name, b.series_position,
             u.name as borrower_name, u.email as borrower_email
      FROM books b
      JOIN users u ON b.borrowed_by_user_id = u.id
      WHERE b.user_id = ? AND b.borrow_status IS NOT NULL
      ORDER BY b.title ASC
    `).all(userId);

    res.json(books);
  } catch (error) {
    handleError(res, error, 'Failed to fetch lending books');
  }
});

// GET /api/borrow/borrowing - Get books current user is borrowing
router.get('/borrowing', (req, res) => {
  try {
    const userId = req.user.id;

    const books = db.prepare(`
      SELECT b.id, b.title, b.author, b.isbn, b.borrow_status,
             b.user_id as owner_id, b.series_name, b.series_position,
             u.name as owner_name, u.email as owner_email
      FROM books b
      JOIN users u ON b.user_id = u.id
      WHERE b.borrowed_by_user_id = ? AND b.borrow_status IS NOT NULL
      ORDER BY b.title ASC
    `).all(userId);

    res.json(books);
  } catch (error) {
    handleError(res, error, 'Failed to fetch borrowing books');
  }
});

// POST /api/borrow/:bookId/request-return - Owner requests book back
router.post('/:bookId/request-return', (req, res) => {
  try {
    const userId = req.user.id;
    const bookId = parseInt(req.params.bookId, 10);

    if (isNaN(bookId) || bookId < 1) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const book = db.prepare(
      "SELECT * FROM books WHERE id = ? AND user_id = ? AND borrow_status = 'borrowed'"
    ).get(bookId, userId);

    if (!book) {
      return res.status(404).json({ error: 'Borrowed book not found' });
    }

    const returnTransaction = db.transaction(() => {
      // Update book status
      db.prepare("UPDATE books SET borrow_status = 'return_requested' WHERE id = ?")
        .run(bookId);

      // Update the corresponding borrow request
      db.prepare(
        `UPDATE borrow_requests SET status = 'return_requested', updated_at = CURRENT_TIMESTAMP
         WHERE book_id = ? AND from_user_id = ? AND status = 'accepted'`
      ).run(bookId, book.borrowed_by_user_id);
    });

    returnTransaction();

    res.json({ message: 'Return requested' });
  } catch (error) {
    handleError(res, error, 'Failed to request return');
  }
});

// POST /api/borrow/:bookId/acknowledge-return - Borrower acknowledges return
router.post('/:bookId/acknowledge-return', (req, res) => {
  try {
    const userId = req.user.id;
    const bookId = parseInt(req.params.bookId, 10);

    if (isNaN(bookId) || bookId < 1) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const book = db.prepare(
      "SELECT * FROM books WHERE id = ? AND borrowed_by_user_id = ? AND borrow_status = 'return_requested'"
    ).get(bookId, userId);

    if (!book) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    const acknowledgeTransaction = db.transaction(() => {
      // Clear borrow status on the book
      db.prepare("UPDATE books SET borrowed_by_user_id = NULL, borrow_status = NULL WHERE id = ?")
        .run(bookId);

      // Update the borrow request record
      db.prepare(
        `UPDATE borrow_requests SET status = 'returned', updated_at = CURRENT_TIMESTAMP
         WHERE book_id = ? AND from_user_id = ? AND status = 'return_requested'`
      ).run(bookId, userId);
    });

    acknowledgeTransaction();

    res.json({ message: 'Return acknowledged' });
  } catch (error) {
    handleError(res, error, 'Failed to acknowledge return');
  }
});

// GET /api/borrow/return-requests - Get return request notifications for borrower
router.get('/return-requests', (req, res) => {
  try {
    const userId = req.user.id;

    const requests = db.prepare(`
      SELECT br.id, br.to_user_id, br.book_id, br.status, br.updated_at,
             u.email as owner_email, u.name as owner_name,
             b.title as book_title, b.author as book_author
      FROM borrow_requests br
      JOIN users u ON br.to_user_id = u.id
      JOIN books b ON br.book_id = b.id
      WHERE br.from_user_id = ? AND br.status = 'return_requested'
      ORDER BY br.updated_at DESC
    `).all(userId);

    res.json(requests);
  } catch (error) {
    handleError(res, error, 'Failed to fetch return requests');
  }
});

// GET /api/borrow/return-requests/count - Get return request count for notifications
router.get('/return-requests/count', (req, res) => {
  try {
    const userId = req.user.id;
    const result = db.prepare(
      `SELECT COUNT(*) as count FROM borrow_requests WHERE from_user_id = ? AND status = 'return_requested'`
    ).get(userId);
    res.json({ count: result.count });
  } catch (error) {
    handleError(res, error, 'Failed to fetch return request count');
  }
});

export default router;
