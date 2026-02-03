import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'shelfwise.db'));

console.log('Running book ratings migration...');

// Create book_ratings table
db.exec(`
  CREATE TABLE IF NOT EXISTS book_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(book_id, user_id)
  )
`);

// Create indexes for faster lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_book_ratings_book_id ON book_ratings(book_id);
  CREATE INDEX IF NOT EXISTS idx_book_ratings_user_id ON book_ratings(user_id);
`);

console.log('Book ratings migration completed successfully!');

db.close();
