import { Router } from 'express';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByIdWithPassword,
  verifyPassword,
  createSession,
  deleteSession,
  validateSession,
  updateUserProfile,
  updateUserEmail,
  updateUserTheme,
  deleteUser,
  createPasswordResetToken,
  validatePasswordResetToken,
  markPasswordResetTokenUsed,
  resetPassword,
  createEmailVerificationToken,
  validateEmailVerificationToken,
  verifyEmail
} from '../services/auth.js';
import { sendPasswordResetEmail, sendEmailVerificationEmail } from '../services/email.js';

const router = Router();

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Cookie options
const getCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge,
  path: '/'
});

// Validation helpers
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPassword(password) {
  return password && password.length >= 8;
}

// POST /api/auth/register - Create new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, rememberMe } = req.body;

    // Validate input
    const errors = [];

    if (!email) {
      errors.push('Email is required');
    } else if (!isValidEmail(email)) {
      errors.push('Invalid email format');
    }

    if (!password) {
      errors.push('Password is required');
    } else if (!isValidPassword(password)) {
      errors.push('Password must be at least 8 characters');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    // Check if user already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Create user
    const user = await createUser(email, password, name);

    // Create email verification token and send verification email
    const verificationToken = createEmailVerificationToken(user.id, email);
    const emailResult = await sendEmailVerificationEmail(email, verificationToken, name);

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
    }

    // Create session
    const session = createSession(user.id, rememberMe || false);

    // Set session cookie
    res.cookie('session_token', session.id, getCookieOptions(session.maxAge));

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        theme: user.theme,
        emailVerified: false
      },
      message: 'Account created! Please check your email to verify your account.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: isProduction ? 'Registration failed' : error.message });
  }
});

// POST /api/auth/login - Authenticate user
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create session
    const session = createSession(user.id, rememberMe || false);

    // Set session cookie
    res.cookie('session_token', session.id, getCookieOptions(session.maxAge));

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        theme: user.theme || 'purple',
        emailVerified: !!user.email_verified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: isProduction ? 'Login failed' : error.message });
  }
});

// POST /api/auth/logout - End session
router.post('/logout', (req, res) => {
  try {
    const sessionToken = req.cookies?.session_token;

    if (sessionToken) {
      deleteSession(sessionToken);
    }

    // Clear the cookie
    res.clearCookie('session_token', { path: '/' });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', (req, res) => {
  try {
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = validateSession(sessionToken);

    if (!user) {
      // Clear invalid cookie
      res.clearCookie('session_token', { path: '/' });
      return res.status(401).json({ error: 'Session expired' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: 'Authentication check failed' });
  }
});

// PUT /api/auth/profile - Update user's profile (name only)
router.put('/profile', async (req, res) => {
  try {
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = validateSession(sessionToken);

    if (!user) {
      res.clearCookie('session_token', { path: '/' });
      return res.status(401).json({ error: 'Session expired' });
    }

    const { name } = req.body;

    const updatedUser = updateUserProfile(user.id, { name });

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        theme: updatedUser.theme,
        emailVerified: updatedUser.emailVerified
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/auth/email - Update user's email (requires password)
router.put('/email', async (req, res) => {
  try {
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = validateSession(sessionToken);

    if (!user) {
      res.clearCookie('session_token', { path: '/' });
      return res.status(401).json({ error: 'Session expired' });
    }

    const { email, password } = req.body;

    // Require both email and password
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Current password is required to change email' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Verify current password
    const userWithPassword = findUserByIdWithPassword(user.id);
    const isValid = await verifyPassword(password, userWithPassword.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Update email (will invalidate other sessions and reset email_verified to false)
    const updatedUser = updateUserEmail(user.id, email, sessionToken);

    // Send verification email for the new email address
    const verificationToken = createEmailVerificationToken(updatedUser.id, email);
    const emailResult = await sendEmailVerificationEmail(email, verificationToken, updatedUser.name);

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
    }

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        theme: updatedUser.theme,
        emailVerified: updatedUser.emailVerified
      },
      message: 'Email updated. Please check your new email to verify it. Other sessions have been logged out.'
    });
  } catch (error) {
    console.error('Email update error:', error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// POST /api/auth/forgot-password - Request password reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Always return success to prevent email enumeration attacks
    const successMessage = 'If an account with that email exists, we\'ve sent a password reset link.';

    const user = findUserByEmail(email);
    if (!user) {
      // Don't reveal that the email doesn't exist
      return res.json({ message: successMessage });
    }

    // Create reset token
    const resetToken = createPasswordResetToken(user.id);

    // Send email
    const emailResult = await sendPasswordResetEmail(user.email, resetToken, user.name);

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      // Still return success to user to prevent enumeration
    }

    res.json({ message: successMessage });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Validate token
    const user = validatePasswordResetToken(token);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    // Reset the password
    await resetPassword(user.id, password);

    // Mark token as used
    markPasswordResetTokenUsed(token);

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// GET /api/auth/validate-reset-token - Check if a reset token is valid
router.get('/validate-reset-token', (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token is required' });
    }

    const user = validatePasswordResetToken(token);

    if (!user) {
      return res.json({ valid: false, error: 'Invalid or expired reset link' });
    }

    res.json({ valid: true, email: user.email });
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({ valid: false, error: 'Failed to validate token' });
  }
});

// PUT /api/auth/theme - Update user's theme preference
router.put('/theme', (req, res) => {
  try {
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = validateSession(sessionToken);

    if (!user) {
      res.clearCookie('session_token', { path: '/' });
      return res.status(401).json({ error: 'Session expired' });
    }

    const { theme } = req.body;

    if (!theme) {
      return res.status(400).json({ error: 'Theme is required' });
    }

    const validThemes = ['purple', 'light', 'dark'];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme. Must be purple, light, or dark' });
    }

    const updatedUser = updateUserTheme(user.id, theme);

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        theme: updatedUser.theme,
        emailVerified: updatedUser.emailVerified
      }
    });
  } catch (error) {
    console.error('Theme update error:', error);
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

// POST /api/auth/verify-email - Verify email with token
router.post('/verify-email', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Verify the email
    const user = verifyEmail(token);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification link. Please request a new one.' });
    }

    res.json({
      message: 'Email verified successfully!',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        theme: user.theme,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// GET /api/auth/validate-verification-token - Check if verification token is valid
router.get('/validate-verification-token', (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token is required' });
    }

    const tokenData = validateEmailVerificationToken(token);

    if (!tokenData) {
      return res.json({ valid: false, error: 'Invalid or expired verification link' });
    }

    res.json({ valid: true, email: tokenData.email });
  } catch (error) {
    console.error('Validate verification token error:', error);
    res.status(500).json({ valid: false, error: 'Failed to validate token' });
  }
});

// POST /api/auth/resend-verification - Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = validateSession(sessionToken);

    if (!user) {
      res.clearCookie('session_token', { path: '/' });
      return res.status(401).json({ error: 'Session expired' });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Get full user data
    const fullUser = findUserById(user.id);

    // Create new verification token and send email
    const verificationToken = createEmailVerificationToken(user.id, user.email);
    const emailResult = await sendEmailVerificationEmail(user.email, verificationToken, fullUser.name);

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({ message: 'Verification email sent! Please check your inbox.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// DELETE /api/auth/account - Delete user account (requires password verification)
router.delete('/account', async (req, res) => {
  try {
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = validateSession(sessionToken);

    if (!user) {
      res.clearCookie('session_token', { path: '/' });
      return res.status(401).json({ error: 'Session expired' });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    // Verify password
    const userWithPassword = findUserByIdWithPassword(user.id);
    const isValid = await verifyPassword(password, userWithPassword.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Delete the user and all associated data
    const deleted = deleteUser(user.id);

    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    // Clear the session cookie
    res.clearCookie('session_token', { path: '/' });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
