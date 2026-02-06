import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { parseCompletedBooksImport, confirmCompletedBooksImport, downloadAsFile } from '../services/api';

// Steps: upload -> parsing -> review -> importing -> done
const STEPS = {
  UPLOAD: 'upload',
  PARSING: 'parsing',
  REVIEW: 'review',
  IMPORTING: 'importing',
  DONE: 'done'
};

export default function ImportCompletedBooksModal({ onClose, onImportComplete }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Parse results
  const [parseResults, setParseResults] = useState(null);

  // User selections for not-found books
  const [notFoundSelections, setNotFoundSelections] = useState({});

  // User selections for library updates
  const [libraryUpdateSelections, setLibraryUpdateSelections] = useState({});

  // Final import results
  const [importResults, setImportResults] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    const validExtensions = ['.json', '.csv', '.xlsx', '.xls'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(ext)) {
      setError('Please select a JSON, CSV, or Excel (.xlsx/.xls) file');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleParse = async () => {
    if (!selectedFile) return;

    setStep(STEPS.PARSING);
    setError(null);

    try {
      const results = await parseCompletedBooksImport(selectedFile);
      setParseResults(results);

      // Initialize selections for not-found books (default to skip)
      const notFoundSel = {};
      results.results.notFound.forEach((book, index) => {
        notFoundSel[index] = false;
      });
      setNotFoundSelections(notFoundSel);

      // Initialize selections for library updates (default to update)
      const librarySel = {};
      results.results.libraryUpdates.forEach((update, index) => {
        librarySel[index] = true;
      });
      setLibraryUpdateSelections(librarySel);

      setStep(STEPS.REVIEW);
    } catch (err) {
      setError(err.message);
      setStep(STEPS.UPLOAD);
    }
  };

  const handleToggleNotFound = (index) => {
    setNotFoundSelections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleToggleLibraryUpdate = (index) => {
    setLibraryUpdateSelections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSelectAllNotFound = (select) => {
    const selections = {};
    parseResults.results.notFound.forEach((_, index) => {
      selections[index] = select;
    });
    setNotFoundSelections(selections);
  };

  const handleSelectAllLibraryUpdates = (select) => {
    const selections = {};
    parseResults.results.libraryUpdates.forEach((_, index) => {
      selections[index] = select;
    });
    setLibraryUpdateSelections(selections);
  };

  const handleImport = async () => {
    setStep(STEPS.IMPORTING);
    setError(null);

    try {
      // Collect all books to import
      const booksToImport = [];

      // Add all found books (with lookup data)
      parseResults.results.found.forEach(item => {
        booksToImport.push(item.lookup);
      });

      // Add selected not-found books (with fallback data)
      parseResults.results.notFound.forEach((item, index) => {
        if (notFoundSelections[index]) {
          booksToImport.push(item.fallback);
        }
      });

      // Collect library updates
      const libraryUpdates = [];
      parseResults.results.libraryUpdates.forEach((item, index) => {
        if (libraryUpdateSelections[index]) {
          libraryUpdates.push(item);
        }
      });

      if (booksToImport.length === 0 && libraryUpdates.length === 0) {
        setError('No books selected for import or update');
        setStep(STEPS.REVIEW);
        return;
      }

      const results = await confirmCompletedBooksImport(booksToImport, libraryUpdates);
      setImportResults(results);
      setStep(STEPS.DONE);

      if (results.imported > 0 || results.updated > 0 || results.addedToLibrary > 0) {
        onImportComplete(results.books, results.updatedLibraryBooks, results.newLibraryBooks);
      }
    } catch (err) {
      setError(err.message);
      setStep(STEPS.REVIEW);
    }
  };

  const handleExportSkipped = () => {
    const skippedBooks = [];

    // Add not-found books that weren't selected
    parseResults.results.notFound.forEach((item, index) => {
      if (!notFoundSelections[index]) {
        skippedBooks.push({
          title: item.original.title,
          author: item.original.author,
          isbn: item.original.isbn,
          reason: 'ISBN not found - user skipped'
        });
      }
    });

    // Add duplicates
    parseResults.results.duplicates.forEach(item => {
      skippedBooks.push({
        title: item.original.title,
        author: item.original.author,
        isbn: item.original.isbn,
        reason: 'Duplicate - already in completed books'
      });
    });

    // Add invalid entries
    parseResults.results.invalid.forEach(item => {
      skippedBooks.push({
        title: item.original?.title || 'Unknown',
        author: item.original?.author || '',
        reason: item.reason
      });
    });

    const csv = [
      'Title,Author,ISBN,Reason',
      ...skippedBooks.map(b =>
        `"${(b.title || '').replace(/"/g, '""')}","${(b.author || '').replace(/"/g, '""')}","${b.isbn || ''}","${b.reason}"`
      )
    ].join('\n');

    downloadAsFile(csv, `skipped-completed-books-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  const getSelectedNotFoundCount = () => {
    return Object.values(notFoundSelections).filter(Boolean).length;
  };

  const getSelectedLibraryUpdateCount = () => {
    return Object.values(libraryUpdateSelections).filter(Boolean).length;
  };

  const getTotalToImport = () => {
    return (parseResults?.results.found.length || 0) + getSelectedNotFoundCount();
  };

  const renderUploadStep = () => (
    <>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-theme-accent bg-theme-accent/10'
            : 'border-theme hover:border-theme-accent/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv,.xlsx,.xls"
          onChange={handleInputChange}
          className="hidden"
        />

        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-theme-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>

        {selectedFile ? (
          <div>
            <p className="text-theme-primary font-medium">{selectedFile.name}</p>
            <p className="text-sm text-theme-muted mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
            <button
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-sm text-theme-accent hover:underline mt-2"
            >
              Choose a different file
            </button>
          </div>
        ) : (
          <div>
            <p className="text-theme-primary mb-2">
              Drag and drop your file here, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-theme-accent hover:underline"
              >
                browse
              </button>
            </p>
            <p className="text-sm text-theme-muted">
              Supports JSON, CSV, and Excel (.xlsx, .xls) files
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-theme-secondary rounded-lg">
        <p className="text-xs text-theme-muted">
          Import books you've read. If a book is already in your library, it will be marked as read.
          Include an "owned" column with "yes" to add books to your library.
        </p>
        <p className="text-xs text-theme-muted mt-2">
          <Link to="/faq" className="text-theme-accent hover:underline" onClick={onClose}>
            See the FAQ
          </Link>
          {' '}for detailed import instructions.
        </p>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-theme rounded-md text-theme-primary hover:bg-theme-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleParse}
          disabled={!selectedFile}
          className="flex-1 px-4 py-2 bg-theme-accent bg-theme-accent-hover text-theme-on-primary rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </>
  );

  const renderParsingStep = () => (
    <div className="text-center py-8">
      <svg className="animate-spin h-12 w-12 text-theme-accent mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="text-theme-primary font-medium">Parsing file and looking up books...</p>
      <p className="text-sm text-theme-muted mt-2">This may take a moment for larger files</p>
    </div>
  );

  const renderReviewStep = () => (
    <>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <p className="text-2xl font-bold text-green-700">{parseResults.found}</p>
          <p className="text-sm text-green-600">Found with metadata</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <p className="text-2xl font-bold text-yellow-700">{parseResults.notFound}</p>
          <p className="text-sm text-yellow-600">Need review</p>
        </div>
        {parseResults.libraryUpdates > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-2xl font-bold text-blue-700">{parseResults.libraryUpdates}</p>
            <p className="text-sm text-blue-600">In library (will update)</p>
          </div>
        )}
        {parseResults.duplicates > 0 && (
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-gray-700">{parseResults.duplicates}</p>
            <p className="text-sm text-gray-600">Already completed (skipped)</p>
          </div>
        )}
        {parseResults.invalid > 0 && (
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <p className="text-2xl font-bold text-red-700">{parseResults.invalid}</p>
            <p className="text-sm text-red-600">Invalid (skipped)</p>
          </div>
        )}
      </div>

      {/* Library updates - books already in library that will be marked as read */}
      {parseResults.results.libraryUpdates.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-theme-primary text-blue-800">
              Library Books to Update ({parseResults.results.libraryUpdates.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleSelectAllLibraryUpdates(true)}
                className="text-xs text-theme-accent hover:underline"
              >
                Update all
              </button>
              <span className="text-theme-muted">|</span>
              <button
                onClick={() => handleSelectAllLibraryUpdates(false)}
                className="text-xs text-theme-accent hover:underline"
              >
                Skip all
              </button>
            </div>
          </div>
          <p className="text-xs text-theme-muted mb-2">
            These books are already in your library and will be marked as read with the date (if provided).
          </p>
          <div className="max-h-40 overflow-y-auto border border-blue-200 rounded-lg bg-blue-50">
            {parseResults.results.libraryUpdates.map((item, index) => (
              <label
                key={index}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-blue-100 border-b border-blue-100 last:border-b-0 ${
                  libraryUpdateSelections[index] ? 'bg-blue-100' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={libraryUpdateSelections[index] || false}
                  onChange={() => handleToggleLibraryUpdate(index)}
                  className="w-4 h-4 text-theme-accent rounded border-theme focus:ring-theme-accent"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-blue-900 truncate">{item.libraryTitle}</p>
                  {item.newDateFinished && (
                    <p className="text-xs text-blue-700">Date finished: {item.newDateFinished}</p>
                  )}
                  {item.currentStatus === 'read' && (
                    <p className="text-xs text-blue-600">Already marked as read</p>
                  )}
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-theme-muted mt-2">
            {getSelectedLibraryUpdateCount()} of {parseResults.results.libraryUpdates.length} selected to update
          </p>
        </div>
      )}

      {/* Found books - show list with series info */}
      {parseResults.results.found.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-theme-primary text-green-800">
              Books Found ({parseResults.results.found.length})
            </h3>
          </div>
          <p className="text-xs text-theme-muted mb-2">
            ISBN found—these books will be added with full metadata.
          </p>
          <details className="bg-green-50 border border-green-200 rounded-lg">
            <summary className="p-3 cursor-pointer text-sm text-green-800 hover:bg-green-100 rounded-lg">
              Show {parseResults.results.found.length} books to add
            </summary>
            <div className="max-h-40 overflow-y-auto border-t border-green-200">
              {parseResults.results.found.map((item, index) => (
                <div key={index} className="p-2 border-b border-green-100 last:border-b-0 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-900">{item.lookup.title}</span>
                    {item.lookup.series_name && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        {item.lookup.series_name}
                        {item.lookup.series_position && ` #${item.lookup.series_position}`}
                      </span>
                    )}
                    {item.lookup.owned && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        Owned
                      </span>
                    )}
                  </div>
                  {item.lookup.author && (
                    <p className="text-xs text-green-700">by {item.lookup.author}</p>
                  )}
                  {item.lookup.date_finished && (
                    <p className="text-xs text-green-600">Finished: {item.lookup.date_finished}</p>
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Not found books - need user decision */}
      {parseResults.results.notFound.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-theme-primary">Books Not Found ({parseResults.results.notFound.length})</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleSelectAllNotFound(true)}
                className="text-xs text-theme-accent hover:underline"
              >
                Add all
              </button>
              <span className="text-theme-muted">|</span>
              <button
                onClick={() => handleSelectAllNotFound(false)}
                className="text-xs text-theme-accent hover:underline"
              >
                Skip all
              </button>
            </div>
          </div>
          <p className="text-xs text-theme-muted mb-3">
            No ISBN found for these books. Select which ones to add with only the basic info from your file.
          </p>
          <div className="max-h-48 overflow-y-auto border border-theme rounded-lg">
            {parseResults.results.notFound.map((item, index) => (
              <label
                key={index}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-theme-secondary border-b border-theme last:border-b-0 ${
                  notFoundSelections[index] ? 'bg-theme-accent/5' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={notFoundSelections[index] || false}
                  onChange={() => handleToggleNotFound(index)}
                  className="w-4 h-4 text-theme-accent rounded border-theme focus:ring-theme-accent"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-theme-primary truncate">{item.original.title}</p>
                    {item.fallback.series_name && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex-shrink-0">
                        {item.fallback.series_name}
                        {item.fallback.series_position && ` #${item.fallback.series_position}`}
                      </span>
                    )}
                    {item.fallback.owned && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex-shrink-0">
                        Owned
                      </span>
                    )}
                  </div>
                  {item.original.author && (
                    <p className="text-sm text-theme-muted truncate">by {item.original.author}</p>
                  )}
                  {item.fallback.date_finished && (
                    <p className="text-xs text-theme-muted">Finished: {item.fallback.date_finished}</p>
                  )}
                </div>
                {item.original.isbn && (
                  <span className="text-xs text-theme-muted bg-theme-secondary px-2 py-0.5 rounded flex-shrink-0">
                    {item.original.isbn}
                  </span>
                )}
              </label>
            ))}
          </div>
          <p className="text-xs text-theme-muted mt-2">
            {getSelectedNotFoundCount()} of {parseResults.results.notFound.length} selected to add
          </p>
        </div>
      )}

      {/* Duplicates info */}
      {parseResults.results.duplicates.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700 mb-2">
            <span className="font-medium">{parseResults.results.duplicates.length} duplicate books</span> already in your completed books will be skipped.
          </p>
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">Show duplicates</summary>
            <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {parseResults.results.duplicates.map((item, index) => (
                <li key={index} className="text-gray-600">
                  {item.original.title} {item.original.author && `by ${item.original.author}`}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Import summary */}
      <div className="p-3 bg-theme-secondary rounded-lg mb-4">
        <p className="text-sm text-theme-primary">
          Ready to add <span className="font-bold">{getTotalToImport()} completed books</span>
          {getSelectedLibraryUpdateCount() > 0 && (
            <> and update <span className="font-bold">{getSelectedLibraryUpdateCount()} library books</span></>
          )}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            setStep(STEPS.UPLOAD);
            setParseResults(null);
            setError(null);
          }}
          className="px-4 py-2 border border-theme rounded-md text-theme-primary hover:bg-theme-secondary"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleExportSkipped}
          disabled={parseResults.results.notFound.length === 0 && parseResults.results.duplicates.length === 0}
          className="px-4 py-2 border border-theme rounded-md text-theme-primary hover:bg-theme-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export skipped books as CSV"
        >
          Export Skipped
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={getTotalToImport() === 0 && getSelectedLibraryUpdateCount() === 0}
          className="flex-1 px-4 py-2 bg-theme-accent bg-theme-accent-hover text-theme-on-primary rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Import
        </button>
      </div>
    </>
  );

  const renderImportingStep = () => (
    <div className="text-center py-8">
      <svg className="animate-spin h-12 w-12 text-theme-accent mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="text-theme-primary font-medium">Importing completed books...</p>
      <p className="text-sm text-theme-muted mt-2">Adding books to your completed list</p>
    </div>
  );

  const renderDoneStep = () => {
    const hasSuccess = importResults.imported > 0 || importResults.updated > 0 || importResults.addedToLibrary > 0;

    return (
      <div>
        <div className={`p-4 rounded-lg mb-4 ${
          hasSuccess ? 'bg-green-100 border border-green-400' : 'bg-yellow-100 border border-yellow-400'
        }`}>
          <div className="flex items-center gap-3">
            {hasSuccess ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <div>
              <p className={`font-medium ${hasSuccess ? 'text-green-800' : 'text-yellow-800'}`}>
                {importResults.message}
              </p>
            </div>
          </div>
        </div>

        {/* Show books added to library */}
        {importResults.addedToLibrary > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">{importResults.addedToLibrary} owned books</span> were also added to your library.
            </p>
          </div>
        )}

        {importResults.errors && importResults.errors.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-theme-primary mb-2">Import Notes:</h3>
            <div className="max-h-32 overflow-y-auto bg-theme-secondary rounded-md p-3">
              {importResults.errors.map((err, index) => (
                <p key={index} className="text-xs text-theme-muted py-0.5">
                  {err}
                </p>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-2 bg-theme-accent bg-theme-accent-hover text-theme-on-primary rounded-md"
        >
          Done
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-theme-primary">
            {step === STEPS.UPLOAD && 'Import Completed Books'}
            {step === STEPS.PARSING && 'Processing...'}
            {step === STEPS.REVIEW && 'Review Import'}
            {step === STEPS.IMPORTING && 'Importing...'}
            {step === STEPS.DONE && 'Import Complete'}
          </h2>
          {(step === STEPS.UPLOAD || step === STEPS.REVIEW || step === STEPS.DONE) && (
            <button
              onClick={onClose}
              className="text-theme-muted hover:text-theme-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {step === STEPS.UPLOAD && renderUploadStep()}
        {step === STEPS.PARSING && renderParsingStep()}
        {step === STEPS.REVIEW && renderReviewStep()}
        {step === STEPS.IMPORTING && renderImportingStep()}
        {step === STEPS.DONE && renderDoneStep()}
      </div>
    </div>
  );
}
