import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { FaPlus, FaCalendarAlt, FaCode, FaChevronRight, FaUsers, FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaVideo, FaClipboardList, FaEye, FaTimes, FaStar } from 'react-icons/fa';
import { FiEdit2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './GenerateTest.css';
import TagInput from '../components/TagInput';

export default function GenerateTest() {
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // 'list', 'form', 'candidates'
    const [selectedJobId, setSelectedJobId] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedbackList, setFeedbackList] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  const initialJobForm = { 
    title: '', 
    company: '', 
    description: '', 
    skills: [], 
    location: '',
    minCgpa: '', 
    minBacklogs: '', 
    ctc: '',
    employmentType: 'fulltime',
    startDate: '',
    endDate: '',
    isPublic: true,
    accessCode: '',
    autoShortlistEnabled: false,
    autoShortlistTime: '',
    autoShortlistCount: 0
  };
  
  const [jobForm, setJobForm] = useState(initialJobForm);

  // Fetch jobs on component mount
    useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/jobs`, {
          headers: { 
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });
        setJobs(response.data || []);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs');
      }
    };

        fetchJobs();
        fetchFeedback();
  }, [jobs.length]);

  // Generate random access code
  const generateAccessCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleJobChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'isPublic') {
      const isPublic = type === 'checkbox' ? checked : value === 'true';
      setJobForm(prev => ({ 
        ...prev, 
        [name]: isPublic,
        accessCode: isPublic ? '' : generateAccessCode()
      }));
    } else if (type === 'checkbox') {
      // Handle other checkboxes like autoShortlistEnabled
      setJobForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setJobForm(prev => ({ ...prev, [name]: value }));
    }
  };

    const handleEditClick = (job) => {
    console.log('DEBUG - Editing job:', job);
    console.log('DEBUG - Original startDate:', job.startDate);
    console.log('DEBUG - Original endDate:', job.endDate);
    
    setEditingJobId(job._id);
    
    // Handle both Unix timestamps and ISO strings
    let startDateStr = '';
    let endDateStr = '';
    
    if (job.startDate) {
      if (typeof job.startDate === 'number') {
        // Convert Unix timestamp to date string
        const date = new Date(job.startDate * 1000); // Unix timestamp is in seconds
        startDateStr = date.getFullYear() + '-' + 
                       String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(date.getDate()).padStart(2, '0');
      } else if (typeof job.startDate === 'string') {
        startDateStr = job.startDate.includes('T') ? job.startDate.split('T')[0] : job.startDate;
      }
    }
    
    if (job.endDate) {
      if (typeof job.endDate === 'number') {
        // Convert Unix timestamp to date string
        const date = new Date(job.endDate * 1000); // Unix timestamp is in seconds
        endDateStr = date.getFullYear() + '-' + 
                     String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(date.getDate()).padStart(2, '0');
      } else if (typeof job.endDate === 'string') {
        endDateStr = job.endDate.includes('T') ? job.endDate.split('T')[0] : job.endDate;
      }
    }
    
    console.log('DEBUG - Extracted startDateStr:', startDateStr);
    console.log('DEBUG - Extracted endDateStr:', endDateStr);
    
    setJobForm({
      ...job,
      skills: job.skills ? job.skills.split(',').map(s => s.trim()).filter(s => s) : [],
      startDate: startDateStr,
      endDate: endDateStr,
      autoShortlistEnabled: job.autoShortlistEnabled || false,
      autoShortlistTime: job.autoShortlistTime ? new Date(job.autoShortlistTime).toISOString().slice(0, 16) : '',
      autoShortlistCount: job.autoShortlistCount || 0
    });
    setView('form');
  };

    const handleJobSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
            const dataToSend = {
        ...jobForm,
        skills: jobForm.skills.join(','),
        startDate: jobForm.startDate,
        endDate: jobForm.endDate,
        autoShortlistEnabled: jobForm.autoShortlistEnabled,
        autoShortlistTime: jobForm.autoShortlistTime,
        autoShortlistCount: jobForm.autoShortlistCount
      };

      let response;
      if (editingJobId) {
        console.log('Updating job with payload:', dataToSend);
        response = await axios.put(`${API_BASE_URL}/jobs/${editingJobId}`, dataToSend, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        // Re-run shortlisting
        await axios.get(`${API_BASE_URL}/jobs/${editingJobId}/shortlist`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        response = await axios.post(`${API_BASE_URL}/jobs`, dataToSend, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      // Add the new job to the list
      if (editingJobId) {
        setJobs(jobs.map(j => j._id === editingJobId ? response.data : j));
      } else {
        setJobs([response.data, ...jobs]);
      }
      setEditingJobId(null);
      setJobForm(initialJobForm);
      setView('list');
    } catch (err) {
      console.error('Error creating job:', err);
      setError(err.response?.data?.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCandidates = async (jobId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log(`Fetching applications for job ${jobId} from ${API_BASE_URL}/jobs/${jobId}/applications`);
      
      const response = await axios.get(`${API_BASE_URL}/jobs/${jobId}/applications`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Applications response:', response);
      console.log('📊 Response data type:', typeof response.data);
      console.log('📊 Response data length:', Array.isArray(response.data) ? response.data.length : 'Not an array');
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      // Transform application data to match the expected candidate format
      const candidatesData = Array.isArray(response.data) 
        ? response.data.map(app => {
            // Log the raw application data for debugging
            console.log('🔍 Application data:', app);
            
            // Application model has data directly at root level
            return {
              _id: app._id || app.id,
              name: app.name || 'Anonymous',
              email: app.email || 'No email',
              phone: app.phone || 'N/A', // Note: phone might not be in Application model
              appliedAt: app.createdAt || app.appliedAt || (Date.now() / 1000),
              status: app.status || 'applied',
              cgpa: app.cgpa || 'N/A',
              college: app.college || 'N/A',
              profileType: app.profileType || 'N/A',
              degree: app.degree || 'N/A',
              skills: app.skills || 'N/A',
              company: app.company || 'N/A',
              lpa: app.lpa || 'N/A',
              yearsExp: app.yearsExp || 'N/A',
              isFresher: app.isFresher
            };
          })
        : [];
      
      setCandidates(candidatesData);
      setSelectedJobId(jobId);
      setView('candidates');
      setError('');
    } catch (err) {
      console.error('Error fetching candidates:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          headers: err.config?.headers
        }
      });
      setError(`Failed to load candidates: ${err.response?.data?.message || err.message}`);
    }
  };

  // Format date for display
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

  // Format timeline for display
  const formatTimeline = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Timeline not set';
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  // Interview scheduling function
  const handleScheduleInterview = (job) => {
    // Generate a unique meeting code
    const meetingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Create interview name
    const interviewName = `${job.title} Interview`;
    
    console.log('🎥 Starting interview for job:', job.title);
    console.log('📋 Meeting code:', meetingCode);
    
    // Open video call with scheduled=true for recruiter
    const videoCallUrl = `/video-call/${meetingCode}?scheduled=true&interviewName=${encodeURIComponent(interviewName)}`;
    window.open(videoCallUrl, '_blank', 'width=1200,height=800');
    
    // Show success message with meeting code
    alert(`Interview started!\n\nMeeting Code: ${meetingCode}\n\nShare this code with candidates to join the interview.`);
  };

  // Fetch feedback for recruiter
  const fetchFeedback = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const recruiterName = user.name || user.firstName || 'Recruiter';

      const response = await axios.get(`${API_BASE_URL}/interview-feedback/recruiter?recruiterName=${encodeURIComponent(recruiterName)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        setFeedbackList(response.data.feedback || []);
      }
    } catch (error) {
      console.error('Error fetching feedback from API:', error);
      
      // Fallback: Try to get feedback from localStorage
      try {
        const localFeedback = JSON.parse(localStorage.getItem('interviewFeedback') || '[]');
        console.log('📱 Using localStorage feedback as fallback:', localFeedback);
        setFeedbackList(localFeedback);
      } catch (localError) {
        console.error('Error reading localStorage feedback:', localError);
        setFeedbackList([]);
      }
    }
  };

  // Get feedback for a specific job
  const getFeedbackForJob = (jobTitle) => {
    console.log('🔍 Looking for feedback for job:', jobTitle);
    console.log('📋 Available feedback:', feedbackList);
    
    // Try multiple matching strategies
    const matches = feedbackList.filter(feedback => {
      // Match by job title in comments or candidate name
      const titleMatch = feedback.overallComments && 
        feedback.overallComments.toLowerCase().includes(jobTitle.toLowerCase());
      
      // Match by job title in room code or interview name
      const roomMatch = feedback.roomCode && 
        feedback.roomCode.toLowerCase().includes(jobTitle.toLowerCase().replace(/\s+/g, ''));
      
      return titleMatch || roomMatch;
    });
    
    console.log('✅ Found matches:', matches);
    return matches;
  };

  // Handle view feedback
  const handleViewFeedback = (job) => {
    const jobFeedback = getFeedbackForJob(job.title);
    if (jobFeedback.length > 0) {
      setSelectedFeedback(jobFeedback[0]); // Show first feedback for now
      setShowFeedbackModal(true);
    } else {
      alert('No feedback available for this job yet.');
    }
  };

  const renderJobForm = () => (
    <div className="job-form-container">
      <div className="form-header">
        <button 
          className="back-button"
          onClick={() => setView('list')}
          aria-label="Back to jobs"
        >
          <FaArrowLeft />
          <span className="sr-only">Back to jobs</span>
        </button>
        <h2>{editingJobId ? 'Edit Job Post' : 'Create New Job Post'}</h2>
      </div>
      
      <div className="form-content">
        <h3>Job Details</h3>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleJobSubmit} className="job-form">
          <div className="form-group">
            <label>Job Title <span className="required">*</span></label>
            <input 
              name="title"
              type="text"
              value={jobForm.title}
              onChange={handleJobChange}
              placeholder="e.g., Java Backend Engineer"
              required
              className="form-input"
            />
          </div>
      
          <div className="form-group">
            <label>Company <span className="required">*</span></label>
            <input 
              name="company"
              type="text"
              value={jobForm.company}
              onChange={handleJobChange}
              placeholder="Company name"
              required
              className="form-input"
            />
          </div>
      
          <div className="form-group">
            <label>Location</label>
            <input 
              name="location"
              type="text"
              value={jobForm.location}
              onChange={handleJobChange}
              placeholder="e.g., Remote, Bangalore"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>CTC</label>
            <input
              name="ctc"
              type="text"
              value={jobForm.ctc}
              onChange={handleJobChange}
              placeholder="e.g., 8-12 LPA"
              className="form-input"
            />
          </div>
      
          <div className="form-group description-field">
            <label>Description <span className="required">*</span></label>
            <textarea
              name="description"
              value={jobForm.description}
              onChange={handleJobChange}
              placeholder="Enter job description, responsibilities, and requirements..."
              required
              className="form-input"
              rows={5}
            />
          </div>

          <div className="form-group">
            <label>Required Skills</label>
            <TagInput 
              tags={jobForm.skills}
              setTags={(newTags) => setJobForm(f => ({ ...f, skills: newTags }))}
            />
            <p className="form-hint">Add skills and press Enter or comma</p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Min CGPA</label>
              <input
                name="minCgpa"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={jobForm.minCgpa}
                onChange={handleJobChange}
                placeholder="e.g., 7.0"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Max Backlogs</label>
              <input
                name="minBacklogs"
                type="number"
                min="0"
                value={jobForm.minBacklogs}
                onChange={handleJobChange}
                placeholder="e.g., 0"
                className="form-input"
              />
            </div>
          </div>


          <div className="form-group">
            <label>Employment Type</label>
            <select
              name="employmentType"
              value={jobForm.employmentType}
              onChange={handleJobChange}
              className="form-select"
            >
              <option value="fulltime">Full-time</option>
              <option value="parttime">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>

          {/* Timeline Section */}
          <div className="form-row">
            <div className="form-group">
              <label>Hiring Start Date <span className="required">*</span></label>
              <input
                name="startDate"
                type="date"
                value={jobForm.startDate}
                onChange={handleJobChange}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Hiring End Date <span className="required">*</span></label>
              <input
                name="endDate"
                type="date"
                value={jobForm.endDate}
                onChange={handleJobChange}
                required
                min={jobForm.startDate}
                className="form-input"
              />
            </div>
          </div>

          {/* Visibility Section */}
          <div className="form-group">
            <label>Job Visibility <span className="required">*</span></label>
            <select
              name="isPublic"
              value={jobForm.isPublic ? "true" : "false"}
              onChange={handleJobChange}
              className="form-select"
              disabled={editingJobId}
            >
              <option value="true">🌐 Public - Visible to all candidates</option>
              <option value="false">🔒 Private - Only accessible with access code</option>
            </select>
          </div>

          {/* Access Code Display for Private Jobs */}
          {!jobForm.isPublic && jobForm.accessCode && (
            <>
              <div className="form-group">
                <label>Generated Access Code</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    value={jobForm.accessCode}
                    readOnly
                    className="form-input"
                  />
                  <button
                    type="button"
                    onClick={() => setJobForm(prev => ({ ...prev, accessCode: generateAccessCode() }))}
                    className="btn btn-secondary"
                  >
                    Regenerate
                  </button>
                </div>
                <small className="form-hint">Share this code with candidates to apply for this private job</small>
              </div>
            </>
          )}

          {/* Auto-Shortlist Configuration */}
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="autoShortlistEnabled"
                checked={jobForm.autoShortlistEnabled}
                onChange={handleJobChange}
                style={{ marginRight: '0.5rem' }}
              />
              Enable Auto-Shortlisting
            </label>
            <small className="form-hint">Automatically shortlist top candidates before 1st round</small>
          </div>

          {/* Auto-Shortlist Settings */}
          {jobForm.autoShortlistEnabled && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Auto-Shortlist Time <span className="required">*</span></label>
                  <input
                    name="autoShortlistTime"
                    type="datetime-local"
                    value={jobForm.autoShortlistTime}
                    onChange={handleJobChange}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    className="form-input"
                  />
                  <small className="form-hint">When should auto-shortlisting be triggered?</small>
                </div>
                
                <div className="form-group">
                  <label>Number of Candidates to Shortlist <span className="required">*</span></label>
                  <input
                    name="autoShortlistCount"
                    type="number"
                    min="1"
                    max="1000"
                    value={jobForm.autoShortlistCount}
                    onChange={handleJobChange}
                    required
                    placeholder="e.g., 50"
                    className="form-input"
                  />
                  <small className="form-hint">How many top candidates to shortlist automatically?</small>
                </div>
              </div>
            </>
          )}

          <div className="form-actions-container">
            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => setView('list')}
                className="btn btn-cancel"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (editingJobId ? 'Updating...' : 'Creating...') : (editingJobId ? 'Update Job' : 'Create Job')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
  
  const renderCandidates = () => (
    <div className="candidates-container">
      <button 
        className="back-button"
        onClick={() => setView('list')}
        aria-label="Back to Jobs"
      >
        <FaArrowLeft className="icon" />
        <span>Back to Jobs</span>
      </button>
      
      <h2>Registered Candidates</h2>
      
      {candidates.length > 0 ? (
        <div className="candidates-table-container">
          <table className="candidates-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Applied On</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => {
                console.log('Rendering candidate:', candidate);
                return (
                  <tr key={candidate._id}>
                    <td>
                      <div className="candidate-name">
                        <FaUser className="icon" />
                        {candidate.name}
                      </div>
                    </td>
                    <td>
                      <a href={`mailto:${candidate.email}`} className="candidate-email">
                        <FaEnvelope className="icon" />
                        {candidate.email}
                      </a>
                    </td>
                    <td>
                      {candidate.phone && candidate.phone !== 'N/A' ? (
                        <a href={`tel:${candidate.phone}`} className="candidate-phone">
                          <FaPhone className="icon" />
                          {candidate.phone}
                        </a>
                      ) : 'N/A'}
                    </td>
                    <td>
                      {formatDate(candidate.appliedAt)}
                    </td>
                    <td>
                      <span className={`status-badge ${candidate.status || 'pending'}`}>
                        {candidate.status ? candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1) : 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-candidates">
          <FaUsers className="icon" size={48} />
          <p>No candidates have applied yet</p>
        </div>
      )}
    </div>
  );
  
  const renderJobList = () => (
    <div className="job-list-container">
      <div className="jobs-section">
        <div className="section-header">
          <h2>Posted Jobs</h2>
          <button 
            className="create-job-btn"
            onClick={() => setView('form')}
          >
            <FaPlus /> Create Job
          </button>
        </div>
        <div className="jobs-grid">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job._id} className="job-card">
                <div className="job-card-content">
                  <div className="job-card-header">
                    <div className="job-title-section">
                      <h3>{job.title}</h3>
                      <span className="job-type">
                        {job.employmentType || 'Full-time'}
                      </span>
                    </div>
                    <button
                      className="edit-icon-btn"
                      onClick={() => handleEditClick(job)}
                      title="Edit Job"
                    >
                      <FiEdit2 />
                    </button>
                  </div>
                  
                  <p className="job-description">
                    {job.description}
                  </p>
                  
                  <div className="skills-container">
                    {job.skills?.split(',').map((skill, index) => (
                      <span key={index} className="skill-tag">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                  
                  <div className="job-meta">
                    <div className="job-meta-item">
                      <FaCalendarAlt className="icon" />
                      <span>Timeline: {formatTimeline(job.startDate, job.endDate)}</span>
                    </div>
                    
                    <div className="job-meta-item">
                      <FaCode className="icon" />
                      <span>Min CGPA: {job.minCgpa || 'N/A'}</span>
                    </div>

                    <div className="job-meta-item">
                      <span className={`visibility-badge ${job.isPublic ? 'public' : 'private'}`}>
                        {job.isPublic ? '🌐 Public' : '🔒 Private'}
                      </span>
                    </div>

                    {!job.isPublic && job.accessCode && (
                      <div className="job-meta-item access-code-display-meta">
                        <span className="access-code-label">Code:</span>
                        <code className="access-code-value">{job.accessCode}</code>
                      </div>
                    )}
                  </div>
                  
                  <div className="job-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleViewCandidates(job._id)}
                    >
                      <FaUsers /> View Candidates
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => navigate(`/recruiter/rounds/${job._id}`)}
                    >
                      <FaCode /> View Rounds
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-jobs">
              <p>No jobs posted yet. Create your first job to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  // Render feedback modal
  const renderFeedbackModal = () => {
    if (!selectedFeedback) return null;

    const averageScore = (
      selectedFeedback.communication +
      selectedFeedback.confidence +
      selectedFeedback.technical +
      selectedFeedback.softSkills +
      selectedFeedback.problemSolving +
      selectedFeedback.analytics
    ) / 6;

    return (
      <div className="feedback-modal-overlay">
        <div className="feedback-view-modal">
          <div className="feedback-modal-header">
            <h3>Interview Feedback</h3>
            <button 
              className="close-btn"
              onClick={() => setShowFeedbackModal(false)}
            >
              <FaTimes />
            </button>
          </div>
          
          <div className="feedback-modal-content">
            <div className="feedback-summary">
              <div className="candidate-info">
                <h4>{selectedFeedback.candidateName}</h4>
                <p>Interview Date: {selectedFeedback.interviewDate}</p>
                <p>Recruiter: {selectedFeedback.recruiterName}</p>
              </div>
              <div className="average-score">
                <div className="score-circle">
                  <span className="score-value">{averageScore.toFixed(1)}</span>
                  <span className="score-label">/10</span>
                </div>
                <p>Overall Score</p>
              </div>
            </div>

            <div className="feedback-ratings">
              <div className="rating-item">
                <label>Communication</label>
                <div className="rating-bar">
                  <div className="rating-fill" style={{width: `${(selectedFeedback.communication / 10) * 100}%`}}></div>
                  <span className="rating-score">{selectedFeedback.communication}/10</span>
                </div>
              </div>
              
              <div className="rating-item">
                <label>Confidence</label>
                <div className="rating-bar">
                  <div className="rating-fill" style={{width: `${(selectedFeedback.confidence / 10) * 100}%`}}></div>
                  <span className="rating-score">{selectedFeedback.confidence}/10</span>
                </div>
              </div>
              
              <div className="rating-item">
                <label>Technical Skills</label>
                <div className="rating-bar">
                  <div className="rating-fill" style={{width: `${(selectedFeedback.technical / 10) * 100}%`}}></div>
                  <span className="rating-score">{selectedFeedback.technical}/10</span>
                </div>
              </div>
              
              <div className="rating-item">
                <label>Soft Skills</label>
                <div className="rating-bar">
                  <div className="rating-fill" style={{width: `${(selectedFeedback.softSkills / 10) * 100}%`}}></div>
                  <span className="rating-score">{selectedFeedback.softSkills}/10</span>
                </div>
              </div>
              
              <div className="rating-item">
                <label>Problem-Solving</label>
                <div className="rating-bar">
                  <div className="rating-fill" style={{width: `${(selectedFeedback.problemSolving / 10) * 100}%`}}></div>
                  <span className="rating-score">{selectedFeedback.problemSolving}/10</span>
                </div>
              </div>
              
              <div className="rating-item">
                <label>Analytics</label>
                <div className="rating-bar">
                  <div className="rating-fill" style={{width: `${(selectedFeedback.analytics / 10) * 100}%`}}></div>
                  <span className="rating-score">{selectedFeedback.analytics}/10</span>
                </div>
              </div>
            </div>

            {selectedFeedback.overallComments && (
              <div className="feedback-comments">
                <h4>Overall Comments</h4>
                <p>{selectedFeedback.overallComments}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="generate-test-container">
      <div className="container">
        {view === 'form' && renderJobForm()}
        {view === 'candidates' && renderCandidates()}
        {view === 'list' && renderJobList()}
      </div>
      
      {/* Feedback Modal */}
      {showFeedbackModal && renderFeedbackModal()}
    </div>
  );
}
