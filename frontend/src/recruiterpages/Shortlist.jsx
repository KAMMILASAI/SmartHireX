 import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';
import { API_BASE_URL } from '../config';
import { 
  FiArrowLeft, 
  FiUsers, 
  FiStar, 
  FiAward, 
  FiTrendingUp,
  FiCheckCircle,
  FiXCircle,
  FiMail,
  FiMapPin,
  FiCalendar
} from 'react-icons/fi';
import './Shortlist.css';

const Shortlist = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  const [stats, setStats] = useState({});
  const [jobRequirements, setJobRequirements] = useState({});
  const [job, setJob] = useState(null);

  const fetchShortlistedCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Fetching shortlisted candidates for job:', jobId);
      const shortlistResponse = await axios.get(`${API_BASE_URL}/jobs/${jobId}/shortlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Shortlist API response:', shortlistResponse.data);
      const responseData = shortlistResponse.data;
      setShortlistedCandidates(responseData.shortlistedCandidates || []);
      setStats(responseData.stats || {});
      setJobRequirements(responseData.jobRequirements || {});
      if (responseData.round1Started) {
        console.log('⚠️ Round 1 has started - Shortlisting disabled');
        if (responseData.statusMessage) {
          showError(responseData.statusMessage);
        }
      } else if (responseData.canShortlist && responseData.statusMessage) {
        showSuccess(responseData.statusMessage);
      }
      const jobResponse = await axios.get(`${API_BASE_URL}/recruiter/rounds/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJob(jobResponse.data);
    } catch (error) {
      console.error('Error fetching shortlisted candidates:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch shortlisted candidates';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [jobId, showSuccess, showError]);

  useEffect(() => {
    fetchShortlistedCandidates();
  }, [fetchShortlistedCandidates]);

  // Format date function to handle array format, Unix timestamps and ISO strings
  const formatDate = (dateValue) => {
    if (!dateValue) return 'Not set';
    
    try {
      let date;
      
      if (Array.isArray(dateValue)) {
        // Handle LocalDateTime array format: [year, month, day, hour, minute, second]
        const [year, month, day, hour, minute, second] = dateValue;
        // Note: JavaScript months are 0-based, so subtract 1 from month
        date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
      } else if (typeof dateValue === 'number') {
        // Handle Unix timestamp (multiply by 1000 to convert to milliseconds)
        date = new Date(dateValue * 1000);
      } else if (typeof dateValue === 'string') {
        // Handle ISO string
        date = new Date(dateValue);
      } else {
        return 'Invalid Date';
      }
      
      // Check if the date is valid before formatting
      if (!date || isNaN(date.getTime())) {
        console.error('Invalid date value:', dateValue);
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-GB'); // Use a specific locale for dd/mm/yyyy format
    } catch (error) {
      console.error('Error formatting date:', error, 'Value:', dateValue);
      return 'Date Error';
    }
  };

 

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981'; // Green
    if (score >= 80) return '#3b82f6'; // Blue
    if (score >= 70) return '#f59e0b'; // Yellow
    if (score >= 60) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getGradeIcon = (grade) => {
    switch (grade) {
      case 'A+': return <FiAward className="grade-icon excellent" />;
      case 'A': return <FiStar className="grade-icon good" />;
      case 'B+': return <FiTrendingUp className="grade-icon average" />;
      default: return <FiCheckCircle className="grade-icon basic" />;
    }
  };

  if (loading) {
    return (
      <div className="shortlist-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Analyzing candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shortlist-container">
      {/* Header */}
      <div className="shortlist-header">
        <button className="back-btn" onClick={() => navigate(`/recruiter/rounds/${jobId}`)}>
          <FiArrowLeft /> Back to Rounds
        </button>
        <div className="job-info">
          <h1>Shortlisted Candidates</h1>
          <p>{job?.title} - {job?.company}</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <FiUsers />
            </div>
            <div className="stat-content">
              <h3>{stats.totalApplications || 0}</h3>
              <p>Total Applications</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon qualified">
              <FiCheckCircle />
            </div>
            <div className="stat-content">
              <h3>{stats.shortlistedCandidates || 0}</h3>
              <p>Qualified Candidates</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon rate">
              <FiTrendingUp />
            </div>
            <div className="stat-content">
              <h3>{stats.shortlistingRate ? `${stats.shortlistingRate.toFixed(1)}%` : '0%'}</h3>
              <p>Shortlisting Rate</p>
            </div>
          </div>
          {stats.averageScore && (
            <div className="stat-card">
              <div className="stat-icon score">
                <FiStar />
              </div>
              <div className="stat-content">
                <h3>{stats.averageScore.toFixed(1)}</h3>
                <p>Average Score</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Job Requirements */}
      <div className="requirements-section">
        <h3>Job Requirements</h3>
        <div className="requirements-grid">
          <div className="requirement-item">
            <strong>Required Skills:</strong>
            <span>{jobRequirements.skills || 'Not specified'}</span>
          </div>
          <div className="requirement-item">
            <strong>Minimum CGPA:</strong>
            <span>{jobRequirements.minCgpa || 'Not specified'}</span>
          </div>
          <div className="requirement-item">
            <strong>Max Backlogs:</strong>
            <span>{jobRequirements.minBacklogs || 'Not specified'}</span>
          </div>
        </div>
      </div>

      {/* Candidates List */}
      <div className="candidates-section">
        {shortlistedCandidates.length === 0 ? (
          <div className="empty-state">
            <FiXCircle className="empty-icon" />
            <h3>No Qualified Candidates</h3>
            <p>No candidates meet the minimum requirements for this position.</p>
          </div>
        ) : (
          <div className="candidates-list">
            {shortlistedCandidates.map((candidate, index) => {
              // Debug: Log each candidate object
              console.log(`Candidate ${index + 1}:`, candidate);
              
              return (
              <div key={candidate.applicationId || candidate.id || index} className="candidate-card">
                <div className="candidate-header">
                  <div className="candidate-info">
                    <div className="rank-badge">#{candidate.rank}</div>
                    <div className="candidate-details">
                      <h4>{candidate.name || candidate.candidateName || 'Anonymous'}</h4>
                      <div className="candidate-meta">
                        <span><FiMail /> {candidate.email || candidate.candidateEmail || 'No email'}</span>
                        <span><FiMapPin /> {candidate.college || candidate.candidateCollege || 'Not specified'}</span>
                        <span><FiCalendar /> Applied {formatDate(candidate.appliedAt || candidate.applicationDate || candidate.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="candidate-score">
                    <div className="total-score" style={{ color: getScoreColor(candidate.totalScore) }}>
                      {candidate.totalScore.toFixed(1)}
                    </div>
                    <div className="grade">
                      {getGradeIcon(candidate.scoreGrade)}
                      <span>{candidate.scoreGrade}</span>
                    </div>
                  </div>
                </div>

                <div className="candidate-body">
                  {/* Skills Section */}
                  <div className="skills-section">
                    <h5>Skills Analysis</h5>
                    <div className="skills-match">
                      <div className="match-percentage">
                        <span className="percentage">{candidate.skillMatchPercentage.toFixed(1)}%</span>
                        <span className="match-label">{candidate.skillMatchDescription}</span>
                      </div>
                      <div className="skills-breakdown">
                        <div className="skill-group">
                          <strong>Matching Skills:</strong>
                          <div className="skills-tags">
                            {candidate.matchingSkills.map(skill => (
                              <span key={skill} className="skill-tag matching">{skill}</span>
                            ))}
                          </div>
                        </div>
                        <div className="skill-group">
                          <strong>All Candidate Skills:</strong>
                          <div className="skills-tags">
                            {candidate.candidateSkills.map(skill => (
                              <span 
                                key={skill} 
                                className={`skill-tag ${candidate.matchingSkills.includes(skill) ? 'matching' : 'additional'}`}
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scores Breakdown */}
                  <div className="scores-section">
                    <h5>Score Breakdown</h5>
                    <div className="score-bars">
                      <div className="score-item">
                        <span>Skills Match</span>
                        <div className="score-bar">
                          <div 
                            className="score-fill" 
                            style={{ width: `${candidate.skillsScore}%`, backgroundColor: getScoreColor(candidate.skillsScore) }}
                          ></div>
                        </div>
                        <span>{candidate.skillsScore.toFixed(1)}</span>
                      </div>
                      <div className="score-item">
                        <span>CGPA Score</span>
                        <div className="score-bar">
                          <div 
                            className="score-fill" 
                            style={{ width: `${candidate.cgpaScore}%`, backgroundColor: getScoreColor(candidate.cgpaScore) }}
                          ></div>
                        </div>
                        <span>{candidate.cgpaScore.toFixed(1)}</span>
                      </div>
                      <div className="score-item">
                        <span>Experience</span>
                        <div className="score-bar">
                          <div 
                            className="score-fill" 
                            style={{ width: `${candidate.experienceScore}%`, backgroundColor: getScoreColor(candidate.experienceScore) }}
                          ></div>
                        </div>
                        <span>{candidate.experienceScore.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="additional-info">
                    <div className="info-grid">
                      {candidate.cgpa && (
                        <div className="info-item">
                          <strong>CGPA:</strong> {candidate.cgpa}
                        </div>
                      )}
                      {candidate.profileType && (
                        <div className="info-item">
                          <strong>Profile:</strong> {candidate.profileType}
                        </div>
                      )}
                      {candidate.yearsExp && (
                        <div className="info-item">
                          <strong>Experience:</strong> {candidate.yearsExp} years
                        </div>
                      )}
                      {candidate.company && (
                        <div className="info-item">
                          <strong>Company:</strong> {candidate.company}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Qualification Status */}
                  <div className="qualification-status">
                    <div className={`status-badge ${candidate.qualified ? 'qualified' : 'not-qualified'}`}>
                      {candidate.qualified ? <FiCheckCircle /> : <FiXCircle />}
                      {candidate.qualificationStatus}
                    </div>
                    <div className="qualification-reasons">
                      {candidate.qualificationReasons.map((reason, idx) => (
                        <span key={idx} className="reason">{reason}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shortlist;
