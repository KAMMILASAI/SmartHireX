import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { API_BASE_URL } from '../config';
import './Auth.css';


const eyeIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const eyeOffIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function ForgotPassword({ embedded, onSwitchToLogin }) {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();

  const [step, setStep] = useState(1); // 1: email, 2: otp and new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const sendOtp = async () => {
    if (!email) {
      showError('Please enter your email address.');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      
      if (response.data.message) {
        showSuccess('Reset code sent to your email! Please check your inbox.');
        setStep(2);
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      showError(err.response?.data?.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!otp) {
      showError('Please enter the reset code.');
      return;
    }
    if (!newPassword) {
      showError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        email,
        otp,
        newPassword: newPassword,
      });
      
      if (response.data.message) {
        showSuccess('Password updated successfully! Redirecting to login...');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      showError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 1) {
      sendOtp();
    } else {
      resetPassword();
    }
  };

  return (
    <div className="auth-forgot-password-page">
      <div className="auth-form-section auth-full-width">
        <div className="auth-container">
          <div className="left-box">
        <div className="auth-card">
          <div className="card-header">
            <h2 className="card-title">Reset Password</h2>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {step === 1 ? (
              <>
                <div className="input-container">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    required
                  />
                </div>
                
                <button 
                  type="submit"
                  className={`auth-btn primary ${loading ? 'loading' : ''}`}
                  disabled={!email || loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Code'}
                </button>
              </>
            ) : (
              <>
                <div className="input-container">
                  <input
                    id="otp"
                    type="text"
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
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                
                <div className="input-container">
                  <div className="input-with-icon">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
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
                
                <button 
                  type="submit"
                  className={`auth-btn primary ${loading ? 'loading' : ''}`}
                  disabled={loading || !otp || !newPassword || newPassword !== confirmPassword}
                >
                  {loading ? 'Updating...' : 'Reset Password'}
                </button>
                
                <button 
                  type="button"
                  className="auth-btn secondary"
                  onClick={() => {
                    setStep(1);
                    setOtp('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  style={{ marginTop: '10px' }}
                >
                  Back to Email
                </button>
              </>
            )}
            
            {/* Navigation Link */}
            <div className="auth-nav-link">
              Remember your password?{' '}
              <span 
                onClick={embedded ? onSwitchToLogin : () => navigate('/login')} 
                className="nav-link-btn text-link"
              >
                Back to Login
              </span>
            </div>
          </form>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
