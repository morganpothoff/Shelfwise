import { useState, useEffect, useRef } from 'react';
import { getFriendRequestCount, getFriendRequests, acceptFriendRequest, declineFriendRequest } from '../services/api';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const dropdownRef = useRef(null);

  // Fetch count on mount and every 30 seconds
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchCount() {
    try {
      const data = await getFriendRequestCount();
      setCount(data.count);
    } catch (err) {
      console.error('Failed to fetch request count:', err);
    }
  }

  async function toggleDropdown() {
    if (!isOpen) {
      setLoading(true);
      try {
        const data = await getFriendRequests();
        setRequests(data);
      } catch (err) {
        console.error('Failed to fetch requests:', err);
      }
      setLoading(false);
    }
    setIsOpen(!isOpen);
  }

  async function handleAccept(requestId) {
    setActionLoading(requestId);
    try {
      await acceptFriendRequest(requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      setCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
    setActionLoading(null);
  }

  async function handleDecline(requestId) {
    setActionLoading(requestId);
    try {
      await declineFriendRequest(requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      setCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to decline request:', err);
    }
    setActionLoading(null);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="p-2 text-theme-muted hover:text-theme-primary rounded-lg hover:bg-theme-secondary transition-colors relative"
        title="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-theme-card rounded-lg shadow-lg border border-theme z-50">
          <div className="p-3 border-b border-theme">
            <h3 className="font-semibold text-theme-primary text-sm">Friend Requests</h3>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <svg className="animate-spin h-5 w-5 text-theme-muted mx-auto" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : requests.length === 0 ? (
              <div className="p-4 text-center text-theme-muted text-sm">
                No pending friend requests
              </div>
            ) : (
              requests.map(request => (
                <div key={request.id} className="p-3 border-b border-theme last:border-b-0">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-theme-accent flex items-center justify-center flex-shrink-0">
                      <span className="text-theme-on-primary text-sm font-semibold">
                        {(request.from_name || request.from_email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-theme-primary truncate">
                        {request.from_name || request.from_email.split('@')[0]}
                      </p>
                      <p className="text-xs text-theme-muted truncate">{request.from_email}</p>
                      <p className="text-xs text-theme-muted mt-0.5">wants to be your friend</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleAccept(request.id)}
                          disabled={actionLoading === request.id}
                          className="px-3 py-1 text-xs font-medium bg-theme-accent text-theme-on-primary rounded-md hover:opacity-90 transition disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(request.id)}
                          disabled={actionLoading === request.id}
                          className="px-3 py-1 text-xs font-medium text-theme-muted border border-theme rounded-md hover:bg-theme-secondary transition disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
