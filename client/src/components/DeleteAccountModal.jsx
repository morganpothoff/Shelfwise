import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DeleteAccountModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { deleteAccount } = useAuth();
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function handleClose() {
    setStep(1);
    setPassword('');
    setError('');
    setIsLoading(false);
    onClose();
  }

  function handleFirstConfirm() {
    setStep(2);
    setError('');
  }

  async function handleFinalConfirm(e) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await deleteAccount(password);

    if (result.success) {
      handleClose();
      navigate('/login');
    } else {
      setError(result.error);
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card rounded-lg p-6 max-w-md w-full">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-theme-muted hover:text-theme-primary transition"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {step === 1 ? (
          <>
            {/* Step 1: Initial warning */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-theme-primary mb-2">Delete Account?</h2>
              <p className="text-theme-muted">
                Are you sure you want to delete your account? This action cannot be undone.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> All your data will be permanently deleted, including:
              </p>
              <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                <li>Your profile information</li>
                <li>Your reading history</li>
                <li>All saved sessions</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 border border-theme rounded-lg text-theme-primary font-medium hover:bg-theme-secondary transition"
              >
                Cancel
              </button>
              <button
                onClick={handleFirstConfirm}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Final confirmation with password */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-theme-primary mb-2">Final Confirmation</h2>
              <p className="text-theme-muted">
                Enter your password to permanently delete your account.
              </p>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleFinalConfirm}>
              <div className="mb-6">
                <label htmlFor="deletePassword" className="block text-sm font-medium text-theme-primary mb-1">
                  Password
                </label>
                <input
                  id="deletePassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-theme focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"
                  placeholder="Enter your password"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 border border-theme rounded-lg text-theme-primary font-medium hover:bg-theme-secondary transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !password}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Deleting...
                    </span>
                  ) : (
                    'Delete My Account'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
