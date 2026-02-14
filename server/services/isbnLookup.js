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
export function cleanTags(tags) {
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

/**
 * Clean synopsis to remove non-English content.
 * Some book APIs return bilingual descriptions (e.g. English + French).
 * This strips the non-English portion.
 */
export function cleanSynopsis(synopsis) {
  if (!synopsis || typeof synopsis !== 'string') return '';

  let cleaned = synopsis;

  // First, try to extract just the English section if the synopsis has explicit language markers
  // e.g. "« In English: ... En Français: ... »"
  const englishSectionMatch = cleaned.match(
    /[«"]?\s*In\s+English\s*:\s*([\s\S]*?)(?:\s*[«"]?\s*(?:En\s+Fran[çc]ais|En\s+Espa[ñn]ol|Auf\s+Deutsch|In\s+Italiano|Em\s+Portugu[êe]s|In\s+French|In\s+Spanish|In\s+German|In\s+Italian|In\s+Portuguese)\s*:)/i
  );
  if (englishSectionMatch) {
    cleaned = englishSectionMatch[1];
  } else {
    // No explicit "In English" section found — strip non-English sections from the end
    // Patterns like "En Français:", "In French:", "En español:", "In Spanish:", etc.
    const nonEnglishMarkers = [
      /\n\s*[«"]?\s*En\s+Fran[çc]ais\s*:.*$/si,
      /\n\s*[«"]?\s*In\s+French\s*:.*$/si,
      /\n\s*[«"]?\s*En\s+Espa[ñn]ol\s*:.*$/si,
      /\n\s*[«"]?\s*In\s+Spanish\s*:.*$/si,
      /\n\s*[«"]?\s*En\s+Allemand\s*:.*$/si,
      /\n\s*[«"]?\s*In\s+German\s*:.*$/si,
      /\n\s*[«"]?\s*Auf\s+Deutsch\s*:.*$/si,
      /\n\s*[«"]?\s*In\s+Italiano\s*:.*$/si,
      /\n\s*[«"]?\s*In\s+Italian\s*:.*$/si,
      /\n\s*[«"]?\s*Em\s+Portugu[êe]s\s*:.*$/si,
      /\n\s*[«"]?\s*In\s+Portuguese\s*:.*$/si,
    ];

    for (const marker of nonEnglishMarkers) {
      cleaned = cleaned.replace(marker, '');
    }
  }

  // Strip any remaining "In English:" prefix that may be left over
  cleaned = cleaned.replace(/^\s*[«"]?\s*In\s+English\s*:\s*/i, '');

  // Clean up leading/trailing whitespace, quotes, and guillemets
  cleaned = cleaned.replace(/^[\s«"]+/, '').replace(/[\s»"]+$/, '').trim();

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

    // If no series info found, check known series patterns
    if (!openLibraryData.series_name) {
      const knownSeries = checkKnownSeries(openLibraryData.title, openLibraryData.author);
      if (knownSeries.series_name) {
        openLibraryData.series_name = knownSeries.series_name;
        openLibraryData.series_position = knownSeries.series_position;
      }
    } else if (openLibraryData.series_position === null) {
      // We have series name from API but no position - try to get position from known series
      const position = getPositionFromKnownSeries(openLibraryData.title, openLibraryData.series_name);
      if (position !== null) {
        openLibraryData.series_position = position;
      }
    }

    return openLibraryData;
  }

  // Fallback to Google Books API
  const googleBooksData = await fetchFromGoogleBooks(cleanIsbn);
  if (googleBooksData) {
    // If no series info found, check known series patterns
    if (!googleBooksData.series_name) {
      const knownSeries = checkKnownSeries(googleBooksData.title, googleBooksData.author);
      if (knownSeries.series_name) {
        googleBooksData.series_name = knownSeries.series_name;
        googleBooksData.series_position = knownSeries.series_position;
      }
    } else if (googleBooksData.series_position === null) {
      // We have series name from API but no position - try to get position from known series
      const position = getPositionFromKnownSeries(googleBooksData.title, googleBooksData.series_name);
      if (position !== null) {
        googleBooksData.series_position = position;
      }
    }
    return googleBooksData;
  }

  return null;
}

/**
 * Check if two author strings are similar enough to be considered a match.
 * Handles cases like "J.K. Rowling" vs "Rowling, J.K." or "Stephen King" vs "King, Stephen"
 */
export function authorsMatch(requestedAuthor, foundAuthor) {
  if (!requestedAuthor || !foundAuthor) return false;

  // Normalize: lowercase, remove punctuation, normalize whitespace
  const normalize = (str) => str
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const requested = normalize(requestedAuthor);
  const found = normalize(foundAuthor);

  // Exact match after normalization
  if (requested === found) return true;

  // Extract individual name parts (handles "First Last" and "Last, First" formats)
  const getNameParts = (name) => {
    return name.split(/[\s,]+/).filter(part => part.length > 0);
  };

  const requestedParts = getNameParts(requested);
  const foundParts = getNameParts(found);

  // Check if all requested name parts appear in the found author
  // This handles cases like searching "Rowling" matching "J K Rowling"
  const allRequestedPartsFound = requestedParts.every(reqPart =>
    foundParts.some(foundPart =>
      foundPart.includes(reqPart) || reqPart.includes(foundPart)
    )
  );

  if (allRequestedPartsFound && requestedParts.length > 0) return true;

  // Check if the last name matches (usually the most important part)
  // Last name is typically the last part, or the first part if comma-separated
  const getLastName = (parts, original) => {
    if (original.includes(',')) {
      return parts[0]; // "Last, First" format
    }
    return parts[parts.length - 1]; // "First Last" format
  };

  const requestedLastName = getLastName(requestedParts, requested);
  const foundLastName = getLastName(foundParts, found);

  if (requestedLastName && foundLastName &&
      (requestedLastName === foundLastName ||
       requestedLastName.includes(foundLastName) ||
       foundLastName.includes(requestedLastName))) {
    return true;
  }

  return false;
}

/**
 * Search for a book by title and author
 * Merges data from search results with ISBN lookup for complete metadata
 * Only returns results if the found author matches the requested author
 */
export async function searchByTitleAuthor(title, author, isbn = null) {
  // Try Open Library search first
  const openLibraryData = await searchOpenLibrary(title, author);

  // Try Google Books search as well
  const googleBooksData = await searchGoogleBooks(title, author);

  // Filter results to only include those with matching authors
  const openLibraryMatch = openLibraryData && authorsMatch(author, openLibraryData.author)
    ? openLibraryData : null;
  const googleBooksMatch = googleBooksData && authorsMatch(author, googleBooksData.author)
    ? googleBooksData : null;

  // Determine the best ISBN to use (only from matching results)
  // Prefer English ISBNs found by search APIs over the provided ISBN,
  // which may be a foreign edition (e.g. from Goodreads imports)
  const searchIsbn = openLibraryMatch?.isbn || googleBooksMatch?.isbn;
  const foundIsbn = searchIsbn || isbn;

  // If we have an ISBN, try to get additional data via ISBN lookup
  let isbnLookupData = null;
  if (foundIsbn) {
    isbnLookupData = await lookupISBN(foundIsbn);

    // Verify the ISBN lookup result also matches the author
    if (isbnLookupData && !authorsMatch(author, isbnLookupData.author)) {
      isbnLookupData = null;
    }
  }

  // If no matching results found, return with no ISBN
  if (!openLibraryMatch && !googleBooksMatch && !isbnLookupData) {
    return {
      isbn: null,
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

  // Merge all available data, prioritizing more complete sources
  // Priority: ISBN lookup data > Open Library search > Google Books search
  const finalTitle = isbnLookupData?.title || openLibraryMatch?.title || googleBooksMatch?.title || title;
  const finalAuthor = isbnLookupData?.author || openLibraryMatch?.author || googleBooksMatch?.author || author;

  // Get series info from API sources
  let seriesName = isbnLookupData?.series_name || openLibraryMatch?.series_name || googleBooksMatch?.series_name || null;
  let seriesPosition = isbnLookupData?.series_position ?? openLibraryMatch?.series_position ?? googleBooksMatch?.series_position ?? null;

  // If no series found from APIs, check known series patterns
  if (!seriesName) {
    const knownSeries = checkKnownSeries(finalTitle, finalAuthor);
    seriesName = knownSeries.series_name;
    seriesPosition = knownSeries.series_position;
  } else if (seriesPosition === null) {
    // We have series name but no position - try to get position from known series
    const position = getPositionFromKnownSeries(finalTitle, seriesName);
    if (position !== null) {
      seriesPosition = position;
    }
  }

  // Clean synopsis to remove non-English content
  const rawSynopsis = isbnLookupData?.synopsis || openLibraryMatch?.synopsis || googleBooksMatch?.synopsis || '';

  const mergedData = {
    isbn: foundIsbn,
    title: finalTitle,
    author: finalAuthor,
    page_count: isbnLookupData?.page_count || openLibraryMatch?.page_count || googleBooksMatch?.page_count || null,
    genre: isbnLookupData?.genre || openLibraryMatch?.genre || googleBooksMatch?.genre || '',
    synopsis: cleanSynopsis(rawSynopsis),
    tags: isbnLookupData?.tags || openLibraryMatch?.tags || googleBooksMatch?.tags || '[]',
    series_name: seriesName,
    series_position: seriesPosition
  };

  return mergedData;
}

/**
 * Extract series name from Open Library subjects array
 * Open Library stores series info in various formats:
 * - "series:Series_Name" (English)
 * - "Serie:Series_Name" (Spanish/Portuguese)
 */
function extractSeriesFromSubjects(subjects) {
  if (!subjects || !Array.isArray(subjects)) return null;

  for (const subject of subjects) {
    const subjectStr = typeof subject === 'string' ? subject : subject?.name;
    if (!subjectStr) continue;

    // Check for "series:Series_Name" format (English)
    if (subjectStr.toLowerCase().startsWith('series:')) {
      const seriesName = subjectStr.slice(7).replace(/_/g, ' ').trim();
      return normalizeSeriesName(seriesName);
    }

    // Check for "Serie:Series_Name" format (Spanish/Portuguese)
    if (subjectStr.toLowerCase().startsWith('serie:')) {
      const seriesName = subjectStr.slice(6).replace(/_/g, ' ').trim();
      return normalizeSeriesName(seriesName);
    }
  }
  return null;
}

/**
 * Extract series position from title if it contains book number
 * e.g., "Harry Potter and the Chamber of Secrets" might be book 2
 */
function extractPositionFromTitle(title, seriesName) {
  if (!title || !seriesName) return null;

  // Common patterns in titles like "Book 2" or "#2" at the end
  const patterns = [
    /\((?:book|vol\.?|volume|#)\s*(\d+(?:\.\d+)?)\)$/i,
    /,?\s*(?:book|vol\.?|volume)\s*(\d+(?:\.\d+)?)$/i,
    /\s+#(\d+(?:\.\d+)?)$/i
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  return null;
}

/**
 * Known series patterns that aren't always in Open Library's subject data
 * Maps title patterns to series names and book positions
 */
const KNOWN_SERIES_PATTERNS = [
  // Carissa Broadbent - Crowns of Nyaxia series
  { pattern: /crowns\s+of\s+nyaxia|serpent.*wings.*night|children.*fallen.*gods|ashes.*crown/i, series: 'The Crowns of Nyaxia', titles: {
    'The Serpent and the Wings of Night': 1,
    'The Serpent & the Wings of Night': 1,
    'Serpent and the Wings of Night': 1,
    'The Ashes and the Star-Cursed King': 2,
    'Ashes and the Star-Cursed King': 2,
    'Children of Fallen Gods': 3,
    'The Songbird and the Heart of Stone': 1 // Book 1 of spin-off duology, same universe
  }},

  // Marissa Meyer series
  { pattern: /renegades|archenemies|supernova/i, series: 'Renegades', titles: {
    'Renegades': 1,
    'Archenemies': 2,
    'Supernova': 3
  }},
  { pattern: /lunar\s+chronicles|cinder|scarlet|cress|winter|fairest/i, series: 'The Lunar Chronicles', titles: {
    'Cinder': 1,
    'Scarlet': 2,
    'Cress': 3,
    'Fairest': 3.5, // Prequel novella
    'Winter': 4,
    'Stars Above': 4.5 // Short story collection
  }},
  // Note: "Instant Karma" by Marissa Meyer is a standalone novel, not a series

  { pattern: /harry\s+potter/i, series: 'Harry Potter', titles: {
    "Harry Potter and the Sorcerer's Stone": 1,
    "Harry Potter and the Philosopher's Stone": 1,
    'Harry Potter and the Chamber of Secrets': 2,
    'Harry Potter and the Prisoner of Azkaban': 3,
    'Harry Potter and the Goblet of Fire': 4,
    'Harry Potter and the Order of the Phoenix': 5,
    'Harry Potter and the Half-Blood Prince': 6,
    'Harry Potter and the Deathly Hallows': 7,
    'The Cursed Child': 8
  }},
  { pattern: /hunger\s+games/i, series: 'The Hunger Games', titles: {
    'The Hunger Games': 1,
    'Catching Fire': 2,
    'Mockingjay': 3,
    'The Ballad of Songbirds and Snakes': 0, // Prequel
    'Sunrise on the Reaping': 0.5
  }},
  { pattern: /game\s+of\s+thrones|song\s+of\s+ice\s+and\s+fire/i, series: 'A Song of Ice and Fire', titles: {
    'A Game of Thrones': 1,
    'A Clash of Kings': 2,
    'A Storm of Swords': 3,
    'A Feast for Crows': 4,
    'A Dance with Dragons': 5
  }},
  { pattern: /divergent|insurgent|allegiant/i, series: 'Divergent', titles: {
    'Divergent': 1,
    'Insurgent': 2,
    'Allegiant': 3,
    'Four': 0 // Prequel stories
  }},
  { pattern: /maze\s+runner|scorch\s+trials|death\s+cure/i, series: 'The Maze Runner', titles: {
    'The Maze Runner': 1,
    'The Scorch Trials': 2,
    'The Death Cure': 3,
    'The Kill Order': 0.1,
    'The Fever Code': 0.5
  }},
  { pattern: /percy\s+jackson|lightning\s+thief|sea\s+of\s+monsters|titan.?s\s+curse|battle\s+of\s+the\s+labyrinth|last\s+olympian/i, series: 'Percy Jackson and the Olympians', titles: {
    'The Lightning Thief': 1,
    'The Sea of Monsters': 2,
    "The Titan's Curse": 3,
    'The Battle of the Labyrinth': 4,
    'The Last Olympian': 5
  }},
  { pattern: /twilight|new\s+moon|eclipse|breaking\s+dawn|midnight\s+sun/i, series: 'The Twilight Saga', titles: {
    'Twilight': 1,
    'New Moon': 2,
    'Eclipse': 3,
    'Breaking Dawn': 4,
    'Midnight Sun': 0 // Edward's perspective of book 1
  }},
  { pattern: /lord\s+of\s+the\s+rings|fellowship|two\s+towers|return\s+of\s+the\s+king/i, series: 'The Lord of the Rings', titles: {
    'The Fellowship of the Ring': 1,
    'The Two Towers': 2,
    'The Return of the King': 3,
    'The Hobbit': 0
  }},
  { pattern: /chronicles\s+of\s+narnia|lion.*witch.*wardrobe|prince\s+caspian|dawn\s+treader|silver\s+chair|horse\s+and\s+his\s+boy|magician.?s\s+nephew|last\s+battle/i, series: 'The Chronicles of Narnia', titles: {
    'The Lion, the Witch and the Wardrobe': 1,
    'Prince Caspian': 2,
    'The Voyage of the Dawn Treader': 3,
    'The Silver Chair': 4,
    'The Horse and His Boy': 5,
    "The Magician's Nephew": 6,
    'The Last Battle': 7
  }},
  { pattern: /ender.?s\s+game|speaker\s+for\s+the\s+dead|xenocide|children\s+of\s+the\s+mind/i, series: "Ender's Saga", titles: {
    "Ender's Game": 1,
    'Speaker for the Dead': 2,
    'Xenocide': 3,
    'Children of the Mind': 4
  }},
  { pattern: /outlander|dragonfly\s+in\s+amber|voyager|drums\s+of\s+autumn|fiery\s+cross|breath\s+of\s+snow/i, series: 'Outlander', titles: {
    'Outlander': 1,
    'Dragonfly in Amber': 2,
    'Voyager': 3,
    'Drums of Autumn': 4,
    'The Fiery Cross': 5,
    'A Breath of Snow and Ashes': 6,
    'An Echo in the Bone': 7,
    'Written in My Own Heart\'s Blood': 8,
    'Go Tell the Bees That I Am Gone': 9
  }},
  { pattern: /dune/i, series: 'Dune', titles: {
    'Dune': 1,
    'Dune Messiah': 2,
    'Children of Dune': 3,
    'God Emperor of Dune': 4,
    'Heretics of Dune': 5,
    'Chapterhouse: Dune': 6
  }}
];

/**
 * Check if a book title matches any known series patterns
 */
function checkKnownSeries(title, author) {
  if (!title) return { series_name: null, series_position: null };

  const normalizedTitle = title.toLowerCase().trim();

  for (const { pattern, series, titles } of KNOWN_SERIES_PATTERNS) {
    // Check if title or author context matches the series
    if (pattern.test(title) || pattern.test(author || '')) {
      // Try to find exact title match for position
      for (const [bookTitle, position] of Object.entries(titles)) {
        if (normalizedTitle.includes(bookTitle.toLowerCase()) ||
            bookTitle.toLowerCase().includes(normalizedTitle)) {
          return { series_name: series, series_position: position };
        }
      }
      // If pattern matches but no exact title, return series without position
      return { series_name: series, series_position: null };
    }

    // Also check each book title directly
    for (const [bookTitle, position] of Object.entries(titles)) {
      if (normalizedTitle.includes(bookTitle.toLowerCase()) ||
          bookTitle.toLowerCase() === normalizedTitle) {
        return { series_name: series, series_position: position };
      }
    }
  }

  return { series_name: null, series_position: null };
}

/**
 * Look up series position from known series data when we have a series name but no position
 */
function getPositionFromKnownSeries(title, seriesName) {
  if (!title || !seriesName) return null;

  const normalizedTitle = title.toLowerCase().trim();
  const normalizedSeriesName = seriesName.toLowerCase().trim();

  for (const { series, titles } of KNOWN_SERIES_PATTERNS) {
    // Check if this is the right series
    if (series.toLowerCase() === normalizedSeriesName ||
        normalizedSeriesName.includes(series.toLowerCase()) ||
        series.toLowerCase().includes(normalizedSeriesName)) {
      // Find the book position
      for (const [bookTitle, position] of Object.entries(titles)) {
        if (normalizedTitle.includes(bookTitle.toLowerCase()) ||
            bookTitle.toLowerCase().includes(normalizedTitle)) {
          return position;
        }
      }
    }
  }

  return null;
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

    // Check for series in the work data (dedicated series field)
    let seriesInfo = { series_name: null, series_position: null };
    if (workData.series && workData.series.length > 0) {
      const seriesEntry = workData.series[0];
      // Series can be a string like "Harry Potter #1" or an object
      if (typeof seriesEntry === 'string') {
        seriesInfo = parseSeriesString(seriesEntry);
      }
    }

    // If no series found in dedicated field, check subjects for "series:Name" format
    if (!seriesInfo.series_name && workData.subjects) {
      const seriesFromSubjects = extractSeriesFromSubjects(workData.subjects);
      if (seriesFromSubjects) {
        seriesInfo.series_name = seriesFromSubjects;
        // Try to extract position from title
        seriesInfo.series_position = extractPositionFromTitle(workData.title, seriesFromSubjects);
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
    // Search with language filter for English
    const query = encodeURIComponent(`${title} ${author}`);
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${query}&limit=10&language=eng`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.docs || data.docs.length === 0) {
      return null;
    }

    // Find the best match - prefer exact title match with English language
    const normalizedTitle = title.toLowerCase().trim();

    // Filter to only English results (language field contains 'eng')
    const englishDocs = data.docs.filter(doc => {
      if (!doc.language) return true; // If no language specified, include it
      return doc.language.includes('eng');
    });

    if (englishDocs.length === 0) {
      return null; // No English results found
    }

    const bestMatch = englishDocs.find(doc => {
      const docTitle = (doc.title || '').toLowerCase();
      return docTitle.includes(normalizedTitle) || normalizedTitle.includes(docTitle);
    }) || englishDocs[0];

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

          // Extract series info from dedicated series field
          if (workData.series && workData.series.length > 0) {
            seriesInfo = parseSeriesString(workData.series[0]);
          }

          // If no series found, check subjects for "series:Name" format
          if (!seriesInfo.series_name && workData.subjects) {
            const seriesFromSubjects = extractSeriesFromSubjects(workData.subjects);
            if (seriesFromSubjects) {
              seriesInfo.series_name = seriesFromSubjects;
              seriesInfo.series_position = extractPositionFromTitle(bestMatch.title, seriesFromSubjects);
            }
          }
        }
      } catch (e) {
        // Ignore errors fetching work details
      }

      // If still no series, check the search result's subject field
      if (!seriesInfo.series_name && bestMatch.subject) {
        const seriesFromSubjects = extractSeriesFromSubjects(bestMatch.subject);
        if (seriesFromSubjects) {
          seriesInfo.series_name = seriesFromSubjects;
          seriesInfo.series_position = extractPositionFromTitle(bestMatch.title, seriesFromSubjects);
        }
      }

      // If no ISBN in search results, try to get one from English editions ONLY
      if (!bestMatch.isbn || bestMatch.isbn.length === 0) {
        try {
          const editionsResponse = await fetch(`https://openlibrary.org${bestMatch.key}/editions.json?limit=50`);
          if (editionsResponse.ok) {
            const editionsData = await editionsResponse.json();
            const editions = editionsData.entries || [];

            // ONLY use English editions - do not fall back to other languages
            const englishEditions = editions.filter(e =>
              e.languages &&
              e.languages.length > 0 &&
              e.languages.some(lang => lang.key === '/languages/eng')
            );

            // If no explicitly English editions, try editions with no language specified
            const editionsToSearch = englishEditions.length > 0
              ? englishEditions
              : editions.filter(e => !e.languages || e.languages.length === 0);

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
      synopsis: cleanSynopsis(synopsis),
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
    // Search with language restriction to English only
    const query = encodeURIComponent(`intitle:${title} inauthor:${author}`);
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=10&langRestrict=en`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    // Find the first result that has an ISBN and is in English
    let selectedItem = null;
    for (const item of data.items) {
      const volumeInfo = item.volumeInfo;

      // Double-check language is English (langRestrict should handle this, but verify)
      if (volumeInfo.language && volumeInfo.language !== 'en') {
        continue;
      }

      // Check if it has an ISBN
      const industryIds = volumeInfo.industryIdentifiers || [];
      const hasIsbn = industryIds.some(id => id.type === 'ISBN_13' || id.type === 'ISBN_10');

      if (hasIsbn) {
        selectedItem = item;
        break;
      }

      // Keep first English result as fallback even without ISBN
      if (!selectedItem) {
        selectedItem = item;
      }
    }

    if (!selectedItem) {
      return null;
    }

    const volumeInfo = selectedItem.volumeInfo;
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
      synopsis: cleanSynopsis(volumeInfo.description || ''),
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
    const rawSynopsis = workData.description || bookData.notes || bookData.excerpts?.[0]?.text || '';

    // Determine series info - use work data first, then fall back to book subjects
    let seriesName = workData.series_name;
    let seriesPosition = workData.series_position;

    // If no series from work data, check book subjects directly
    if (!seriesName && bookData.subjects) {
      const subjectNames = bookData.subjects.map(s => s.name);
      seriesName = extractSeriesFromSubjects(subjectNames);
      if (seriesName) {
        seriesPosition = extractPositionFromTitle(bookData.title, seriesName);
      }
    }

    return {
      isbn: isbn,
      title: bookData.title || '',
      author: bookData.authors?.map(a => a.name).join(', ') || '',
      page_count: bookData.number_of_pages || null,
      genre: bookData.subjects?.slice(0, 3).map(s => s.name).join(', ') || '',
      synopsis: cleanSynopsis(rawSynopsis),
      tags: JSON.stringify(cleanTags(bookData.subjects?.slice(0, 10).map(s => s.name) || [])),
      series_name: seriesName,
      series_position: seriesPosition
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
      synopsis: cleanSynopsis(volumeInfo.description || ''),
      tags: JSON.stringify(cleanTags(volumeInfo.categories || [])),
      series_name: seriesInfo.series_name,
      series_position: seriesInfo.series_position
    };
  } catch (error) {
    console.error('Google Books API error:', error);
    return null;
  }
}
