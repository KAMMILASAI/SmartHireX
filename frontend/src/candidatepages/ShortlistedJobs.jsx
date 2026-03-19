 import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useToast } from '../contexts/ToastContext';
import {
  FiBriefcase,
  FiMapPin,
  FiCalendar,
  FiClock,
  FiUsers,
  FiFileText,
  FiAward,
  FiChevronRight,
  FiArrowLeft,
  FiCheckCircle,
  FiPlay,
  FiCode,
  FiVideo
} from 'react-icons/fi';
import './ShortlistedJobs.css';

const ShortlistedJobs = () => {
  const navigate = useNavigate();
  const [shortlistedJobs, setShortlistedJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobRounds, setJobRounds] = useState([]);
  const [interviewRounds, setInterviewRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [roundStatuses, setRoundStatuses] = useState({});
  const [expandedRounds, setExpandedRounds] = useState({});
  const { showError } = useToast();

  const fetchShortlistedJobs = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/candidate/shortlisted-jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('=== FETCHED JOBS DEBUG ===');
      response.data.forEach(job => {
        console.log(`Job: ${job.title}`);
        job.rounds?.forEach(round => {
          console.log(`  Round: ${round.title}, Type: ${round.type}, ID: ${round.id || round._id}`);
        });
      });
      setShortlistedJobs(response.data || []);
    } catch (error) {
      console.error('Error fetching shortlisted jobs:', error);
      showError('Failed to fetch shortlisted jobs');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchShortlistedJobs();
  }, [fetchShortlistedJobs]);

  const toggleRoundExpansion = (roundId) => {
    console.log('Toggling round:', roundId);
    setExpandedRounds(prev => ({
      ...prev,
      [roundId]: !prev[roundId]
    }));
  };

  const [timeUntilStart, setTimeUntilStart] = useState({});
  // Countdown timer effect
useEffect(() => {
  const timer = setInterval(() => {
    const now = new Date();
    const newTimes = {};
    
    // Process job rounds
    jobRounds.forEach(round => {
      if (round.startTime) {
        let startTime;
        
        // Handle different date formats from backend
        if (Array.isArray(round.startTime)) {
          // Handle LocalDateTime array format: [year, month, day, hour, minute]
          const [year, month, day, hour, minute] = round.startTime;
          startTime = new Date(year, month - 1, day, hour || 0, minute || 0);
        } else if (typeof round.startTime === 'string') {
          startTime = new Date(round.startTime);
        } else if (typeof round.startTime === 'number') {
          startTime = new Date(round.startTime * 1000);
        } else {
          console.error('Invalid startTime format:', round.startTime);
          return;
        }
        
        if (startTime > now) {
          const diffMs = startTime - now;
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
          newTimes[round._id] = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
          newTimes[round._id] = '00:00:00';
        }
      }
    });
    
    // Process interview rounds
    interviewRounds.forEach(interview => {
      if (interview.scheduledDateTime) {
        let interviewDate;
        
        try {
          interviewDate = new Date(interview.scheduledDateTime);
          
          if (!isNaN(interviewDate.getTime()) && interviewDate > now) {
            const diffMs = interviewDate - now;
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            newTimes[`interview-${interview.id}`] = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          } else {
            newTimes[`interview-${interview.id}`] = '00:00:00';
          }
        } catch (error) {
          console.error('Error processing interview countdown:', interview.title, error);
        }
      }
    });
    
    setTimeUntilStart(prev => ({ ...prev, ...newTimes }));
  }, 1000);

  return () => clearInterval(timer);
}, [jobRounds, interviewRounds]);

  const formatDateTime = (dateValue) => {
    if (!dateValue) return 'Not set';
    
    try {
      let date;
      
      if (Array.isArray(dateValue)) {
        // Handle LocalDateTime array format: [year, month, day, hour, minute]
        const [year, month, day, hour, minute] = dateValue;
        // Note: JavaScript months are 0-based, so subtract 1 from month
        date = new Date(year, month - 1, day, hour || 0, minute || 0);
      } else if (typeof dateValue === 'number') {
        date = new Date(dateValue * 1000);
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else {
        return 'Invalid Date';
      }
      
      if (!date || isNaN(date.getTime())) {
        console.error('Invalid date value:', dateValue);
        return 'Invalid Date';
      }
      
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Error formatting date:', error, 'Value:', dateValue);
      return 'Date Error';
    }
  };

  const fetchJobRounds = async (jobId) => {
    try {
      setRoundsLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Fetch rounds for the selected job (public endpoint for candidates)
      const response = await axios.get(`${API_BASE_URL}/jobs/${jobId}/rounds`, { headers });
      const rounds = response.data || [];
      setJobRounds(rounds);

      // Load candidate status for each round to determine shortlist and exam attempt information
      const statusPromises = rounds.map(async (round) => {
        const roundId = round?._id || round?.id;
        if (!roundId) return null;

        const roundType = (round?.type || '').toUpperCase();
        let hasBeenTaken = false;
        let unifiedData = {};

        // Step 1: Try type-specific endpoint first (more reliable, simpler query)
        try {
          if (roundType === 'CODING') {
            const r = await axios.get(`${API_BASE_URL}/candidate/coding/exam-status/${roundId}`, { headers });
            hasBeenTaken = !!r.data?.alreadyTaken;
            unifiedData = r.data || {};
          } else if (roundType === 'MCQS_CODING' || roundType === 'MIXED') {
            const r = await axios.get(`${API_BASE_URL}/candidate/mixed-exam/status/${roundId}`, { headers });
            hasBeenTaken = !!r.data?.alreadyTaken;
            unifiedData = r.data || {};
          } else if (roundType === 'MCQS') {
            // Use dedicated MCQ status endpoint — simple, no shortlist logic
            const r = await axios.get(`${API_BASE_URL}/candidate/mcq/exam-status/${roundId}`, { headers });
            hasBeenTaken = !!r.data?.alreadyTaken;
            unifiedData = r.data || { hasBeenTaken };
          }
        } catch (_) {}

        // Step 2: For non-MCQS rounds, try unified endpoint for shortlist/decision enrichment
        if (roundType !== 'MCQS') {
        try {
          const statusResponse = await axios.get(`${API_BASE_URL}/candidate/exam/${roundId}/status`, { headers });
          unifiedData = statusResponse.data || {};
          // Unified endpoint's hasBeenTaken is authoritative if true
          if (unifiedData.hasBeenTaken === true) hasBeenTaken = true;
        } catch (_) {
          // Unified endpoint failed — that's OK, we already have type-specific result
        }
        }

        return {
          roundId,
          status: {
            ...unifiedData,
            hasBeenTaken,
            eligibleToAttempt: unifiedData.eligibleToAttempt ?? true,
            decisionStatus: unifiedData.decisionStatus || 'AWAITING_RESULT'
          }
        };
      });

      const statusResults = await Promise.all(statusPromises);
      const statusMap = {};
      statusResults.forEach((entry) => {
        if (entry?.roundId) {
          statusMap[entry.roundId] = entry.status;
        }
      });
      setRoundStatuses(statusMap);
      
    } catch (error) {
      console.error('Error fetching job rounds:', error);
      showError('Failed to fetch job rounds');
      setJobRounds([]);
    } finally {
      setRoundsLoading(false);
    }
  };

  const fetchInterviewRounds = async (jobId) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      
      // Get user email from the user object in localStorage
      let userEmail = null;
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          userEmail = user.email || user.userEmail || user.username;
        }
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
      
      // Fallback to direct keys
      if (!userEmail) {
        userEmail = localStorage.getItem('userEmail') || localStorage.getItem('email');
      }
      
      if (!userEmail) {
        console.warn('No user email found for fetching interview rounds');
        return;
      }

      // Fetch interview rounds for this candidate and job
      const response = await axios.get(`${API_BASE_URL}/interviews/candidate/${userEmail}/job/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const interviews = response.data || [];
      console.log('Fetched interview rounds:', interviews);
      setInterviewRounds(interviews);
      
    } catch (error) {
      console.error('Error fetching interview rounds:', error);
      // Don't show error to user as this is optional functionality
      setInterviewRounds([]);
    }
  };

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    if (job?.id) {
      fetchJobRounds(job.id);
      fetchInterviewRounds(job.id);
    }
  };

  const getRoundTypeIcon = (type) => {
    switch (type?.toUpperCase()) {
      case 'MCQS': return <FiFileText className="round-icon mcqs" />;
      case 'MCQS_CODING': return <FiFileText className="round-icon mcqs-coding" />;
      case 'CODING': return <FiCode className="round-icon coding" />;
      case 'TECHNICAL_INTERVIEW': return <FiUsers className="round-icon technical" />;
      case 'HR_INTERVIEW': return <FiUsers className="round-icon hr" />;
      default: return <FiFileText className="round-icon default" />;
    }
  };

  const getRoundStatus = (round) => {
    const now = new Date();
    let startTime;
    
    // Handle array format for startTime
    if (Array.isArray(round.startTime)) {
      const [year, month, day, hour, minute] = round.startTime;
      startTime = new Date(year, month - 1, day, hour || 0, minute || 0);
    } else {
      startTime = new Date(round.startTime);
    }
    
    // Allow access 15 minutes before the scheduled start time
    const accessTime = new Date(startTime.getTime() - 15 * 60000);
    const endTime = new Date(startTime.getTime() + (round.duration * 60000));
    
    if (now < accessTime) return 'upcoming';
    if (now >= accessTime && now <= endTime) return 'ongoing';
    return 'completed';
  };
  const handleStartExam = (round) => {
    const roundId = round._id || round.id;
    const isCodingRound = round.type === 'CODING';
    let isMixedRound = round.type === 'MCQS_CODING';

    const currentStatus = roundStatuses[roundId] || {};
    const currentDecision = (currentStatus.decisionStatus || '').toString().toUpperCase();
    const isAttempted =
      !!currentStatus.hasBeenTaken ||
      !!currentStatus.alreadyTaken ||
      !!currentStatus.disqualified ||
      ['COMPLETED', 'SUBMITTED', 'AUTO_SUBMITTED', 'MALPRACTICE'].includes(currentDecision);

    if (isAttempted) {
      showError('You have already submitted this exam.');
      return;
    }

    // TEMPORARY: Force round 8 to be treated as mixed for debugging
    if (roundId == 8) {
      console.log('FORCING ROUND 8 TO BE MIXED FOR DEBUGGING');
      isMixedRound = true;
    }
    
    // Debug logging
    console.log('=== EXAM ROUTING DEBUG ===');
    console.log('Round ID:', roundId);
    console.log('Round Type:', round.type);
    console.log('Is Coding Round:', isCodingRound);
    console.log('Is Mixed Round:', isMixedRound);
    
    let examPath = '';
    if (isMixedRound) {
      examPath = `/candidate/mixed-exam/${roundId}`;
    } else if (isCodingRound) {
      examPath = `/candidate/coding-exam/${roundId}`;
    } else {
      examPath = `/candidate/exam/${roundId}`;
    }

    // Navigate to System Check first instead of direct exam
    console.log('Navigating to System Check before exam:', `/candidate/system-check/${roundId}`);
    navigate(`/candidate/system-check/${roundId}`, { 
      state: { 
        examPath,
        roundTitle: round.title,
        roundType: round.type
      } 
    });
  };

  const handleJoinInterview = (interview) => {
    if (!interview.roomCode) {
      alert('No video room available for this interview');
      return;
    }

    const confirmMessage = `Join ${interview.title}?\n\n` +
      `🎥 VIDEO INTERVIEW:\n` +
      `• Room Code: ${interview.roomCode}\n` +
      `• Password: ${interview.roomPassword || 'Not required'}\n` +
      `• Duration: ${interview.durationMinutes} minutes\n` +
      `• Type: ${interview.roundTypeDisplayName}\n\n` +
      `Make sure you have a stable internet connection and your camera/microphone are working.\n\n` +
      `Ready to join the interview?`;

    if (window.confirm(confirmMessage)) {
      // Use internal video call system with password if available
      const params = new URLSearchParams({
        interviewName: interview.title,
        ...(interview.roomPassword && { password: interview.roomPassword })
      });
      
      const videoCallUrl = `/video-call/${interview.roomCode}?${params.toString()}`;
      window.open(videoCallUrl, '_blank', 'width=1400,height=900');
    }
  };

  if (loading) {
    return (
      <div className="shortlisted-jobs-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading shortlisted jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shortlisted-jobs-container">
      <div className="shortlisted-jobs-layout">
        {/* Sidebar with job list */}
        <div className="jobs-sidebar">
          <div className="sidebar-header">
            <h2>
              <FiAward className="header-icon" />
              My Drives
            </h2>
            <p className="subtitle">View and manage your job drives</p>
          </div>

          <div className="jobs-list">
            {shortlistedJobs.length === 0 ? (
              <div className="empty-state">
                <FiAward className="empty-icon" />
                <h3>No Drives Found</h3>
                <p>You don't have any active job drives yet.</p>
              </div>
            ) : (
              shortlistedJobs.map((job) => (
                <div
                  key={job._id}
                  className={`job-card ${selectedJob?._id === job._id ? 'selected' : ''}`}
                  onClick={() => handleJobSelect(job)}
                >
                  <div className="job-header">
                    <div className="company-logo">
                      {job.company?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="job-info">
                      <h3 className="job-title">{job.title}</h3>
                      <p className="company-name">{job.company}</p>
                    </div>
                    <FiChevronRight className="chevron-icon" />
                  </div>
                  
                  <div className="job-meta">
                    <div className="meta-item">
                      <FiMapPin className="meta-icon" />
                      <span>{job.location || 'Remote'}</span>
                    </div>
                    <div className="meta-item">
                      <FiCalendar className="meta-icon" />
                      <span>CTC: {job.ctc || 'Not specified'}</span>
                    </div>
                  </div>

                  <div className="status-section">
                    <span className="status-badge shortlisted">
                      <FiCheckCircle />
                      Shortlisted
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main content area */}
        <div className="main-content">
          {!selectedJob ? (
            <div className="no-selection">
              <FiBriefcase className="no-selection-icon" />
              <h3>Select a Job</h3>
              <p>Choose a job from the sidebar to view its details and rounds</p>
            </div>
          ) : (
            <div className="job-details">
              {/* Job Details Header */}
              <div className="job-details-header">
                <button 
                  className="back-btn mobile-only"
                  onClick={() => setSelectedJob(null)}
                >
                  <FiArrowLeft /> Back to Jobs
                </button>
                
                <div className="job-title-section">
                  <div className="company-logo large">
                    {selectedJob.company?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div className="title-info">
                    <h1>{selectedJob.title}</h1>
                    <p className="company-name">{selectedJob.company}</p>
                    <div className="job-meta-row">
                      <span><FiMapPin /> {selectedJob.location || 'Remote'}</span>
                      <span><FiCalendar /> CTC: {selectedJob.ctc || 'Not specified'}</span>
                    </div>
                  </div>
                </div>

                <div className="status-section">
                  <span className="status-badge shortlisted large">
                    <FiCheckCircle />
                    Shortlisted
                  </span>
                </div>
              </div>

              {/* Job Description */}
              {selectedJob.description && (
                <div className="job-description-section">
                  <h3>Job Description</h3>
                  <p>{selectedJob.description}</p>
                </div>
              )}

              {/* Job Requirements */}
              <div className="job-requirements-section">
                <h3>Requirements</h3>
                <div className="requirements-grid">
                  {selectedJob.ctc && (
                    <div className="requirement-item">
                      <strong>CTC:</strong> {selectedJob.ctc}
                    </div>
                  )}
                  {selectedJob.employmentType && (
                    <div className="requirement-item">
                      <strong>Type:</strong> {selectedJob.employmentType}
                    </div>
                  )}
                </div>
              </div>

              {/* Rounds Section */}
              <div className="rounds-section">
                <h3>Rounds</h3>
                
                {roundsLoading ? (
                  <div className="rounds-loading">
                    <div className="spinner small"></div>
                    <p>Loading rounds...</p>
                  </div>
                ) : jobRounds.length === 0 && interviewRounds.length === 0 ? (
                  <div className="no-rounds">
                    <FiFileText className="no-rounds-icon" />
                    <p>No rounds have been created for this job yet.</p>
                  </div>
                ) : (
                  <div className="rounds-list">
                    {jobRounds.map((round, index) => {
                      const status = getRoundStatus(round);
                      const roundId = round._id || round.id;
                      const roundOrder = typeof round.roundOrder === 'number' ? round.roundOrder : index + 1;
                      const examStatus = roundStatuses[roundId] || {};
                      const hasBeenTaken = !!examStatus.hasBeenTaken || !!examStatus.alreadyTaken;
                      const decisionStatusRaw = (examStatus.decisionStatus || '').toString().toUpperCase();
                      const shortlistedFlag = typeof examStatus.shortlisted === 'boolean' ? examStatus.shortlisted : null;
                      const normalizedDecisionStatus = decisionStatusRaw || (shortlistedFlag === true ? 'SHORTLISTED' : shortlistedFlag === false ? 'NOT_SHORTLISTED' : 'AWAITING_RESULT');
                      const eligibleToAttemptRaw = examStatus.eligibleToAttempt;
                      const isDisqualified = !!examStatus.disqualified || normalizedDecisionStatus === 'MALPRACTICE';
                      const isAutoSubmitted = ['COMPLETED', 'SUBMITTED', 'AUTO_SUBMITTED'].includes(normalizedDecisionStatus);
                      const isAttempted = hasBeenTaken || isDisqualified || isAutoSubmitted;
                      // Round 1 candidates are always eligible; READY_FOR_EXAM also means eligible
                      const eligibleToAttempt = typeof eligibleToAttemptRaw === 'boolean'
                        ? eligibleToAttemptRaw
                        : (roundOrder === 1 || normalizedDecisionStatus === 'READY_FOR_EXAM');
                      const isReadyForExam = normalizedDecisionStatus === 'READY_FOR_EXAM';
                      const isNotShortlisted = normalizedDecisionStatus === 'NOT_SHORTLISTED' && !isReadyForExam && (!eligibleToAttempt || isAttempted);

                      const canAttemptExam = !isAttempted && eligibleToAttempt && !isNotShortlisted && status === 'ongoing';
                      
                      // Round ended without any submission/malpractice auto-submit -> not attempted
                      const roundEnded = status === 'completed';
                      const notAttempted = roundEnded && !isAttempted;

                      return (
                        <div key={round._id} className={`round-card-compact ${status} ${notAttempted ? 'not-attempted' : ''}`}>
                          <div className="round-header-compact">
                            <div className="round-info-compact">
                              <div className="round-icon-compact">
                                {getRoundTypeIcon(round.type)}
                              </div>
                              <div className="round-title-section-compact">
                                <h3>Round {roundOrder}: {round.title}</h3>
                                <div className="round-meta-inline-compact">
                                  <span className="round-meta-item-compact">
                                    <span className="meta-label-compact">round type:</span>
                                    <span className="round-type-compact">{round.type?.replace('_', ' ')}</span>
                                  </span>
                                  <span className="round-meta-item-compact">
                                    <span className="meta-label-compact">questions:</span>
                                    <span className="round-questions-compact">
                                      {round.type === 'MCQS' && `${round.mcqQuestions || 10} MCQs`}
                                      {round.type === 'CODING' && `${round.codingQuestions || 5} Coding`}
                                      {(round.type === 'MIXED' || round.type === 'MCQS_CODING') && 
                                        `${(round.mcqQuestions || 5) + (round.codingQuestions || 2)} Questions`}
                                    </span>
                                  </span>
                                  <span className="round-meta-item-compact">
                                    <span className="meta-label-compact"><FiClock /> duration:</span>
                                    <span className="round-duration-compact">{round.duration}min</span>
                                  </span>
                                  {round.startTime && (
                                    <span className="round-meta-item-compact">
                                      <span className="meta-label-compact">starting time:</span>
                                      <span className="round-start-date-compact">
                                        <FiCalendar /> {formatDateTime(round.startTime)}
                                      </span>
                                    </span>
                                  )}
                                  {round.endTime && (
                                    <span className="round-meta-item-compact">
                                      <span className="meta-label-compact">ending time:</span>
                                      <span className="round-end-date-compact">
                                        <FiClock /> {formatDateTime(round.endTime)}
                                      </span>
                                    </span>
                                  )}
                                </div>
                                {round.topics && round.topics.trim() && (
                                  <div className="round-topics-row-compact">
                                    <span className="meta-label-compact">skill:</span>
                                    <span className="round-topics-inline-compact">
                                      {round.topics.split(',').filter(topic => topic.trim()).slice(0, 3).map((topic, i) => (
                                        <span key={`topic-${i}`} className="topic-tag-inline-compact">
                                          {topic.trim()}
                                        </span>
                                      ))}
                                      {round.topics.split(',').filter(topic => topic.trim()).length > 3 && (
                                        <span className="topic-more-inline-compact">+{round.topics.split(',').filter(topic => topic.trim()).length - 3}</span>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="round-actions-compact">
                              {notAttempted ? (
                                <button className="exam-btn-compact not-attempted" disabled>
                                  <FiCheckCircle /> Not Attempted (Auto Disqualified)
                                </button>
                              ) : isDisqualified ? (
                                <button className="exam-btn-compact not-shortlisted" disabled>
                                  <FiCheckCircle /> Attempted (Disqualified)
                                </button>
                              ) : status === 'ongoing' ? (
                                isAttempted ? (
                                  normalizedDecisionStatus === 'SHORTLISTED' ? (
                                    <button className="exam-btn-compact shortlisted-next" disabled>
                                      <FiCheckCircle /> Shortlisted for Next Round
                                    </button>
                                  ) : normalizedDecisionStatus === 'NOT_SHORTLISTED' ? (
                                    <button className="exam-btn-compact not-shortlisted" disabled>
                                      <FiCheckCircle /> Not Shortlisted
                                    </button>
                                  ) : (
                                    <button className="exam-btn-compact completed" disabled>
                                      <FiCheckCircle /> Submitted
                                    </button>
                                  )
                                ) : canAttemptExam ? (
                                  <button 
                                    className="start-exam-btn-compact"
                                    onClick={() => handleStartExam(round)}
                                  >
                                    <FiPlay /> Start Exam
                                  </button>
                                ) : (
                                  <button className="exam-btn-compact disabled" disabled>
                                    <FiClock /> {isNotShortlisted ? 'Not Eligible' : 'Pending'}
                                  </button>
                                )
                              ) : status === 'upcoming' && round.startTime ? (
                                <div className="round-status scheduled">
                                  <FiClock className="status-icon" />
                                  <span>Starts in: {timeUntilStart[round._id] || 'Calculating...'}</span>
                                </div>
                              ) : status === 'completed' ? (
                                isAttempted ? (
                                  normalizedDecisionStatus === 'SHORTLISTED' ? (
                                    <button className="exam-btn-compact shortlisted-next" disabled>
                                      <FiCheckCircle /> Shortlisted for Next Round
                                    </button>
                                  ) : normalizedDecisionStatus === 'NOT_SHORTLISTED' ? (
                                    <button className="exam-btn-compact not-shortlisted" disabled>
                                      <FiCheckCircle /> Not Shortlisted
                                    </button>
                                  ) : (
                                    <button className="exam-btn-compact completed" disabled>
                                      <FiCheckCircle /> Completed
                                    </button>
                                  )
                                ) : (
                                  <button className="exam-btn-compact not-attempted" disabled>
                                    <FiCheckCircle /> Not Attempted
                                  </button>
                                )
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Interview Rounds */}
                    {interviewRounds.map((interview, index) => {
                      const interviewDate = new Date(interview.scheduledDateTime);
                      const now = new Date();
                      
                      // Add 15-minute buffer before interview start (candidates can join 15 minutes early)
                      const joinBufferMs = 15 * 60 * 1000; // 15 minutes in milliseconds
                      const canJoinTime = new Date(interviewDate.getTime() - joinBufferMs);
                      
                      // Add 2-hour window after scheduled time (in case interview runs long)
                      const interviewEndTime = new Date(interviewDate.getTime() + (interview.durationMinutes || 60) * 60 * 1000);
                      const maxJoinTime = new Date(interviewEndTime.getTime() + (2 * 60 * 60 * 1000)); // +2 hours buffer
                      
                      let interviewStatus = 'upcoming';
                      
                      // Determine interview status based on time
                      if (interview.status === 'COMPLETED') {
                        interviewStatus = 'completed';
                      } else if (now >= canJoinTime && now <= maxJoinTime) {
                        // Can join: 15 minutes before until 2 hours after scheduled end
                        interviewStatus = 'ongoing';
                      } else if (now > maxJoinTime) {
                        // Interview window has passed
                        interviewStatus = 'completed';
                      } else {
                        // Still upcoming (more than 15 minutes before start)
                        interviewStatus = 'upcoming';
                      }
                      
                      const isExpanded = expandedRounds[`interview-${interview.id || index}`];
                      const formattedDate = interviewDate.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      });
                      
                      return (
                        <div 
                          key={`interview-${interview.id || index}`} 
                          className={`round-card-compact interview ${interviewStatus} ${isExpanded ? 'expanded' : ''}`}
                        >
                          <div 
                            className="round-header-compact"
                            onClick={() => toggleRoundExpansion(`interview-${interview.id || index}`)}
                          >
                            <div className="round-info-compact">
                              <div className="round-icon-compact">
                                <FiVideo />
                              </div>
                              <div className="round-title-section-compact">
                                <h3>Interview: {interview.title || 'Interview ' + (index + 1)}</h3>
                                <div className="round-meta-inline-compact">
                                  <span className="round-meta-item-compact">
                                    <span className="meta-label-compact">type:</span>
                                    <span className="round-type-compact">{interview.interviewType || 'Video Interview'}</span>
                                  </span>
                                  <span className="round-meta-item-compact">
                                    <span className="meta-label-compact"><FiClock /> scheduled:</span>
                                    <span className="round-start-date-compact">{formattedDate}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="round-actions-compact">
                              {interviewStatus === 'upcoming' && timeUntilStart[`interview-${interview.id}`] && (
                                <div className={`countdown-badge ${(() => {
                                  const timeLeft = timeUntilStart[`interview-${interview.id}`];
                                  const [hours, minutes] = timeLeft.split(':').map(Number);
                                  const totalMinutes = hours * 60 + minutes;
                                  return totalMinutes <= 15 ? 'can-join-soon' : '';
                                })()}`}>
                                  <FiClock className="countdown-icon" />
                                  <span>
                                    {(() => {
                                      const timeLeft = timeUntilStart[`interview-${interview.id}`];
                                      const [hours, minutes] = timeLeft.split(':').map(Number);
                                      const totalMinutes = hours * 60 + minutes;
                                      
                                      if (totalMinutes <= 15) {
                                        return `Can join in: ${timeLeft}`;
                                      } else {
                                        return `Starts in: ${timeLeft}`;
                                      }
                                    })()}
                                  </span>
                                </div>
                              )}
                              {interviewStatus === 'ongoing' && (
                                <button 
                                  className="join-interview-btn-compact"
                                  onClick={() => handleJoinInterview(interview)}
                                >
                                  <FiVideo /> {now < interviewDate ? 'Join Early' : now <= interviewEndTime ? 'Join Now' : 'Join Interview'}
                                </button>
                              )}
                              {interviewStatus === 'completed' && (
                                <div className="status-badge status-completed">
                                  <FiCheckCircle /> 
                                  {interview.status === 'COMPLETED' ? 'Interview Completed' : 'Completed'}
                                </div>
                              )}
                              {interviewStatus === 'upcoming' && !timeUntilStart[`interview-${interview.id}`] && (
                                <div className="status-badge status-upcoming">
                                  <FiClock /> Upcoming
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="round-details-expanded">
                              {interview.description && (
                                <p className="round-description">{interview.description}</p>
                              )}
                              <div className="interview-room-details">
                                <h4>Interview Details</h4>
                                <div className="room-info-grid">
                                  <div className="room-info-item">
                                    <span className="room-info-label">Room Code:</span>
                                    <span className="room-info-value">{interview.roomCode || 'Will be provided'}</span>
                                  </div>
                                  {interview.roomPassword && (
                                    <div className="room-info-item">
                                      <span className="room-info-label">Password:</span>
                                      <span className="room-info-value">{interview.roomPassword}</span>
                                    </div>
                                  )}
                                  <div className="room-info-item">
                                    <span className="room-info-label">Participants:</span>
                                    <span className="room-info-value">{interview.participantsCount || 1} expected</span>
                                  </div>
                                  <div className="room-info-item">
                                    <span className="room-info-label">Platform:</span>
                                    <span className="room-info-value">{interview.platform || 'SmartHireX Video'}</span>
                                  </div>
                                </div>
                              </div>
                              {interviewStatus === 'upcoming' && timeUntilStart[`interview-${interview.id}`] && (
                                <div className="round-status scheduled">
                                  <FiClock className="status-icon" />
                                  <span>Starts in: {timeUntilStart[`interview-${interview.id}`]}</span>
                                </div>
                              )}
                              {interviewStatus === 'ongoing' && (
                                <div className="join-button-container">
                                  <button 
                                    className="join-interview-btn full-width"
                                    onClick={() => handleJoinInterview(interview)}
                                  >
                                    <FiVideo /> {now < interviewDate ? 'Join Early (15 min buffer)' : now <= interviewEndTime ? 'Join Interview Now' : 'Join Interview'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShortlistedJobs;
