import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiDownload, FiBarChart2, FiUsers, FiClock, 
  FiTrendingUp, FiCode, FiHelpCircle, FiAward, FiFilter, FiTrash2 
} from 'react-icons/fi';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './MixedResults.css';

const MixedResults = () => {
  const { roundId } = useParams();
  const navigate = useNavigate();
  
  const [results, setResults] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('totalScore');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchMixedResults();
    fetchMixedStatistics();
    fetchMixedConfiguration();
  }, [roundId]);

  const fetchMixedResults = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/recruiter/mixed-rounds/${roundId}/results`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResults(response.data);
    } catch (error) {
      console.error('Error fetching mixed results:', error);
      setError('Failed to fetch mixed exam results');
    }
  };

  const fetchMixedStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/recruiter/mixed-rounds/${roundId}/statistics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching mixed statistics:', error);
    }
  };

  const fetchMixedConfiguration = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/recruiter/mixed-rounds/${roundId}/configuration`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComponents(response.data.components || []);
    } catch (error) {
      console.error('Error fetching mixed configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAndSortedResults = () => {
    let filtered = results;
    
    if (filterStatus !== 'all') {
      filtered = results.filter(result => result.status === filterStatus);
    }
    
    return filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#059669';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#dc2626';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return '#059669';
      case 'MCQ_COMPLETED': return '#3b82f6';
      case 'CODING_COMPLETED': return '#10b981';
      case 'IN_PROGRESS': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const exportResults = () => {
    const csvContent = [
      ['Candidate Name', 'Email', 'Total Score', 'MCQ Score', 'Coding Score', 'Total Time', 'Status'],
      ...getFilteredAndSortedResults().map(result => [
        result.candidateName,
        result.candidateEmail,
        result.totalScore,
        result.mcqScore || 0,
        result.codingScore || 0,
        formatTime(result.totalTimeSpent),
        result.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mixed-exam-results-round-${roundId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearAllResults = async () => {
    if (!window.confirm('Are you sure you want to clear ALL exam results for this round? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_BASE_URL}/recruiter/mixed-rounds/${roundId}/results`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('All exam results cleared successfully!');
      
      // Refresh the results
      setResults([]);
      setStatistics(null);
      fetchMixedResults();
      fetchMixedStatistics();
      
    } catch (error) {
      console.error('Error clearing results:', error);
      alert('Failed to clear results. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="mixed-results">
        <div className="loading">Loading mixed exam results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mixed-results">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const filteredResults = getFilteredAndSortedResults();

  return (
    <div className="mixed-results">
      <div className="header">
        <button className="back-btn" onClick={() => navigate(`/recruiter/rounds/${roundId}`)}>
          <FiArrowLeft /> Back to Round
        </button>
        <div className="header-content">
          <h1>
            <FiBarChart2 />
            Mixed Exam Results
          </h1>
          <p>Combined MCQ and Coding exam performance analysis</p>
        </div>
        <div className="header-actions">
          <button className="export-btn" onClick={exportResults}>
            <FiDownload /> Export Results
          </button>
          <button 
            className="clear-btn" 
            onClick={clearAllResults}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginLeft: '12px'
            }}
          >
            <FiTrash2 /> Clear All Results
          </button>
        </div>
      </div>

      {/* Statistics Overview */}
      {statistics && (
        <div className="statistics-overview">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <FiUsers />
              </div>
              <div className="stat-content">
                <div className="stat-value">{statistics.totalCandidates || 0}</div>
                <div className="stat-label">Total Candidates</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FiTrendingUp />
              </div>
              <div className="stat-content">
                <div className="stat-value">{statistics.averageScore?.toFixed(1) || 0}%</div>
                <div className="stat-label">Average Score</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FiAward />
              </div>
              <div className="stat-content">
                <div className="stat-value">{statistics.highestScore?.toFixed(1) || 0}%</div>
                <div className="stat-label">Highest Score</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FiClock />
              </div>
              <div className="stat-content">
                <div className="stat-value">{formatTime(statistics.averageTime)}</div>
                <div className="stat-label">Average Time</div>
              </div>
            </div>
          </div>

          {/* Component Statistics */}
          <div className="component-stats">
            <div className="component-stat mcq">
              <div className="component-header">
                <FiHelpCircle />
                <h3>MCQ Component</h3>
              </div>
              {statistics.mcqStatistics && (
                <div className="component-metrics">
                  <div className="metric">
                    <span>Average Score:</span>
                    <span>{statistics.mcqStatistics.averageScore?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="metric">
                    <span>Average Time:</span>
                    <span>{formatTime(statistics.mcqStatistics.averageTime)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="component-stat coding">
              <div className="component-header">
                <FiCode />
                <h3>Coding Component</h3>
              </div>
              {statistics.codingStatistics && statistics.codingStatistics.length > 0 && (
                <div className="component-metrics">
                  <div className="metric">
                    <span>Average Score:</span>
                    <span>{statistics.codingStatistics[0]?.averageScore?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="metric">
                    <span>Average Time:</span>
                    <span>{formatTime(statistics.codingStatistics[0]?.averageTime)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Component Configuration */}
      <div className="component-config">
        <h3>Exam Configuration</h3>
        <div className="config-items">
          {components.map(component => (
            <div key={component.componentType} className={`config-item ${component.componentType.toLowerCase()}`}>
              <div className="config-icon">
                {component.componentType === 'MCQ' ? <FiHelpCircle /> : <FiCode />}
              </div>
              <div className="config-details">
                <span className="config-type">{component.componentType}</span>
                <span className="config-weight">{component.componentWeight}% weight</span>
                <span className="config-time">{component.timeLimitMinutes} minutes</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="controls">
        <div className="filters">
          <div className="filter-group">
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="MCQ_COMPLETED">MCQ Completed</option>
              <option value="CODING_COMPLETED">Coding Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="totalScore">Total Score</option>
              <option value="candidateName">Name</option>
              <option value="mcqScore">MCQ Score</option>
              <option value="codingScore">Coding Score</option>
              <option value="totalTimeSpent">Time Spent</option>
              <option value="submittedAt">Submission Time</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Order:</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        <div className="results-count">
          Showing {filteredResults.length} of {results.length} results
        </div>
      </div>

      {/* Results Table */}
      <div className="results-table">
        <div className="table-header">
          <div className="header-cell">Candidate</div>
          <div className="header-cell">Total Score</div>
          <div className="header-cell">MCQ Score</div>
          <div className="header-cell">Coding Score</div>
          <div className="header-cell">Time Spent</div>
          <div className="header-cell">Language</div>
          <div className="header-cell">Status</div>
        </div>

        <div className="table-body">
          {filteredResults.map((result, index) => (
            <div key={result.id} className="table-row">
              <div className="cell candidate-cell">
                <div className="candidate-info">
                  <div className="candidate-name">{result.candidateName}</div>
                  <div className="candidate-email">{result.candidateEmail}</div>
                </div>
              </div>

              <div className="cell score-cell">
                <div 
                  className="score-badge total"
                  style={{ backgroundColor: getScoreColor(result.totalScore) }}
                >
                  {result.totalScore?.toFixed(1) || 0}%
                </div>
              </div>

              <div className="cell score-cell">
                <div className="component-score mcq">
                  <FiHelpCircle />
                  <span>{result.mcqScore?.toFixed(1) || 0}%</span>
                  <small>({result.mcqCorrectAnswers || 0}/{result.mcqTotalQuestions || 0})</small>
                </div>
              </div>

              <div className="cell score-cell">
                <div className="component-score coding">
                  <FiCode />
                  <span>{result.codingScore?.toFixed(1) || 0}%</span>
                  <small>({result.codingProblemsSolved || 0}/{result.codingTotalProblems || 0})</small>
                </div>
              </div>

              <div className="cell time-cell">
                <div className="time-breakdown">
                  <div className="total-time">{formatTime(result.totalTimeSpent)}</div>
                  <div className="component-times">
                    <small>MCQ: {formatTime(result.mcqTimeSpent)}</small>
                    <small>Coding: {formatTime(result.codingTimeSpent)}</small>
                  </div>
                </div>
              </div>

              <div className="cell language-cell">
                {result.codingLanguage ? (
                  <span className="language-badge">{result.codingLanguage.toUpperCase()}</span>
                ) : (
                  <span className="no-language">-</span>
                )}
              </div>

              <div className="cell status-cell">
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(result.status) }}
                >
                  {result.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredResults.length === 0 && (
        <div className="no-results">
          <p>No results found matching the current filters.</p>
        </div>
      )}
    </div>
  );
};

export default MixedResults;
