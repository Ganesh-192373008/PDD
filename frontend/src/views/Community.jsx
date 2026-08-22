import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Star, MessageCircle, Share2, MapPin, Send, Plus, X, AlertCircle, Users } from 'lucide-react';

export const Community = () => {
  const { token, API_URL, t, user } = useApp();
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'my', 'replies'
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [replyContent, setReplyContent] = useState({}); // { [messageId]: content }
  const [expandedReplies, setExpandedReplies] = useState({}); // { [messageId]: boolean }
  const [submittingPost, setSubmittingPost] = useState(false);
  const [submittingReply, setSubmittingReply] = useState({}); // { [messageId]: boolean }
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/community`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        setError('');
      } else {
        if (res.status === 404) {
          setError('Community API endpoint not found. Please restart your backend server process in your terminal window to register the new community routes.');
        } else {
          setError('Failed to fetch community messages.');
        }
      }
    } catch (e) {
      console.error('Error fetching community messages:', e);
      setError('Connection to community server failed. Please ensure your backend node server.js is running and restarted.');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postContent.trim() || submittingPost) return;

    try {
      setSubmittingPost(true);
      setError('');
      const res = await fetch(`${API_URL}/community`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: postContent })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [newMsg, ...prev]);
        setPostContent('');
        setShowPostModal(false);
        setSuccess('Post published successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to publish post.');
      }
    } catch (err) {
      setError('Connection to server failed.');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleLike = async (messageId) => {
    try {
      const res = await fetch(`${API_URL}/community/${messageId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const updatedMsg = await res.json();
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? updatedMsg : msg))
        );
      }
    } catch (err) {
      console.error('Error liking message:', err);
    }
  };

  const handleShare = async (messageId) => {
    try {
      const res = await fetch(`${API_URL}/community/${messageId}/share`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const updatedMsg = await res.json();
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? updatedMsg : msg))
        );
        
        const shareLink = `${window.location.origin}/community#post-${messageId}`;
        navigator.clipboard.writeText(shareLink);
        setSuccess('Share link copied to clipboard!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error sharing message:', err);
    }
  };

  const handleReplySubmit = async (e, messageId) => {
    e.preventDefault();
    const content = replyContent[messageId];
    if (!content || !content.trim() || submittingReply[messageId]) return;

    try {
      setSubmittingReply((prev) => ({ ...prev, [messageId]: true }));
      const res = await fetch(`${API_URL}/community/${messageId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: content })
      });

      if (res.ok) {
        const updatedMsg = await res.json();
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? updatedMsg : msg))
        );
        setReplyContent((prev) => ({ ...prev, [messageId]: '' }));
      }
    } catch (err) {
      console.error('Error submitting reply:', err);
    } finally {
      setSubmittingReply((prev) => ({ ...prev, [messageId]: false }));
    }
  };

  const toggleReplies = (messageId) => {
    setExpandedReplies((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  const handleReplyTextChange = (messageId, val) => {
    setReplyContent((prev) => ({ ...prev, [messageId]: val }));
  };

  const getFilteredMessages = () => {
    if (activeTab === 'my') {
      return messages.filter((msg) => msg.userId === user?._id || msg.userId === user?.id);
    }
    if (activeTab === 'replies') {
      return messages.filter((msg) => (msg.userId === user?._id || msg.userId === user?.id) && msg.replies && msg.replies.length > 0);
    }
    return messages;
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const filteredMessages = getFilteredMessages();

  return (
    <div className="community-page-wrapper slide-in">
      {success && (
        <div className="alert alert-success floating-alert">
          {success}
        </div>
      )}

      {error && (
        <div className="alert alert-error floating-alert">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Green Forum Header Card */}
      <header className="forum-header-card">
        <div className="header-top-row">
          <div>
            <h1>Farmer Community</h1>
            <p className="subtitle">Connect with farmers</p>
          </div>
          <button onClick={() => setShowPostModal(true)} className="btn btn-post-action">
            <Plus size={16} /> Post
          </button>
        </div>

        <div className="header-meta-row mt-3">
          <span className="badge badge-active-count">
            🤠 2,450+ Active Farmers
          </span>
        </div>

        <div className="header-tabs-row mt-3">
          <button 
            onClick={() => setActiveTab('all')} 
            className={`tab-pill ${activeTab === 'all' ? 'active' : ''}`}
          >
            All Forum Posts
          </button>
          <button 
            onClick={() => setActiveTab('my')} 
            className={`tab-pill ${activeTab === 'my' ? 'active' : ''}`}
          >
            My Posts 📝
          </button>
          <button 
            onClick={() => setActiveTab('replies')} 
            className={`tab-pill ${activeTab === 'replies' ? 'active' : ''}`}
          >
            Replies Box 💬
          </button>
        </div>
      </header>

      {/* Posts Feed */}
      <div className="posts-feed mt-4">
        {filteredMessages.length > 0 ? (
          filteredMessages.map((msg) => {
            const hasLiked = msg.likes?.includes(user?._id) || msg.likes?.includes(user?.id);
            const isRepliesExpanded = expandedReplies[msg._id];

            return (
              <article key={msg._id} className="post-card glass-card">
                {/* User Row */}
                <div className="post-user-row">
                  <div className="post-avatar">
                    <span>{(msg.userName || 'F').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="post-user-meta">
                    <h4>{msg.userName || 'Anonymous Farmer'}</h4>
                    <span className="location-time">
                      {msg.userLocation || 'Global Farmer'} · {formatTimeAgo(msg.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="post-body mt-3">
                  <p>{msg.content}</p>
                </div>

                {/* Actions Footer */}
                <div className="post-actions-divider mt-3"></div>
                <div className="post-actions-row">
                  <button 
                    onClick={() => handleLike(msg._id)} 
                    className={`action-btn ${hasLiked ? 'liked-active' : ''}`}
                    title="Like Post"
                  >
                    <Star size={16} className={hasLiked ? 'fill-star' : ''} />
                    <span>{msg.likes?.length || 0}</span>
                  </button>

                  <button 
                    onClick={() => toggleReplies(msg._id)} 
                    className={`action-btn ${isRepliesExpanded ? 'replies-active' : ''}`}
                    title="View Replies"
                  >
                    <MessageCircle size={16} />
                    <span>{msg.replies?.length || 0}</span>
                  </button>

                  <button 
                    onClick={() => handleShare(msg._id)} 
                    className="action-btn"
                    title="Share Post"
                  >
                    <Share2 size={16} />
                    <span>Share</span>
                  </button>
                </div>

                {/* Expanded Replies Section */}
                {isRepliesExpanded && (
                  <div className="replies-section-expanded mt-3">
                    <div className="replies-list">
                      {msg.replies && msg.replies.length > 0 ? (
                        msg.replies.map((reply) => (
                          <div key={reply._id} className="reply-item">
                            <div className="reply-header">
                              <span className="reply-author">{reply.userName || 'Anonymous Farmer'}</span>
                              {reply.userLocation && (
                                <span className="reply-location">
                                  <MapPin size={8} /> {reply.userLocation}
                                </span>
                              )}
                              <span className="reply-time">{formatTimeAgo(reply.createdAt)}</span>
                            </div>
                            <p className="reply-text mt-1">{reply.content}</p>
                          </div>
                        ))
                      ) : (
                        <p className="no-replies-text">No replies yet. Write a response below!</p>
                      )}
                    </div>

                    {/* Write Reply Form */}
                    <form onSubmit={(e) => handleReplySubmit(e, msg._id)} className="reply-form mt-3">
                      <input
                        type="text"
                        placeholder="Write a reply..."
                        value={replyContent[msg._id] || ''}
                        onChange={(e) => handleReplyTextChange(msg._id, e.target.value)}
                        className="reply-input"
                        required
                        maxLength={200}
                      />
                      <button 
                        type="submit" 
                        className="btn btn-primary btn-sm btn-reply-send"
                        disabled={submittingReply[msg._id]}
                      >
                        <Send size={12} />
                      </button>
                    </form>
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <div className="empty-feed glass-card">
            <Users size={48} color="rgba(144, 165, 149, 0.2)" className="mb-2" />
            <p>No community posts match this selection. Start a new topic!</p>
          </div>
        )}
      </div>

      {/* Create Post Modal Overlay */}
      {showPostModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>Create New Forum Post</h3>
              <button onClick={() => setShowPostModal(false)} className="btn-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreatePost} className="modal-form mt-3">
              <textarea
                placeholder="What is happening on your farm today? Share weather, crop observations, or ask questions to the community..."
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="post-textarea"
                required
                maxLength={500}
                rows={5}
              ></textarea>
              <div className="modal-footer mt-3">
                <button 
                  type="button" 
                  onClick={() => setShowPostModal(false)} 
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!postContent.trim() || submittingPost}
                >
                  {submittingPost ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .community-page-wrapper {
          max-width: 800px;
          margin: 0 auto;
          padding-bottom: 50px;
        }
        
        /* Green Forum Header Card */
        .forum-header-card {
          background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
          border-radius: var(--border-radius-md);
          padding: 24px;
          color: #fff;
          box-shadow: 0 8px 32px rgba(27, 94, 32, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .forum-header-card h1 {
          font-size: 24px;
          font-weight: 800;
          color: #fff;
          letter-spacing: 0.5px;
        }
        .forum-header-card .subtitle {
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          margin-top: 4px;
        }
        .header-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .btn-post-action {
          background: #fff;
          color: #2e7d32;
          font-weight: 700;
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: var(--transition-smooth);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .btn-post-action:hover {
          background: #f1f8e9;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        .badge-active-count {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .header-tabs-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .tab-pill {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .tab-pill:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .tab-pill.active {
          background: #fff;
          color: #2e7d32;
          border-color: #fff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }
        
        /* Post Cards - White premium theme inside dark layout */
        .post-card {
          background: #ffffff;
          color: #333333;
          border-radius: var(--border-radius-sm);
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0,0,0,0.06);
          transition: var(--transition-smooth);
        }
        .post-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.12);
        }
        .post-user-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .post-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #e8f5e9;
          color: #2e7d32;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
          border: 1.5px solid #c8e6c9;
        }
        .post-user-meta h4 {
          color: #2c3e50;
          font-size: 16px;
          font-weight: 700;
        }
        .location-time {
          font-size: 11px;
          color: #7f8c8d;
        }
        .post-body p {
          font-size: 14px;
          line-height: 1.6;
          color: #4a4a4a;
        }
        
        /* Post Actions Footer */
        .post-actions-divider {
          height: 1px;
          background: rgba(0, 0, 0, 0.06);
        }
        .post-actions-row {
          display: flex;
          justify-content: space-around;
          padding-top: 10px;
        }
        .action-btn {
          background: transparent;
          border: none;
          color: #7f8c8d;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
          padding: 6px 12px;
          border-radius: 4px;
        }
        .action-btn:hover {
          background: #f5f5f5;
          color: #34495e;
        }
        .action-btn.liked-active {
          color: #f1c40f;
        }
        .action-btn.liked-active:hover {
          background: #fef9e7;
        }
        .fill-star {
          fill: #f1c40f;
        }
        .action-btn.replies-active {
          color: #2e7d32;
        }
        .action-btn.replies-active:hover {
          background: #e8f5e9;
        }
        
        /* Expanded Replies Box */
        .replies-section-expanded {
          background: #fcfcfc;
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: var(--border-radius-sm);
          padding: 16px;
        }
        .replies-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 250px;
          overflow-y: auto;
        }
        .reply-item {
          border-bottom: 1px solid #f1f1f1;
          padding-bottom: 8px;
        }
        .reply-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .reply-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
        }
        .reply-author {
          font-weight: 700;
          color: #34495e;
        }
        .reply-location {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          background: #e8f5e9;
          color: #2e7d32;
          padding: 1px 6px;
          border-radius: 8px;
          font-size: 9px;
        }
        .reply-time {
          color: #95a5a6;
          margin-left: auto;
        }
        .reply-text {
          font-size: 13px;
          color: #555;
          line-height: 1.4;
        }
        .no-replies-text {
          font-size: 12px;
          color: #7f8c8d;
          text-align: center;
          padding: 10px 0;
        }
        
        /* Reply Submit Form */
        .reply-form {
          display: flex;
          gap: 8px;
        }
        .reply-input {
          flex-grow: 1;
          background: #fff;
          border: 1px solid #dcdde1;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 13px;
          outline: none;
          color: #333;
        }
        .reply-input:focus {
          border-color: #2e7d32;
        }
        .btn-reply-send {
          padding: 0 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Empty Feed styling */
        .empty-feed {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
          color: var(--text-secondary);
        }
        
        /* Create Post Modal Overlay */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          width: 90%;
          max-width: 500px;
          background: #ffffff;
          color: #333333;
          border-radius: var(--border-radius-md);
          padding: 24px;
          border: 1px solid rgba(0,0,0,0.1);
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h3 {
          color: #2c3e50;
          font-size: 18px;
          font-weight: 700;
        }
        .btn-close {
          background: transparent;
          border: none;
          color: #7f8c8d;
          cursor: pointer;
        }
        .btn-close:hover {
          color: #2c3e50;
        }
        .post-textarea {
          width: 100%;
          background: #f8f9fa;
          border: 1px solid #dcdde1;
          border-radius: var(--border-radius-sm);
          padding: 12px;
          font-size: 14px;
          color: #333;
          outline: none;
          resize: none;
        }
        .post-textarea:focus {
          border-color: #2e7d32;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
      `}</style>
    </div>
  );
};
