import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

const OAuth2RedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleOAuth2Redirect = async () => {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get('token');
      const error = urlParams.get('error');
      const userId = urlParams.get('userId');
      const email = urlParams.get('email');
      const firstName = urlParams.get('firstName');
      const lastName = urlParams.get('lastName');
      const role = urlParams.get('role');
      const emailVerified = urlParams.get('emailVerified');
      const oAuth2Provider = urlParams.get('oAuth2Provider');

      if (error) {
        if (error === 'pending_approval' && role === 'recruiter') {
          setStatus('Your recruiter account is pending admin approval. You will be able to login once approved.');
          showError('Recruiter account pending admin approval. Please wait for approval.');
          setTimeout(() => {
            navigate('/login');
          }, 2500);
          return;
        }
        
        if (error === 'user_not_registered') {
          const message = urlParams.get('message') || 'Please register first before logging in';
          const redirectTo = urlParams.get('redirect');
          setStatus(message + ' Redirecting to registration...');
          showError(message);
          // Clear login context and redirect to registration
          sessionStorage.removeItem('oauth2_context');
          setTimeout(() => {
            if (redirectTo === 'register') {
              navigate('/', { state: { showRegister: true, email: email } });
            } else {
              navigate('/', { state: { showRegister: true } });
            }
          }, 2500);
          return;
        }
        
        setStatus(`Authentication failed: ${error}`);
        showError(`OAuth2 authentication failed: ${error}`);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        return;
      }

      if (token) {
        try {
          // Store token and user data
          localStorage.setItem('token', token);
          
          const userData = {
            id: userId,
            email: email,
            firstName: firstName,
            lastName: lastName,
            role: role,
            emailVerified: emailVerified === 'true',
            oAuth2Provider: oAuth2Provider
          };
          
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Check if this was a registration flow
          const oauth2Context = sessionStorage.getItem('oauth2_context');
          if (oauth2Context === 'register') {
            setStatus(`Registration successful! Welcome ${firstName}!`);
            showSuccess(`Registration successful via ${oAuth2Provider}! Welcome ${firstName}!`);
            sessionStorage.removeItem('oauth2_context');
            sessionStorage.removeItem('oauth2_role');
          } else {
            setStatus(`Welcome ${firstName}! Redirecting to your dashboard...`);
            showSuccess(`Welcome ${firstName}! Login successful via ${oAuth2Provider}`);
          }
          
          // Redirect based on user role
          setTimeout(() => {
            const userRole = role || 'candidate';
            if (userRole === 'admin') {
              navigate('/admin/dashboard');
            } else if (userRole === 'recruiter') {
              navigate('/recruiter/dashboard');
            } else {
              navigate('/candidate/dashboard');
            }
          }, 1500);
        } catch (error) {
          console.error('Error processing OAuth2 redirect:', error);
          setStatus('Failed to process authentication. Redirecting to login...');
          showError('Failed to process authentication. Please try again.');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } else {
        // Check if this was a registration attempt
        const oauth2Context = sessionStorage.getItem('oauth2_context');
        setStatus('No authentication token received. Redirecting...');
        showError('Authentication failed. Please try again.');
        
        // Clean up session storage
        sessionStorage.removeItem('oauth2_context');
        sessionStorage.removeItem('oauth2_role');
        
        setTimeout(() => {
          if (oauth2Context === 'register') {
            navigate('/', { state: { showRegister: true } });
          } else {
            navigate('/');
          }
        }, 2000);
      }
    };

    handleOAuth2Redirect();
  }, [location, navigate, showSuccess, showError]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #007bff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }}></div>
      <p style={{ 
        color: '#666', 
        fontSize: '16px',
        textAlign: 'center',
        maxWidth: '400px',
        lineHeight: '1.5'
      }}>
        {status}
      </p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OAuth2RedirectHandler;