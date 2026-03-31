import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../candidatepages/Payment.css';

export default function PaymentConfirm() {
  const navigate = useNavigate();
  
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      window.history.back();
    }
  };

  return (
    <div className="payment-popup-overlay" onClick={handleOverlayClick}>
      <div className="payment-popup-modal">
        <div className="popup-header">
          <h2 className="popup-title">Optional Support Payment</h2>
          <button className="popup-close" onClick={()=>window.history.back()}>×</button>
        </div>
        <div className="popup-content">
          <p className="popup-message">
            If SmartHireX helped you land a job, chip in anything you like! Payment is optional but highly motivating 😊
          </p>
        </div>
        <div className="popup-actions">
          <button className="popup-btn primary" onClick={()=>navigate('/recruiter/payment')}>
            Proceed
          </button>
          <button className="popup-btn secondary" onClick={()=>window.history.back()}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
