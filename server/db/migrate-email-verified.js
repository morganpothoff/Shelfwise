import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'shelfwise.db');
const db = new Database(dbPath);

console.log('Running email_verified migration...');

// Check if email_verified column exists in users table
const userColumns = db.prepare("PRAGMA table_info(users)").all();
const hasEmailVerified = userColumns.some(col => col.name === 'email_verified');

if (!hasEmailVerified) {
  console.log('Adding email_verified column to users table...');
  db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`);
  console.log('email_verified column added!');
} else {
  console.log('email_verified column already exists.');
}

console.log('Email verified migration complete!');

db.close();
