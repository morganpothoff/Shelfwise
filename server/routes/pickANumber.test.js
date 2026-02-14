import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fnv1aHash, hashBook, selectBook } from './pickANumber.js';

describe('pickANumber algorithm', () => {
  describe('fnv1aHash', () => {
    it('returns same hash for same string', () => {
      const str = 'hello';
      assert.strictEqual(fnv1aHash(str), fnv1aHash(str));
    });

    it('returns different hashes for different strings', () => {
      assert.notStrictEqual(fnv1aHash('a'), fnv1aHash('b'));
      assert.notStrictEqual(fnv1aHash('title'), fnv1aHash('title2'));
    });

    it('returns unsigned 32-bit integer', () => {
      const h = fnv1aHash('any string');
      assert.strictEqual(typeof h, 'number');
      assert.ok(h >= 0 && h <= 0xffffffff);
      assert.strictEqual(Math.floor(h), h);
    });

    it('handles empty string', () => {
      const h = fnv1aHash('');
      assert.strictEqual(typeof h, 'number');
      assert.ok(h >= 0);
    });
  });

  describe('hashBook', () => {
    it('returns same hash for same book metadata', () => {
      const book = { title: 'Dune', author: 'Frank Herbert', isbn: '9780441172716' };
      assert.strictEqual(hashBook(book), hashBook(book));
    });

    it('returns different hashes for different books', () => {
      const a = { title: 'Dune', author: 'Frank Herbert' };
      const b = { title: 'Dune', author: 'Someone Else' };
      assert.notStrictEqual(hashBook(a), hashBook(b));
    });

    it('handles missing optional fields', () => {
      const book = { title: 'Only Title' };
      const h = hashBook(book);
      assert.strictEqual(typeof h, 'number');
      assert.ok(h >= 0);
    });
  });

  describe('selectBook', () => {
    it('returns null for empty books array', () => {
      assert.strictEqual(selectBook(1, []), null);
      assert.strictEqual(selectBook(42, []), null);
    });

    it('returns the only book when array has one book', () => {
      const book = { id: 1, title: 'Solo', author: 'Author' };
      assert.strictEqual(selectBook(1, [book]), book);
      assert.strictEqual(selectBook(999, [book]), book);
    });

    it('returns one of the books when array has multiple', () => {
      const books = [
        { id: 1, title: 'First', author: 'A' },
        { id: 2, title: 'Second', author: 'B' },
        { id: 3, title: 'Third', author: 'C' }
      ];
      const selected = selectBook(42, books);
      assert.ok(books.includes(selected));
      assert.ok(selected && (selected.title === 'First' || selected.title === 'Second' || selected.title === 'Third'));
    });

    it('returns a book for different user numbers', () => {
      const books = [
        { id: 1, title: 'A', author: 'X' },
        { id: 2, title: 'B', author: 'Y' }
      ];
      const s1 = selectBook(1, books);
      const s2 = selectBook(2, books);
      assert.ok(books.includes(s1));
      assert.ok(books.includes(s2));
    });
  });
});
