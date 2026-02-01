import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';

// Session durations
const SESSION_DURATION_DEFAULT = 60 * 60 * 1000; // 1 hour in milliseconds
const SESSION_DURATION_REMEMBER = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure session token
 */
export function generateSessionToken() {
  return uuidv4();
}

/**
 * Create a new session for a user
 * @param {number} userId - The user ID
 * @param {boolean} rememberMe - Whether to create a long-lived session
 * @returns {object} Session object with id and expiresAt
 */
export function createSession(userId, rememberMe = false) {
  const sessionId = generateSessionToken();
  const duration = rememberMe ? SESSION_DURATION_REMEMBER : SESSION_DURATION_DEFAULT;
  const expiresAt = new Date(Date.now() + duration);

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `);

  stmt.run(sessionId, userId, expiresAt.toISOString());

  return {
    id: sessionId,
    expiresAt,
    maxAge: duration
  };
}

/**
 * Validate a session token and return the associated user
 * @param {string} token - The session token
 * @returns {object|null} User object if valid, null otherwise
 */
export function validateSession(token) {
  if (!token) return null;

  const session = db.prepare(`
    SELECT s.*, u.id as user_id, u.email, u.name, u.theme
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).get(token);

  if (!session) return null;

  return {
    id: session.user_id,
    email: session.email,
    name: session.name,
    theme: session.theme || 'purple'
  };
}

/**
 * Delete a session (logout)
 * @param {string} token - The session token to delete
 */
export function deleteSession(token) {
  if (!token) return;

  db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
}

/**
 * Delete all sessions for a user (logout everywhere)
 * @param {number} userId - The user ID
 */
export function deleteAllUserSessions(userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

/**
 * Clean up expired sessions
 * Call this periodically to keep the sessions table clean
 */
export function cleanExpiredSessions() {
  const result = db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
  return result.changes;
}

/**
 * Create a new user
 * @param {string} email - User email
 * @param {string} password - Plain text password (will be hashed)
 * @param {string} name - User's display name
 * @returns {object} The created user (without password_hash)
 */
export async function createUser(email, password, name) {
  const passwordHash = await hashPassword(password);

  const stmt = db.prepare(`
    INSERT INTO users (email, password_hash, name, theme)
    VALUES (?, ?, ?, 'purple')
  `);

  const result = stmt.run(email.toLowerCase().trim(), passwordHash, name?.trim() || null);

  return {
    id: result.lastInsertRowid,
    email: email.toLowerCase().trim(),
    name: name?.trim() || null,
    theme: 'purple'
  };
}

/**
 * Find a user by email
 * @param {string} email - User email
 * @returns {object|null} User object with password_hash, or null
 */
export function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
}

/**
 * Find a user by ID (without password)
 * @param {number} id - User ID
 * @returns {object|null} User object without password_hash, or null
 */
export function findUserById(id) {
  const user = db.prepare('SELECT id, email, name, theme, created_at FROM users WHERE id = ?').get(id);
  return user || null;
}

/**
 * Update user's theme preference
 * @param {number} userId - User ID
 * @param {string} theme - Theme name ('purple', 'light', 'dark')
 * @returns {object} Updated user object
 */
export function updateUserTheme(userId, theme) {
  const validThemes = ['purple', 'light', 'dark'];
  if (!validThemes.includes(theme)) {
    throw new Error('Invalid theme');
  }

  db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, userId);

  return findUserById(userId);
}

export default {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  createSession,
  validateSession,
  deleteSession,
  deleteAllUserSessions,
  cleanExpiredSessions,
  createUser,
  findUserByEmail,
  findUserById,
  updateUserTheme,
  SESSION_DURATION_DEFAULT,
  SESSION_DURATION_REMEMBER
};
