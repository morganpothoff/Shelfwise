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
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Enter ISBN</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="isbn" className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Look Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
