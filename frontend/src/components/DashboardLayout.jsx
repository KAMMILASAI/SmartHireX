import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiLogOut, FiBell, FiUser, FiX, FiHome, FiMessageSquare, FiBriefcase, FiUsers } from 'react-icons/fi';
/* removed theme toggle icons */
import axios from 'axios';
import { API_BASE_URL } from '../config';
import OnlineCounter from './OnlineCounter';
import './DashboardLayout.css';
import './NotificationDrawer.css';

function getUsername() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return '';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.firstName || payload.email || 'User';
  } catch {
    return 'User';
  }
}

function getUserRole() {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      const raw = (user.role || '').toLowerCase();
      return raw.startsWith('role_') ? raw.substring(5) : raw || 'candidate';
    }
    return 'candidate';
  } catch {
    return 'candidate';
  }
}

function getUserEmail() {
  try {
    // First try to get email from user object in localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user && user.email) {
          return user.email;
        }
      } catch (e) {
        console.warn('Error parsing user data from localStorage:', e);
      }
    }
    
    // Fallback to checking token if user data not found
    const token = localStorage.getItem('token');
    if (!token) return '';
    
    try {
      // Try to decode the token as a last resort
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      ));
      
      return payload.email || payload.sub || payload.userEmail || '';
    } catch (e) {
      console.warn('Error decoding token:', e);
      return '';
    }
  } catch (error) {
    console.error('Error getting user email:', error);
    return '';
  }
}

function formatDateSafe(dt) {
  if (!dt) return '-';
  const ms = Date.parse(dt);
  if (isNaN(ms)) return '-';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return '-';
  }
}

export default function DashboardLayout({ children, menuItems }) {
  const APP_VERSION = `v${import.meta.env.VITE_APP_VERSION || '0.0.0'}`;
  const defaultMenu = [
    { label: 'Dashboard', path: '/dashboard' },
  ];
  menuItems = menuItems || defaultMenu;
  const userRole = getUserRole();
  const showVersionFooter = true;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [username, setUsername] = useState('');
  const [profileImg, setProfileImg] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').image || null; } catch { return null; }
  });
  const [profileName, setProfileName] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || '';
    } catch { return ''; }
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState(null);
  const [notifCount, setNotifCount] = useState(0);
  // removed theme mode state
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef(null);

  // Dynamically derive notification count from unread items
  useEffect(() => {
    const unread = notifications.filter(n => !n.isRead).length;
    console.log('useEffect: Updating notification count to:', unread); // Debug log
    setNotifCount(unread);
  }, [notifications]);

  useEffect(() => {
    const name = getUsername();
    setUsername(name);
    setProfileName(name);
    
    // Fetch profile data
    async function fetchProfile() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Always use the unified profile endpoint
        const profileEndpoint = `${API_BASE_URL}/user/profile`;
        
        // Fetch profile data
        const profileRes = await axios.get(profileEndpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Update profile image and name if available
        if (profileRes.data) {
          if (profileRes.data.image) {
            setProfileImg(profileRes.data.image);
          }
          if (profileRes.data.name) {
            // Clean the name to avoid duplication
            const cleanName = profileRes.data.name.split(' ').filter((part, index, arr) => 
              arr.indexOf(part) === index // Remove duplicate words
            ).join(' ');
            setProfileName(cleanName);
            setUsername(cleanName);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Fallback: read name from localStorage user object
        try {
          const stored = localStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            const fallbackName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim();
            if (fallbackName) { setProfileName(fallbackName); setUsername(fallbackName); }
          }
        } catch (_) {}
      }
    }
    
    fetchProfile();
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Track viewport for mobile-specific UI
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Show/hide bottom nav on scroll of the main container (mobile only)
  const [bottomVisible, setBottomVisible] = useState(true);
  useEffect(() => {
    if (!isMobile) { setBottomVisible(true); return; }

    const el = mainRef.current || window;
    let getScroll = () => (mainRef.current ? mainRef.current.scrollTop : window.scrollY);

    let lastY = getScroll();
    let ticking = false;
    let lastScrollTime = 0;
    const SCROLL_THROTTLE = 100; // ms

    const updateVisibility = () => {
      const y = getScroll();
      const goingDown = y > lastY;
      // Keep it visible near top; otherwise hide on down, show on up
      if (y < 80 || !goingDown) {
        setBottomVisible(true);
      } else {
        setBottomVisible(false);
      }
      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      const now = Date.now();
      if (now - lastScrollTime < SCROLL_THROTTLE) return;
      lastScrollTime = now;
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateVisibility);
    };

    // Attach listener to the actual scrolling element
    (mainRef.current ? mainRef.current : window).addEventListener('scroll', onScroll, { passive: true });

    return () => {
      (mainRef.current ? mainRef.current : window).removeEventListener('scroll', onScroll);
    };
  }, [isMobile]);

  // removed theme body class effect

  // Notification Skeleton Loader Component
  const NotificationSkeleton = () => (
    <div className="notif-card">
      <div className="skeleton" style={{ width: '70%', height: '1.2rem', marginBottom: '0.5rem' }}></div>
      <div className="skeleton" style={{ width: '90%', height: '0.9rem', marginBottom: '0.8rem' }}></div>
      <div className="skeleton" style={{ width: '40%', height: '0.8rem' }}></div>
    </div>
  );

  // Enhanced fetch with retry and backoff
  const fetchWithRetry = async (fn, retries = 3, delay = 1000) => {
    try {
      const response = await fn();
      // If response status indicates an error, throw to trigger retry
      if (response?.status >= 400) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      console.warn(`Attempt ${4 - retries}/3 failed:`, error.message);
      if (retries === 0) {
        console.error('All retry attempts failed');
        throw error;
      }
      // Exponential backoff with jitter
      const backoff = delay * (0.5 + Math.random() * 0.5);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(fn, retries - 1, Math.min(delay * 2, 10000)); // Max 10s delay
    }
  };

  // Notifications
  const fetchNotifications = async () => {
    try {
      if (notifOpen) {
        setNotifLoading(true);
        setNotifError(null);
      }
      
      const token = localStorage.getItem('token');
      const userEmail = getUserEmail();
      
      console.log('Token exists:', !!token); // Debug log
      console.log('User email:', userEmail); // Debug log
      
      if (!token || !userEmail) {
        console.warn('Missing token or email, cannot fetch notifications'); // Debug log
        setNotifLoading(false);
        return;
      }

      // Use Promise.all to fetch read IDs and notifications in parallel
      const [readResponse, notificationsResponse] = await Promise.all([
        fetchWithRetry(() => 
          axios.get(`${API_BASE_URL}/notifications/read-ids?email=${encodeURIComponent(userEmail)}`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          .catch(error => {
            console.warn('Failed to fetch read notification IDs, using empty array', error);
            return { data: [] }; // Return empty array on error
          })
        ),
        
        fetchWithRetry(() => {
          const role = getUserRole();
          console.log('Fetching notifications for role:', role); // Debug log
          return axios.get(`${API_BASE_URL}/notifications?audience=${encodeURIComponent(role)}`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          .catch(error => {
            console.error('Failed to fetch notifications:', error.response?.status, error.response?.data || error.message);
            // If /notifications endpoint fails, try admin endpoint as fallback for testing
            if (error.response?.status === 404) {
              console.log('Trying admin endpoint as fallback...');
              return axios.get(`${API_BASE_URL}/admin/notifications?audience=${encodeURIComponent(role)}`, {
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }).catch((adminError) => {
                console.error('Admin endpoint also failed:', adminError.response?.status);
                // If both endpoints fail, return empty notifications
                console.log('All notification endpoints failed, showing empty state');
                return { data: [] };
              });
            }
            return { data: [] }; // Return empty array on error
          });
        })
      ]);

      const readIds = Array.isArray(readResponse.data) 
        ? readResponse.data.map(id => Number(id)) 
        : [];

      const notificationsData = Array.isArray(notificationsResponse.data)
        ? notificationsResponse.data
        : [];
      
      console.log('Raw notifications data:', notificationsData); // Debug log
      console.log('Read IDs:', readIds); // Debug log
      
      // Process notifications and mark read status
      const processedNotifications = notificationsData.map(notification => {
        const id = Number(notification.id || notification._id);
        return {
          ...notification,
          _id: id,
          id: id, // Ensure both _id and id are set
          isRead: readIds.includes(id)
        };
      });
      
      // Sort by created date (newest first)
      processedNotifications.sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      
      console.log('Processed notifications:', processedNotifications); // Debug log
      console.log('Unread count:', processedNotifications.filter(n => !n.isRead).length); // Debug log
      
      setNotifications(processedNotifications);
      // Count will be automatically updated by useEffect
      
    } catch (e) {
      console.error('Notification fetch error:', e);
      setNotifError('Failed to load notifications. Please try again later.');
      setNotifications([]);
      setNotifCount(0);
    } finally {
      if (notifOpen) setNotifLoading(false);
    }
  };

  // Fetch when drawer opens
  useEffect(() => {
    if (notifOpen) {
      fetchNotifications();
    }
  }, [notifOpen]);

  // Background fetch on mount and every 30s to keep count in sync
  useEffect(() => {
    fetchNotifications(); // initial
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, []);

  // Handle navigation for menu items
  const handleNavigation = (item) => {
    if (item.type === 'logout') {
      handleLogout();
    } else if (item && item.path) {
      const path = typeof item.path === 'string' ? item.path : '';
      if (path.startsWith('http')) {
        window.open(path, '_blank');
      } else {
        // Ensure path starts with a slash for proper navigation
        const navPath = path.startsWith('/') ? path : `/${path}`;
        navigate(navPath);
      }
      
      // Close mobile menu after navigation
      if (isMobile) {
        setSidebarOpen(false);
      }
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  // Mark notification as read
  const markAsRead = async (id) => {
    const notification = notifications.find(n => n._id === id);
    if (!notification || notification.isRead) return;
    
    // Optimistic update
    const originalNotifications = [...notifications];
    setNotifications(prev => 
      prev.map(n => n._id === id ? { ...n, isRead: true } : n)
    );
    
    try {
      const token = localStorage.getItem('token');
      const userEmail = getUserEmail();
      
      if (!token || !userEmail) {
        throw new Error('Authentication required');
      }
      
      // Use fetchWithRetry for better reliability
      await fetchWithRetry(async () => {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/notifications/${id}/read?email=${encodeURIComponent(userEmail)}`,
            {},
            {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              withCredentials: true
            }
          );
          
          // Count will be automatically updated by useEffect when notifications state changes
          return response;
        } catch (error) {
          console.error('Error marking notification as read:', error);
          console.error('Error details:', error.response?.data);
          // If endpoint doesn't exist (404), don't retry - just log and continue
          if (error.response?.status === 404) {
            console.warn('Mark as read endpoint not available - notification will remain marked as read locally only');
            throw error;
          }
          // For 500 errors, log the detailed error but still retry
          if (error.response?.status === 500) {
            console.error('Server error details:', error.response.data);
          }
          throw error; // Re-throw to trigger retry for other errors
        }
      }, 2, 1000); // 2 retries with 1s delay
      
    } catch (error) {
      console.error('Failed to mark notification as read after retries:', error);
      
      // For 500 errors (server issues), keep the local change but warn user
      if (error.response?.status === 500) {
        console.warn('Server error - keeping notification marked as read locally only');
        setNotifError('Notification marked as read locally. Server sync failed.');
        // Don't revert the optimistic update - keep it marked as read locally
        return;
      }
      
      // For other errors, revert the optimistic update
      setNotifications(originalNotifications);
      setNotifError('Failed to mark notification as read. Please try again.');
    }
  };

  // Filter menu items based on user role and mobile view
  let filteredMenu;
  if (isMobile) {
    const baseMenu = (Array.isArray(menuItems) ? menuItems : []).filter(mi => {
      // For candidates, filter out unwanted items
      if (!mi || typeof mi !== 'object') return false;
      const label = String(mi.label || '').toLowerCase();
      return !(label.includes('practice') || label.includes('partices') || label.includes('payment') || label.includes('resume'));
    });
    
    // Keep mobile menu focused on navigation only
    filteredMenu = baseMenu;
  } else {
    // For desktop view, show all items
    filteredMenu = Array.isArray(menuItems) ? [...menuItems] : [];
  }

  // Bottom nav items - always icon-only for all roles
  const bottomMenu = useMemo(() => {
    if (!isMobile) return [];

    // Only include the main navigation items, no exit button
    return (filteredMenu || []).map(item => ({
      ...item,
      label: '' // Remove text label for all items
    }));
  }, [filteredMenu, isMobile]);

  // Active index for animated indicator (do not activate on logout)
  const activeIndex = useMemo(() => {
    const idx = filteredMenu.findIndex(item => typeof item?.path === 'string' && (location.pathname === item.path || location.pathname.startsWith(item.path + '/')));
    return idx >= 0 ? idx : 0;
  }, [filteredMenu, location.pathname]);

  return (
    <div className="dashboard-root">
      <header className="dashboard-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem 0.5rem 1rem', height: '65px'}}>
        {/* Left: Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img 
            src="/SmarthireX-logo.jpeg" 
            alt="" 
            style={{ 
              height: '65px',
              width: '65px', 
              display: 'block',
              objectFit: 'cover',
              borderRadius: '50%',
              backgroundColor: '#1a2332',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              filter: 'brightness(1.1) contrast(1.2)'
            }}
          />
          <div style={{
            fontSize: '30px',
            fontWeight: '700',
            margin: 0,
            background: 'linear-gradient(90deg, #0d47a1 0%, #1565c0 30%, #1976d2 60%, #42a5f5 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '1px',
            lineHeight: '1.2'
          }}>
            SmartHireX
          </div>
        </div>
        {/* Right: Welcome, username, notification, profile pic */}
        <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
          <span style={{ fontSize: 18 }}>Welcome, <b>{profileName || username || 'User'}</b></span>
          <div style={{position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer'}} onClick={() => setNotifOpen(prev => !prev)}>
            <FiBell size={24} />
            {notifCount > 0 && <span style={{
              position: 'absolute',
              top: -6,
              right: -6,
              background: '#0dcaf0',
              color: '#fff',
              borderRadius: '50%',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 'bold',
              boxShadow: '0 0 2px #0002'
            }}>{notifCount}</span>}
          </div>
          <div ref={profileDropdownRef} style={{ position: 'relative' }}>
            <div
              onClick={() => setProfileDropdownOpen(prev => !prev)}
              style={{ width: 40, height: 40, borderRadius: '50%', background: '#eee', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0dcaf0', cursor: 'pointer' }}
            >
              {profileImg ? (
                <img src={profileImg} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <FiUser size={28} style={{ color: '#bbb' }} />
              )}
            </div>
            {profileDropdownOpen && (
              <div style={{
                position: 'absolute', top: 48, right: 0, background: '#1a2236', border: '1px solid #2d3a52',
                borderRadius: 10, minWidth: 200, boxShadow: '0 8px 32px #0006', zIndex: 9999, overflow: 'hidden'
              }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #2d3a52' }}>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: 15 }}>{profileName || username || 'User'}</div>
                  <div style={{ color: '#8899aa', fontSize: 12, marginTop: 2 }}>{(() => { try { const t = localStorage.getItem('token'); if (!t) return ''; const p = JSON.parse(atob(t.split('.')[1])); return p.sub || p.email || ''; } catch { return ''; } })()}</div>
                </div>
                <button
                  onClick={() => { 
                    setProfileDropdownOpen(false); 
                    const role = getUserRole();
                    if (role === 'recruiter') navigate('/recruiter/edit-profile');
                    else if (role === 'admin') navigate('/admin/edit-profile');
                    else navigate('/candidate/edit-profile'); 
                  }}
                  style={{ width: '100%', padding: '11px 16px', background: 'none', border: 'none', color: '#c9d6e3', textAlign: 'left', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#243050'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <FiUser size={15} /> View Profile
                </button>
                <button
                  onClick={() => { setProfileDropdownOpen(false); localStorage.clear(); navigate('/login'); }}
                  style={{ width: '100%', padding: '11px 16px', background: 'none', border: 'none', color: '#f87171', textAlign: 'left', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#2d1a1a'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <FiLogOut size={15} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {/* Notification Drawer */}
      {notifOpen && (
        <div className="notif-drawer-overlay" onClick={() => setNotifOpen(false)} />
      )}
      <div 
        className={`notif-drawer${notifOpen ? ' open' : ''}`}
        role="dialog"
        aria-label="Notifications"
        aria-modal="true"
      >
        <div className="notif-drawer-header">
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Notifications</h2>
          <button 
            className="notif-drawer-close" 
            onClick={() => setNotifOpen(false)}
            aria-label="Close notifications"
          >
            <FiX size={22} />
          </button>
        </div>
        <div className="notif-drawer-body">
          {notifLoading && !notifications.length ? (
            // Show skeleton loaders when loading and no notifications are shown yet
            Array(3).fill(0).map((_, i) => <NotificationSkeleton key={`skeleton-${i}`} />)
          ) : notifError ? (
            <div className="notif-error" style={{ color: '#ef4444', padding: '1rem', textAlign: 'center' }}>
              {notifError}
              <button 
                onClick={fetchNotifications}
                style={{
                  marginTop: '0.5rem',
                  background: '#1e40af',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notif-empty">
              <p>No new notifications</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>We'll notify you when there's something new.</p>
            </div>
          ) : (
            notifications.map(n => (
              <div 
                className={`notif-card${n.isRead ? ' read' : ''} ${n.type || ''}`}
                key={n._id}
                onClick={() => !n.isRead && markAsRead(n._id)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && !n.isRead && markAsRead(n._id)}
                aria-label={`Notification: ${n.title}`}
              >
                <div className="notif-title">{n.title}</div>
                <div className="notif-message">{n.message}</div>
                <div className="notif-meta">
                  <span>{formatDateSafe(n.createdAt)}</span>
                  {!n.isRead && (
                    <button 
                      className="notif-mark-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n._id);
                      }}
                      aria-label="Mark as read"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="dashboard-body">
        {/* Sidebar: hide on mobile */}
        <aside className={`dashboard-sidebar${isMobile ? ' hidden-mobile' : ''}`}>          
          <nav>
            <ul>
              {filteredMenu.map(item => (
                <li key={item.path} onClick={() => handleNavigation(item)}>
                  {item.icon && <span style={{display: 'flex', alignItems: 'center', fontSize: '1.2rem'}}>{item.icon}</span>}
                  <span className="sidebar-menu-text">{item.label}</span>
                </li>
              ))}
            </ul>
          </nav>
          {showVersionFooter ? (
            <div className="sidebar-version" title={`SmartHireX ${APP_VERSION}`}>
              <span className="sidebar-menu-text">Version {APP_VERSION}</span>
              <span className="sidebar-version-compact">{APP_VERSION}</span>
            </div>
          ) : (
            <button className="logout-btn" onClick={handleLogout}>
              <FiLogOut size={20} /> 
              <span className="sidebar-menu-text">Logout</span>
            </button>
          )}
        </aside>
        <main ref={mainRef} className="dashboard-main">
          <div key={location.pathname} className="page-anim">
            {children}
          </div>
        </main>
      </div>
      {/* Bottom navigation - icon only */}
      {isMobile && (
        <div className="bottom-nav-container">
          <div 
            className={`bottom-nav${bottomVisible ? '' : ' hidden'}`}
            style={{ '--item-count': bottomMenu.length }}
          >
            {bottomMenu.map((item, idx) => {
              const isActive = location.pathname === item.path || 
                             (item.path && item.path !== '/' && location.pathname.startsWith(item.path));
              const handleClick = () => handleNavigation(item);

              return (
                <div
                  key={`${item.path || 'item'}-${idx}`}
                  className={`nav-icon ${isActive ? 'active' : ''}`}
                  onClick={handleClick}
                  aria-label={item.label || 'menu-item'}
                  title={item.label || ''}
                >
                  {React.cloneElement(item.icon, {
                    size: 24,
                    style: {
                      color: isActive ? '#0ea5e9' : '#94a3b8',
                      transition: 'color 0.2s ease',
                      cursor: 'pointer'
                    }
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Online Counter - Fixed Bottom Right (hidden on mobile) */}
      {!isMobile && <OnlineCounter />}
    </div>
  );
}
