import DashboardLayout from '../components/DashboardLayout';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FiHome, FiFilePlus, FiUsers, FiMessageCircle, FiUser, FiBarChart2, FiCreditCard, FiClock } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import Payment from './Payment';
import PaymentConfirm from './PaymentConfirm';
import GenerateTest from './GenerateTest';
import Chat from './Chat';
import CandidateProfiles from './CandidateProfiles';
import EditProfile from './EditProfile';
import Results from './Results';
import DashboardHome from './DashboardHome';
import Rounds from './Rounds';
import Shortlist from './Shortlist';
import MixedRoundCreation from './MixedRoundCreation';
import MixedResults from './MixedResults';

export default function RecruiterDashboard() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch unread messages count (dynamic from /chat/chats)
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/chat/unread-count`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'x-skip-loader': 'true'  // Background polling should not trigger loading overlay
          },
          timeout: 10000
        });
        const total = Number(res.data?.totalUnreadCount) || 0;
        setUnreadCount(total);
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
        setUnreadCount(0);
      }
      setLoading(false);
    };

    const handleUnreadUpdate = (event) => {
      const total = Number(event?.detail?.total);
      if (!Number.isNaN(total)) {
        setUnreadCount(total);
        setLoading(false);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    window.addEventListener('chat:unread-updated', handleUnreadUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('chat:unread-updated', handleUnreadUpdate);
    };
  }, []);

  const recruiterMenu = [
    { label: 'Dashboard', path: '/recruiter/dashboard', icon: <FiHome /> },
    { label: 'Generate Test', path: '/recruiter/generate-test', icon: <FiFilePlus /> },
    { 
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
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
      ), 
      path: '/recruiter/chat', 
      icon: <FiMessageCircle /> 
    },
    { label: 'Candidate Profiles', path: '/recruiter/candidate-profiles', icon: <FiUser /> },
    { label: 'Support / Payment', path: '/recruiter/payment-confirm', icon: <FiCreditCard /> },
  ];
  return (
    <DashboardLayout menuItems={recruiterMenu}>
      <Routes>
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="generate-test" element={<GenerateTest />} />
        <Route path="chat" element={<Chat />} />
        <Route path="candidate-profiles" element={<CandidateProfiles />} />
        <Route path="edit-profile" element={<EditProfile />} />
        <Route path="payment-confirm" element={<PaymentConfirm />} />
        <Route path="payment" element={<Payment />} />
        <Route path="rounds/:jobId" element={<Rounds />} />
        <Route path="jobs/:jobId/shortlist" element={<Shortlist />} />
        
        {/* Mixed Round Management */}
        <Route path="mixed-round/:roundId/configure" element={<MixedRoundCreation />} />
        <Route path="mixed-round/:roundId/results" element={<MixedResults />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
