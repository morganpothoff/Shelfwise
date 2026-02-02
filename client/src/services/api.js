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
    const error = await response.json();
    throw new Error(error.error || 'Failed to add book');
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
