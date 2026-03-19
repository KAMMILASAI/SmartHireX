import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function OAuthSuccess() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const role = params.get('role');
    const email = params.get('email');
    const firstName = params.get('firstName');
    const lastName = params.get('lastName');
    const userId = params.get('userId');
    const oauthError = params.get('oauthError');
    
    // Handle OAuth2 error
    if (oauthError) {
      setStatus('Authentication failed. Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { 
          state: { error: decodeURIComponent(oauthError) },
          replace: true 
        });
      }, 2000);
      return;
    }
    
    // Handle successful OAuth2 authentication
    if (token && role) {
      // Store authentication data
      localStorage.setItem('token', token);
      
      // Store user data
      const userData = {
        id: userId,
        email: email,
        firstName: firstName,
        lastName: lastName,
        role: role
      };
      localStorage.setItem('user', JSON.stringify(userData));
      
      setStatus('Login successful! Redirecting to dashboard...');
      
      // Redirect based on role
      setTimeout(() => {
        if (role === 'candidate') {
          navigate('/candidate/dashboard', { replace: true });
        } else if (role === 'recruiter') {
          navigate('/recruiter/dashboard', { replace: true });
        } else if (role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }, 1500);
    } else {
      setStatus('Authentication failed. Redirecting to login...');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    }
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
      <p style={{ fontSize: '18px', color: '#333' }}>{status}</p>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

export default OAuthSuccess;
