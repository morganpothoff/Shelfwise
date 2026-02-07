import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import { getBooks, updateBook } from '../services/api';

function ConfettiPiece({ style }) {
  return <div className="confetti-piece" style={style} />;
}

function Confetti({ active }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }

    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
    const newPieces = [];

    for (let i = 0; i < 80; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const duration = 2 + Math.random() * 2;
      const size = 6 + Math.random() * 8;
      const rotation = Math.random() * 360;

      newPieces.push({
        id: i,
        style: {
          position: 'fixed',
          left: `${left}%`,
          top: '-10px',
          width: `${size}px`,
          height: `${size * 0.6}px`,
          backgroundColor: color,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
          transform: `rotate(${rotation}deg)`,
          zIndex: 9999,
          pointerEvents: 'none',
        },
      });
    }

    setPieces(newPieces);

    const timer = setTimeout(() => setPieces([]), 4500);
    return () => clearTimeout(timer);
  }, [active]);

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.id} style={piece.style} />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default function PickForMe() {
  const [allBooks, setAllBooks] = useState([]);
  const [currentBook, setCurrentBook] = useState(null);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [shuffling, setShuffling] = useState(false);

  const loadBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const books = await getBooks();
      const unreadBooks = books.filter((b) => b.reading_status === 'unread');
      setAllBooks(unreadBooks);
      if (unreadBooks.length > 0) {
        const randomIndex = Math.floor(Math.random() * unreadBooks.length);
        setCurrentBook(unreadBooks[randomIndex]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleShuffle = () => {
    if (allBooks.length <= 1) return;

    setShuffling(true);
    setSuccessMessage(null);

    // Pick a different book than the current one
    let nextBook;
    do {
      const randomIndex = Math.floor(Math.random() * allBooks.length);
      nextBook = allBooks[randomIndex];
    } while (nextBook.id === currentBook?.id && allBooks.length > 1);

    setTimeout(() => {
      setCurrentBook(nextBook);
      setShuffling(false);
    }, 300);
  };

  const handleReadMe = async () => {
    if (!currentBook || updating) return;

    try {
      setUpdating(true);
      await updateBook(currentBook.id, { reading_status: 'reading' });

      setShowConfetti(true);
      setSelectedBookId(currentBook.id);
      setSuccessMessage(`"${currentBook.title}" is now set to Currently Reading!`);

      // Remove from unread pool
      setAllBooks((prev) => prev.filter((b) => b.id !== currentBook.id));

      setTimeout(() => setShowConfetti(false), 4500);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <Navbar />
        <main className="max-w-4xl mx-auto py-12 px-4">
          <div className="text-center py-12">
            <svg className="animate-spin h-12 w-12 text-theme-secondary mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-theme-muted">Finding your next read...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <Navbar />
        <main className="max-w-4xl mx-auto py-12 px-4">
          <div className="text-center py-12">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (allBooks.length === 0 && !successMessage) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <Navbar />
        <main className="max-w-4xl mx-auto py-12 px-4">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-theme-accent/10 rounded-full mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-theme-primary mb-2">No unread books</h2>
            <p className="text-theme-muted max-w-md mx-auto">
              All books in your library have been read or are currently being read. Add more books to your library to use this feature.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <Navbar />
      <Confetti active={showConfetti} />

      <main className="max-w-2xl mx-auto py-8 px-4">
        {/* Back link */}
        <Link
          to="/pick-my-next-book"
          className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme-accent transition-colors mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Pick My Next Book
        </Link>

        {/* Success message */}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 text-center">
            {successMessage}
          </div>
        )}

        {/* Book profile card */}
        {currentBook && !successMessage && (
          <div className={`transition-opacity duration-300 ${shuffling ? 'opacity-0' : 'opacity-100'}`}>
            <div className="bg-theme-card rounded-xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-theme-accent/10 px-6 py-5 border-b border-theme">
                <div className="flex items-start gap-3">
                  {currentBook.series_position != null && (
                    <span className="flex-shrink-0 w-8 h-8 bg-theme-accent text-theme-on-primary text-sm font-bold rounded-full flex items-center justify-center mt-1">
                      {Number.isInteger(currentBook.series_position) ? currentBook.series_position : currentBook.series_position.toFixed(1)}
                    </span>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-theme-primary">{currentBook.title}</h1>
                    {currentBook.series_name && (
                      <p className="text-theme-accent mt-1">{currentBook.series_name} Series</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Book details */}
              <div className="p-6 space-y-5">
                {/* Author */}
                {currentBook.author && (
                  <div>
                    <h2 className="text-sm font-semibold text-theme-muted uppercase tracking-wide mb-1">Author</h2>
                    <p className="text-lg text-theme-primary">{currentBook.author}</p>
                  </div>
                )}

                {/* Quick stats */}
                <div className="flex flex-wrap gap-3">
                  {currentBook.page_count && (
                    <div className="bg-theme-secondary px-4 py-2 rounded-lg">
                      <span className="text-sm text-theme-muted">Pages</span>
                      <p className="text-lg font-semibold text-theme-primary">{currentBook.page_count}</p>
                    </div>
                  )}
                  {currentBook.genre && (
                    <div className="bg-theme-secondary px-4 py-2 rounded-lg">
                      <span className="text-sm text-theme-muted">Genre</span>
                      <p className="text-lg font-semibold text-theme-primary">{currentBook.genre}</p>
                    </div>
                  )}
                </div>

                {/* Synopsis */}
                {currentBook.synopsis && (
                  <div>
                    <h2 className="text-sm font-semibold text-theme-muted uppercase tracking-wide mb-2">Synopsis</h2>
                    <p className="text-theme-primary whitespace-pre-line leading-relaxed text-sm">{currentBook.synopsis}</p>
                  </div>
                )}

                {/* Tags */}
                {currentBook.tags && currentBook.tags.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-theme-muted uppercase tracking-wide mb-2">Tags</h2>
                    <div className="flex flex-wrap gap-2">
                      {currentBook.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-theme-series text-theme-series px-3 py-1 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleReadMe}
                disabled={updating}
                className="flex-1 bg-theme-accent bg-theme-accent-hover text-theme-on-primary py-3 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                    Read Me
                  </>
                )}
              </button>

              <button
                onClick={handleShuffle}
                disabled={allBooks.length <= 1 || shuffling}
                className="flex-1 bg-theme-card border-2 border-theme text-theme-primary py-3 px-6 rounded-lg font-semibold transition-colors hover:bg-theme-secondary disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${shuffling ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Shuffle
              </button>
            </div>
          </div>
        )}

        {/* After marking as reading - show Return to Library and Review Book Profile */}
        {successMessage && (
          <div className="flex gap-4 mt-6">
            <Link
              to="/"
              className="flex-1 bg-theme-card border-2 border-theme text-theme-primary py-3 px-6 rounded-lg font-semibold transition-colors hover:bg-theme-secondary flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              Return to Library
            </Link>
            <Link
              to={`/book/${selectedBookId}`}
              className="flex-1 bg-theme-accent bg-theme-accent-hover text-theme-on-primary py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              Review Book Profile
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
