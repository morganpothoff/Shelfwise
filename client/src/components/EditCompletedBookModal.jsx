import { useState } from 'react';

export default function EditCompletedBookModal({ book, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: book.title || '',
    author: book.author || '',
    page_count: book.page_count || '',
    genre: book.genre || '',
    synopsis: book.synopsis || '',
    series_name: book.series_name || '',
    series_position: book.series_position || '',
    date_finished: book.date_finished || ''
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const dataToSave = {
      ...formData,
      page_count: formData.page_count ? parseInt(formData.page_count, 10) : null,
      series_position: formData.series_position ? parseFloat(formData.series_position) : null,
      series_name: formData.series_name || null,
      date_finished: formData.date_finished || null
    };

    await onSave(dataToSave);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-theme-card rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <h2 className="text-xl font-semibold text-theme-primary">Edit Completed Book</h2>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-theme rounded-md bg-theme-card text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-primary mb-1">Author</label>
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-theme rounded-md bg-theme-card text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-primary mb-1">Date Finished</label>
              <input
                type="date"
                name="date_finished"
                value={formData.date_finished}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-theme rounded-md bg-theme-card text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Page Count</label>
                <input
                  type="number"
                  name="page_count"
                  value={formData.page_count}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-3 py-2 border border-theme rounded-md bg-theme-card text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Genre</label>
                <input
                  type="text"
                  name="genre"
                  value={formData.genre}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-theme rounded-md bg-theme-card text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Series Name</label>
                <input
                  type="text"
                  name="series_name"
                  value={formData.series_name}
                  onChange={handleChange}
                  placeholder="e.g., Harry Potter"
                  className="w-full px-3 py-2 border border-theme rounded-md bg-theme-card text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Series Position</label>
                <input
                  type="number"
                  name="series_position"
                  value={formData.series_position}
                  onChange={handleChange}
                  min="0"
                  step="0.1"
                  placeholder="e.g., 1, 1.5"
                  className="w-full px-3 py-2 border border-theme rounded-md bg-theme-card text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-primary mb-1">Synopsis</label>
              <textarea
                name="synopsis"
                value={formData.synopsis}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-theme rounded-md bg-theme-card text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-accent resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 p-4 border-t border-theme">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-theme-muted hover:text-theme-primary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.title.trim()}
              className="px-4 py-2 bg-theme-accent text-theme-on-primary rounded-md bg-theme-accent-hover disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
