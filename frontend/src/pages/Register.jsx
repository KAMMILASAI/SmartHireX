import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';
import { useToast } from '../contexts/ToastContext';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
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

const Register = ({ embedded = false, onSuccess, onSwitchToLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError, showInfo } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [isOAuth2, setIsOAuth2] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const role = 'candidate';
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState(0);
  const [otpTimer, setOtpTimer] = useState(null);

  useEffect(() => {
    return () => {
      if (otpTimer) clearInterval(otpTimer);
    };
  }, [otpTimer]);

  const startOtpTimer = (seconds) => {
    if (otpTimer) clearInterval(otpTimer);
    
    let remaining = seconds;
    setOtpExpiry(remaining);
    
    const timer = setInterval(() => {
      remaining -= 1;
      setOtpExpiry(remaining);
      
      if (remaining <= 0) {
        clearInterval(timer);
        setOtpExpiry(0);
      }
    }, 1000);
    
    setOtpTimer(timer);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const errorParam = urlParams.get('error');
    const oauth2User = location.state?.oauthUser || urlParams.get('oauth2User') === 'true';
    const oauthEmail = location.state?.email || urlParams.get('email');
    const oauthName = location.state?.name || urlParams.get('name');
    
    if (errorParam === 'oauth_register_required') {
      showError('Please register first before using social login.');
    }
    
    if (oauth2User && oauthEmail) {
      setEmail(oauthEmail);
      setEmailVerified(true);
      setIsOAuth2(true);
      setShowOtpInput(false);
      showInfo('Email verified via OAuth2. Please complete your registration.');
      
      if (oauthName) {
        const nameParts = oauthName.split(' ');
        if (nameParts.length > 0) {
          setFirstName(nameParts[0]);
          if (nameParts.length > 1) {
            setLastName(nameParts.slice(1).join(' '));
          }
        }
      }
      
      setSuccess('Please complete your registration to continue');
    }
  }, [location]);

  const sendOtp = async () => {
    setError('');
    
    if (!email) {
      setError('Please enter email first');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/send-registration-otp`, { 
        email: email.trim().toLowerCase(),
        name: firstName ? firstName.trim() : 'User'
      }, { timeout: 45000 });
      
      console.log('OTP Response:', res.status, res.data);
      
      if (res.status === 200 && res.data.message) {
        showSuccess('OTP has been sent to your email. Please check your inbox.');
        setShowOtpInput(true);
        startOtpTimer(5 * 60);
      } else {
        const msg = res.data.message || 'Failed to send OTP. Please try again.';
        showError(msg);
        setError(msg);
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        const msg = 'Server is taking longer to respond (Render cold start). Please wait 30-60 seconds and try again.';
        showError(msg);
        setError(msg);
        return;
      }
      const errorMessage = err.response?.data?.message || 
                         err.response?.data?.error || 
                         'Failed to send OTP. Please try again.';
      showError(errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) {
      setError('Please enter the OTP sent to your email');
      return;
    }
    
    const otpRegex = /^\d{6}$/;
    if (!otpRegex.test(otp)) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/verify-registration-otp`, { 
        email: email.trim().toLowerCase(),
        otp
      }, { timeout: 30000 });
      
      if (res.data.message === 'OTP verified successfully' || res.data.success) {
        showSuccess('Email verified successfully!');
        setEmailVerified(true);
        setShowOtpInput(false);
      } else {
        setError(res.data.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Server response timed out. Please try OTP verification again.');
        return;
      }
      const errorMessage = err.response?.data?.message || 
                         err.response?.data?.error || 
                         'Failed to verify OTP. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const requiredFields = {
      'First Name': firstName.trim(),
      'Last Name': lastName.trim(),
      'Email': email,
      'Phone': phone,
      'Role': role
    };
    
    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value) {
        showError(`${field} is required`);
        return false;
      }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError('Please enter a valid email address');
      return false;
    }
    
    if (!isOAuth2) {
      if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return false;
      }
      
      if (password !== confirmPassword) {
        showError('Passwords do not match');
        return false;
      }
      
      if (!emailVerified) {
        showError('Please verify your email with OTP before registering');
        return false;
      }
    } else if (password || confirmPassword) {
      if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return false;
      }
      
      if (password !== confirmPassword) {
        showError('Passwords do not match');
        return false;
      }
    }
    
    return true;
  };

  const handleOAuth2Registration = async (provider) => {
    try {
      // Set registration context in session storage
      sessionStorage.setItem('oauth2_context', 'register');
      
      const redirectUri = encodeURIComponent(`${window.location.origin}/oauth2/redirect`);
      const oauth2Url = `${API_BASE_URL}/oauth2/authorize/${provider}?redirect_uri=${redirectUri}`;
      
      console.log('OAuth2 Registration - Provider:', provider);
      console.log('OAuth2 Registration - URL:', oauth2Url);
      window.location.href = oauth2Url;
    } catch (error) {
      console.error('OAuth2 registration error:', error);
      showError('Failed to initiate OAuth2 registration');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (!isOAuth2 && !emailVerified) {
      showError('Please verify your email before registering');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: role,
        isOAuth2: isOAuth2,
        ...(!isOAuth2 && { password })
      };
      
      console.log('Registration payload:', JSON.stringify(userData, null, 2));
      
      const res = await axios.post(`${API_BASE_URL}/auth/register`, userData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      console.log('Registration response:', res.data);
      
      if (res.data.success || res.status === 200) {
        const successMsg = res.data.message || 'Registration successful! You can now log in.';
        showSuccess(successMsg);
        
        if (embedded && onSuccess) {
          onSuccess();
        } else {
          navigate('/login', { 
            state: { 
              email: userData.email,
              from: 'register',
              message: 'Registration successful! Please log in.'
            } 
          });
        }
      } else {
        throw new Error(res.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         'Registration failed. Please try again.';
      showError(errorMessage);
      
      if (error.response?.status === 400 && errorMessage.includes('already registered')) {
        setError(
          <span>
            {errorMessage} <span 
              className="text-link" 
              onClick={() => navigate('/login', { state: { email } })}
            >
              Login here
            </span>
          </span>
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginClick = () => {
    if (embedded && onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      navigate('/login');
    }
  };

  const renderForm = () => {
    return (
      <form onSubmit={handleRegister} className="auth-form">
        <div className="form-row">
          <div className="form-group">
            <div className="input-container">
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="input-container">
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                required
              />
            </div>
          </div>
        </div>

        <div className="input-container" style={{ position: 'relative' }}>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            required
            disabled={isOAuth2}
            style={{ 
              paddingRight: !emailVerified && !isOAuth2 ? '120px' : '1.25rem',
              height: '56px',
              boxSizing: 'border-box'
            }}
          />
          {!emailVerified && !isOAuth2 && (
            <button
              type="button"
              className="verify-btn"
              onClick={sendOtp}
              disabled={isLoading || !email}
            >
              {isLoading ? 'Sending...' : 'Send OTP'}
            </button>
          )}
          {emailVerified && (
            <span className="verified-badge">✓ Verified</span>
          )}
        </div>

        {showOtpInput && !emailVerified && (
          <div className="input-container" style={{ position: 'relative' }}>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              required
              maxLength="6"
              style={{ 
                paddingRight: '100px',
                height: '56px',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              className="verify-btn"
              onClick={verifyOtp}
              disabled={isLoading || !otp}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
            {otpExpiry > 0 && (
              <div className="otp-timer">
                Resend OTP in {formatTime(otpExpiry)}
              </div>
            )}
          </div>
        )}

        <div className="input-container">
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone Number"
            required
          />
        </div>

        {!isOAuth2 && (
          <div className="form-row">
            <div className="form-group">
              <div className="input-container">
                <div className="input-with-icon">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
            </div>

            <div className="form-group">
              <div className="input-container">
                <div className="input-with-icon">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    required
                  />
                  <div 
                    className="input-icon"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button
          type="submit"
          className="auth-btn primary"
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>

        <div className="social-divider">
          <span>or</span>
        </div>

        <div className="social-buttons">
          <button 
            type="button"
            onClick={() => handleOAuth2Registration('google')} 
            className="social-btn google-btn"
            title="Continue with Google"
          >
            {googleLogo}
          </button>
          <button 
            type="button"
            onClick={() => handleOAuth2Registration('github')} 
            className="social-btn github-btn"
            title="Continue with GitHub"
          >
            {githubLogo}
          </button>
        </div>
      </form>
    );
  };

  if (embedded) {
    return (
      <div className="auth-card">
        <div className="card-header">
          <h1 className="card-title">Sign Up</h1>
        </div>
        {renderForm()}
        <div className="auth-nav-links">
          <div className="auth-nav-link">
            Already have an account?{' '}
            <span 
              className="nav-link-btn text-link" 
              onClick={handleLoginClick}
            >
              Login here
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-register-page">
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
              className="header-button login-btn"
              onClick={() => navigate('/login')}
            >
              <FaUser size={16} className="button-icon" />
              <span>Login</span>
            </button>
          </div>
        </header>
      )}
      <div className="auth-form-section auth-full-width">
        <div className="auth-container">
          <div className="auth-card">
            <div className="card-header">
              <h1 className="card-title">Sign Up</h1>
            </div>
            {renderForm()}
            
            <div className="auth-nav-links">
              <div className="auth-nav-link">
                Already have an account?{' '}
                <span 
                  className="nav-link-btn text-link" 
                  onClick={handleLoginClick}
                >
                  Login here
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
