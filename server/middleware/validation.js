// Input validation middleware for Shelfwise API

// Maximum lengths for text fields
const MAX_LENGTHS = {
  isbn: 17,        // ISBN-13 with dashes: 978-0-00-000000-0
  title: 500,
  author: 300,
  genre: 100,
  synopsis: 10000,
  series_name: 300,
  tag: 100
};

// Validate and sanitize string input
function sanitizeString(value, maxLength) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;

  // Trim whitespace and limit length
  return value.trim().slice(0, maxLength);
}

// Validate ISBN format (ISBN-10 or ISBN-13, with or without dashes)
function isValidISBN(isbn) {
  if (!isbn) return true; // ISBN is optional
  const cleaned = isbn.replace(/[-\s]/g, '');
  return /^(\d{10}|\d{13})$/.test(cleaned);
}

// Validate positive integer
function isPositiveInt(value) {
  if (value === null || value === undefined) return true;
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0 && num < 100000;
}

// Validate series position (can be decimal like 1.5 for novellas)
function isValidSeriesPosition(value) {
  if (value === null || value === undefined) return true;
  const num = parseFloat(value);
  return !isNaN(num) && num > 0 && num < 1000;
}

// Validate tags array
function validateTags(tags) {
  if (!tags) return [];
  if (typeof tags === 'string') {
    try {
      tags = JSON.parse(tags);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(tags)) return [];

  return tags
    .filter(tag => typeof tag === 'string')
    .map(tag => tag.trim().slice(0, MAX_LENGTHS.tag))
    .filter(tag => tag.length > 0)
    .slice(0, 50); // Max 50 tags
}

// Middleware for validating book creation/update
export function validateBook(req, res, next) {
  const errors = [];

  // Sanitize all string fields
  if (req.body.isbn !== undefined) {
    req.body.isbn = sanitizeString(req.body.isbn, MAX_LENGTHS.isbn);
    if (req.body.isbn && !isValidISBN(req.body.isbn)) {
      errors.push('Invalid ISBN format');
    }
  }

  if (req.body.title !== undefined) {
    req.body.title = sanitizeString(req.body.title, MAX_LENGTHS.title);
  }

  if (req.body.author !== undefined) {
    req.body.author = sanitizeString(req.body.author, MAX_LENGTHS.author);
  }

  if (req.body.genre !== undefined) {
    req.body.genre = sanitizeString(req.body.genre, MAX_LENGTHS.genre);
  }

  if (req.body.synopsis !== undefined) {
    req.body.synopsis = sanitizeString(req.body.synopsis, MAX_LENGTHS.synopsis);
  }

  if (req.body.series_name !== undefined) {
    req.body.series_name = sanitizeString(req.body.series_name, MAX_LENGTHS.series_name);
  }

  // Validate numeric fields
  if (req.body.page_count !== undefined && !isPositiveInt(req.body.page_count)) {
    errors.push('Page count must be a positive number');
  }

  if (req.body.series_position !== undefined && !isValidSeriesPosition(req.body.series_position)) {
    errors.push('Series position must be a positive number');
  }

  // Validate and sanitize tags
  if (req.body.tags !== undefined) {
    req.body.tags = validateTags(req.body.tags);
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  next();
}

// Middleware for validating ISBN scan request
export function validateISBNScan(req, res, next) {
  const { isbn } = req.body;

  if (!isbn) {
    return res.status(400).json({ error: 'ISBN is required' });
  }

  const sanitizedISBN = sanitizeString(isbn, MAX_LENGTHS.isbn);

  if (!isValidISBN(sanitizedISBN)) {
    return res.status(400).json({ error: 'Invalid ISBN format' });
  }

  req.body.isbn = sanitizedISBN;
  next();
}

// Middleware for validating search request
export function validateSearch(req, res, next) {
  const errors = [];

  req.body.title = sanitizeString(req.body.title, MAX_LENGTHS.title);
  req.body.author = sanitizeString(req.body.author, MAX_LENGTHS.author);

  if (req.body.isbn !== undefined) {
    req.body.isbn = sanitizeString(req.body.isbn, MAX_LENGTHS.isbn);
    if (req.body.isbn && !isValidISBN(req.body.isbn)) {
      errors.push('Invalid ISBN format');
    }
  }

  if (!req.body.title) {
    errors.push('Title is required');
  }

  if (!req.body.author) {
    errors.push('Author is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  next();
}

// Middleware for validating ID parameter
export function validateIdParam(req, res, next) {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid book ID' });
  }

  req.params.id = id;
  next();
}

/**
 * Reusable middleware for validating a positive integer ID in req.params.
 * @param {string} paramName - Name of the param (e.g. 'friendId', 'bookId')
 * @param {string} [errorMessage] - Custom error message
 */
export function validatePositiveIdParam(paramName, errorMessage = 'Invalid ID') {
  return (req, res, next) => {
    const raw = req.params[paramName];
    const id = parseInt(raw, 10);

    if (raw === undefined || raw === null || isNaN(id) || id < 1) {
      return res.status(400).json({ error: errorMessage });
    }

    req.params[paramName] = id;
    next();
  };
}

// Middleware for validating unified ID parameter (library_N or completed_N)
export function validateUnifiedIdParam(req, res, next) {
  const raw = String(req.params.id);
  let source, numericId;

  if (raw.startsWith('library_')) {
    source = 'library';
    numericId = parseInt(raw.slice(8), 10);
  } else if (raw.startsWith('completed_')) {
    source = 'completed';
    numericId = parseInt(raw.slice(10), 10);
  } else {
    // Legacy fallback: treat as completed
    source = 'completed';
    numericId = parseInt(raw, 10);
  }

  if (isNaN(numericId) || numericId < 1) {
    return res.status(400).json({ error: 'Invalid book ID' });
  }

  req.params.source = source;
  req.params.numericId = numericId;
  next();
}

export default {
  validateBook,
  validateISBNScan,
  validateSearch,
  validateIdParam,
  validateUnifiedIdParam,
  validatePositiveIdParam
};
