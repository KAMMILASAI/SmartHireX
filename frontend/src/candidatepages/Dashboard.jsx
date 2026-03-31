import DashboardLayout from '../components/DashboardLayout';
import { Outlet, Routes, Route, Navigate } from 'react-router-dom';
import { FiHome, FiBriefcase, FiMessageCircle, FiUserCheck, FiFileText, FiCreditCard, FiList, FiAward } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import Payment from './Payment';
import PaymentConfirm from './PaymentConfirm';
import EditProfile from './EditProfile';

import Applications from './Applications';
import Jobs from './Jobs';
import Chat from './Chat';
import Partices from './Partices';
import ResumeChecker from './ResumeChecker';
import DashboardHome from './DashboardHome';
import MCQs from './MCQs';
import Coding from './Coding';
import Interview from './Interview';
import SecureExam from './SecureExam';
import ShortlistedJobs from './ShortlistedJobs';
import MixedExam from './MixedExam';
import SystemCheck from './SystemCheck';


export default function CandidateDashboard() {
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

  const candidateMenu = [
    { label: 'Dashboard', path: '/candidate/dashboard', icon: <FiHome /> },
    { label: 'My Applications', path: '/candidate/applications', icon: <FiList /> },
    { label: 'My Drives', path: '/candidate/shortlisted-jobs', icon: <FiAward /> },
    { label: 'Find Jobs', path: '/candidate/jobs', icon: <FiBriefcase /> },
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
      path: '/candidate/chat', 
      icon: <FiMessageCircle /> 
    },
    { label: 'Partices', path: '/candidate/partices', icon: <FiUserCheck /> },
    { label: 'Resume Checker', path: '/candidate/resume-checker', icon: <FiFileText /> },
    { label: 'Support / Payment', path: '/candidate/payment-confirm', icon: <FiCreditCard /> },
  ];
  return (
    <DashboardLayout menuItems={candidateMenu}>
      <Routes>
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="applications" element={<Applications />} />
        <Route path="shortlisted-jobs" element={<ShortlistedJobs />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="chat" element={<Chat />} />
        <Route path="partices" element={<Partices />} />
        <Route path="edit-profile" element={<EditProfile />} />
        <Route path="resume-checker" element={<ResumeChecker />} />
        <Route path='payment-confirm' element={<PaymentConfirm />} />
        <Route path='payment' element={<Payment />} />
        
        {/* Test Components */}
        <Route path="mcqs" element={<MCQs />} />
        <Route path="coding" element={<Coding />} />
        <Route path="interview" element={<Interview />} />
        
        {/* MCQ Exam - Use SecureExam component for test mode */}
        <Route path="exam/:roundId" element={<SecureExam />} />
        
        {/* Coding Exam - Also use SecureExam component */}
        <Route path="coding-exam/:roundId" element={<SecureExam />} />
        
        {/* Mixed Exam */}
        <Route path="mixed-exam/:roundId" element={<MixedExam />} />
        
        <Route path="*" element={<Navigate to="/candidate/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
