const API_BASE = '/api';

// Helper to make requests with credentials (cookies)
async function fetchWithCredentials(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies in requests
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Handle 401 - redirect to login if session expired
  if (response.status === 401) {
    // Only redirect if we're not already on an auth page
    const authPages = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
    const isAuthPage = authPages.some(page => window.location.pathname.startsWith(page));
    if (!isAuthPage) {
      window.location.href = '/login';
    }
  }

  return response;
}

// ============ AUTH API ============

export async function login(email, password, rememberMe = false) {
  const response = await fetchWithCredentials(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password, rememberMe }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  return data;
}

export async function register(email, password, name, rememberMe = false) {
  const response = await fetchWithCredentials(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password, name, rememberMe }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Registration failed');
  }

  return data;
}

export async function logout() {
  const response = await fetchWithCredentials(`${API_BASE}/auth/logout`, {
    method: 'POST',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Logout failed');
  }

  return response.json();
}

export async function getCurrentUser() {
  const response = await fetchWithCredentials(`${API_BASE}/auth/me`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Not authenticated');
  }

  return data;
}

export async function updateTheme(theme) {
  const response = await fetchWithCredentials(`${API_BASE}/auth/theme`, {
    method: 'PUT',
    body: JSON.stringify({ theme }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update theme');
  }

  return data;
}

export async function updateProfile(updates) {
  const response = await fetchWithCredentials(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update profile');
  }

  return data;
}

export async function updateEmail(email, password) {
  const response = await fetchWithCredentials(`${API_BASE}/auth/email`, {
    method: 'PUT',
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update email');
  }

  return data;
}

export async function forgotPassword(email) {
  const response = await fetchWithCredentials(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to send reset email');
  }

  return data;
}

export async function validateResetToken(token) {
  const response = await fetchWithCredentials(`${API_BASE}/auth/validate-reset-token?token=${encodeURIComponent(token)}`);

  const data = await response.json();

  return data;
}

export async function resetPassword(token, password) {
  const response = await fetchWithCredentials(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to reset password');
  }

  return data;
}

export async function deleteAccount(password) {
  const response = await fetchWithCredentials(`${API_BASE}/auth/account`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete account');
  }

  return data;
}

export async function verifyEmail(token) {
  const response = await fetchWithCredentials(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to verify email');
  }

  return data;
}

export async function validateVerificationToken(token) {
  const response = await fetchWithCredentials(`${API_BASE}/auth/validate-verification-token?token=${encodeURIComponent(token)}`);

  const data = await response.json();

  return data;
}

export async function resendVerificationEmail() {
  const response = await fetchWithCredentials(`${API_BASE}/auth/resend-verification`, {
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to resend verification email');
  }

  return data;
}

export async function updateViewMode(viewMode) {
  const response = await fetchWithCredentials(`${API_BASE}/auth/view-mode`, {
    method: 'PUT',
    body: JSON.stringify({ viewMode }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update view mode');
  }

  return data;
}

// ============ BOOKS API ============

export async function scanISBN(isbn) {
  const response = await fetchWithCredentials(`${API_BASE}/books/scan`, {
    method: 'POST',
    body: JSON.stringify({ isbn }),
  });

  const data = await response.json();

  if (!response.ok) {
    // Include the ISBN in the error so the UI can offer manual entry
    const error = new Error(data.error || 'Failed to scan ISBN');
    error.isbn = data.isbn || isbn;
    error.notFound = response.status === 404;
    throw error;
  }

  return data;
}

export async function getBooks() {
  const response = await fetchWithCredentials(`${API_BASE}/books`);

  if (!response.ok) {
    throw new Error('Failed to fetch books');
  }

  return response.json();
}

export async function addBook(bookData) {
  const response = await fetchWithCredentials(`${API_BASE}/books`, {
    method: 'POST',
    body: JSON.stringify(bookData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add book');
  }

  return response.json();
}

export async function searchAndAddBook(title, author, isbn = null) {
  const response = await fetchWithCredentials(`${API_BASE}/books/search`, {
    method: 'POST',
    body: JSON.stringify({ title, author, isbn }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error = new Error(errorData.error || 'Failed to add book');
    // Include additional context for ISBN not found errors
    error.isbnNotFound = response.status === 404 && errorData.error === 'ISBN not found';
    error.title = errorData.title;
    error.author = errorData.author;
    throw error;
  }

  return response.json();
}

export async function deleteBook(id) {
  const response = await fetchWithCredentials(`${API_BASE}/books/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete book');
  }

  return response.json();
}

export async function updateBook(id, updates) {
  const response = await fetchWithCredentials(`${API_BASE}/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update book');
  }

  return response.json();
}

export async function getSeriesList() {
  const response = await fetchWithCredentials(`${API_BASE}/books/series/list`);

  if (!response.ok) {
    throw new Error('Failed to fetch series');
  }

  return response.json();
}

export async function getBook(id) {
  const response = await fetchWithCredentials(`${API_BASE}/books/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch book');
  }

  return response.json();
}

// ============ BOOK RATINGS API ============

export async function getBookRating(bookId) {
  const response = await fetchWithCredentials(`${API_BASE}/books/${bookId}/rating`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch rating');
  }

  return response.json();
}

export async function saveBookRating(bookId, rating, comment = null) {
  const response = await fetchWithCredentials(`${API_BASE}/books/${bookId}/rating`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save rating');
  }

  return response.json();
}

export async function deleteBookRating(bookId) {
  const response = await fetchWithCredentials(`${API_BASE}/books/${bookId}/rating`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete rating');
  }

  return response.json();
}

// ============ EXPORT API ============

export async function exportBooks(type = 'comprehensive', format = 'json') {
  const response = await fetchWithCredentials(
    `${API_BASE}/books/export?type=${encodeURIComponent(type)}&format=${encodeURIComponent(format)}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to export books');
  }

  // Get the filename from Content-Disposition header or generate one
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = `shelfwise-library-${type}-${new Date().toISOString().split('T')[0]}.${format}`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="(.+)"/);
    if (match) {
      filename = match[1];
    }
  }

  // Get the blob for download
  const blob = await response.blob();

  // Trigger download
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return { success: true, filename };
}

// ============ IMPORT API ============

// Step 1: Parse and lookup - returns books categorized by found/notFound/duplicates
export async function parseImportFile(file) {
  const format = getFileFormat(file.name);

  let data;
  if (format === 'xlsx' || format === 'xls') {
    data = await readFileAsBase64(file);
  } else {
    data = await readFileAsText(file);
  }

  const response = await fetchWithCredentials(`${API_BASE}/books/import/parse`, {
    method: 'POST',
    body: JSON.stringify({ data, format }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to parse import file');
  }

  return result;
}

// Step 2: Confirm and import selected books
export async function confirmImport(booksToImport) {
  const response = await fetchWithCredentials(`${API_BASE}/books/import/confirm`, {
    method: 'POST',
    body: JSON.stringify({ booksToImport }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to import books');
  }

  return result;
}

// Helper to download data as a file
export function downloadAsFile(data, filename, type = 'application/json') {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function getFileFormat(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'json') return 'json';
  if (ext === 'csv') return 'csv';
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'xls') return 'xls';
  throw new Error('Unsupported file format. Please use JSON, CSV, or Excel (.xlsx/.xls) files.');
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ============ COMPLETED BOOKS API ============

export async function getCompletedBooks() {
  const response = await fetchWithCredentials(`${API_BASE}/completed-books`);

  if (!response.ok) {
    throw new Error('Failed to fetch completed books');
  }

  return response.json();
}

export async function getCompletedBook(id) {
  const response = await fetchWithCredentials(`${API_BASE}/completed-books/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch completed book');
  }

  return response.json();
}

export async function deleteCompletedBook(id) {
  const response = await fetchWithCredentials(`${API_BASE}/completed-books/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete completed book');
  }

  return response.json();
}

export async function updateCompletedBook(id, updates) {
  const response = await fetchWithCredentials(`${API_BASE}/completed-books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update completed book');
  }

  return response.json();
}

export async function addCompletedBookToLibrary(id) {
  const response = await fetchWithCredentials(`${API_BASE}/completed-books/${id}/add-to-library`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add book to library');
  }

  return response.json();
}

export async function getCompletedSeriesList() {
  const response = await fetchWithCredentials(`${API_BASE}/completed-books/series/list`);

  if (!response.ok) {
    throw new Error('Failed to fetch completed books series');
  }

  return response.json();
}

// ============ COMPLETED BOOK RATINGS API ============

export async function getCompletedBookRating(bookId) {
  const response = await fetchWithCredentials(`${API_BASE}/completed-books/${bookId}/rating`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch rating');
  }

  return response.json();
}

export async function saveCompletedBookRating(bookId, rating, comment = null) {
  const response = await fetchWithCredentials(`${API_BASE}/completed-books/${bookId}/rating`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save rating');
  }

  return response.json();
}

export async function deleteCompletedBookRating(bookId) {
  const response = await fetchWithCredentials(`${API_BASE}/completed-books/${bookId}/rating`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete rating');
  }

  return response.json();
}

// ============ COMPLETED BOOKS EXPORT API ============

export async function exportCompletedBooks(type = 'comprehensive', format = 'json') {
  const response = await fetchWithCredentials(
    `${API_BASE}/completed-books/export?type=${encodeURIComponent(type)}&format=${encodeURIComponent(format)}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to export completed books');
  }

  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = `shelfwise-completed-books-${type}-${new Date().toISOString().split('T')[0]}.${format}`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="(.+)"/);
    if (match) {
      filename = match[1];
    }
  }

  const blob = await response.blob();

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return { success: true, filename };
}

// ============ COMPLETED BOOKS IMPORT API ============

// Step 1: Parse and lookup - returns books categorized by found/notFound/duplicates/libraryUpdates
export async function parseCompletedBooksImport(file) {
  const format = getFileFormat(file.name);

  let data;
  if (format === 'xlsx' || format === 'xls') {
    data = await readFileAsBase64(file);
  } else {
    data = await readFileAsText(file);
  }

  const response = await fetchWithCredentials(`${API_BASE}/completed-books/import/parse`, {
    method: 'POST',
    body: JSON.stringify({ data, format }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to parse import file');
  }

  return result;
}

// Step 2: Confirm and import selected books + update library books
export async function confirmCompletedBooksImport(booksToImport, libraryUpdates = []) {
  const response = await fetchWithCredentials(`${API_BASE}/completed-books/import/confirm`, {
    method: 'POST',
    body: JSON.stringify({ booksToImport, libraryUpdates }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to import completed books');
  }

  return result;
}

// ============ PICK A NUMBER API ============

export async function pickANumber(number, includeRead = false) {
  const response = await fetchWithCredentials(`${API_BASE}/pick-a-number`, {
    method: 'POST',
    body: JSON.stringify({ number, includeRead }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to pick a book');
  }

  return data;
}

// ============ FRIENDS API ============

export async function sendFriendRequest(email) {
  const response = await fetchWithCredentials(`${API_BASE}/friends/request`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to send friend request');
  }

  return data;
}

export async function getFriendRequests() {
  const response = await fetchWithCredentials(`${API_BASE}/friends/requests`);

  if (!response.ok) {
    throw new Error('Failed to fetch friend requests');
  }

  return response.json();
}

export async function getFriendRequestCount() {
  const response = await fetchWithCredentials(`${API_BASE}/friends/requests/count`);

  if (!response.ok) {
    throw new Error('Failed to fetch request count');
  }

  return response.json();
}

export async function acceptFriendRequest(requestId) {
  const response = await fetchWithCredentials(`${API_BASE}/friends/requests/${requestId}/accept`, {
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to accept friend request');
  }

  return data;
}

export async function declineFriendRequest(requestId) {
  const response = await fetchWithCredentials(`${API_BASE}/friends/requests/${requestId}/decline`, {
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to decline friend request');
  }

  return data;
}

export async function getFriends(search = '') {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await fetchWithCredentials(`${API_BASE}/friends${params}`);

  if (!response.ok) {
    throw new Error('Failed to fetch friends');
  }

  return response.json();
}

export async function getFriendCount() {
  const response = await fetchWithCredentials(`${API_BASE}/friends/count`);

  if (!response.ok) {
    throw new Error('Failed to fetch friend count');
  }

  return response.json();
}

export async function unfriend(friendId) {
  const response = await fetchWithCredentials(`${API_BASE}/friends/${friendId}`, {
    method: 'DELETE',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to remove friend');
  }

  return data;
}


export async function getFriendBooks(friendId) {
  const response = await fetchWithCredentials(`${API_BASE}/friends/${friendId}/books`);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to fetch friend's library");
  }

  return response.json();
}

// ============ BORROW API ============

export async function sendBorrowRequest(bookId) {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/request`, {
    method: 'POST',
    body: JSON.stringify({ bookId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to send borrow request');
  }

  return data;
}

export async function getBorrowRequests() {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/requests`);

  if (!response.ok) {
    throw new Error('Failed to fetch borrow requests');
  }

  return response.json();
}

export async function getBorrowRequestCount() {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/requests/count`);

  if (!response.ok) {
    throw new Error('Failed to fetch borrow request count');
  }

  return response.json();
}

export async function acceptBorrowRequest(requestId) {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/requests/${requestId}/accept`, {
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to accept borrow request');
  }

  return data;
}

export async function declineBorrowRequest(requestId) {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/requests/${requestId}/decline`, {
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to decline borrow request');
  }

  return data;
}

export async function getLendingBooks() {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/lending`);

  if (!response.ok) {
    throw new Error('Failed to fetch lending books');
  }

  return response.json();
}

export async function getBorrowingBooks() {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/borrowing`);

  if (!response.ok) {
    throw new Error('Failed to fetch borrowing books');
  }

  return response.json();
}

export async function requestReturn(bookId) {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/${bookId}/request-return`, {
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to request return');
  }

  return data;
}

export async function acknowledgeReturn(bookId) {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/${bookId}/acknowledge-return`, {
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to acknowledge return');
  }

  return data;
}

export async function initiateReturn(bookId) {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/${bookId}/initiate-return`, {
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to initiate return');
  }

  return data;
}

export async function confirmReturn(bookId) {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/${bookId}/confirm-return`, {
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to confirm return');
  }

  return data;
}

export async function getIncomingReturns() {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/incoming-returns`);

  if (!response.ok) {
    throw new Error('Failed to fetch incoming returns');
  }

  return response.json();
}

export async function getIncomingReturnCount() {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/incoming-returns/count`);

  if (!response.ok) {
    throw new Error('Failed to fetch incoming return count');
  }

  return response.json();
}

export async function getReturnRequests() {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/return-requests`);

  if (!response.ok) {
    throw new Error('Failed to fetch return requests');
  }

  return response.json();
}

export async function getReturnRequestCount() {
  const response = await fetchWithCredentials(`${API_BASE}/borrow/return-requests/count`);

  if (!response.ok) {
    throw new Error('Failed to fetch return request count');
  }

  return response.json();
}
