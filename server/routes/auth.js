import { Router } from 'express';
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  createSession,
  deleteSession,
  validateSession,
  updateUserProfile,
  updateUserTheme
} from '../services/auth.js';

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

    // Create session
    const session = createSession(user.id, rememberMe || false);

    // Set session cookie
    res.cookie('session_token', session.id, getCookieOptions(session.maxAge));

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        theme: user.theme
      }
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
        theme: user.theme || 'purple'
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

// PUT /api/auth/profile - Update user's profile
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

    const { name, email } = req.body;

    // Validate email if provided
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const updatedUser = updateUserProfile(user.id, { name, email });

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        theme: updatedUser.theme
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update profile' });
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
        theme: updatedUser.theme
      }
    });
  } catch (error) {
    console.error('Theme update error:', error);
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

export default router;
