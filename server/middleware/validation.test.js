import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateUnifiedIdParam,
  validateBook,
  validateISBNScan,
  validateSearch,
  validateIdParam
} from './validation.js';

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

describe('validateBook', () => {
  it('calls next when body has valid title and optional fields', () => {
    const req = { body: { title: 'A Book', author: 'Author' } };
    const res = makeRes();
    const next = makeNext();
    validateBook(req, res, next);
    assert.strictEqual(next.called, true);
    assert.strictEqual(req.body.title, 'A Book');
  });

  it('sanitizes and accepts valid ISBN-13', () => {
    const req = { body: { title: 'Book', isbn: '  9780123456789  ' } };
    const res = makeRes();
    const next = makeNext();
    validateBook(req, res, next);
    assert.strictEqual(next.called, true);
    assert.strictEqual(req.body.isbn, '9780123456789');
  });

  it('returns 400 for invalid ISBN format', () => {
    const req = { body: { title: 'Book', isbn: 'invalid' } };
    const res = makeRes();
    const next = makeNext();
    validateBook(req, res, next);
    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('Invalid ISBN format'));
  });

  it('returns 400 for invalid page_count', () => {
    const req = { body: { title: 'Book', page_count: -1 } };
    const res = makeRes();
    const next = makeNext();
    validateBook(req, res, next);
    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('Page count'));
  });

  it('returns 400 for invalid series_position', () => {
    const req = { body: { title: 'Book', series_position: 0 } };
    const res = makeRes();
    const next = makeNext();
    validateBook(req, res, next);
    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('Series position'));
  });

  it('trims and sanitizes string fields', () => {
    const req = { body: { title: '  Trimmed  ', author: '  Writer  ' } };
    const res = makeRes();
    const next = makeNext();
    validateBook(req, res, next);
    assert.strictEqual(next.called, true);
    assert.strictEqual(req.body.title, 'Trimmed');
    assert.strictEqual(req.body.author, 'Writer');
  });
});

describe('validateISBNScan', () => {
  it('returns 400 when isbn is missing', () => {
    const req = { body: {} };
    const res = makeRes();
    const next = makeNext();
    validateISBNScan(req, res, next);
    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('ISBN is required'));
  });

  it('accepts valid ISBN-10 and sets req.body.isbn', () => {
    const req = { body: { isbn: '0123456789' } };
    const res = makeRes();
    const next = makeNext();
    validateISBNScan(req, res, next);
    assert.strictEqual(next.called, true);
    assert.strictEqual(req.body.isbn, '0123456789');
  });

  it('accepts ISBN-13 with dashes', () => {
    const req = { body: { isbn: '978-0-12-345678-9' } };
    const res = makeRes();
    const next = makeNext();
    validateISBNScan(req, res, next);
    assert.strictEqual(next.called, true);
    assert.ok(req.body.isbn);
  });

  it('returns 400 for invalid ISBN', () => {
    const req = { body: { isbn: '123' } };
    const res = makeRes();
    const next = makeNext();
    validateISBNScan(req, res, next);
    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('Invalid ISBN'));
  });
});

describe('validateSearch', () => {
  it('returns 400 when title is missing', () => {
    const req = { body: { author: 'Author' } };
    const res = makeRes();
    const next = makeNext();
    validateSearch(req, res, next);
    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('Title is required'));
  });

  it('returns 400 when author is missing', () => {
    const req = { body: { title: 'Title' } };
    const res = makeRes();
    const next = makeNext();
    validateSearch(req, res, next);
    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('Author is required'));
  });

  it('calls next when title and author provided', () => {
    const req = { body: { title: 'A Book', author: 'An Author' } };
    const res = makeRes();
    const next = makeNext();
    validateSearch(req, res, next);
    assert.strictEqual(next.called, true);
    assert.strictEqual(req.body.title, 'A Book');
    assert.strictEqual(req.body.author, 'An Author');
  });

  it('sanitizes title and author', () => {
    const req = { body: { title: '  Title  ', author: '  Author  ' } };
    const res = makeRes();
    const next = makeNext();
    validateSearch(req, res, next);
    assert.strictEqual(next.called, true);
    assert.strictEqual(req.body.title, 'Title');
    assert.strictEqual(req.body.author, 'Author');
  });
});

describe('validateIdParam', () => {
  it('parses valid positive id and calls next', () => {
    const req = { params: { id: '42' } };
    const res = makeRes();
    const next = makeNext();
    validateIdParam(req, res, next);
    assert.strictEqual(next.called, true);
    assert.strictEqual(req.params.id, 42);
  });

  it('returns 400 for non-numeric id', () => {
    const req = { params: { id: 'abc' } };
    const res = makeRes();
    const next = makeNext();
    validateIdParam(req, res, next);
    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.body, { error: 'Invalid book ID' });
  });

  it('returns 400 for zero or negative id', () => {
    const req0 = { params: { id: '0' } };
    const res0 = makeRes();
    const next0 = makeNext();
    validateIdParam(req0, res0, next0);
    assert.strictEqual(next0.called, false);
    assert.strictEqual(res0.statusCode, 400);

    const reqNeg = { params: { id: '-1' } };
    const resNeg = makeRes();
    const nextNeg = makeNext();
    validateIdParam(reqNeg, resNeg, nextNeg);
    assert.strictEqual(nextNeg.called, false);
    assert.strictEqual(resNeg.statusCode, 400);
  });
});

describe('validateUnifiedIdParam', () => {
  function makeReq(id) {
    return { params: { id } };
  }

  it('parses library_N and sets source=library and numericId=N', () => {
    const req = makeReq('library_42');
    const res = makeRes();
    const next = makeNext();

    validateUnifiedIdParam(req, res, next);

    assert.strictEqual(next.called, true);
    assert.strictEqual(req.params.source, 'library');
    assert.strictEqual(req.params.numericId, 42);
    assert.strictEqual(res.statusCode, null);
  });

  it('parses completed_N and sets source=completed and numericId=N', () => {
    const req = makeReq('completed_7');
    const res = makeRes();
    const next = makeNext();

    validateUnifiedIdParam(req, res, next);

    assert.strictEqual(next.called, true);
    assert.strictEqual(req.params.source, 'completed');
    assert.strictEqual(req.params.numericId, 7);
    assert.strictEqual(res.statusCode, null);
  });

  it('treats legacy numeric id as completed and sets numericId', () => {
    const req = makeReq('99');
    const res = makeRes();
    const next = makeNext();

    validateUnifiedIdParam(req, res, next);

    assert.strictEqual(next.called, true);
    assert.strictEqual(req.params.source, 'completed');
    assert.strictEqual(req.params.numericId, 99);
  });

  it('returns 400 for library_ with non-numeric suffix', () => {
    const req = makeReq('library_abc');
    const res = makeRes();
    const next = makeNext();

    validateUnifiedIdParam(req, res, next);

    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.body, { error: 'Invalid book ID' });
  });

  it('returns 400 for completed_ with non-numeric suffix', () => {
    const req = makeReq('completed_xyz');
    const res = makeRes();
    const next = makeNext();

    validateUnifiedIdParam(req, res, next);

    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.body, { error: 'Invalid book ID' });
  });

  it('returns 400 for zero numeric id (library_0)', () => {
    const req = makeReq('library_0');
    const res = makeRes();
    const next = makeNext();

    validateUnifiedIdParam(req, res, next);

    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.body, { error: 'Invalid book ID' });
  });

  it('returns 400 for negative numeric id (completed_-1)', () => {
    const req = makeReq('completed_-1');
    const res = makeRes();
    const next = makeNext();

    validateUnifiedIdParam(req, res, next);

    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.body, { error: 'Invalid book ID' });
  });

  it('returns 400 for plain non-numeric string', () => {
    const req = makeReq('not-an-id');
    const res = makeRes();
    const next = makeNext();

    validateUnifiedIdParam(req, res, next);

    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.body, { error: 'Invalid book ID' });
  });

  it('coerces id to string (handles number param)', () => {
    const req = makeReq(42);
    const res = makeRes();
    const next = makeNext();

    validateUnifiedIdParam(req, res, next);

    assert.strictEqual(next.called, true);
    assert.strictEqual(req.params.source, 'completed');
    assert.strictEqual(req.params.numericId, 42);
  });
});
