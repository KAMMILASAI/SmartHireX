import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { 
  FiClock, 
  FiUsers, 
  FiCalendar, 
  FiMapPin, 
  FiEdit3, 
  FiEdit, 
  FiTrash2, 
  FiVideo,
  FiMail,
  FiRefreshCw,
  FiBarChart2,
  FiTrendingUp,
  FiCheckCircle,
  FiXCircle,
  FiCpu,
  FiCode,
  FiArrowLeft,
  FiAward,
  FiTarget,
  FiPlus,
  FiFileText,
  FiEye,
  FiEdit2
} from 'react-icons/fi';
import { useToast } from '../contexts/ToastContext';
import TagInput from '../components/TagInput';
import CodingProblemCreator from './CodingProblemCreator';
import './Rounds.css';
import './RoundsShortlist.css';

const Rounds = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [job, setJob] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [validationMessage, setValidationMessage] = useState('');
  const [showGenerationMethodModal, setShowGenerationMethodModal] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [showViewQuestionsModal, setShowViewQuestionsModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [selectedRound, setSelectedRound] = useState(null);
  const [examResults, setExamResults] = useState([]);
  const [examStats, setExamStats] = useState(null);
  const [shortlistData, setShortlistData] = useState({ candidates: [], shortlistLimit: 0, isFirstRound: true, totalCandidates: 0, shortlistedCount: 0 });
  const [questionType, setQuestionType] = useState('mcq'); // 'mcq' or 'coding'
  const [generationMethod, setGenerationMethod] = useState('manual'); // 'manual' or 'ai'
  const [aiGenerationParams, setAiGenerationParams] = useState({
    numQuestions: 5,
    techConcepts: [],
    difficulty: 'medium'
  });
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [existingQuestions, setExistingQuestions] = useState([]);
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [codingProblems, setCodingProblems] = useState([]);
  const [showCodingCreator, setShowCodingCreator] = useState(false);
  const [editingCodingProblem, setEditingCodingProblem] = useState(null);
  
  // AI Coding Generation States
  const [aiCodingParams, setAiCodingParams] = useState({
    numProblems: 2,
    topics: [],
    difficulty: 'medium',
    problemType: 'algorithm'
  });
  const [generatedCodingProblems, setGeneratedCodingProblems] = useState([]);
  const [isGeneratingCoding, setIsGeneratingCoding] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0
  });
  
  // Interview Round States
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewRounds, setInterviewRounds] = useState([]);
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
    
  // Feedback States
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [interviewFormData, setInterviewFormData] = useState({
    title: '',
    roundType: 'TECHNICAL_INTERVIEW',
    description: '',
    scheduledDateTime: new Date().toISOString().slice(0, 16), // Default to current datetime
    durationMinutes: 60,
    candidateEmails: [],
    createVideoRoom: true,
    customRoomPassword: ''
  });

  // Fetch interview rounds for this job
  const fetchInterviewRounds = useCallback(async () => {
    try {
      setLoadingInterviews(true);
      const token = localStorage.getItem('token');
      
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
        userEmail = localStorage.getItem('userEmail') || 
                   localStorage.getItem('email') || 
                   localStorage.getItem('user_email');
      }
      
      if (!userEmail) {
        console.warn('No user email found for fetching interview rounds');
        return;
      }

      console.log('Fetching interview rounds for recruiter:', userEmail, 'job:', jobId);

      // Fetch interview rounds created by this recruiter for this job
      const response = await axios.get(`${API_BASE_URL}/interviews/recruiter/${userEmail}/job/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const interviews = response.data || [];
      console.log('Fetched interview rounds:', interviews);
      setInterviewRounds(interviews);
      
    } catch (err) {
      console.error('Failed to fetch interview rounds:', err);
    } finally {
      setLoadingInterviews(false);
    }
  }, [jobId]);

  // Fetch all applicants for the job
  const fetchShortlistedCandidates = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching all applicants for job:', jobId);
      
      // First try the applications endpoint
      try {
        const response = await axios.get(`${API_BASE_URL}/jobs/${jobId}/applications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const applications = Array.isArray(response.data) ? response.data : [];
        console.log('Fetched applications:', applications);
        
        // Get all applicants, not just shortlisted ones
        const candidateList = applications.map(app => ({
          email: app.candidate?.user?.email || app.email || 'No email',
          name: app.candidate?.user?.name || app.name || 'Applicant',
          phone: app.candidate?.profile?.phone || app.phone || 'N/A',
          status: app.status || 'APPLIED' // Include status for reference
        }));
        
        console.log('Processed candidate list:', candidateList);
        setShortlistedCandidates(candidateList);
        return;
      } catch (appErr) {
        console.warn('Could not fetch applications, trying candidates endpoint...', appErr);
      }
      
      // Fallback to candidates endpoint if applications endpoint fails
      try {
        const response = await axios.get(`${API_BASE_URL}/jobs/${jobId}/candidates`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const candidates = Array.isArray(response.data) ? response.data : [];
        console.log('Fetched candidates:', candidates);
        
        const candidateList = candidates.map(candidate => ({
          email: candidate.email || candidate.user?.email || 'No email',
          name: candidate.name || candidate.user?.name || 'Applicant',
          phone: candidate.phone || candidate.profile?.phone || 'N/A',
          status: 'APPLICANT' // Default status
        }));
        
        setShortlistedCandidates(candidateList);
      } catch (candidatesErr) {
        console.error('Error fetching candidates:', candidatesErr);
        setShortlistedCandidates([]);
      }
    } catch (err) {
      console.error('Unexpected error in fetchShortlistedCandidates:', err);
      setShortlistedCandidates([]);
    }
  }, [jobId]);

  
  // Handle candidate selection
  const handleCandidateSelect = (email) => {
    setInterviewFormData(prev => {
      const candidateEmails = [...prev.candidateEmails];
      const index = candidateEmails.indexOf(email);
      
      if (index > -1) {
        candidateEmails.splice(index, 1); // Remove if already selected
      } else {
        candidateEmails.push(email); // Add if not selected
      }
      
      return { ...prev, candidateEmails };
    });
  };

  useEffect(() => {
    if (jobId) {
      fetchInterviewRounds();
      fetchShortlistedCandidates();
    }
  }, [jobId, fetchInterviewRounds, fetchShortlistedCandidates]);

  // Form state for round creation/editing
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'MCQS',
    topics: [],
    startTime: '',
    endTime: '',
    duration: 60,
    mcqQuestions: 10,
    codingQuestions: 2,
    numAutoShortlistCandidates: 0, // New field for number of candidates to auto-shortlist
    // totalQuestions is now calculated automatically
  });

    const roundTypes = [
    { value: 'MCQS', label: 'MCQs' },
    { value: 'MCQS_CODING', label: 'MCQs + Coding' },
    { value: 'CODING', label: 'Coding' }
  ];

  

  const fetchJobAndRounds = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch job details
      const jobResponse = await axios.get(`${API_BASE_URL}/recruiter/rounds/jobs/${jobId}`, { headers });
      setJob(jobResponse.data);

      // Fetch rounds for this job
      const roundsResponse = await axios.get(`${API_BASE_URL}/recruiter/rounds/jobs/${jobId}/rounds`, { headers });

      // Ensure we have an array
      const roundsData = Array.isArray(roundsResponse.data) ? roundsResponse.data : [];
      setRounds(roundsData);

      // Fetch interview rounds for this job
      await fetchInterviewRounds();
      
    } catch (error) {
      console.error('Error fetching job and rounds:', error);
      showError('Failed to load job details and rounds');
    } finally {
      setLoading(false);
    }
  }, [jobId, fetchInterviewRounds, showError]);

  useEffect(() => {
    fetchJobAndRounds();
  }, [jobId, fetchJobAndRounds]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- Client-side validation ---
    const newRoundStart = new Date(formData.startTime);
    const newRoundEnd = new Date(formData.endTime);
    const now = new Date();

    // 0. Check if round is scheduled in the past
    if (newRoundStart <= now) {
      showError('Round cannot be scheduled in the past. Please select a future date and time.');
      return;
    }

    // 0.1. Check if end time is provided and valid
    if (!formData.endTime) {
      showError('End time is required.');
      return;
    }

    if (newRoundEnd <= newRoundStart) {
      showError('End time must be after start time.');
      return;
    }

    // 0.2. Check if end time is in the past
    if (newRoundEnd <= now) {
      showError('End time cannot be in the past. Please select a future end time.');
      return;
    }

    // 1. Check if round is within job's timeline
    if (job && job.startDate && job.endDate) {
      let jobStart, jobEnd;
      
      // Handle both Unix timestamps and ISO strings for job dates
      if (typeof job.startDate === 'number') {
        jobStart = new Date(job.startDate * 1000);
      } else {
        jobStart = new Date(job.startDate);
      }
      
      if (typeof job.endDate === 'number') {
        jobEnd = new Date(job.endDate * 1000);
      } else {
        jobEnd = new Date(job.endDate);
      }
      
      // Set job end time to end of day for comparison
      jobEnd.setHours(23, 59, 59, 999);
      
      if (newRoundStart < jobStart || newRoundStart > jobEnd) {
        showError(`Round start time must be within the job's hiring timeline (${formatJobDate(job.startDate)} - ${formatJobDate(job.endDate)}).`);
        return;
      }
      
      if (newRoundEnd < jobStart || newRoundEnd > jobEnd) {
        showError(`Round end time must be within the job's hiring timeline (${formatJobDate(job.startDate)} - ${formatJobDate(job.endDate)}).`);
        return;
      }
    }

    // 2. Check for clashes with other rounds
    for (const round of rounds) {
      if (editingRound && round._id === editingRound._id) continue; // Skip self when editing

      const existingRoundStart = new Date(round.startTime);
      const existingRoundEnd = new Date(existingRoundStart.getTime() + round.duration * 60000);

      // Check for overlap with 30-minute buffer
      const bufferTime = 30 * 60000; // 30 minutes in milliseconds
      const existingRoundStartWithBuffer = new Date(existingRoundStart.getTime() - bufferTime);
      const existingRoundEndWithBuffer = new Date(existingRoundEnd.getTime() + bufferTime);

      // Check for overlap: rounds overlap if one starts before the other ends (including buffer)
      if (newRoundStart < existingRoundEndWithBuffer && newRoundEnd > existingRoundStartWithBuffer) {
        const existingStartStr = existingRoundStart.toLocaleString('en-GB');
        const existingEndStr = existingRoundEnd.toLocaleString('en-GB');
        const newStartStr = newRoundStart.toLocaleString('en-GB');
        const newEndStr = newRoundEnd.toLocaleString('en-GB');
        
        showError(`Time slot conflict detected!\n\nNew round: ${newStartStr} - ${newEndStr}\nExisting "${round.title}": ${existingStartStr} - ${existingEndStr}\n\nRounds must have at least 30 minutes gap between them. Please choose a different time slot.`);
        return;
      }
    }

            // Prepare payload based on round type
            const payload = {
      ...formData,
      topics: formData.topics.join(','),
      instructions: 'Candidates must join 20 minutes before the exam for verification and system checks. Switching tabs is not allowed and will lead to disqualification after a certain threshold. The session will be proctored.',
      numAutoShortlistCandidates: formData.numAutoShortlistCandidates, // Include numAutoShortlistCandidates in payload
    };

    // Add question counts based on round type
    if (formData.type === 'MCQS') {
      payload.mcqQuestions = formData.mcqQuestions;
      payload.codingQuestions = null;
      payload.totalQuestions = null;
    } else if (formData.type === 'CODING') {
      payload.mcqQuestions = null;
      payload.codingQuestions = formData.codingQuestions;
      payload.totalQuestions = null;
    } else if (formData.type === 'MCQS_CODING') {
      payload.mcqQuestions = formData.mcqQuestions;
      payload.codingQuestions = formData.codingQuestions;
      payload.totalQuestions = (formData.mcqQuestions || 0) + (formData.codingQuestions || 0);
    } else {
      // For interview rounds, no question counts
      payload.mcqQuestions = null;
      payload.codingQuestions = null;
      payload.totalQuestions = null;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingRound) {
        // Get the round ID, checking both id and _id fields
        const rawRoundId = editingRound.id || editingRound._id;
        
        if (!rawRoundId) {
          showError('Round ID not found. Cannot update round.');
          return;
        }
        
        // Ensure it's a number
        const roundId = typeof rawRoundId === 'string' ? parseInt(rawRoundId) : rawRoundId;
        
        if (isNaN(roundId)) {
          showError('Invalid round ID. Cannot update round.');
          return;
        }
        
        console.log('Updating round with ID:', roundId);
        await axios.put(`${API_BASE_URL}/recruiter/rounds/rounds/${roundId}`, payload, { headers });
        showSuccess('Round updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/recruiter/rounds/jobs/${jobId}/rounds`, payload, { headers });
        showSuccess('Round created successfully');
      }

      resetForm();
      fetchJobAndRounds();
    } catch (error) {
      console.error('Error saving round:', error);
      showError(error.response?.data?.message || 'Failed to save round');
    }
  };

  
  
  const handleDeleteJob = async () => {
    if (!window.confirm('Are you sure you want to delete this entire job? This will also delete all rounds, applications, and cannot be undone.')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_BASE_URL}/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Show detailed success message
      const deletedApps = response.data?.deletedApplications || 0;
      const message = deletedApps > 0 
        ? `Job deleted successfully along with ${deletedApps} application(s)`
        : 'Job deleted successfully';
      
      showSuccess(message);
      navigate('/recruiter/generate-test');
    } catch (error) {
      console.error('Error deleting job:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.details || 
                          'Failed to delete job. Please try again.';
      showError(errorMessage);
    }
  };

  const validateRoundTime = (startTime, duration) => {
    if (!startTime) {
      setValidationMessage('');
      return;
    }

    const newRoundStart = new Date(startTime);
    const newRoundEnd = new Date(newRoundStart.getTime() + duration * 60000);
    const now = new Date();

    // Check if in the past
    if (newRoundStart <= now) {
      setValidationMessage('⚠️ Round cannot be scheduled in the past');
      return;
    }

    // Check job timeline
    if (job && job.startDate && job.endDate) {
      let jobStart, jobEnd;
      
      if (typeof job.startDate === 'number') {
        jobStart = new Date(job.startDate * 1000);
      } else {
        jobStart = new Date(job.startDate);
      }
      
      if (typeof job.endDate === 'number') {
        jobEnd = new Date(job.endDate * 1000);
      } else {
        jobEnd = new Date(job.endDate);
      }
      
      jobEnd.setHours(23, 59, 59, 999);
      
      if (newRoundStart < jobStart || newRoundStart > jobEnd) {
        setValidationMessage('⚠️ Round must be within job timeline');
        return;
      }
    }

    // Check for clashes
    for (const round of rounds) {
      if (editingRound && round._id === editingRound._id) continue;

      const existingRoundStart = new Date(round.startTime);
      const existingRoundEnd = new Date(existingRoundStart.getTime() + round.duration * 60000);
      
      const bufferTime = 30 * 60000;
      const existingRoundStartWithBuffer = new Date(existingRoundStart.getTime() - bufferTime);
      const existingRoundEndWithBuffer = new Date(existingRoundEnd.getTime() + bufferTime);

      if (newRoundStart < existingRoundEndWithBuffer && newRoundEnd > existingRoundStartWithBuffer) {
        setValidationMessage(`⚠️ Conflicts with "${round.title}" - need 30min gap`);
        return;
      }
    }

    setValidationMessage('✅ Time slot is available');
  };

  const handleTimeChange = (e) => {
    const newStartTime = e.target.value;
    setFormData({ ...formData, startTime: newStartTime });
    validateRoundTime(newStartTime, formData.duration);
  };

  const handleDurationChange = (e) => {
    const newDuration = parseInt(e.target.value);
    setFormData({ ...formData, duration: newDuration });
    validateRoundTime(formData.startTime, newDuration);
  };

  const suggestNextAvailableSlot = () => {
    const now = new Date();
    let suggestedTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Start from tomorrow
    
    // Round to next hour
    suggestedTime.setMinutes(0, 0, 0);
    suggestedTime.setHours(suggestedTime.getHours() + 1);

    // Check job timeline
    if (job && job.startDate) {
      let jobStart;
      if (typeof job.startDate === 'number') {
        jobStart = new Date(job.startDate * 1000);
      } else {
        jobStart = new Date(job.startDate);
      }
      
      if (suggestedTime < jobStart) {
        suggestedTime = new Date(jobStart);
        suggestedTime.setHours(9, 0, 0, 0); // 9 AM on job start date
      }
    }

    // Check for conflicts and find next available slot
    let attempts = 0;
    while (attempts < 100) { // Prevent infinite loop
      const suggestedEnd = new Date(suggestedTime.getTime() + formData.duration * 60000);
      let hasConflict = false;

      for (const round of rounds) {
        const existingStart = new Date(round.startTime);
        const existingEnd = new Date(existingStart.getTime() + round.duration * 60000);
        
        const bufferTime = 30 * 60000;
        const existingStartWithBuffer = new Date(existingStart.getTime() - bufferTime);
        const existingEndWithBuffer = new Date(existingEnd.getTime() + bufferTime);

        if (suggestedTime < existingEndWithBuffer && suggestedEnd > existingStartWithBuffer) {
          hasConflict = true;
          suggestedTime = new Date(existingEndWithBuffer.getTime() + 1); // Move past this round
          break;
        }
      }

      if (!hasConflict) {
        break;
      }
      attempts++;
    }

    // Format for datetime-local input
    const year = suggestedTime.getFullYear();
    const month = String(suggestedTime.getMonth() + 1).padStart(2, '0');
    const day = String(suggestedTime.getDate()).padStart(2, '0');
    const hours = String(suggestedTime.getHours()).padStart(2, '0');
    const minutes = String(suggestedTime.getMinutes()).padStart(2, '0');
    
    const formattedTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    setFormData({ ...formData, startTime: formattedTime });
    validateRoundTime(formattedTime, formData.duration);
  };

  const handleEditRound = (round) => {
    setEditingRound(round);
    
    // Format start time for datetime-local input
    let formattedStartTime = '';
    if (round.startTime) {
      if (Array.isArray(round.startTime)) {
        // Handle LocalDateTime array format: [year, month, day, hour, minute]
        const [year, month, day, hour, minute] = round.startTime;
        const date = new Date(year, month - 1, day, hour, minute || 0);
        formattedStartTime = date.toISOString().slice(0, 16);
      } else if (typeof round.startTime === 'string') {
        // Handle ISO string format
        formattedStartTime = new Date(round.startTime).toISOString().slice(0, 16);
      }
    }
    
    // Format end time for datetime-local input
    let formattedEndTime = '';
    if (round.endTime) {
      if (Array.isArray(round.endTime)) {
        // Handle LocalDateTime array format: [year, month, day, hour, minute]
        const [year, month, day, hour, minute] = round.endTime;
        const date = new Date(year, month - 1, day, hour, minute || 0);
        formattedEndTime = date.toISOString().slice(0, 16);
      } else if (typeof round.endTime === 'string') {
        // Handle ISO string format
        formattedEndTime = new Date(round.endTime).toISOString().slice(0, 16);
      }
    } else if (round.startTime && round.duration) {
      // Fallback: calculate end time from start time + duration if endTime is not available
      const startDate = new Date(formattedStartTime);
      const endDate = new Date(startDate.getTime() + (round.duration * 60000));
      formattedEndTime = endDate.toISOString().slice(0, 16);
    }
    
    setFormData({
      title: round.title,
      description: round.description,
      type: round.type,
      topics: round.topics ? round.topics.split(',').map(t => t.trim()) : [],
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      duration: round.duration,
      mcqQuestions: round.mcqQuestions || 10,
      codingQuestions: round.codingQuestions || 2,
      totalQuestions: round.totalQuestions || 15,
      numAutoShortlistCandidates: round.numAutoShortlistCandidates || 0, // Populate numAutoShortlistCandidates
    });
    setShowAddModal(true);
  };

  const handleDeleteRound = async (roundId) => {
    if (!window.confirm('Are you sure you want to delete this round? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      // Ensure roundId is a number
      const numericRoundId = typeof roundId === 'string' ? parseInt(roundId) : roundId;
      await axios.delete(`${API_BASE_URL}/recruiter/rounds/rounds/${numericRoundId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showSuccess('Round deleted successfully!');
      fetchJobAndRounds(); // Refresh the rounds list
    } catch (error) {
      console.error('Error deleting round:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete round';
      showError(errorMessage);
    }
  };

  const handleAddQuestions = (round) => {
    setSelectedRound(round);
    
    // For all round types, first show generation method selection
    setShowGenerationMethodModal(true);
    
    // Set default question type based on round type
    if (round.type === 'MCQS') {
      setQuestionType('mcq'); // MCQ-only rounds default to MCQ
    } else if (round.type === 'CODING') {
      setQuestionType('coding'); // Coding-only rounds default to coding
      fetchCodingProblems(round.id || round._id);
    } else if (round.type === 'MCQS_CODING' || round.type === 'MIXED') {
      setQuestionType('mcq'); // Mixed rounds default to MCQ (user can switch)
    } else {
      setQuestionType('mcq'); // Fallback to MCQ
    }
  };

  const handleViewQuestions = async (round) => {
    setSelectedRound(round);
    
    // For coding rounds, fetch coding problems and show them in view modal
    if (round.type === 'CODING') {
      await fetchCodingProblems(round.id || round._id);
      setShowViewQuestionsModal(true);
      return;
    }
    
    // For mixed rounds, fetch both MCQ questions and coding problems
    if (round.type === 'MCQS_CODING') {
      await fetchCodingProblems(round.id || round._id);
      // Continue to fetch MCQ questions below
    }
    
    setShowViewQuestionsModal(true);
    
    // For MCQ rounds, fetch existing questions
    try {
      const token = localStorage.getItem('token');
      const roundId = round.id || round._id;
      
      console.log('Fetching questions for round:', roundId);
      
      // Fetch questions from backend
      const response = await axios.get(`${API_BASE_URL}/recruiter/questions/rounds/${roundId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Questions fetched from backend:', response.data);
      
      // Map backend response to frontend format
      const backendQuestions = response.data.map(q => ({
        ...q,
        question: q.questionText, // Map backend field to frontend field
        roundId: roundId
      }));
      
      setExistingQuestions(backendQuestions);
      
      // Also update local state to keep UI in sync
      setSavedQuestions(prev => {
        // Remove old questions for this round and add fetched ones
        const otherRoundQuestions = prev.filter(q => q.roundId !== roundId);
        return [...otherRoundQuestions, ...backendQuestions];
      });
      
    } catch (error) {
      console.error('Error fetching questions:', error);
      
      // Fallback to local state if backend fails
      const roundQuestions = savedQuestions.filter(q => 
        q.roundId === (round.id || round._id)
      );
      setExistingQuestions(roundQuestions);
      
      if (error.response?.status === 404) {
        showError('No questions found for this round.');
      } else {
        showError('Failed to load questions. Showing cached data.');
      }
    }
  };

  const handleViewResults = async (round) => {
    setSelectedRound(round);
    
    // Check if this is a mixed round - redirect to dedicated mixed results page
    if (round.type === 'MIXED') {
      navigate(`/recruiter/mixed-round/${round.id}/results`);
      return;
    }
    
    setShowResultsModal(true);
    
    try {
      const token = localStorage.getItem('token');
      
      let resultsResponse, statsResponse;
      
      if (round.type === 'CODING') {
        [resultsResponse, statsResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/recruiter/results/${round.id}/coding-results`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_BASE_URL}/recruiter/results/${round.id}/coding-stats`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
      } else if (round.type === 'MIXED' || round.type === 'MCQS_CODING') {
        // Mixed rounds use different endpoints
        [resultsResponse, statsResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/recruiter/mixed-rounds/${round.id}/results`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_BASE_URL}/recruiter/mixed-rounds/${round.id}/statistics`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
      } else {
        // Regular MCQ rounds
        [resultsResponse, statsResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/recruiter/results/${round.id}/results`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_BASE_URL}/recruiter/results/${round.id}/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
      }
      
      console.log('Exam results fetched:', resultsResponse.data);
      console.log('Exam stats fetched:', statsResponse.data);
      
      setExamResults(resultsResponse.data);
      setExamStats(statsResponse.data);
        // Auto-shortlist top N candidates by score
        const numToShortlist = round.numAutoShortlistCandidates || 0;
        if (resultsResponse.data && resultsResponse.data.length > 0 && numToShortlist > 0) {
          // Sort descending by score (scorePercentage or totalScore)
          const sortedResults = [...resultsResponse.data].sort((a, b) => {
            const scoreA = a.scorePercentage ?? a.score ?? a.totalScore ?? 0;
            const scoreB = b.scorePercentage ?? b.score ?? b.totalScore ?? 0;
            return scoreB - scoreA;
          });
          // Mark top N as shortlisted
          sortedResults.forEach((result, idx) => {
            result.shortlisted = idx < numToShortlist;
          });
          setExamResults(sortedResults);
        }
      
    } catch (error) {
      console.error('Error fetching exam results:', error);
      
      if (error.response?.status === 404) {
        showError('No exam results found for this round.');
        setExamResults([]);
        setExamStats(null);
      } else if (error.response?.status === 500) {
        showError('Server error occurred while fetching results. Please try again later.');
        setExamResults([]);
        setExamStats(null);
      } else if (error.response?.status === 401) {
        showError('Session expired. Please login again.');
        // Optionally redirect to login
      } else {
        showError(`Failed to load exam results: ${error.response?.data?.error || error.message}`);
        setExamResults([]);
        setExamStats(null);
      }
    }
  };

  const closeResultsModal = () => {
    setShowResultsModal(false);
    setSelectedRound(null);
    setExamResults([]);
    setExamStats(null);
  };

  const handleViewShortlist = async (round) => {
    setSelectedRound(round);
    setShowShortlistModal(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/recruiter/rounds/rounds/${round.id || round._id}/shortlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShortlistData({
        candidates: response.data?.candidates || [],
        shortlistLimit: response.data?.shortlistLimit || 0,
        isFirstRound: response.data?.isFirstRound ?? true,
        totalCandidates: response.data?.totalCandidates || 0,
        shortlistedCount: response.data?.shortlistedCount || 0
      });

    } catch (error) {
      console.error('Error fetching shortlist:', error);
      showError(error.response?.data?.message || 'Failed to fetch shortlist');
      setShortlistData({ candidates: [], shortlistLimit: 0, isFirstRound: true, totalCandidates: 0, shortlistedCount: 0 });
    }
  };

  const closeShortlistModal = () => {
    setShowShortlistModal(false);
    setSelectedRound(null);
    setShortlistData({ candidates: [], shortlistLimit: 0, isFirstRound: true, totalCandidates: 0, shortlistedCount: 0 });
  };

  // Coding Problem Functions
  const fetchCodingProblems = useCallback(async (roundId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/recruiter/coding-problems/round/${roundId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const problems = (response.data.codingProblems || []).map(p => ({
        ...p,
        id: p.id || p._id // Ensure we have id for key/access
      }));
      setCodingProblems(problems);
      console.log('Coding problems fetched:', problems);
    } catch (error) {
      console.error('Error fetching coding problems:', error);
      setCodingProblems([]);
    }
  }, [API_BASE_URL]);

  const handleCodingProblemCreated = (newProblem) => {
    const createdProblem = newProblem?.codingProblem || newProblem;
    const processedProblem = {
      ...createdProblem,
      id: createdProblem.id || createdProblem._id
    };
    setCodingProblems(prev => [...prev, processedProblem]);
    setEditingCodingProblem(null);
    setShowCodingCreator(false);
    setShowQuestionsModal(true); // Return to questions modal after creation
    showSuccess('Coding problem created successfully!');
  };

  const handleCodingProblemUpdated = (updatedProblemResponse) => {
    const updatedProblem = updatedProblemResponse?.codingProblem || updatedProblemResponse;
    const normalizedProblem = {
      ...updatedProblem,
      id: updatedProblem.id || updatedProblem._id
    };

    setCodingProblems(prev =>
      prev.map(problem => (problem.id === normalizedProblem.id ? normalizedProblem : problem))
    );
    setEditingCodingProblem(null);
    setShowCodingCreator(false);
    setShowQuestionsModal(true);
    showSuccess('Coding problem updated successfully!');
  };

  const handleShowCodingCreator = () => {
    setEditingCodingProblem(null);
    setShowCodingCreator(true);
  };

  const handleCloseCodingCreator = () => {
    setEditingCodingProblem(null);
    setShowCodingCreator(false);
    setShowQuestionsModal(true); // Return to questions modal if cancelled
  };

  const handleEditCodingProblem = (problem) => {
    setEditingCodingProblem(problem);
    setShowCodingCreator(true);
  };

  const handleDeleteCodingProblem = async (problemId) => {
    if (!window.confirm('Are you sure you want to delete this coding problem? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/recruiter/coding-problems/${problemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove from local state
      setCodingProblems(prev => prev.filter(p => p.id !== problemId));
      showSuccess('Coding problem deleted successfully!');
    } catch (error) {
      console.error('Error deleting coding problem:', error);
      showError('Failed to delete coding problem. Please try again.');
    }
  };

  const resetQuestionForm = () => {
    setCurrentQuestion({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    });
  };

  const closeGenerationMethodModal = () => {
    setShowGenerationMethodModal(false);
    setSelectedRound(null);
    setGenerationMethod('manual');
  };

  const handleGenerationMethodSelect = (method) => {
    setGenerationMethod(method);
    setShowGenerationMethodModal(false);
    setShowQuestionsModal(true);
    
    // If it's a coding-only round or user selected coding type, fetch problems
    if (selectedRound && (selectedRound.type === 'CODING' || questionType === 'coding')) {
      fetchCodingProblems(selectedRound.id || selectedRound._id);
    }
  };

  const closeQuestionsModal = () => {
    setShowQuestionsModal(false);
    setSelectedRound(null);
    setQuestionType('mcq'); // Reset to MCQ by default
    setGenerationMethod('manual');
    setGeneratedQuestions([]);
    setAiGenerationParams({
      numQuestions: 5,
      techConcepts: [],
      difficulty: 'medium'
    });
    // Reset AI coding generation state
    setGeneratedCodingProblems([]);
    setAiCodingParams({
      numProblems: 2,
      topics: [],
      difficulty: 'medium',
      problemType: 'algorithm'
    });
    resetQuestionForm();
  };

  useEffect(() => {
    if (showQuestionsModal && questionType === 'coding' && selectedRound) {
      fetchCodingProblems(selectedRound.id || selectedRound._id);
    }
  }, [showQuestionsModal, questionType, selectedRound, fetchCodingProblems]);

  const handleAiGeneration = async () => {
    if (aiGenerationParams.techConcepts.length === 0) {
      showError('Please select at least one tech concept');
      return;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/recruiter/exams/rounds/${selectedRound.id || selectedRound._id}/generate-questions`,
        {
          techConcepts: aiGenerationParams.techConcepts,
          difficulty: aiGenerationParams.difficulty,
          numQuestions: aiGenerationParams.numQuestions
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const { questions } = response.data;
      setGeneratedQuestions(questions);
      showSuccess(`Generated ${questions.length} AI questions successfully!`);
    } catch (error) {
      console.error('Error generating AI questions:', error);
      showError(error.response?.data?.error || 'Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };


  const handleConfirmAiQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const roundId = selectedRound.id || selectedRound._id;
      
      // Save each question individually since bulk endpoint doesn't exist
      const savePromises = generatedQuestions.map(q => {
        const questionData = {
          questionText: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || null,
          difficulty: q.difficulty,
          concept: q.concept
        };
        
        return axios.post(`${API_BASE_URL}/recruiter/questions/rounds/${roundId}/questions`, questionData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      });

      // Wait for all questions to be saved
      await Promise.all(savePromises);

      showSuccess(`Added ${generatedQuestions.length} AI-generated questions to the round!`);
      setGeneratedQuestions([]);
      closeQuestionsModal();
      fetchJobAndRounds(); // Refresh rounds data
    } catch (error) {
      console.error('Error saving AI questions:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to save questions. Please try again.';
      showError(errorMessage);
    }
  };

  const handleRegenerateQuestions = () => {
    setGeneratedQuestions([]);
    handleAiGeneration();
  };

  // AI Coding Generation Handlers
  const handleAiCodingGeneration = async () => {
    if (aiCodingParams.topics.length === 0) {
      showError('Please add at least one programming topic');
      return;
    }

    setIsGeneratingCoding(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/recruiter/exams/rounds/${selectedRound.id || selectedRound._id}/generate-coding-problems`,
        {
          topics: aiCodingParams.topics,
          difficulty: aiCodingParams.difficulty,
          numProblems: aiCodingParams.numProblems,
          problemType: aiCodingParams.problemType
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const { problems } = response.data;
      setGeneratedCodingProblems(problems);
      showSuccess(`Generated ${problems.length} AI coding problems successfully!`);
    } catch (error) {
      console.error('Error generating AI coding problems:', error);
      showError(error.response?.data?.error || 'Failed to generate coding problems. Please try again.');
    } finally {
      setIsGeneratingCoding(false);
    }
  };

  const handleRegenerateCodingProblems = () => {
    setGeneratedCodingProblems([]);
    handleAiCodingGeneration();
  };

  const handleConfirmAiCodingProblems = async () => {
    try {
      const token = localStorage.getItem('token');
      const roundId = selectedRound.id || selectedRound._id;
      
      // Save each coding problem individually
      const savePromises = generatedCodingProblems.map(problem => {
        const problemData = {
          title: problem.title,
          problemStatement: problem.problemStatement,
          explanation: problem.explanation,
          inputFormat: problem.inputFormat,
          outputFormat: problem.outputFormat,
          constraints: problem.constraints,
          difficulty: problem.difficulty,
          timeLimit: problem.timeLimit,
          memoryLimit: problem.memoryLimit,
          allowedLanguages: problem.allowedLanguages,
          testCases: problem.testCases
        };

        return axios.post(`${API_BASE_URL}/recruiter/coding-problems/rounds/${roundId}`, problemData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      });

      // Wait for all problems to be saved
      await Promise.all(savePromises);

      showSuccess(`Added ${generatedCodingProblems.length} AI-generated coding problems to the round!`);
      setGeneratedCodingProblems([]);
      closeQuestionsModal();
      fetchJobAndRounds(); // Refresh rounds data
    } catch (error) {
      console.error('Error saving AI coding problems:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to save coding problems. Please try again.';
      showError(errorMessage);
    }
  };

  const closeViewQuestionsModal = () => {
    setShowViewQuestionsModal(false);
    setSelectedRound(null);
    setExistingQuestions([]);
  };

  const handleSaveQuestion = async () => {
    // Validate the question
    if (!currentQuestion.question.trim()) {
      showError('Please enter a question');
      return;
    }

    // Check if all options are filled
    const emptyOptions = currentQuestion.options.some(option => !option.trim());
    if (emptyOptions) {
      showError('Please fill in all options');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const roundId = selectedRound.id || selectedRound._id;
      
      // Prepare question data for API
      const questionData = {
        questionText: currentQuestion.question.trim(),
        options: currentQuestion.options,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation || null
      };

      console.log('Saving question to backend:', questionData);
      console.log('Round ID:', roundId);
      console.log('API URL:', `${API_BASE_URL}/recruiter/questions/rounds/${roundId}/questions`);

      // Save to backend
      const response = await axios.post(`${API_BASE_URL}/recruiter/questions/rounds/${roundId}/questions`, questionData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Question saved successfully:', response.data);

      // Add to local state for immediate UI update
      const newQuestion = {
        ...response.data,
        question: response.data.questionText, // Map backend field to frontend field
        roundId: roundId
      };

      setSavedQuestions(prev => [...prev, newQuestion]);
      
      showSuccess('Question added successfully!');
      resetQuestionForm();
      
    } catch (error) {
      console.error('Error saving question:', error);
      if (error.response?.status === 400) {
        showError(error.response.data.error || error.response.data.message || 'Invalid question data');
      } else if (error.response?.status === 401) {
        showError('Authentication failed. Please login again.');
      } else if (error.response?.status === 404) {
        showError('Round not found. Please refresh the page and try again.');
      } else {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to save question. Please try again.';
        showError(errorMessage);
      }
    }
  };

  const resetForm = () => {
                setFormData({
      title: '',
      description: '',
      type: 'MCQS',
      topics: [],
      startTime: '',
      endTime: '',
      duration: 60,
      mcqQuestions: 10,
      codingQuestions: 2,
      numAutoShortlistCandidates: 0, // New field for number of candidates to auto-shortlist
      // totalQuestions is now calculated automatically
    });
    setEditingRound(null);
    setShowAddModal(false);
    setValidationMessage('');
  };


  const handleNewInterviewRound = () => {
    setShowInterviewModal(true);
    fetchShortlistedCandidates();
  };

  // View feedback for interviews in this specific job only
  const handleViewOverallFeedback = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!jobId) {
        showError('Unable to fetch feedback: Job ID not found');
        return;
      }

      console.log('Fetching feedback for job ID:', jobId);

      // Fetch feedback specifically for this job
      const response = await axios.get(`${API_BASE_URL}/interview-feedback/job/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Feedback response:', response.data);

      if (response.data && response.data.success && response.data.feedback) {
        const jobFeedback = response.data.feedback;
        
        setFeedbackList(jobFeedback);
        setShowFeedbackModal(true);
        
        if (jobFeedback.length > 0) {
          showSuccess(`Found ${jobFeedback.length} feedback entries for this job`);
        } else {
          showSuccess('No feedback found for interviews in this job yet');
        }
      } else {
        setFeedbackList([]);
        setShowFeedbackModal(true);
        showSuccess('No feedback found for interviews in this job yet');
      }
    } catch (error) {
      console.error('Error fetching interview feedback:', error);
      console.error('Error details:', error.response?.data);
      console.log('🔍 Debug - Error status:', error.response?.status);
      console.log('🔍 Debug - Should trigger fallback:', error.response?.status === 404);
      
      // Try admin endpoint as fallback if primary endpoint fails
      if (error.response?.status === 404) {
        console.log('🔄 Primary feedback endpoint failed, trying admin endpoint...');
        console.log('🔗 Admin endpoint URL:', `${API_BASE_URL}/admin/interview-feedback/job/${jobId}`);
        
        try {
          const adminResponse = await axios.get(`${API_BASE_URL}/admin/interview-feedback/job/${jobId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          
          console.log('✅ Admin feedback response:', adminResponse.data);
          
          if (adminResponse.data && adminResponse.data.success && adminResponse.data.feedback) {
            const jobFeedback = adminResponse.data.feedback;
            setFeedbackList(jobFeedback);
            setShowFeedbackModal(true);
            showSuccess(`Found ${jobFeedback.length} feedback entries for this job (via admin endpoint)`);
            return;
          }
        } catch (adminError) {
          console.error('Admin feedback endpoint also failed:', adminError);
        }
        
        // If admin endpoint also fails, try to fetch all feedback and filter by jobId
        try {
          console.log('Trying to fetch all feedback and filter by jobId...');
          const allFeedbackResponse = await axios.get(`${API_BASE_URL}/admin/interview-feedback/all`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          
          if (allFeedbackResponse.data && allFeedbackResponse.data.feedback) {
            // Filter feedback by jobId
            const filteredFeedback = allFeedbackResponse.data.feedback.filter(feedback => 
              feedback.jobId && feedback.jobId.toString() === jobId.toString()
            );
            
            console.log('Filtered feedback:', filteredFeedback);
            setFeedbackList(filteredFeedback);
            setShowFeedbackModal(true);
            
            if (filteredFeedback.length > 0) {
              showSuccess(`Found ${filteredFeedback.length} feedback entries for this job (filtered from all feedback)`);
            } else {
              showSuccess('No feedback found for interviews in this job yet');
            }
            return;
          }
        } catch (allFeedbackError) {
          console.error('All feedback fetch also failed:', allFeedbackError);
        }
      }
      
      let errorMessage = 'Failed to fetch interview feedback';
      if (error.response?.status === 404) {
        errorMessage = 'No feedback found for this job yet';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view feedback';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      showError(errorMessage);
      setFeedbackList([]);
    }
  };

  // This function is replaced by handleInterviewSubmit - removing duplicate

  const handleJoinInterview = (interview) => {
    if (!interview.roomCode) {
      showError('No video room available for this interview');
      return;
    }

    const confirmMessage = `Join ${interview.title}?\n\n` +
      `VIDEO INTERVIEW:\n` +
      `• Room Code: ${interview.roomCode}\n` +
      `• Password: ${interview.roomPassword || 'Not required'}\n` +
      `• Duration: ${interview.durationMinutes} minutes\n` +
      `• Type: ${interview.roundTypeDisplayName}\n\n` +
      `Make sure you have a stable internet connection and your camera/microphone are working.\n\n` +
      `Ready to join the interview?`;

    if (window.confirm(confirmMessage)) {
      // Use internal video call system with scheduled=true for recruiters
      const params = new URLSearchParams({
        scheduled: 'true',
        interviewName: interview.title,
        jobId: jobId, // Pass jobId for feedback tracking
        ...(interview.roomPassword && { password: interview.roomPassword })
      });
      
      const videoCallUrl = `/video-call/${interview.roomCode}?${params.toString()}`;
      window.open(videoCallUrl, '_blank', 'width=1400,height=900');
    }
  };

  const handleDeleteInterview = async (interview) => {
    const confirmMessage = `Are you sure you want to delete "${interview.title}"?\n\n` +
      `WARNING:\n` +
      `• This action cannot be undone\n` +
      `• ${interview.candidateCount} candidate(s) will lose access\n` +
      `• Video room will be permanently removed\n` +
      `• Scheduled date: ${new Date(interview.scheduledDateTime).toLocaleString()}\n\n` +
      `Type "DELETE" to confirm this action.`;

    const userInput = window.prompt(confirmMessage);
    
    if (userInput === 'DELETE') {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await axios.delete(`${API_BASE_URL}/interviews/${interview.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 200) {
          // Remove from local state
          setInterviewRounds(prev => prev.filter(i => i.id !== interview.id));
          showSuccess(`Interview round "${interview.title}" has been deleted successfully.`);
        }
      } catch (error) {
        console.error('Error deleting interview round:', error);
        showError(error.response?.data?.message || 'Failed to delete interview round');
      } finally {
        setLoading(false);
      }
    } else if (userInput !== null) {
      showError('Deletion cancelled. You must type "DELETE" exactly to confirm.');
    }
  };


  
  
  const handleViewInterviewFeedback = async (interview) => {
    try {
      const token = localStorage.getItem('token');
      
      // Try to fetch feedback for this interview's room code and specific job
      const response = await axios.get(`${API_BASE_URL}/interview-feedback/room/${interview.roomCode}/job/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success && response.data.feedback.length > 0) {
        // Show all feedback for this interview in this job
        setFeedbackList(response.data.feedback);
        setSelectedFeedback(response.data.feedback[0]); // Show first feedback
        setShowFeedbackModal(true);
      } else {
        // Fallback: Try the old endpoint without job filtering
        try {
          const fallbackResponse = await axios.get(`${API_BASE_URL}/interview-feedback/room/${interview.roomCode}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (fallbackResponse.data && fallbackResponse.data.success && fallbackResponse.data.feedback.length > 0) {
            setFeedbackList(fallbackResponse.data.feedback);
            setSelectedFeedback(fallbackResponse.data.feedback[0]);
            setShowFeedbackModal(true);
          } else {
            showError('No feedback available for this interview yet.');
          }
        } catch (fallbackError) {
          console.error('Fallback feedback fetch error:', fallbackError);
          showError('No feedback available for this interview yet.');
        }
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      showError('Failed to fetch interview feedback. Please try again.');
    }
  };


  // Handle candidate selection from feedback
  const handleFeedbackCandidateSelection = async (roomCode, status, feedback = null) => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const targetFeedback = feedback || selectedFeedback;
      const candidateName = targetFeedback.candidateName;
      const statusText = status === 'selected' ? 'Selected' : 'Rejected';
      
      // Call the backend API to update candidate status
      let response;
      try {
        response = await axios.post(`${API_BASE_URL}/interview-feedback/candidate-selection`, {
          roomCode,
          candidateName,
          status,
          recruiterEmail: user.email,
          jobId: jobId // Include jobId for better tracking
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (primaryError) {
        console.log('🔄 Primary candidate selection endpoint failed, trying admin endpoint...');
        console.log('🔗 Primary error details:', primaryError.message || primaryError);
        console.log('🔗 Admin selection URL:', `${API_BASE_URL}/admin/interview-feedback/candidate-selection`);
        console.log('📤 Selection data:', { roomCode, candidateName, status });
        
        // Try admin endpoint as fallback
        response = await axios.post(`${API_BASE_URL}/admin/interview-feedback/candidate-selection`, {
          roomCode,
          candidateName,
          status,
          recruiterEmail: user.email,
          jobId: jobId
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Admin candidate selection endpoint worked!');
        console.log('📊 Response details:', JSON.stringify(response.data, null, 2));
      }
      
      if (response.data.success) {
        showSuccess(`Candidate ${candidateName} has been ${statusText.toLowerCase()} successfully!`);
        
        // Update the feedback in local state to reflect the selection
        if (feedbackList.length > 0) {
          setFeedbackList(prev => prev.map(f => 
            f.id === targetFeedback.id || (f.roomCode === roomCode && f.candidateName === candidateName)
              ? { ...f, selectionStatus: status }
              : f
          ));
        }
        
        if (selectedFeedback && (selectedFeedback.id === targetFeedback.id || 
            (selectedFeedback.roomCode === roomCode && selectedFeedback.candidateName === candidateName))) {
          setSelectedFeedback(prev => ({
            ...prev,
            selectionStatus: status
          }));
        }
        
      } else {
        showError(response.data.message || 'Failed to update candidate status.');
      }
      
    } catch (error) {
      console.error('Error updating candidate status:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to update candidate status. Please try again.';
      showError(errorMessage);
    }
  };

  // Handle marking interview as completed
  const handleMarkAsCompleted = async (interview) => {
    const confirmMessage = `Mark "${interview.title}" as completed?\n\n` +
      `This will:\n` +
      `• Update the interview status to COMPLETED\n` +
      `• Notify all candidates that the interview is finished\n` +
      `• Update candidate application status\n\n` +
      `This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Update interview status to COMPLETED
        const response = await axios.put(`${API_BASE_URL}/interviews/${interview.id}/complete`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 200) {
          // Update local state
          setInterviewRounds(prev => prev.map(i => 
            i.id === interview.id 
              ? { ...i, status: 'COMPLETED' }
              : i
          ));
          
          // Update candidate applications status
          if (interview.candidateEmails && interview.candidateEmails.length > 0) {
            try {
              await axios.put(`${API_BASE_URL}/candidate/applications/update-interview-status`, {
                candidateEmails: interview.candidateEmails,
                jobId: jobId,
                status: 'interview_completed'
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
            } catch (appError) {
              console.error('Error updating candidate application status:', appError);
            }
          }
          
          showSuccess(`Interview "${interview.title}" marked as completed successfully.`);
        }
      } catch (error) {
        console.error('Error marking interview as completed:', error);
        showError(error.response?.data?.message || 'Failed to mark interview as completed');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleInterviewFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setInterviewFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  
  const selectAllCandidates = () => {
    const allEmails = shortlistedCandidates.map(c => c.email);
    setInterviewFormData(prev => ({
      ...prev,
      candidateEmails: allEmails
    }));
  };

  const deselectAllCandidates = () => {
    setInterviewFormData(prev => ({
      ...prev,
      candidateEmails: []
    }));
  };

  const handleInterviewSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!interviewFormData.title?.trim()) {
      showError('Please provide a title for the interview round');
      return;
    }
    
    if (!interviewFormData.scheduledDateTime) {
      showError('Please select a date and time for the interview');
      return;
    }
    
    if (!interviewFormData.candidateEmails?.length) {
      showError('Please select at least one candidate');
      return;
    }
    
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
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
      
      // Fallback to direct keys or default
      if (!userEmail) {
        userEmail = localStorage.getItem('userEmail') || 
                   localStorage.getItem('email') || 
                   localStorage.getItem('user_email') ||
                   'recruiter@example.com';
      }
      
      // Format the date for the backend - keep it as local datetime string
      // Don't convert to UTC, send as local time
      const formattedDateTime = interviewFormData.scheduledDateTime;
      
      console.log('Original datetime input:', interviewFormData.scheduledDateTime);
      console.log('Sending to backend:', formattedDateTime);
      
      const requestData = {
        title: interviewFormData.title.trim(),
        roundType: interviewFormData.roundType || 'TECHNICAL_INTERVIEW',
        jobId: parseInt(jobId, 10),
        recruiterEmail: userEmail,
        description: interviewFormData.description?.trim() || '',
        scheduledDateTime: formattedDateTime,
        durationMinutes: parseInt(interviewFormData.durationMinutes, 10) || 60,
        candidateEmails: Array.isArray(interviewFormData.candidateEmails) 
          ? interviewFormData.candidateEmails 
          : [],
        createVideoRoom: Boolean(interviewFormData.createVideoRoom),
        customRoomPassword: interviewFormData.customRoomPassword?.trim() || ''
      };
      
      if (isNaN(requestData.jobId)) {
        throw new Error('Invalid job ID');
      }

      console.log('Creating interview round with backend:', requestData);

      const response = await axios.post(`${API_BASE_URL}/interviews/create`, requestData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const createdInterview = response.data;
      console.log('Interview round created successfully:', createdInterview);

      // Add to local state
      setInterviewRounds(prev => [...prev, createdInterview]);

      showSuccess(`Interview round "${interviewFormData.title}" created successfully! ${interviewFormData.candidateEmails.length} candidates will be notified.`);
      
      // Show room details if video room was created
      if (createdInterview.roomCode) {
        setTimeout(() => {
          showSuccess(`Video Room Created - Code: ${createdInterview.roomCode}, Password: ${createdInterview.roomPassword}`);
        }, 1000);
      }
      
      // Reset form and close modal
      setInterviewFormData({
        title: '',
        roundType: 'TECHNICAL_INTERVIEW',
        description: '',
        scheduledDateTime: '',
        durationMinutes: 60,
        candidateEmails: [],
        createVideoRoom: true,
        customRoomPassword: ''
      });
      setShowInterviewModal(false);

      // Refresh the interview rounds list
      await fetchInterviewRounds();

    } catch (err) {
      console.error('Error creating interview round:', err);
      showError(err.response?.data?.message || 'Failed to create interview round');
    } finally {
      setLoading(false);
    }
  };


  const closeInterviewModal = () => {
    setShowInterviewModal(false);
    setInterviewFormData({
      title: '',
      roundType: 'TECHNICAL_INTERVIEW',
      description: '',
      scheduledDateTime: '',
      durationMinutes: 60,
      candidateEmails: [],
      createVideoRoom: true,
      customRoomPassword: ''
    });
  };

  const formatJobDate = (dateValue) => {
    if (!dateValue) return 'Not set';
    
    let date;
    if (typeof dateValue === 'number') {
      // Handle Unix timestamp (multiply by 1000 to convert to milliseconds)
      date = new Date(dateValue * 1000);
    } else if (typeof dateValue === 'string') {
      // Handle ISO string or other string formats
      date = new Date(dateValue);
    } else {
      date = dateValue;
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleDateString('en-GB');
  };

  const formatRoundDateTime = (dateTimeValue) => {
    if (!dateTimeValue) return 'Not set';
    
    try {
      let date;
      
      if (Array.isArray(dateTimeValue)) {
        // Handle LocalDateTime array format from backend: [year, month, day, hour, minute]
        const [year, month, day, hour, minute] = dateTimeValue;
        // Note: JavaScript months are 0-based, so subtract 1 from month
        date = new Date(year, month - 1, day, hour, minute || 0);
      } else if (typeof dateTimeValue === 'string') {
        // Handle ISO string format from backend
        date = new Date(dateTimeValue);
      } else if (typeof dateTimeValue === 'number') {
        // Handle Unix timestamp
        date = new Date(dateTimeValue * 1000);
      } else {
        date = dateTimeValue;
      }
      
      // Check if date is valid
      if (!date || isNaN(date.getTime())) {
        console.error('Invalid date value:', dateTimeValue);
        return 'Invalid Date';
      }
      
      // Format as: "21/09/2025, 14:30"
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Error formatting date:', error, 'Value:', dateTimeValue);
      return 'Date Error';
    }
  };

  const getRoundTypeIcon = (type) => {
    switch (type) {
      case 'TECHNICAL': return <FiFileText />;
      case 'CODING': return <FiCode />;
      case 'MCQS': return <FiCheckCircle />;
      case 'MIXED': return <FiTarget />;
      case 'MCQS_CODING': return <FiTarget />;
      case 'HR': return <FiUsers />;
      default: return <FiFileText />;
    }
  };

  if (loading) {
    return (
      <div className="rounds-loading">
        <div className="spinner"></div>
        <p>Loading rounds...</p>
      </div>
    );
  }

  return (
  <div className="rounds-container">
      {/* Header */}
      <div className="rounds-header">
        <div className="header-top">
          <div className="job-main-info">
            <h1>{job?.title || 'Job Rounds'}</h1>
            <span className="job-skills-subtitle">{job?.skills || 'No skills specified'}</span>
          </div>
          <button className="back-btn" onClick={() => navigate('/recruiter/generate-test')}>
            <FiArrowLeft /> Back to Jobs
          </button>
        </div>

        <div className="header-bottom">
          <div className="job-details">
            <div className="job-meta-row">
              <span className="job-meta-item">
                <strong>Company:</strong> {job?.company || 'Not specified'}
              </span>
              <span className="job-meta-item">
                <strong>Location:</strong> {job?.location || 'Not specified'}
              </span>
              <span className="job-meta-item">
                <strong>Type:</strong> {job?.employmentType || 'Full-time'}
              </span>
              
              <span className={`visibility-badge ${job?.isPublic ? 'public' : 'private'}`}>
                {job?.isPublic ? '🌐 Public Job' : '🔒 Private Job'}
              </span>
              
              {!job?.isPublic && job?.accessCode && (
                <div className="access-code-display-header">
                  <span className="access-code-label">Access Code:</span>
                  <code className="access-code-value">{job?.accessCode}</code>
                  <button 
                    className="copy-code-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(job.accessCode);
                      showSuccess('Access code copied to clipboard!');
                    }}
                    title="Copy access code"
                  >
                    📋
                  </button>
                </div>
              )}
            </div>
            
            {/* Timeline */}
            {(job?.startDate || job?.endDate) && (
              <div className="job-meta-row">
                <span className="job-meta-item">
                  <strong>Timeline:</strong> 
                  {job?.startDate && formatJobDate(job.startDate)} 
                  {job?.startDate && job?.endDate && ' - '}
                  {job?.endDate && formatJobDate(job.endDate)}
                </span>
              </div>
            )}
          </div>
          
          <div className="header-actions">
            <button className="add-round-btn" onClick={() => setShowAddModal(true)}>
              <FiPlus /> Add Round
            </button>
            <button className="interview-round-btn" onClick={handleNewInterviewRound}>
              <FiVideo /> New Interview Round
            </button>
            <button 
              className="overall-feedback-btn" 
              onClick={handleViewOverallFeedback}
              title="View Overall Feedback"
            >
              <FiEye /> View Feedback
            </button>
            <button 
              className="refresh-btn" 
              onClick={() => fetchInterviewRounds()}
              title="Refresh Interview Rounds"
            >
              <FiRefreshCw /> Refresh
            </button>
            <button 
              className="shortlist-btn" 
              onClick={() => navigate(`/recruiter/jobs/${jobId}/shortlist`)}
            >
              <FiUsers /> Shortlist Candidates
            </button>
            <button className="delete-job-btn" onClick={handleDeleteJob}>
              <FiTrash2 /> Delete Job
            </button>
          </div>
        </div>
      </div>

      {/* Rounds List */}
      <div className="rounds-list">
        {rounds.length > 0 ? (
          rounds.map((round, index) => {
            // Safety check
            if (!round) {
              return null;
            }
            
            return (
              <div key={round._id || round.id || `round-${index}`} className="round-card">
                <div className="round-header">
                  <div className="round-info">
                    <div className="round-icon">
                      {getRoundTypeIcon(round.type)}
                    </div>
                    <div className="round-title-section">
                      <h3>Round {index + 1}: {round.title}</h3>
                      <div className="round-meta-inline">
                        <span className="round-meta-item">
                          <span className="meta-label">round type:</span>
                          <span className="round-type">{round.type?.replace('_', ' ')}</span>
                        </span>
                        <span className="round-meta-item">
                          <span className="meta-label">questions:</span>
                          <span className="round-questions">
                            {round.type === 'MCQS' && `${round.mcqQuestions || 0} MCQs`}
                            {round.type === 'CODING' && `${round.codingQuestions || 0} Coding`}
                            {(round.type === 'MIXED' || round.type === 'MCQS_CODING') && 
                              `${(round.mcqQuestions || 0) + (round.codingQuestions || 0)} Questions`}
                          </span>
                        </span>
                        <span className="round-meta-item">
                          <span className="meta-label"><FiClock /> duration:</span>
                          <span className="round-duration">{round.duration}min</span>
                        </span>
                        {round.startTime && (
                          <span className="round-meta-item">
                            <span className="meta-label">starting time:</span>
                            <span className="round-start-date">
                              <FiCalendar /> {formatRoundDateTime(round.startTime)}
                            </span>
                          </span>
                        )}
                        {round.topics && round.topics.trim() && (
                          <span className="round-meta-item">
                            <span className="meta-label">skill:</span>
                            <span className="round-topics-inline">
                              {round.topics.split(',').filter(topic => topic.trim()).slice(0, 2).map((topic, i) => (
                                <span key={`topic-${i}`} className="topic-tag-inline">
                                  {topic.trim()}
                                </span>
                              ))}
                              {round.topics.split(',').filter(topic => topic.trim()).length > 2 && (
                                <span className="topic-more-inline">+{round.topics.split(',').filter(topic => topic.trim()).length - 2}</span>
                              )}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="round-actions">
                    <button className="action-btn add-questions-btn" onClick={() => handleAddQuestions(round)} title="Add Questions">
                      <FiPlus />
                    </button>
                    <button className="action-btn view-questions-btn" onClick={() => handleViewQuestions(round)} title="View Questions">
                      <FiEye />
                    </button>
                    <button className="action-btn view-results-btn" onClick={() => handleViewResults(round)} title="View Results">
                      <FiBarChart2 />
                    </button>
                    <button className="action-btn shortlist-round-btn" onClick={() => handleViewShortlist(round)} title="View Shortlist">
                      <FiUsers />
                    </button>
                    <button className="action-btn edit-btn" onClick={() => handleEditRound(round)} title="Edit">
                      <FiEdit2 />
                    </button>
                    <button className="action-btn delete-btn" onClick={() => handleDeleteRound(round.id || round._id)} title="Delete">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
          )
        })
        ) : (
          <div className="no-rounds">
            <FiFileText size={48} />
            <h3>No rounds created yet</h3>
            <p>Create your first round to start the interview process</p>
            <button className="add-first-round-btn" onClick={() => setShowAddModal(true)}>
              <FiPlus /> Create First Round
            </button>
          </div>
        )}
      </div>

      {/* Interview Rounds Section */}
      <div className="interview-rounds-section">
        <div className="section-header">
          <div className="section-title-area">
            <h2><FiVideo /> Interview Rounds</h2>
            <span className="rounds-count">{interviewRounds.length} interview{interviewRounds.length !== 1 ? 's' : ''} scheduled</span>
          </div>
        </div>
        
        {loadingInterviews ? (
          <div className="loading-rounds">
            <div className="loading-spinner"></div>
            <p>Loading interview rounds...</p>
          </div>
        ) : interviewRounds.length > 0 ? (
          <div className="rounds-list">
            {interviewRounds.map((interview) => {
              // Parse the scheduledDateTime (now in ISO string format from backend)
              let interviewDate;
              
              try {
                if (interview.scheduledDateTime) {
                  interviewDate = new Date(interview.scheduledDateTime);
                  
                  // Validate the parsed date
                  if (isNaN(interviewDate.getTime())) {
                    console.error('Invalid scheduledDateTime:', interview.scheduledDateTime);
                    interviewDate = null;
                  }
                } else {
                  console.warn('No scheduledDateTime provided for interview:', interview.title);
                  interviewDate = null;
                }
              } catch (error) {
                console.error('Error parsing scheduledDateTime:', interview.scheduledDateTime, error);
                interviewDate = null;
              }
              
              // Add debug logging to see what we're getting from backend
              console.log('Raw scheduledDateTime from backend:', interview.scheduledDateTime);
              console.log('Parsed interviewDate:', interviewDate);
              
              const formattedDate = interviewDate 
                ? interviewDate.toLocaleDateString('en-IN', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric'
                  })
                : 'Date not set';
                
              const formattedTime = interviewDate
                ? interviewDate.toLocaleTimeString('en-IN', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true
                  })
                : 'Time not set';
                
              console.log('Formatted date:', formattedDate, 'Formatted time:', formattedTime);
              
              return (
                <div key={interview.id} className="round-card">
                  <div className="round-header">
                    <div className="round-info">
                      <div className="round-icon">
                        <FiVideo />
                      </div>
                      <div className="round-title-section">
                        <h3>{interview.title}</h3>
                        <div className="round-meta-inline">
                          <span className="round-meta-item">
                            <span className="meta-label">type:</span>
                            <span className="round-type">{interview.roundTypeDisplayName || 'Video Interview'}</span>
                          </span>
                          <span className="round-meta-item">
                            <span className="meta-label"><FiClock /> scheduled:</span>
                            <span className="round-start-date">
                              {formattedDate} at {formattedTime}
                            </span>
                          </span>
                          {interview.roomCode && (
                            <span className="round-meta-item">
                              <span className="meta-label">room:</span>
                              <span className="room-code">{interview.roomCode}</span>
                            </span>
                          )}
                          <span className="round-meta-item">
                            <span className="meta-label">candidates:</span>
                            <span className="candidates-count">
                              {interview.candidateCount} selected
                              {interview.candidateEmails && interview.candidateEmails.length > 0 && (
                                <span className="candidates-emails-inline">
                                  {interview.candidateEmails.slice(0, 2).map((email, idx) => (
                                    <span key={idx} className="candidate-email-inline" title={email}>
                                      {email}
                                    </span>
                                  ))}
                                  {interview.candidateEmails.length > 2 && (
                                    <span className="more-candidates" title={interview.candidateEmails.slice(2).join(', ')}>
                                      +{interview.candidateEmails.length - 2}
                                    </span>
                                  )}
                                </span>
                              )}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="round-actions">
                      {interview.roomCode && (
                        <button 
                          className="action-btn view-questions-btn"
                          onClick={() => handleJoinInterview(interview)}
                          title="Join Interview"
                        >
                          <FiVideo />
                        </button>
                      )}
                      {interview.status !== 'COMPLETED' && (
                        <button 
                          className="action-btn complete-btn"
                          onClick={() => handleMarkAsCompleted(interview)}
                          title="Mark as Completed"
                        >
                          <FiCheckCircle />
                        </button>
                      )}
                      {interview.status === 'COMPLETED' && (
                        <>
                          <button 
                            className="action-btn feedback-btn"
                            onClick={() => handleViewInterviewFeedback(interview)}
                            title="View Interview Feedback"
                          >
                            <FiEye />
                          </button>
                          <span className="completed-badge" title="Interview Completed">
                            <FiCheckCircle /> Completed
                          </span>
                        </>
                      )}
                      <button 
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteInterview(interview)}
                        title="Delete Interview"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-rounds">
            <FiCalendar size={48} />
            <h3>No interview rounds scheduled yet</h3>
            <p>Schedule your first interview round to get started</p>
            <button className="add-first-round-btn" onClick={handleNewInterviewRound}>
              <FiVideo /> Schedule Interview
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Round Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRound ? 'Edit Round' : 'Add New Round'}</h2>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="round-form">
              <div className="form-group">
                <label>Round Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Technical Interview, Coding Challenge"
                  required
                />
              </div>

              <div className="form-group">
                <label>Round Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  {roundTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              
                            <div className="form-group">
                <label>Topics / Technologies</label>
                <TagInput 
                  tags={formData.topics}
                  setTags={(newTags) => setFormData({ ...formData, topics: newTags })}
                />
                <p className="form-hint">Topics that will be covered in this round.</p>
              </div>

                            <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <div className="datetime-input-group">
                    <input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={handleTimeChange}
                      required
                    />
                    <button
                      type="button"
                      className="suggest-time-btn"
                      onClick={suggestNextAvailableSlot}
                      title="Suggest next available time slot"
                    >
                      🎯 Suggest Time
                    </button>
                  </div>
                  {job && job.startDate && job.endDate && (
                    <p className="form-hint">
                      Must be within job timeline: {formatJobDate(job.startDate)} - {formatJobDate(job.endDate)}
                    </p>
                  )}
                  {validationMessage && (
                    <p className={`validation-message ${validationMessage.includes('✅') ? 'success' : 'warning'}`}>
                      {validationMessage}
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    min={formData.startTime || (job?.startDate)}
                    max={job?.endDate}
                    required
                  />
                  <p className="form-hint">
                    Candidates can participate between start and end time
                  </p>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration || ''}
                    onChange={handleDurationChange}
                    min="1"
                    max="300"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                {(formData.type === 'MCQS' || formData.type === 'MCQS_CODING') && (
                  <div className="form-group">
                    <label>Number of MCQ Questions</label>
                    <input
                      type="number"
                      value={formData.mcqQuestions || ''}
                      onChange={(e) => setFormData({ ...formData, mcqQuestions: parseInt(e.target.value) || 0 })}
                      min="1"
                      max="100"
                      required
                    />
                  </div>
                )}
                
                {(formData.type === 'CODING' || formData.type === 'MCQS_CODING') && (
                  <div className="form-group">
                    <label>Number of Coding Questions</label>
                    <input
                      type="number"
                      value={formData.codingQuestions || ''}
                      onChange={(e) => setFormData({ ...formData, codingQuestions: parseInt(e.target.value) || 0 })}
                      min="1"
                      max="20"
                      required
                    />
                  </div>
                )}

                {formData.type === 'MCQS_CODING' && (
                  <div className="form-group">
                    <label>Total Questions</label>
                    <div className="total-questions-display">
                      <span className="total-count">
                        {(formData.mcqQuestions || 0) + (formData.codingQuestions || 0)}
                      </span>
                      <p className="form-hint">
                        {formData.mcqQuestions || 0} MCQ + {formData.codingQuestions || 0} Coding = {(formData.mcqQuestions || 0) + (formData.codingQuestions || 0)} Total
                      </p>
                    </div>
                  </div>
                )}
              </div>


              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this round will cover..."
                  rows="3"
                  required
                />
              </div>

              {/* New: Auto-shortlist for Next Round Checkbox */}


              {/* New: Number of Candidates to Auto-shortlist Input */}
              <div className="form-group">
                <label htmlFor="numAutoShortlistCandidates">Number of Candidates to Auto-shortlist</label>
                <input
                  type="number"
                  id="numAutoShortlistCandidates"
                  value={formData.numAutoShortlistCandidates}
                  onChange={(e) => setFormData({ ...formData, numAutoShortlistCandidates: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="1000" // You can adjust max as needed
                  required
                />
                <p className="form-hint">The top X candidates passing this round will be automatically shortlisted for the next available round. Set to 0 to disable.</p>
              </div>

              {/* Existing Rounds Timeline */}
              {rounds.length > 0 && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Existing Rounds Schedule</label>
                  <div className="rounds-timeline">
                    {rounds.map((round, index) => (
                      <div key={round._id} className="timeline-round">
                        <strong>Round {index + 1}: {round.title}</strong>
                        <span>
                          {new Date(round.startTime).toLocaleString('en-GB')} 
                          ({round.duration} min)
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="form-hint">
                    ⚠️ New rounds must have at least 30 minutes gap from existing rounds
                  </p>
                </div>
              )}

              
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingRound ? 'Update Round' : 'Create Round'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generation Method Selection Modal */}
      {showGenerationMethodModal && (
        <div className="modal-overlay" onClick={closeGenerationMethodModal}>
          <div className="modal-content generation-method-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Choose Generation Method - {selectedRound?.title}</h2>
              <button className="close-btn" onClick={closeGenerationMethodModal}>×</button>
            </div>
            
            <div className="generation-method-selector">
              <h3>How would you like to create questions?</h3>
              <div className="method-buttons">
                <button 
                  className="method-btn manual-btn"
                  onClick={() => handleGenerationMethodSelect('manual')}
                >
                  <div className="method-icon">✍️</div>
                  <div className="method-content">
                    <h4>Manual Creation</h4>
                    <p>Create questions manually with full control over content and options</p>
                  </div>
                </button>
                
                <button 
                  className="method-btn ai-btn"
                  onClick={() => handleGenerationMethodSelect('ai')}
                >
                  <div className="method-icon">🤖</div>
                  <div className="method-content">
                    <h4>AI Generation</h4>
                    <p>Generate questions automatically using AI based on topics and difficulty</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Questions Modal */}
      {showQuestionsModal && (
        <div className="modal-overlay" onClick={closeQuestionsModal}>
          <div className="modal-content questions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Questions - {selectedRound?.title}</h2>
              <button className="close-btn" onClick={closeQuestionsModal}>×</button>
            </div>
            
            <div className="question-type-selector">
              <h3>Choose Question Type:</h3>
              <div className="type-buttons">
                {/* Show MCQ option for MCQ and Mixed rounds */}
                {(selectedRound?.type === 'MCQS' || selectedRound?.type === 'MCQS_CODING' || selectedRound?.type === 'MIXED') && (
                  <button 
                    className={`type-btn ${questionType === 'mcq' ? 'active' : ''}`}
                    onClick={() => setQuestionType('mcq')}
                  >
                    ❓ MCQ Questions
                  </button>
                )}
                
                {/* Show Coding option for Coding and Mixed rounds */}
                {(selectedRound?.type === 'CODING' || selectedRound?.type === 'MCQS_CODING' || selectedRound?.type === 'MIXED') && (
                  <button 
                    className={`type-btn ${questionType === 'coding' ? 'active' : ''}`}
                    onClick={() => {
                      setQuestionType('coding');
                      if (selectedRound) {
                        fetchCodingProblems(selectedRound.id || selectedRound._id);
                      }
                    }}
                  >
                    💻 Coding Problems
                  </button>
                )}
              </div>
            </div>

            {questionType === 'mcq' && generationMethod === 'manual' && (
              <div className="manual-question-form">
                <h4>Add MCQ Question</h4>
                <form className="question-form">
                  <div className="form-group">
                    <label>Question</label>
                    <textarea
                      value={currentQuestion.question}
                      onChange={(e) => setCurrentQuestion({...currentQuestion, question: e.target.value})}
                      placeholder="Enter your question here..."
                      rows="3"
                      required
                    />
                  </div>

                  <div className="options-section">
                    <label>Options</label>
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className="option-row">
                        <div className="option-input">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...currentQuestion.options];
                              newOptions[index] = e.target.value;
                              setCurrentQuestion({...currentQuestion, options: newOptions});
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            required
                          />
                        </div>
                        <div className="correct-option">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={currentQuestion.correctAnswer === index}
                            onChange={() => setCurrentQuestion({...currentQuestion, correctAnswer: index})}
                          />
                          <label>Correct</label>
                        </div>
                      </div>
                    ))}
                  </div>


                  <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={resetQuestionForm}>
                      Clear
                    </button>
                    <button 
                      type="button" 
                      className="save-btn" 
                      onClick={() => {
                        if (existingQuestions.length >= (selectedRound?.mcqQuestions || 10)) {
                          showError(`You have already added ${existingQuestions.length} MCQ question(s). The limit for this round is ${selectedRound?.mcqQuestions || 10}.`);
                          return;
                        }
                        handleSaveQuestion();
                      }}
                      disabled={existingQuestions.length >= (selectedRound?.mcqQuestions || 10)}
                    >
                      Add Question
                    </button>
                  </div>
                  {existingQuestions.length >= (selectedRound?.mcqQuestions || 10) && (
                    <p className="limit-reached-msg">⚠️ MCQ question limit reached for this round.</p>
                  )}
                </form>
              </div>
            )}

            {questionType === 'mcq' && generationMethod === 'ai' && (
              <div className="ai-generation-form">
                <h4>🤖 AI Question Generation</h4>
                
                {generatedQuestions.length === 0 ? (
                  <div className="ai-params-form">
                    <div className="form-group">
                      <label>Number of Questions</label>
                      <input
                        type="number"
                        min="1"
                        max={selectedRound?.mcqQuestions || 50}
                        value={aiGenerationParams.numQuestions}
                        onChange={(e) => setAiGenerationParams({
                          ...aiGenerationParams,
                          numQuestions: parseInt(e.target.value) || 1
                        })}
                        className="form-input"
                      />
                      <small>Max: {selectedRound?.mcqQuestions || 50} questions</small>
                    </div>

                    <div className="form-group">
                      <label>Tech Concepts/Topics</label>
                      <TagInput
                        tags={aiGenerationParams.techConcepts}
                        setTags={(tags) => setAiGenerationParams({
                          ...aiGenerationParams,
                          techConcepts: tags
                        })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Difficulty Level</label>
                      <select
                        value={aiGenerationParams.difficulty}
                        onChange={(e) => setAiGenerationParams({
                          ...aiGenerationParams,
                          difficulty: e.target.value
                        })}
                        className="form-select"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div className="ai-actions">
                      <button
                        type="button"
                        onClick={() => {
                          if (existingQuestions.length >= (selectedRound?.mcqQuestions || 10)) {
                            showError(`You have already added ${existingQuestions.length} MCQ question(s). The limit for this round is ${selectedRound?.mcqQuestions || 10}.`);
                            return;
                          }
                          handleAiGeneration();
                        }}
                        disabled={isGenerating || aiGenerationParams.techConcepts.length === 0 || existingQuestions.length >= (selectedRound?.mcqQuestions || 10)}
                        className="generate-btn"
                      >
                        {isGenerating ? (
                          <>
                            <div className="spinner"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            🤖 Generate Questions
                          </>
                        )}
                      </button>
                    </div>
                    {existingQuestions.length >= (selectedRound?.mcqQuestions || 10) && (
                      <p className="limit-reached-msg">⚠️ MCQ question limit reached for this round.</p>
                    )}
                  </div>
                ) : (
                  <div className="generated-questions-preview">
                    <div className="preview-header">
                      <h5>Generated Questions ({generatedQuestions.length})</h5>
                      <div className="preview-actions">
                        <button
                          type="button"
                          onClick={handleRegenerateQuestions}
                          className="regenerate-btn"
                          disabled={isGenerating}
                        >
                          🔄 Regenerate
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmAiQuestions}
                          className="confirm-btn"
                        >
                          ✅ Confirm & Add to Round
                        </button>
                      </div>
                    </div>

                    <div className="questions-preview-list">
                      {generatedQuestions.map((question, index) => (
                        <div key={question.id} className="question-preview-card">
                          <div className="question-header">
                            <span className="question-number">Q{index + 1}</span>
                            <span className="question-difficulty">{question.difficulty}</span>
                            <span className="question-concept">{question.concept}</span>
                          </div>
                          <div className="question-text">{question.question}</div>
                          <div className="question-options">
                            {question.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className={`option ${optIndex === question.correctAnswer ? 'correct' : ''}`}
                              >
                                <span className="option-label">{String.fromCharCode(65 + optIndex)}.</span>
                                <span className="option-text">{option}</span>
                                {optIndex === question.correctAnswer && <span className="correct-indicator">✓</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {questionType === 'coding' && generationMethod === 'manual' && (
              <div className="coding-question-form">
                <h4>Manual Coding Problem Creation</h4>
                <div className="coding-form-content">
                  <p>Create coding problems manually using the dedicated problem creator with full control over problem statement, test cases, and constraints.</p>
                  <div className="coding-actions">
                    <button 
                      className="create-coding-btn"
                      onClick={() => {
                        if (codingProblems.length >= (selectedRound?.codingQuestions || 1)) {
                          showError(`You have already added ${codingProblems.length} coding problem(s). The limit for this round is ${selectedRound?.codingQuestions || 1}.`);
                          return;
                        }
                        handleShowCodingCreator();
                        setShowQuestionsModal(false);
                        // Do not call closeQuestionsModal() here because it sets selectedRound to null
                      }}
                      disabled={codingProblems.length >= (selectedRound?.codingQuestions || 1)}
                    >
                      💻 Create Coding Problem Manually
                    </button>
                    {codingProblems.length >= (selectedRound?.codingQuestions || 1) && (
                      <p className="limit-reached-msg">⚠️ Question limit reached for this round.</p>
                    )}
                  </div>
                  <div className="coding-info">
                    <h5>Current Coding Problems:</h5>
                    {codingProblems.length > 0 ? (
                      <div className="problems-list">
                        {codingProblems.map((problem) => (
                          <div key={problem.id} className="problem-item">
                            <span className="problem-title">{problem.title}</span>
                            <span className={`difficulty-badge ${problem.difficulty?.toLowerCase()}`}>
                              {problem.difficulty}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-problems">No coding problems created yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {questionType === 'coding' && generationMethod === 'ai' && (
              <div className="ai-coding-generation-form">
                <h4>🤖 AI Coding Problem Generation</h4>
                
                {generatedCodingProblems.length === 0 ? (
                  <div className="ai-coding-params-form">
                    <div className="form-group">
                      <label>Number of Problems</label>
                      <input
                        type="number"
                        min="1"
                        max={selectedRound?.codingQuestions || 10}
                        value={aiCodingParams.numProblems}
                        onChange={(e) => setAiCodingParams({
                          ...aiCodingParams,
                          numProblems: parseInt(e.target.value) || 1
                        })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Programming Topics</label>
                      <TagInput 
                        tags={aiCodingParams.topics}
                        setTags={(newTags) => setAiCodingParams({
                          ...aiCodingParams,
                          topics: newTags
                        })}
                        placeholder="Add topics like Arrays, Dynamic Programming, Trees..."
                      />
                      <small className="form-hint">Add programming concepts and data structures</small>
                    </div>

                    <div className="form-group">
                      <label>Difficulty Level</label>
                      <select
                        value={aiCodingParams.difficulty}
                        onChange={(e) => setAiCodingParams({
                          ...aiCodingParams,
                          difficulty: e.target.value
                        })}
                        className="form-select"
                      >
                        <option value="easy">Easy - Basic programming concepts</option>
                        <option value="medium">Medium - Intermediate algorithms</option>
                        <option value="hard">Hard - Advanced problem solving</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Problem Type</label>
                      <select
                        value={aiCodingParams.problemType}
                        onChange={(e) => setAiCodingParams({
                          ...aiCodingParams,
                          problemType: e.target.value
                        })}
                        className="form-select"
                      >
                        <option value="algorithm">Algorithm Implementation</option>
                        <option value="data-structure">Data Structure Problems</option>
                        <option value="optimization">Optimization Problems</option>
                        <option value="string">String Manipulation</option>
                        <option value="math">Mathematical Problems</option>
                      </select>
                    </div>

                    <div className="ai-generation-actions">
                      <button
                        type="button"
                        onClick={() => {
                          if (codingProblems.length >= (selectedRound?.codingQuestions || 1)) {
                            showError(`You have already added ${codingProblems.length} coding problem(s). The limit for this round is ${selectedRound?.codingQuestions || 1}.`);
                            return;
                          }
                          handleAiCodingGeneration();
                        }}
                        className="generate-coding-btn"
                        disabled={isGeneratingCoding || aiCodingParams.topics.length === 0 || codingProblems.length >= (selectedRound?.codingQuestions || 1)}
                      >
                        {isGeneratingCoding ? (
                          <>
                            <div className="spinner"></div>
                            Generating Problems...
                          </>
                        ) : (
                          <>
                            🤖 Generate Coding Problems
                          </>
                        )}
                      </button>
                    </div>
                    {codingProblems.length >= (selectedRound?.codingQuestions || 1) && (
                      <p className="limit-reached-msg">⚠️ Question limit reached for this round.</p>
                    )}
                  </div>
                ) : (
                  <div className="generated-coding-problems-preview">
                    <div className="preview-header">
                      <h5>Generated Coding Problems ({generatedCodingProblems.length})</h5>
                      <div className="preview-actions">
                        <button
                          type="button"
                          onClick={handleRegenerateCodingProblems}
                          className="regenerate-btn"
                          disabled={isGeneratingCoding}
                        >
                          🔄 Regenerate
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmAiCodingProblems}
                          className="confirm-btn"
                        >
                          ✅ Confirm & Add to Round
                        </button>
                      </div>
                    </div>

                    <div className="coding-problems-preview-list">
                      {generatedCodingProblems.map((problem, index) => (
                        <div key={problem.id} className="coding-problem-preview-card">
                          <div className="problem-header">
                            <span className="problem-number">Problem {index + 1}</span>
                            <span className={`difficulty-badge ${problem.difficulty?.toLowerCase()}`}>
                              {problem.difficulty}
                            </span>
                          </div>
                          <h6 className="problem-title">{problem.title}</h6>
                          <p className="problem-statement-preview">
                            {problem.problemStatement.substring(0, 150)}...
                          </p>
                          <div className="problem-meta">
                            <span className="time-limit">⏱️ {problem.timeLimit}ms</span>
                            <span className="memory-limit">💾 {problem.memoryLimit}MB</span>
                            <span className="test-cases">🧪 {problem.testCases?.length || 0} test cases</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Questions Modal */}
      {showViewQuestionsModal && (
        <div className="modal-overlay" onClick={closeViewQuestionsModal}>
          <div className="modal-content view-questions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <button className="back-btn" onClick={closeViewQuestionsModal} title="Go Back">
                  <FiArrowLeft />
                </button>
                <h2>Questions - {selectedRound?.title}</h2>
              </div>
              <button className="close-btn" onClick={closeViewQuestionsModal}>×</button>
            </div>
            
            <div className="questions-list">
              {selectedRound?.type === 'MCQS_CODING' ? (
                // Display both MCQ questions and coding problems for mixed rounds
                <div className="mixed-questions-display">
                  {/* MCQ Questions Section */}
                  <div className="questions-section">
                    <h3>📝 MCQ Questions ({existingQuestions.length})</h3>
                    {existingQuestions.length > 0 ? (
                      existingQuestions.map((question, index) => (
                        <div key={question.id} className="question-card">
                          <div className="question-header">
                            <h4>Question {index + 1}</h4>
                            <div className="question-actions">
                              <button className="edit-question-btn">
                                <FiEdit2 /> Edit
                              </button>
                              <button className="delete-question-btn">
                                <FiTrash2 /> Delete
                              </button>
                            </div>
                          </div>
                          
                          <div className="question-content">
                            <p className="question-text">{question.question}</p>
                            
                            <div className="options-display">
                              {question.options.map((option, optionIndex) => (
                                <div 
                                  key={optionIndex} 
                                  className={`option-display ${optionIndex === question.correctAnswer ? 'correct' : ''}`}
                                >
                                  <span className="option-label">{String.fromCharCode(65 + optionIndex)}.</span>
                                  <span className="option-text">{option}</span>
                                  {optionIndex === question.correctAnswer && (
                                    <span className="correct-indicator">✓ Correct</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-questions-small">
                        <p>No MCQ questions added yet</p>
                      </div>
                    )}
                  </div>

                  {/* Coding Problems Section */}
                  <div className="questions-section">
                    <h3>💻 Coding Problems ({codingProblems.length})</h3>
                    {codingProblems.length > 0 ? (
                      codingProblems.map((problem) => (
                        <div key={problem.id} className="coding-problem-card">
                          <div className="problem-header">
                            <h4>{problem.title}</h4>
                            <div className="problem-actions">
                              <div className="problem-meta">
                                <span className={`difficulty-badge ${problem.difficulty?.toLowerCase()}`}>
                                  {problem.difficulty}
                                </span>
                              </div>
                              <div className="problem-buttons">
                                <button 
                                  className="edit-problem-btn"
                                  onClick={() => handleEditCodingProblem(problem)}
                                  title="Edit Problem"
                                >
                                  <FiEdit2 />
                                </button>
                                <button 
                                  className="delete-problem-btn"
                                  onClick={() => handleDeleteCodingProblem(problem.id)}
                                  title="Delete Problem"
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="problem-content">
                            <p className="problem-statement">{problem.problemStatement.substring(0, 200)}...</p>
                            
                            <div className="problem-stats">
                              <span>Test Cases: {problem.totalTestCases || 0}</span>
                              <span>Sample: {problem.sampleTestCasesCount || 0}</span>
                              <span>Languages: {problem.allowedLanguages}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-questions-small">
                        <p>No coding problems added yet</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedRound?.type === 'CODING' ? (
                // Display coding problems
                codingProblems.length > 0 ? (
                  codingProblems.map((problem) => (
                    <div key={problem.id} className="coding-problem-card">
                      <div className="problem-header">
                        <h4>{problem.title}</h4>
                        <div className="problem-actions">
                          <div className="problem-meta">
                            <span className={`difficulty-badge ${problem.difficulty?.toLowerCase()}`}>
                              {problem.difficulty}
                            </span>
                          </div>
                          <div className="problem-buttons">
                            <button 
                              className="edit-problem-btn"
                              onClick={() => handleEditCodingProblem(problem)}
                              title="Edit Problem"
                            >
                              <FiEdit2 />
                            </button>
                            <button 
                              className="delete-problem-btn"
                              onClick={() => handleDeleteCodingProblem(problem.id)}
                              title="Delete Problem"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="problem-content">
                        <p className="problem-statement">{problem.problemStatement.substring(0, 200)}...</p>
                        
                        <div className="problem-stats">
                          <span>Test Cases: {problem.totalTestCases || 0}</span>
                          <span>Sample: {problem.sampleTestCasesCount || 0}</span>
                          <span>Languages: {problem.allowedLanguages}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-questions">
                    <FiFileText size={48} />
                    <h3>No coding problems added yet</h3>
                    <p>Click "Add Questions" to create coding problems for this round</p>
                    <button 
                      className="add-first-question-btn"
                      onClick={() => {
                        closeViewQuestionsModal();
                        handleAddQuestions(selectedRound);
                      }}
                    >
                      <FiPlus /> Add First Coding Problem
                    </button>
                  </div>
                )
              ) : (
                existingQuestions.length > 0 ? (
                  existingQuestions.map((question, index) => (
                    <div key={question.id} className="question-card">
                      <div className="question-header">
                        <h4>Question {index + 1}</h4>
                        <div className="question-actions">
                          <button className="edit-question-btn">
                            <FiEdit2 /> Edit
                          </button>
                          <button className="delete-question-btn">
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      </div>
                      
                      <div className="question-content">
                        <p className="question-text">{question.question}</p>
                        
                        <div className="options-display">
                          {question.options.map((option, optionIndex) => (
                            <div 
                              key={optionIndex} 
                              className={`option-display ${optionIndex === question.correctAnswer ? 'correct' : ''}`}
                            >
                              <span className="option-label">{String.fromCharCode(65 + optionIndex)}.</span>
                              <span className="option-text">{option}</span>
                              {optionIndex === question.correctAnswer && (
                                <span className="correct-indicator">✓ Correct</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-questions">
                    <FiFileText size={48} />
                    <h3>No questions added yet</h3>
                    <p>Click "Add Questions" to create questions for this round</p>
                    <button 
                      className="add-first-question-btn"
                      onClick={() => {
                        closeViewQuestionsModal();
                        handleAddQuestions(selectedRound);
                      }}
                    >
                      <FiPlus /> Add First Question
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Results Modal */}
      {showResultsModal && (
        <div className="modal-overlay" onClick={closeResultsModal}>
          <div className="modal-content view-results-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <button className="back-btn" onClick={closeResultsModal} title="Go Back">
                  <FiArrowLeft />
                </button>
                <h2>Exam Results - {selectedRound?.title}</h2>
              </div>
              <button className="close-btn" onClick={closeResultsModal}>×</button>
            </div>
            {/* Statistics Section */}
            {examStats && (
              <div className="exam-stats-section">
                <h3>Statistics Overview</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">
                      <FiUsers />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{examStats.totalCandidates}</span>
                      <span className="stat-label">Total Candidates</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">
                      <FiTrendingUp />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{examStats.averageScore?.toFixed(1)}%</span>
                      <span className="stat-label">Average Score</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">
                      <FiAward />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{examStats.highestScore?.toFixed(1)}%</span>
                      <span className="stat-label">Highest Score</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">
                      <FiTarget />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{examStats.passedCandidates}</span>
                      <span className="stat-label">Passed</span>
                    </div>
                  </div>
                </div>
              </div>
            
            )}
            {/* Results List */}
            <div className="results-section">
              <h3>Candidate Results</h3>
              {examResults.length > 0 ? (
                <div className="results-table-wrapper">
                  <div className="results-table">
                    {selectedRound?.type === 'CODING' ? (
                      <>
                        <div className="table-header">
                          <span>Candidate</span>
                          <span>Total Score</span>
                          <span>Problem Scores</span>
                          <span>Language</span>
                          <span>Time Taken</span>
                          <span>Status</span>
                          <span>Shortlisted</span>
                        </div>
                        {examResults.map((result) => (
                          <div key={result.id} className="table-row">
                            <div className="candidate-info">
                              <span className="candidate-name">{result.candidateName}</span>
                              <span className="candidate-email">{result.candidateEmail}</span>
                            </div>
                            <div className={`score ${result.totalScore >= 50 ? 'pass' : 'fail'}`}>{result.totalScore}%</div>
                            <div className="problem-scores">
                              {Object.entries(result.problemScores || {}).map(([problemId, scores]) => (
                                <div key={problemId} className="problem-score">P{problemId}: {scores.score}% ({scores.passedTests}/{scores.totalTests})</div>
                              ))}
                            </div>
                            <div className="language">{result.language?.toUpperCase()}</div>
                            <div className="time-taken">{result.timeSpent ? Math.floor(result.timeSpent / 60) + ':' + (result.timeSpent % 60).toString().padStart(2, '0') : '0:00'}</div>
                            <div className={`status ${result.status?.toLowerCase()}`}>{result.status}</div>
                            <div className="shortlist-status">{result.shortlisted ? <span style={{color:'green'}}>Shortlisted</span> : <span style={{color:'gray'}}>--</span>}</div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <div className="table-header">
                          <span>Candidate</span>
                          <span>Score</span>
                          <span>Correct</span>
                          <span>Wrong</span>
                          <span>Time Taken</span>
                          <span>Status</span>
                          <span>Shortlisted</span>
                        </div>
                        {examResults.map((result) => (
                          <div key={result.id} className="table-row">
                            <div className="candidate-info">
                              <span className="candidate-name">{result.candidateName}</span>
                              <span className="candidate-email">{result.candidateEmail}</span>
                            </div>
                            <div className={`score ${(result.score || result.scorePercentage) >= 50 ? 'pass' : 'fail'}`}>{(result.score || result.scorePercentage)?.toFixed ? (result.score || result.scorePercentage).toFixed(1) : (result.score || result.scorePercentage)}%</div>
                            <>
                              <div className="correct-answers">{result.correctAnswers}/{result.totalQuestions}</div>
                              <div className="wrong-answers">{result.totalQuestions - result.correctAnswers}</div>
                              <div className="time-taken">{(result.timeSpent || result.timeTaken) ? Math.floor((result.timeSpent || result.timeTaken) / 60) + ':' + ((result.timeSpent || result.timeTaken) % 60).toString().padStart(2, '0') : '0:00'}</div>
                              <div className={`status ${result.status?.toLowerCase()}`}>{result.status}</div>
                              <div className="shortlist-status">{result.shortlisted ? <span style={{color:'green'}}>Shortlisted</span> : <span style={{color:'gray'}}>--</span>}</div>
                            </>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="no-results">
                  <FiFileText size={48} />
                  <p>No exam results found for this round.</p>
                  <p>Results will appear here once candidates complete the exam.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shortlist Modal */}
      {showShortlistModal && (
        <div className="modal-overlay" onClick={closeShortlistModal}>
          <div className="modal-content shortlist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <button className="back-btn" onClick={closeShortlistModal} title="Go Back">
                  <FiArrowLeft />
                </button>
                <h2>Shortlisted Candidates - {selectedRound?.title}</h2>
              </div>
              <button className="close-btn" onClick={closeShortlistModal}>×</button>
            </div>

            <div className="shortlist-summary">
              <div className="summary-item">
                <span className="summary-label">Round Order</span>
                <span className="summary-value">{selectedRound?.roundOrder || '--'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Participants</span>
                <span className="summary-value">{shortlistData.totalCandidates}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Shortlist Limit</span>
                <span className="summary-value">{shortlistData.shortlistLimit || 'Not set'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Shortlisted</span>
                <span className="summary-value">{shortlistData.shortlistedCount}</span>
              </div>
            </div>

            <p className="shortlist-note">
              {shortlistData.isFirstRound
                ? 'Only candidates meeting the pass mark for this round are shortlisted. Adjust the auto-shortlist limit or threshold in the round settings as needed.'
                : `Showing the top ${shortlistData.shortlistedCount} candidates based on score. Adjust the "Number of Candidates to Auto-shortlist" setting in the round to change this.`}
            </p>

            {shortlistData.candidates.length > 0 ? (
              <div className="shortlist-table-wrapper">
                <table className="shortlist-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Candidate</th>
                      <th>Email</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Shortlisted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shortlistData.candidates.map((candidate, index) => (
                      <tr key={candidate.id || `${candidate.candidateEmail}-${index}`} className={candidate.shortlisted ? 'shortlisted-row' : ''}>
                        <td>{candidate.rank || index + 1}</td>
                        <td>{candidate.candidateName || candidate.name || 'Unknown'}</td>
                        <td>{candidate.candidateEmail || candidate.email}</td>
                        <td>{(candidate.displayScore ?? candidate.scorePercentage ?? candidate.score ?? candidate.totalScore ?? 0).toFixed(2)}%</td>
                        <td>{candidate.status || 'Completed'}</td>
                        <td>
                          {candidate.shortlisted ? (
                            <span className="shortlisted-badge">Shortlisted</span>
                          ) : (
                            <span className="not-shortlisted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-shortlist-results">
                <FiFileText size={48} />
                <p>No candidates found for this round yet.</p>
                <p>Once candidates complete the round, the shortlist will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coding Problem Creator Modal */}
      {showCodingCreator && selectedRound && (
        <div className="modal-overlay" onClick={handleCloseCodingCreator}>
          <div className="modal-content coding-creator-modal" onClick={(e) => e.stopPropagation()}>
            <CodingProblemCreator
              roundId={selectedRound.id || selectedRound._id}
              onProblemCreated={handleCodingProblemCreated}
              onProblemUpdated={handleCodingProblemUpdated}
              initialProblem={editingCodingProblem}
              onClose={handleCloseCodingCreator}
            />
          </div>
        </div>
      )}

      {/* Interview Round Modal */}
      {showInterviewModal && (
        <div className="modal-overlay" onClick={closeInterviewModal}>
          <div className="modal-content interview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiVideo /> Create Interview Round</h2>
              <button className="close-btn" onClick={closeInterviewModal}>×</button>
            </div>
            
            <form onSubmit={handleInterviewSubmit} className="interview-form">
              {/* Round Details */}
              <div className="form-section">
                <h3>Interview Details</h3>
                
                <div className="form-group">
                  <label>Round Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={interviewFormData.title}
                    onChange={handleInterviewFormChange}
                    placeholder="e.g., Technical Interview - React Developer"
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Round Type *</label>
                  <select
                    name="roundType"
                    value={interviewFormData.roundType}
                    onChange={handleInterviewFormChange}
                    required
                    className="form-select"
                  >
                    <option value="TECHNICAL_INTERVIEW">Technical Interview</option>
                    <option value="HR_INTERVIEW">HR Interview</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={interviewFormData.description}
                    onChange={handleInterviewFormChange}
                    placeholder="Brief description of the interview round..."
                    rows={3}
                    className="form-textarea"
                  />
                </div>
              </div>

              {/* Scheduling */}
              <div className="form-section">
                <h3>Scheduling</h3>
                
                <div className="form-group">
                  <label>Date & Time *</label>
                  <input
                    type="datetime-local"
                    name="scheduledDateTime"
                    value={interviewFormData.scheduledDateTime}
                    onChange={handleInterviewFormChange}
                    min={new Date().toISOString().slice(0, 16)}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              {/* Video Call Settings */}
              <div className="form-section">
                <h3>Video Call Settings</h3>
                
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="createVideoRoom"
                      checked={interviewFormData.createVideoRoom}
                      onChange={handleInterviewFormChange}
                    />
                    Create video call room automatically
                  </label>
                </div>

                {interviewFormData.createVideoRoom && (
                  <div className="form-group">
                    <label>Custom Room Password (optional)</label>
                    <input
                      type="text"
                      name="customRoomPassword"
                      value={interviewFormData.customRoomPassword}
                      onChange={handleInterviewFormChange}
                      placeholder="Leave empty for auto-generated password"
                      className="form-input"
                    />
                  </div>
                )}
              </div>

              {/* Candidate Selection */}
              <div className="form-section">
                <h3>Select Candidates ({shortlistedCandidates.length} available)</h3>
                
                {shortlistedCandidates.length > 0 ? (
                  <>
                    <div className="candidate-actions">
                      <button
                        type="button"
                        onClick={selectAllCandidates}
                        className="btn-outline"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllCandidates}
                        className="btn-outline"
                      >
                        Deselect All
                      </button>
                      <span className="selected-count">
                        {interviewFormData.candidateEmails.length} selected
                      </span>
                    </div>

                    <div className="candidates-list">
                      {shortlistedCandidates.map((candidate) => (
                        <div 
                          className={`candidate-item ${interviewFormData.candidateEmails.includes(candidate.email) ? 'selected' : ''}`}
                          key={candidate.email}
                          onClick={() => handleCandidateSelect(candidate.email)}
                        >
                          <label className="candidate-checkbox">
                            <input
                              type="checkbox"
                              checked={interviewFormData.candidateEmails.includes(candidate.email)}
                              onChange={() => {}}
                              className="mr-3"
                            />
                            <div className="candidate-info">
                              <div className="candidate-name">
                                {candidate.name || 'Anonymous Candidate'}
                                {candidate.phone && (
                                  <span className="candidate-phone">
                                    📞 {candidate.phone}
                                  </span>
                                )}
                              </div>
                              <div className="candidate-email">
                                {candidate.email || 'No email provided'}
                              </div>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="no-candidates">
                    <div className="icon">
                      <FiUsers size={48} />
                    </div>
                    <p>No candidates found for this job</p>
                    <p className="hint">
                      Make sure candidates have applied and been shortlisted for this position.
                    </p>
                    <button 
                      onClick={fetchShortlistedCandidates}
                      className="refresh-btn"
                    >
                      <FiRefreshCw className="mr-2" /> Refresh List
                    </button>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={closeInterviewModal}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || interviewFormData.candidateEmails.length === 0}
                  className="save-btn"
                >
                  {loading ? 'Creating...' : 'Create Interview Round'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate modal removed - using the main interview modal with handleInterviewSubmit */}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content feedback-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Interview Feedback</h2>
              <button className="close-btn" onClick={() => setShowFeedbackModal(false)}>×</button>
            </div>
            
            <div className="feedback-modal-content">
              {/* Single Comprehensive Feedback Table */}
              <div className="feedback-table-container">
                <table className="feedback-comprehensive-table">
                  <thead>
                    <tr>
                      <th>Candidate Name</th>
                      <th>Interview Date</th>
                      <th>Room Code</th>
                      <th>Communication</th>
                      <th>Confidence</th>
                      <th>Technical Skills</th>
                      <th>Soft Skills</th>
                      <th>Problem-Solving</th>
                      <th>Analytics</th>
                      <th>Overall Comments</th>
                      <th>Overall Score</th>
                      <th>Selection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackList.length > 0 ? feedbackList.map((feedback, index) => (
                      <tr key={feedback.id || index}>
                        <td className="candidate-name-cell">{feedback.candidateName}</td>
                        <td className="date-cell">{feedback.interviewDate}</td>
                        <td className="room-code-cell">{feedback.roomCode}</td>
                        <td className="skill-score-cell">{feedback.communication}/10</td>
                        <td className="skill-score-cell">{feedback.confidence}/10</td>
                        <td className="skill-score-cell">{feedback.technical}/10</td>
                        <td className="skill-score-cell">{feedback.softSkills}/10</td>
                        <td className="skill-score-cell">{feedback.problemSolving}/10</td>
                        <td className="skill-score-cell">{feedback.analytics}/10</td>
                        <td className="comments-cell">
                          {feedback.overallComments || 'No comments provided'}
                        </td>
                        <td className="overall-score-cell">
                          <span className="score-highlight">
                            {((feedback.communication + feedback.confidence + 
                               feedback.technical + feedback.softSkills + 
                               feedback.problemSolving + feedback.analytics) / 6).toFixed(1)}/10
                          </span>
                        </td>
                        <td className="selection-cell">
                          <div className="selection-buttons">
                            {feedback.selectionStatus === 'selected' ? (
                              <span className="status-badge selected-badge">✓ Selected</span>
                            ) : feedback.selectionStatus === 'rejected' ? (
                              <span className="status-badge rejected-badge">✗ Rejected</span>
                            ) : (
                              <>
                                <button 
                                  className="selection-btn selected-btn"
                                  onClick={() => handleFeedbackCandidateSelection(feedback.roomCode, 'selected', feedback)}
                                  title="Select Candidate"
                                >
                                  Select
                                </button>
                                <button 
                                  className="selection-btn rejected-btn"
                                  onClick={() => handleFeedbackCandidateSelection(feedback.roomCode, 'rejected', feedback)}
                                  title="Reject Candidate"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : selectedFeedback ? (
                      <tr>
                        <td className="candidate-name-cell">{selectedFeedback.candidateName}</td>
                        <td className="date-cell">{selectedFeedback.interviewDate}</td>
                        <td className="room-code-cell">{selectedFeedback.roomCode}</td>
                        <td className="skill-score-cell">{selectedFeedback.communication}/10</td>
                        <td className="skill-score-cell">{selectedFeedback.confidence}/10</td>
                        <td className="skill-score-cell">{selectedFeedback.technical}/10</td>
                        <td className="skill-score-cell">{selectedFeedback.softSkills}/10</td>
                        <td className="skill-score-cell">{selectedFeedback.problemSolving}/10</td>
                        <td className="skill-score-cell">{selectedFeedback.analytics}/10</td>
                        <td className="comments-cell">
                          {selectedFeedback.overallComments || 'No comments provided'}
                        </td>
                        <td className="overall-score-cell">
                          <span className="score-highlight">
                            {((selectedFeedback.communication + selectedFeedback.confidence + 
                               selectedFeedback.technical + selectedFeedback.softSkills + 
                               selectedFeedback.problemSolving + selectedFeedback.analytics) / 6).toFixed(1)}/10
                          </span>
                        </td>
                        <td className="selection-cell">
                          <div className="selection-buttons">
                            {selectedFeedback.selectionStatus === 'selected' ? (
                              <span className="status-badge selected-badge">✓ Selected</span>
                            ) : selectedFeedback.selectionStatus === 'rejected' ? (
                              <span className="status-badge rejected-badge">✗ Rejected</span>
                            ) : (
                              <>
                                <button 
                                  className="selection-btn selected-btn"
                                  onClick={() => handleFeedbackCandidateSelection(selectedFeedback.roomCode, 'selected', selectedFeedback)}
                                  title="Select Candidate"
                                >
                                  Select
                                </button>
                                <button 
                                  className="selection-btn rejected-btn"
                                  onClick={() => handleFeedbackCandidateSelection(selectedFeedback.roomCode, 'rejected', selectedFeedback)}
                                  title="Reject Candidate"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan="12" className="no-feedback-cell">No feedback available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rounds;
