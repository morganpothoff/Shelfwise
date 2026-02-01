import { useState } from 'react';

export default function ManualISBNEntry({ onSubmit, onClose }) {
  const [isbn, setIsbn] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedIsbn = isbn.replace(/[-\s]/g, '');

    if (!/^\d{10}$|^\d{13}$/.test(cleanedIsbn)) {
      setError('Please enter a valid 10 or 13 digit ISBN');
      return;
    }

    onSubmit(cleanedIsbn);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-theme-card rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-theme-primary">Enter ISBN</h2>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-primary text-2xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="isbn" className="block text-sm font-medium text-theme-primary mb-1">
              ISBN Number
            </label>
            <input
              type="text"
              id="isbn"
              value={isbn}
              onChange={(e) => {
                setIsbn(e.target.value);
                setError(null);
              }}
              placeholder="e.g., 978-0-13-468599-1"
              className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-theme-accent"
              autoFocus
            />
            {error && (
              <p className="text-red-600 text-sm mt-1">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
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
              Look Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
