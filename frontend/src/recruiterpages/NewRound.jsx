import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { FaArrowLeft, FaVideo, FaUsers, FaCalendarAlt, FaClock, FaEnvelope } from 'react-icons/fa';
import './NewRound.css';

export default function NewRound() {
  const { jobId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  
  // Get job details from navigation state
  const jobTitle = location.state?.jobTitle || 'Unknown Job';
  
  const [formData, setFormData] = useState({
    title: '',
    roundType: 'TECHNICAL_INTERVIEW',
    description: '',
    scheduledDateTime: '',
    durationMinutes: 60,
    candidateEmails: [],
    createVideoRoom: true,
    customRoomPassword: ''
  });

  // Fetch shortlisted candidates for this job
  useEffect(() => {
    fetchShortlistedCandidates();
  }, [jobId]);

  const fetchShortlistedCandidates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/jobs/${jobId}/shortlisted`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Transform the data to extract candidate emails
      const candidates = Array.isArray(response.data) ? response.data : [];
      const candidateList = candidates.map(candidate => ({
        email: candidate.email || candidate.user?.email || 'No email',
        name: candidate.name || candidate.user?.name || 'Anonymous',
        phone: candidate.phone || candidate.profile?.phone || 'N/A'
      }));
      
      setShortlistedCandidates(candidateList);
    } catch (err) {
      console.error('Error fetching shortlisted candidates:', err);
      // If shortlisted endpoint doesn't exist, try applications endpoint
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/jobs/${jobId}/applications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const applications = Array.isArray(response.data) ? response.data : [];
        const candidateList = applications.map(app => ({
          email: app.candidate?.user?.email || app.email || 'No email',
          name: app.candidate?.user?.name || app.name || 'Anonymous',
          phone: app.candidate?.profile?.phone || app.phone || 'N/A'
        }));
        
        setShortlistedCandidates(candidateList);
      } catch (fallbackErr) {
        console.error('Error fetching applications:', fallbackErr);
        setError('Failed to load candidates');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCandidateSelection = (candidateEmail) => {
    setFormData(prev => ({
      ...prev,
      candidateEmails: prev.candidateEmails.includes(candidateEmail)
        ? prev.candidateEmails.filter(email => email !== candidateEmail)
        : [...prev.candidateEmails, candidateEmail]
    }));
  };

  const selectAllCandidates = () => {
    const allEmails = shortlistedCandidates.map(c => c.email);
    setFormData(prev => ({
      ...prev,
      candidateEmails: allEmails
    }));
  };

  const deselectAllCandidates = () => {
    setFormData(prev => ({
      ...prev,
      candidateEmails: []
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const userEmail = localStorage.getItem('userEmail') || 'recruiter@example.com';
      
      const requestData = {
        ...formData,
        jobId: parseInt(jobId),
        recruiterEmail: userEmail
      };

      console.log('Creating interview round:', requestData);

      const response = await axios.post(`${API_BASE_URL}/interviews/create`, requestData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setSuccess('Interview round created successfully! Invitations sent to selected candidates.');
      
      // Reset form
      setFormData({
        title: '',
        roundType: 'TECHNICAL_INTERVIEW',
        description: '',
        scheduledDateTime: '',
        durationMinutes: 60,
        candidateEmails: [],
        createVideoRoom: true,
        customRoomPassword: ''
      });

      // Navigate back after 2 seconds
      setTimeout(() => {
        navigate('/recruiter/generate-test');
      }, 2000);

    } catch (err) {
      console.error('Error creating interview round:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create interview round');
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (today)
  const today = new Date();
  const minDateTime = today.toISOString().slice(0, 16);

  return (
    <div className="new-round-container">
      <div className="new-round-header">
        <button 
          className="back-button"
          onClick={() => navigate('/recruiter/generate-test')}
        >
          <FaArrowLeft /> Back to Jobs
        </button>
        <h1>Create New Interview Round</h1>
        <p className="job-title">For: {jobTitle}</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="new-round-content">
        <form onSubmit={handleSubmit} className="round-form">
          {/* Round Details */}
          <div className="form-section">
            <h3><FaVideo /> Round Details</h3>
            
            <div className="form-group">
              <label>Round Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Technical Interview - React Developer"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Round Type *</label>
              <select
                name="roundType"
                value={formData.roundType}
                onChange={handleInputChange}
                required
                className="form-select"
              >
                <option value="TECHNICAL_INTERVIEW">Technical Interview</option>
                <option value="HR_INTERVIEW">HR Interview</option>
                <option value="CODING_ROUND">Coding Round</option>
                <option value="SYSTEM_DESIGN">System Design</option>
                <option value="BEHAVIORAL">Behavioral Interview</option>
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the interview round..."
                rows={3}
                className="form-textarea"
              />
            </div>
          </div>

          {/* Scheduling */}
          <div className="form-section">
            <h3><FaCalendarAlt /> Scheduling</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Date & Time *</label>
                <input
                  type="datetime-local"
                  name="scheduledDateTime"
                  value={formData.scheduledDateTime}
                  onChange={handleInputChange}
                  min={minDateTime}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Duration (minutes)</label>
                <select
                  name="durationMinutes"
                  value={formData.durationMinutes}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>120 minutes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Video Call Settings */}
          <div className="form-section">
            <h3><FaVideo /> Video Call Settings</h3>
            
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="createVideoRoom"
                  checked={formData.createVideoRoom}
                  onChange={handleInputChange}
                />
                Create video call room automatically
              </label>
            </div>

            {formData.createVideoRoom && (
              <div className="form-group">
                <label>Custom Room Password (optional)</label>
                <input
                  type="text"
                  name="customRoomPassword"
                  value={formData.customRoomPassword}
                  onChange={handleInputChange}
                  placeholder="Leave empty for auto-generated password"
                  className="form-input"
                />
              </div>
            )}
          </div>

          {/* Candidate Selection */}
          <div className="form-section">
            <h3><FaUsers /> Select Candidates ({shortlistedCandidates.length} available)</h3>
            
            {shortlistedCandidates.length > 0 ? (
              <>
                <div className="candidate-actions">
                  <button
                    type="button"
                    onClick={selectAllCandidates}
                    className="btn btn-outline"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllCandidates}
                    className="btn btn-outline"
                  >
                    Deselect All
                  </button>
                  <span className="selected-count">
                    {formData.candidateEmails.length} selected
                  </span>
                </div>

                <div className="candidates-list">
                  {shortlistedCandidates.map((candidate, index) => (
                    <div key={index} className="candidate-item">
                      <label className="candidate-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.candidateEmails.includes(candidate.email)}
                          onChange={() => handleCandidateSelection(candidate.email)}
                        />
                        <div className="candidate-info">
                          <div className="candidate-name">{candidate.name}</div>
                          <div className="candidate-email">
                            <FaEnvelope /> {candidate.email}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="no-candidates">
                <p>No candidates found for this job. Make sure candidates have applied and been shortlisted.</p>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/recruiter/generate-test')}
              className="btn btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || formData.candidateEmails.length === 0}
              className="btn btn-primary"
            >
              {loading ? 'Creating...' : 'Create Interview Round'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
