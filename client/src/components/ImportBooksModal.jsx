import { useState, useRef } from 'react';

export default function ImportBooksModal({ onImport, onClose, loading }) {
  const [parsedBooks, setParsedBooks] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [step, setStep] = useState('upload'); // 'upload' or 'preview'
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      try {
        const books = parseFile(file.name, content);
        if (books.length === 0) {
          setParseError('No valid book data found in file');
          return;
        }
        setParsedBooks(books);
        setStep('preview');
      } catch (err) {
        setParseError(err.message);
      }
    };
    reader.onerror = () => {
      setParseError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const parseFile = (filename, content) => {
    const ext = filename.toLowerCase().split('.').pop();

    if (ext === 'json') {
      return parseJSON(content);
    } else if (ext === 'csv') {
      return parseCSV(content);
    } else {
      throw new Error('Unsupported file format. Please use CSV or JSON.');
    }
  };

  const parseJSON = (content) => {
    const data = JSON.parse(content);
    const books = Array.isArray(data) ? data : [data];

    return books.map(normalizeBookData);
  };

  const parseCSV = (content) => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have a header row and at least one data row');
    }

    // Parse header
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

    // Find column indices
    const columnMap = {
      isbn: findColumnIndex(headers, ['isbn', 'isbn13', 'isbn10', 'isbn-13', 'isbn-10']),
      title: findColumnIndex(headers, ['title', 'book title', 'book_title', 'name']),
      author: findColumnIndex(headers, ['author', 'authors', 'book author', 'book_author', 'writer']),
      date_finished: findColumnIndex(headers, ['date_finished', 'date finished', 'date_completed', 'date completed', 'finished', 'completed', 'date read', 'date_read', 'read_at']),
      owned: findColumnIndex(headers, ['owned', 'in library', 'in_library', 'own', 'have'])
    };

    // Parse data rows
    const books = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || values.every(v => !v.trim())) continue;

      const book = {
        isbn: columnMap.isbn >= 0 ? values[columnMap.isbn]?.trim() : null,
        title: columnMap.title >= 0 ? values[columnMap.title]?.trim() : null,
        author: columnMap.author >= 0 ? values[columnMap.author]?.trim() : null,
        date_finished: columnMap.date_finished >= 0 ? parseDate(values[columnMap.date_finished]?.trim()) : null,
        owned: columnMap.owned >= 0 ? values[columnMap.owned]?.trim() : null
      };

      // Only add if we have at least title or ISBN
      if (book.title || book.isbn) {
        books.push(normalizeBookData(book));
      }
    }

    return books;
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  };

  const findColumnIndex = (headers, possibleNames) => {
    for (const name of possibleNames) {
      const index = headers.indexOf(name);
      if (index >= 0) return index;
    }
    return -1;
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;

    // Try various date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    // Try MM/DD/YYYY format
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      // Try MM/DD/YYYY
      let testDate = new Date(`${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`);
      if (!isNaN(testDate.getTime())) {
        return testDate.toISOString().split('T')[0];
      }
      // Try YYYY/MM/DD
      testDate = new Date(`${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`);
      if (!isNaN(testDate.getTime())) {
        return testDate.toISOString().split('T')[0];
      }
    }

    return null;
  };

  const normalizeBookData = (book) => {
    return {
      isbn: book.isbn || book.ISBN || book.isbn13 || book.ISBN13 || null,
      title: book.title || book.Title || book.book_title || null,
      author: book.author || book.Author || book.authors || book.book_author || null,
      date_finished: book.date_finished || book.date_completed || book.dateFinished || book.dateCompleted || null,
      owned: book.owned || book.Owned || book.in_library || null
    };
  };

  const handleImport = () => {
    onImport(parsedBooks);
  };

  const handleRemoveBook = (index) => {
    setParsedBooks(prev => prev.filter((_, i) => i !== index));
  };

  const handleBack = () => {
    setParsedBooks([]);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-theme-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <h2 className="text-xl font-semibold text-theme-primary">
            {step === 'upload' ? 'Import Completed Books' : 'Preview Import'}
          </h2>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-theme-muted">
                Upload a CSV or JSON file containing your completed books. The file should include columns for:
              </p>
              <ul className="text-sm text-theme-muted list-disc list-inside space-y-1">
                <li><strong>ISBN</strong> (optional) - ISBN-10 or ISBN-13</li>
                <li><strong>Title</strong> - Book title</li>
                <li><strong>Author</strong> - Author name</li>
                <li><strong>Date Finished</strong> (optional) - When you finished the book</li>
                <li><strong>Owned</strong> (optional) - Set to "yes" to also add to your library</li>
              </ul>

              <div className="border-2 border-dashed border-theme rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-theme-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-theme-primary font-medium mb-1">Click to upload a file</p>
                  <p className="text-theme-muted text-sm">CSV or JSON files supported</p>
                </label>
              </div>

              {parseError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {parseError}
                </div>
              )}

              <div className="bg-theme-secondary rounded-lg p-4">
                <h4 className="font-medium text-theme-primary mb-2">Example CSV format:</h4>
                <pre className="text-xs text-theme-muted overflow-x-auto">
{`isbn,title,author,date_finished,owned
9780545582889,The Hunger Games,Suzanne Collins,2023-05-15,yes
,Pride and Prejudice,Jane Austen,2023-06-01,no`}
                </pre>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-theme-muted">
                Found {parsedBooks.length} book(s) to import. Review the list below:
              </p>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {parsedBooks.map((book, index) => (
                  <div key={index} className="flex items-center justify-between bg-theme-secondary rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-theme-primary truncate">{book.title || 'Unknown Title'}</p>
                      <p className="text-sm text-theme-muted truncate">
                        {book.author || 'Unknown Author'}
                        {book.isbn && <span className="ml-2">ISBN: {book.isbn}</span>}
                      </p>
                      <div className="flex gap-2 mt-1 text-xs">
                        {book.date_finished && (
                          <span className="bg-theme-card px-2 py-0.5 rounded">
                            Finished: {book.date_finished}
                          </span>
                        )}
                        {book.owned?.toLowerCase() === 'yes' && (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            Add to Library
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveBook(index)}
                      className="ml-2 text-theme-muted hover:text-red-500"
                      title="Remove from import"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {parsedBooks.length === 0 && (
                <p className="text-center text-theme-muted py-4">No books to import</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-theme">
          {step === 'preview' && (
            <button
              onClick={handleBack}
              className="px-4 py-2 text-theme-muted hover:text-theme-primary"
              disabled={loading}
            >
              Back
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-theme-muted hover:text-theme-primary"
            disabled={loading}
          >
            Cancel
          </button>
          {step === 'preview' && parsedBooks.length > 0 && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="px-4 py-2 bg-theme-accent text-theme-on-primary rounded-md bg-theme-accent-hover disabled:opacity-50"
            >
              {loading ? 'Importing...' : `Import ${parsedBooks.length} Book(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
