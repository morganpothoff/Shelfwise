import { Link } from 'react-router-dom';

export default function CompletedBookListItem({ book, onDelete, onEditSeries, onAddToLibrary, showSeriesPosition }) {
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
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  };

  return (
    <div className="flex items-center justify-between py-2 px-4 bg-theme-card border-b border-theme hover:bg-theme-secondary group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {showSeriesPosition && book.series_position != null && (
          <span className="flex-shrink-0 w-5 h-5 bg-theme-accent text-theme-on-primary text-xs font-bold rounded-full flex items-center justify-center">
            {Number.isInteger(book.series_position) ? book.series_position : book.series_position.toFixed(1)}
          </span>
        )}
        <div className="min-w-0 flex items-center gap-2">
          <Link to={`/completed-book/${book.id}`} className="font-medium text-theme-primary hover:text-theme-accent transition-colors">
            {book.title}
          </Link>
          {book.date_finished && (
            <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
              {formatDate(book.date_finished)}
            </span>
          )}
          {isLibrary ? (
            <span className="text-xs bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
              In Library
            </span>
          ) : book.owned ? (
            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
              Owned
            </span>
          ) : null}
          {book.author && (
            <span className="text-theme-muted">by {book.author}</span>
          )}
        </div>
      </div>
      <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!isLibrary && !book.owned && (
          <button
            onClick={handleAddToLibrary}
            className="text-theme-muted hover:text-green-500"
            title="Add to library"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onEditSeries(book)}
          className="text-theme-muted hover:text-theme-secondary"
          title="Edit series"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="text-theme-muted hover:text-red-500"
          title={isLibrary ? "Mark as unread" : "Remove from completed books"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
