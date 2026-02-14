import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as api from './api';

describe('api service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('window', {
      location: { pathname: '/', href: '' },
      URL: { createObjectURL: vi.fn(() => ''), revokeObjectURL: vi.fn() },
      document: {
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn()
        },
        createElement: () => ({
          href: '',
          download: '',
          click: vi.fn()
        })
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function mockFetchOk(body = {}, status = 200) {
    globalThis.fetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      headers: new Map()
    });
  }

  async function mockFetchError(status, errorMessage) {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status,
      json: () => Promise.resolve({ error: errorMessage }),
      headers: new Map()
    });
  }

  describe('login', () => {
    it('sends POST to /api/auth/login with email, password, rememberMe', async () => {
      await mockFetchOk({ success: true, user: {} });
      await api.login('u@test.com', 'pass', true);
      expect(fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'u@test.com', password: 'pass', rememberMe: true }),
          credentials: 'include'
        })
      );
    });

    it('throws with server error message when not ok', async () => {
      await mockFetchError(401, 'Invalid credentials');
      await expect(api.login('u@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('sends POST to /api/auth/register with email, password, name, rememberMe', async () => {
      await mockFetchOk({ success: true, user: {} });
      await api.register('u@test.com', 'pass', 'Name', false);
      expect(fetch).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'u@test.com', password: 'pass', name: 'Name', rememberMe: false }),
          credentials: 'include'
        })
      );
    });
  });

  describe('getBooks', () => {
    it('sends GET to /api/books and returns parsed json', async () => {
      const books = [{ id: 1, title: 'A' }];
      await mockFetchOk(books);
      const result = await api.getBooks();
      expect(fetch).toHaveBeenCalledWith('/api/books', expect.objectContaining({ credentials: 'include' }));
      expect(result).toEqual(books);
    });

    it('throws when not ok', async () => {
      await mockFetchError(500, 'Server error');
      await expect(api.getBooks()).rejects.toThrow('Failed to fetch books');
    });
  });

  describe('addBook', () => {
    it('sends POST to /api/books with bookData', async () => {
      const bookData = { title: 'New Book', author: 'Author' };
      await mockFetchOk({ id: 1, ...bookData });
      const result = await api.addBook(bookData);
      expect(fetch).toHaveBeenCalledWith(
        '/api/books',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(bookData),
          credentials: 'include'
        })
      );
      expect(result).toHaveProperty('id', 1);
    });

    it('throws with server error message', async () => {
      await mockFetchError(400, 'Title is required');
      await expect(api.addBook({})).rejects.toThrow('Title is required');
    });
  });

  describe('deleteBook', () => {
    it('sends DELETE to /api/books/:id', async () => {
      await mockFetchOk({ message: 'deleted' });
      await api.deleteBook(42);
      expect(fetch).toHaveBeenCalledWith(
        '/api/books/42',
        expect.objectContaining({ method: 'DELETE', credentials: 'include' })
      );
    });
  });

  describe('updateBook', () => {
    it('sends PUT to /api/books/:id with updates', async () => {
      await mockFetchOk({ id: 42, title: 'Updated' });
      await api.updateBook(42, { title: 'Updated' });
      expect(fetch).toHaveBeenCalledWith(
        '/api/books/42',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ title: 'Updated' }),
          credentials: 'include'
        })
      );
    });
  });

  describe('scanISBN', () => {
    it('sends POST to /api/books/scan with isbn', async () => {
      await mockFetchOk({ book: { id: 1 }, message: 'added' });
      const result = await api.scanISBN('9780123456789');
      expect(fetch).toHaveBeenCalledWith(
        '/api/books/scan',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ isbn: '9780123456789' }),
          credentials: 'include'
        })
      );
      expect(result).toHaveProperty('book');
    });

    it('throws and sets notFound on error when 404', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Book not found', isbn: '9780123456789' }),
        headers: new Map()
      });
      const err = await api.scanISBN('9780123456789').catch(e => e);
      expect(err).toBeInstanceOf(Error);
      expect(err.notFound).toBe(true);
      expect(err.isbn).toBe('9780123456789');
    });
  });

  describe('getCompletedBooks', () => {
    it('sends GET to /api/completed-books', async () => {
      await mockFetchOk([]);
      await api.getCompletedBooks();
      expect(fetch).toHaveBeenCalledWith('/api/completed-books', expect.any(Object));
    });
  });

  describe('pickANumber', () => {
    it('sends POST to /api/pick-a-number with number and includeRead', async () => {
      await mockFetchOk({ book: { id: 1 }, totalEligible: 10 });
      await api.pickANumber(7, true);
      expect(fetch).toHaveBeenCalledWith(
        '/api/pick-a-number',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ number: 7, includeRead: true }),
          credentials: 'include'
        })
      );
    });
  });
});
