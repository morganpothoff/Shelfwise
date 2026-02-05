import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'shelfwise.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Running completed_books migration...');

// Create completed_books table - stores books that users have read (may or may not be in their library)
db.exec(`
  CREATE TABLE IF NOT EXISTS completed_books (
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
    library_book_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (library_book_id) REFERENCES books(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_completed_books_user_id ON completed_books(user_id);
  CREATE INDEX IF NOT EXISTS idx_completed_books_isbn ON completed_books(isbn);
  CREATE INDEX IF NOT EXISTS idx_completed_books_title ON completed_books(title);
  CREATE INDEX IF NOT EXISTS idx_completed_books_library_book_id ON completed_books(library_book_id);
`);

console.log('Migration complete! completed_books table created.');
db.close();
