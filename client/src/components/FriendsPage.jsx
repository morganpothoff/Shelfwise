import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import { getFriends, sendFriendRequest, unfriend } from '../services/api';

export default function FriendsPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmUnfriend, setConfirmUnfriend] = useState(null);
  const [unfriendLoading, setUnfriendLoading] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  async function loadFriends() {
    try {
      const data = await getFriends();
      setFriends(data);
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
    setLoading(false);
  }

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const query = searchQuery.toLowerCase().trim();
    return friends.filter(f =>
      f.name?.toLowerCase().includes(query) ||
      f.email?.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  async function handleSendRequest(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSendLoading(true);

    try {
      const data = await sendFriendRequest(addEmail.trim());
      setMessage(data.message || 'Friend request sent!');
      setAddEmail('');
    } catch (err) {
      setError(err.message);
    }

    setSendLoading(false);
  }

  async function handleUnfriend(friendId) {
    setUnfriendLoading(true);
    setError('');
    setMessage('');

    try {
      await unfriend(friendId);
      setFriends(prev => prev.filter(f => f.friend_id !== friendId));
      setMessage('Friend removed');
      setConfirmUnfriend(null);
    } catch (err) {
      setError(err.message);
    }

    setUnfriendLoading(false);
  }

  const friendToUnfriend = confirmUnfriend
    ? friends.find(f => f.friend_id === confirmUnfriend)
    : null;

  return (
    <div className="min-h-screen bg-theme-primary">
      <Navbar />

      <main className="max-w-2xl mx-auto py-8 px-4">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-primary">Friends</h1>
          <p className="text-theme-muted">Manage your friends and send friend requests</p>
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

        {/* Add Friend Card */}
        <div className="bg-theme-card rounded-2xl shadow-xl p-8 mb-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Add a Friend</h3>
          <form onSubmit={handleSendRequest} className="flex gap-3">
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1 px-4 py-3 rounded-lg border border-theme focus:ring-2 focus:ring-theme-accent focus:border-transparent outline-none transition"
              required
            />
            <button
              type="submit"
              disabled={!addEmail.trim() || sendLoading}
              className="px-6 py-3 bg-theme-accent bg-theme-accent-hover text-theme-on-primary font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                'Send Request'
              )}
            </button>
          </form>
        </div>

        {/* Friends List Card */}
        <div className="bg-theme-card rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-primary">
              Your Friends ({friends.length})
            </h3>
          </div>

          {/* Search bar */}
          {friends.length > 0 && (
            <div className="relative mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-theme focus:ring-2 focus:ring-theme-accent focus:border-transparent outline-none transition"
              />
            </div>
          )}

          {/* Friends list */}
          {loading ? (
            <div className="text-center py-8">
              <svg className="animate-spin h-8 w-8 text-theme-muted mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : filteredFriends.length === 0 ? (
            <p className="text-theme-muted text-center py-8">
              {friends.length === 0
                ? 'No friends yet. Send a friend request above!'
                : 'No friends match your search.'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredFriends.map(friend => (
                <div key={friend.friend_id} className="flex items-center justify-between p-4 rounded-lg border border-theme">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-theme-accent flex items-center justify-center flex-shrink-0">
                      <span className="text-theme-on-primary font-semibold">
                        {(friend.name || friend.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-theme-primary truncate">{friend.name || 'User'}</p>
                      <p className="text-sm text-theme-muted truncate">{friend.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmUnfriend(friend.friend_id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition flex-shrink-0 ml-3"
                  >
                    Unfriend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Unfriend Confirmation Modal */}
      {confirmUnfriend && friendToUnfriend && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-card rounded-2xl shadow-xl p-8 max-w-md w-full">
            <h3 className="text-lg font-semibold text-theme-primary mb-2">Remove Friend</h3>
            <p className="text-theme-muted mb-6">
              Are you sure you want to remove <span className="font-medium text-theme-primary">{friendToUnfriend.name || friendToUnfriend.email}</span> from your friends?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmUnfriend(null)}
                disabled={unfriendLoading}
                className="flex-1 py-3 border border-theme rounded-lg font-medium text-theme-primary hover:bg-theme-secondary transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUnfriend(confirmUnfriend)}
                disabled={unfriendLoading}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
              >
                {unfriendLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Removing...
                  </span>
                ) : (
                  'Remove Friend'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
