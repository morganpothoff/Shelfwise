import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateUnifiedIdParam } from './validation.js';

describe('validateUnifiedIdParam', () => {
  function makeReq(id) {
    return { params: { id } };
  }

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
