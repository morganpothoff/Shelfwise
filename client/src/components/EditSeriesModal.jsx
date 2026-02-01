import { useState, useEffect } from 'react';
import { getSeriesList } from '../services/api';

export default function EditSeriesModal({ book, onSave, onClose }) {
  const [seriesName, setSeriesName] = useState(book.series_name || '');
  const [seriesPosition, setSeriesPosition] = useState(book.series_position ?? '');
  const [existingSeries, setExistingSeries] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadExistingSeries();
  }, []);

  const loadExistingSeries = async () => {
    try {
      const series = await getSeriesList();
      setExistingSeries(series);
    } catch (err) {
      console.error('Failed to load series:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      series_name: seriesName.trim() || null,
      series_position: seriesPosition !== '' ? parseFloat(seriesPosition) : null
    });
  };

  const handleClear = () => {
    setSeriesName('');
    setSeriesPosition('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Series Info</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          <strong>{book.title}</strong> by {book.author}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="seriesName" className="block text-sm font-medium text-gray-700 mb-1">
              Series Name
            </label>
            <input
              type="text"
              id="seriesName"
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              placeholder="e.g., The Lunar Chronicles"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              list="existing-series"
            />
            <datalist id="existing-series">
              {existingSeries.map(s => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <p className="text-xs text-gray-500 mt-1">
              Select from existing series or enter a new one
            </p>
          </div>

          <div>
            <label htmlFor="seriesPosition" className="block text-sm font-medium text-gray-700 mb-1">
              Position in Series
            </label>
            <input
              type="number"
              id="seriesPosition"
              value={seriesPosition}
              onChange={(e) => setSeriesPosition(e.target.value)}
              placeholder="e.g., 1, 2, 3.5"
              step="0.1"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use decimals for novellas (e.g., 0.5, 1.5, 3.5)
            </p>
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Clear Series
            </button>
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
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
