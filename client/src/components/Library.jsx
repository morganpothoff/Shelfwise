import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import ISBNScanner from './ISBNScanner';
import ManualISBNEntry from './ManualISBNEntry';
import ManualBookForm from './ManualBookForm';
import BookCard from './BookCard';
import BookListItem from './BookListItem';
import EditSeriesModal from './EditSeriesModal';
import ImportBooksModal from './ImportBooksModal';
import { scanISBN, getBooks, searchAndAddBook, addBook, deleteBook, updateBook, resendVerificationEmail, exportBooks } from '../services/api';

export default function Library() {
  const { user, setViewMode: saveViewMode } = useAuth();
  const [books, setBooks] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showManualBookForm, setShowManualBookForm] = useState(false);
  const [manualFormISBN, setManualFormISBN] = useState(null);
  const [editingSeriesBook, setEditingSeriesBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(user?.viewMode || 'list'); // 'grid' or 'list'
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isbnNotFoundBook, setIsbnNotFoundBook] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  // Sync view mode from user when it changes (e.g., on login)
  useEffect(() => {
    if (user?.viewMode) {
      setViewMode(user.viewMode);
    }
  }, [user?.viewMode]);

  const handleResendVerification = async () => {
    setResendingVerification(true);
    setVerificationMessage(null);
    try {
      const result = await resendVerificationEmail();
      setVerificationMessage({ type: 'success', text: result.message });
    } catch (err) {
      setVerificationMessage({ type: 'error', text: err.message });
    } finally {
      setResendingVerification(false);
    }
  };

  const loadBooks = async () => {
    try {
      const data = await getBooks();
      setBooks(data);
    } catch (err) {
      console.error('Failed to load books:', err);
    }
  };

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return books;
    }

    const query = searchQuery.toLowerCase().trim();
    return books.filter(book => {
      const titleMatch = book.title?.toLowerCase().includes(query);
      const authorMatch = book.author?.toLowerCase().includes(query);
      const isbnMatch = book.isbn?.toLowerCase().includes(query);
      const seriesMatch = book.series_name?.toLowerCase().includes(query);
      return titleMatch || authorMatch || isbnMatch || seriesMatch;
    });
  }, [books, searchQuery]);

  // Group books by series
  const groupedBooks = useMemo(() => {
    const seriesMap = new Map();
    const standalone = [];

    filteredBooks.forEach(book => {
      if (book.series_name) {
        if (!seriesMap.has(book.series_name)) {
          seriesMap.set(book.series_name, []);
        }
        seriesMap.get(book.series_name).push(book);
      } else {
        standalone.push(book);
      }
    });

    // Sort books within each series by position
    seriesMap.forEach((seriesBooks, seriesName) => {
      seriesBooks.sort((a, b) => {
        if (a.series_position == null && b.series_position == null) return 0;
        if (a.series_position == null) return 1;
        if (b.series_position == null) return -1;
        return a.series_position - b.series_position;
      });
    });

    // Convert to array and sort series by name
    const seriesArray = Array.from(seriesMap.entries())
      .map(([name, books]) => ({ name, books }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { series: seriesArray, standalone };
  }, [filteredBooks]);

  const handleISBNScanned = async (isbn) => {
    setShowScanner(false);
    setShowManualEntry(false);
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await scanISBN(isbn);
      setMessage(result.message);

      if (!result.isExisting) {
        setBooks(prev => [result.book, ...prev]);
      }
    } catch (err) {
      // If the book wasn't found, offer manual entry
      if (err.notFound) {
        setManualFormISBN(err.isbn || isbn);
        setShowManualBookForm(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualBookSubmit = async ({ title, author, isbn }) => {
    setShowManualBookForm(false);
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await searchAndAddBook(title, author, isbn);
      setBooks(prev => [result.book, ...prev]);
      setManualFormISBN(null);
      setMessage('Book added successfully!');
    } catch (err) {
      if (err.isbnNotFound) {
        // Show confirmation popup to add without ISBN
        setIsbnNotFoundBook({ title: err.title || title, author: err.author || author });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddBookWithoutISBN = async () => {
    if (!isbnNotFoundBook) return;

    const { title, author } = isbnNotFoundBook;
    setIsbnNotFoundBook(null);
    setLoading(true);
    setError(null);

    try {
      const newBook = await addBook({ title, author });
      setBooks(prev => [newBook, ...prev]);
      setMessage('Book added successfully (without ISBN metadata)');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBook = async (bookId) => {
    try {
      await deleteBook(bookId);
      setBooks(prev => prev.filter(book => book.id !== bookId));
      setMessage('Book removed from library');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditSeries = (book) => {
    setEditingSeriesBook(book);
  };

  const handleSaveSeries = async (seriesData) => {
    try {
      const updatedBook = await updateBook(editingSeriesBook.id, seriesData);
      setBooks(prev => prev.map(book =>
        book.id === updatedBook.id ? updatedBook : book
      ));
      setEditingSeriesBook(null);
      setMessage('Series info updated');
    } catch (err) {
      setError(err.message);
    }
  };

  const closeManualBookForm = () => {
    setShowManualBookForm(false);
    setManualFormISBN(null);
  };

  const handleExport = async (type, format) => {
    setShowExportMenu(false);
    setExporting(true);
    setError(null);
    setMessage(null);

    try {
      await exportBooks(type, format);
      setMessage(`Library exported successfully (${type} ${format.toUpperCase()})`);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const renderGridView = () => (
    <div className="space-y-8">
      {/* Series groups */}
      {groupedBooks.series.map(series => (
        <div key={series.name} className="bg-theme-card rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-theme-series mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            {series.name} Series
            <span className="text-sm font-normal text-theme-muted">({series.books.length} books)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {series.books.map(book => (
              <BookCard
                key={book.id}
                book={book}
                onDelete={handleDeleteBook}
                onEditSeries={handleEditSeries}
                showSeriesPosition
              />
            ))}
          </div>
        </div>
      ))}

      {/* Standalone books */}
      {groupedBooks.standalone.length > 0 && (
        <div>
          {groupedBooks.series.length > 0 && (
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Standalone Books</h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedBooks.standalone.map(book => (
              <BookCard
                key={book.id}
                book={book}
                onDelete={handleDeleteBook}
                onEditSeries={handleEditSeries}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-6">
      {/* Series groups */}
      {groupedBooks.series.map(series => (
        <div key={series.name} className="bg-theme-card rounded-lg shadow overflow-hidden">
          <div className="bg-theme-series px-4 py-2 border-b border-theme">
            <h3 className="font-semibold text-theme-series flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              {series.name} Series
              <span className="text-sm font-normal text-theme-muted">({series.books.length} books)</span>
            </h3>
          </div>
          {series.books.map(book => (
            <BookListItem
              key={book.id}
              book={book}
              onDelete={handleDeleteBook}
              onEditSeries={handleEditSeries}
              showSeriesPosition
            />
          ))}
        </div>
      ))}

      {/* Standalone books */}
      {groupedBooks.standalone.length > 0 && (
        <div className="bg-theme-card rounded-lg shadow overflow-hidden">
          {groupedBooks.series.length > 0 && (
            <div className="bg-theme-secondary px-4 py-2 border-b border-theme">
              <h3 className="font-semibold text-theme-primary">Standalone Books</h3>
            </div>
          )}
          {groupedBooks.standalone.map(book => (
            <BookListItem
              key={book.id}
              book={book}
              onDelete={handleDeleteBook}
              onEditSeries={handleEditSeries}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-theme-primary">
      <Navbar />

      {/* Navigation Tabs */}
      <nav className="bg-theme-card border-b border-theme">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4">
            <Link
              to="/"
              className="px-4 py-3 text-theme-primary font-medium border-b-2 border-theme-accent"
            >
              My Library
            </Link>
            <Link
              to="/completed"
              className="px-4 py-3 text-theme-muted hover:text-theme-primary border-b-2 border-transparent hover:border-theme-accent transition-colors"
            >
              Books Completed
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4">
        {/* Email verification banner */}
        {user && !user.emailVerified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">Verify your email address</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Please check your inbox for a verification email and click the link to verify your account.
                  {user.email && <span className="font-medium"> ({user.email})</span>}
                </p>
                {verificationMessage && (
                  <p className={`text-sm mt-2 ${verificationMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                    {verificationMessage.text}
                  </p>
                )}
                <button
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className="mt-3 text-sm font-medium text-yellow-800 hover:text-yellow-900 underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendingVerification ? 'Sending...' : 'Resend verification email'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 bg-theme-accent bg-theme-accent-hover text-theme-on-primary px-4 py-2 rounded-md transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Scan ISBN
          </button>
          <button
            onClick={() => setShowManualEntry(true)}
            className="flex items-center gap-2 bg-theme-secondary text-theme-primary px-4 py-2 rounded-md hover:opacity-80 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
            </svg>
            Enter ISBN
          </button>
          <button
            onClick={() => {
              setManualFormISBN(null);
              setShowManualBookForm(true);
            }}
            className="flex items-center gap-2 bg-theme-card text-theme-secondary border border-theme px-4 py-2 rounded-md hover:bg-theme-secondary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Manually
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-theme-card text-theme-secondary border border-theme px-4 py-2 rounded-md hover:bg-theme-secondary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Import Books
          </button>
        </div>

        {/* Search bar */}
        {books.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-theme-muted" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, author, ISBN, or series..."
                className="block w-full pl-10 pr-10 py-2 border border-theme rounded-md bg-theme-card text-theme-primary placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-theme-muted hover:text-theme-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-theme-muted">
                Found {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'} matching "{searchQuery}"
              </p>
            )}
          </div>
        )}

        {/* Status messages */}
        {loading && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6">
            Looking up book information...
          </div>
        )}

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Book section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-theme-primary">
              My Library ({searchQuery ? `${filteredBooks.length} of ${books.length}` : books.length} books)
            </h2>

            <div className="flex items-center gap-3">
              {/* Export dropdown */}
              {books.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={exporting}
                    className="flex items-center gap-2 px-3 py-2 bg-theme-card rounded-md shadow-sm text-theme-primary hover:bg-theme-secondary transition-colors disabled:opacity-50"
                    title="Export library"
                  >
                    {exporting ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="text-sm font-medium">Export</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {showExportMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowExportMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-theme-card rounded-md shadow-lg border border-theme z-20">
                        <div className="p-2">
                          <p className="px-3 py-2 text-xs font-semibold text-theme-muted uppercase tracking-wider">
                            Comprehensive Export
                          </p>
                          <p className="px-3 pb-2 text-xs text-theme-muted">
                            All book data including synopsis, genre, tags, and dates
                          </p>
                          <button
                            onClick={() => handleExport('comprehensive', 'json')}
                            className="w-full text-left px-3 py-2 text-sm text-theme-primary hover:bg-theme-secondary rounded-md flex items-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-theme-muted" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            Export as JSON
                          </button>
                          <button
                            onClick={() => handleExport('comprehensive', 'csv')}
                            className="w-full text-left px-3 py-2 text-sm text-theme-primary hover:bg-theme-secondary rounded-md flex items-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-theme-muted" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                            </svg>
                            Export as CSV
                          </button>
                        </div>

                        <div className="border-t border-theme p-2">
                          <p className="px-3 py-2 text-xs font-semibold text-theme-muted uppercase tracking-wider">
                            Minimal Export
                          </p>
                          <p className="px-3 pb-2 text-xs text-theme-muted">
                            ISBN, title, author, and series info only
                          </p>
                          <button
                            onClick={() => handleExport('minimal', 'json')}
                            className="w-full text-left px-3 py-2 text-sm text-theme-primary hover:bg-theme-secondary rounded-md flex items-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-theme-muted" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            Export as JSON
                          </button>
                          <button
                            onClick={() => handleExport('minimal', 'csv')}
                            className="w-full text-left px-3 py-2 text-sm text-theme-primary hover:bg-theme-secondary rounded-md flex items-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-theme-muted" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                            </svg>
                            Export as CSV
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* View toggle */}
              <div className="flex items-center gap-1 bg-theme-card rounded-md shadow-sm p-1">
                <button
                  onClick={() => {
                    setViewMode('grid');
                    saveViewMode('grid');
                  }}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-theme-secondary text-theme-secondary' : 'text-theme-muted hover:text-theme-primary'}`}
                  title="Grid view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setViewMode('list');
                    saveViewMode('list');
                  }}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-theme-secondary text-theme-secondary' : 'text-theme-muted hover:text-theme-primary'}`}
                  title="List view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {books.length === 0 ? (
            <div className="text-center py-12 bg-theme-card rounded-lg shadow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-theme-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-theme-primary mb-2 font-medium">Your library is empty</p>
              <p className="text-theme-muted">Scan a book's ISBN barcode to get started</p>
            </div>
          ) : filteredBooks.length === 0 && searchQuery ? (
            <div className="text-center py-12 bg-theme-card rounded-lg shadow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-theme-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-theme-primary mb-2 font-medium">No books found</p>
              <p className="text-theme-muted">No books match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-theme-accent hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            renderGridView()
          ) : (
            renderListView()
          )}
        </section>
      </main>

      {/* Modals */}
      {showScanner && (
        <ISBNScanner
          onScan={handleISBNScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showManualEntry && (
        <ManualISBNEntry
          onSubmit={handleISBNScanned}
          onClose={() => setShowManualEntry(false)}
        />
      )}

      {showManualBookForm && (
        <ManualBookForm
          isbn={manualFormISBN}
          onSubmit={handleManualBookSubmit}
          onClose={closeManualBookForm}
        />
      )}

      {editingSeriesBook && (
        <EditSeriesModal
          book={editingSeriesBook}
          onSave={handleSaveSeries}
          onClose={() => setEditingSeriesBook(null)}
        />
      )}

      {showImportModal && (
        <ImportBooksModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={(importedBooks) => {
            setBooks(prev => [...importedBooks, ...prev]);
            setMessage(`Successfully imported ${importedBooks.length} books!`);
          }}
        />
      )}

      {isbnNotFoundBook && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-card rounded-lg p-6 max-w-md w-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-theme-primary">ISBN Not Found</h2>
                <p className="text-sm text-theme-secondary mt-1">
                  We couldn't find an ISBN for this book. Would you like to add it anyway without additional metadata?
                </p>
              </div>
            </div>

            <div className="bg-theme-secondary rounded-md p-3 mb-4">
              <p className="text-sm text-theme-primary">
                <span className="font-medium">{isbnNotFoundBook.title}</span>
                {isbnNotFoundBook.author && (
                  <span className="text-theme-muted"> by {isbnNotFoundBook.author}</span>
                )}
              </p>
            </div>

            <p className="text-xs text-theme-muted mb-4">
              The book will be added with just the title and author. You won't have page count, synopsis, genre, or series information.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsbnNotFoundBook(null)}
                className="flex-1 px-4 py-2 border border-theme rounded-md text-theme-primary hover:bg-theme-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddBookWithoutISBN}
                className="flex-1 px-4 py-2 bg-theme-accent bg-theme-accent-hover text-theme-on-primary rounded-md"
              >
                Add Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
