import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import DeleteAccountModal from './DeleteAccountModal';

export default function UserProfile() {
  const { user, updateProfile, updateEmail, setTheme } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [isLoadingName, setIsLoadingName] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function handleNameSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoadingName(true);

    const result = await updateProfile({ name });

    if (result.success) {
      setMessage('Name updated successfully');
    } else {
      setError(result.error);
    }

    setIsLoadingName(false);
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoadingEmail(true);

    const result = await updateEmail(newEmail, emailPassword);

    if (result.success) {
      setMessage(result.message || 'Email updated successfully');
      setNewEmail('');
      setEmailPassword('');
    } else {
      setError(result.error);
    }

    setIsLoadingEmail(false);
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
      <Navbar />

      <main className="max-w-2xl mx-auto py-8 px-4">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-primary">Profile Settings</h1>
          <p className="text-theme-muted">Manage your account information</p>
        </div>
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

        {/* Profile Header Card */}
        <div className="bg-theme-card rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-full bg-theme-accent flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-theme-on-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-theme-primary">{user?.name || 'User'}</h2>
              <div className="flex items-center gap-2">
                <span className="text-theme-muted">{user?.email}</span>
                {!user?.emailVerified && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    Not verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Display Name Card */}
        <div className="bg-theme-card rounded-2xl shadow-xl p-8 mb-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Display Name</h3>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-theme-primary mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-theme focus:ring-2 focus:ring-theme-accent focus:border-transparent outline-none transition"
                placeholder="Your display name"
              />
            </div>

            <button
              type="submit"
              disabled={isLoadingName}
              className="w-full py-3 bg-theme-accent bg-theme-accent-hover text-theme-on-primary font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingName ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Update Name'
              )}
            </button>
          </form>
        </div>

        {/* Email Card */}
        <div className="bg-theme-card rounded-2xl shadow-xl p-8 mb-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-2">Email Address</h3>
          <p className="text-sm text-theme-muted mb-4">
            Changing your email requires your current password for security.
          </p>

          <div className="mb-4 p-3 bg-theme-secondary rounded-lg">
            <span className="text-sm text-theme-muted">Current email: </span>
            <span className="font-medium text-theme-primary">{user?.email}</span>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="newEmail" className="block text-sm font-medium text-theme-primary mb-1">
                New Email Address
              </label>
              <input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-theme focus:ring-2 focus:ring-theme-accent focus:border-transparent outline-none transition"
                placeholder="new@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="emailPassword" className="block text-sm font-medium text-theme-primary mb-1">
                Current Password
              </label>
              <input
                id="emailPassword"
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-theme focus:ring-2 focus:ring-theme-accent focus:border-transparent outline-none transition"
                placeholder="Enter your current password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoadingEmail || !newEmail || !emailPassword}
              className="w-full py-3 bg-theme-accent bg-theme-accent-hover text-theme-on-primary font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingEmail ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating...
                </span>
              ) : (
                'Update Email'
              )}
            </button>
          </form>
        </div>

        {/* Placeholder for future fields */}
        <div className="bg-theme-card rounded-2xl shadow-xl p-8 mb-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-2">Additional Settings</h3>
          <p className="text-sm text-theme-muted">More settings coming soon...</p>
        </div>

        {/* Theme Selection */}
        <div className="bg-theme-card rounded-2xl shadow-xl p-8 mb-6">
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

        {/* Danger Zone - Delete Account */}
        <div className="bg-theme-card rounded-2xl shadow-xl p-8 border-2 border-red-200">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h3>
          <p className="text-sm text-theme-muted mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
          >
            Delete Account
          </button>
        </div>
      </main>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
