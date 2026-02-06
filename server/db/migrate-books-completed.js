import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'shelfwise.db'));

console.log('Running books_completed migration...');

// Create books_completed table - similar to books but for tracking completed/read books
// that may or may not be owned
db.exec(`
  CREATE TABLE IF NOT EXISTS books_completed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    isbn TEXT,
    title TEXT NOT NULL,
    author TEXT,
    page_count INTEGER,
    genre TEXT,
    synopsis TEXT,
    tags TEXT,
    series_name TEXT,
    series_position REAL,
    date_finished DATE,
    owned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create indexes for faster lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_books_completed_user_id ON books_completed(user_id);
  CREATE INDEX IF NOT EXISTS idx_books_completed_isbn ON books_completed(isbn);
  CREATE INDEX IF NOT EXISTS idx_books_completed_title ON books_completed(title);
`);

// Create ratings table for completed books
db.exec(`
  CREATE TABLE IF NOT EXISTS completed_book_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books_completed(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(book_id, user_id)
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_completed_book_ratings_book_id ON completed_book_ratings(book_id);
  CREATE INDEX IF NOT EXISTS idx_completed_book_ratings_user_id ON completed_book_ratings(user_id);
`);

console.log('Books completed migration completed successfully!');

db.close();
