import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser, updateTheme as apiUpdateTheme, updateProfile as apiUpdateProfile, updateEmail as apiUpdateEmail, deleteAccount as apiDeleteAccount, updateViewMode as apiUpdateViewMode } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Apply theme whenever user changes
  useEffect(() => {
    if (user?.theme) {
      applyTheme(user.theme);
    }
  }, [user?.theme]);

  function applyTheme(theme) {
    // Remove all theme classes
    document.documentElement.classList.remove('theme-purple', 'theme-light', 'theme-dark');
    // Add the new theme class
    document.documentElement.classList.add(`theme-${theme}`);
  }

  async function checkAuth() {
    try {
      setLoading(true);
      const data = await getCurrentUser();
      setUser(data.user);
    } catch (err) {
      // Not authenticated - this is expected for new users
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password, rememberMe = false) {
    try {
      setError(null);
      const data = await apiLogin(email, password, rememberMe);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }

  async function register(email, password, name, rememberMe = false) {
    try {
      setError(null);
      const data = await apiRegister(email, password, name, rememberMe);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }

  async function logout() {
    try {
      await apiLogout();
    } catch (err) {
      // Logout failed on server, but clear local state anyway
      console.error('Logout error:', err);
    }
    setUser(null);
    // Remove theme class on logout
    document.documentElement.classList.remove('theme-purple', 'theme-light', 'theme-dark');
  }

  async function setTheme(theme) {
    try {
      const data = await apiUpdateTheme(theme);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      console.error('Theme update error:', err);
      return { success: false, error: err.message };
    }
  }

  async function updateProfile(updates) {
    try {
      const data = await apiUpdateProfile(updates);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      console.error('Profile update error:', err);
      return { success: false, error: err.message };
    }
  }

  async function updateEmail(email, password) {
    try {
      const data = await apiUpdateEmail(email, password);
      setUser(data.user);
      return { success: true, message: data.message };
    } catch (err) {
      console.error('Email update error:', err);
      return { success: false, error: err.message };
    }
  }

  async function deleteAccount(password) {
    try {
      await apiDeleteAccount(password);
      setUser(null);
      document.documentElement.classList.remove('theme-purple', 'theme-light', 'theme-dark');
      return { success: true };
    } catch (err) {
      console.error('Account deletion error:', err);
      return { success: false, error: err.message };
    }
  }

  async function setViewMode(viewMode) {
    try {
      const data = await apiUpdateViewMode(viewMode);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      console.error('View mode update error:', err);
      return { success: false, error: err.message };
    }
  }

  function clearError() {
    setError(null);
  }

  // Refresh user data (useful after email verification)
  async function refreshUser() {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      return { success: true };
    } catch (err) {
      console.error('Refresh user error:', err);
      return { success: false, error: err.message };
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    setTheme,
    setViewMode,
    updateProfile,
    updateEmail,
    deleteAccount,
    refreshUser,
    clearError,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
