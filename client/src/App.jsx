import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import VerifyEmailPage from './components/VerifyEmailPage';
import Library from './components/Library';
import UserProfile from './components/UserProfile';
import FAQPage from './components/FAQPage';
import PickMyNextBook from './components/PickMyNextBook';
import PickForMe from './components/PickForMe';
import PickANumber from './components/PickANumber';
import AnalyzeMe from './components/AnalyzeMe';
import BookProfile from './components/BookProfile';
import BooksCompleted from './components/BooksCompleted';
import CompletedBookProfile from './components/CompletedBookProfile';
import FriendsPage from './components/FriendsPage';
import FriendLibrary from './components/FriendLibrary';

// Loading spinner component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
      <div className="text-center">
        <svg className="animate-spin h-12 w-12 text-amber-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-amber-700">Loading Shelfwise...</p>
      </div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Public route wrapper - redirects to home if already authenticated
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />
      <Route
        path="/verify-email"
        element={<VerifyEmailPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Library />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/friends"
        element={
          <ProtectedRoute>
            <FriendsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/friends/:friendId/library"
        element={
          <ProtectedRoute>
            <FriendLibrary />
          </ProtectedRoute>
        }
      />
      <Route path="/faq" element={<FAQPage />} />
      <Route
        path="/book/:id"
        element={
          <ProtectedRoute>
            <BookProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pick-my-next-book"
        element={
          <ProtectedRoute>
            <PickMyNextBook />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pick-my-next-book/pick-for-me"
        element={
          <ProtectedRoute>
            <PickForMe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pick-my-next-book/pick-a-number"
        element={
          <ProtectedRoute>
            <PickANumber />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pick-my-next-book/analyze-me"
        element={
          <ProtectedRoute>
            <AnalyzeMe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/books-completed"
        element={
          <ProtectedRoute>
            <BooksCompleted />
          </ProtectedRoute>
        }
      />
      <Route
        path="/completed-book/:id"
        element={
          <ProtectedRoute>
            <CompletedBookProfile />
          </ProtectedRoute>
        }
      />
      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
