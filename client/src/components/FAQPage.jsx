import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
      {/* Header */}
      <header className="bg-theme-card shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={isAuthenticated ? '/' : '/login'} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-theme-accent rounded-xl flex items-center justify-center shadow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-theme-on-primary" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-theme-primary">Shelfwise</h1>
          </Link>
          <Link
            to={isAuthenticated ? '/' : '/login'}
            className="text-theme-secondary hover:text-theme-primary transition-colors"
          >
            {isAuthenticated ? 'Back to Library' : 'Sign In'}
          </Link>
        </div>
      </header>

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
            <p className="text-theme-muted mb-4">
              If you couldn't find the answer you were looking for, check out the README file in the project repository or open an issue on GitHub.
            </p>
            <Link
              to={isAuthenticated ? '/' : '/login'}
              className="inline-block py-2 px-6 bg-theme-accent bg-theme-accent-hover text-theme-on-primary font-semibold rounded-lg transition"
            >
              {isAuthenticated ? 'Back to Library' : 'Go to Login'}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
