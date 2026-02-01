import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'shelfwise.db');
const db = new Database(dbPath);

// Add series columns if they don't exist
try {
  db.exec(`ALTER TABLE books ADD COLUMN series_name TEXT`);
  console.log('Added series_name column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('series_name column already exists');
  } else {
    throw e;
  }
}

try {
  db.exec(`ALTER TABLE books ADD COLUMN series_position REAL`);
  console.log('Added series_position column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('series_position column already exists');
  } else {
    throw e;
  }
}

console.log('Migration complete!');
db.close();
