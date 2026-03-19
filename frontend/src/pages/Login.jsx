import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { FaUser } from 'react-icons/fa';

import { API_BASE_URL } from '../config';
import './Auth.css';

const googleLogo = (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);


const githubLogo = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#333">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const Login = ({ embedded = false, onSuccess, onSwitchToRegister }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();
  
  // Form mode state
  const [currentView, setCurrentView] = useState('login'); // 'login', 'register', 'forgot-password'
  
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  
  const handleRegisterClick = () => {
    if (embedded && onSwitchToRegister) {
      onSwitchToRegister();
    } else {
      navigate('/register');
    }
  };


  // Handle login success
  const handleLoginSuccess = (data) => {
    try {
      console.log('handleLoginSuccess called with data:', data);
      
      // Extract token and user data from response
      const token = data.token || data.accessToken || data.jwt;
      const userData = data.user || data;
      
      if (!token) {
        console.error('No token found in login response');
        throw new Error('No authentication token received');
      }
      
      console.log('Storing token in localStorage');
      localStorage.setItem('token', token);
      
      if (userData) {
        console.log('Storing user data:', userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
      
      // Handle remember me functionality
      if (rememberMe && email) {
        localStorage.setItem('rememberedEmail', email.trim().toLowerCase());
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      // Ensure no plaintext password is persisted from older versions.
      localStorage.removeItem('rememberedPassword');
      
      showSuccess('Login successful! Redirecting...');
      
      // Call onSuccess callback if in embedded mode
      if (embedded && onSuccess) {
        console.log('Calling onSuccess callback for embedded mode');
        onSuccess();
        return;
      }

      // Determine user role for redirection
      const rawRole = (userData?.role || 'candidate').toLowerCase();
      const userRole = rawRole.startsWith('role_') ? rawRole.substring(5) : rawRole;
      console.log('User role determined as:', userRole);
      
      // Redirect based on role
      const redirectPath = 
        userRole === 'admin' ? '/admin/dashboard' :
        userRole === 'recruiter' ? '/recruiter/dashboard' :
        '/candidate/dashboard';
      
      console.log('Redirecting to:', redirectPath);
      navigate(redirectPath);
    } catch (error) {
      console.error('Error in handleLoginSuccess:', error);
      setError('An error occurred during login. Please try again.');
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const message = urlParams.get('message');
    const errorParam = urlParams.get('error');
    
    if (message === 'recruiter_pending') {
      showError('Your recruiter registration is pending admin approval. You will receive an email once reviewed.');
    }
    
    if (errorParam) {
      showError(errorParam);
    }
  }, [location.search]);

  // Handle OAuth2 success/error messages and load remembered email
  useEffect(() => {
    if (location.state?.success) {
      showSuccess(location.state.success);
    }
    
    if (location.state?.error) {
      showError(location.state.error);
    }

    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
    // Cleanup legacy plaintext password if present.
    localStorage.removeItem('rememberedPassword');
  }, [location, showError, showSuccess]);

  // Validate email format
  const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  // Handle forgot password form
  const _handleForgotPassword = (e) => {
    e.preventDefault();
    setCurrentView('forgot-password');
    setError('');
    setSuccess('');
  };

  const handleSendResetCode = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      if (response.data.message) {
        setResetCodeSent(true);
        setSuccess('OTP sent successfully to your email');
      } else {
        setError(response.data.message || 'Failed to send reset code. Please try again.');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, { 
        email, 
        otp,
        newPassword: password
      });
      
      if (response.data.message) {
        setSuccess('Password reset successful. You can now log in with your new password.');
        
        // Clear all fields and show login form
        setTimeout(() => {
          setCurrentView('login');
          setResetCodeSent(false);
          setOtp('');
          setPassword('');
          setError('');
          setSuccess('');
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Normalize email to match backend expectations
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();
      
      console.log('Sending login request to:', `${API_BASE_URL}/auth/login`);
      console.log('Request payload:', { email: normalizedEmail, password: '***' });
      
      const response = await axios({
        method: 'post',
        url: `${API_BASE_URL}/auth/login`,
        data: {
          email: normalizedEmail,
          password: normalizedPassword
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true,
        timeout: 30000
      });
      
      console.log('Login response status:', response.status);
      console.log('Login response headers:', JSON.stringify(response.headers, null, 2));
      console.log('Raw login response data:', JSON.stringify(response.data, null, 2));
      
      // Handle successful login
      if (response.data) {
        handleLoginSuccess(response.data);
      } else {
        // If we get here, the response format is unexpected
        console.error('Unexpected login response format:', response);
        setError('Received an unexpected response from the server. Please try again.');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different types of errors
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const { status, data } = error.response;
        
        if (status === 401) {
          if (data.message === 'User is disabled or not verified') {
            setError('Your account is not verified or has been disabled. Please contact support.');
          } else if (data.message === 'Invalid email or password') {
            setError('Invalid email or password. Please try again.');
          } else if (data.message) {
            setError(data.message);
          } else {
            setError('Invalid credentials. Please check your email and password.');
          }
        } else if (status === 400) {
          setError(data.message || 'Invalid request. Please check your input and try again.');
        } else if (status === 500) {
          setError('Server error. Please try again later.');
        } else {
          setError(`Error: ${status} - ${data.message || 'An error occurred'}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        setError('Server is waking up (Render cold start). Please wait a few seconds and try again.');
      } else if (error.request) {
        // The request was made but no response was received
        setError('Unable to connect to the server. Please check your internet connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderForgotPasswordForm = () => (
    <div className="forgot-password-form">
      <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1.5rem', textAlign: 'center' }}>
        {!resetCodeSent ? 'Enter your email to receive a password reset code' : 'Enter the OTP and your new password'}
      </p>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!resetCodeSent) {
          handleSendResetCode();
        } else {
          handleResetPassword();
        }
      }}>
        <div className="input-container">
          <input
            type="email"
            id="resetEmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            required
            disabled={resetCodeSent}
          />
        </div>
        
        {resetCodeSent && (
          <>
            <div className="input-container">
              <input
                type="text"
                id="resetOtp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                required
                maxLength="6"
              />
            </div>
            
            <div className="input-container">
              <div className="input-with-icon">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New Password"
                  required
                />
                <div 
                  className="input-icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                </div>
              </div>
            </div>
          </>
        )}

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button
          type="submit"
          className="auth-btn primary"
          disabled={isLoading}
        >
          {isLoading ? 
            (resetCodeSent ? 'Resetting...' : 'Sending...') : 
            (resetCodeSent ? 'Reset Password' : 'Send Reset Code')
          }
        </button>
        
        {resetCodeSent && (
          <button
            type="button"
            className="auth-btn secondary"
            onClick={() => {
              setResetCodeSent(false);
              setOtp('');
              setPassword('');
              setError('');
              setSuccess('');
            }}
            style={{ marginTop: '10px' }}
          >
            Back to Email
          </button>
        )}
      </form>
    </div>
  );

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="auth-form">
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="input-container">
        <input 
          id="loginEmail" 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="Email Address" 
          required 
        />
      </div>

      <div className="input-container">
        <div className="input-with-icon">
          <input 
            id="loginPassword" 
            type={showPassword ? 'text' : 'password'} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="Password" 
            required
          />
          <div 
            className="input-icon"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
          </div>
        </div>
      </div>
      
      <div className="auth-row">
        <label className="remember-me">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          Remember me
        </label>
        
        <span 
          className="forgot-btn" 
          onClick={() => setCurrentView('forgot-password')}
        >
          Forgot your password?
        </span>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="auth-btn primary"
        >
          {isLoading ? (
            <div className="spinner"></div>
          ) : (
            'Sign In'
          )}
        </button>
      </div>
    </form>
  );

  // Main component render
  return (
    <div className={`auth-login-page ${embedded ? 'auth-embedded' : 'auth-full-screen'}`}>
      {!embedded && (
        <header className="landing-header">
          <div 
            className="site-name clickable" 
            onClick={() => navigate('/')}
          >
            <div className="logo-container">
              <img 
                src="/SmarthireX-logo.jpeg" 
                alt="SmartHireX Logo" 
                className="logo-image"
              />
              <h1>SmartHireX</h1>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="header-button register-btn"
              onClick={() => navigate('/register')}
            >
              <FaUser size={16} className="button-icon" />
              <span>Register</span>
            </button>
          </div>
        </header>
      )}
      {/* Form Section */}
      <div className="auth-form-section auth-full-width">
        <div className="auth-container">
          <>
            {currentView === 'login' && (
              <>
                <div className="auth-card">
                  <div className="card-header">
                    <h2 className="card-title">Sign In</h2>
                  </div>
                  {renderLoginForm()}
                  <div className="social-divider">
                    <span>or</span>
                  </div>
                  <div className="social-buttons">
                    <button 
                      type="button"
                      className="social-btn google-btn" 
                      onClick={() => {
                        // Set login context (opposite of registration)
                        sessionStorage.setItem('oauth2_context', 'login');
                        const redirectUri = `${window.location.origin}/oauth2/redirect`;
                        window.location.href = `${API_BASE_URL}/oauth2/authorize/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
                      }}
                      title="Continue with Google"
                    >
                      {googleLogo}
                    </button>
                    <button 
                      type="button"
                      className="social-btn github-btn" 
                      onClick={() => {
                        // Set login context (opposite of registration)
                        sessionStorage.setItem('oauth2_context', 'login');
                        const redirectUri = `${window.location.origin}/oauth2/redirect`;
                        window.location.href = `${API_BASE_URL}/oauth2/authorize/github?redirect_uri=${encodeURIComponent(redirectUri)}`;
                      }}
                      title="Continue with GitHub"
                    >
                      {githubLogo}
                    </button>
                  </div>
                  
                  {/* Navigation Links */}
                  <div className="auth-nav-links">
                    <div className="auth-nav-link">
                      Don't have an account?{' '}
                      <span 
                        className="nav-link-btn text-link" 
                        onClick={handleRegisterClick}
                      >
                        Register here
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {currentView === 'forgot-password' && (
              <div className="auth-card">
                <div className="card-header">
                  <h2 className="card-title">Reset Password</h2>
                </div>
                {renderForgotPasswordForm()}
                
                {/* Navigation Links */}
                <div className="auth-nav-links">
                  <div className="auth-nav-link">
                    Remember your password?{' '}
                    <span 
                      className="nav-link-btn text-link" 
                      onClick={() => setCurrentView('login')}
                    >
                      Back to Sign In
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  );
};

export default Login;