import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production';

function handleError(res, error, publicMessage) {
  console.error(publicMessage + ':', error);
  res.status(500).json({ error: isProduction ? publicMessage : error.message });
}

// POST /api/friends/request - Send a friend request by email
router.post('/request', (req, res) => {
  try {
    const userId = req.user.id;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find target user by email
    const targetUser = db.prepare('SELECT id, email, name FROM users WHERE email = ?')
      .get(normalizedEmail);

    if (!targetUser) {
      return res.status(404).json({ error: 'No user found with that email' });
    }

    if (targetUser.id === userId) {
      return res.status(400).json({ error: 'You cannot send a friend request to yourself' });
    }

    // Check if already friends
    const existingFriendship = db.prepare(
      'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?'
    ).get(userId, targetUser.id);

    if (existingFriendship) {
      return res.status(409).json({ error: 'You are already friends with this user' });
    }

    // Check for existing pending request in either direction
    const existingPending = db.prepare(
      `SELECT id, from_user_id FROM friend_requests
       WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
       AND status = 'pending'`
    ).get(userId, targetUser.id, targetUser.id, userId);

    if (existingPending) {
      if (existingPending.from_user_id === userId) {
        return res.status(409).json({ error: 'Friend request already sent' });
      } else {
        return res.status(409).json({
          error: 'This user has already sent you a friend request. Check your notifications!'
        });
      }
    }

    // Delete any previously declined request so we can re-send
    db.prepare(
      `DELETE FROM friend_requests
       WHERE from_user_id = ? AND to_user_id = ? AND status = 'declined'`
    ).run(userId, targetUser.id);

    // Create the friend request
    const result = db.prepare(
      'INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, ?)'
    ).run(userId, targetUser.id, 'pending');

    res.status(201).json({
      message: 'Friend request sent!',
      requestId: result.lastInsertRowid
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Friend request already exists' });
    }
    handleError(res, error, 'Failed to send friend request');
  }
});

// GET /api/friends/requests - Get pending friend requests for current user
router.get('/requests', (req, res) => {
  try {
    const userId = req.user.id;

    const requests = db.prepare(`
      SELECT fr.id, fr.from_user_id, fr.status, fr.created_at,
             u.email as from_email, u.name as from_name
      FROM friend_requests fr
      JOIN users u ON fr.from_user_id = u.id
      WHERE fr.to_user_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `).all(userId);

    res.json(requests);
  } catch (error) {
    handleError(res, error, 'Failed to fetch friend requests');
  }
});

// GET /api/friends/requests/count - Get pending request count (for bell badge)
router.get('/requests/count', (req, res) => {
  try {
    const userId = req.user.id;
    const result = db.prepare(
      `SELECT COUNT(*) as count FROM friend_requests WHERE to_user_id = ? AND status = 'pending'`
    ).get(userId);
    res.json({ count: result.count });
  } catch (error) {
    handleError(res, error, 'Failed to fetch request count');
  }
});

// POST /api/friends/requests/:id/accept - Accept a friend request
router.post('/requests/:id/accept', (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = parseInt(req.params.id, 10);

    if (isNaN(requestId) || requestId < 1) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    const request = db.prepare(
      `SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = 'pending'`
    ).get(requestId, userId);

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const acceptTransaction = db.transaction(() => {
      db.prepare("UPDATE friend_requests SET status = 'accepted' WHERE id = ?").run(requestId);

      db.prepare('INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)').run(
        request.from_user_id, userId
      );
      db.prepare('INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)').run(
        userId, request.from_user_id
      );
    });

    acceptTransaction();

    res.json({ message: 'Friend request accepted!' });
  } catch (error) {
    handleError(res, error, 'Failed to accept friend request');
  }
});

// POST /api/friends/requests/:id/decline - Decline a friend request
router.post('/requests/:id/decline', (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = parseInt(req.params.id, 10);

    if (isNaN(requestId) || requestId < 1) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    const request = db.prepare(
      `SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = 'pending'`
    ).get(requestId, userId);

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    db.prepare("UPDATE friend_requests SET status = 'declined' WHERE id = ?").run(requestId);

    res.json({ message: 'Friend request declined' });
  } catch (error) {
    handleError(res, error, 'Failed to decline friend request');
  }
});

// GET /api/friends/count - Get friend count for current user
router.get('/count', (req, res) => {
  try {
    const userId = req.user.id;
    const result = db.prepare('SELECT COUNT(*) as count FROM friendships WHERE user_id = ?')
      .get(userId);
    res.json({ count: result.count });
  } catch (error) {
    handleError(res, error, 'Failed to fetch friend count');
  }
});

// GET /api/friends - Get all friends of current user
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const { search } = req.query;

    let query = `
      SELECT f.id as friendship_id, f.friend_id, f.created_at as friends_since,
             u.email, u.name
      FROM friendships f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ?
    `;
    const params = [userId];

    if (search && search.trim()) {
      query += ` AND (LOWER(u.email) LIKE ? OR LOWER(u.name) LIKE ?)`;
      const searchPattern = `%${search.toLowerCase().trim()}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY u.name ASC, u.email ASC';

    const friends = db.prepare(query).all(...params);
    res.json(friends);
  } catch (error) {
    handleError(res, error, 'Failed to fetch friends');
  }
});

// GET /api/friends/:friendId/books - Get a friend's library (visible books only)
router.get('/:friendId/books', (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = parseInt(req.params.friendId, 10);

    if (isNaN(friendId) || friendId < 1) {
      return res.status(400).json({ error: 'Invalid friend ID' });
    }

    // Verify friendship exists
    const friendship = db.prepare(
      'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?'
    ).get(userId, friendId);

    if (!friendship) {
      return res.status(403).json({ error: 'You are not friends with this user' });
    }

    // Get friend's name
    const friend = db.prepare('SELECT name, email FROM users WHERE id = ?').get(friendId);

    // Get friend's books, excluding hidden ones
    const books = db.prepare(
      `SELECT id, isbn, title, author, page_count, genre, synopsis, tags,
              series_name, series_position, reading_status, visibility,
              borrow_status, borrowed_by_user_id, created_at
       FROM books
       WHERE user_id = ? AND (visibility IS NULL OR visibility != 'hidden')
       ORDER BY created_at DESC`
    ).all(friendId);

    // Get pending borrow requests by the current user for this friend's books
    const pendingRequests = db.prepare(
      `SELECT book_id FROM borrow_requests
       WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'`
    ).all(userId, friendId);
    const pendingBookIds = new Set(pendingRequests.map(r => r.book_id));

    const parsedBooks = books.map(book => ({
      ...book,
      tags: book.tags ? JSON.parse(book.tags) : [],
      requestPending: pendingBookIds.has(book.id)
    }));

    res.json({
      friend: { id: friendId, name: friend.name, email: friend.email },
      books: parsedBooks
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch friend's library");
  }
});

// DELETE /api/friends/:friendId - Unfriend a user
router.delete('/:friendId', (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = parseInt(req.params.friendId, 10);

    if (isNaN(friendId) || friendId < 1) {
      return res.status(400).json({ error: 'Invalid friend ID' });
    }

    // Verify friendship exists
    const friendship = db.prepare(
      'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?'
    ).get(userId, friendId);

    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    const deleteTransaction = db.transaction(() => {
      db.prepare('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?').run(userId, friendId);
      db.prepare('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?').run(friendId, userId);
    });

    deleteTransaction();

    res.json({ message: 'Friend removed' });
  } catch (error) {
    handleError(res, error, 'Failed to remove friend');
  }
});

export default router;
