import { useState } from 'react';

export default function ManualBookForm({ isbn, onSubmit, onClose }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!author.trim()) {
      setError('Author is required');
      return;
    }

    onSubmit({ title: title.trim(), author: author.trim(), isbn });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-theme-primary">Add Book</h2>
            {isbn && (
              <p className="text-sm text-theme-muted">ISBN {isbn} not found - enter details to search</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-primary text-2xl"
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-theme-secondary mb-4">
          Enter the title and author, and we'll automatically find the rest of the book information.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-theme-primary mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              placeholder="e.g., The Poppy War"
              className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-theme-accent"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="author" className="block text-sm font-medium text-theme-primary mb-1">
              Author <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="author"
              value={author}
              onChange={(e) => {
                setAuthor(e.target.value);
                setError(null);
              }}
              placeholder="e.g., R.F. Kuang"
              className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-theme-accent"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-theme rounded-md text-theme-primary hover:bg-theme-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-theme-accent bg-theme-accent-hover text-theme-on-primary rounded-md"
            >
              Find & Add Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
