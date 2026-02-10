import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'shelfwise.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

console.log('Running book visibility migration...');

// Check if the visibility column already exists
const columns = db.prepare("PRAGMA table_info('books')").all();
const hasVisibility = columns.some(col => col.name === 'visibility');

if (!hasVisibility) {
  console.log('Adding visibility column to books table...');
  db.exec(`ALTER TABLE books ADD COLUMN visibility TEXT DEFAULT 'visible'`);
  console.log('visibility column added!');
} else {
  console.log('visibility column already exists.');
}

console.log('Book visibility migration complete!');
db.close();
