import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'shelfwise.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Running auth migration...');

// Check if users table needs to be updated (check for email column)
const userColumns = db.prepare("PRAGMA table_info(users)").all();
const hasEmail = userColumns.some(col => col.name === 'email');

if (!hasEmail) {
  console.log('Updating users table with auth fields...');

  // SQLite doesn't support adding NOT NULL columns without defaults to existing tables
  // So we need to recreate the table
  db.exec(`
    -- Create new users table with auth fields
    CREATE TABLE IF NOT EXISTS users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Drop old users table if it exists and has no important data
    -- Note: This will lose any existing user data - for a production app,
    -- you'd want to migrate data properly
    DROP TABLE IF EXISTS users;

    -- Rename new table
    ALTER TABLE users_new RENAME TO users;

    -- Create index
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  console.log('Users table updated!');
} else {
  console.log('Users table already has auth fields.');
}

// Check if sessions table exists
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").get();

if (!tables) {
  console.log('Creating sessions table...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `);

  console.log('Sessions table created!');
} else {
  console.log('Sessions table already exists.');
}

// Check if theme column exists in users table
const hasTheme = userColumns.some(col => col.name === 'theme');

if (!hasTheme) {
  console.log('Adding theme column to users table...');
  db.exec(`ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'purple'`);
  console.log('Theme column added!');
} else {
  console.log('Theme column already exists.');
}

console.log('Auth migration complete!');

db.close();
