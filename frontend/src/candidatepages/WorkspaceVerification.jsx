import React from 'react';

const WorkspaceVerification = ({ onNext, onBack }) => {
  return (
    <div className="check-in-step-view">
      <div className="system-check-header">
        <h1 className="system-check-title">Workspace Verification</h1>
        <p className="system-check-subtitle">Please take a picture of your workspace</p>
      </div>
      <div className="actions-footer">
        <button className="back-step-btn" onClick={onBack}>
          Back
        </button>
        <button className="next-step-btn" onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  );
};

export default WorkspaceVerification;
