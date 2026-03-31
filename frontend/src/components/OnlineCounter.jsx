import React, { useState, useEffect } from 'react';
import { FaEye } from 'react-icons/fa';
import './OnlineCounter.css';
import { API_BASE_URL } from '../config';

const OnlineCounter = () => {
  const [onlineCount, setOnlineCount] = useState(0);
  const [hovered, setHovered] = useState(false);

  // Stable client id in localStorage
  const getClientId = () => {
    let id = localStorage.getItem('presence_client_id');
    if (!id) {
      id = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
      localStorage.setItem('presence_client_id', id);
    }
    return id;
  };

  useEffect(() => {
    const getCurrentUserId = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          if (user && user.id) return String(user.id);
        }
      } catch (_) {
        // ignore
      }
      return null;
    };

    // Function to fetch online count from backend
    const fetchOnlineCount = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/presence/count`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data?.count === 'number') setOnlineCount(data.count);
      } catch (_) {
        // silent fail
      }
    };

    // Function to update user's online status
    const updateOnlineStatus = async (_status) => {
      try {
        const clientId = getClientId();
        await fetch(`${API_BASE_URL}/presence/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ clientId, userId: getCurrentUserId() })
        });
      } catch (_) {
        // ignore
      }
    };

    // Set user as online when component mounts
    updateOnlineStatus('online');
    
    // Initial fetch
    fetchOnlineCount();

    // Set up interval to fetch count every 15 seconds
    const interval = setInterval(fetchOnlineCount, 15000);

    // Set up heartbeat to keep user online every 30 seconds
    const heartbeat = setInterval(() => {
      updateOnlineStatus('online');
    }, 30000);

    // Handle beforeunload (user leaving page)
    const handleBeforeUnload = () => {
      updateOnlineStatus('offline');
    };

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      clearInterval(interval);
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateOnlineStatus('offline');
    };
  }, []);

  return (
    <div
      className="online-counter-simple collapsed"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Online ${onlineCount}`}
    >
      <FaEye className="online-eye" />
      {hovered && (
        <div className="online-tooltip">
          <span className="online-tooltip-text">Online {onlineCount}</span>
        </div>
      )}
    </div>
  );
};

export default OnlineCounter;
