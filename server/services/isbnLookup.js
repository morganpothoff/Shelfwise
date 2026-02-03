/**
 * Book Lookup Service
 * Uses Open Library API and Google Books API to fetch book metadata
 */

const MAX_TAG_LENGTH = 25;

/**
 * Clean and normalize tags
 * - Removes duplicates (case-insensitive)
 * - Removes tags longer than MAX_TAG_LENGTH characters
 * - Removes special characters (keeps only alphanumeric, spaces, and hyphens)
 * - Trims whitespace
 */
function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];

  const seen = new Set();
  const cleaned = [];

  for (const tag of tags) {
    if (typeof tag !== 'string') continue;

    // Remove special characters (keep letters, numbers, spaces, hyphens)
    let cleanedTag = tag
      .replace(/[^a-zA-Z0-9\s\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Skip if empty after cleaning
    if (!cleanedTag) continue;

    // Skip if too long
    if (cleanedTag.length > MAX_TAG_LENGTH) continue;

    // Skip duplicates (case-insensitive)
    const lowerTag = cleanedTag.toLowerCase();
    if (seen.has(lowerTag)) continue;

    seen.add(lowerTag);
    cleaned.push(cleanedTag);
  }

  return cleaned;
}

export async function lookupISBN(isbn) {
  // Clean the ISBN (remove dashes and spaces)
  const cleanIsbn = isbn.replace(/[-\s]/g, '');

  // Try Open Library API first
  const openLibraryData = await fetchFromOpenLibrary(cleanIsbn);

  // If Open Library has data but is missing synopsis, try Google Books to fill it in
  if (openLibraryData) {
    if (!openLibraryData.synopsis) {
      const googleBooksData = await fetchFromGoogleBooks(cleanIsbn);
      if (googleBooksData?.synopsis) {
        openLibraryData.synopsis = googleBooksData.synopsis;
      }
    }
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
 * Merges data from search results with ISBN lookup for complete metadata
 */
export async function searchByTitleAuthor(title, author, isbn = null) {
  // Try Open Library search first
  const openLibraryData = await searchOpenLibrary(title, author);

  // Try Google Books search as well
  const googleBooksData = await searchGoogleBooks(title, author);

  // Determine the best ISBN to use
  const foundIsbn = isbn || openLibraryData?.isbn || googleBooksData?.isbn;

  // If we have an ISBN, try to get additional data via ISBN lookup
  let isbnLookupData = null;
  if (foundIsbn) {
    isbnLookupData = await lookupISBN(foundIsbn);
  }

  // Merge all available data, prioritizing more complete sources
  // Priority: ISBN lookup data > Open Library search > Google Books search
  const mergedData = {
    isbn: foundIsbn,
    title: isbnLookupData?.title || openLibraryData?.title || googleBooksData?.title || title,
    author: isbnLookupData?.author || openLibraryData?.author || googleBooksData?.author || author,
    page_count: isbnLookupData?.page_count || openLibraryData?.page_count || googleBooksData?.page_count || null,
    genre: isbnLookupData?.genre || openLibraryData?.genre || googleBooksData?.genre || '',
    synopsis: isbnLookupData?.synopsis || openLibraryData?.synopsis || googleBooksData?.synopsis || '',
    tags: isbnLookupData?.tags || openLibraryData?.tags || googleBooksData?.tags || '[]',
    series_name: isbnLookupData?.series_name || openLibraryData?.series_name || googleBooksData?.series_name || null,
    series_position: isbnLookupData?.series_position ?? openLibraryData?.series_position ?? googleBooksData?.series_position ?? null
  };

  return mergedData;
}

/**
 * Extract series info and description from Open Library work data
 */
async function getWorkDataFromOpenLibrary(workKey) {
  if (!workKey) return { series_name: null, series_position: null, description: '' };

  try {
    const workResponse = await fetch(`https://openlibrary.org${workKey}.json`);
    if (!workResponse.ok) return { series_name: null, series_position: null, description: '' };

    const workData = await workResponse.json();

    // Get description
    const description = typeof workData.description === 'string'
      ? workData.description
      : workData.description?.value || '';

    // Check for series in the work data
    let seriesInfo = { series_name: null, series_position: null };
    if (workData.series && workData.series.length > 0) {
      const seriesEntry = workData.series[0];
      // Series can be a string like "Harry Potter #1" or an object
      if (typeof seriesEntry === 'string') {
        seriesInfo = parseSeriesString(seriesEntry);
      }
    }

    return { ...seriesInfo, description };
  } catch (e) {
    console.error('Error fetching work data:', e);
    return { series_name: null, series_position: null, description: '' };
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
    let editionIsbn = null;

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

      // If no ISBN in search results, try to get one from editions
      if (!bestMatch.isbn || bestMatch.isbn.length === 0) {
        try {
          const editionsResponse = await fetch(`https://openlibrary.org${bestMatch.key}/editions.json?limit=50`);
          if (editionsResponse.ok) {
            const editionsData = await editionsResponse.json();
            const editions = editionsData.entries || [];

            // Prefer English editions - look for English first, then fall back to any edition
            const englishEditions = editions.filter(e =>
              !e.languages ||
              e.languages.length === 0 ||
              e.languages.some(lang => lang.key === '/languages/eng')
            );

            const editionsToSearch = englishEditions.length > 0 ? englishEditions : editions;

            // Find an edition with an ISBN-13 or ISBN-10
            for (const edition of editionsToSearch) {
              if (edition.isbn_13 && edition.isbn_13.length > 0) {
                editionIsbn = edition.isbn_13[0];
                break;
              }
              if (edition.isbn_10 && edition.isbn_10.length > 0) {
                editionIsbn = edition.isbn_10[0];
                break;
              }
            }
          }
        } catch (e) {
          // Ignore errors fetching editions
        }
      }
    }

    return {
      isbn: bestMatch.isbn?.[0] || editionIsbn || null,
      title: bestMatch.title || title,
      author: bestMatch.author_name?.join(', ') || author,
      page_count: bestMatch.number_of_pages_median || null,
      genre: bestMatch.subject?.slice(0, 3).join(', ') || '',
      synopsis: synopsis,
      tags: JSON.stringify(cleanTags(bestMatch.subject?.slice(0, 10) || [])),
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
      tags: JSON.stringify(cleanTags(volumeInfo.categories || [])),
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

    // Try to get the work key from the URL or identifiers
    let workKey = null;

    // First try to get work key from the edition URL
    if (bookData.url) {
      const editionMatch = bookData.url.match(/\/books\/(OL\d+M)/);
      if (editionMatch) {
        try {
          const editionResponse = await fetch(`https://openlibrary.org/books/${editionMatch[1]}.json`);
          if (editionResponse.ok) {
            const editionData = await editionResponse.json();
            if (editionData.works && editionData.works[0]?.key) {
              workKey = editionData.works[0].key;
            }
          }
        } catch (e) {
          // Ignore errors
        }
      }
    }

    // Fetch work data for description and series info
    const workData = await getWorkDataFromOpenLibrary(workKey);

    // Fallback to notes/excerpts if no description from work
    const synopsis = workData.description || bookData.notes || bookData.excerpts?.[0]?.text || '';

    return {
      isbn: isbn,
      title: bookData.title || '',
      author: bookData.authors?.map(a => a.name).join(', ') || '',
      page_count: bookData.number_of_pages || null,
      genre: bookData.subjects?.slice(0, 3).map(s => s.name).join(', ') || '',
      synopsis: synopsis,
      tags: JSON.stringify(cleanTags(bookData.subjects?.slice(0, 10).map(s => s.name) || [])),
      series_name: workData.series_name,
      series_position: workData.series_position
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
      tags: JSON.stringify(cleanTags(volumeInfo.categories || [])),
      series_name: seriesInfo.series_name,
      series_position: seriesInfo.series_position
    };
  } catch (error) {
    console.error('Google Books API error:', error);
    return null;
  }
}
