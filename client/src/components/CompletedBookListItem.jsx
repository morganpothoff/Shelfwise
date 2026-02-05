export default function CompletedBookListItem({ book, onDelete, onEdit, onAddToLibrary, showSeriesPosition }) {
  const handleDelete = () => {
    if (window.confirm(`Remove "${book.title}" from your completed books?`)) {
      onDelete(book.id);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-theme last:border-b-0 hover:bg-theme-secondary transition-colors group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Series position badge */}
        {showSeriesPosition && book.series_position != null && (
          <span className="flex-shrink-0 w-6 h-6 bg-theme-accent text-theme-on-primary text-xs font-bold rounded-full flex items-center justify-center">
            {Number.isInteger(book.series_position) ? book.series_position : book.series_position.toFixed(1)}
          </span>
        )}

        {/* Completed badge */}
        <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Read
        </span>

        {/* Book info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-theme-primary truncate">{book.title}</h4>
            {book.library_book_id && (
              <span className="flex-shrink-0 text-xs text-green-600" title="In your library">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-theme-muted">
            {book.author && <span className="truncate">by {book.author}</span>}
            {book.date_finished && (
              <span className="flex-shrink-0">Finished: {formatDate(book.date_finished)}</span>
            )}
            {book.page_count && <span className="flex-shrink-0 hidden sm:inline">{book.page_count} pages</span>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-2">
        {!book.library_book_id && (
          <button
            onClick={() => onAddToLibrary(book.id)}
            className="text-theme-muted hover:text-theme-accent opacity-0 group-hover:opacity-100 transition-opacity"
            title="Add to library"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onEdit(book)}
          className="text-theme-muted hover:text-theme-secondary opacity-0 group-hover:opacity-100 transition-opacity"
          title="Edit book"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="text-theme-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove from completed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
