import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UserProfile() {
  const { user, updateProfile, setTheme } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    const result = await updateProfile({ name, email });

    if (result.success) {
      setMessage('Profile updated successfully');
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }

  async function handleThemeChange(theme) {
    const result = await setTheme(theme);
    if (!result.success) {
      setError(result.error);
    }
  }

  const themes = [
    {
      id: 'purple',
      name: 'Purple Dream',
      description: 'Elegant purple tones',
      preview: {
        bg: 'bg-purple-100',
        accent: 'bg-purple-600',
      }
    },
    {
      id: 'light',
      name: 'Clean White',
      description: 'Minimal and clean',
      preview: {
        bg: 'bg-slate-100',
        accent: 'bg-slate-600',
      }
    },
    {
      id: 'dark',
      name: 'Night Mode',
      description: 'Easy on the eyes',
      preview: {
        bg: 'bg-slate-800',
        accent: 'bg-violet-500',
      }
    }
  ];

  return (
    <div className="min-h-screen bg-theme-primary">
      <header className="bg-theme-card shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-theme-primary">Profile Settings</h1>
            <p className="text-theme-muted">Manage your account information</p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 text-theme-muted hover:text-theme-primary px-3 py-2 rounded-md hover:bg-theme-secondary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">Back to Library</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-8 px-4">
        {/* Status messages */}
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

        {/* Profile Card */}
        <div className="bg-theme-card rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-theme-accent flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-theme-on-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-theme-primary">{user?.name || 'User'}</h2>
              <p className="text-theme-muted">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-theme-primary mb-1">
                Display Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-theme focus:ring-2 focus:ring-theme-accent focus:border-transparent outline-none transition"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-theme-primary mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-theme focus:ring-2 focus:ring-theme-accent focus:border-transparent outline-none transition"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Placeholder for future fields */}
            <div className="pt-4 border-t border-theme">
              <p className="text-sm text-theme-muted mb-2">More settings coming soon...</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-theme-accent bg-theme-accent-hover text-theme-on-primary font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </form>
        </div>

        {/* Theme Selection */}
        <div className="bg-theme-card rounded-2xl shadow-xl p-8">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Theme Preference</h3>
          <div className="space-y-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-4 ${
                  user?.theme === theme.id
                    ? 'border-theme-accent bg-theme-secondary'
                    : 'border-theme hover:border-theme-accent'
                }`}
              >
                {/* Theme preview */}
                <div className={`w-16 h-12 rounded-md ${theme.preview.bg} flex items-center justify-center overflow-hidden shadow-inner`}>
                  <div className="flex gap-1">
                    <div className={`w-3 h-8 rounded-sm ${theme.preview.accent}`}></div>
                    <div className={`w-3 h-6 rounded-sm ${theme.preview.accent} opacity-70`}></div>
                    <div className={`w-3 h-7 rounded-sm ${theme.preview.accent} opacity-50`}></div>
                  </div>
                </div>

                {/* Theme info */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-theme-primary">{theme.name}</span>
                    {user?.theme === theme.id && (
                      <span className="text-xs bg-theme-accent text-theme-on-primary px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-theme-muted">{theme.description}</p>
                </div>

                {/* Checkmark for selected */}
                {user?.theme === theme.id && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
