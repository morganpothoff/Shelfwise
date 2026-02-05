import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { verifyEmail, validateVerificationToken } from '../services/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, refreshUser } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading, success, error, no-token
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  // Use a ref to prevent the effect from running multiple times
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    // Prevent running verification multiple times
    if (hasVerified.current) {
      return;
    }
    hasVerified.current = true;

    async function verify() {
      try {
        // First validate the token
        const validation = await validateVerificationToken(token);

        if (!validation.valid) {
          setStatus('error');
          setMessage(validation.error || 'Invalid or expired verification link');
          return;
        }

        setEmail(validation.email);

        // Now verify the email
        const result = await verifyEmail(token);
        setStatus('success');
        setMessage(result.message || 'Email verified successfully!');

        // Refresh the user data to update the emailVerified status
        if (isAuthenticated) {
          await refreshUser();
        }

        // Redirect to home after a delay
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'Failed to verify email');
      }
    }

    verify();
  }, [token, isAuthenticated, navigate, refreshUser]);

  return (
    <div className="min-h-screen bg-theme-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-theme-accent rounded-2xl mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-theme-on-primary" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-theme-primary mb-2">Shelfwise</h1>
          <p className="text-theme-secondary">Your Personal Library Manager</p>
        </div>

        {/* Verification Card */}
        <div className="bg-theme-card rounded-2xl shadow-xl p-8">
          {status === 'loading' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-theme-primary mb-2">Verifying Your Email</h2>
              <p className="text-theme-muted">Please wait while we verify your email address...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-theme-primary mb-2">Email Verified!</h2>
              <p className="text-theme-muted mb-4">{message}</p>
              {email && (
                <p className="text-sm text-theme-muted mb-6">
                  Verified: <span className="font-medium text-theme-primary">{email}</span>
                </p>
              )}
              {isAuthenticated ? (
                <p className="text-sm text-theme-muted">Redirecting to your library...</p>
              ) : (
                <Link
                  to="/login"
                  className="inline-block w-full py-3 bg-theme-accent bg-theme-accent-hover text-theme-on-primary font-semibold rounded-lg transition text-center"
                >
                  Sign In
                </Link>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-theme-primary mb-2">Verification Failed</h2>
              <p className="text-theme-muted mb-6">{message}</p>
              <div className="space-y-3">
                {isAuthenticated ? (
                  <Link
                    to="/"
                    className="inline-block w-full py-3 bg-theme-accent bg-theme-accent-hover text-theme-on-primary font-semibold rounded-lg transition text-center"
                  >
                    Go to Library
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="inline-block w-full py-3 bg-theme-accent bg-theme-accent-hover text-theme-on-primary font-semibold rounded-lg transition text-center"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          )}

          {status === 'no-token' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-theme-primary mb-2">No Verification Token</h2>
              <p className="text-theme-muted mb-6">
                This link appears to be invalid. Please check your email for a valid verification link.
              </p>
              <Link
                to={isAuthenticated ? "/" : "/login"}
                className="inline-block w-full py-3 bg-theme-accent bg-theme-accent-hover text-theme-on-primary font-semibold rounded-lg transition text-center"
              >
                {isAuthenticated ? "Go to Library" : "Sign In"}
              </Link>
            </div>
          )}
        </div>

        {/* Footer links */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-theme-muted text-sm">
            Organize your books, discover your next read
          </p>
          <Link to="/faq" className="text-theme-secondary hover:underline text-sm">
            Frequently Asked Questions
          </Link>
        </div>
      </div>
    </div>
  );
}
