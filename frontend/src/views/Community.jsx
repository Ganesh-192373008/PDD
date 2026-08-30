import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Star, MessageCircle, Share2, MapPin, Send, Plus, X, 
  AlertCircle, Users, Search, Filter, Edit, Trash2, Image, 
  Award, MessageSquare, BookOpen, AlertTriangle, CheckCircle2 
} from 'lucide-react';

export const Community = () => {
  const { token, API_URL, t, user } = useApp();
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'my', 'replies'
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null); // post object being edited
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState('Crop Advice');
  const [postImage, setPostImage] = useState(''); // base64 string
  const [replyContent, setReplyContent] = useState({}); // { [messageId]: content }
  const [expandedReplies, setExpandedReplies] = useState({}); // { [messageId]: boolean }
  const [submittingPost, setSubmittingPost] = useState(false);
  const [submittingReply, setSubmittingReply] = useState({}); // { [messageId]: boolean }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  const categories = [
    'Crop Advice',
    'Pest & Disease',
    'Irrigation',
    'Market Prices',
    'Government Schemes',
    'Farming Techniques',
    'Organic Farming'
  ];

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
          setError('Community API endpoint not found. Please restart your backend server.');
        } else {
          setError('Failed to fetch community messages.');
        }
      }
    } catch (e) {
      console.error('Error fetching community messages:', e);
      setError('Connection to community server failed.');
    } finally {
      setLoading(false);
    }
  };

  const compressImageToBase64 = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5); // 0.5 quality JPEG
        callback(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file.', 'error');
        return;
      }
      compressImageToBase64(file, (base64) => {
        setPostImage(base64);
      });
    }
  };

  const handleCreateOrUpdatePost = async (e) => {
    e.preventDefault();
    if (!postContent.trim() || submittingPost) return;

    try {
      setSubmittingPost(true);
      setError('');
      
      const payload = {
        content: postContent,
        category: postCategory,
        imageUrl: postImage
      };

      const url = editingPost 
        ? `${API_URL}/community/${editingPost._id}`
        : `${API_URL}/community`;

      const method = editingPost ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const resultPost = await res.json();
        if (editingPost) {
          setMessages((prev) => prev.map(msg => msg._id === editingPost._id ? resultPost : msg));
          showToast('Post updated successfully!', 'success');
        } else {
          setMessages((prev) => [resultPost, ...prev]);
          showToast('Post published successfully!', 'success');
        }
        closePostModal();
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to submit post.', 'error');
      }
    } catch (err) {
      showToast('Connection to server failed.', 'error');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleEditClick = (post) => {
    setEditingPost(post);
    setPostContent(post.content);
    setPostCategory(post.category || 'Crop Advice');
    setPostImage(post.imageUrl || '');
    setShowPostModal(true);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`${API_URL}/community/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setMessages((prev) => prev.filter(msg => msg._id !== postId));
        showToast('Post deleted successfully!', 'success');
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to delete post.', 'error');
      }
    } catch (err) {
      showToast('Connection to server failed.', 'error');
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
        
        // Notify liked
        const hasLiked = updatedMsg.likes?.includes(user?._id) || updatedMsg.likes?.includes(user?.id);
        if (hasLiked) {
          showToast('Liked post! ❤️', 'success');
        }
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
        
        if (navigator.share) {
          navigator.share({
            title: 'AgroAssist Farmer Post',
            text: updatedMsg.content,
            url: shareLink
          }).then(() => {
            showToast('Post shared successfully!', 'success');
          }).catch(console.error);
        } else {
          navigator.clipboard.writeText(shareLink);
          showToast('Share link copied to clipboard! 📋', 'success');
        }
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
        showToast('Reply posted successfully!', 'success');
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

  const showToast = (message, type = 'success') => {
    if (type === 'success') {
      setSuccess(message);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const closePostModal = () => {
    setShowPostModal(false);
    setEditingPost(null);
    setPostContent('');
    setPostCategory('Crop Advice');
    setPostImage('');
  };

  // Filter and Search logic
  const getFilteredMessages = () => {
    let list = messages;

    // Filter by Tab
    if (activeTab === 'my') {
      list = list.filter((msg) => msg.userId === user?._id || msg.userId === user?.id);
    }

    // Filter by Category Chip
    if (selectedCategoryFilter !== 'All') {
      list = list.filter((msg) => msg.category === selectedCategoryFilter);
    }

    // Filter by Search Query (Name, Location, Content, Category)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter((msg) => 
        (msg.userName && msg.userName.toLowerCase().includes(q)) ||
        (msg.userLocation && msg.userLocation.toLowerCase().includes(q)) ||
        (msg.content && msg.content.toLowerCase().includes(q)) ||
        (msg.category && msg.category.toLowerCase().includes(q))
      );
    }

    return list;
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

  const handleReplyClick = (postId) => {
    setActiveTab('all');
    setSelectedCategoryFilter('All');
    setExpandedReplies((prev) => ({ ...prev, [postId]: true }));
    setTimeout(() => {
      const element = document.getElementById(`post-${postId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlighted-post');
        setTimeout(() => element.classList.remove('highlighted-post'), 2500);
      }
    }, 200);
  };

  // Compile Replies Box Data
  const getReceivedReplies = () => {
    const received = [];
    messages.forEach((msg) => {
      const isMyPost = msg.userId === user?._id || msg.userId === user?.id;
      if (isMyPost && msg.replies && msg.replies.length > 0) {
        msg.replies.forEach((reply) => {
          // Ignore replies made by the user themselves in their own replies box
          if (reply.userId !== user?._id && reply.userId !== user?.id) {
            received.push({
              replyId: reply._id,
              postId: msg._id,
              postTitle: msg.content,
              replyAuthor: reply.userName,
              replyContent: reply.content,
              createdAt: reply.createdAt
            });
          }
        });
      }
    });
    return received.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const filteredMessages = getFilteredMessages();
  const myPosts = messages.filter((msg) => msg.userId === user?._id || msg.userId === user?.id);
  const totalLikesCount = myPosts.reduce((acc, curr) => acc + (curr.likes?.length || 0), 0);
  const totalRepliesCount = myPosts.reduce((acc, curr) => acc + (curr.replies?.length || 0), 0);
  const receivedReplies = getReceivedReplies();

  return (
    <div className="community-page-wrapper slide-in">
      {success && (
        <div className="alert alert-success floating-alert">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      {error && (
        <div className="alert alert-error floating-alert">
          <AlertCircle size={16} />
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
            👨‍🌾 2,450+ Active Farmers
          </span>
        </div>

        <div className="header-tabs-row mt-3">
          <button 
            onClick={() => setActiveTab('all')} 
            className={`tab-pill ${activeTab === 'all' ? 'active' : ''}`}
          >
            All Feed
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

      {/* Search and Category Filter section */}
      {activeTab !== 'replies' && (
        <div className="filter-and-search-container mt-4">
          <div className="search-bar-wrapper glass-card">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search posts by farmer, location, crops, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="search-clear">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="category-chips-row mt-3">
            <button
              onClick={() => setSelectedCategoryFilter('All')}
              className={`filter-chip ${selectedCategoryFilter === 'All' ? 'active' : ''}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`filter-chip ${selectedCategoryFilter === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* My Posts Statistics Card */}
      {activeTab === 'my' && (
        <div className="my-stats-dashboard mt-4 glass-card">
          <div className="stat-item">
            <span className="stat-label">Total Posts</span>
            <span className="stat-val">{myPosts.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Likes Received</span>
            <span className="stat-val">❤️ {totalLikesCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Replies</span>
            <span className="stat-val">💬 {totalRepliesCount}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="posts-feed mt-4">
        {loading ? (
          // Skeleton loading state
          <div className="skeleton-container">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="skeleton-card glass-card">
                <div className="skeleton-header">
                  <div className="skeleton-avatar"></div>
                  <div className="skeleton-meta">
                    <div className="skeleton-line short"></div>
                    <div className="skeleton-line tiny"></div>
                  </div>
                </div>
                <div className="skeleton-body mt-3">
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line medium"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'replies' ? (
          // Replies Box View
          <div className="replies-box-view">
            {receivedReplies.length > 0 ? (
              <div className="replies-box-list">
                {receivedReplies.map((item) => (
                  <div 
                    key={item.replyId} 
                    onClick={() => handleReplyClick(item.postId)}
                    className="reply-box-card glass-card hover-glow"
                  >
                    <div className="reply-box-header">
                      <span className="reply-box-author">👨‍🌾 {item.replyAuthor}</span>
                      <span className="reply-box-time">{formatTimeAgo(item.createdAt)}</span>
                    </div>
                    <p className="reply-box-text mt-2">
                      “{item.replyContent}”
                    </p>
                    <div className="reply-box-original-ref mt-2">
                      <span className="ref-label">Original Post: </span>
                      <span className="ref-snippet">
                        {item.postTitle.length > 80 ? item.postTitle.substring(0, 80) + '...' : item.postTitle}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-feed glass-card">
                <MessageSquare size={48} className="empty-icon mb-2" />
                <p>No replies received from other farmers yet.</p>
              </div>
            )}
          </div>
        ) : filteredMessages.length > 0 ? (
          // Standard Feed
          filteredMessages.map((msg) => {
            const isOwner = msg.userId === user?._id || msg.userId === user?.id;
            const hasLiked = msg.likes?.includes(user?._id) || msg.likes?.includes(user?.id);
            const isRepliesExpanded = expandedReplies[msg._id];

            return (
              <article key={msg._id} id={`post-${msg._id}`} className="post-card glass-card">
                {/* User Header Row */}
                <div className="post-user-row">
                  <div className="post-avatar">
                    <span>{(msg.userName || 'F').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="post-user-meta">
                    <div className="name-and-badge">
                      <h4>{msg.userName || 'Anonymous Farmer'}</h4>
                      {msg.category && (
                        <span className="badge category-badge">
                          {msg.category}
                        </span>
                      )}
                    </div>
                    <span className="location-time">
                      {msg.userLocation || 'Global Farmer'} · {formatTimeAgo(msg.createdAt)}
                    </span>
                  </div>

                  {/* Edit/Delete Actions for Owners */}
                  {isOwner && (
                    <div className="post-owner-actions ml-auto">
                      <button 
                        onClick={() => handleEditClick(msg)} 
                        className="btn-action-icon edit-btn" 
                        title="Edit Post"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeletePost(msg._id)} 
                        className="btn-action-icon delete-btn" 
                        title="Delete Post"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="post-body mt-3">
                  <p>{msg.content}</p>
                  {msg.imageUrl && (
                    <div className="post-image-container mt-3">
                      <img src={msg.imageUrl} alt="Uploaded post attachment" className="post-attachment-img" />
                    </div>
                  )}
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
                    <span>{msg.likes?.length || 0} Likes</span>
                  </button>

                  <button 
                    onClick={() => toggleReplies(msg._id)} 
                    className={`action-btn ${isRepliesExpanded ? 'replies-active' : ''}`}
                    title="View Replies"
                  >
                    <MessageCircle size={16} />
                    <span>{msg.replies?.length || 0} Replies</span>
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
                  <div className="replies-section-expanded mt-3 animate-fade-in">
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
            <Users size={48} className="empty-icon mb-2" />
            <p>No community posts found matching this selection. Start a new topic!</p>
          </div>
        )}
      </div>

      {/* Create / Edit Post Modal Overlay */}
      {showPostModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-card animate-scale-up">
            <div className="modal-header">
              <h3>{editingPost ? 'Edit Forum Post' : 'Create New Forum Post'}</h3>
              <button onClick={closePostModal} className="btn-close">
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-user-meta mt-2">
              <span className="modal-meta-tag">👨‍🌾 {user?.name || 'Ganesh Gidda'}</span>
              <span className="modal-meta-tag">📍 {user?.location?.address || 'Pune, Maharashtra'}</span>
            </div>

            <form onSubmit={handleCreateOrUpdatePost} className="modal-form mt-3">
              <div className="form-group mb-3">
                <label className="form-label font-bold text-sm mb-1 block">Category / Topic</label>
                <select
                  value={postCategory}
                  onChange={(e) => setPostCategory(e.target.value)}
                  className="modal-select"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group mb-3">
                <label className="form-label font-bold text-sm mb-1 block">Post Content</label>
                <textarea
                  placeholder="What is happening on your farm today? Share weather, crop observations, or ask questions to the community..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="post-textarea"
                  required
                  maxLength={500}
                  rows={4}
                ></textarea>
              </div>

              {/* Optional image attachment */}
              <div className="form-group mb-3">
                <label className="form-label font-bold text-sm mb-1 block">Attach Photo (Optional)</label>
                <div className="image-upload-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    id="post-image-file"
                    className="hidden-file-input"
                  />
                  <label htmlFor="post-image-file" className="file-upload-label">
                    <Image size={16} /> {postImage ? 'Change Image' : 'Select Image'}
                  </label>
                  {postImage && (
                    <div className="image-preview-container mt-2">
                      <img src={postImage} alt="Preview of attached file" className="preview-thumbnail" />
                      <button 
                        type="button" 
                        onClick={() => setPostImage('')} 
                        className="btn-remove-preview"
                        title="Remove Image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer mt-4">
                <button 
                  type="button" 
                  onClick={closePostModal} 
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!postContent.trim() || submittingPost}
                >
                  {submittingPost 
                    ? 'Submitting...' 
                    : (editingPost ? 'Update Post' : 'Publish Post')}
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
          padding-bottom: 80px;
          animation: fadeIn 0.4s ease-out;
        }

        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out;
        }
        .animate-scale-up {
          animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
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

        /* Search & Filter Containers */
        .filter-and-search-container {
          display: flex;
          flex-direction: column;
        }
        .search-bar-wrapper {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--border-radius-sm);
          padding: 10px 16px;
          gap: 10px;
        }
        .search-icon {
          color: var(--text-secondary);
        }
        .search-input {
          flex-grow: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 14px;
        }
        .search-input::placeholder {
          color: var(--text-secondary);
        }
        .search-clear {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .search-clear:hover {
          color: var(--text-primary);
        }

        .category-chips-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 6px;
          scrollbar-width: none; /* Firefox */
        }
        .category-chips-row::-webkit-scrollbar {
          display: none; /* Safari and Chrome */
        }
        .filter-chip {
          white-space: nowrap;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 6px 14px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .filter-chip:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }
        .filter-chip.active {
          background: #2e7d32;
          color: #ffffff;
          border-color: #2e7d32;
          box-shadow: 0 4px 8px rgba(46, 125, 50, 0.25);
        }

        /* Stats Dashboard styling */
        .my-stats-dashboard {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding: 16px 24px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--border-radius-sm);
        }
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .stat-label {
          font-size: 11px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stat-val {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          margin-top: 4px;
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
        .highlighted-post {
          border: 2px solid #2e7d32 !important;
          box-shadow: 0 8px 24px rgba(46, 125, 50, 0.25) !important;
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
        .post-user-meta {
          flex-grow: 1;
        }
        .name-and-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .post-user-meta h4 {
          color: #2c3e50;
          font-size: 16px;
          font-weight: 700;
          margin: 0;
        }
        .category-badge {
          background: #e8f5e9;
          color: #2e7d32;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid #c8e6c9;
        }
        .location-time {
          font-size: 11px;
          color: #7f8c8d;
        }

        .post-owner-actions {
          display: flex;
          gap: 4px;
        }
        .btn-action-icon {
          background: transparent;
          border: none;
          color: #95a5a6;
          padding: 6px;
          border-radius: 50%;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .btn-action-icon:hover {
          background: #f5f5f5;
        }
        .edit-btn:hover {
          color: #2e7d32;
        }
        .delete-btn:hover {
          color: #e74c3c;
        }

        .post-body p {
          font-size: 14px;
          line-height: 1.6;
          color: #4a4a4a;
          margin: 0;
        }

        .post-attachment-img {
          width: 100%;
          max-height: 350px;
          object-fit: cover;
          border-radius: var(--border-radius-sm);
          border: 1px solid rgba(0, 0, 0, 0.08);
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

        /* Replies Box Tab list styling */
        .replies-box-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .reply-box-card {
          padding: 16px 20px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .reply-box-card:hover {
          transform: translateX(4px);
        }
        .reply-box-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }
        .reply-box-author {
          font-weight: 700;
          color: var(--text-primary);
        }
        .reply-box-time {
          color: var(--text-secondary);
        }
        .reply-box-text {
          font-size: 14px;
          color: #ffffff;
          line-height: 1.5;
          font-style: italic;
        }
        .reply-box-original-ref {
          font-size: 11px;
        }
        .ref-label {
          color: var(--text-secondary);
        }
        .ref-snippet {
          color: #2e7d32;
          font-weight: 600;
        }
        
        /* Empty Feed styling */
        .empty-feed {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 45px;
          text-align: center;
          color: var(--text-secondary);
        }
        .empty-icon {
          opacity: 0.2;
        }
        
        /* Skeleton Loading Cards styling */
        .skeleton-card {
          padding: 20px;
          margin-bottom: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .skeleton-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .skeleton-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
        }
        .skeleton-meta {
          flex-grow: 1;
        }
        .skeleton-line {
          height: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          margin-bottom: 8px;
        }
        .skeleton-line:last-child {
          margin-bottom: 0;
        }
        .skeleton-line.short {
          width: 40%;
        }
        .skeleton-line.tiny {
          width: 20%;
          height: 8px;
        }
        .skeleton-line.medium {
          width: 70%;
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
          padding: 16px;
        }
        .modal-content {
          width: 100%;
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
          font-weight: 800;
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
        .modal-user-meta {
          display: flex;
          gap: 12px;
        }
        .modal-meta-tag {
          font-size: 12px;
          background: #f1f2f6;
          color: #57606f;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 600;
        }
        .modal-select {
          width: 100%;
          background: #f8f9fa;
          border: 1px solid #dcdde1;
          border-radius: var(--border-radius-sm);
          padding: 8px 12px;
          font-size: 14px;
          color: #333;
          outline: none;
        }
        .modal-select:focus {
          border-color: #2e7d32;
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

        .hidden-file-input {
          display: none;
        }
        .file-upload-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f1f2f6;
          color: #2f3542;
          font-size: 13px;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: var(--border-radius-sm);
          cursor: pointer;
          border: 1px solid #ced6e0;
          transition: var(--transition-smooth);
        }
        .file-upload-label:hover {
          background: #e4e7eb;
        }
        .image-preview-container {
          position: relative;
          display: inline-block;
        }
        .preview-thumbnail {
          height: 80px;
          width: 80px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid #ced6e0;
        }
        .btn-remove-preview {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #ff4757;
          color: #fff;
          border: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
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
