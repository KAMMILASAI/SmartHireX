import DashboardLayout from '../components/DashboardLayout';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FiHome, FiUsers, FiMessageCircle, FiInbox, FiCreditCard } from 'react-icons/fi';
import Payments from './Payments';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import Users from './Users';
import Chat from './Chat';
import SendNotification from './SendNotification';
import AdminDashboardHome from './DashboardHome';
import AdminEditProfile from './EditProfile';

export default function AdminDashboard() {
  const [totalAmount, setTotalAmount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch total payments
        const paymentsRes = await axios.get(`${API_BASE_URL}/admin/payments/total`, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          },
          withCredentials: true
        });
        setTotalAmount(paymentsRes.data.total || 0);
        
        // Fetch unread chat messages
        const chatRes = await axios.get(`${API_BASE_URL}/chat/unread-count`, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          },
          withCredentials: true
        });
        const totalUnread = Number(chatRes.data?.totalUnreadCount) || 0;
        setUnreadCount(totalUnread);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setTotalAmount(0);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const handleUnreadUpdate = (event) => {
      const total = Number(event?.detail?.total);
      if (!Number.isNaN(total)) {
        setUnreadCount(total);
        setLoading(false);
      }
    };
    
    // Refresh data every 10 seconds and update instantly from chat page events
    const interval = setInterval(fetchData, 5000);
    window.addEventListener('chat:unread-updated', handleUnreadUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('chat:unread-updated', handleUnreadUpdate);
    };
  }, []);

  // Navigation items with absolute paths
  const navItems = [
    { 
      path: '/admin/dashboard', 
      icon: <FiHome />, 
      label: 'Dashboard',
      exact: true
    },
    { 
      path: '/admin/users', 
      icon: <FiUsers />, 
      label: 'Users'
    },
    { 
      path: '/admin/chat', 
      icon: <FiMessageCircle />, 
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Chat</span>
          {!loading && unreadCount > 0 && (
            <span style={{
              background: '#dc3545',
              color: 'white',
              padding: '0.15rem 0.5rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '600',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {unreadCount}
            </span>
          )}
        </div>
      )
    },
    { 
      path: '/admin/payments', 
      icon: <FiCreditCard />, 
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Payments</span>
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: '600', 
            color: '#28a745',
            whiteSpace: 'nowrap'
          }}>
            ₹{totalAmount.toLocaleString()}
          </span>
        </div>
      )
    },
    { 
      path: '/admin/send-notification', 
      icon: <FiInbox />, 
      label: 'Send Notification'
    }
  ];

  return (
    <DashboardLayout menuItems={navItems}>
      <Routes>
        <Route path="dashboard" element={<AdminDashboardHome />} />
        <Route path="users" element={<Users />} />
        <Route path="chat" element={<Chat />} />
        <Route path="payments" element={<Payments />} />
        <Route path="send-notification" element={<SendNotification />} />
        <Route path="edit-profile" element={<AdminEditProfile />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
