import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiMonitor } from 'react-icons/fi';
import SystemCheck from './SystemCheck';
import PhotoIdentification from './PhotoIdentification';
import CloseAllApplications from './CloseAllApplications';
import ExamRulesReminder from './ExamRulesReminder';
import FinalStep from './FinalStep';
import './CheckInProcess.css';
import './SystemCheck.css'; // For header styles

const CheckInProcess = () => {
  const { roundId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const steps = [
    'System check',
    'Photo identification',
    'Close all applications',
    'Exam rules reminder',
    'Final step',
  ];

  const handleNext = () => {
    setStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prevStep) => prevStep - 1);
    } else {
      // Navigate back to the check-in instructions (landing) for this round
      if (roundId) {
        navigate(`/candidate/system-check/${roundId}`, { replace: true });
      } else {
        navigate('/candidate/dashboard', { replace: true });
      }
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <SystemCheck onNext={handleNext} onBack={handleBack} />;
      case 2:
        return <PhotoIdentification onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <CloseAllApplications onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <ExamRulesReminder onNext={handleNext} onBack={handleBack} />;
      case 5:
        return <FinalStep roundId={roundId} />;
      default:
        return null;
    }
  };

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
      <div className="check-in-process-container">
        <div className="stepper-container">
          {steps.map((name, index) => (
            <div key={index} className={`step ${index + 1 === step ? 'active' : ''}`}>
              <div className="step-number">{index + 1}</div>
              <div className="step-name">{name}</div>
            </div>
          ))}
        </div>
        <div className="step-content">
          <div className="check-in-step-view">{renderStep()}</div>
        </div>
      </div>
    </div>
  );
};

export default CheckInProcess;
