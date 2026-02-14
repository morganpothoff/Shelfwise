import { useState } from 'react';

export default function AddCompletedBookConfirmModal({ book, onConfirm, onClose }) {
  const [dateFinished, setDateFinished] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(dateFinished.trim() || null);
      onClose();
    } catch {
      // Leave modal open so user can retry or cancel
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card rounded-lg p-6 max-w-md w-full shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-theme-primary">Add to Books Completed</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-theme-muted hover:text-theme-primary text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-theme-secondary mb-4">
          Add this book to your completed list. You can optionally set when you finished it.
        </p>

        <div className="mb-4 p-3 bg-theme-secondary rounded-md">
          <p className="font-medium text-theme-primary">{book.title}</p>
          {book.author && (
            <p className="text-sm text-theme-muted">by {book.author}</p>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="date-finished" className="block text-sm font-medium text-theme-primary mb-1">
            Date finished <span className="text-theme-muted font-normal">(optional)</span>
          </label>
          <input
            type="date"
            id="date-finished"
            value={dateFinished}
            onChange={(e) => setDateFinished(e.target.value)}
            className="w-full px-3 py-2 border border-theme rounded-md bg-theme-card text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-accent"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-theme text-theme-primary hover:bg-theme-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="px-4 py-2 rounded-md bg-theme-accent text-theme-on-primary hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Adding…' : 'Add to Books Completed'}
          </button>
        </div>
      </div>
    </div>
  );
}
