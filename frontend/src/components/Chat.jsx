import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';
import { API_BASE_URL } from '../config';

const Chat = ({ roomCode, username, messages = [], newMessage = '', setNewMessage, handleSendMessage, isOpen, setIsOpen, ws }) => {
  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const API_URL = API_BASE_URL;

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history when component mounts
  // Chat history loading is handled in the parent VideoCall component

  // WebSocket message handling is done in the parent VideoCall component

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !ws) return;

    const chatMessage = {
      type: 'chat',
      roomCode: roomCode,
      username: username,
      message: newMessage.trim()
    };

    ws.send(JSON.stringify(chatMessage));
    setNewMessage('');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    // If timestamp is not a Date object, try to convert it
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isOwnMessage = (messageUsername) => {
    return messageUsername === username;
  };

  // Handle click outside to close chat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatContainerRef.current && !chatContainerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  return (
    <div 
      ref={chatContainerRef}
      className={`video-chat-container ${isOpen ? 'open' : ''}`}
    >
      {/* Chat Panel */}
      {isOpen && (
        <div className="video-chat-panel">
          <div className="video-chat-header">
            <button 
              className="video-mobile-back-btn" 
              onClick={() => setIsOpen(false)}
              title="Close Chat"
            >
              ✕
            </button>
            <h3>Chat</h3>
          </div>

          <div className="video-chat-messages">
            {(!messages || messages.length === 0) ? (
              <div className="video-no-messages">
                <p>💬 No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`video-message ${isOwnMessage(msg.username) ? 'own' : 'other'}`}
                >
                  <div className="video-message-info">
                    <span className="video-username">{msg.username}</span>
                    <span className="video-timestamp">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="video-message-content">
                    {msg.message}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="video-chat-input-form" onSubmit={sendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              maxLength={500}
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="video-send-btn"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chat;
