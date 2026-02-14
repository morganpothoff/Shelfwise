import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  dedupeKey,
  formatLibraryBook,
  formatCompletedBook
} from './completedBooks.js';

describe('completedBooks route helpers', () => {
  describe('dedupeKey', () => {
    it('returns isbn key when book has isbn', () => {
      const book = { isbn: '978-0-123-45678-9', title: 'Foo', author: 'Bar' };
      assert.deepStrictEqual(dedupeKey(book), [
        'isbn:978-0-123-45678-9',
        'ta:foo|bar'
      ]);
    });

    it('returns title+author key when book has title and author', () => {
      const book = { title: 'The Book', author: 'Jane Doe' };
      assert.deepStrictEqual(dedupeKey(book), ['ta:the book|jane doe']);
    });

    it('returns empty array when book has no isbn or title/author', () => {
      assert.deepStrictEqual(dedupeKey({}), []);
      assert.deepStrictEqual(dedupeKey({ title: 'Only' }), []);
      assert.deepStrictEqual(dedupeKey({ author: 'Only' }), []);
    });

    it('normalizes title and author to lowercase', () => {
      const book = { title: 'Title', author: 'Author' };
      assert.deepStrictEqual(dedupeKey(book), ['ta:title|author']);
    });
  });

  describe('formatLibraryBook', () => {
    it('prefixes id with library_ and sets source and owned', () => {
      const book = {
        id: 5,
        title: 'Test',
        author: 'Author',
        tags: '[]'
      };
      const out = formatLibraryBook(book);
      assert.strictEqual(out.id, 'library_5');
      assert.strictEqual(out.source, 'library');
      assert.strictEqual(out.owned, 1);
      assert.strictEqual(out.title, 'Test');
    });

    it('parses tags JSON string to array', () => {
      const book = { id: 1, tags: '["fiction","sci-fi"]' };
      const out = formatLibraryBook(book);
      assert.deepStrictEqual(out.tags, ['fiction', 'sci-fi']);
    });

    it('uses empty array when tags is null or missing', () => {
      const book = { id: 1 };
      const out = formatLibraryBook(book);
      assert.deepStrictEqual(out.tags, []);
    });
  });

  describe('formatCompletedBook', () => {
    it('prefixes id with completed_ and sets source', () => {
      const book = {
        id: 10,
        title: 'Done',
        author: 'Writer',
        tags: '[]'
      };
      const out = formatCompletedBook(book);
      assert.strictEqual(out.id, 'completed_10');
      assert.strictEqual(out.source, 'completed');
      assert.strictEqual(out.title, 'Done');
    });

    it('parses tags JSON string to array', () => {
      const book = { id: 2, tags: '["romance"]' };
      const out = formatCompletedBook(book);
      assert.deepStrictEqual(out.tags, ['romance']);
    });

    it('does not set owned (completed table has its own owned)', () => {
      const book = { id: 3, owned: 1 };
      const out = formatCompletedBook(book);
      assert.strictEqual(out.owned, 1);
    });
  });
});
