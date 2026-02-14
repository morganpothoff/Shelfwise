import { describe, it } from 'node:test';
import assert from 'node:assert';
import { cleanTags, cleanSynopsis, authorsMatch } from './isbnLookup.js';

describe('isbnLookup helpers', () => {
  describe('cleanTags', () => {
    it('returns empty array for non-array input', () => {
      assert.deepStrictEqual(cleanTags(null), []);
      assert.deepStrictEqual(cleanTags(undefined), []);
      assert.deepStrictEqual(cleanTags('string'), []);
    });

    it('strips special characters and keeps alphanumeric, spaces, hyphens', () => {
      assert.deepStrictEqual(cleanTags(['sci-fi', 'fantasy']), ['sci-fi', 'fantasy']);
      assert.deepStrictEqual(cleanTags(['hello@world']), ['helloworld']);
    });

    it('removes duplicates case-insensitively', () => {
      assert.deepStrictEqual(cleanTags(['Fantasy', 'fantasy', 'FANTASY']), ['Fantasy']);
    });

    it('trims whitespace and collapses multiple spaces', () => {
      assert.deepStrictEqual(cleanTags(['  tag  ']), ['tag']);
      assert.deepStrictEqual(cleanTags(['sci   fi']), ['sci fi']);
    });

    it('skips tags longer than 25 characters', () => {
      const longTag = 'a'.repeat(30);
      assert.deepStrictEqual(cleanTags([longTag]), []);
    });

    it('filters out non-string elements', () => {
      assert.deepStrictEqual(cleanTags(['ok', 123, null, 'yes']), ['ok', 'yes']);
    });
  });

  describe('cleanSynopsis', () => {
    it('returns empty string for null or undefined', () => {
      assert.strictEqual(cleanSynopsis(null), '');
      assert.strictEqual(cleanSynopsis(undefined), '');
    });

    it('returns empty string for non-string', () => {
      assert.strictEqual(cleanSynopsis(123), '');
    });

    it('strips "In English:" prefix', () => {
      const text = 'In English: This is the real description.';
      assert.ok(cleanSynopsis(text).includes('This is the real description'));
    });

    it('strips En Français: section from the end', () => {
      const text = 'English description here.\n\nEn Français: French text here.';
      const result = cleanSynopsis(text);
      assert.ok(!result.includes('French text'));
      assert.ok(result.includes('English description'));
    });

    it('trims leading and trailing whitespace and quotes', () => {
      assert.strictEqual(cleanSynopsis('  "  hello  "  ').trim(), 'hello');
    });
  });

  describe('authorsMatch', () => {
    it('returns false when either author is missing', () => {
      assert.strictEqual(authorsMatch('', 'John Doe'), false);
      assert.strictEqual(authorsMatch('John Doe', ''), false);
      assert.strictEqual(authorsMatch(null, 'John'), false);
    });

    it('returns true for exact match after normalization', () => {
      assert.strictEqual(authorsMatch('J.K. Rowling', 'J.K. Rowling'), true);
      assert.strictEqual(authorsMatch('  stephen king  ', 'Stephen King'), true);
    });

    it('returns true for "Last, First" vs "First Last"', () => {
      assert.strictEqual(authorsMatch('Rowling, J.K.', 'J.K. Rowling'), true);
      assert.strictEqual(authorsMatch('King, Stephen', 'Stephen King'), true);
    });

    it('returns true when last name matches', () => {
      assert.strictEqual(authorsMatch('Rowling', 'J.K. Rowling'), true);
    });

    it('returns false for different authors', () => {
      assert.strictEqual(authorsMatch('Stephen King', 'J.K. Rowling'), false);
      assert.strictEqual(authorsMatch('Jane Austen', 'John Smith'), false);
    });
  });
});
