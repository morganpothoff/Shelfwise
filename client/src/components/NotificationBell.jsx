import { useState, useEffect, useRef } from 'react';
import { getFriendRequestCount, getFriendRequests, acceptFriendRequest, declineFriendRequest } from '../services/api';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
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
      // Silently fail
    }
  }

  async function handleOpen() {
    setOpen(!open);
    if (!open) {
      try {
        const data = await getFriendRequests();
        setRequests(data);
      } catch (err) {
        // Silently fail
      }
    }
  }

  async function handleAccept(id) {
    setLoadingId(id);
    try {
      await acceptFriendRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      setCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // Silently fail
    }
    setLoadingId(null);
  }

  async function handleDecline(id) {
    setLoadingId(id);
    try {
      await declineFriendRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      setCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // Silently fail
    }
    setLoadingId(null);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 text-theme-muted hover:text-theme-primary transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-theme-card rounded-xl shadow-xl border border-theme z-50 overflow-hidden">
          <div className="p-3 border-b border-theme">
            <h4 className="font-semibold text-theme-primary text-sm">Friend Requests</h4>
          </div>
          {requests.length === 0 ? (
            <div className="p-4 text-center text-theme-muted text-sm">
              No pending requests
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {requests.map(req => (
                <div key={req.id} className="p-3 border-b border-theme last:border-b-0">
                  <p className="text-sm text-theme-primary font-medium">{req.from_name || req.from_email}</p>
                  {req.from_name && (
                    <p className="text-xs text-theme-muted">{req.from_email}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={loadingId === req.id}
                      className="flex-1 text-xs py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(req.id)}
                      disabled={loadingId === req.id}
                      className="flex-1 text-xs py-1.5 bg-theme-secondary hover:bg-theme-primary text-theme-primary rounded-lg font-medium transition disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
