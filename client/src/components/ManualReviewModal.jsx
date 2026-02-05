import { useState } from 'react';

export default function ManualReviewModal({ books, onAddBook, onComplete, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState({
    added: 0,
    skipped: 0
  });

  const currentBook = books[currentIndex];
  const isLastBook = currentIndex === books.length - 1;

  const handleAddAnyway = async (addToLibrary = false) => {
    setProcessing(true);
    const success = await onAddBook({
      title: currentBook.title || currentBook.originalData?.title,
      author: currentBook.author || currentBook.originalData?.author,
      isbn: currentBook.originalData?.isbn,
      date_finished: currentBook.date_finished || currentBook.originalData?.date_finished,
      addToLibrary
    });
    setProcessing(false);

    if (success) {
      setResults(prev => ({ ...prev, added: prev.added + 1 }));
    }

    if (isLastBook) {
      onComplete();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    setResults(prev => ({ ...prev, skipped: prev.skipped + 1 }));

    if (isLastBook) {
      onComplete();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSkipAll = () => {
    setResults(prev => ({ ...prev, skipped: prev.skipped + (books.length - currentIndex) }));
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-theme-card rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <div>
            <h2 className="text-xl font-semibold text-theme-primary">Manual Review Required</h2>
            <p className="text-sm text-theme-muted">
              {currentIndex + 1} of {books.length} books
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Progress bar */}
          <div className="w-full bg-theme-secondary rounded-full h-2">
            <div
              className="bg-theme-accent h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / books.length) * 100}%` }}
            />
          </div>

          {/* Warning message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-yellow-800">
                <p className="font-medium">{currentBook.reason}</p>
              </div>
            </div>
          </div>

          {/* Book info */}
          <div className="bg-theme-secondary rounded-lg p-4 space-y-2">
            <div>
              <label className="text-xs text-theme-muted uppercase tracking-wide">Title</label>
              <p className="font-medium text-theme-primary">
                {currentBook.title || currentBook.originalData?.title || 'Not provided'}
              </p>
            </div>
            <div>
              <label className="text-xs text-theme-muted uppercase tracking-wide">Author</label>
              <p className="text-theme-primary">
                {currentBook.author || currentBook.originalData?.author || 'Not provided'}
              </p>
            </div>
            {(currentBook.originalData?.isbn) && (
              <div>
                <label className="text-xs text-theme-muted uppercase tracking-wide">ISBN</label>
                <p className="text-theme-primary">{currentBook.originalData.isbn}</p>
              </div>
            )}
            {(currentBook.date_finished || currentBook.originalData?.date_finished) && (
              <div>
                <label className="text-xs text-theme-muted uppercase tracking-wide">Date Finished</label>
                <p className="text-theme-primary">
                  {currentBook.date_finished || currentBook.originalData.date_finished}
                </p>
              </div>
            )}
          </div>

          {/* Results so far */}
          {(results.added > 0 || results.skipped > 0) && (
            <div className="flex gap-4 text-sm text-theme-muted">
              <span className="text-green-600">{results.added} added</span>
              <span>{results.skipped} skipped</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 p-4 border-t border-theme">
          <button
            onClick={handleSkip}
            disabled={processing}
            className="flex-1 px-4 py-2 text-theme-muted hover:text-theme-primary border border-theme rounded-md hover:bg-theme-secondary transition-colors disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={() => handleAddAnyway(false)}
            disabled={processing}
            className="flex-1 px-4 py-2 bg-theme-secondary text-theme-primary rounded-md hover:opacity-80 transition-colors disabled:opacity-50"
          >
            {processing ? 'Adding...' : 'Add Anyway'}
          </button>
          <button
            onClick={() => handleAddAnyway(true)}
            disabled={processing}
            className="flex-1 px-4 py-2 bg-theme-accent text-theme-on-primary rounded-md bg-theme-accent-hover transition-colors disabled:opacity-50"
          >
            {processing ? 'Adding...' : 'Add + Library'}
          </button>
        </div>

        {books.length > 1 && (
          <div className="px-4 pb-4">
            <button
              onClick={handleSkipAll}
              className="w-full text-sm text-theme-muted hover:text-theme-primary"
            >
              Skip all remaining ({books.length - currentIndex} books)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
