import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeSelector from './ThemeSelector';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout, setTheme, isAuthenticated } = useAuth();
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pickDropdownOpen, setPickDropdownOpen] = useState(false);
  const [mobilePickExpanded, setMobilePickExpanded] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  const handleThemeChange = async (newTheme) => {
    await setTheme(newTheme);
    setShowThemeSelector(false);
  };

  const isActive = (path) => {
    if (path === '/pick-my-next-book') {
      return location.pathname.startsWith('/pick-my-next-book');
    }
    return location.pathname === path;
  };

  const navLinks = [
    { path: '/', label: 'My Library', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ), requiresAuth: true },
    { path: '/books-completed', label: 'Books Completed', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ), requiresAuth: true },
    { path: '/pick-my-next-book', label: 'Pick My Next Book', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
      </svg>
    ), requiresAuth: true, hasDropdown: true, subItems: [
      { path: '/pick-my-next-book/pick-for-me', label: 'Pick for me' },
      { path: '/pick-my-next-book/pick-a-number', label: 'Pick a number' },
      { path: '/pick-my-next-book/analyze-me', label: 'Analyze me' },
    ] },
    { path: '/friends', label: 'Friends', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
      </svg>
    ), requiresAuth: true },
    { path: '/borrows', label: 'Borrows', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
      </svg>
    ), requiresAuth: true },
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
                link.hasDropdown ? (
                  <div key={link.path} className="relative flex items-center">
                    <Link
                      to={link.path}
                      className={`flex items-center gap-2 pl-4 pr-1 py-2 rounded-l-lg transition-colors ${
                        isActive(link.path)
                          ? 'bg-theme-accent/10 text-theme-accent font-medium'
                          : 'text-theme-secondary hover:bg-theme-secondary hover:text-theme-primary'
                      }`}
                      title={link.label}
                    >
                      {link.icon}
                      <span>{link.label}</span>
                    </Link>
                    <button
                      onClick={() => setPickDropdownOpen(!pickDropdownOpen)}
                      onBlur={() => setTimeout(() => setPickDropdownOpen(false), 150)}
                      className={`flex items-center pr-3 pl-1 py-2 rounded-r-lg transition-colors ${
                        isActive(link.path)
                          ? 'bg-theme-accent/10 text-theme-accent'
                          : 'text-theme-secondary hover:bg-theme-secondary hover:text-theme-primary'
                      }`}
                      title="Show options"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${pickDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {pickDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-theme-card rounded-lg shadow-lg border border-theme py-1 z-50">
                        {link.subItems.map(sub => (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            onClick={() => setPickDropdownOpen(false)}
                            className={`block px-4 py-2.5 text-sm transition-colors ${
                              location.pathname === sub.path
                                ? 'bg-theme-accent/10 text-theme-accent font-medium'
                                : 'text-theme-secondary hover:bg-theme-secondary hover:text-theme-primary'
                            }`}
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
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
                  </Link>
                )
              ))}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <>
                  {/* Notification bell */}
                  <NotificationBell />

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
                link.hasDropdown ? (
                  <div key={link.path}>
                    <div className={`flex items-center rounded-lg transition-colors ${
                      isActive(link.path)
                        ? 'bg-theme-accent/10 text-theme-accent font-medium'
                        : 'text-theme-secondary hover:bg-theme-secondary'
                    }`}>
                      <Link
                        to={link.path}
                        onClick={() => { setMobileMenuOpen(false); setMobilePickExpanded(false); }}
                        className="flex-1 flex items-center gap-3 pl-4 py-3"
                      >
                        {link.icon}
                        <span>{link.label}</span>
                      </Link>
                      <button
                        onClick={() => setMobilePickExpanded(!mobilePickExpanded)}
                        className="px-4 py-3"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${mobilePickExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    {mobilePickExpanded && (
                      <div className="ml-8 mt-1 space-y-1">
                        {link.subItems.map(sub => (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            onClick={() => { setMobileMenuOpen(false); setMobilePickExpanded(false); }}
                            className={`block px-4 py-2.5 rounded-lg text-sm transition-colors ${
                              location.pathname === sub.path
                                ? 'bg-theme-accent/10 text-theme-accent font-medium'
                                : 'text-theme-secondary hover:bg-theme-secondary'
                            }`}
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
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
                  </Link>
                )
              ))}

              {isAuthenticated && (
                <>
                  <div className="border-t border-theme my-2" />

                  <Link
                    to="/friends"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive('/friends')
                        ? 'bg-theme-accent/10 text-theme-accent font-medium'
                        : 'text-theme-secondary hover:bg-theme-secondary'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                    <span>Notifications</span>
                  </Link>

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
