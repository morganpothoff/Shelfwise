import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'shelfwise.db');
const db = new Database(dbPath);

console.log('Running books user_id migration...');

// Check if user_id column exists in books table
const columns = db.prepare("PRAGMA table_info(books)").all();
const hasUserId = columns.some(col => col.name === 'user_id');

if (!hasUserId) {
  console.log('Adding user_id column to books table...');

  // SQLite doesn't support adding NOT NULL columns with foreign keys directly
  // We need to recreate the table

  db.exec(`
    -- Create new books table with user_id
    CREATE TABLE books_new (
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, isbn)
    );
  `);

  // Check if there are any existing books
  const existingBooks = db.prepare('SELECT COUNT(*) as count FROM books').get();

  if (existingBooks.count > 0) {
    // Get the first user to assign orphaned books to
    const firstUser = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();

    if (firstUser) {
      console.log(`Migrating ${existingBooks.count} existing books to user ${firstUser.id}...`);

      // Copy existing books with the first user's id
      db.exec(`
        INSERT INTO books_new (id, user_id, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, created_at, updated_at)
        SELECT id, ${firstUser.id}, isbn, title, author, page_count, genre, synopsis, tags, series_name, series_position, created_at, updated_at
        FROM books
      `);
    } else {
      console.log('No users exist. Existing books will be dropped.');
    }
  }

  // Drop old table and rename new one
  db.exec(`
    DROP TABLE books;
    ALTER TABLE books_new RENAME TO books;

    -- Recreate indexes
    CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
    CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
    CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
  `);

  console.log('user_id column added to books table!');
} else {
  console.log('user_id column already exists in books table.');
}

console.log('Books user_id migration complete!');

db.close();
