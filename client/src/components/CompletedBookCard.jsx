export default function CompletedBookCard({ book, onDelete, onEdit, onAddToLibrary, showSeriesPosition }) {
  const handleDelete = () => {
    if (window.confirm(`Remove "${book.title}" from your completed books?`)) {
      onDelete(book.id);
    }
  };

  const handleAddToLibrary = () => {
    onAddToLibrary(book.id);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-theme-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow relative group">
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(book)}
          className="text-theme-muted hover:text-theme-secondary"
          title="Edit book"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="text-theme-muted hover:text-red-500"
          title="Remove from completed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Completed badge */}
      <div className="absolute top-2 left-2">
        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Read
        </span>
      </div>

      <div className="flex items-start gap-2 mb-1 mt-6">
        {showSeriesPosition && book.series_position != null && (
          <span className="flex-shrink-0 w-6 h-6 bg-theme-accent text-theme-on-primary text-xs font-bold rounded-full flex items-center justify-center">
            {Number.isInteger(book.series_position) ? book.series_position : book.series_position.toFixed(1)}
          </span>
        )}
        <h3 className="text-lg font-semibold text-theme-primary pr-12">{book.title}</h3>
      </div>

      {book.author && (
        <p className="text-theme-muted mb-2">
          {showSeriesPosition && book.series_position != null ? (
            <span className="ml-8">by {book.author}</span>
          ) : (
            `by ${book.author}`
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {book.date_finished && (
          <span className="text-xs bg-theme-secondary text-theme-muted px-2 py-1 rounded">
            Finished: {formatDate(book.date_finished)}
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

      {/* Add to Library button - only show if not already in library */}
      {!book.library_book_id && (
        <button
          onClick={handleAddToLibrary}
          className="w-full mt-2 flex items-center justify-center gap-2 text-sm bg-theme-secondary text-theme-primary px-3 py-2 rounded-md hover:opacity-80 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add to Library
        </button>
      )}

      {book.library_book_id && (
        <div className="w-full mt-2 flex items-center justify-center gap-2 text-sm text-green-600 px-3 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          In Library
        </div>
      )}

      {book.isbn && (
        <p className="text-xs text-theme-muted mt-3">ISBN: {book.isbn}</p>
      )}
    </div>
  );
}
