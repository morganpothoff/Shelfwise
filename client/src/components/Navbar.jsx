import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeSelector from './ThemeSelector';

export default function Navbar() {
  const { user, logout, setTheme, isAuthenticated } = useAuth();
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  const handleThemeChange = async (newTheme) => {
    await setTheme(newTheme);
    setShowThemeSelector(false);
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'My Library', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ), requiresAuth: true },
    { path: '/quiz', label: 'Find My Next Read', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
      </svg>
    ), requiresAuth: true, comingSoon: true },
    { path: '/faq', label: 'FAQ', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    ), requiresAuth: false },
  ];

  const filteredNavLinks = navLinks.filter(link => !link.requiresAuth || isAuthenticated);

  return (
    <>
      <nav className="bg-theme-card shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={isAuthenticated ? '/' : '/login'} className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 bg-theme-accent rounded-xl flex items-center justify-center shadow">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-theme-on-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-theme-primary">Shelfwise</h1>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {filteredNavLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative ${
                    isActive(link.path)
                      ? 'bg-theme-accent/10 text-theme-accent font-medium'
                      : 'text-theme-secondary hover:bg-theme-secondary hover:text-theme-primary'
                  }`}
                  title={link.label}
                >
                  {link.icon}
                  <span>{link.label}</span>
                  {link.comingSoon && (
                    <span className="absolute -top-1 -right-1 bg-theme-accent text-theme-on-primary text-xs px-1.5 py-0.5 rounded-full font-medium">
                      Soon
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <>
                  {/* Profile link */}
                  <Link
                    to="/profile"
                    className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/profile')
                        ? 'bg-theme-accent/10 text-theme-accent'
                        : 'text-theme-secondary hover:bg-theme-secondary hover:text-theme-primary'
                    }`}
                    title="View profile"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium max-w-[120px] truncate">
                      {user?.name || user?.email?.split('@')[0]}
                    </span>
                  </Link>

                  {/* Theme button */}
                  <button
                    onClick={() => setShowThemeSelector(true)}
                    className="p-2 text-theme-muted hover:text-theme-primary rounded-lg hover:bg-theme-secondary transition-colors"
                    title="Change theme"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* Sign out button - desktop */}
                  <button
                    onClick={handleLogout}
                    className="hidden sm:flex items-center gap-2 text-theme-muted hover:text-theme-primary px-3 py-2 rounded-lg hover:bg-theme-secondary transition-colors"
                    title="Sign out"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-theme-muted hover:text-theme-primary rounded-lg hover:bg-theme-secondary transition-colors"
              >
                {mobileMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-theme bg-theme-card">
            <div className="px-4 py-3 space-y-1">
              {filteredNavLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(link.path)
                      ? 'bg-theme-accent/10 text-theme-accent font-medium'
                      : 'text-theme-secondary hover:bg-theme-secondary'
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                  {link.comingSoon && (
                    <span className="bg-theme-accent text-theme-on-primary text-xs px-2 py-0.5 rounded-full font-medium ml-auto">
                      Coming Soon
                    </span>
                  )}
                </Link>
              ))}

              {isAuthenticated && (
                <>
                  <div className="border-t border-theme my-2" />

                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive('/profile')
                        ? 'bg-theme-accent/10 text-theme-accent font-medium'
                        : 'text-theme-secondary hover:bg-theme-secondary'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span>Profile</span>
                    <span className="text-theme-muted ml-auto text-sm truncate max-w-[150px]">
                      {user?.name || user?.email}
                    </span>
                  </Link>

                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Theme Selector Modal */}
      {showThemeSelector && (
        <ThemeSelector
          currentTheme={user?.theme || 'purple'}
          onSelect={handleThemeChange}
          onClose={() => setShowThemeSelector(false)}
        />
      )}
    </>
  );
}
