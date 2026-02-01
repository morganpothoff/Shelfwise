/**
 * Book Lookup Service
 * Uses Open Library API and Google Books API to fetch book metadata
 */

export async function lookupISBN(isbn) {
  // Clean the ISBN (remove dashes and spaces)
  const cleanIsbn = isbn.replace(/[-\s]/g, '');

  // Try Open Library API first
  const openLibraryData = await fetchFromOpenLibrary(cleanIsbn);
  if (openLibraryData) {
    return openLibraryData;
  }

  // Fallback to Google Books API
  const googleBooksData = await fetchFromGoogleBooks(cleanIsbn);
  if (googleBooksData) {
    return googleBooksData;
  }

  return null;
}

/**
 * Search for a book by title and author
 */
export async function searchByTitleAuthor(title, author, isbn = null) {
  // Try Open Library search first
  const openLibraryData = await searchOpenLibrary(title, author);
  if (openLibraryData) {
    return { ...openLibraryData, isbn: isbn || openLibraryData.isbn };
  }

  // Fallback to Google Books search
  const googleBooksData = await searchGoogleBooks(title, author);
  if (googleBooksData) {
    return { ...googleBooksData, isbn: isbn || googleBooksData.isbn };
  }

  // Return basic data if no match found
  return {
    isbn: isbn,
    title: title,
    author: author,
    page_count: null,
    genre: '',
    synopsis: '',
    tags: '[]',
    series_name: null,
    series_position: null
  };
}

/**
 * Extract series info from Open Library work data
 */
async function getSeriesInfoFromOpenLibrary(workKey) {
  if (!workKey) return { series_name: null, series_position: null };

  try {
    const workResponse = await fetch(`https://openlibrary.org${workKey}.json`);
    if (!workResponse.ok) return { series_name: null, series_position: null };

    const workData = await workResponse.json();

    // Check for series in the work data
    if (workData.series && workData.series.length > 0) {
      const seriesEntry = workData.series[0];
      // Series can be a string like "Harry Potter #1" or an object
      if (typeof seriesEntry === 'string') {
        const parsed = parseSeriesString(seriesEntry);
        return parsed;
      }
    }

    return { series_name: null, series_position: null };
  } catch (e) {
    console.error('Error fetching series info:', e);
    return { series_name: null, series_position: null };
  }
}

/**
 * Normalize a series name to a canonical form
 * Removes common suffixes, normalizes case, etc.
 */
function normalizeSeriesName(name) {
  if (!name) return null;

  let normalized = name
    // Remove common suffixes
    .replace(/\s*[-–—]\s*(bk\.?|book|vol\.?|volume|series|novels?)\.?\s*$/i, '')
    .replace(/\s+(series|novels?)\s*$/i, '')
    // Remove trailing punctuation
    .replace(/[,;:.\-–—]+\s*$/, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Title case the result
  normalized = normalized
    .toLowerCase()
    .replace(/(?:^|\s)\w/g, match => match.toUpperCase());

  // Handle "The" at the beginning consistently
  if (normalized.toLowerCase().startsWith('the ')) {
    normalized = 'The ' + normalized.slice(4);
  }

  return normalized;
}

/**
 * Parse series string like "Harry Potter #1" or "The Hunger Games, Book 2"
 */
function parseSeriesString(seriesStr) {
  if (!seriesStr) return { series_name: null, series_position: null };

  // Common patterns:
  // "Series Name #1"
  // "Series Name, #1"
  // "Series Name, Book 1"
  // "Series Name (Book 1)"
  // "Series Name 1"
  // "The lunar chronicles -- bk. 3"

  const patterns = [
    /^(.+?)\s*[-–—]+\s*(?:bk\.?|book|vol\.?|volume)\s*\.?\s*(\d+(?:\.\d+)?)\s*$/i,
    /^(.+?)\s*#(\d+(?:\.\d+)?)\s*$/i,
    /^(.+?),?\s*#(\d+(?:\.\d+)?)\s*$/i,
    /^(.+?),?\s*(?:book|vol\.?|volume)\s*(\d+(?:\.\d+)?)\s*$/i,
    /^(.+?)\s*\((?:book|vol\.?|volume)?\s*#?(\d+(?:\.\d+)?)\)\s*$/i,
    /^(.+?)\s+(\d+(?:\.\d+)?)\s*$/i
  ];

  for (const pattern of patterns) {
    const match = seriesStr.match(pattern);
    if (match) {
      return {
        series_name: normalizeSeriesName(match[1]),
        series_position: parseFloat(match[2])
      };
    }
  }

  // If no number found, it might just be the series name
  return { series_name: normalizeSeriesName(seriesStr), series_position: null };
}

/**
 * Extract series info from Google Books volume info
 */
function getSeriesInfoFromGoogleBooks(volumeInfo) {
  // Google Books sometimes includes series info in the title or subtitle
  const title = volumeInfo.title || '';
  const subtitle = volumeInfo.subtitle || '';

  // Check subtitle for series info like "Book 1 of The Hunger Games"
  const subtitlePatterns = [
    /(?:book|vol\.?|volume)\s*(\d+(?:\.\d+)?)\s*(?:of|in)\s+(?:the\s+)?(.+)/i,
    /(.+?)\s*(?:series)?,?\s*(?:book|vol\.?|volume)\s*(\d+(?:\.\d+)?)/i
  ];

  for (const pattern of subtitlePatterns) {
    const match = subtitle.match(pattern);
    if (match) {
      // Pattern 1: "Book 1 of Series Name"
      if (pattern.source.startsWith('(?:book')) {
        return {
          series_name: match[2].trim(),
          series_position: parseFloat(match[1])
        };
      }
      // Pattern 2: "Series Name, Book 1"
      return {
        series_name: match[1].trim(),
        series_position: parseFloat(match[2])
      };
    }
  }

  // Check if seriesInfo is available (newer Google Books API)
  if (volumeInfo.seriesInfo) {
    return {
      series_name: volumeInfo.seriesInfo.shortSeriesBookTitle || volumeInfo.seriesInfo.bookDisplayNumber || null,
      series_position: volumeInfo.seriesInfo.volumeSeries?.[0]?.orderNumber || null
    };
  }

  return { series_name: null, series_position: null };
}

async function searchOpenLibrary(title, author) {
  try {
    const query = encodeURIComponent(`${title} ${author}`);
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${query}&limit=5`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.docs || data.docs.length === 0) {
      return null;
    }

    // Find the best match - prefer exact title match
    const normalizedTitle = title.toLowerCase().trim();

    const bestMatch = data.docs.find(doc => {
      const docTitle = (doc.title || '').toLowerCase();
      return docTitle.includes(normalizedTitle) || normalizedTitle.includes(docTitle);
    }) || data.docs[0];

    // Get more details if we have a work key
    let synopsis = '';
    let seriesInfo = { series_name: null, series_position: null };

    if (bestMatch.key) {
      try {
        const workResponse = await fetch(`https://openlibrary.org${bestMatch.key}.json`);
        if (workResponse.ok) {
          const workData = await workResponse.json();
          synopsis = typeof workData.description === 'string'
            ? workData.description
            : workData.description?.value || '';

          // Extract series info
          if (workData.series && workData.series.length > 0) {
            seriesInfo = parseSeriesString(workData.series[0]);
          }
        }
      } catch (e) {
        // Ignore errors fetching work details
      }
    }

    return {
      isbn: bestMatch.isbn?.[0] || null,
      title: bestMatch.title || title,
      author: bestMatch.author_name?.join(', ') || author,
      page_count: bestMatch.number_of_pages_median || null,
      genre: bestMatch.subject?.slice(0, 3).join(', ') || '',
      synopsis: synopsis,
      tags: JSON.stringify(bestMatch.subject?.slice(0, 10) || []),
      series_name: seriesInfo.series_name,
      series_position: seriesInfo.series_position
    };
  } catch (error) {
    console.error('Open Library search error:', error);
    return null;
  }
}

async function searchGoogleBooks(title, author) {
  try {
    const query = encodeURIComponent(`intitle:${title} inauthor:${author}`);
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const volumeInfo = data.items[0].volumeInfo;
    const industryIds = volumeInfo.industryIdentifiers || [];
    const isbn = industryIds.find(id => id.type === 'ISBN_13')?.identifier ||
                 industryIds.find(id => id.type === 'ISBN_10')?.identifier || null;

    const seriesInfo = getSeriesInfoFromGoogleBooks(volumeInfo);

    return {
      isbn: isbn,
      title: volumeInfo.title || title,
      author: volumeInfo.authors?.join(', ') || author,
      page_count: volumeInfo.pageCount || null,
      genre: volumeInfo.categories?.join(', ') || '',
      synopsis: volumeInfo.description || '',
      tags: JSON.stringify(volumeInfo.categories || []),
      series_name: seriesInfo.series_name,
      series_position: seriesInfo.series_position
    };
  } catch (error) {
    console.error('Google Books search error:', error);
    return null;
  }
}

async function fetchFromOpenLibrary(isbn) {
  try {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const bookData = data[`ISBN:${isbn}`];

    if (!bookData) {
      return null;
    }

    // Try to get series info from the work
    let seriesInfo = { series_name: null, series_position: null };
    if (bookData.identifiers?.openlibrary) {
      const workKey = `/works/${bookData.identifiers.openlibrary[0]}`;
      seriesInfo = await getSeriesInfoFromOpenLibrary(workKey);
    }

    return {
      isbn: isbn,
      title: bookData.title || '',
      author: bookData.authors?.map(a => a.name).join(', ') || '',
      page_count: bookData.number_of_pages || null,
      genre: bookData.subjects?.slice(0, 3).map(s => s.name).join(', ') || '',
      synopsis: bookData.notes || bookData.excerpts?.[0]?.text || '',
      tags: JSON.stringify(bookData.subjects?.slice(0, 10).map(s => s.name) || []),
      series_name: seriesInfo.series_name,
      series_position: seriesInfo.series_position
    };
  } catch (error) {
    console.error('Open Library API error:', error);
    return null;
  }
}

async function fetchFromGoogleBooks(isbn) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const volumeInfo = data.items[0].volumeInfo;
    const seriesInfo = getSeriesInfoFromGoogleBooks(volumeInfo);

    return {
      isbn: isbn,
      title: volumeInfo.title || '',
      author: volumeInfo.authors?.join(', ') || '',
      page_count: volumeInfo.pageCount || null,
      genre: volumeInfo.categories?.join(', ') || '',
      synopsis: volumeInfo.description || '',
      tags: JSON.stringify(volumeInfo.categories || []),
      series_name: seriesInfo.series_name,
      series_position: seriesInfo.series_position
    };
  } catch (error) {
    console.error('Google Books API error:', error);
    return null;
  }
}
