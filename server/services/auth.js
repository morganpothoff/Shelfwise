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
    SELECT s.*, u.id as user_id, u.email, u.name, u.theme, u.email_verified, u.view_mode
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).get(token);

  if (!session) return null;

  return {
    id: session.user_id,
    email: session.email,
    name: session.name,
    theme: session.theme || 'blue',
    viewMode: session.view_mode || 'list',
    emailVerified: !!session.email_verified
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
    VALUES (?, ?, ?, 'blue')
  `);

  const result = stmt.run(email.toLowerCase().trim(), passwordHash, name?.trim() || null);

  return {
    id: result.lastInsertRowid,
    email: email.toLowerCase().trim(),
    name: name?.trim() || null,
    theme: 'blue'
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
  const user = db.prepare('SELECT id, email, name, theme, view_mode, email_verified, created_at FROM users WHERE id = ?').get(id);
  if (!user) return null;
  return {
    ...user,
    viewMode: user.view_mode || 'list',
    emailVerified: !!user.email_verified
  };
}

/**
 * Update user's profile (name only - email changes require password verification)
 * @param {number} userId - User ID
 * @param {object} updates - Object with name
 * @returns {object} Updated user object
 */
export function updateUserProfile(userId, updates) {
  const { name } = updates;

  if (name === undefined) {
    return findUserById(userId);
  }

  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name?.trim() || null, userId);

  return findUserById(userId);
}

/**
 * Update user's email (requires password verification, invalidates other sessions)
 * @param {number} userId - User ID
 * @param {string} newEmail - New email address
 * @param {string} currentSessionToken - Current session to preserve
 * @returns {object} Updated user object
 */
export function updateUserEmail(userId, newEmail, currentSessionToken) {
  const normalizedEmail = newEmail.toLowerCase().trim();

  // Check if email is already taken
  const existingUser = findUserByEmail(normalizedEmail);
  if (existingUser && existingUser.id !== userId) {
    throw new Error('An account with this email already exists');
  }

  // Update email and set email_verified to false
  db.prepare('UPDATE users SET email = ?, email_verified = 0 WHERE id = ?').run(normalizedEmail, userId);

  // Invalidate all other sessions for security (keep current session)
  if (currentSessionToken) {
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(userId, currentSessionToken);
  }

  return findUserById(userId);
}

/**
 * Get user with password hash for verification
 * @param {number} userId - User ID
 * @returns {object|null} User object with password_hash
 */
export function findUserByIdWithPassword(userId) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

// Password reset token duration (1 hour)
const PASSWORD_RESET_DURATION = 60 * 60 * 1000;

// Email verification token duration (24 hours)
const EMAIL_VERIFICATION_DURATION = 24 * 60 * 60 * 1000;

/**
 * Create a password reset token for a user
 * @param {number} userId - User ID
 * @returns {string} The reset token
 */
export function createPasswordResetToken(userId) {
  // Invalidate any existing tokens for this user
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(userId);

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_DURATION);

  db.prepare(`
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `).run(userId, token, expiresAt.toISOString());

  return token;
}

/**
 * Validate a password reset token and return the associated user
 * @param {string} token - The reset token
 * @returns {object|null} User object if valid, null otherwise
 */
export function validatePasswordResetToken(token) {
  if (!token) return null;

  const resetToken = db.prepare(`
    SELECT prt.*, u.id as user_id, u.email, u.name
    FROM password_reset_tokens prt
    JOIN users u ON prt.user_id = u.id
    WHERE prt.token = ? AND prt.used = 0 AND prt.expires_at > datetime('now')
  `).get(token);

  if (!resetToken) return null;

  return {
    id: resetToken.user_id,
    email: resetToken.email,
    name: resetToken.name,
    tokenId: resetToken.id
  };
}

/**
 * Mark a password reset token as used
 * @param {string} token - The reset token
 */
export function markPasswordResetTokenUsed(token) {
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE token = ?').run(token);
}

/**
 * Reset a user's password
 * @param {number} userId - User ID
 * @param {string} newPassword - The new password (will be hashed)
 */
export async function resetPassword(userId, newPassword) {
  const passwordHash = await hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);

  // Invalidate all sessions for this user (force re-login)
  deleteAllUserSessions(userId);
}

/**
 * Clean up expired password reset tokens
 */
export function cleanExpiredPasswordResetTokens() {
  const result = db.prepare("DELETE FROM password_reset_tokens WHERE expires_at <= datetime('now') OR used = 1").run();
  return result.changes;
}

/**
 * Create an email verification token for a user
 * @param {number} userId - User ID
 * @param {string} email - Email address to verify
 * @returns {string} The verification token
 */
export function createEmailVerificationToken(userId, email) {
  // Invalidate any existing unused tokens for this user
  db.prepare('UPDATE email_verification_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(userId);

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_DURATION);

  db.prepare(`
    INSERT INTO email_verification_tokens (user_id, email, token, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(userId, email.toLowerCase().trim(), token, expiresAt.toISOString());

  return token;
}

/**
 * Validate an email verification token and return the associated user info
 * @param {string} token - The verification token
 * @returns {object|null} Object with user and email info if valid, null otherwise
 */
export function validateEmailVerificationToken(token) {
  if (!token) return null;

  const verificationToken = db.prepare(`
    SELECT evt.*, u.id as user_id, u.email as current_email, u.name
    FROM email_verification_tokens evt
    JOIN users u ON evt.user_id = u.id
    WHERE evt.token = ? AND evt.used = 0 AND evt.expires_at > datetime('now')
  `).get(token);

  if (!verificationToken) return null;

  return {
    id: verificationToken.user_id,
    email: verificationToken.email,
    currentEmail: verificationToken.current_email,
    name: verificationToken.name,
    tokenId: verificationToken.id
  };
}

/**
 * Verify a user's email and mark the token as used
 * @param {string} token - The verification token
 * @returns {object|null} Updated user object if successful, null otherwise
 */
export function verifyEmail(token) {
  const tokenData = validateEmailVerificationToken(token);
  if (!tokenData) return null;

  // Mark the token as used
  db.prepare('UPDATE email_verification_tokens SET used = 1 WHERE token = ?').run(token);

  // Update the user's email_verified status
  db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(tokenData.id);

  return findUserById(tokenData.id);
}

/**
 * Clean up expired email verification tokens
 */
export function cleanExpiredEmailVerificationTokens() {
  const result = db.prepare("DELETE FROM email_verification_tokens WHERE expires_at <= datetime('now') OR used = 1").run();
  return result.changes;
}

/**
 * Update user's theme preference
 * @param {number} userId - User ID
 * @param {string} theme - Theme name ('blue', 'purple', 'light', 'dark')
 * @returns {object} Updated user object
 */
export function updateUserTheme(userId, theme) {
  const validThemes = ['blue', 'purple', 'light', 'dark'];
  if (!validThemes.includes(theme)) {
    throw new Error('Invalid theme');
  }

  db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, userId);

  return findUserById(userId);
}

/**
 * Update user's view mode preference
 * @param {number} userId - User ID
 * @param {string} viewMode - View mode ('grid', 'list')
 * @returns {object} Updated user object
 */
export function updateUserViewMode(userId, viewMode) {
  const validModes = ['grid', 'list'];
  if (!validModes.includes(viewMode)) {
    throw new Error('Invalid view mode');
  }

  db.prepare('UPDATE users SET view_mode = ? WHERE id = ?').run(viewMode, userId);

  return findUserById(userId);
}

/**
 * Delete a user account and all associated data
 * @param {number} userId - User ID to delete
 */
export function deleteUser(userId) {
  // Delete all sessions for this user
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);

  // Delete all password reset tokens for this user
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(userId);

  // Delete any reading history for this user
  db.prepare('DELETE FROM reading_history WHERE user_id = ?').run(userId);

  // Delete the user record
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  return result.changes > 0;
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
  findUserByIdWithPassword,
  updateUserProfile,
  updateUserEmail,
  updateUserTheme,
  updateUserViewMode,
  deleteUser,
  createPasswordResetToken,
  validatePasswordResetToken,
  markPasswordResetTokenUsed,
  resetPassword,
  cleanExpiredPasswordResetTokens,
  createEmailVerificationToken,
  validateEmailVerificationToken,
  verifyEmail,
  cleanExpiredEmailVerificationTokens,
  SESSION_DURATION_DEFAULT,
  SESSION_DURATION_REMEMBER
};
