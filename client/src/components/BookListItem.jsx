import { Link } from 'react-router-dom';

export default function BookListItem({ book, onDelete, onEditSeries, showSeriesPosition }) {
  const handleDelete = () => {
    if (window.confirm(`Remove "${book.title}" from your library?`)) {
      onDelete(book.id);
    }
  };

  return (
    <div className="flex items-center justify-between py-2 px-4 bg-theme-card border-b border-theme hover:bg-theme-secondary group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {showSeriesPosition && book.series_position != null && (
          <span className="flex-shrink-0 w-5 h-5 bg-theme-accent text-theme-on-primary text-xs font-bold rounded-full flex items-center justify-center">
            {Number.isInteger(book.series_position) ? book.series_position : book.series_position.toFixed(1)}
          </span>
        )}
        <div className="min-w-0">
          <Link to={`/book/${book.id}`} className="font-medium text-theme-primary hover:text-theme-accent transition-colors">
            {book.title}
          </Link>
          {book.author && (
            <span className="text-theme-muted ml-2">by {book.author}</span>
          )}
        </div>
      </div>
      <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
          title="Remove from library"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
