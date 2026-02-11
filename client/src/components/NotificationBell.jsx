import { useState, useEffect, useRef } from 'react';
import {
  getFriendRequestCount, getFriendRequests, acceptFriendRequest, declineFriendRequest,
  getBorrowRequestCount, getBorrowRequests, acceptBorrowRequest, declineBorrowRequest,
  getReturnRequestCount, getReturnRequests, acknowledgeReturn
} from '../services/api';

export default function NotificationBell() {
  const [friendCount, setFriendCount] = useState(0);
  const [borrowCount, setBorrowCount] = useState(0);
  const [returnCount, setReturnCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [friendRequests, setFriendRequests] = useState([]);
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const dropdownRef = useRef(null);

  const totalCount = friendCount + borrowCount + returnCount;

  // Fetch counts on mount and every 30 seconds
  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
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

  async function fetchCounts() {
    try {
      const [friendData, borrowData, returnData] = await Promise.all([
        getFriendRequestCount(),
        getBorrowRequestCount(),
        getReturnRequestCount()
      ]);
      setFriendCount(friendData.count);
      setBorrowCount(borrowData.count);
      setReturnCount(returnData.count);
    } catch (err) {
      console.error('Failed to fetch notification counts:', err);
    }
  }

  async function toggleDropdown() {
    if (!isOpen) {
      setLoading(true);
      try {
        const [friendData, borrowData, returnData] = await Promise.all([
          getFriendRequests(),
          getBorrowRequests(),
          getReturnRequests()
        ]);
        setFriendRequests(friendData);
        setBorrowRequests(borrowData);
        setReturnRequests(returnData);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
      setLoading(false);
    }
    setIsOpen(!isOpen);
  }

  async function handleAcceptFriend(requestId) {
    setActionLoading(`friend-${requestId}`);
    try {
      await acceptFriendRequest(requestId);
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));
      setFriendCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to accept friend request:', err);
    }
    setActionLoading(null);
  }

  async function handleDeclineFriend(requestId) {
    setActionLoading(`friend-${requestId}`);
    try {
      await declineFriendRequest(requestId);
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));
      setFriendCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to decline friend request:', err);
    }
    setActionLoading(null);
  }

  async function handleAcceptBorrow(requestId) {
    setActionLoading(`borrow-${requestId}`);
    try {
      await acceptBorrowRequest(requestId);
      setBorrowRequests(prev => prev.filter(r => r.id !== requestId));
      setBorrowCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to accept borrow request:', err);
    }
    setActionLoading(null);
  }

  async function handleDeclineBorrow(requestId) {
    setActionLoading(`borrow-${requestId}`);
    try {
      await declineBorrowRequest(requestId);
      setBorrowRequests(prev => prev.filter(r => r.id !== requestId));
      setBorrowCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to decline borrow request:', err);
    }
    setActionLoading(null);
  }

  async function handleAcknowledgeReturn(bookId, requestId) {
    setActionLoading(`return-${requestId}`);
    try {
      await acknowledgeReturn(bookId);
      setReturnRequests(prev => prev.filter(r => r.id !== requestId));
      setReturnCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to acknowledge return:', err);
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
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-theme-card rounded-lg shadow-lg border border-theme z-50">
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <svg className="animate-spin h-5 w-5 text-theme-muted mx-auto" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : totalCount === 0 ? (
              <div className="p-4 text-center text-theme-muted text-sm">
                No notifications
              </div>
            ) : (
              <>
                {/* Friend Requests */}
                {friendRequests.length > 0 && (
                  <>
                    <div className="p-3 border-b border-theme">
                      <h3 className="font-semibold text-theme-primary text-sm">Friend Requests</h3>
                    </div>
                    {friendRequests.map(request => (
                      <div key={`friend-${request.id}`} className="p-3 border-b border-theme last:border-b-0">
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
                                onClick={() => handleAcceptFriend(request.id)}
                                disabled={actionLoading === `friend-${request.id}`}
                                className="px-3 py-1 text-xs font-medium bg-theme-accent text-theme-on-primary rounded-md hover:opacity-90 transition disabled:opacity-50"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleDeclineFriend(request.id)}
                                disabled={actionLoading === `friend-${request.id}`}
                                className="px-3 py-1 text-xs font-medium text-theme-muted border border-theme rounded-md hover:bg-theme-secondary transition disabled:opacity-50"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Borrow Requests */}
                {borrowRequests.length > 0 && (
                  <>
                    <div className="p-3 border-b border-theme">
                      <h3 className="font-semibold text-theme-primary text-sm">Borrow Requests</h3>
                    </div>
                    {borrowRequests.map(request => (
                      <div key={`borrow-${request.id}`} className="p-3 border-b border-theme last:border-b-0">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-theme-primary truncate">
                              {request.from_name || request.from_email.split('@')[0]}
                            </p>
                            <p className="text-xs text-theme-muted mt-0.5">
                              wants to borrow <span className="font-medium text-theme-primary">{request.book_title}</span>
                              {request.book_author && <span> by {request.book_author}</span>}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleAcceptBorrow(request.id)}
                                disabled={actionLoading === `borrow-${request.id}`}
                                className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50"
                              >
                                Allow
                              </button>
                              <button
                                onClick={() => handleDeclineBorrow(request.id)}
                                disabled={actionLoading === `borrow-${request.id}`}
                                className="px-3 py-1 text-xs font-medium text-theme-muted border border-theme rounded-md hover:bg-theme-secondary transition disabled:opacity-50"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Return Requests */}
                {returnRequests.length > 0 && (
                  <>
                    <div className="p-3 border-b border-theme">
                      <h3 className="font-semibold text-theme-primary text-sm">Return Requests</h3>
                    </div>
                    {returnRequests.map(request => (
                      <div key={`return-${request.id}`} className="p-3 border-b border-theme last:border-b-0">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-theme-primary truncate">
                              {request.owner_name || request.owner_email.split('@')[0]}
                            </p>
                            <p className="text-xs text-theme-muted mt-0.5">
                              is requesting <span className="font-medium text-theme-primary">{request.book_title}</span> back
                              {request.book_author && <span> by {request.book_author}</span>}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleAcknowledgeReturn(request.book_id, request.id)}
                                disabled={actionLoading === `return-${request.id}`}
                                className="px-3 py-1 text-xs font-medium bg-theme-accent text-theme-on-primary rounded-md hover:opacity-90 transition disabled:opacity-50"
                              >
                                Acknowledge Return
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
