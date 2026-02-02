import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'shelfwise.db');
const db = new Database(dbPath);

console.log('Running view mode migration...');

// Check if view_mode column exists in users table
const columns = db.prepare("PRAGMA table_info(users)").all();
const hasViewMode = columns.some(col => col.name === 'view_mode');

if (!hasViewMode) {
  console.log('Adding view_mode column to users table...');
  db.exec("ALTER TABLE users ADD COLUMN view_mode TEXT DEFAULT 'list'");
  console.log('view_mode column added!');
} else {
  console.log('view_mode column already exists.');
}

console.log('View mode migration complete!');

db.close();
