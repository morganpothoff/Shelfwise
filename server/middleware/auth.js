import { validateSession } from '../services/auth.js';

/**
 * Middleware to require authentication
 * Validates the session cookie and attaches the user to req.user
 * Returns 401 if not authenticated
 */
export function requireAuth(req, res, next) {
  try {
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = validateSession(sessionToken);

    if (!user) {
      // Clear invalid cookie
      res.clearCookie('session_token', { path: '/' });
      return res.status(401).json({ error: 'Session expired' });
    }

    // Attach user to request for use in route handlers
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional authentication middleware
 * If a valid session exists, attaches user to req.user
 * Does not block the request if not authenticated
 */
export function optionalAuth(req, res, next) {
  try {
    const sessionToken = req.cookies?.session_token;

    if (sessionToken) {
      const user = validateSession(sessionToken);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Don't fail on auth errors in optional mode
    console.error('Optional auth error:', error);
    next();
  }
}

export default { requireAuth, optionalAuth };
