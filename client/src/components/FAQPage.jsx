import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

const faqs = [
  {
    category: 'Account',
    questions: [
      {
        question: 'How do I reset my password?',
        answer: `If you've forgotten your password, click "Forgot password?" on the login page. Enter your email address, and we'll send you a link to reset your password. The link expires after 1 hour for security. If you don't receive the email, check your spam folder.`
      },
      {
        question: 'How do I change my email address?',
        answer: `Go to your Profile page by clicking your name or the profile icon in the top right. Under "Email Address", enter your new email and your current password for verification, then click "Update Email". You'll need to use the new email to log in.`
      },
      {
        question: 'How do I change my display name?',
        answer: `Go to your Profile page and update your name in the "Display Name" section. Click "Update Name" to save the change.`
      },
      {
        question: 'What does "Remember me" do?',
        answer: `When you check "Remember me" during login, your session will last for 7 days instead of 1 hour. This means you won't have to log in again for a week, even if you close your browser.`
      },
      {
        question: 'How do I delete my account?',
        answer: `Account deletion is not currently available through the interface. Contact the administrator if you need your account removed.`
      }
    ]
  },
  {
    category: 'Adding Books',
    questions: [
      {
        question: 'How do I add a book to my library?',
        answer: `There are three ways to add books: 1) Scan the barcode using your device's camera, 2) Enter the ISBN number manually, or 3) Search by title and author if no ISBN is available.`
      },
      {
        question: 'Why isn\'t my book being found by ISBN?',
        answer: `Some books, especially special editions (Fairyloot, Illumicrate, collector's editions), may not be in public databases. Try using the manual entry option to add the book by title and author instead.`
      },
      {
        question: 'The barcode scanner isn\'t working. What should I do?',
        answer: `Make sure you've allowed camera access in your browser. Try using Chrome if you're on a different browser. Ensure the barcode is well-lit and clearly visible. If scanning still doesn't work, use the manual ISBN entry option.`
      },
      {
        question: 'Can I add a book that doesn\'t have an ISBN?',
        answer: `Yes! Use the "Enter ISBN" button, then when prompted, click the option to add manually by title and author.`
      }
    ]
  },
  {
    category: 'Managing Your Library',
    questions: [
      {
        question: 'How do I view more details about a book?',
        answer: `Click on any book's title in your library to open its detailed profile page. The book profile shows all information including the full synopsis, tags, series information, and more.`
      },
      {
        question: 'How do I rate a book?',
        answer: `Open the book's profile page by clicking on its title, then scroll down to the "Your Rating" section. Click "Add Rating" to give the book 1-5 stars and optionally add comments about your thoughts on the book. You can edit or delete your rating at any time.`
      },
      {
        question: 'How do I mark a book as read?',
        answer: `Open the book's profile page by clicking on its title, then look for the "Reading Status" section. You can set the status to "Unread", "Reading", or "Read". When marking a book as read, you can optionally add the date you finished it.`
      },
      {
        question: 'How do I delete a book from my library?',
        answer: `Hover over the book you want to remove and click the trash icon that appears. The book will be permanently removed from your library.`
      },
      {
        question: 'How do I edit a book\'s series information?',
        answer: `Click the book icon on any book to open the series editor. You can change the series name and book number, or remove the book from a series entirely.`
      },
      {
        question: 'Why are my books grouped incorrectly by series?',
        answer: `Series detection is automatic and sometimes makes mistakes. You can manually correct any book's series information by clicking the book icon on the book card.`
      },
      {
        question: 'Can I switch between grid and list view?',
        answer: `Yes! Use the toggle button in the top right corner of your library to switch between Grid view (shows cover art) and List view (compact text format).`
      }
    ]
  },
  {
    category: 'Import & Export',
    questions: [
      {
        question: 'How do I import books from another app or spreadsheet?',
        answer: `Click the "Import Books" button on your library page. You can import books from JSON, CSV, or Excel (.xlsx/.xls) files. The import process has three steps:

1. Upload your file - drag and drop or browse to select
2. Shelfwise searches for each book by title and author to find its ISBN, then fetches full metadata (synopsis, page count, series info) - just like when you scan a book
3. Review the results - books found are imported with complete metadata, while books that couldn't be found can be added with only basic info from your file or skipped

You can also export a list of skipped books for later reference.`
      },
      {
        question: 'What file formats are supported for import?',
        answer: `Shelfwise supports three import formats:
• JSON - Either an array of books or an object with a "books" array
• CSV - Comma-separated values with a header row
• Excel - Both .xlsx and .xls formats are supported`
      },
      {
        question: 'What fields can I include in my import file?',
        answer: `Your import file should include at least a "title" field. Other recognized fields include:
• title (or book_title, name)
• author (or authors, book_author)
• isbn (or isbn13, isbn_13, isbn10, isbn_10)
• page_count (or pages, num_pages, number_of_pages)
• genre (or genres, category)
• synopsis (or description, summary)
• tags - comma or semicolon separated
• series_name (or series)
• series_position (or series_number, book_number)
• reading_status - "read", "reading", or "unread"
• date_finished (or date_read, finished_date, read_date, date_completed)`
      },
      {
        question: 'Can I import my reading history with dates?',
        answer: `Yes! Include a "reading_status" column set to "read" and a "date_finished" column with the date you finished reading. Dates can be in most common formats (YYYY-MM-DD, MM/DD/YYYY, etc.). If you include a date_finished without setting reading_status, the book will automatically be marked as "read".`
      },
      {
        question: 'What happens to duplicate books during import?',
        answer: `Shelfwise checks for duplicates by ISBN OR by matching title and author. If a book in your import file matches an existing book in your library (by either method), it will be skipped. The same applies if the ISBN lookup finds a book that's already in your library. You can see which books are duplicates in the review screen.`
      },
      {
        question: 'What if some books aren\'t found during import?',
        answer: `During the review step, you'll see a list of books where no ISBN could be found. For each one, you can choose to:
• Add it anyway - The book will be added with ONLY the basic info from your import file (title, author, etc.) without additional metadata
• Skip it - The book won't be imported

You can use "Add all" or "Skip all" to quickly process the entire list. There's also an "Export Skipped" button to download a CSV of all skipped books so you can track what wasn't imported.`
      },
      {
        question: 'How do I export my library?',
        answer: `Click the "Export" button next to the view toggle in your library. You can choose between two export types:
• Comprehensive - Includes all book data (synopsis, tags, genres, reading status, dates)
• Minimal - Just ISBN, title, author, and series info

Both types can be exported as JSON or CSV files.`
      },
      {
        question: 'Can I import from Goodreads?',
        answer: `Yes! Export your Goodreads library as a CSV file, then import it into Shelfwise. The importer recognizes common Goodreads field names like "Title", "Author", "ISBN13", and "Date Read". Note that you may need to adjust some fields manually after import.`
      }
    ]
  },
  {
    category: 'Technical',
    questions: [
      {
        question: 'Where is my data stored?',
        answer: `All your data is stored locally on the server running Shelfwise, in a SQLite database. Your book collection and account information never leave your server.`
      },
      {
        question: 'Can I access Shelfwise from my phone?',
        answer: `Yes! Shelfwise is mobile-friendly. Access it from any device on your network using the server's IP address and port (e.g., http://192.168.1.100:3000).`
      },
      {
        question: 'How do I back up my library?',
        answer: `Your library is stored in the file "server/db/shelfwise.db". Copy this file to create a backup. To restore, replace the database file with your backup.`
      },
      {
        question: 'I\'m getting "Session expired" errors. What should I do?',
        answer: `This means your login session has ended. Simply log in again. If you want longer sessions, check the "Remember me" box when logging in.`
      }
    ]
  }
];

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-theme last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 px-4 flex items-center justify-between text-left hover:bg-theme-accent/5 transition-colors"
      >
        <span className="font-medium text-theme-primary pr-4">{question}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 text-theme-muted flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-theme-muted">
          <p className="whitespace-pre-line">{answer}</p>
        </div>
      )}
    </div>
  );
}

function FAQCategory({ category, questions }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-theme-primary mb-4">{category}</h2>
      <div className="bg-theme-card rounded-xl shadow-md overflow-hidden">
        {questions.map((faq, index) => (
          <FAQItem key={index} question={faq.question} answer={faq.answer} />
        ))}
      </div>
    </div>
  );
}

export default function FAQPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-theme-gradient">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Frequently Asked Questions</h1>
          <p className="text-theme-muted">Find answers to common questions about using Shelfwise</p>
        </div>

        {faqs.map((category, index) => (
          <FAQCategory key={index} category={category.category} questions={category.questions} />
        ))}

        {/* Contact Section */}
        <div className="mt-12 text-center">
          <div className="bg-theme-card rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-theme-primary mb-2">Still have questions?</h3>
            <p className="text-theme-muted">
              If you couldn't find the answer you were looking for, check out the README file in the project repository or open an issue on GitHub.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
