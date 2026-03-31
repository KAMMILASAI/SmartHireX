import React, { useState } from 'react';
import { FiMapPin, FiSmartphone, FiCoffee, FiEye, FiAlertCircle } from 'react-icons/fi';

const RuleItem = ({ icon: Icon, text }) => (
  <div style={{
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
    padding: '14px 18px',
    background: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '8px',
    border: '1px solid rgba(71, 85, 105, 0.5)',
    transition: 'all 0.2s ease'
  }}>
    <div style={{
      width: 40,
      height: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(56, 189, 248, 0.15)',
      borderRadius: '8px',
      color: '#38bdf8',
      flexShrink: 0
    }}>
      <Icon size={20} />
    </div>
    <div style={{
      flex: 1,
      fontSize: '15px',
      color: '#e2e8f0',
      lineHeight: 1.5,
      paddingTop: '8px'
    }}>
      {text}
    </div>
  </div>
);

const ExamRulesReminder = ({ onNext, onBack }) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="check-in-step-view">
      <div className="system-check-header">
        <h1 className="system-check-title">Exam Rules Reminder</h1>
        <p className="system-check-subtitle">Please read and acknowledge these important exam rules before proceeding</p>
      </div>
      
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        <div style={{
          display: 'grid',
          gap: 12,
          marginBottom: 24
        }}>
          <RuleItem 
            icon={FiMapPin} 
            text="Stay in your workspace alone - no one may enter, and you cannot leave until the exam is completed" 
          />
          <RuleItem 
            icon={FiSmartphone} 
            text="Remove all devices - place mobiles, headphones, smartwatches, and other electronics out of reach" 
          />
          <RuleItem 
            icon={FiCoffee} 
            text="No food, drinks (except water in a clear bottle), smoking, or gum during the exam" 
          />
          <RuleItem 
            icon={FiEye} 
            text="This exam is proctored - your screen and camera will be monitored. Copy-paste is disabled" 
          />
          <RuleItem 
            icon={FiAlertCircle} 
            text="Take a break before starting - once begun, you cannot pause. Medical devices/medications are permitted" 
          />
        </div>

        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: 24
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer'
          }} onClick={() => setAgreed(!agreed)}>
            <input 
              type="checkbox" 
              id="agree" 
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{
                width: 20,
                height: 20,
                cursor: 'pointer',
                accentColor: '#ef4444'
              }}
            />
            <label 
              htmlFor="agree"
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#fca5a5',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              I agree that breaking these rules will result in my exam being revoked
            </label>
          </div>
        </div>
      </div>

      <div className="actions-footer">
        <button className="back-step-btn" onClick={onBack}>
          Back
        </button>
        <button 
          className="next-step-btn" 
          onClick={onNext}
          disabled={!agreed}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ExamRulesReminder;
