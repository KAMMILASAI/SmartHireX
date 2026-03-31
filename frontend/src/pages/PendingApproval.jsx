import React from 'react';
import { useNavigate } from 'react-router-dom';

const PendingApproval = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Account Pending Approval</h2>
          <p>Your recruiter account is under review</p>
        </div>
        <div className="pending-content">
          <div className="pending-icon" style={{fontSize:'3rem', marginBottom:'1rem'}}>⏳</div>
          <h3>Thank you for registering!</h3>
          <p style={{marginBottom:'1rem'}}>Your recruiter account is currently pending admin approval. This process typically takes 24–48 hours.</p>
          <div className="pending-info" style={{textAlign:'left'}}>
            <h4>What happens next?</h4>
            <ul style={{lineHeight:'1.6'}}>
              <li>✅ Our admin team will review your application.</li>
              <li>📧 You will receive an email as soon as it is approved or rejected.</li>
              <li>🚀 Once approved, you can access all recruiter features.</li>
            </ul>
          </div>
          <div className="pending-actions" style={{display:'flex', gap:'1rem', marginTop:'1.5rem'}}>
            <button className="btn-secondary" onClick={() => navigate('/')}>Back to Login</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
