import { Link } from 'react-router-dom';

export default function CompletedBookCard({ book, onDelete, onEditSeries, onAddToLibrary, showSeriesPosition }) {
  const isLibrary = book.source === 'library';

  const handleDelete = () => {
    const msg = isLibrary
      ? `Mark "${book.title}" as unread? It will remain in your library.`
      : `Remove "${book.title}" from your completed books?`;
    if (window.confirm(msg)) {
      onDelete(book.id);
    }
  };

  const handleAddToLibrary = () => {
    if (window.confirm(`Add "${book.title}" to your library?`)) {
      onAddToLibrary(book.id);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-theme-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow relative group">
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isLibrary && !book.owned && (
          <button
            onClick={handleAddToLibrary}
            className="text-theme-muted hover:text-green-500"
            title="Add to library"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onEditSeries(book)}
          className="text-theme-muted hover:text-theme-secondary"
          title="Edit series"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="text-theme-muted hover:text-red-500"
          title={isLibrary ? "Mark as unread" : "Remove from completed books"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex items-start gap-2 mb-1">
        {showSeriesPosition && book.series_position != null && (
          <span className="flex-shrink-0 w-6 h-6 bg-theme-accent text-theme-on-primary text-xs font-bold rounded-full flex items-center justify-center">
            {Number.isInteger(book.series_position) ? book.series_position : book.series_position.toFixed(1)}
          </span>
        )}
        <Link to={`/completed-book/${book.id}`} className="text-lg font-semibold text-theme-primary pr-12 hover:text-theme-accent transition-colors">
          {book.title}
        </Link>
      </div>

      {book.author && (
        <p className="text-theme-muted mb-2">{showSeriesPosition && book.series_position != null ? <span className="ml-8">by {book.author}</span> : `by ${book.author}`}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {book.date_finished && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
            Finished: {formatDate(book.date_finished)}
          </span>
        )}
        {isLibrary ? (
          <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-medium">
            In Library
          </span>
        ) : book.owned ? (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
            Owned
          </span>
        ) : null}
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
        <div className="flex flex-wrap gap-1">
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
        <p className="text-xs text-theme-muted mt-3">ISBN: {book.isbn}</p>
      )}
    </div>
  );
}
