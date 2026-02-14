# Shelfwise Test Evaluation & Security Verification

**Evaluation Date:** February 2025  
**Test Framework:** Node.js built-in `node:test` (server), Vitest (client)

---

## Test Coverage Summary

### Server Tests (101 tests)

| Category | Files | Tests | Coverage |
|----------|-------|-------|----------|
| Auth Middleware | `auth.test.js` | 6 | requireAuth, optionalAuth |
| Validation | `validation.test.js` | 26 | validateBook, validateISBNScan, validateSearch, validateIdParam, validateUnifiedIdParam |
| Completed Books | `completedBooks.test.js` | 10 | dedupeKey, formatLibraryBook, formatCompletedBook |
| Pick a Number | `pickANumber.test.js` | 11 | fnv1aHash, hashBook, selectBook |
| ISBN Lookup | `isbnLookup.test.js` | 16 | cleanTags, cleanSynopsis, authorsMatch |
| **Validation Security** | `security/validation.security.test.js` | 20 | Max length, type safety, ID validation, ISBN enforcement |
| **API Security** | `security/api.security.test.js` | 14 | Protected routes, auth validation, user enumeration prevention |

### Client Tests (88 tests)

| Category | Files | Tests |
|----------|-------|-------|
| Components | BookCard, BookListItem, CompletedBookCard, etc. | 62 |
| API Service | api.test.js | 13 |
| Auth/Pages | LoginPage, Navbar | 9 |
| Books Completed | BooksCompleted, AddCompletedBookConfirmModal | 13 |

---

## Security Tests Added

### 1. Validation Security (`server/security/validation.security.test.js`)

**Max Length Enforcement (DoS Prevention)**
- Truncates title to 500 chars, author to 300, synopsis to 10,000
- Limits tags array to 50 elements, each tag to 100 chars

**Type Safety**
- Non-string title coerced to null
- Non-numeric page_count rejected
- Non-string elements filtered from tags array

**ID Validation (Injection Prevention)**
- Rejects fully non-numeric IDs (e.g. `; DROP TABLE books;--`)
- Rejects path traversal attempts (`../../../etc/passwd`)
- Rejects object/array as id param (type confusion)
- Rejects `library_` / `completed_` with non-numeric suffix

**ISBN Validation**
- Rejects script-like content (`<script>alert(1)</script>`)
- Rejects SQL fragments in ISBN
- Rejects missing ISBN

**Numeric Boundaries**
- Rejects page_count > 99,999, negative, or zero

### 2. API Security (`server/security/api.security.test.js`)

**Authentication – Protected Routes**
- `GET /api/books` returns 401 without session cookie
- `GET /api/completed-books` returns 401
- `POST /api/pick-a-number` returns 401
- `DELETE /api/books/1` returns 401
- Invalid/expired session cookie returns 401

**Auth Input Validation**
- Login rejects empty body, missing email, missing password
- **User enumeration prevention:** Same "Invalid email or password" for non-existent user
- Register rejects short password (< 8 chars)
- Register rejects invalid email format
- Register rejects empty password

**Public Endpoints**
- `GET /api/health` returns 200 without auth

---

## Architecture Changes for Testing

1. **App extraction:** Express app moved to `server/app.js` so tests can import it without starting the server. `server/index.js` imports and starts the app.

2. **Supertest dependency:** Added for API integration tests (`npm install --save-dev supertest`).

---

## Running Tests

```bash
# Server tests (including security)
npm test

# Client tests
npm run test:client
```

---

## Security Posture Verified

| Control | Status |
|---------|--------|
| Parameterized SQL queries | ✅ (better-sqlite3 uses `?` placeholders) |
| Input length limits | ✅ (validation truncates) |
| Auth required on protected routes | ✅ (requireAuth middleware) |
| User enumeration prevention | ✅ (generic login error) |
| Password length validation | ✅ (min 8 chars) |
| Rate limiting | ✅ (auth: 10/15min, scan: 10/min) |
| Helmet security headers | ✅ |
| JSON body size limit | ✅ (100kb) |
