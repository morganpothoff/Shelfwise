import { Link } from 'react-router-dom';
import Navbar from './Navbar';

export default function PickANumber() {
  return (
    <div className="min-h-screen bg-theme-primary">
      <Navbar />
      <main className="max-w-4xl mx-auto py-12 px-4">
        {/* Back link */}
        <Link
          to="/pick-my-next-book"
          className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme-accent transition-colors mb-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Pick My Next Book
        </Link>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-theme-accent/10 rounded-full mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-theme-primary mb-4">Pick a Number</h1>
          <p className="text-lg text-theme-muted max-w-md mx-auto">
            This feature is coming soon. Pick a number and let fate decide your next read!
          </p>
        </div>
      </main>
    </div>
  );
}
