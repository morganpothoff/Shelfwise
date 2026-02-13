import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import CompletedBookCard from './CompletedBookCard';
import CompletedBookListItem from './CompletedBookListItem';
import EditSeriesModal from './EditSeriesModal';
import ImportCompletedBooksModal from './ImportCompletedBooksModal';
import { getCompletedBooks, deleteCompletedBook, updateCompletedBook, exportCompletedBooks, addCompletedBookToLibrary } from '../services/api';

export default function BooksCompleted() {
  const { user, setViewMode: saveViewMode } = useAuth();
  const [books, setBooks] = useState([]);
  const [editingSeriesBook, setEditingSeriesBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(user?.viewMode || 'list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    if (user?.viewMode) {
      setViewMode(user.viewMode);
    }
  }, [user?.viewMode]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const data = await getCompletedBooks();
      setBooks(data);
    } catch (err) {
      console.error('Failed to load completed books:', err);
      setError('Failed to load completed books');
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return books;
    }

    const query = searchQuery.toLowerCase().trim();
    return books.filter(book => {
      const titleMatch = book.title?.toLowerCase().includes(query);
      const authorMatch = book.author?.toLowerCase().includes(query);
      const isbnMatch = book.isbn?.toLowerCase().includes(query);
      const seriesMatch = book.series_name?.toLowerCase().includes(query);
      return titleMatch || authorMatch || isbnMatch || seriesMatch;
    });
  }, [books, searchQuery]);

  const groupedBooks = useMemo(() => {
    const seriesMap = new Map();
    const standalone = [];

    filteredBooks.forEach(book => {
      if (book.series_name) {
        if (!seriesMap.has(book.series_name)) {
          seriesMap.set(book.series_name, []);
        }
        seriesMap.get(book.series_name).push(book);
      } else {
        standalone.push(book);
      }
    });

    seriesMap.forEach((seriesBooks) => {
      seriesBooks.sort((a, b) => {
        if (a.series_position == null && b.series_position == null) return 0;
        if (a.series_position == null) return 1;
        if (b.series_position == null) return -1;
        return a.series_position - b.series_position;
      });
    });

    const seriesArray = Array.from(seriesMap.entries())
      .map(([name, books]) => ({ name, books }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { series: seriesArray, standalone };
  }, [filteredBooks]);

  const handleDeleteBook = async (bookId) => {
    try {
      await deleteCompletedBook(bookId);
      setBooks(prev => prev.filter(book => book.id !== bookId));
      const isLibrary = typeof bookId === 'string' && bookId.startsWith('library_');
      setMessage(isLibrary ? 'Book marked as unread' : 'Book removed from completed books');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditSeries = (book) => {
    setEditingSeriesBook(book);
  };

  const handleSaveSeries = async (seriesData) => {
    try {
      const updatedBook = await updateCompletedBook(editingSeriesBook.id, seriesData);
      setBooks(prev => prev.map(book =>
        book.id === updatedBook.id ? updatedBook : book
      ));
      setEditingSeriesBook(null);
      setMessage('Series info updated');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddToLibrary = async (bookId) => {
    try {
      const result = await addCompletedBookToLibrary(bookId);
      // The completed book has been migrated to the library — replace in state with new library book
      const newBook = result.book;
      setBooks(prev => prev.map(book =>
        book.id === bookId ? newBook : book
      ));
      setMessage(`"${newBook.title}" added to your library!`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExport = async (type, format) => {
    setShowExportMenu(false);
    setExporting(true);
    setError(null);
    setMessage(null);

    try {
      await exportCompletedBooks(type, format);
      setMessage(`Completed books exported successfully (${type} ${format.toUpperCase()})`);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleImportComplete = (importedBooks, updatedLibraryBooks, newLibraryBooks) => {
    // Build success message
    const messages = [];
    if (importedBooks && importedBooks.length > 0) {
      messages.push(`${importedBooks.length} completed books imported`);
    }
    if (updatedLibraryBooks && updatedLibraryBooks.length > 0) {
      messages.push(`${updatedLibraryBooks.length} library books marked as read`);
    }
    if (newLibraryBooks && newLibraryBooks.length > 0) {
      messages.push(`${newLibraryBooks.length} owned books added to library`);
    }

    if (messages.length > 0) {
      setMessage(`Success! ${messages.join(', ')}`);
    }

    // Reload the unified list to include all sources
    loadBooks();
  };

  const renderGridView = () => (
    <div className="space-y-8">
      {groupedBooks.series.map(series => (
        <div key={series.name} className="bg-theme-card rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-theme-series mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            {series.name} Series
            <span className="text-sm font-normal text-theme-muted">({series.books.length} books)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {series.books.map(book => (
              <CompletedBookCard
                key={book.id}
                book={book}
                onDelete={handleDeleteBook}
                onEditSeries={handleEditSeries}
                onAddToLibrary={handleAddToLibrary}
                showSeriesPosition
              />
            ))}
          </div>
        </div>
      ))}

      {groupedBooks.standalone.length > 0 && (
        <div>
          {groupedBooks.series.length > 0 && (
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Standalone Books</h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedBooks.standalone.map(book => (
              <CompletedBookCard
                key={book.id}
                book={book}
                onDelete={handleDeleteBook}
                onEditSeries={handleEditSeries}
                onAddToLibrary={handleAddToLibrary}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-6">
      {groupedBooks.series.map(series => (
        <div key={series.name} className="bg-theme-card rounded-lg shadow overflow-hidden">
          <div className="bg-theme-series px-4 py-2 border-b border-theme">
            <h3 className="font-semibold text-theme-series flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              {series.name} Series
              <span className="text-sm font-normal text-theme-muted">({series.books.length} books)</span>
            </h3>
          </div>
          {series.books.map(book => (
            <CompletedBookListItem
              key={book.id}
              book={book}
              onDelete={handleDeleteBook}
              onEditSeries={handleEditSeries}
              onAddToLibrary={handleAddToLibrary}
              showSeriesPosition
            />
          ))}
        </div>
      ))}

      {groupedBooks.standalone.length > 0 && (
        <div className="bg-theme-card rounded-lg shadow overflow-hidden">
          {groupedBooks.series.length > 0 && (
            <div className="bg-theme-secondary px-4 py-2 border-b border-theme">
              <h3 className="font-semibold text-theme-primary">Standalone Books</h3>
            </div>
          )}
          {groupedBooks.standalone.map(book => (
            <CompletedBookListItem
              key={book.id}
              book={book}
              onDelete={handleDeleteBook}
              onEditSeries={handleEditSeries}
              onAddToLibrary={handleAddToLibrary}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-theme-primary">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 px-4">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-theme-accent bg-theme-accent-hover text-theme-on-primary px-4 py-2 rounded-md transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Import Books Read
          </button>
        </div>

        {/* Search bar */}
        {books.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-theme-muted" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, author, ISBN, or series..."
                className="block w-full pl-10 pr-10 py-2 border border-theme rounded-md bg-theme-card text-theme-primary placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-theme-muted hover:text-theme-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-theme-muted">
                Found {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'} matching "{searchQuery}"
              </p>
            )}
          </div>
        )}

        {/* Status messages */}
        {loading && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6">
            Loading completed books...
          </div>
        )}

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Book section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-theme-primary">
              Books Completed ({searchQuery ? `${filteredBooks.length} of ${books.length}` : books.length} books)
            </h2>

            <div className="flex items-center gap-3">
              {/* Export dropdown */}
              {books.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={exporting}
                    className="flex items-center gap-2 px-3 py-2 bg-theme-card rounded-md shadow-sm text-theme-primary hover:bg-theme-secondary transition-colors disabled:opacity-50"
                    title="Export completed books"
                  >
                    {exporting ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="text-sm font-medium">Export</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {showExportMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowExportMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-theme-card rounded-md shadow-lg border border-theme z-20">
                        <div className="p-2">
                          <p className="px-3 py-2 text-xs font-semibold text-theme-muted uppercase tracking-wider">
                            Comprehensive Export
                          </p>
                          <p className="px-3 pb-2 text-xs text-theme-muted">
                            All book data including synopsis, genre, tags, and dates
                          </p>
                          <button
                            onClick={() => handleExport('comprehensive', 'json')}
                            className="w-full text-left px-3 py-2 text-sm text-theme-primary hover:bg-theme-secondary rounded-md flex items-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-theme-muted" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            Export as JSON
                          </button>
                          <button
                            onClick={() => handleExport('comprehensive', 'csv')}
                            className="w-full text-left px-3 py-2 text-sm text-theme-primary hover:bg-theme-secondary rounded-md flex items-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-theme-muted" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                            </svg>
                            Export as CSV
                          </button>
                        </div>

                        <div className="border-t border-theme p-2">
                          <p className="px-3 py-2 text-xs font-semibold text-theme-muted uppercase tracking-wider">
                            Minimal Export
                          </p>
                          <p className="px-3 pb-2 text-xs text-theme-muted">
                            ISBN, title, author, series, date finished, and owned status
                          </p>
                          <button
                            onClick={() => handleExport('minimal', 'json')}
                            className="w-full text-left px-3 py-2 text-sm text-theme-primary hover:bg-theme-secondary rounded-md flex items-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-theme-muted" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            Export as JSON
                          </button>
                          <button
                            onClick={() => handleExport('minimal', 'csv')}
                            className="w-full text-left px-3 py-2 text-sm text-theme-primary hover:bg-theme-secondary rounded-md flex items-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-theme-muted" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                            </svg>
                            Export as CSV
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* View toggle */}
              <div className="flex items-center gap-1 bg-theme-card rounded-md shadow-sm p-1">
                <button
                  onClick={() => {
                    setViewMode('grid');
                    saveViewMode('grid');
                  }}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-theme-secondary text-theme-secondary' : 'text-theme-muted hover:text-theme-primary'}`}
                  title="Grid view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setViewMode('list');
                    saveViewMode('list');
                  }}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-theme-secondary text-theme-secondary' : 'text-theme-muted hover:text-theme-primary'}`}
                  title="List view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {!loading && books.length === 0 ? (
            <div className="text-center py-12 bg-theme-card rounded-lg shadow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-theme-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-theme-primary mb-2 font-medium">No completed books yet</p>
              <p className="text-theme-muted">Import a list of books you've read to get started</p>
            </div>
          ) : filteredBooks.length === 0 && searchQuery ? (
            <div className="text-center py-12 bg-theme-card rounded-lg shadow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-theme-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-theme-primary mb-2 font-medium">No books found</p>
              <p className="text-theme-muted">No books match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-theme-accent hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            renderGridView()
          ) : (
            renderListView()
          )}
        </section>
      </main>

      {/* Modals */}
      {editingSeriesBook && (
        <EditSeriesModal
          book={editingSeriesBook}
          onSave={handleSaveSeries}
          onClose={() => setEditingSeriesBook(null)}
        />
      )}

      {showImportModal && (
        <ImportCompletedBooksModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
}
