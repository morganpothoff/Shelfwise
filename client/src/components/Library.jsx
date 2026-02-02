import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import ISBNScanner from './ISBNScanner';
import ManualISBNEntry from './ManualISBNEntry';
import ManualBookForm from './ManualBookForm';
import BookCard from './BookCard';
import BookListItem from './BookListItem';
import EditSeriesModal from './EditSeriesModal';
import { scanISBN, getBooks, searchAndAddBook, deleteBook, updateBook, resendVerificationEmail } from '../services/api';

export default function Library() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showManualBookForm, setShowManualBookForm] = useState(false);
  const [manualFormISBN, setManualFormISBN] = useState(null);
  const [editingSeriesBook, setEditingSeriesBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState(null);

  useEffect(() => {
    loadBooks();
  }, []);

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
  }, [books]);

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
        </div>

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
              My Library ({books.length} books)
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-theme-primary mb-2 font-medium">Your library is empty</p>
              <p className="text-theme-muted">Scan a book's ISBN barcode to get started</p>
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
    </div>
  );
}
