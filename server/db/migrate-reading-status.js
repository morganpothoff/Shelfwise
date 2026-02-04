import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'shelfwise.db');
const db = new Database(dbPath);

// Add reading_status column if it doesn't exist
try {
  db.exec(`ALTER TABLE books ADD COLUMN reading_status TEXT DEFAULT 'unread'`);
  console.log('Added reading_status column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('reading_status column already exists');
  } else {
    throw e;
  }
}

// Add date_finished column if it doesn't exist
try {
  db.exec(`ALTER TABLE books ADD COLUMN date_finished DATE`);
  console.log('Added date_finished column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('date_finished column already exists');
  } else {
    throw e;
  }
}

console.log('Reading status migration complete!');
db.close();
