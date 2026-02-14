# Shelfwise — Test Summary

| Metric | Server | Client |
|--------|--------|--------|
| **Total Tests** | 101 | 88 |
| **Test Files** | 12 | 10 |
| **Status** | ✅ Pass | ✅ Pass |

## Quick Commands

```bash
npm test              # Server tests (including security)
npm run test:client   # Client tests
```

## What's Covered

- **Server:** Validation middleware, auth middleware, completed books helpers, pickANumber algorithm, ISBN lookup, validation security, API security (401, auth input, user enumeration)
- **Client:** BookCard, BookListItem, CompletedBookCard, CompletedBookListItem, BooksCompleted, LoginPage, Navbar, API service

## Security Posture

- Parameterized SQL, input length limits, rate limiting (auth: 10/15min, scan: 10/min)
- Secure cookies (httpOnly, secure in prod, sameSite)
- User enumeration prevention on login
- Auth required on all protected routes

For full details, see [TEST_EVALUATION.md](./TEST_EVALUATION.md).
