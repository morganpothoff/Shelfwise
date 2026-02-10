import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'shelfwise.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Running friends migration...');

// Create friend_requests table
const friendRequestsTable = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='friend_requests'"
).get();

if (!friendRequestsTable) {
  console.log('Creating friend_requests table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(from_user_id, to_user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_friend_requests_from_user ON friend_requests(from_user_id);
    CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user ON friend_requests(to_user_id);
    CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
  `);
  console.log('friend_requests table created!');
} else {
  console.log('friend_requests table already exists.');
}

// Create friendships table
const friendshipsTable = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='friendships'"
).get();

if (!friendshipsTable) {
  console.log('Creating friendships table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS friendships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, friend_id)
    );

    CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
  `);
  console.log('friendships table created!');
} else {
  console.log('friendships table already exists.');
}

console.log('Friends migration complete!');
db.close();
