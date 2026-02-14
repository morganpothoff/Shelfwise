import { describe, it } from 'node:test';
import assert from 'node:assert';
import { requireAuth, optionalAuth } from './auth.js';

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    clearCookie: () => {},
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

describe('requireAuth', () => {
  it('returns 401 when no session cookie', () => {
    const req = { cookies: {} };
    const res = makeRes();
    const next = makeNext();

    requireAuth(req, res, next);

    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 401);
    assert.deepStrictEqual(res.body, { error: 'Authentication required' });
  });

  it('returns 401 when cookies object is missing', () => {
    const req = {};
    const res = makeRes();
    const next = makeNext();

    requireAuth(req, res, next);

    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 401);
    assert.deepStrictEqual(res.body, { error: 'Authentication required' });
  });

  it('returns 401 when session_token is missing from cookies', () => {
    const req = { cookies: { other: 'value' } };
    const res = makeRes();
    const next = makeNext();

    requireAuth(req, res, next);

    assert.strictEqual(next.called, false);
    assert.strictEqual(res.statusCode, 401);
  });
});

describe('optionalAuth', () => {
  it('always calls next', () => {
    const req = { cookies: {} };
    const res = makeRes();
    const next = makeNext();

    optionalAuth(req, res, next);

    assert.strictEqual(next.called, true);
  });

  it('does not set req.user when no cookie', () => {
    const req = { cookies: {} };
    const res = makeRes();
    const next = makeNext();

    optionalAuth(req, res, next);

    assert.strictEqual(next.called, true);
    assert.strictEqual(req.user, undefined);
  });

  it('does not set req.user when session_token is invalid (expired or bogus)', () => {
    const req = { cookies: { session_token: 'bogus-nonexistent-token' } };
    const res = makeRes();
    const next = makeNext();

    optionalAuth(req, res, next);

    assert.strictEqual(next.called, true);
    // With a bogus token, validateSession returns null so req.user is not set
    assert.strictEqual(req.user, undefined);
  });
});
