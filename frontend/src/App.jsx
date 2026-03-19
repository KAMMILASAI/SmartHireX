import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './contexts/ToastContext';
import { LoadingProvider } from './contexts/LoadingContext';
import GlobalLoader from './components/GlobalLoader';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './adminpages/Dashboard';
import RecruiterDashboard from './recruiterpages/Dashboard';
import CandidateDashboard from './candidatepages/Dashboard';
import OAuthSuccess from './pages/OAuthSuccess';
import PendingApproval from './pages/PendingApproval';
import ApplyJob from './pages/ApplyJob';
import OAuth2RedirectHandler from './components/OAuth2RedirectHandler';
import ProtectedRoute from './ProtectedRoute';
import Unauthorized from './components/Unauthorized';
import VideoCall from './components/VideoCall';
import CheckInProcess from './candidatepages/CheckInProcess';
import CheckInLanding from './candidatepages/CheckInLanding';

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const uaMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const smallViewport = window.innerWidth <= 900;
  return uaMobile || smallViewport;
}

function App() {
  const [mobileBlocked, setMobileBlocked] = useState(isMobileDevice);

  useEffect(() => {
    const updateDeviceState = () => setMobileBlocked(isMobileDevice());
    updateDeviceState();
    window.addEventListener('resize', updateDeviceState);
    return () => window.removeEventListener('resize', updateDeviceState);
  }, []);

  if (mobileBlocked) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #020617 0%, #0f172a 55%, #1e293b 100%)',
          color: '#e2e8f0',
          padding: '1.25rem'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 560,
            border: '1px solid #334155',
            borderRadius: 16,
            background: 'rgba(15, 23, 42, 0.9)',
            boxShadow: '0 20px 45px rgba(0,0,0,0.35)',
            padding: '1.5rem',
            textAlign: 'center'
          }}
        >
          <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.7rem', color: '#f8fafc' }}>Desktop Only</h1>
          <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.6 }}>
            This project is available only on desktop. Please open SmartHireX on a laptop or desktop browser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <LoadingProvider>
      <ToastProvider>
        <Routes>
          {/* Public routes */}
          <Route path='/' element={<LandingPage />} />
          <Route path='/landing' element={<Navigate to='/' replace />} />
          
          {/* Authentication routes */}
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/forgot-password' element={<ForgotPassword />} />
          
          {/* Other public routes */}
          <Route path='/oauth-success' element={<OAuthSuccess />} />
          <Route path='/oauth2/redirect' element={<OAuth2RedirectHandler />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/jobs/:linkId" element={<ApplyJob />} />
          <Route path="/video-call/:roomCode" element={<VideoCall />} />
          <Route 
            path="/candidate/system-check/:roundId" 
            element={
              <ProtectedRoute allowedRoles={['candidate', 'recruiter', 'admin']}>
                <CheckInLanding />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/candidate/check-in-process/:roundId" 
            element={
              <ProtectedRoute allowedRoles={['candidate', 'recruiter', 'admin']}>
                <CheckInProcess />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected routes with role-based access */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/recruiter/*" 
            element={
              <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                <RecruiterDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/candidate/*" 
            element={
              <ProtectedRoute allowedRoles={['candidate', 'recruiter', 'admin']}>
                <CandidateDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch-all route for 404 - Show Unauthorized page */}
          <Route path="*" element={<Unauthorized />} />
        </Routes>
      </ToastProvider>
      <GlobalLoader />
    </LoadingProvider>
  )
}

export default App;