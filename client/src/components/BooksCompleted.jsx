import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import CompletedBookCard from './CompletedBookCard';
import CompletedBookListItem from './CompletedBookListItem';
import CompletedBooksImportModal from './CompletedBooksImportModal';
import ManualReviewModal from './ManualReviewModal';
import EditCompletedBookModal from './EditCompletedBookModal';
import ThemeSelector from './ThemeSelector';
import {
  getCompletedBooks,
  deleteCompletedBook,
  updateCompletedBook,
  addCompletedBookToLibrary,
  importCompletedBooks,
  addManualReviewBook
} from '../services/api';

export default function BooksCompleted() {
  const { user, logout, setTheme } = useAuth();
  const [books, setBooks] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showManualReview, setShowManualReview] = useState(false);
  const [booksNeedingReview, setBooksNeedingReview] = useState([]);
  const [editingBook, setEditingBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const data = await getCompletedBooks();
      setBooks(data);
    } catch (err) {
      console.error('Failed to load completed books:', err);
    }
  };

  // Group books by series
  const groupedBooks = useMemo(() => {
    const seriesMap = new Map();
    const standalone = [];

    books.forEach(book => {
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
    seriesMap.forEach((seriesBooks) => {
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
  }, [books]);

  const handleDeleteBook = async (bookId) => {
    try {
      await deleteCompletedBook(bookId);
      setBooks(prev => prev.filter(book => book.id !== bookId));
      setMessage('Book removed from completed list');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
  };

  const handleSaveBook = async (bookData) => {
    try {
      const updatedBook = await updateCompletedBook(editingBook.id, bookData);
      setBooks(prev => prev.map(book =>
        book.id === updatedBook.id ? updatedBook : book
      ));
      setEditingBook(null);
      setMessage('Book updated');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddToLibrary = async (bookId) => {
    try {
      const result = await addCompletedBookToLibrary(bookId);
      setBooks(prev => prev.map(book =>
        book.id === bookId ? { ...book, library_book_id: result.book.id } : book
      ));
      setMessage(result.message);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImportBooks = async (booksData) => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await importCompletedBooks(booksData);

      // Add imported books to state
      if (result.imported.length > 0) {
        setBooks(prev => [...result.imported, ...prev]);
        setMessage(`Successfully imported ${result.imported.length} book(s)`);
      }

      // Handle books needing review
      if (result.needsReview.length > 0) {
        setBooksNeedingReview(result.needsReview);
        setShowManualReview(true);
      }

      // Report errors
      if (result.errors.length > 0) {
        setError(`${result.errors.length} book(s) failed to import`);
      }

      setShowImportModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualReviewAdd = async (bookData) => {
    try {
      const newBook = await addManualReviewBook(bookData);
      setBooks(prev => [newBook, ...prev]);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const handleManualReviewComplete = () => {
    setBooksNeedingReview([]);
    setShowManualReview(false);
    setMessage('Manual review completed');
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleThemeChange = async (newTheme) => {
    await setTheme(newTheme);
    setShowThemeSelector(false);
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
              <CompletedBookCard
                key={book.id}
                book={book}
                onDelete={handleDeleteBook}
                onEdit={handleEditBook}
                onAddToLibrary={handleAddToLibrary}
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
              <CompletedBookCard
                key={book.id}
                book={book}
                onDelete={handleDeleteBook}
                onEdit={handleEditBook}
                onAddToLibrary={handleAddToLibrary}
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
            <CompletedBookListItem
              key={book.id}
              book={book}
              onDelete={handleDeleteBook}
              onEdit={handleEditBook}
              onAddToLibrary={handleAddToLibrary}
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
            <CompletedBookListItem
              key={book.id}
              book={book}
              onDelete={handleDeleteBook}
              onEdit={handleEditBook}
              onAddToLibrary={handleAddToLibrary}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-theme-primary">
      <header className="bg-theme-card shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-theme-primary">Shelfwise</h1>
            <p className="text-theme-muted">Your Personal Library Manager</p>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-theme-muted hidden sm:inline">
                Welcome, <span className="font-medium text-theme-primary">{user.name || user.email}</span>
              </span>
            )}
            <button
              onClick={() => setShowThemeSelector(true)}
              className="p-2 text-theme-muted hover:text-theme-primary rounded-md hover:bg-theme-secondary transition-colors"
              title="Change theme"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-theme-muted hover:text-theme-primary px-3 py-2 rounded-md hover:bg-theme-secondary transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-theme-card border-b border-theme">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4">
            <Link
              to="/"
              className="px-4 py-3 text-theme-muted hover:text-theme-primary border-b-2 border-transparent hover:border-theme-accent transition-colors"
            >
              My Library
            </Link>
            <Link
              to="/completed"
              className="px-4 py-3 text-theme-primary font-medium border-b-2 border-theme-accent"
            >
              Books Completed
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-theme-accent bg-theme-accent-hover text-theme-on-primary px-4 py-2 rounded-md transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Import Books
          </button>
        </div>

        {/* Status messages */}
        {loading && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6">
            Processing import...
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
              Books Completed ({books.length} books)
            </h2>

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-theme-card rounded-md shadow-sm p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-theme-secondary text-theme-secondary' : 'text-theme-muted hover:text-theme-primary'}`}
                title="Grid view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-theme-secondary text-theme-secondary' : 'text-theme-muted hover:text-theme-primary'}`}
                title="List view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {books.length === 0 ? (
            <div className="text-center py-12 bg-theme-card rounded-lg shadow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-theme-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-theme-primary mb-2 font-medium">No completed books yet</p>
              <p className="text-theme-muted">Import a list of books you've read to get started</p>
            </div>
          ) : viewMode === 'grid' ? (
            renderGridView()
          ) : (
            renderListView()
          )}
        </section>
      </main>

      {/* Modals */}
      {showImportModal && (
        <CompletedBooksImportModal
          onImport={handleImportBooks}
          onClose={() => setShowImportModal(false)}
          loading={loading}
        />
      )}

      {showManualReview && (
        <ManualReviewModal
          books={booksNeedingReview}
          onAddBook={handleManualReviewAdd}
          onComplete={handleManualReviewComplete}
          onClose={() => {
            setBooksNeedingReview([]);
            setShowManualReview(false);
          }}
        />
      )}

      {editingBook && (
        <EditCompletedBookModal
          book={editingBook}
          onSave={handleSaveBook}
          onClose={() => setEditingBook(null)}
        />
      )}

      {showThemeSelector && (
        <ThemeSelector
          currentTheme={user?.theme || 'purple'}
          onSelect={handleThemeChange}
          onClose={() => setShowThemeSelector(false)}
        />
      )}
    </div>
  );
}
