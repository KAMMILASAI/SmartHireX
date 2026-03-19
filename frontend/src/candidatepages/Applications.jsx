import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Applications.css';
import { API_BASE_URL } from '../config';
import { 
  FaClock, 
  FaTimesCircle, 
  FaFileAlt, 
  FaSearch, 
  FaBriefcase, 
  FaBuilding, 
  FaMapMarkerAlt, 
  FaCalendarAlt,
  FaStar,
  FaTrophy
} from 'react-icons/fa';

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Format date function to handle both Unix timestamps and ISO strings
  const formatDate = (dateValue) => {
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
  
  // Status filters with icons and labels
  const statusFilters = [
    { id: 'all', label: 'All', icon: <FaBriefcase className="icon-left" /> },
    { id: 'applied', label: 'Applied', icon: <FaFileAlt className="icon-left" /> },
    { id: 'shortlisted', label: 'Shortlisted', icon: <FaStar className="icon-left" /> },
    { id: 'interview', label: 'Interview', icon: <FaCalendarAlt className="icon-left" /> },
    { id: 'selected', label: 'Selected', icon: <FaTrophy className="icon-left" /> },
    { id: 'rejected', label: 'Rejected', icon: <FaTimesCircle className="icon-left" /> },
  ];

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_BASE_URL}/candidate/applications`, { headers });
        const list = Array.isArray(res.data) ? res.data : [];
        
        // Debug logging to check application statuses
        console.log('📋 Loaded applications:', list.length);
        const statusCounts = list.reduce((acc, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        }, {});
        console.log('📊 Application status breakdown:', statusCounts);
        
        // Log rejected applications specifically
        const rejectedApps = list.filter(app => app.status === 'rejected');
        if (rejectedApps.length > 0) {
          console.log('🚫 Rejected applications:', rejectedApps.map(app => ({
            id: app._id,
            job: app.job?.title,
            company: app.job?.company,
            appliedAt: app.appliedAt
          })));
        }
        
        setApplications(list);
      } catch (e) {
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  // Filter applications based on search and active filter
  const filteredApplications = applications.filter(app => {
    const jobTitle = String(app?.job?.title || '');
    const companyName = String(app?.job?.company || '');
    const matchesSearch = 
      jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      companyName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'shortlisted') 
      return matchesSearch && (app.status === 'shortlisted' || app.status === 'under_review');
    if (activeFilter === 'interview') 
      return matchesSearch && (app.status === 'interview_scheduled' || app.status === 'interview_completed');
    if (activeFilter === 'selected')
      return matchesSearch && (app.status === 'selected' || app.status === 'hired' || app.status === 'offer_accepted');
    
    return matchesSearch && app.status === activeFilter;
  });

  // Get status badge with appropriate styling
  const getStatusBadge = (status) => {
    const statusConfig = {
      applied: { cls: 'badge badge-blue', icon: <FaClock className="icon-left" />, label: 'Applied' },
      shortlisted: { cls: 'badge badge-purple', icon: <FaStar className="icon-left" />, label: 'Shortlisted' },
      interview_scheduled: { cls: 'badge badge-blue', icon: <FaCalendarAlt className="icon-left" />, label: 'Interview' },
      interview_completed: { cls: 'badge badge-blue', icon: <FaCalendarAlt className="icon-left" />, label: 'Interview Completed' },
      selected: { cls: 'badge badge-green', icon: <FaTrophy className="icon-left" />, label: 'Selected' },
      hired: { cls: 'badge badge-green', icon: <FaTrophy className="icon-left" />, label: 'Hired' },
      offer_accepted: { cls: 'badge badge-green', icon: <FaTrophy className="icon-left" />, label: 'Offer Accepted' },
      rejected: { cls: 'badge badge-red', icon: <FaTimesCircle className="icon-left" />, label: 'Rejected' },
      default: { cls: 'badge', icon: null, label: status }
    };

    const config = statusConfig[status] || statusConfig.default;
    
    return (
      <span className={config.cls}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

 

  return (
    <div className="apps-container">
      <div className="apps-header">
        <div className="header-text">
          <h1 className="apps-title">My Applications</h1>
          <p className="apps-subtitle">Track your job applications and their status</p>
        </div>
        <div className="search-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by job title or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="filters-row">
          {statusFilters.map(filter => {
            const count = filter.id === 'all' 
              ? applications.length 
              : applications.filter(app => {
                  if (filter.id === 'shortlisted') 
                    return app.status === 'shortlisted' || app.status === 'under_review';
                  if (filter.id === 'interview') 
                    return app.status === 'interview_scheduled' || app.status === 'interview_completed';
                  if (filter.id === 'selected')
                    return app.status === 'selected' || app.status === 'hired' || app.status === 'offer_accepted';
                  return app.status === filter.id;
                }).length;
            
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`filter-btn ${activeFilter === filter.id ? 'active' : ''} ${filter.id === 'rejected' && count > 0 ? 'has-rejected' : ''}`}
              >
                {filter.icon}
                {filter.label}
                {count > 0 && <span className="filter-count">{count}</span>}
              </button>
            );
          })}
      </div>

      <div className="apps-grid">
        {filteredApplications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="empty-title">{searchTerm ? 'No matching applications' : 'No applications yet'}</h3>
            <p className="empty-text">{searchTerm ? 'Try adjusting your search or filters' : 'Start applying to jobs to see them here'}</p>
            {activeFilter === 'all' && searchTerm === '' ? (
              <a href="/candidate/jobs" className="primary-btn">Browse Jobs</a>
            ) : null}
          </div>
        ) : (
          filteredApplications.map((application) => (
            <div key={application._id} className="app-card">
              <div className="card-head">
                <div className="head-left">
                  <div className="company-logo">{String(application?.job?.company || '?').charAt(0).toUpperCase()}</div>
                  <div className="job-meta">
                    <h3 className="job-title">{application?.job?.title || 'Untitled Job'}</h3>
                    <p className="company-line">
                      <FaBuilding className="icon-left" />
                      {application?.job?.company || 'Unknown Company'}
                    </p>
                  </div>
                </div>
                {getStatusBadge(application.status)}
              </div>
              <div className="divider" />

              <div className="meta-list">
                <div className="meta-item">
                  <FaMapMarkerAlt className="icon-left" />
                  <span>{application?.job?.location || 'Remote'}</span>
                </div>
                <div className="meta-item">
                  <FaCalendarAlt className="icon-left" />
                  <span>Applied {formatDate(application.appliedAt)}</span>
                </div>
                {application.updatedAt && application.status !== 'applied' && (
                  <div className="meta-updated">Updated: {formatDate(application.updatedAt)}</div>
                )}
              </div>

              {application.job && (
                <div className="chip-row">
                  {Object.entries(application.job)
                    .filter(([k, v]) => v && !['title', 'company', 'description'].includes(String(k).toLowerCase()))
                    .slice(0, 8)
                    .map(([k, v]) => (
                      <span key={k} className="chip">
                        {k.replace(/([A-Z])/g, ' $1')}: {String(v)}
                      </span>
                    ))}
                </div>
              )}

              {application.interviewScheduled && (
                <div className="panel panel-purple">
                  <p className="panel-title">{application.status === 'interview_completed' ? 'Interview Completed' : 'Upcoming Interview'}</p>
                  <div className="panel-row">
                    <FaCalendarAlt className="icon-left purple" />
                    <span>{formatDate(application.interviewScheduled)}</span>
                  </div>
                  {application.interviewLink && (
                    <a href={application.interviewLink} target="_blank" rel="noopener noreferrer" className="pill-btn purple">{application.status === 'interview_completed' ? 'View Recording' : 'Join Meeting'}</a>
                  )}
                </div>
              )}

              {application.notes && (
                <div className="panel panel-yellow">
                  <p className="panel-title">Note from Recruiter</p>
                  <p className="panel-text">{application.notes}</p>
                </div>
              )}
              
              {(application.status === 'selected' || application.status === 'hired' || application.status === 'offer_accepted') && (
                <div className="panel panel-green">
                  <p className="panel-title">🎉 Congratulations! You've been Selected</p>
                  <div className="panel-row">
                    <FaTrophy className="icon-left green" />
                    <span>
                      {application.status === 'hired' ? 
                        'You have been hired for this position! Welcome to the team.' :
                        application.status === 'offer_accepted' ?
                        'Your job offer has been accepted. HR will contact you with next steps.' :
                        'You have been selected for this position. Congratulations on your success!'}
                    </span>
                  </div>
                  {application.selectedAt && (
                    <div className="panel-row">
                      <FaCalendarAlt className="icon-left green" />
                      <span>Selected on: {formatDate(application.selectedAt)}</span>
                    </div>
                  )}
                </div>
              )}
              
              {application.status === 'rejected' && (
                <div className="panel panel-red">
                  <p className="panel-title">Application Rejected</p>
                  <div className="panel-row">
                    <FaTimesCircle className="icon-left red" />
                    <span>
                      {application.rejectionReason || 
                       application.notes?.includes('not attempted') || 
                       application.notes?.includes('auto-rejected') ? 
                        'Application rejected due to not attempting required assessment rounds.' :
                        'Application was not selected to proceed to the next stage.'}
                    </span>
                  </div>
                  {application.rejectedAt && (
                    <div className="panel-row">
                      <FaCalendarAlt className="icon-left red" />
                      <span>Rejected on: {formatDate(application.rejectedAt)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="card-footer">
                <span className="id-text">ID: {application.job.id || application._id}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Applications;
