import React, { useRef, useState } from 'react';
import axios from 'axios';
import { 
  FiUploadCloud, 
  FiFile, 
  FiCheckCircle, 
  FiCpu, 
  FiClipboard, 
  FiKey, 
  FiSettings, 
  FiBriefcase, 
  FiAward, 
  FiBook, 
  FiEdit3, 
  FiPhone, 
  FiLink, 
  FiTrendingUp,
  FiCheckSquare,
  FiAlertTriangle,
  FiZap,
  FiTrash2,
  FiCalendar
} from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import './ResumeChecker.css';

const UNSUPPORTED_FILE_MESSAGE = 'Unsupported file format. Please upload PDF or TXT files only';

const isSupportedResumeFile = (uploadedFile) => {
  if (!uploadedFile || !uploadedFile.name) return false;
  const lowerName = uploadedFile.name.toLowerCase();
  return lowerName.endsWith('.pdf') || lowerName.endsWith('.txt');
};

// Role-based job descriptions
const ROLE_BASED_JOBS = {
  'Frontend Developer': `We are looking for a skilled Frontend Developer to join our team.

Key Responsibilities:
- Develop responsive web applications using React, Angular, or Vue.js
- Write clean, maintainable JavaScript/TypeScript code
- Collaborate with designers to implement UI/UX designs
- Optimize applications for maximum speed and scalability
- Ensure cross-browser compatibility

Required Skills:
- 2+ years experience with modern JavaScript frameworks
- Proficiency in HTML5, CSS3, and responsive design
- Experience with version control (Git)
- Knowledge of RESTful APIs and AJAX
- Understanding of web performance optimization

Preferred Skills:
- Experience with state management (Redux, Vuex)
- Knowledge of build tools (Webpack, Vite)
- Familiarity with testing frameworks (Jest, Cypress)
- Understanding of accessibility standards`,

  'Backend Developer': `We are seeking a talented Backend Developer to build robust server-side applications.

Key Responsibilities:
- Design and develop scalable backend systems and APIs
- Work with databases and optimize query performance
- Implement security best practices and authentication
- Deploy and maintain applications in cloud environments
- Collaborate with frontend teams for API integration

Required Skills:
- 3+ years experience with server-side technologies (Node.js, Python, Java)
- Strong knowledge of databases (SQL and NoSQL)
- Experience with RESTful API design and development
- Understanding of cloud platforms (AWS, Azure, GCP)
- Knowledge of version control and CI/CD pipelines

Preferred Skills:
- Experience with microservices architecture
- Knowledge of containerization (Docker, Kubernetes)
- Familiarity with message queues and caching
- Understanding of system design principles`,

  'Full Stack Developer': `We are looking for a versatile Full Stack Developer to work on end-to-end solutions.

Key Responsibilities:
- Develop both frontend and backend components
- Design and implement complete web applications
- Work with databases and server infrastructure
- Ensure seamless integration between frontend and backend
- Participate in system architecture decisions

Required Skills:
- 3+ years experience in full-stack development
- Proficiency in frontend technologies (React, Angular, Vue)
- Strong backend development skills (Node.js, Python, Java)
- Database design and management experience
- Understanding of web security and performance

Preferred Skills:
- Experience with cloud deployment and DevOps
- Knowledge of mobile development
- Familiarity with agile development methodologies
- Understanding of system design and architecture`,

  'Data Scientist': `We are seeking a Data Scientist to extract insights from complex datasets.

Key Responsibilities:
- Analyze large datasets to identify patterns and trends
- Build and deploy machine learning models
- Create data visualizations and reports
- Collaborate with stakeholders to define business requirements
- Implement data pipelines and automation

Required Skills:
- 2+ years experience in data science and analytics
- Proficiency in Python or R for data analysis
- Strong knowledge of statistics and machine learning
- Experience with data visualization tools
- Understanding of SQL and database systems

Preferred Skills:
- Experience with big data technologies (Spark, Hadoop)
- Knowledge of cloud ML platforms (AWS SageMaker, Azure ML)
- Familiarity with deep learning frameworks
- Understanding of A/B testing and experimentation`,

  'DevOps Engineer': `We are looking for a DevOps Engineer to streamline our development and deployment processes.

Key Responsibilities:
- Design and maintain CI/CD pipelines
- Manage cloud infrastructure and deployments
- Implement monitoring and logging solutions
- Automate repetitive tasks and processes
- Ensure system security and compliance

Required Skills:
- 3+ years experience in DevOps or system administration
- Strong knowledge of cloud platforms (AWS, Azure, GCP)
- Experience with containerization (Docker, Kubernetes)
- Proficiency in scripting languages (Bash, Python)
- Understanding of infrastructure as code

Preferred Skills:
- Experience with monitoring tools (Prometheus, Grafana)
- Knowledge of security best practices
- Familiarity with configuration management tools
- Understanding of network and system architecture`
};

export default function ResumeChecker() {
  const [file, setFile] = useState(null);
  const [jobDesc, setJobDesc] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [inputMode, setInputMode] = useState('description'); // 'description' or 'role'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const fileInputRef = useRef();

  // Function to get rating badge class based on rating value
  const getRatingClass = (rating) => {
    if (!rating) return 'rating-good';
    const lowerRating = rating.toLowerCase();
    if (lowerRating === 'excellent') return 'rating-excellent';
    if (lowerRating === 'poor') return 'rating-poor';
    return 'rating-good';
  };

  const handleFileChange = e => {
    const f = e.target.files[0];
    if (!f) return;

    if (!isSupportedResumeFile(f)) {
      setFile(null);
      setError(UNSUPPORTED_FILE_MESSAGE);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setError('');
    setFile(f);
  };

  const handleDrop = e => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];

      if (!isSupportedResumeFile(droppedFile)) {
        setFile(null);
        setError(UNSUPPORTED_FILE_MESSAGE);
        return;
      }

      setError('');
      setFile(droppedFile);
    }
  };

  const handleDragOver = e => e.preventDefault();

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setJobDesc(ROLE_BASED_JOBS[role]);
  };

  // Fetch analysis history
  const fetchHistory = async () => {
    console.log('fetchHistory called');
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      const response = await axios.get(`${API_BASE_URL}/candidate/resume-analysis-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('History response:', response.data);
      setHistory(response.data.history || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setError('Failed to load analysis history');
    }
    setHistoryLoading(false);
  };

  // Delete history item
  const deleteHistoryItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this analysis?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/candidate/resume-analysis-history/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Remove from local state
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete history item:', err);
      setError('Failed to delete analysis');
    }
  };

  // Toggle history view
  const handleViewHistory = () => {
    console.log('View History clicked. Current showHistory:', showHistory);
    setShowHistory(!showHistory);
    if (!showHistory && history.length === 0) {
      console.log('Fetching history...');
      fetchHistory();
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!file || !isSupportedResumeFile(file)) {
      setError(UNSUPPORTED_FILE_MESSAGE);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    
    const finalJobDesc = inputMode === 'role' ? ROLE_BASED_JOBS[selectedRole] : jobDesc;
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jobDescription', finalJobDesc);
      const res = await axios.post(`${API_BASE_URL}/candidate/analyze-resume`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data', 
          'Authorization': `Bearer ${token}` 
        }
      });
      setResult(res.data);
    } catch (err) {
      const backendError = (err.response?.data?.error || err.response?.data?.message || '').toLowerCase();
      const fileName = file?.name?.toLowerCase() || '';
      const unsupportedByName = fileName && !isSupportedResumeFile(file);
      const unsupportedByBackend =
        backendError.includes('unsupported') ||
        backendError.includes('invalid file') ||
        backendError.includes('file format') ||
        err.response?.status === 415;

      if (unsupportedByName || unsupportedByBackend) {
        setError(UNSUPPORTED_FILE_MESSAGE);
      } else {
        setError('Failed to check resume: ' + (err.response?.data?.error || err.message));
      }
    }
    setLoading(false);
  };

  return (
    <div className="resume-checker-container">
      <div className="resume-checker-content">
        <h1 className="resume-checker-title">AI Resume Checker</h1>
        <p className="resume-checker-subtitle">
          Get instant AI-powered feedback on your resume and improve your chances of landing your dream job
        </p>
        
        <form onSubmit={handleSubmit} encType="multipart/form-data" className="resume-form">
          {/* Side by Side Layout */}
          <div className="form-row-layout">
            {/* Left Side - Upload & Buttons */}
            <div className="ai-score-section">
              {/* Compact File Upload - Top */}
              <div className="compact-upload-section">
                <label className="upload-label">Upload Resume</label>
                <div
                  className={`compact-upload-zone ${file ? 'has-file' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current.click()}
                >
                  <div className="compact-upload-content">
                    {file ? (
                      <div className="file-selected-compact">
                        <FiFile className="file-icon-small" />
                        <span className="file-name-compact">{file.name}</span>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <FiUploadCloud size={20} />
                        <span>Choose file or drag here</span>
                      </div>
                    )}
                  </div>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                </div>
                <p className="upload-formats-small">PDF, TXT</p>
              </div>

              {/* Generate AI Score Button */}
              <button 
                type="submit" 
                className={`ai-score-button ${loading ? 'loading' : ''}`}
                disabled={loading || !file || (inputMode === 'description' ? !jobDesc : !selectedRole)}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FiCpu className="ai-icon" />
                    Generate AI Score
                  </>
                )}
              </button>

              {/* History Button */}
              <button 
                type="button" 
                className="history-button"
                onClick={handleViewHistory}
              >
                <FiClipboard className="history-icon" />
                {showHistory ? 'Hide History' : 'View History'}
              </button>
            </div>

            {/* Right Side - Job Description */}
            <div className="job-section">
              {/* Input Mode Toggle */}
              <div className="input-mode-section">
                <div className="input-mode-toggle">
                  <button
                    type="button"
                    className={`mode-btn ${inputMode === 'description' ? 'active' : ''}`}
                    onClick={() => setInputMode('description')}
                  >
                    Custom Job Description
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${inputMode === 'role' ? 'active' : ''}`}
                    onClick={() => setInputMode('role')}
                  >
                    Select Role
                  </button>
                </div>
              </div>

              {inputMode === 'description' ? (
                <div className="job-description-section">
                  <label className="job-desc-label">Job Description</label>
                  <textarea
                    className="job-desc-textarea"
                    placeholder="Paste or write the job description here..."
                    value={jobDesc}
                    onChange={e => setJobDesc(e.target.value)}
                    rows={8}
                    required
                  />
                </div>
              ) : (
                <div className="role-selection-section">
                  <label className="role-label">Select Job Role</label>
                  <div className="role-grid">
                    {Object.keys(ROLE_BASED_JOBS).map(role => (
                      <div
                        key={role}
                        className={`role-card ${selectedRole === role ? 'selected' : ''}`}
                        onClick={() => handleRoleChange(role)}
                      >
                        <div className="role-name">{role}</div>
                      </div>
                    ))}
                  </div>
                  {selectedRole && (
                    <div className="selected-role-preview">
                      <h4>Selected: {selectedRole}</h4>
                      <div className="role-description-preview">
                        {ROLE_BASED_JOBS[selectedRole].substring(0, 200)}...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>
        
        {error && (
          <div className="error-message">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {result && (
          <div className="results-container">
            <div className="results-header">
              <h3 className="results-title">AI Resume Analysis Results</h3>
            </div>
            
            {/* Overall Score Line */}
            <div className="overall-score-line">
              <div className="score-info">
                <span className="score-label">Overall Score:</span>
                <span className="score-value">{result.overallScore || result.score || 0}/100</span>
                <span className={`score-rating ${getRatingClass((result.overallScore || result.score || 0) >= 90 ? "Excellent" : (result.overallScore || result.score || 0) >= 75 ? "Good" : "Poor")}`}>
                  {(result.overallScore || result.score || 0) >= 90 ? "Excellent" :
                   (result.overallScore || result.score || 0) >= 75 ? "Good" : "Poor"}
                </span>
              </div>
              <div className="score-bar">
                <div 
                  className="score-fill" 
                  style={{width: `${result.overallScore || result.score || 0}%`}}
                ></div>
              </div>
            </div>

            {/* Analysis Table */}
            <div className="analysis-table-container">
              <table className="analysis-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Value</th>
                    <th>Percentage</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="category-cell">
                        <FiKey className="category-icon" />
                        <span className="category-name">Technical Keywords</span>
                      </div>
                    </td>
                    <td>{result.keywordMatch || 0} keywords matched</td>
                    <td>
                      <div className="percentage-cell">
                        <span className="percentage-value">{result.keywordMatch || 0}%</span>
                        <div className="mini-bar">
                          <div className="mini-fill" style={{width: `${result.keywordMatch || 0}%`}}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`table-rating ${getRatingClass((result.keywordMatch || 0) >= 80 ? "Excellent" : (result.keywordMatch || 0) >= 60 ? "Good" : "Poor")}`}>
                        {(result.keywordMatch || 0) >= 80 ? "Excellent" : (result.keywordMatch || 0) >= 60 ? "Good" : "Poor"}
                      </span>
                    </td>
                  </tr>
                  
                  <tr>
                    <td>
                      <div className="category-cell">
                        <FiSettings className="category-icon" />
                        <span className="category-name">ATS Compatibility</span>
                      </div>
                    </td>
                    <td>{result.atsCompatibilityDetails || "Format analysis"}</td>
                    <td>
                      <div className="percentage-cell">
                        <span className="percentage-value">
                          {result.atsCompatibility === "Excellent" ? "95%" : 
                           result.atsCompatibility === "Good" ? "80%" : "60%"}
                        </span>
                        <div className="mini-bar">
                          <div className="mini-fill" style={{
                            width: result.atsCompatibility === "Excellent" ? "95%" : 
                                   result.atsCompatibility === "Good" ? "80%" : "60%"
                          }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`table-rating ${getRatingClass(result.atsCompatibility)}`}>
                        {result.atsCompatibility || "Good"}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div className="category-cell">
                        <FiBriefcase className="category-icon" />
                        <span className="category-name">Experience & Projects</span>
                      </div>
                    </td>
                    <td>{result.experienceMatch || "Experience assessment"}</td>
                    <td>
                      <div className="percentage-cell">
                        <span className="percentage-value">
                          {result.experienceRating === "Excellent" ? "90%" : 
                           result.experienceRating === "Good" ? "75%" : "50%"}
                        </span>
                        <div className="mini-bar">
                          <div className="mini-fill" style={{
                            width: result.experienceRating === "Excellent" ? "90%" : 
                                   result.experienceRating === "Good" ? "75%" : "50%"
                          }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`table-rating ${getRatingClass(result.experienceRating)}`}>
                        {result.experienceRating || "Good"}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div className="category-cell">
                        <FiBook className="category-icon" />
                        <span className="category-name">Education & Certifications</span>
                      </div>
                    </td>
                    <td>{result.educationDetails || "Education assessment"}</td>
                    <td>
                      <div className="percentage-cell">
                        <span className="percentage-value">
                          {result.educationRating === "Excellent" ? "95%" : 
                           result.educationRating === "Good" ? "80%" : "60%"}
                        </span>
                        <div className="mini-bar">
                          <div className="mini-fill" style={{
                            width: result.educationRating === "Excellent" ? "95%" : 
                                   result.educationRating === "Good" ? "80%" : "60%"
                          }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`table-rating ${getRatingClass(result.educationRating)}`}>
                        {result.educationRating || "Good"}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div className="category-cell">
                        <FiAward className="category-icon" />
                        <span className="category-name">Achievements & Awards</span>
                      </div>
                    </td>
                    <td>{result.achievementsDetails || "Achievements assessment"}</td>
                    <td>
                      <div className="percentage-cell">
                        <span className="percentage-value">
                          {result.achievementsRating === "Excellent" ? "85%" : 
                           result.achievementsRating === "Good" ? "70%" : "45%"}
                        </span>
                        <div className="mini-bar">
                          <div className="mini-fill" style={{
                            width: result.achievementsRating === "Excellent" ? "85%" : 
                                   result.achievementsRating === "Good" ? "70%" : "45%"
                          }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`table-rating ${getRatingClass(result.achievementsRating)}`}>
                        {result.achievementsRating || "Good"}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div className="category-cell">
                        <FiEdit3 className="category-icon" />
                        <span className="category-name">Grammar & Language</span>
                      </div>
                    </td>
                    <td>{result.grammarDetails || "Language assessment"}</td>
                    <td>
                      <div className="percentage-cell">
                        <span className="percentage-value">
                          {result.grammarRating === "Excellent" ? "95%" : 
                           result.grammarRating === "Good" ? "85%" : "65%"}
                        </span>
                        <div className="mini-bar">
                          <div className="mini-fill" style={{
                            width: result.grammarRating === "Excellent" ? "95%" : 
                                   result.grammarRating === "Good" ? "85%" : "65%"
                          }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`table-rating ${getRatingClass(result.grammarRating)}`}>
                        {result.grammarRating || "Good"}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div className="category-cell">
                        <FiPhone className="category-icon" />
                        <span className="category-name">Contact Information</span>
                      </div>
                    </td>
                    <td>{result.contactDetails || "Contact completeness"}</td>
                    <td>
                      <div className="percentage-cell">
                        <span className="percentage-value">
                          {result.contactRating === "Excellent" ? "100%" : 
                           result.contactRating === "Good" ? "85%" : "60%"}
                        </span>
                        <div className="mini-bar">
                          <div className="mini-fill" style={{
                            width: result.contactRating === "Excellent" ? "100%" : 
                                   result.contactRating === "Good" ? "85%" : "60%"
                          }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`table-rating ${getRatingClass(result.contactRating)}`}>
                        {result.contactRating || "Good"}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div className="category-cell">
                        <FiLink className="category-icon" />
                        <span className="category-name">Social Links</span>
                      </div>
                    </td>
                    <td>{result.socialLinksDetails || "Social presence"}</td>
                    <td>
                      <div className="percentage-cell">
                        <span className="percentage-value">
                          {result.socialLinksRating === "Excellent" ? "90%" : 
                           result.socialLinksRating === "Good" ? "75%" : "50%"}
                        </span>
                        <div className="mini-bar">
                          <div className="mini-fill" style={{
                            width: result.socialLinksRating === "Excellent" ? "90%" : 
                                   result.socialLinksRating === "Good" ? "75%" : "50%"
                          }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`table-rating ${getRatingClass(result.socialLinksRating)}`}>
                        {result.socialLinksRating || "Good"}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div className="category-cell">
                        <FiTrendingUp className="category-icon" />
                        <span className="category-name">Project Impact</span>
                      </div>
                    </td>
                    <td>{result.projectImpactDetails || "Impact assessment"}</td>
                    <td>
                      <div className="percentage-cell">
                        <span className="percentage-value">
                          {result.projectImpactRating === "Excellent" ? "85%" : 
                           result.projectImpactRating === "Good" ? "70%" : "45%"}
                        </span>
                        <div className="mini-bar">
                          <div className="mini-fill" style={{
                            width: result.projectImpactRating === "Excellent" ? "85%" : 
                                   result.projectImpactRating === "Good" ? "70%" : "45%"
                          }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`table-rating ${getRatingClass(result.projectImpactRating)}`}>
                        {result.projectImpactRating || "Good"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pros and Cons Tables */}
            <div className="pros-cons-tables">
              {/* Strengths Table */}
              <div className="pros-table-container">
                <div className="table-header pros-header">
                  <FiCheckSquare className="table-icon" />
                  <h4 className="table-title">Strengths (Pros)</h4>
                </div>
                <table className="pros-cons-table pros-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Strength</th>
                      <th>Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.strengths && result.strengths.length > 0 ? (
                      result.strengths.map((strength, index) => (
                        <tr key={index}>
                          <td className="number-cell">{index + 1}</td>
                          <td className="strength-text">{strength}</td>
                          <td>
                            <span className="impact-badge positive">High</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="number-cell">1</td>
                        <td className="strength-text">Strengths will be analyzed by AI</td>
                        <td>
                          <span className="impact-badge neutral">Pending</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Areas for Improvement Table */}
              <div className="cons-table-container">
                <div className="table-header cons-header">
                  <FiAlertTriangle className="table-icon" />
                  <h4 className="table-title">Areas for Improvement</h4>
                </div>
                <table className="pros-cons-table cons-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Area to Improve</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.weaknesses && result.weaknesses.length > 0 ? (
                      result.weaknesses.map((weakness, index) => (
                        <tr key={index}>
                          <td className="number-cell">{index + 1}</td>
                          <td className="weakness-text">{weakness}</td>
                          <td>
                            <span className="priority-badge high">High</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="number-cell">1</td>
                        <td className="weakness-text">Areas for improvement will be analyzed by AI</td>
                        <td>
                          <span className="priority-badge neutral">Pending</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Recommendations Table */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="recommendations-table-container">
                <div className="table-header recommendations-header">
                  <FiZap className="table-icon" />
                  <h4 className="table-title">AI Recommendations</h4>
                </div>
                <table className="recommendations-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Recommendation</th>
                      <th>Category</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.recommendations.map((rec, index) => (
                      <tr key={index}>
                        <td className="number-cell">{index + 1}</td>
                        <td className="recommendation-text">{rec}</td>
                        <td>
                          <span className="category-badge">
                            {index === 0 ? "Content" : 
                             index === 1 ? "Format" : 
                             index === 2 ? "Skills" : "General"}
                          </span>
                        </td>
                        <td>
                          <span className="priority-badge high">High</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Analysis History Table - Outside results container */}
        {showHistory && (
          <div className="history-table-container">
            <div className="table-header history-header">
              <FiCalendar className="table-icon" />
              <h4 className="table-title">Analysis History</h4>
            </div>
            {console.log('Rendering history table. showHistory:', showHistory, 'historyLoading:', historyLoading, 'history.length:', history.length)}
            
            {historyLoading ? (
              <div className="history-loading">
                <div className="loading-spinner"></div>
                <span>Loading history...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="history-empty">
                <p>No analysis history found. Generate your first AI score to see it here!</p>
              </div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Resume File</th>
                    <th>Job Role/Description</th>
                    <th>Overall Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td className="date-cell">
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="filename-cell">
                        <div className="file-info">
                          <FiFile className="file-icon-small" />
                          <span className="filename">{item.resumeFilename}</span>
                        </div>
                      </td>
                      <td className="job-desc-cell">
                        <div className="job-desc-preview">
                          {item.jobRoleOrDescription.length > 100 
                            ? `${item.jobRoleOrDescription.substring(0, 100)}...`
                            : item.jobRoleOrDescription
                          }
                        </div>
                      </td>
                      <td className="score-cell">
                        <div className="history-score">
                          <span className="score-number">{item.overallScore}/100</span>
                          <span className={`score-badge ${
                            item.overallScore >= 90 ? 'rating-excellent' : 
                            item.overallScore >= 75 ? 'rating-good' : 'rating-poor'
                          }`}>
                            {item.overallScore >= 90 ? 'Excellent' : 
                             item.overallScore >= 75 ? 'Good' : 'Poor'}
                          </span>
                        </div>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="delete-btn"
                          onClick={() => deleteHistoryItem(item.id)}
                          title="Delete this analysis"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
