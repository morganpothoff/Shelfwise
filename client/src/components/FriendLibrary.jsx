import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from './Navbar';
import { getFriendBooks, sendBorrowRequest } from '../services/api';

export default function FriendLibrary() {
  const { friendId } = useParams();
  const [books, setBooks] = useState([]);
  const [friend, setFriend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestedBookIds, setRequestedBookIds] = useState(new Set());

  useEffect(() => {
    loadFriendBooks();
  }, [friendId]);

  async function loadFriendBooks() {
    setLoading(true);
    setError(null);
    try {
      const data = await getFriendBooks(friendId);
      setFriend(data.friend);
      setBooks(data.books);
      // Track books that already have pending requests
      const pendingIds = new Set(data.books.filter(b => b.requestPending).map(b => b.id));
      setRequestedBookIds(pendingIds);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  function handleBorrowRequestSent(bookId) {
    setRequestedBookIds(prev => new Set([...prev, bookId]));
  }

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
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

    seriesMap.forEach((seriesBooks) => {
      seriesBooks.sort((a, b) => {
        if (a.series_position == null && b.series_position == null) return 0;
        if (a.series_position == null) return 1;
        if (b.series_position == null) return -1;
        return a.series_position - b.series_position;
      });
    });

    const seriesArray = Array.from(seriesMap.entries())
      .map(([name, books]) => ({ name, books }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { series: seriesArray, standalone };
  }, [filteredBooks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin h-10 w-10 text-theme-muted" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <Navbar />
        <div className="max-w-2xl mx-auto py-8 px-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <Link to="/friends" className="text-theme-accent hover:text-theme-accent-hover font-medium">
            Back to Friends
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <Navbar />

      <main className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-6">
          <Link to="/friends" className="text-theme-accent hover:text-theme-accent-hover text-sm font-medium mb-2 inline-block">
            &larr; Back to Friends
          </Link>
          <h1 className="text-3xl font-bold text-theme-primary">
            {friend?.name || friend?.email}'s Library
          </h1>
          <p className="text-theme-muted">
            {books.length} book{books.length !== 1 ? 's' : ''} in library
          </p>
        </div>

        {/* Search */}
        {books.length > 0 && (
          <div className="relative mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search books..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-theme focus:ring-2 focus:ring-theme-accent focus:border-transparent outline-none transition max-w-md"
            />
          </div>
        )}

        {/* Books */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-theme-muted text-lg">
              {books.length === 0 ? 'This library is empty.' : 'No books match your search.'}
            </p>
          </div>
        ) : (
          <div>
            {/* Series groups */}
            {groupedBooks.series.map(({ name, books: seriesBooks }) => (
              <div key={name} className="mb-8">
                <h2 className="text-xl font-bold text-theme-primary mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-theme-accent" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                  {name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {seriesBooks.map(book => (
                    <FriendBookCard
                      key={book.id}
                      book={book}
                      friend={friend}
                      showSeriesPosition={true}
                      isRequested={requestedBookIds.has(book.id)}
                      onBorrowRequestSent={handleBorrowRequestSent}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Standalone books */}
            {groupedBooks.standalone.length > 0 && (
              <div>
                {groupedBooks.series.length > 0 && (
                  <h2 className="text-xl font-bold text-theme-primary mb-4">Other Books</h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedBooks.standalone.map(book => (
                    <FriendBookCard
                      key={book.id}
                      book={book}
                      friend={friend}
                      showSeriesPosition={false}
                      isRequested={requestedBookIds.has(book.id)}
                      onBorrowRequestSent={handleBorrowRequestSent}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function FriendBookCard({ book, friend, showSeriesPosition, isRequested, onBorrowRequestSent }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [borrowMessage, setBorrowMessage] = useState(null);

  const canBorrow = book.visibility !== 'not_available' && !book.borrow_status && !isRequested;

  async function handleBorrowRequest() {
    setBorrowLoading(true);
    setBorrowMessage(null);
    try {
      await sendBorrowRequest(book.id);
      onBorrowRequestSent(book.id);
      setShowConfirm(false);
      setBorrowMessage({ type: 'success', text: 'Request sent!' });
      setTimeout(() => setBorrowMessage(null), 3000);
    } catch (err) {
      setBorrowMessage({ type: 'error', text: err.message });
    }
    setBorrowLoading(false);
  }

  return (
    <div className="bg-theme-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow relative">
      <div className="flex items-start gap-2 mb-1">
        {showSeriesPosition && book.series_position != null && (
          <span className="flex-shrink-0 w-6 h-6 bg-theme-accent text-theme-on-primary text-xs font-bold rounded-full flex items-center justify-center">
            {Number.isInteger(book.series_position) ? book.series_position : book.series_position.toFixed(1)}
          </span>
        )}
        <h3 className="text-lg font-semibold text-theme-primary pr-2">
          {book.title}
        </h3>
      </div>

      {book.author && (
        <p className="text-theme-muted mb-2">{showSeriesPosition && book.series_position != null ? <span className="ml-8">by {book.author}</span> : `by ${book.author}`}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {book.visibility === 'not_available' && (
          <span className="text-xs px-2 py-1 rounded font-medium bg-orange-100 text-orange-800">
            Not Available
          </span>
        )}
        {book.borrow_status === 'borrowed' && (
          <span className="text-xs px-2 py-1 rounded font-medium bg-purple-100 text-purple-800">
            Currently Borrowed
          </span>
        )}
        {book.borrow_status === 'return_requested' && (
          <span className="text-xs px-2 py-1 rounded font-medium bg-yellow-100 text-yellow-800">
            Return Requested
          </span>
        )}
        {isRequested && !book.borrow_status && (
          <span className="text-xs px-2 py-1 rounded font-medium bg-blue-100 text-blue-800">
            Request Pending
          </span>
        )}
        {book.reading_status && book.reading_status !== 'unread' && (
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            book.reading_status === 'read'
              ? 'bg-green-100 text-green-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {book.reading_status === 'read' ? 'Read' : 'Reading'}
          </span>
        )}
        {book.page_count && (
          <span className="text-xs bg-theme-secondary text-theme-muted px-2 py-1 rounded">
            {book.page_count} pages
          </span>
        )}
        {book.genre && (
          <span className="text-xs bg-theme-series text-theme-series px-2 py-1 rounded">
            {book.genre}
          </span>
        )}
      </div>

      {book.synopsis && (
        <p className="text-sm text-theme-muted mb-3 line-clamp-3">
          {book.synopsis}
        </p>
      )}

      {book.tags && book.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {book.tags.slice(0, 5).map((tag, index) => (
            <span
              key={index}
              className="text-xs bg-theme-series text-theme-series px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
          {book.tags.length > 5 && (
            <span className="text-xs text-theme-muted">
              +{book.tags.length - 5} more
            </span>
          )}
        </div>
      )}

      {book.isbn && (
        <p className="text-xs text-theme-muted mb-3">ISBN: {book.isbn}</p>
      )}

      {/* Borrow message */}
      {borrowMessage && (
        <div className={`text-xs px-2 py-1 rounded mb-2 ${
          borrowMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {borrowMessage.text}
        </div>
      )}

      {/* Borrow button */}
      {canBorrow && !showConfirm && (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full mt-1 px-3 py-2 text-sm font-medium bg-theme-accent text-theme-on-primary rounded-md hover:opacity-90 transition"
        >
          Request to Borrow
        </button>
      )}

      {/* Confirm borrow modal */}
      {showConfirm && (
        <div className="mt-2 p-3 bg-theme-secondary rounded-lg border border-theme">
          <p className="text-sm text-theme-primary mb-3">
            Request to borrow <span className="font-semibold">"{book.title}"</span> from {friend?.name || friend?.email}?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleBorrowRequest}
              disabled={borrowLoading}
              className="px-3 py-1.5 text-sm font-medium bg-theme-accent text-theme-on-primary rounded-md hover:opacity-90 transition disabled:opacity-50"
            >
              {borrowLoading ? 'Sending...' : 'Confirm'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={borrowLoading}
              className="px-3 py-1.5 text-sm font-medium text-theme-muted border border-theme rounded-md hover:bg-theme-card transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
