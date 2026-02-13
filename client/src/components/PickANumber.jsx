import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import { pickANumber, updateBook } from '../services/api';

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

export default function PickANumber() {
  const [numberInput, setNumberInput] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [includeRead, setIncludeRead] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [revealAnimation, setRevealAnimation] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    const trimmed = numberInput.trim();
    if (!trimmed) return;

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed)) {
      setError('Please enter a whole number (no decimals)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSelectedBook(null);
      setSuccessMessage(null);
      setHasSubmitted(true);
      setRevealAnimation(false);

      const result = await pickANumber(parsed, includeRead);

      // Brief delay then reveal with animation
      setTimeout(() => {
        setSelectedBook(result.book);
        setRevealAnimation(true);
      }, 400);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [numberInput, includeRead]);

  const handleReadMe = async () => {
    if (!selectedBook || updating) return;

    try {
      setUpdating(true);
      await updateBook(selectedBook.id, { reading_status: 'reading' });

      setShowConfetti(true);
      setSelectedBookId(selectedBook.id);
      setSuccessMessage(`"${selectedBook.title}" is now set to Currently Reading!`);

      setTimeout(() => setShowConfetti(false), 4500);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleTryAgain = () => {
    setNumberInput('');
    setSelectedBook(null);
    setHasSubmitted(false);
    setError(null);
    setSuccessMessage(null);
    setRevealAnimation(false);
  };

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

        {/* Include read checkbox */}
        {!successMessage && (
          <div className="flex justify-end mb-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeRead}
                onChange={(e) => setIncludeRead(e.target.checked)}
                className="w-4 h-4 rounded border-theme text-theme-accent focus:ring-theme-accent"
              />
              <span className="text-sm text-theme-secondary">Include books already read</span>
            </label>
          </div>
        )}

        {/* Number input section */}
        {!selectedBook && !successMessage && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-theme-accent/10 rounded-full mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-theme-primary mb-2">Pick a Number</h1>
            <p className="text-lg text-theme-muted max-w-md mx-auto mb-8">
              Think of any whole number — big, small, positive, negative — and let fate decide your next read.
            </p>

            <form onSubmit={handleSubmit} className="max-w-sm mx-auto">
              <div className="relative">
                <input
                  type="number"
                  value={numberInput}
                  onChange={(e) => {
                    setNumberInput(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter any whole number..."
                  className="w-full px-6 py-4 text-center text-2xl font-bold bg-theme-card border-2 border-theme rounded-xl text-theme-primary placeholder:text-theme-muted/50 focus:outline-none focus:border-theme-accent transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="mt-3 text-red-500 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !numberInput.trim()}
                className="mt-6 w-full bg-theme-accent bg-theme-accent-hover text-theme-on-primary py-3 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Finding your book...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                    Reveal My Book
                  </>
                )}
              </button>
            </form>

            {hasSubmitted && loading && (
              <div className="mt-8">
                <div className="flex justify-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-3 h-3 bg-theme-accent rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 text-center">
            {successMessage}
          </div>
        )}

        {/* Book result card */}
        {selectedBook && !successMessage && (
          <div className={`transition-all duration-500 ${revealAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="text-center mb-6">
              <p className="text-theme-muted text-sm">Your number <span className="font-bold text-theme-accent">{numberInput}</span> has chosen...</p>
            </div>

            <div className="bg-theme-card rounded-xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-theme-accent/10 px-6 py-5 border-b border-theme">
                <div className="flex items-start gap-3">
                  {selectedBook.series_position != null && (
                    <span className="flex-shrink-0 w-8 h-8 bg-theme-accent text-theme-on-primary text-sm font-bold rounded-full flex items-center justify-center mt-1">
                      {Number.isInteger(selectedBook.series_position) ? selectedBook.series_position : selectedBook.series_position.toFixed(1)}
                    </span>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-theme-primary">{selectedBook.title}</h1>
                    {selectedBook.series_name && (
                      <p className="text-theme-accent mt-1">{selectedBook.series_name} Series</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Book details */}
              <div className="p-6 space-y-5">
                {/* Author */}
                {selectedBook.author && (
                  <div>
                    <h2 className="text-sm font-semibold text-theme-muted uppercase tracking-wide mb-1">Author</h2>
                    <p className="text-lg text-theme-primary">{selectedBook.author}</p>
                  </div>
                )}

                {/* Quick stats */}
                <div className="flex flex-wrap gap-3">
                  {selectedBook.page_count && (
                    <div className="bg-theme-secondary px-4 py-2 rounded-lg">
                      <span className="text-sm text-theme-muted">Pages</span>
                      <p className="text-lg font-semibold text-theme-primary">{selectedBook.page_count}</p>
                    </div>
                  )}
                  {selectedBook.genre && (
                    <div className="bg-theme-secondary px-4 py-2 rounded-lg">
                      <span className="text-sm text-theme-muted">Genre</span>
                      <p className="text-lg font-semibold text-theme-primary">{selectedBook.genre}</p>
                    </div>
                  )}
                </div>

                {/* Synopsis */}
                {selectedBook.synopsis && (
                  <div>
                    <h2 className="text-sm font-semibold text-theme-muted uppercase tracking-wide mb-2">Synopsis</h2>
                    <p className="text-theme-primary whitespace-pre-line leading-relaxed text-sm">{selectedBook.synopsis}</p>
                  </div>
                )}

                {/* Tags */}
                {selectedBook.tags && selectedBook.tags.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-theme-muted uppercase tracking-wide mb-2">Tags</h2>
                    <div className="flex flex-wrap gap-2">
                      {selectedBook.tags.map((tag, index) => (
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
                onClick={handleTryAgain}
                className="flex-1 bg-theme-card border-2 border-theme text-theme-primary py-3 px-6 rounded-lg font-semibold transition-colors hover:bg-theme-secondary flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Try Another Number
              </button>
            </div>
          </div>
        )}

        {/* After marking as reading */}
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
