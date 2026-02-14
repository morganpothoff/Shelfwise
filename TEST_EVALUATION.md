# Shelfwise — Testing & Security Evaluation

**Evaluation Date:** February 2025  
**Test Frameworks:** Node.js `node:test` (server), Vitest (client), Supertest (API)

For a quick overview, see [TEST_SUMMARY.md](./TEST_SUMMARY.md).

---

## 1. Test Coverage Analysis

### 1.1 Server — What's Tested

| Module | Tests | Coverage |
|--------|-------|----------|
| auth.test.js | 6 | requireAuth, optionalAuth |
| validation.test.js | 26 | validateBook, validateISBNScan, validateSearch, validateIdParam, validateUnifiedIdParam |
| completedBooks.test.js | 10 | dedupeKey, formatLibraryBook, formatCompletedBook |
| pickANumber.test.js | 11 | fnv1aHash, hashBook, selectBook |
| isbnLookup.test.js | 16 | cleanTags, cleanSynopsis, authorsMatch |
| validation.security.test.js | 20 | Max length, type safety, ID validation, ISBN, numeric bounds |
| api.security.test.js | 14 | Protected routes 401, auth validation, user enumeration |

### 1.2 Server — Untested Areas

| Route/Module | Risk | Notes |
|--------------|------|-------|
| auth.js | Medium | Route handlers; password/token logic |
| friends.js | Medium | Param validation, friendship checks |
| borrow.js | Medium | Param validation, ownership checks |
| books.js | Low | Validation tested; routes use req.user.id |
| completedBooks.js | Low | Helpers tested |
| email.js | Low | External service |

### 1.3 Client — What's Tested

| Component | Tests |
|-----------|-------|
| BookCard, BookListItem | 20 |
| CompletedBookCard, CompletedBookListItem | 16 |
| BooksCompleted, AddCompletedBookConfirmModal | 22 |
| CompletedBookProfile | 8 |
| Navbar, LoginPage | 9 |
| api.test.js | 13 |

### 1.4 Client — Untested Components

Library, RegisterPage, BookProfile, FriendsPage, BorrowPage, Import modals, AuthContext, ManualBookForm, UserProfile, etc.

---

## 2. Security Posture Assessment

### 2.1 Implemented Controls ✅

Parameterized queries, input validation (max lengths, types), auth middleware, user enumeration prevention, password min 8 chars, secure cookies (httpOnly, secure, sameSite), rate limiting, Helmet, JSON body limit 100kb.

### 2.2 Authorization (IDOR)

Books, completed books, friend requests, borrow requests: all scope by user_id or verify friendship/ownership.

### 2.3 Parameter Validation

- Books: validateIdParam, validateUnifiedIdParam
- Friends/Borrow: inline parseInt + NaN check (no shared middleware)

---

## 3. Recommendations

### High priority
1. Library component tests
2. RegisterPage tests

### Medium priority
3. Friends/Borrow route tests
4. BookProfile tests
5. AuthContext tests

### Low priority
6. Shared param validation middleware
7. Import modal tests
8. Password reset token tests

---

## 4. Running Tests

```bash
npm test              # Server (may need non-sandbox for API security tests)
npm run test:client   # Client
```
