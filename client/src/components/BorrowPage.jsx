import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import { getLendingBooks, getBorrowingBooks, requestReturn, initiateReturn } from '../services/api';

export default function BorrowPage() {
  const [activeTab, setActiveTab] = useState('lending');
  const [lendingBooks, setLendingBooks] = useState([]);
  const [borrowingBooks, setBorrowingBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [lending, borrowing] = await Promise.all([
        getLendingBooks(),
        getBorrowingBooks()
      ]);
      setLendingBooks(lending);
      setBorrowingBooks(borrowing);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleRequestReturn(bookId) {
    setActionLoading(bookId);
    setActionMessage(null);
    try {
      await requestReturn(bookId);
      setLendingBooks(prev => prev.map(b =>
        b.id === bookId ? { ...b, borrow_status: 'return_requested' } : b
      ));
      setActionMessage({ type: 'success', text: 'Return requested' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
    setActionLoading(null);
  }

  async function handleInitiateReturn(bookId) {
    setActionLoading(`return-${bookId}`);
    setActionMessage(null);
    try {
      await initiateReturn(bookId);
      setBorrowingBooks(prev => prev.map(b =>
        b.id === bookId ? { ...b, borrow_status: 'borrower_returning' } : b
      ));
      setActionMessage({ type: 'success', text: 'Return initiated! Waiting for the owner to confirm.' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
    setActionLoading(null);
  }

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

  return (
    <div className="min-h-screen bg-theme-primary">
      <Navbar />

      <main className="max-w-6xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-theme-primary mb-2">Borrows</h1>
        <p className="text-theme-muted mb-6">
          Track books you've lent out and books you're borrowing
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className={`mb-4 px-4 py-3 rounded ${
            actionMessage.type === 'success'
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {actionMessage.text}
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 bg-theme-secondary rounded-lg p-1 max-w-md">
          <button
            onClick={() => setActiveTab('lending')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'lending'
                ? 'bg-theme-accent text-theme-on-primary shadow'
                : 'text-theme-muted hover:text-theme-primary'
            }`}
          >
            Lending ({lendingBooks.length})
          </button>
          <button
            onClick={() => setActiveTab('borrowing')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'borrowing'
                ? 'bg-theme-accent text-theme-on-primary shadow'
                : 'text-theme-muted hover:text-theme-primary'
            }`}
          >
            Borrowing ({borrowingBooks.length})
          </button>
        </div>

        {/* Lending tab */}
        {activeTab === 'lending' && (
          <div>
            {lendingBooks.length === 0 ? (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-theme-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-theme-muted text-lg">You haven't lent any books out</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lendingBooks.map(book => (
                  <div key={book.id} className="bg-theme-card rounded-lg shadow-md p-4">
                    <h3 className="text-lg font-semibold text-theme-primary mb-1">
                      <Link to={`/book/${book.id}`} className="hover:text-theme-accent transition-colors">
                        {book.title}
                      </Link>
                    </h3>
                    {book.author && (
                      <p className="text-theme-muted text-sm mb-3">by {book.author}</p>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        book.borrow_status === 'borrowed'
                          ? 'bg-purple-100 text-purple-800'
                          : book.borrow_status === 'borrower_returning'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {book.borrow_status === 'borrowed' ? 'Borrowed' : book.borrow_status === 'borrower_returning' ? 'Being Returned' : 'Return Requested'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-theme-muted mb-3">
                      <span>Lent to</span>
                      <Link
                        to={`/friends/${book.borrowed_by_user_id}/library`}
                        className="text-theme-accent hover:underline font-medium"
                      >
                        {book.borrower_name || book.borrower_email}
                      </Link>
                    </div>

                    {book.borrow_status === 'borrowed' && (
                      <button
                        onClick={() => handleRequestReturn(book.id)}
                        disabled={actionLoading === book.id}
                        className="w-full px-3 py-2 text-sm font-medium bg-orange-500 text-white rounded-md hover:bg-orange-600 transition disabled:opacity-50"
                      >
                        {actionLoading === book.id ? 'Requesting...' : 'Request Return'}
                      </button>
                    )}

                    {book.borrow_status === 'return_requested' && (
                      <p className="text-xs text-yellow-700 bg-yellow-50 px-3 py-2 rounded-md text-center">
                        Waiting for borrower to acknowledge return
                      </p>
                    )}

                    {book.borrow_status === 'borrower_returning' && (
                      <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-md text-center">
                        Borrower is returning this book. Check your notifications to confirm.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Borrowing tab */}
        {activeTab === 'borrowing' && (
          <div>
            {borrowingBooks.length === 0 ? (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-theme-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-theme-muted text-lg">You're not borrowing any books</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {borrowingBooks.map(book => (
                  <div key={book.id} className="bg-theme-card rounded-lg shadow-md p-4">
                    <h3 className="text-lg font-semibold text-theme-primary mb-1">
                      {book.title}
                    </h3>
                    {book.author && (
                      <p className="text-theme-muted text-sm mb-3">by {book.author}</p>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        book.borrow_status === 'borrowed'
                          ? 'bg-purple-100 text-purple-800'
                          : book.borrow_status === 'borrower_returning'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {book.borrow_status === 'borrowed' ? 'Borrowing' : book.borrow_status === 'borrower_returning' ? 'Returning' : 'Return Requested'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-theme-muted mb-3">
                      <span>From</span>
                      <Link
                        to={`/friends/${book.owner_id}/library`}
                        className="text-theme-accent hover:underline font-medium"
                      >
                        {book.owner_name || book.owner_email}
                      </Link>
                    </div>

                    {book.borrow_status === 'borrowed' && (
                      <button
                        onClick={() => handleInitiateReturn(book.id)}
                        disabled={actionLoading === `return-${book.id}`}
                        className="w-full px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {actionLoading === `return-${book.id}` ? 'Returning...' : 'Return Book'}
                      </button>
                    )}

                    {book.borrow_status === 'return_requested' && (
                      <p className="text-xs text-yellow-700 bg-yellow-50 px-3 py-2 rounded-md text-center">
                        The owner has requested this book back. Check your notifications to acknowledge the return.
                      </p>
                    )}

                    {book.borrow_status === 'borrower_returning' && (
                      <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-md text-center">
                        Waiting for the owner to confirm the return.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
