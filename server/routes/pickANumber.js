import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production';

function handleError(res, error, publicMessage) {
  console.error(publicMessage + ':', error);
  res.status(500).json({ error: isProduction ? publicMessage : error.message });
}

// ========================================================================
// FIVE-LAYER BOOK SELECTION ALGORITHM
//
// Selects a "random"-feeling but deterministic book from the user's library
// based on a number they provide. A time-based seed (hours, minutes, seconds)
// is mixed in so the same number gives a different result each second.
//
// Layer 1: User Number Transformation (arithmetic + bitwise scrambling)
// Layer 2: Book Hashing (FNV-1a on metadata)
// Layer 3: Mixing & Entropy (XOR, modular multiplication, bit rotation)
// Layer 4: Chaotic / Nonlinear Mapping (logistic map + sine map)
// Layer 5: Spectral / Statistical Balancing (Halton sequence adjustment)
// ========================================================================

// --- Time Seed ---
// Returns a numeric seed derived from the current hours, minutes, and seconds.
// This ensures the same user number gives a different result at different times.
function getTimeSeed() {
  const now = new Date();
  // Encode time as HHMMSSmmm — changes every millisecond
  const timeSeed = now.getHours() * 10000000
    + now.getMinutes() * 100000
    + now.getSeconds() * 1000
    + now.getMilliseconds();
  return timeSeed;
}

// --- LAYER 1: User Number Transformation ---
// Scrambles the raw user input so that sequential numbers produce
// very different internal values. Uses a combination of:
//   - A time-based seed (H/M/S/ms) mixed in via XOR for temporal variation
//   - Modular arithmetic to fold negatives/large numbers into a range
//   - Bit-level mixing inspired by splitmix64 (Stafford variant 13)
//   - Additional XOR shifts to break linear patterns
function transformUserNumber(userNumber) {
  // Convert to a 32-bit-safe positive integer
  // Use modular arithmetic to handle negatives and huge values
  let n = ((userNumber % 2147483647) + 2147483647) % 2147483647;

  // Mix in the time seed so the same number yields different results each time
  const timeSeed = getTimeSeed();
  n = (n ^ timeSeed) >>> 0;

  // Stafford-style bit mixing (adapted for 32-bit JS integers)
  // Step 1: XOR with right-shifted self to break low-bit patterns
  n = n ^ (n >>> 16);
  // Step 2: Multiply by a large odd constant (golden ratio–derived)
  n = Math.imul(n, 0x45d9f3b);
  // Step 3: Another XOR shift to propagate bit changes
  n = n ^ (n >>> 16);
  // Step 4: Second multiplication with a different constant
  n = Math.imul(n, 0x45d9f3b);
  // Step 5: Final XOR shift
  n = n ^ (n >>> 16);

  // Force result to unsigned 32-bit
  return n >>> 0;
}

// --- LAYER 2: Book Hashing (FNV-1a) ---
// Produces a unique numeric fingerprint for each book based on its metadata.
// FNV-1a is a fast, well-distributed non-cryptographic hash.
//   - offset_basis = 2166136261 (FNV standard for 32-bit)
//   - prime = 16777619 (FNV standard for 32-bit)
// We hash: title, author, genre, isbn, page_count, series_name
function fnv1aHash(str) {
  let hash = 2166136261; // FNV offset basis (32-bit)
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // Multiply by FNV prime using Math.imul for proper 32-bit multiplication
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0; // Force unsigned 32-bit
}

function hashBook(book) {
  // Concatenate metadata fields with delimiters to avoid collisions
  // e.g., title="AB" author="C" vs title="A" author="BC"
  const metadata = [
    book.title || '',
    book.author || '',
    book.genre || '',
    book.isbn || '',
    String(book.page_count || 0),
    book.series_name || ''
  ].join('\x1f'); // ASCII unit separator as delimiter

  return fnv1aHash(metadata);
}

// --- LAYER 3: Mixing & Entropy ---
// Combines the transformed user number with each book's hash using
// nonlinear operations to increase entropy:
//   - XOR: combines bits without losing information
//   - Bit rotation: moves bits around to spread influence
//   - Modular multiplication: nonlinear mixing
function rotateLeft32(value, shift) {
  // Circular left rotation on a 32-bit unsigned integer
  shift = shift & 31; // Ensure shift is within 0-31
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function mixEntropy(transformedNumber, bookHash) {
  // Step 1: XOR the two values together
  let mixed = (transformedNumber ^ bookHash) >>> 0;

  // Step 2: Rotate left by 13 bits (a prime number of positions)
  mixed = rotateLeft32(mixed, 13);

  // Step 3: Modular multiplication with a large prime
  // This creates nonlinear diffusion — small input changes cascade
  mixed = Math.imul(mixed, 0x5bd1e995) >>> 0; // Murmur hash constant

  // Step 4: XOR with shifted version of itself
  mixed = (mixed ^ (mixed >>> 15)) >>> 0;

  // Step 5: Another round of multiplication for thorough mixing
  mixed = Math.imul(mixed, 0x27d4eb2d) >>> 0; // Another mixing constant

  // Step 6: Final XOR shift
  mixed = (mixed ^ (mixed >>> 13)) >>> 0;

  return mixed;
}

// --- LAYER 4: Chaotic / Nonlinear Mapping ---
// Applies the logistic map and sine map — classic chaos theory functions —
// to amplify small differences in mixed values into large output differences.
//
// Logistic map: x_{n+1} = r * x_n * (1 - x_n)
//   At r = 3.99 (near max chaos at r = 4.0, but avoids fixed points)
//
// Sine map: x_{n+1} = sin(pi * x_n) (maps [0,1] → [0,1])
//
// We iterate multiple times to ensure thorough scrambling.
function chaoticMap(value) {
  // Normalize the 32-bit integer to [0.01, 0.99] to avoid
  // logistic map fixed points at 0 and 1
  let x = 0.01 + (value / 4294967295) * 0.98;

  const r = 3.99; // Logistic map parameter (deep chaos regime)

  // 20 iterations of alternating logistic and sine maps
  for (let i = 0; i < 20; i++) {
    // Logistic map step
    x = r * x * (1 - x);

    // Sine map step — adds a different nonlinear dynamic
    // sin(pi * x) maps [0,1] → [0,1] with max at x=0.5
    x = Math.sin(Math.PI * x);

    // Clamp to avoid numerical drift outside [0,1]
    x = Math.max(0.001, Math.min(0.999, x));
  }

  return x; // Returns a value in (0, 1)
}

// --- LAYER 5: Spectral / Statistical Balancing ---
// Uses a Halton-sequence-inspired quasi-random adjustment to improve
// the uniformity of the distribution across all books.
//
// The Halton sequence generates low-discrepancy sequences that fill
// space more evenly than purely random numbers. We use base-2 and
// base-3 Halton values to nudge our chaotic output toward better
// coverage of the full book list.
//
// Additionally applies modular lattice folding: maps the continuous
// [0,1] value onto a lattice of N points (where N = number of books)
// using golden-ratio spacing to avoid clustering.
function haltonSequence(index, base) {
  // Generates the nth element of the Halton sequence in the given base
  // Returns a value in (0, 1) with low discrepancy
  let result = 0;
  let f = 1 / base;
  let i = index;

  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }

  return result;
}

function spectralBalance(chaoticValue, bookIndex, totalBooks) {
  // Halton adjustment: use the book's position to generate a
  // quasi-random offset that prevents clustering
  const halton2 = haltonSequence(bookIndex + 1, 2); // Base-2 Halton
  const halton3 = haltonSequence(bookIndex + 1, 3); // Base-3 Halton

  // Combine chaotic value with Halton offsets
  // Weight: 70% chaotic, 15% each Halton base
  let balanced = (0.70 * chaoticValue) + (0.15 * halton2) + (0.15 * halton3);

  // Golden ratio modular folding
  // Adding phi (golden ratio conjugate) and taking mod 1 produces
  // a well-distributed sequence that avoids clustering
  const PHI = 0.6180339887498949; // (sqrt(5) - 1) / 2
  balanced = (balanced + PHI * bookIndex / totalBooks) % 1.0;

  return balanced;
}

// --- FINAL SELECTION ---
// Runs all 5 layers, scores each book, and returns the one with the
// highest combined score. This is deterministic: same input = same result.
function selectBook(userNumber, books) {
  // Layer 1: Transform user input
  const transformed = transformUserNumber(userNumber);

  let bestBook = null;
  let bestScore = -1;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];

    // Layer 2: Hash book metadata
    const bookHash = hashBook(book);

    // Layer 3: Mix user number with book hash
    const mixed = mixEntropy(transformed, bookHash);

    // Layer 4: Apply chaotic mapping
    const chaotic = chaoticMap(mixed);

    // Layer 5: Spectral balancing
    const score = spectralBalance(chaotic, i, books.length);

    if (score > bestScore) {
      bestScore = score;
      bestBook = book;
    }
  }

  return bestBook;
}

// ========================================================================
// API ENDPOINT
// ========================================================================

// POST /api/pick-a-number - Select a book based on user's number
router.post('/', (req, res) => {
  try {
    const userId = req.user.id;
    const { number, includeRead } = req.body;

    // Validate: must be a whole number (integer)
    if (number === undefined || number === null || number === '') {
      return res.status(400).json({ error: 'Please provide a number' });
    }

    const parsed = Number(number);
    if (!Number.isInteger(parsed)) {
      return res.status(400).json({ error: 'Please provide a whole number (no decimals)' });
    }

    // Fetch user's books
    const books = db.prepare('SELECT * FROM books WHERE user_id = ? ORDER BY id').all(userId);

    // Parse tags for each book
    const parsedBooks = books.map(book => ({
      ...book,
      tags: book.tags ? JSON.parse(book.tags) : []
    }));

    // Filter to eligible books
    const eligible = parsedBooks.filter(book => {
      // Must not be currently being read (that's already in progress)
      if (book.reading_status === 'reading') return false;
      // Filter by read status
      if (!includeRead && book.reading_status === 'read') return false;
      // Exclude later series entries
      if (book.series_name && book.series_position != null && book.series_position > 1) return false;
      return true;
    });

    if (eligible.length === 0) {
      return res.status(404).json({
        error: 'No eligible books found',
        message: includeRead
          ? 'All books are currently being read or are later entries in a series.'
          : 'No unread books available. Try including books already read.'
      });
    }

    // Run the 5-layer algorithm
    const selected = selectBook(parsed, eligible);

    res.json({
      book: selected,
      totalEligible: eligible.length,
      number: parsed
    });
  } catch (error) {
    handleError(res, error, 'Failed to pick a book');
  }
});

export default router;
