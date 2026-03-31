import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FiSearch, 
  FiPlus, 
  FiSend, 
  FiMoreVertical, 
  FiSave, 
  FiTrash2, 
  FiArrowLeft,
  FiUser,
  FiPaperclip,
  FiDownload,
  FiImage,
  FiFile,
  FiUsers,
  FiTrash,
  FiMessageSquare
} from 'react-icons/fi';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import "./DynamicChat.css"

const DynamicChat = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showChatList, setShowChatList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  
  const messagesEndRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Get auth token
  const getToken = () => localStorage.getItem('token');

  // Get current user info from JWT and localStorage
  const getCurrentUserId = () => {
    try {
      // First try to get user ID from localStorage user object
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user && user.id) {
          return String(user.id);
        }
      }
      
      // Fallback: try JWT token
      const token = getToken();
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Debug: log the payload to see what fields are available
      console.log('JWT Payload:', payload);
      
      // Try different possible ID fields
      const userId = payload.id || payload.userId || payload.sub || payload.user?.id;
      return String(userId);
    } catch (e) {
      console.error('Error getting user ID:', e);
      return null;
    }
  };

  // Get current user email for comparison
  const getCurrentUserEmail = () => {
    try {
      const token = getToken();
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub; // JWT subject is the email
    } catch (e) {
      return null;
    }
  };

  // Stable client id for presence heartbeat
  const getPresenceClientId = () => {
    let id = localStorage.getItem('presence_client_id');
    if (!id) {
      id = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
      localStorage.setItem('presence_client_id', id);
    }
    return id;
  };

  const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

  const resolveProfileImageUrl = (rawValue) => {
    if (!rawValue || typeof rawValue !== 'string') return null;
    const value = rawValue.trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value;
    if (value.startsWith('/uploads/')) return `${API_ORIGIN}${value}`;
    if (value.startsWith('/')) return `${window.location.origin}${value}`;
    return `${API_ORIGIN}/${value}`;
  };

  const getUserProfileImage = (user) => {
    if (!user) return null;
    return resolveProfileImageUrl(
      user.image || user.profileImage || user.avatar || user.photo || ''
    );
  };

  const getUserDisplayName = (user) => {
    if (!user) return 'Unknown User';

    if (user.firstName && user.firstName.trim()) {
      const fullName = `${user.firstName.trim()} ${(user.lastName || '').trim()}`.trim();
      if (fullName) return fullName;
    }

    if (user.name && user.name.trim()) return user.name.trim();

    return 'Unknown User';
  };

  const getUserInitial = (user, fallbackText = '') => {
    const name = getUserDisplayName(user);
    if (name && name !== 'Unknown User') return name[0].toUpperCase();
    return fallbackText ? fallbackText[0].toUpperCase() : '?';
  };

  // API calls
  const api = axios.create({
    baseURL: `${API_BASE_URL}/chat`,
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keep presence updated even when sidebar online counter is hidden (e.g., mobile).
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const userId = getCurrentUserId();
        const clientId = getPresenceClientId();
        if (!clientId) return;

        await fetch(`${API_BASE_URL}/presence/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ clientId, userId })
        });
      } catch (_) {
        // silent fail
      }
    };

    sendHeartbeat();
    const heartbeat = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(heartbeat);
  }, []);

  // Refresh unread counts
  const broadcastUnreadCount = (chatList) => {
    const total = (Array.isArray(chatList) ? chatList : []).reduce(
      (sum, c) => sum + (Number(c?.unreadCount) || 0),
      0
    );
    window.dispatchEvent(
      new CustomEvent('chat:unread-updated', { detail: { total } })
    );
  };

  const refreshUnreadCounts = async () => {
    try {
      const response = await api.get('/chats');
      const chatList = Array.isArray(response.data) ? response.data : [];
      setChats(chatList);
      broadcastUnreadCount(chatList);
      return chatList;
    } catch (error) {
      console.error('Failed to refresh unread counts:', error);
      return [];
    }
  };

  // Load chats on component mount and set up periodic refresh
  useEffect(() => {
    loadChats();
    
    // Refresh unread counts frequently for near real-time updates
    const interval = setInterval(refreshUnreadCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const location = useLocation();

  // Load all chats
  const loadChats = async () => {
    try {
      const response = await api.get('/chats');
      const chatsData = Array.isArray(response.data) ? response.data : [];
      setChats(chatsData);
      broadcastUnreadCount(chatsData);
      
      // Check if we should auto-open a chat from location state
      const targetUserId = location.state?.targetUserId;
      if (targetUserId) {
        // Look for existing chat with this user
        const currentUserId = getCurrentUserId();
        const existingChat = chatsData.find(chat => 
          chat.chatType === 'private' && 
          chat.participants.some(p => String(p._id) === String(targetUserId))
        );
        
        if (existingChat) {
          setSelectedChat(existingChat);
          loadMessages(existingChat._id);
          if (isMobile) setShowChatList(false);
        } else {
          // If no existing chat, create one
          createChat(targetUserId);
        }
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  // Load messages for selected chat
  const loadMessages = async (chatId) => {
    try {
      setLoading(true);
      const response = await api.get(`/messages/${chatId}`);
      setMessages(Array.isArray(response.data) ? response.data : []);
      
      // Mark messages as read
      await api.post('/mark-read', { chatId });
      // Optimistically zero unread for this chat in sidebar
      setChats(prev => {
        const updated = prev.map(c => c._id === String(chatId) ? { ...c, unreadCount: 0 } : c);
        broadcastUnreadCount(updated);
        return updated;
      });
      // Sync with backend (ensures sidebar reflects latest counts)
      await refreshUnreadCounts();
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search users
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/search-users?query=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!showNewChat) {
      setShowSearchPopup(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [showNewChat]);

  // Create new chat
  const createChat = async (participantId) => {
    try {
      const response = await api.post('/create-chat', { participantId });
      const newChat = response.data;
      
      // Update chats list
      setChats(prev => {
        const exists = prev.find(chat => chat._id === newChat._id);
        if (exists) return prev;
        return [newChat, ...prev];
      });
      
      // Select the new chat
      setSelectedChat(newChat);
      setShowNewChat(false);
      setSearchQuery('');
      setSearchResults([]);
      
      // Load messages
      loadMessages(newChat._id);
      
      if (isMobile) {
        setShowChatList(false);
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const response = await api.post('/send-message', {
        chatId: selectedChat._id,
        text: newMessage
      });
      
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      
      // Update chat's last message and refresh unread counts
      setChats(prev => prev.map(chat => 
        chat._id === selectedChat._id 
          ? { ...chat, lastMessage: response.data, lastActivity: new Date() }
          : chat
      ));
      
      // Refresh unread counts for all chats
      setTimeout(refreshUnreadCounts, 500);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Toggle save message
  const toggleSaveMessage = async (messageId) => {
    try {
      const response = await api.post('/toggle-save-message', { messageId });
      
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, isSaved: response.data.savedByUser }
          : msg
      ));
      
      setShowMessageOptions(null);
    } catch (error) {
      console.error('Failed to toggle save message:', error);
    }
  };

  // Handle file selection (show preview)
  const handleFileSelection = (file) => {
    if (!selectedChat || !file) return;
    
    // Check file size (1MB limit)
    if (file.size > 1024 * 1024) {
      alert('File size must be less than 1MB');
      return;
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed');
      return;
    }
    
    // Create file preview
    const preview = {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      isImage: file.type.startsWith('image/'),
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    };
    
    setFilePreview(preview);
    setShowFilePreview(true);
  };
  
  // Handle file upload after confirmation
  const handleFileUpload = async () => {
    if (!filePreview) return;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', filePreview.file);
      formData.append('chatId', selectedChat._id);
      
      const response = await api.post('/upload-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${getToken()}`
        }
      });
      
      setMessages(prev => [...prev, response.data]);
      scrollToBottom();
      
      // Refresh chat list to update last message
      refreshUnreadCounts();
      
      // Close preview
      closeFilePreview();
      
    } catch (error) {
      console.error('Failed to upload file:', error);
      
      let errorMessage = 'Failed to upload file. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };
  
  // Close file preview
  const closeFilePreview = () => {
    if (filePreview?.url) {
      URL.revokeObjectURL(filePreview.url);
    }
    setFilePreview(null);
    setShowFilePreview(false);
  };
  
  // Delete file message
  const deleteFileMessage = async (messageId) => {
    try {
      await api.delete(`/delete-file/${messageId}`);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      setShowMessageOptions(null);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };
  
  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    try {
      await api.delete(`/delete-message/${messageId}`);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      setShowMessageOptions(null);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Delete entire chat
  const deleteChat = async (chatId) => {
    if (!window.confirm('Are you sure you want to delete this entire chat? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.delete(`/delete-chat/${chatId}`);
      
      // Remove chat from list
      setChats(prev => prev.filter(chat => chat._id !== chatId));
      
      // Clear selected chat if it was the deleted one
      if (selectedChat?._id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }
      
      if (isMobile) {
        setShowChatList(true);
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  // Format time helper
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (lastSeenEpochMs) => {
    if (!lastSeenEpochMs) return 'Offline';
    const now = Date.now();
    const diff = Math.max(0, now - Number(lastSeenEpochMs));
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Last seen just now';
    if (minutes < 60) return `Last seen ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Last seen ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Last seen ${days}d ago`;
  };

  const getDirectChatPresenceText = (chat) => {
    if (!chat || chat.chatType === 'group') return '';
    const meId = getCurrentUserId();
    const other = chat.participants?.find(p => String(p._id) !== String(meId));
    if (!other) return 'Offline';
    if (other.isOnline === true) return 'Online';
    return formatLastSeen(other.lastSeen);
  };

  // Format file size helper
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get chat display name
  const getChatDisplayName = (chat, currentUserId) => {
    if (chat.chatType === 'group') {
      return chat.chatName || 'Group Chat';
    }
    
    // Debug: log the participants and current user ID
    console.log('Chat participants:', chat.participants);
    console.log('Current user ID:', currentUserId);
    
    const currentUserEmail = getCurrentUserEmail();
    console.log('Current user email:', currentUserEmail);
    
    // Try to find other participant by ID first, then by email
    let otherParticipant = chat.participants.find(p => String(p._id) !== String(currentUserId));
    
    // If ID comparison fails, try email comparison
    if (!otherParticipant && currentUserEmail) {
      otherParticipant = chat.participants.find(p => p.email !== currentUserEmail);
    }
    
    console.log('Other participant found:', otherParticipant);
    
    return getUserDisplayName(otherParticipant);
  };

  // Get user role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return '#dc3545';
      case 'recruiter': return '#28a745';
      case 'candidate': return '#007bff';
      default: return '#6c757d';
    }
  };

  const activeSelectedChat = selectedChat
    ? (chats.find(c => String(c._id) === String(selectedChat._id)) || selectedChat)
    : null;

  return (
    <div className="chat-container">
      

      {/* Sidebar */}
      <div className={`chat-sidebar ${isMobile && !showChatList ? 'hidden' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            <button 
              className="new-chat-btn"
              onClick={() => setShowNewChat(!showNewChat)}
            >
              <FiPlus size={14} />
              New Chat
            </button>
          </div>
          
          {showNewChat && (
            <div className="search-box">
              <input
                type="text"
                className="search-input"
                placeholder="Search users..."
                value={searchQuery}
                onFocus={() => setShowSearchPopup(true)}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  setShowSearchPopup(!!value.trim());
                }}
              />
              <FiSearch className="search-icon" size={16} />
            </div>
          )}
        </div>

        <div className="chat-list">
          {(Array.isArray(chats) ? chats : []).map(chat => {
            const currentUserId = getCurrentUserId();
            const displayName = getChatDisplayName(chat, currentUserId);
            const otherParticipant = chat.participants.find(p => String(p._id) !== String(currentUserId));
            const otherProfileImage = getUserProfileImage(otherParticipant);
            
            return (
              <div
                key={chat._id}
                className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedChat(chat);
                  loadMessages(chat._id);
                  if (isMobile) setShowChatList(false);
                }}
              >
                <div 
                  className="chat-avatar"
                  style={{
                    backgroundImage: otherProfileImage ? `url(${otherProfileImage})` : 'none',
                    backgroundColor: otherProfileImage ? 'transparent' : '#007bff',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {!otherProfileImage && getUserInitial(otherParticipant, displayName)}
                  {chat.unreadCount > 0 && (
                    <div className="unread-badge">
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </div>
                  )}
                </div>
                <div className="chat-info">
                  <div className="chat-name">
                    {displayName}
                    {otherParticipant && otherParticipant.role && (
                      <span 
                        className="role-badge"
                        style={{ backgroundColor: getRoleBadgeColor(otherParticipant.role) }}
                      >
                        {otherParticipant.role}
                      </span>
                    )}
                  </div>
                  <div className="chat-preview">
                    {chat.lastMessage?.text || 'Start a conversation...'}
                  </div>
                </div>
                <div className="chat-time">
                  {chat.lastActivity && formatTime(chat.lastActivity)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showNewChat && showSearchPopup && searchQuery.trim() && (
        <div className="search-popup-backdrop" onClick={() => setShowSearchPopup(false)}>
          <div className="search-popup" onClick={(e) => e.stopPropagation()}>
            <div className="search-popup-header">
              <span>Search Results</span>
              <button
                type="button"
                className="search-popup-close"
                onClick={() => setShowSearchPopup(false)}
                aria-label="Close search results"
              >
                x
              </button>
            </div>

            <div className="search-results in-popup">
              {searchResults.length > 0 ? searchResults.map(user => {
                const displayName = getUserDisplayName(user);
                const detailText = user.role ? `${user.role} profile` : 'Platform profile';
                const searchUserImage = getUserProfileImage(user);

                return (
                  <div
                    key={user._id}
                    className="search-result"
                    onClick={() => {
                      createChat(user._id);
                      setShowSearchPopup(false);
                    }}
                  >
                    <div
                      className="chat-avatar"
                      style={{
                        width: '35px',
                        height: '35px',
                        backgroundImage: searchUserImage ? `url(${searchUserImage})` : 'none',
                        backgroundColor: searchUserImage ? 'transparent' : '#007bff',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {!searchUserImage && getUserInitial(user, displayName)}
                    </div>
                    <div className="search-user-info">
                      <div className="search-user-name" title={displayName}>
                        {displayName}
                      </div>
                      <div className="search-user-details" title={detailText}>
                        {detailText}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="search-result" style={{ justifyContent: 'center', color: '#6c757d', cursor: 'default' }}>
                  <FiUser size={16} />
                  No users found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className={`chat-main ${isMobile && showChatList ? 'hidden' : ''}`}>
        {activeSelectedChat ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              {isMobile && (
                <button 
                  className="back-btn icon-btn header-icon"
                  onClick={() => setShowChatList(true)}
                  aria-label="Back"
                >
                  <FiArrowLeft size={18} />
                </button>
              )}
              <div 
                className="chat-avatar"
                style={{
                  backgroundImage: (() => {
                    const meId = getCurrentUserId();
                    const other = activeSelectedChat.participants.find(p => String(p._id) !== String(meId));
                    const otherImage = getUserProfileImage(other);
                    return otherImage ? `url(${otherImage})` : 'none';
                  })(),
                  backgroundColor: (() => {
                    const meId = getCurrentUserId();
                    const other = activeSelectedChat.participants.find(p => String(p._id) !== String(meId));
                    return getUserProfileImage(other) ? 'transparent' : '#007bff';
                  })(),
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {(() => {
                  const meId = getCurrentUserId();
                  const other = activeSelectedChat.participants.find(p => String(p._id) !== String(meId));
                  const otherHasImage = getUserProfileImage(other);
                  return !otherHasImage && getUserInitial(other, getChatDisplayName(activeSelectedChat, meId));
                })()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>
                  {getChatDisplayName(activeSelectedChat, getCurrentUserId())}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                  {activeSelectedChat.chatType === 'group'
                    ? `${activeSelectedChat.participants.length} members`
                    : getDirectChatPresenceText(activeSelectedChat)}
                </div>
              </div>
              <button
                className="icon-btn header-icon danger"
                onClick={() => deleteChat(activeSelectedChat._id)}
                title="Delete Chat"
                aria-label="Delete Chat"
              >
                <FiTrash size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="messages-container">
              {loading ? (
                <div className="loading">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="empty-state">
                  <FiUsers size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                (Array.isArray(messages) ? messages : []).map(message => {
                  const currentUserId = getCurrentUserId();
                  const currentUserEmail = getCurrentUserEmail();
                  
                  // Try ID comparison first, then email comparison
                  let isOwn = String(message.sender._id) === String(currentUserId);
                  if (!isOwn && currentUserEmail) {
                    isOwn = message.sender.email === currentUserEmail;
                  }
                  
                  // Debug: log message sender info
                  console.log('Message sender:', message.sender);
                  console.log('Current user ID:', currentUserId);
                  console.log('Current user email:', currentUserEmail);
                  console.log('Is own message:', isOwn);
                  const senderProfileImage = getUserProfileImage(message.sender);
                  const senderName = getUserDisplayName(message.sender);
                  
                  return (
                    <div
                      key={message._id}
                      className={`message ${isOwn ? 'own' : ''}`}
                      onClick={() => setShowMessageOptions(
                        showMessageOptions === message._id ? null : message._id
                      )}
                    >
                      {/* Profile Picture for other users */}
                      {!isOwn && (
                        <div 
                          className="message-avatar"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            marginRight: '8px',
                            flexShrink: 0,
                            backgroundImage: senderProfileImage ? `url(${senderProfileImage})` : 'none',
                            backgroundColor: senderProfileImage ? 'transparent' : '#007bff',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}
                        >
                          {!senderProfileImage && (senderName[0]?.toUpperCase() || '?')}
                        </div>
                      )}
                      <div className="message-content">
                        <div className="message-bubble">
                          {message.messageType === 'image' && message.attachment ? (
                            <div className="image-message">
                              <img 
                                src={message.attachment.url} 
                                alt={message.attachment.fileName}
                                onClick={() => window.open(message.attachment.url, '_blank')}
                                style={{ cursor: 'pointer' }}
                              />
                              {message.text && (
                                <div style={{ padding: '8px 0 0 0', fontSize: '14px' }}>
                                  {message.text}
                                </div>
                              )}
                            </div>
                          ) : message.messageType === 'file' && message.attachment ? (
                            <div className="file-message">
                              <div className="file-icon">
                                <FiFile size={16} />
                              </div>
                              <div className="file-info">
                                <div className="file-name">{message.attachment.fileName}</div>
                                <div className="file-size">
                                  {formatFileSize(message.attachment.fileSize)}
                                </div>
                              </div>
                              <button 
                                className="file-download"
                                onClick={() => window.open(message.attachment.url, '_blank')}
                              >
                                <FiDownload size={12} />
                                Download
                              </button>
                            </div>
                          ) : (
                            message.text
                          )}
                          {message.isSaved && (
                            <div className="saved-indicator">
                              <FiSave size={8} />
                            </div>
                          )}
                        </div>
                        <div className="message-time">
                          {formatTime(message.createdAt)}
                        </div>
                        
                        {showMessageOptions === message._id && (
                          <div className="message-options">
                            <button
                              className="option-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSaveMessage(message._id);
                              }}
                              title={message.isSaved ? 'Unsave' : 'Save'}
                            >
                              <FiSave size={14} color={message.isSaved ? '#28a745' : '#6c757d'} />
                            </button>
                            {isOwn && (
                              <button
                                className="option-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (message.attachment) {
                                    deleteFileMessage(message._id);
                                  } else {
                                    deleteMessage(message._id);
                                  }
                                }}
                                title="Delete"
                              >
                                <FiTrash2 size={14} color="#dc3545" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="message-input">
              <form className="input-form" onSubmit={sendMessage}>
                <button
                  type="button"
                  className="attachment-btn"
                  onClick={triggerFileInput}
                  disabled={uploading}
                  title="Upload file (max 1MB)"
                >
                  {uploading ? '...' : <FiPaperclip size={18} />}
                </button>
                <input
                  type="text"
                  className="text-input"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                  type="submit"
                  className="send-btn"
                  disabled={!newMessage.trim()}
                >
                  <FiSend size={18} />
                </button>
              </form>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    handleFileSelection(file);
                    e.target.value = ''; // Reset input
                  }
                }}
              />
            </div>
          </>
        ) : (
          <div className="empty-state">
            <FiUsers size={64} style={{ marginBottom: '20px', opacity: 0.3 }} />
            <h3 style={{ margin: '0 0 10px 0', color: '#6c757d' }}>Welcome to Messages</h3>
            <p style={{ margin: 0, opacity: 0.7 }}>Select a chat to start messaging</p>
          </div>
        )}
      </div>
      
      {/* File Preview Modal */}
      {showFilePreview && filePreview && (
        <div className="file-preview-overlay" onClick={closeFilePreview}>
          <div className="file-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="file-preview-header">
              <h3 className="file-preview-title">Send File</h3>
              <button className="close-preview-btn" onClick={closeFilePreview}>
                ×
              </button>
            </div>
            
            <div className="file-preview-content">
              {filePreview.isImage ? (
                <img 
                  src={filePreview.url} 
                  alt={filePreview.name}
                  className="preview-image"
                />
              ) : (
                <div className="preview-file-info">
                  <div className="preview-file-icon">
                    <FiFile size={32} />
                  </div>
                  <div className="preview-file-details">
                    <div className="preview-file-name">{filePreview.name}</div>
                    <div className="preview-file-size">{formatFileSize(filePreview.size)}</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="file-preview-actions">
              <button 
                className="preview-btn cancel-btn" 
                onClick={closeFilePreview}
                disabled={uploading}
              >
                Cancel
              </button>
              <button 
                className="preview-btn send-file-btn" 
                onClick={handleFileUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>Sending...</>
                ) : (
                  <>
                    <FiSend size={16} />
                    Send File
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicChat;
