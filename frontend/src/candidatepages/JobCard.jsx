import React from 'react';
import { FaBuilding, FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';

const JobCard = ({ job, applied, onApply, applying }) => {
  if (!job) return null;

  const formatJobDate = (dateValue) => {
    if (!dateValue) return 'Not set';
    
    let date;
    if (typeof dateValue === 'number') {
      // Handle Unix timestamp (multiply by 1000 to convert to milliseconds)
      date = new Date(dateValue * 1000);
    } else if (typeof dateValue === 'string') {
      // Handle ISO string
      date = new Date(dateValue);
    } else {
      return 'Invalid Date';
    }
    
    // Check if the date is valid before formatting
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-GB'); // Use a specific locale for dd/mm/yyyy format
  };

  return (
    <div className="app-card">
      <div className="card-head">
        <div className="head-left">
          <div className="company-logo">{(job.company || '?').charAt(0).toUpperCase()}</div>
          <div className="job-meta">
            <h3 className="job-title">{job.title}</h3>
            <p className="company-line">
              <FaBuilding className="icon-left" />
              {job.company || 'Company'}
            </p>
          </div>
        </div>
      </div>

      <div className="divider" />

      <div className="meta-list">
        <div className="meta-item">
          <FaMapMarkerAlt className="icon-left" />
          <span>{job.location || 'Remote'}</span>
        </div>
        {job.expiresAt && (
          <div className="meta-item">
            <FaCalendarAlt className="icon-left" />
            <span>Expires {formatJobDate(job.expiresAt)}</span>
          </div>
        )}
      </div>

      <div className="chip-row">
        {job.employmentType && <span className="chip">Type: {job.employmentType}</span>}
        {job.ctc && <span className="chip">CTC: {job.ctc}</span>}
      </div>

      <div className="card-footer">
        <span className="id-text">ID: {job.id}</span>
        {job.linkId && (
          applied ? (
            <button className="pill-btn disabled" disabled>Applied</button>
          ) : (
            <button className="pill-btn" onClick={() => onApply?.(job)} disabled={!!applying}>
              {applying ? 'Applying...' : 'Apply'}
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default JobCard;
