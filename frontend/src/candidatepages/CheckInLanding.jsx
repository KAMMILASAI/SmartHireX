import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { FiMonitor, FiUser, FiCreditCard, FiHome, FiLayers, FiArrowLeft } from 'react-icons/fi';
import './CheckInProcess.css';
import './SystemCheck.css'; // For global header styles

const CheckInLanding = () => {
  const navigate = useNavigate();
  const { roundId } = useParams();
  const [ageConfirmed, setAgeConfirmed] = useState(null);
  const [roundInfo, setRoundInfo] = useState(null);
  const [canStart, setCanStart] = useState(false);
  const [countdown, setCountdown] = useState('');

  const handleStart = () => {
    if (ageConfirmed === 'over18' && canStart) {
      navigate(`/candidate/check-in-process/${roundId}`);
    }
  };

  useEffect(() => {
    if (!roundId) return;

    const fetchRound = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Use the new check-in specific endpoint
        const resp = await axios.get(`${API_BASE_URL}/candidate/round/${roundId}/check-in`, { headers });
        const data = resp?.data;
        setRoundInfo(data);
      } catch (error) {
        console.warn('Could not fetch round info for check-in landing', error);
        setRoundInfo(null);
      }
    };

    fetchRound();
  }, [roundId]);

  // update countdown and canStart status
  useEffect(() => {
    let timer;
    const compute = () => {
      if (!roundInfo || !roundInfo.startTime) {
        setCanStart(true); // if we don't know, allow start (keep existing behavior)
        setCountdown('');
        return;
      }

      let start;
      if (Array.isArray(roundInfo.startTime)) {
        const [y, m, d, h, min] = roundInfo.startTime;
        start = new Date(y, m - 1, d, h || 0, min || 0);
      } else if (typeof roundInfo.startTime === 'number') {
        start = new Date(roundInfo.startTime * 1000);
      } else {
        start = new Date(roundInfo.startTime);
      }

      const now = new Date();
      const fifteenMinBefore = new Date(start.getTime() - 15 * 60 * 1000);

      if (now >= fifteenMinBefore) {
        setCanStart(true);
        setCountdown('');
      } else {
        setCanStart(false);
        const diff = fifteenMinBefore - now;
        const mm = Math.floor(diff / 60000);
        const ss = Math.floor((diff % 60000) / 1000);
        setCountdown(`${mm}m ${ss}s until check-in opens`);
      }
    };

    compute();
    timer = setInterval(compute, 1000);
    return () => clearInterval(timer);
  }, [roundInfo]);

  return (
    <div className="check-in-process-page">
      <header className="system-check-global-header">
        <div className="logo-container">
          <img 
            src="/SmarthireX-logo.jpeg" 
            alt="SmartHireX Logo" 
            className="logo-image"
          />
          <h1 className="brand-name">SmartHireX</h1>
        </div>
      </header>
      <div className="check-in-landing-container">
        <div className="check-in-box">
          <div className="system-check-header">
            <h1 className="system-check-title">Check-In Process</h1>
            <p className="system-check-subtitle">What you need to do to take your exam</p>
          </div>
          <div className="steps-overview-container">
            <div className="step-overview">
              <FiMonitor size={20} />
              <span>System check</span>
            </div>
            <div className="step-overview">
              <FiUser size={20} />
              <span>Your picture</span>
            </div>
            <div className="step-overview">
              <FiCreditCard size={20} />
              <span>Photo identification</span>
            </div>
            <div className="step-overview">
              <FiHome size={20} />
              <span>Workspace verification</span>
            </div>
            <div className="step-overview">
              <FiLayers size={20} />
              <span>Close all applications</span>
            </div>
          </div>
          <div className="age-confirmation-container">
            <label className={`radio-card ${ageConfirmed === 'over18' ? 'active' : ''}`}>
              <input 
                type="radio" 
                name="age" 
                checked={ageConfirmed === 'over18'}
                onChange={() => setAgeConfirmed('over18')} 
              />
              <span className="radio-dot"></span>
              <span>I am eighteen years of age or older</span>
            </label>
            <label className={`radio-card ${ageConfirmed === 'under18' ? 'active' : ''}`}>
              <input 
                type="radio" 
                name="age" 
                checked={ageConfirmed === 'under18'}
                onChange={() => setAgeConfirmed('under18')} 
              />
              <span className="radio-dot"></span>
              <span>I am under eighteen years of age</span>
            </label>
          </div>
          {ageConfirmed === 'under18' && (
            <div className="under18-warning-landing">
              You must be 18 or older to proceed.
            </div>
          )}
          <div style={{height:20}}>
            {countdown && (
              <div style={{color: '#94a3b8', fontSize: 14, marginBottom: 8}}>{countdown}</div>
            )}
          </div>
          <div className="actions-footer-landing">
            <button className="back-step-btn" onClick={() => navigate('/candidate/dashboard', { replace: true })}>
              <FiArrowLeft /> Back
            </button>
            <button className="get-started-btn" onClick={handleStart} disabled={ageConfirmed !== 'over18' || !canStart}>
              Start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInLanding;
