import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'shelfwise.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Running borrow migration...');

// Create borrow_requests table
const borrowRequestsTable = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='borrow_requests'"
).get();

if (!borrowRequestsTable) {
  console.log('Creating borrow_requests table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS borrow_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_borrow_requests_from_user ON borrow_requests(from_user_id);
    CREATE INDEX IF NOT EXISTS idx_borrow_requests_to_user ON borrow_requests(to_user_id);
    CREATE INDEX IF NOT EXISTS idx_borrow_requests_book_id ON borrow_requests(book_id);
    CREATE INDEX IF NOT EXISTS idx_borrow_requests_status ON borrow_requests(status);
  `);
  console.log('borrow_requests table created!');
} else {
  console.log('borrow_requests table already exists.');
}

// Add borrow columns to books table
const columns = db.prepare("PRAGMA table_info('books')").all();
const hasBorrowedByUserId = columns.some(col => col.name === 'borrowed_by_user_id');
const hasBorrowStatus = columns.some(col => col.name === 'borrow_status');

if (!hasBorrowedByUserId) {
  console.log('Adding borrowed_by_user_id column to books table...');
  db.exec('ALTER TABLE books ADD COLUMN borrowed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL');
  console.log('borrowed_by_user_id column added!');
} else {
  console.log('borrowed_by_user_id column already exists.');
}

if (!hasBorrowStatus) {
  console.log('Adding borrow_status column to books table...');
  db.exec('ALTER TABLE books ADD COLUMN borrow_status TEXT DEFAULT NULL');
  console.log('borrow_status column added!');
} else {
  console.log('borrow_status column already exists.');
}

console.log('Borrow migration complete!');
db.close();
