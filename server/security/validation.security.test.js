/**
 * Security-focused validation tests
 * Verifies input validation protects against injection, DoS, and boundary attacks
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateBook,
  validateISBNScan,
  validateSearch,
  validateIdParam,
  validateUnifiedIdParam
} from '../middleware/validation.js';

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.body = obj;
      return this;
    }
  };
  return res;
}

function makeNext() {
  const next = () => { next.called = true; };
  next.called = false;
  return next;
}

describe('Validation Security', () => {
  describe('Max length enforcement (DoS prevention)', () => {
    it('truncates title to 500 chars', () => {
      const req = { body: { title: 'A'.repeat(1000), author: 'Author' } };
      const res = makeRes();
      const next = makeNext();
      validateBook(req, res, next);
      assert.strictEqual(next.called, true);
      assert.strictEqual(req.body.title.length, 500);
    });

    it('truncates author to 300 chars', () => {
      const req = { body: { title: 'Book', author: 'B'.repeat(500) } };
      const res = makeRes();
      const next = makeNext();
      validateBook(req, res, next);
      assert.strictEqual(next.called, true);
      assert.strictEqual(req.body.author.length, 300);
    });

    it('truncates synopsis to 10000 chars', () => {
      const req = { body: { title: 'Book', synopsis: 'S'.repeat(50000) } };
      const res = makeRes();
      const next = makeNext();
      validateBook(req, res, next);
      assert.strictEqual(next.called, true);
      assert.strictEqual(req.body.synopsis.length, 10000);
    });

    it('limits tags array to 50 elements', () => {
      const tags = Array.from({ length: 100 }, (_, i) => `tag${i}`);
      const req = { body: { title: 'Book', tags } };
      const res = makeRes();
      const next = makeNext();
      validateBook(req, res, next);
      assert.strictEqual(next.called, true);
      assert.strictEqual(req.body.tags.length, 50);
    });

    it('limits each tag to 100 chars', () => {
      const req = { body: { title: 'Book', tags: ['short', 'x'.repeat(200)] } };
      const res = makeRes();
      const next = makeNext();
      validateBook(req, res, next);
      assert.strictEqual(next.called, true);
      assert.strictEqual(req.body.tags[1].length, 100);
    });
  });

  describe('Type safety', () => {
    it('rejects object as title (coerces to null via sanitizeString)', () => {
      const req = { body: { title: { malicious: true }, author: 'Author' } };
      const res = makeRes();
      const next = makeNext();
      validateBook(req, res, next);
      // sanitizeString returns null for non-string; title becomes null/undefined, but validation may still pass
      // If title is undefined after sanitize, the route handler would need to check - validateBook doesn't require title
      assert.strictEqual(req.body.title, null);
      assert.strictEqual(next.called, true);
    });

    it('rejects non-numeric page_count', () => {
      const req = { body: { title: 'Book', page_count: 'not-a-number' } };
      const res = makeRes();
      const next = makeNext();
      validateBook(req, res, next);
      assert.strictEqual(next.called, false);
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.error.includes('Page count'));
    });

    it('filters non-string elements from tags', () => {
      const req = {
        body: {
          title: 'Book',
          tags: ['valid', { x: 1 }, null, 42, ['nested'], 'another']
        }
      };
      const res = makeRes();
      const next = makeNext();
      validateBook(req, res, next);
      assert.strictEqual(next.called, true);
      assert.deepStrictEqual(req.body.tags, ['valid', 'another']);
    });
  });

  describe('ID validation (injection prevention)', () => {
    it('rejects fully non-numeric id (SQL injection pattern)', () => {
      const req = { params: { id: '; DROP TABLE books;--' } };
      const res = makeRes();
      const next = makeNext();
      validateIdParam(req, res, next);
      assert.strictEqual(next.called, false);
      assert.strictEqual(res.statusCode, 400);
    });

    it('rejects path traversal attempt in id', () => {
      const req = { params: { id: '../../../etc/passwd' } };
      const res = makeRes();
      const next = makeNext();
      validateIdParam(req, res, next);
      assert.strictEqual(next.called, false);
      assert.strictEqual(res.statusCode, 400);
    });

    it('rejects object as id param (type confusion)', () => {
      const req = { params: { id: { malicious: true } } };
      const res = makeRes();
      const next = makeNext();
      validateIdParam(req, res, next);
      assert.strictEqual(next.called, false);
      assert.strictEqual(res.statusCode, 400);
    });

    it('rejects library_ with non-numeric suffix', () => {
      const req = { params: { id: 'library_abc' } };
      const res = makeRes();
      const next = makeNext();
      validateUnifiedIdParam(req, res, next);
      assert.strictEqual(next.called, false);
      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('ISBN validation (format enforcement)', () => {
    it('rejects script-like content in ISBN', () => {
      const req = { body: { isbn: '<script>alert(1)</script>' } };
      const res = makeRes();
      const next = makeNext();
      validateISBNScan(req, res, next);
      assert.strictEqual(next.called, false);
      assert.strictEqual(res.statusCode, 400);
    });

    it('rejects SQL fragment in ISBN', () => {
      const req = { body: { isbn: "9780123456789'; DELETE FROM books;--" } };
      const res = makeRes();
      const next = makeNext();
      validateISBNScan(req, res, next);
      assert.strictEqual(next.called, false);
      assert.strictEqual(res.statusCode, 400);
    });

    it('rejects null/undefined ISBN', () => {
      const req = { body: {} };
      const res = makeRes();
      const next = makeNext();
      validateISBNScan(req, res, next);
      assert.strictEqual(next.called, false);
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.error.includes('ISBN'));
    });
  });

  describe('Numeric boundary validation', () => {
    it('rejects page_count exceeding safe range', () => {
      const req = { body: { title: 'Book', page_count: 999999 } };
      const res = makeRes();
      const next = makeNext();
      validateBook(req, res, next);
      assert.strictEqual(next.called, false);
      assert.strictEqual(res.statusCode, 400);
    });

    it('rejects negative page_count', () => {
      const req = { body: { title: 'Book', page_count: -5 } };
      const res = makeRes();
      const next = makeNext();
      validateBook(req, res, next);
      assert.strictEqual(next.called, false);
    });

    it('rejects zero page_count', () => {
      const req = { body: { title: 'Book', page_count: 0 } };
      const res = makeRes();
      const next = makeNext();
      validateBook(req, res, next);
      assert.strictEqual(next.called, false);
    });
  });
});
