import { app } from './app.js';
import { cleanExpiredSessions } from './services/auth.js';

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Clean up expired sessions periodically (every hour)
setInterval(() => {
  try {
    const cleaned = cleanExpiredSessions();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired sessions`);
    }
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
}, 60 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`Shelfwise server running on http://localhost:${PORT}`);
  if (!isProduction) {
    console.log('Running in development mode');
  }
});
