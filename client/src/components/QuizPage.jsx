import { Link } from 'react-router-dom';
import Navbar from './Navbar';

export default function QuizPage() {
  return (
    <div className="min-h-screen bg-theme-gradient">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          {/* Coming Soon Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-theme-accent/10 rounded-full mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-theme-primary mb-4">Find My Next Read</h1>
          <p className="text-xl text-theme-muted mb-8 max-w-2xl mx-auto">
            A personalized book recommendation quiz is coming soon! Answer a few questions about your mood, preferences, and reading history, and we'll suggest the perfect book from your library.
          </p>

          {/* Feature Preview Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 text-left">
            <div className="bg-theme-card rounded-xl shadow-md p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">Mood-Based Picks</h3>
              <p className="text-theme-muted text-sm">
                Feeling adventurous? Need something cozy? Tell us your mood and we'll match you with the right book.
              </p>
            </div>

            <div className="bg-theme-card rounded-xl shadow-md p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">Time-Aware</h3>
              <p className="text-theme-muted text-sm">
                Short on time? We'll recommend based on book length and your available reading time.
              </p>
            </div>

            <div className="bg-theme-card rounded-xl shadow-md p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">From Your Library</h3>
              <p className="text-theme-muted text-sm">
                Recommendations are pulled directly from your personal collection—books you already own but haven't read yet.
              </p>
            </div>
          </div>

          {/* Notification Sign-up (placeholder) */}
          <div className="bg-theme-card rounded-xl shadow-md p-8 max-w-lg mx-auto">
            <h3 className="text-lg font-semibold text-theme-primary mb-2">Want to be notified?</h3>
            <p className="text-theme-muted mb-4 text-sm">
              This feature is under development. Check back soon!
            </p>
            <Link
              to="/"
              className="inline-block py-3 px-6 bg-theme-accent bg-theme-accent-hover text-theme-on-primary font-semibold rounded-lg transition"
            >
              Back to My Library
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
