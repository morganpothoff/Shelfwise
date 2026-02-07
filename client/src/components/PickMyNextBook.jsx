import { Link } from 'react-router-dom';
import Navbar from './Navbar';

const options = [
  {
    path: '/pick-my-next-book/pick-for-me',
    label: 'Pick for me',
    description: 'Let us randomly pick an unread book from your library. Feeling lucky?',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    path: '/pick-my-next-book/pick-a-number',
    label: 'Pick a number',
    description: 'Choose a number and let fate decide your next read.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
  },
  {
    path: '/pick-my-next-book/analyze-me',
    label: 'Analyze me',
    description: 'Get insights into your reading habits and personalized recommendations.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function PickMyNextBook() {
  return (
    <div className="min-h-screen bg-theme-primary">
      <Navbar />

      <main className="max-w-xl mx-auto py-12 px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Pick My Next Book</h1>
          <p className="text-theme-muted">Choose how you'd like to find your next read.</p>
        </div>

        <div className="space-y-4">
          {options.map((option) => (
            <Link
              key={option.path}
              to={option.path}
              className="flex items-center gap-5 bg-theme-card rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow border border-transparent hover:border-theme-accent group"
            >
              <div className="flex-shrink-0 w-14 h-14 bg-theme-accent/10 rounded-xl flex items-center justify-center text-theme-accent group-hover:bg-theme-accent group-hover:text-theme-on-primary transition-colors">
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-theme-primary">{option.label}</h2>
                <p className="text-sm text-theme-muted mt-0.5">{option.description}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-theme-muted flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
