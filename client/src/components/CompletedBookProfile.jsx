import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from './Navbar';
import EditSeriesModal from './EditSeriesModal';
import { getCompletedBook, getCompletedBookRating, saveCompletedBookRating, deleteCompletedBookRating, deleteCompletedBook, updateCompletedBook, addCompletedBookToLibrary } from '../services/api';

function StarRating({ rating, onRate, interactive = false }) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onRate(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-8 w-8 ${
              (hoverRating || rating) >= star
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 fill-gray-300'
            } transition-colors`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function CompletedBookProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Rating state
  const [userRating, setUserRating] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingMessage, setRatingMessage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Book actions state
  const [showEditSeriesModal, setShowEditSeriesModal] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Date finished editing state
  const [editingDateFinished, setEditingDateFinished] = useState(false);
  const [dateFinished, setDateFinished] = useState('');
  const [dateFinishedLoading, setDateFinishedLoading] = useState(false);

  // Add to library state
  const [addingToLibrary, setAddingToLibrary] = useState(false);

  useEffect(() => {
    loadBook();
  }, [id]);

  const loadBook = async () => {
    try {
      setLoading(true);
      setError(null);
      const [bookData, ratingData] = await Promise.all([
        getCompletedBook(id),
        getCompletedBookRating(id).catch(() => null)
      ]);
      setBook(bookData);
      setDateFinished(bookData.date_finished || '');
      if (ratingData) {
        setUserRating(ratingData);
        setSelectedRating(ratingData.rating);
        setComment(ratingData.comment || '');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRating = async () => {
    if (selectedRating < 1 || selectedRating > 5) {
      setRatingMessage({ type: 'error', text: 'Please select a rating between 1 and 5 stars' });
      return;
    }

    try {
      setRatingLoading(true);
      setRatingMessage(null);
      const savedRating = await saveCompletedBookRating(id, selectedRating, comment || null);
      setUserRating(savedRating);
      setIsEditing(false);
      setRatingMessage({ type: 'success', text: 'Rating saved!' });
      setTimeout(() => setRatingMessage(null), 3000);
    } catch (err) {
      setRatingMessage({ type: 'error', text: err.message });
    } finally {
      setRatingLoading(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!window.confirm('Are you sure you want to delete your rating?')) return;

    try {
      setRatingLoading(true);
      setRatingMessage(null);
      await deleteCompletedBookRating(id);
      setUserRating(null);
      setSelectedRating(0);
      setComment('');
      setIsEditing(false);
      setRatingMessage({ type: 'success', text: 'Rating deleted' });
      setTimeout(() => setRatingMessage(null), 3000);
    } catch (err) {
      setRatingMessage({ type: 'error', text: err.message });
    } finally {
      setRatingLoading(false);
    }
  };

  const handleStartEditing = () => {
    setIsEditing(true);
    if (userRating) {
      setSelectedRating(userRating.rating);
      setComment(userRating.comment || '');
    }
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    if (userRating) {
      setSelectedRating(userRating.rating);
      setComment(userRating.comment || '');
    } else {
      setSelectedRating(0);
      setComment('');
    }
  };

  const isLibrary = book?.source === 'library';

  const handleDeleteBook = async () => {
    const msg = isLibrary
      ? `Mark "${book.title}" as unread? It will remain in your library.`
      : `Remove "${book.title}" from your completed books?`;
    if (!window.confirm(msg)) return;

    try {
      await deleteCompletedBook(id);
      navigate('/books-completed');
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleSaveSeries = async (seriesData) => {
    try {
      const updatedBook = await updateCompletedBook(id, seriesData);
      setBook(updatedBook);
      setShowEditSeriesModal(false);
      setActionMessage({ type: 'success', text: 'Series info updated' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleSaveDateFinished = async () => {
    try {
      setDateFinishedLoading(true);
      const updatedBook = await updateCompletedBook(id, {
        date_finished: dateFinished || null
      });
      setBook(updatedBook);
      setDateFinished(updatedBook.date_finished || '');
      setEditingDateFinished(false);
      setActionMessage({ type: 'success', text: 'Date finished updated' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setDateFinishedLoading(false);
    }
  };

  const handleCancelDateFinished = () => {
    setEditingDateFinished(false);
    setDateFinished(book.date_finished || '');
  };

  const handleAddToLibrary = async () => {
    if (!window.confirm(`Add "${book.title}" to your library?`)) return;

    try {
      setAddingToLibrary(true);
      const result = await addCompletedBookToLibrary(id);
      // The completed book has been migrated to the library — navigate to the new URL
      const newBookId = result.book.id;
      setActionMessage({ type: 'success', text: `"${book.title}" added to your library!` });
      // Navigate to the new library book profile
      navigate(`/completed-book/${newBookId}`, { replace: true });
      // Reload book data with the new ID
      setBook(result.book);
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setAddingToLibrary(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <Navbar />
        <main className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center py-12">
            <svg className="animate-spin h-12 w-12 text-theme-secondary mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-theme-muted">Loading book details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <Navbar />
        <main className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center py-12">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
            <button
              onClick={() => navigate('/books-completed')}
              className="text-theme-secondary hover:text-theme-accent transition-colors hover:underline"
            >
              Return to Books Completed
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <Navbar />

      <main className="max-w-4xl mx-auto py-8 px-4">
        {/* Back link */}
        <Link
          to="/books-completed"
          className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme-accent transition-colors mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Books Completed
        </Link>

        {/* Action message */}
        {actionMessage && (
          <div className={`mb-6 px-4 py-3 rounded ${
            actionMessage.type === 'success'
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {actionMessage.text}
          </div>
        )}

        {/* Book details card */}
        <div className="bg-theme-card rounded-xl shadow-lg overflow-hidden">
          {/* Header with title and series info */}
          <div className="bg-theme-accent/10 px-6 py-4 border-b border-theme">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {book.series_position != null && (
                  <span className="flex-shrink-0 w-8 h-8 bg-theme-accent text-theme-on-primary text-sm font-bold rounded-full flex items-center justify-center mt-1">
                    {Number.isInteger(book.series_position) ? book.series_position : book.series_position.toFixed(1)}
                  </span>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-theme-primary">{book.title}</h1>
                  {book.series_name && (
                    <p className="text-theme-accent mt-1">{book.series_name} Series</p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 ml-4">
                {!isLibrary && !book.owned && (
                  <button
                    onClick={handleAddToLibrary}
                    disabled={addingToLibrary}
                    className="p-2 text-theme-muted hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Add to library"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setShowEditSeriesModal(true)}
                  className="p-2 text-theme-muted hover:text-theme-secondary hover:bg-theme-secondary rounded-lg transition-colors"
                  title="Edit series"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </button>
                <button
                  onClick={handleDeleteBook}
                  className="p-2 text-theme-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title={isLibrary ? "Mark as unread" : "Remove from completed books"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Book information */}
          <div className="p-6 space-y-6">
            {/* Author */}
            {book.author && (
              <div>
                <h2 className="text-sm font-semibold text-theme-muted uppercase tracking-wide mb-1">Author</h2>
                <p className="text-lg text-theme-primary">{book.author}</p>
              </div>
            )}

            {/* Quick stats */}
            <div className="flex flex-wrap gap-4">
              {isLibrary ? (
                <div className="bg-indigo-100 px-4 py-2 rounded-lg">
                  <span className="text-sm text-indigo-600">Status</span>
                  <p className="text-lg font-semibold text-indigo-800">In Library</p>
                </div>
              ) : book.owned ? (
                <div className="bg-blue-100 px-4 py-2 rounded-lg">
                  <span className="text-sm text-blue-600">Status</span>
                  <p className="text-lg font-semibold text-blue-800">Owned</p>
                </div>
              ) : (
                <div className="bg-gray-100 px-4 py-2 rounded-lg">
                  <span className="text-sm text-gray-600">Status</span>
                  <p className="text-lg font-semibold text-gray-800">Not Owned</p>
                </div>
              )}
              {book.page_count && (
                <div className="bg-theme-secondary px-4 py-2 rounded-lg">
                  <span className="text-sm text-theme-muted">Pages</span>
                  <p className="text-lg font-semibold text-theme-primary">{book.page_count}</p>
                </div>
              )}
              {book.genre && (
                <div className="bg-theme-secondary px-4 py-2 rounded-lg">
                  <span className="text-sm text-theme-muted">Genre</span>
                  <p className="text-lg font-semibold text-theme-primary">{book.genre}</p>
                </div>
              )}
              {book.isbn && (
                <div className="bg-theme-secondary px-4 py-2 rounded-lg">
                  <span className="text-sm text-theme-muted">ISBN</span>
                  <p className="text-lg font-semibold text-theme-primary">{book.isbn}</p>
                </div>
              )}
            </div>

            {/* Add to Library button (prominent) — only for completed-source books not in library */}
            {!isLibrary && !book.owned && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-green-800 font-medium">Add to Your Library</h3>
                    <p className="text-sm text-green-600">Add this book to your owned collection</p>
                  </div>
                  <button
                    onClick={handleAddToLibrary}
                    disabled={addingToLibrary}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {addingToLibrary ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Adding...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add to Library
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Date Finished */}
            <div className="border-t border-theme pt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-theme-muted uppercase tracking-wide">Date Finished</h2>
                {!editingDateFinished && (
                  <button
                    onClick={() => setEditingDateFinished(true)}
                    className="text-sm text-theme-accent hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>

              {!editingDateFinished ? (
                <div className="flex items-center gap-4">
                  {book.date_finished ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <span>Finished: {new Date(book.date_finished).toLocaleDateString()}</span>
                    </span>
                  ) : (
                    <span className="text-theme-muted">No date set</span>
                  )}
                </div>
              ) : (
                <div className="bg-theme-secondary p-4 rounded-lg">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-theme-primary mb-1">
                      Date Finished
                    </label>
                    <input
                      type="date"
                      value={dateFinished}
                      onChange={(e) => setDateFinished(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="px-3 py-2 border border-theme rounded-lg bg-theme-card text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-accent"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveDateFinished}
                      disabled={dateFinishedLoading}
                      className="bg-theme-accent bg-theme-accent-hover text-theme-on-primary px-4 py-2 rounded-md transition-colors disabled:opacity-50"
                    >
                      {dateFinishedLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelDateFinished}
                      disabled={dateFinishedLoading}
                      className="text-theme-muted hover:text-theme-primary px-4 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Synopsis */}
            {book.synopsis && (
              <div>
                <h2 className="text-sm font-semibold text-theme-muted uppercase tracking-wide mb-2">Synopsis</h2>
                <p className="text-theme-primary whitespace-pre-line leading-relaxed">{book.synopsis}</p>
              </div>
            )}

            {/* Tags */}
            {book.tags && book.tags.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-theme-muted uppercase tracking-wide mb-2">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {book.tags.map((tag, index) => (
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

            {/* Dates */}
            <div className="text-sm text-theme-muted pt-4 border-t border-theme">
              <p>Added: {new Date(book.created_at).toLocaleDateString()}</p>
              {book.updated_at !== book.created_at && (
                <p>Last updated: {new Date(book.updated_at).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Rating section */}
        <div className="bg-theme-card rounded-xl shadow-lg overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-theme">
            <h2 className="text-lg font-semibold text-theme-primary">Your Rating</h2>
          </div>

          <div className="p-6">
            {ratingMessage && (
              <div className={`mb-4 px-4 py-2 rounded ${
                ratingMessage.type === 'success'
                  ? 'bg-green-100 border border-green-400 text-green-700'
                  : 'bg-red-100 border border-red-400 text-red-700'
              }`}>
                {ratingMessage.text}
              </div>
            )}

            {!userRating && !isEditing ? (
              <div className="text-center py-4">
                <p className="text-theme-muted mb-4">You haven't rated this book yet.</p>
                <button
                  onClick={handleStartEditing}
                  className="bg-theme-accent bg-theme-accent-hover text-theme-on-primary px-6 py-2 rounded-md transition-colors"
                >
                  Add Rating
                </button>
              </div>
            ) : !isEditing ? (
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <StarRating rating={userRating.rating} interactive={false} />
                  <span className="text-lg font-semibold text-theme-primary">{userRating.rating} / 5</span>
                </div>
                {userRating.comment && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-theme-muted mb-2">Your Comments</h3>
                    <p className="text-theme-primary whitespace-pre-line bg-theme-secondary p-4 rounded-lg">
                      {userRating.comment}
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleStartEditing}
                    className="text-theme-accent hover:underline"
                  >
                    Edit Rating
                  </button>
                  <button
                    onClick={handleDeleteRating}
                    disabled={ratingLoading}
                    className="text-red-500 hover:underline disabled:opacity-50"
                  >
                    Delete Rating
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-theme-muted mb-2">Rating</label>
                  <StarRating
                    rating={selectedRating}
                    onRate={setSelectedRating}
                    interactive={true}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-theme-muted mb-2">
                    Comments (optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your thoughts about this book..."
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-card text-theme-primary placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent resize-none"
                    rows={4}
                    maxLength={5000}
                  />
                  <p className="text-xs text-theme-muted mt-1">{comment.length} / 5000 characters</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveRating}
                    disabled={ratingLoading || selectedRating < 1}
                    className="bg-theme-accent bg-theme-accent-hover text-theme-on-primary px-6 py-2 rounded-md transition-colors disabled:opacity-50"
                  >
                    {ratingLoading ? 'Saving...' : 'Save Rating'}
                  </button>
                  <button
                    onClick={handleCancelEditing}
                    disabled={ratingLoading}
                    className="text-theme-muted hover:text-theme-primary px-4 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Series Modal */}
      {showEditSeriesModal && (
        <EditSeriesModal
          book={book}
          onSave={handleSaveSeries}
          onClose={() => setShowEditSeriesModal(false)}
        />
      )}
    </div>
  );
}
