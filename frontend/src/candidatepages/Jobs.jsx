import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { API_BASE_URL } from '../config';
import { FaSearch, FaBriefcase, FaMapMarkerAlt, FaClock, FaBuilding, FaEye, FaLock, FaTags, FaCalendarAlt, FaPlay, FaStop, FaKey } from 'react-icons/fa';
import './Job.css';

// Loading spinner component
const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
  </div>
);

// Enhanced Job Card Component
const JobCard = ({ job, onApply, isApplying, hasApplied }) => {
  const handleApply = (e) => {
    e.stopPropagation();
    if (!hasApplied && !isJobExpired(job)) {
      onApply(job);
    }
  };

  // Check if job is expired
  const isJobExpired = (job) => {
    if (!job.endDate && !job.deadline && !job.expiryDate && !job.endTime) return false;
    const expiryDate = new Date(job.endDate || job.deadline || job.expiryDate || job.endTime);
    return expiryDate < new Date();
  };

  // Format date with better styling
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr}, ${timeStr}`;
  };

  const expired = job.isExpired || isJobExpired(job);
  const isPrivate = job.isPrivate || job.private || job.accessCode;

  return (
    <div className={`job-card-new ${hasApplied ? 'applied' : ''} ${expired ? 'expired' : ''} ${isPrivate ? 'private' : 'public'}`}>
      {/* Job Card Header */}
      <div className="job-card-header-new">
        <div className="job-header-top">
          <div className="job-title-section">
            <h3 className="job-title-new">{job.title || 'Job Title'}</h3>
            <div className="job-company-new">
              <FaBuilding size={14} />
              <span>{job.company || 'Company Name'}</span>
            </div>
          </div>
          <div className="job-status-badges">
            <span className={`job-visibility-badge ${isPrivate ? 'private' : 'public'}`}>
              {isPrivate ? <FaLock size={12} /> : <FaEye size={12} />}
              {isPrivate ? 'Private' : 'Public'}
            </span>
            {job.type && (
              <span className="job-type-badge-new">
                <FaBriefcase size={12} />
                {job.type}
              </span>
            )}
          </div>
        </div>
        
        <div className="job-meta-new">
          <div className="job-meta-item-new">
            <FaMapMarkerAlt size={12} />
            <span>{job.location || 'Remote'}</span>
          </div>
          {job.salary && (
            <div className="job-meta-item-new">
              <span>💰 {job.salary}</span>
            </div>
          )}
        </div>

        {/* Job Timeline in Header */}
        <div className="job-timeline-section">
          <div className="timeline-item">
            <div className="timeline-icon start">
              <FaPlay size={8} />
            </div>
            <div className="timeline-content">
              <span className="timeline-label">Start</span>
              <span className="timeline-value">{formatDate(job.startDate || job.startTime)}</span>
            </div>
          </div>
          <div className="timeline-divider"></div>
          <div className="timeline-item">
            <div className="timeline-icon end">
              <FaStop size={8} />
            </div>
            <div className="timeline-content">
              <span className="timeline-label">End</span>
              <span className="timeline-value">{formatDate(job.endDate || job.endTime || job.deadline || job.expiryDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Job Card Body */}
      <div className="job-card-body-new">
        {/* Job Description */}
        {job.description && (
          <div className="job-description-section-new">
            <p className="job-description-new">
              {job.description.length > 180 ? `${job.description.substring(0, 180)}...` : job.description}
            </p>
          </div>
        )}

        {/* Job Skills */}
        {job.skills && job.skills.length > 0 && (
          <div className="job-skills-section-new">
            <div className="skills-header-new">
              <FaTags size={12} />
              <span>Required Skills</span>
            </div>
            <div className="job-skills-new">
              {job.skills.slice(0, 5).map((skill, index) => (
                <span key={index} className="skill-tag-new">
                  {skill}
                </span>
              ))}
              {job.skills.length > 5 && (
                <span className="skill-tag-new more-skills-new">
                  +{job.skills.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Job Card Footer */}
      <div className="job-card-footer-new">
        <div className="job-footer-info">
          <span className="job-posted-new">
            <FaClock size={12} />
            {job.posted ? formatDate(job.posted) : 'Recently posted'}
          </span>
          {expired && (
            <span className="job-expired-new">
              ⚠️ Expired
            </span>
          )}
        </div>
        <button
          className={`apply-btn-new ${hasApplied ? 'applied' : ''} ${isApplying ? 'loading' : ''} ${expired ? 'disabled' : ''}`}
          onClick={handleApply}
          disabled={hasApplied || isApplying || expired}
        >
          <span className="btn-text">
            {expired ? 'Expired' : hasApplied ? 'Applied' : isApplying ? 'Applying...' : 'Apply Now'}
          </span>
          {hasApplied && <span className="btn-icon">✓</span>}
        </button>
      </div>
    </div>
  );
};

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState(null);
  const [applyingId, setApplyingId] = useState(null);
  const [appliedIds, setAppliedIds] = useState(() => new Set());
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessCodeLoading, setAccessCodeLoading] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [jobsRes, profRes, appsRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/candidate/jobs`, { headers }),
          axios.get(`${API_BASE_URL}/candidate/profile`, { headers }),
          axios.get(`${API_BASE_URL}/candidate/applications`, { headers })
        ]);
        if (jobsRes.status === 'fulfilled') {
          const list = Array.isArray(jobsRes.value.data) ? jobsRes.value.data : [];
          console.log('Jobs fetched:', list.length, 'jobs');
          console.log('Sample job:', list[0]);
          setJobs(list);
        } else {
          console.error('Jobs fetch failed:', jobsRes.reason);
          setError('Failed to load jobs');
        }
        if (profRes.status === 'fulfilled') {
          setProfile(profRes.value.data || null);
        }
        if (appsRes.status === 'fulfilled') {
          const apps = Array.isArray(appsRes.value.data) ? appsRes.value.data : [];
          const ids = new Set();
          apps.forEach(a => {
            if (a?.job?.id != null) ids.add(a.job.id);
          });
          setAppliedIds(ids);
        }
      } catch (e) {
        setError('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleApply = async (job) => {
    if (!job?.linkId) return;
    try {
      setApplyingId(job.id);
      // Build minimal payload from profile
      const payload = {
        name: profile?.name || '',
        email: profile?.email || '',
        college: profile?.college || '',
        cgpa: profile?.cgpa || undefined,
        skills: Array.isArray(profile?.skills) ? profile.skills : (typeof profile?.skills === 'string' ? profile.skills.split(',').map(s=>s.trim()).filter(Boolean) : [])
      };
      // Fallback: if email missing, try localStorage user
      if (!payload.email) {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const u = JSON.parse(userStr);
            if (u?.email) payload.email = u.email;
            if (u?.name && !payload.name) payload.name = u.name;
          }
        } catch {}
      }
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(`${API_BASE_URL}/jobs/${job.linkId}/apply`, payload, { headers });
      // Mark as applied in UI
      setAppliedIds(prev => new Set(prev).add(job.id));
      const msg = res?.data?.alreadyApplied ? 'Already applied to this job' : 'Application submitted successfully';
      res?.data?.alreadyApplied ? showInfo(msg) : showSuccess(msg);
      navigate('/candidate/applications');
    } catch (e) {
      // If already applied, also mark as applied
      const msg = e?.response?.data?.message || '';
      if (/already applied/i.test(msg)) {
        setAppliedIds(prev => new Set(prev).add(job.id));
        showInfo('Already applied to this job');
        navigate('/candidate/applications');
      } else {
        const finalMsg = msg || 'Failed to apply';
        setError(finalMsg);
        showError(finalMsg);
      }
    } finally {
      setApplyingId(null);
    }
  };

  const handleAccessCodeSubmit = async () => {
    const code = accessCode.trim();
    if (!code) {
      showError('Please enter an access code');
      return;
    }

    try {
      setAccessCodeLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
      
      // Try with different property names that the server might expect
      const payloads = [
        { accessCode: code },
        { code },
        { jobCode: code },
        { access_code: code }
      ];

      let response;
      let lastError;

      // Try different payload formats
      for (const payload of payloads) {
        try {
          response = await axios.post(
            `${API_BASE_URL}/candidate/jobs/access-code`,
            payload,
            { headers }
          );
          // If successful, break the loop
          if (response.data) break;
        } catch (err) {
          lastError = err;
          // If it's not a 400 error, rethrow
          if (err.response?.status !== 400) throw err;
        }
      }

      if (!response) {
        throw lastError || new Error('Failed to process access code');
      }

      // Handle the successful response
      const privateJob = response.data;
      if (privateJob) {
        setJobs(prev => [privateJob, ...prev]);
        showSuccess('Private job accessed successfully!');
        setShowAccessCodeModal(false);
        setAccessCode('');
      } else {
        throw new Error('No job data received');
      }
    } catch (error) {
      console.error('Access code error:', error);
      const errorMsg = error.response?.data?.message || 
                      error.message || 
                      'Invalid or expired access code. Please check and try again.';
      showError(errorMsg);
    } finally {
      setAccessCodeLoading(false);
    }
  };

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    return (
      (j.title || '').toLowerCase().includes(q) ||
      (j.company || '').toLowerCase().includes(q) ||
      (j.location || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="empty-title">Error loading jobs</h3>
        <p className="empty-text">{error}</p>
        <button className="btn btn-outline" onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="jobs-container">
      <div className="jobs-header">
        <div className="header-content">
          <h1 className="jobs-title">Find Jobs</h1>
          <p className="jobs-subtitle">Browse active openings and apply directly</p>
        </div>
        <div className="search-container">
          <div className="search-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by title, company, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            className="access-code-btn"
            onClick={() => setShowAccessCodeModal(true)}
          >
            <FaKey /> Enter Job Code
          </button>
        </div>
      </div>

      <div className="jobs-grid">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="empty-title">No jobs found</h3>
            <p className="empty-text">Try adjusting your search or check back later</p>
            <button 
              className="btn btn-outline" 
              onClick={() => setSearch('')}
            >
              Clear Search
            </button>
          </div>
        ) : (
          filtered.map(job => (
            <JobCard
              key={job.id}
              job={job}
              hasApplied={appliedIds.has(job.id)}
              isApplying={applyingId === job.id}
              onApply={handleApply}
            />
          ))
        )}
      </div>

      {/* Access Code Modal */}
      {showAccessCodeModal && (
        <div className="modal-overlay" onClick={() => setShowAccessCodeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Enter Job Code</h2>
              <button 
                className="modal-close"
                onClick={() => setShowAccessCodeModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-text">
                Enter the access code provided by the recruiter to access a private job posting.
              </p>
              <div className="form-group">
                <label htmlFor="accessCode" className="form-label">Access Code</label>
                <input
                  id="accessCode"
                  type="text"
                  className="form-input"
                  placeholder="e.g., ABC123XY"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleAccessCodeSubmit()}
                  disabled={accessCodeLoading}
                  autoComplete="off"
                  autoCapitalize="characters"
                />
              </div>
              <div className="button-group">
                <button 
                  className="btn btn-outline"
                  onClick={() => setShowAccessCodeModal(false)}
                  disabled={accessCodeLoading}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleAccessCodeSubmit}
                  disabled={accessCodeLoading || !accessCode.trim()}
                >
                  {accessCodeLoading ? 'Accessing...' : 'Access Job'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jobs;
