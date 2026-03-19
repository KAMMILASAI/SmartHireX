import React, { useEffect, useState } from 'react';
import { FiUser, FiMail, FiBriefcase, FiFileText, FiCheckCircle, FiTrendingUp, FiCalendar, FiCode, FiStar, FiAward, FiClock, FiCheck, FiX } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './DashboardHome.css';

export default function DashboardHome() {
  const [profile, setProfile] = useState(null);
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [resumeScoreHistory, setResumeScoreHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dailyStreak, setDailyStreak] = useState(0);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        
        // Fetch profile data
        const profileRes = await axios.get(`${API_BASE_URL}/candidate/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(profileRes.data);
        
        // Set daily streak from real API data
        setDailyStreak(profileRes.data.dailyStreak || 0);

        // Fetch practice history
        try {
          const practiceRes = await axios.get(`${API_BASE_URL}/candidate/practice/history`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const sessions = practiceRes.data.sessions || practiceRes.data || [];
          console.log('Practice API Response:', practiceRes.data);
          console.log('Practice Sessions:', sessions);
          setPracticeHistory(sessions);
        } catch (practiceErr) {
          console.log('Practice history not available:', practiceErr.message);
          setPracticeHistory([]);
        }
        
        // Fetch resume analysis history from ResumeChecker
        let resumeScores = [];
        
        try {
          console.log('Fetching resume analysis history...');
          const resumeRes = await axios.get(`${API_BASE_URL}/candidate/resume-score-history`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('Resume Analysis Response:', resumeRes.data);
          if (resumeRes.data?.history && Array.isArray(resumeRes.data.history)) {
            // Map the backend response to chart format
            resumeScores = resumeRes.data.history.map((item, index) => ({
              period: `Analysis ${index + 1}`,
              score: item.overallScore || 0,
              label: new Date(item.createdAt).toLocaleDateString(),
              date: item.createdAt
            })).sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort chronologically
          }
        } catch (resumeErr) {
          console.log('Resume analysis history API failed:', resumeErr.message);
        }
        
        setResumeScoreHistory(resumeScores);
        console.log('Resume history set to:', resumeScores);
        
        // Fetch applications/interview status data
        try {
          const applicationsRes = await axios.get(`${API_BASE_URL}/candidate/applications`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const applications = applicationsRes.data || [];
          
          // Transform applications to interview status format
          const interviewData = applications.map((app, index) => ({
            id: app.id || index,
            company: app.job?.company || 'Unknown Company',
            position: app.job?.title || 'Unknown Position',
            stage: getApplicationStage(app.status),
            date: app.createdAt ? new Date(app.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            status: getStatusDisplay(app.status),
            statusColor: getStatusColor(app.status)
          }));
          
          setInterviewStatusData(interviewData);
          console.log('Interview Status Data:', interviewData);
          console.log('Status values:', interviewData.map(i => i.status));
        } catch (appErr) {
          console.log('Applications data not available:', appErr.message);
          setInterviewStatusData([]);
        }
        
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const calculateSimpleStreak = () => {
    // This could be based on login days, profile activity, or any other metric
    // For now, return a random streak between 1-15 or based on profile data
    const lastLogin = localStorage.getItem('lastLoginDate');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastLogin === today) {
      // User logged in today, get stored streak or start new one
      const storedStreak = localStorage.getItem('dailyStreak') || '1';
      return parseInt(storedStreak);
    } else {
      // Reset streak and update login date
      localStorage.setItem('lastLoginDate', today);
      localStorage.setItem('dailyStreak', '1');
      return 1;
    }
  };

  // This function is no longer used for daily streak calculation
  const calculateDailyStreak = (sessions) => {
    // This function can be removed or repurposed for other streak calculations
    console.log('Note: Daily streak is now independent of practice sessions');
  };

  // Helper functions to transform application status
  const getApplicationStage = (status) => {
    switch (status?.toLowerCase()) {
      case 'applied': return 'Applied';
      case 'shortlisted': return 'Resume Shortlisted';
      case 'interview_scheduled': return 'Interview Scheduled';
      case 'interview_completed': return 'Interview Completed';
      case 'technical_round': return 'Technical Round';
      case 'hr_round': return 'HR Round';
      case 'final_round': return 'Final Round';
      case 'selected': return 'Selected';
      case 'rejected': return 'Rejected';
      default: return 'Applied';
    }
  };

  const getStatusDisplay = (status) => {
    switch (status?.toLowerCase()) {
      case 'applied': return 'Under Review';
      case 'shortlisted': return 'Shortlisted';
      case 'interview_scheduled': return 'Scheduled';
      case 'interview_completed': return 'Completed';
      case 'technical_round': return 'In Progress';
      case 'hr_round': return 'In Progress';
      case 'final_round': return 'In Progress';
      case 'selected': return 'Selected';
      case 'rejected': return 'Rejected';
      default: return 'Pending';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'applied': return '#3498db';
      case 'shortlisted': return '#f39c12';
      case 'interview_scheduled': return '#f39c12';
      case 'interview_completed': return '#27ae60';
      case 'technical_round': return '#9b59b6';
      case 'hr_round': return '#9b59b6';
      case 'final_round': return '#e74c3c';
      case 'selected': return '#27ae60';
      case 'rejected': return '#e74c3c';
      default: return '#95a5a6';
    }
  };


  // Prepare chart data (show only last 10 sessions for better visualization)
  const practiceChartData = practiceHistory
    .slice() // Create a copy to avoid mutating original array
    .sort((a, b) => 
      new Date(a.createdAt || a.created_at || a.timestamp) - 
      new Date(b.createdAt || b.created_at || b.timestamp)
    ) // Sort chronologically (oldest first)
    .slice(-10) // Take only the last 10 sessions
    .map((session, index) => ({
      session: `Practice ${practiceHistory.length - 9 + index}`, // Show actual session numbers
      score: session.percentage || session.score || 0,
      date: new Date(session.createdAt || session.created_at || session.timestamp || Date.now()).toLocaleDateString(),
      type: session.type || 'practice'
    }));

  // Resume score progress (dynamic data from API)
  const resumeScoreData = resumeScoreHistory.length > 0 ? resumeScoreHistory : [];
  
  // Calculate dynamic resume score summary
  const getResumeScoreSummary = () => {
    if (resumeScoreData.length >= 2) {
      const lastScore = resumeScoreData[resumeScoreData.length - 1].score; // Latest resume score
      const previousScore = resumeScoreData[resumeScoreData.length - 2].score; // Previous resume score
      const improvement = lastScore - previousScore;
      return {
        before: previousScore, // Dynamic previous score
        current: lastScore,
        improvement: improvement
      };
    } else if (resumeScoreData.length === 1) {
      // Only one resume score available
      const currentScore = resumeScoreData[0].score;
      return {
        before: 0, // No previous data
        current: currentScore,
        improvement: currentScore
      };
    }
    // No resume analysis data available
    return {
      before: 0,
      current: 0,
      improvement: 0
    };
  };
  
  const resumeScoreSummary = getResumeScoreSummary();
  
  // Debug logs to check data
  console.log('Resume Score Data:', resumeScoreData);
  console.log('Resume Score History:', resumeScoreHistory);
  console.log('Resume Score Summary:', resumeScoreSummary);
  console.log('Practice Chart Data:', practiceChartData);
  console.log('Practice History (original):', practiceHistory);

  // Dynamic interview status data from backend
  const [interviewStatusData, setInterviewStatusData] = useState([]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px',
        background: '#0b1220'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#cbd5e1', fontSize: '16px' }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        background: '#12172a',
        borderRadius: '12px',
        margin: '20px',
        boxShadow: '0 2px 18px rgba(0,0,0,0.35)',
        border: '1px solid #2b2f44'
      }}>
        <div style={{ color: '#f87171', fontSize: '18px', marginBottom: '10px' }}>⚠️ {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            background: '#2563eb',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!profile) return null;

  return (
    <div className="dashboard-container" style={{ 
      background: '#0b1220',
      color: '#e2e8f0',
      minHeight: '100vh',
      padding: '12px 24px',
      maxWidth: '100%',
      width: '100%',
      margin: '0 auto'
    }}>
      {/* Enhanced Profile Card - White Background */}
      <div className="profile-card" style={{
        background: '#12172a',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        color: '#e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        border: '1px solid #2b2f44'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div className="profile-avatar" style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            background: '#0f1629',
            border: '3px solid #2b2f44',
            overflow: 'hidden', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}>
            {profile.image ? (
              <img src={profile.image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <FiUser size={60} style={{ color: '#6c757d' }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700', color: '#e2e8f0' }}>
              {profile.name ? profile.name.split(' ').filter((part, index, arr) => 
                part && arr.indexOf(part) === index // Remove duplicate words
              ).join(' ') : 'User'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0', fontSize: '16px', color: '#a6b0cf' }}>
              <FiMail size={16} style={{ color: '#667eea' }} /> {profile.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0', fontSize: '16px', color: '#a6b0cf' }}>
              <FiBriefcase size={16} style={{ color: '#4ecdc4' }} /> {profile.college}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0', fontSize: '16px', color: '#a6b0cf' }}>
              <FiFileText size={16} style={{ color: '#ff6b6b' }} /> Registration: {profile.regNo}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0', fontSize: '16px', color: '#a6b0cf' }}>
              <FiCheckCircle size={16} style={{ color: '#27ae60' }} /> {profile.location}
            </div>
          </div>
        </div>
        
        {/* Dynamic Skills Section */}
        {profile.skills && (
          <div style={{ marginTop: '24px', borderTop: '1px solid #2b2f44', paddingTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <FiCode size={20} style={{ color: '#667eea' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#e2e8f0' }}>Skills & Technologies</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
              {profile.skills.split(',').map((skill, i) => {
                const colors = ['#667eea', '#4ecdc4', '#ff6b6b', '#feca57', '#a8edea', '#fed6e3'];
                const color = colors[i % colors.length];
                return (
                  <div key={i} className="skill-card" style={{
                    background: '#0f1629',
                    border: `2px solid ${color}`,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.35)'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: color, marginBottom: '4px' }}>
                      {skill.trim()}
                    </div>
                    <div style={{ fontSize: '10px', color: '#8b95b7' }}>Skill</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards Grid */}
      <div className="stats-grid" style={{ gap: '20px', marginBottom: '32px', display: 'grid' }}>
        {/* Daily Streak Card */}
        <div className="stats-card" style={{
          background: '#12172a',
          borderRadius: '16px',
          padding: '24px',
          color: '#e2e8f0',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          border: '1px solid #2b2f44'
        }}>
          <FiCalendar className="stats-icon" size={32} style={{ marginBottom: '12px', color: '#ff6b6b' }} />
          <div className="stats-value" style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: '#ff6b6b' }}>{dailyStreak}</div>
          <div style={{ fontSize: '16px', color: '#a6b0cf' }}>Day Streak</div>
          <div style={{ fontSize: '12px', color: '#8b95b7', marginTop: '4px' }}>Keep it up! 🔥</div>
        </div>

        {/* Resume Score Card */}
        <div className="stats-card" style={{
          background: '#12172a',
          borderRadius: '16px',
          padding: '24px',
          color: '#e2e8f0',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          border: '1px solid #2b2f44'
        }}>
          <FiFileText className="stats-icon" size={32} style={{ marginBottom: '12px', color: '#4ecdc4' }} />
          <div className="stats-value" style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: '#4ecdc4' }}>
            {resumeScoreData.length > 0 ? resumeScoreData[resumeScoreData.length - 1].score : 0}/100
          </div>
          <div style={{ fontSize: '16px', color: '#a6b0cf' }}>Resume Analysis Score</div>
          <div style={{ fontSize: '12px', color: '#8b95b7', marginTop: '4px' }}>
            {resumeScoreData.length > 0 ? 'Latest analysis' : 'No analysis yet'}
          </div>
        </div>

        {/* Interviews Card */}
        <div className="stats-card" style={{
          background: '#12172a',
          borderRadius: '16px',
          padding: '24px',
          color: '#e2e8f0',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          border: '1px solid #2b2f44'
        }}>
          <FiStar className="stats-icon" size={32} style={{ marginBottom: '12px', color: '#a8edea' }} />
          <div className="stats-value" style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: '#a8edea' }}>{profile.interviewsAttended || 0}</div>
          <div style={{ fontSize: '16px', color: '#a6b0cf' }}>Interviews</div>
          <div style={{ fontSize: '12px', color: '#8b95b7', marginTop: '4px' }}>Attended</div>
        </div>

        {/* Practice Sessions Card */}
        <div className="stats-card" style={{
          background: '#12172a',
          borderRadius: '16px',
          padding: '24px',
          color: '#e2e8f0',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          border: '1px solid #2b2f44'
        }}>
          <FiCode className="stats-icon" size={32} style={{ marginBottom: '12px', color: '#667eea' }} />
          <div className="stats-value" style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: '#667eea' }}>{practiceHistory.length}</div>
          <div style={{ fontSize: '16px', color: '#a6b0cf' }}>Practice Sessions</div>
          <div style={{ fontSize: '12px', color: '#8b95b7', marginTop: '4px' }}>Completed</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid" style={{ gap: '24px', marginBottom: '32px', display: 'grid' }}>
        {/* Practice Progress Chart */}
        <div className="chart-card" style={{
          background: '#12172a',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          border: '1px solid #2b2f44'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <FiTrendingUp size={24} style={{ color: '#667eea' }} />
            <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '20px' }}>Practice Progress</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={practiceChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2b2f44" />
              <XAxis 
                dataKey="session" 
                tick={{ fontSize: 12, fill: '#a6b0cf' }}
                axisLine={{ stroke: '#2b2f44' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#a6b0cf' }}
                axisLine={{ stroke: '#2b2f44' }}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{
                  background: '#0f1629',
                  border: '1px solid #2b2f44',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                  color: '#e2e8f0'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#667eea" 
                strokeWidth={3}
                dot={{ fill: '#667eea', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, fill: '#667eea' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Resume Score Progress Chart */}
        <div className="chart-card" style={{
          background: '#12172a',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          border: '1px solid #2b2f44'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <FiFileText size={24} style={{ color: '#4ecdc4' }} />
            <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '20px' }}>Resume Score Progress</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={resumeScoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2b2f44" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12, fill: '#a6b0cf' }}
                axisLine={{ stroke: '#2b2f44' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#a6b0cf' }}
                axisLine={{ stroke: '#2b2f44' }}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{
                  background: '#0f1629',
                  border: '1px solid #2b2f44',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                  color: '#e2e8f0'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#4ecdc4" 
                fill="url(#colorGradient)"
                strokeWidth={3}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ecdc4" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#4ecdc4" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '16px',
            padding: '12px',
            background: '#0f1629',
            borderRadius: '8px',
            border: '1px solid #2b2f44'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#a6b0cf' }}>Before</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#ff6b6b' }}>{resumeScoreSummary.before}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#a6b0cf' }}>Current</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#4ecdc4' }}>{resumeScoreSummary.current}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#a6b0cf' }}>Improvement</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: resumeScoreSummary.improvement >= 0 ? '#27ae60' : '#ff6b6b' }}>
                {resumeScoreSummary.improvement >= 0 ? '+' : ''}{resumeScoreSummary.improvement}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interview Status Table */}
      <div className="interview-table" style={{
        background: '#12172a',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        border: '1px solid #2b2f44',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <FiAward size={24} style={{ color: '#667eea' }} />
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '20px' }}>Interview Status</h3>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            background: '#12172a'
          }}>
            <thead>
              <tr style={{ background: '#0f1629' }}>
                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left',
                  borderBottom: '2px solid #2b2f44',
                  color: '#cbd5e1',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>Company</th>
                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left',
                  borderBottom: '2px solid #2b2f44',
                  color: '#cbd5e1',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>Position</th>
                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left',
                  borderBottom: '2px solid #2b2f44',
                  color: '#cbd5e1',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>Stage</th>
                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left',
                  borderBottom: '2px solid #2b2f44',
                  color: '#cbd5e1',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>Date</th>
                <th style={{ 
                  padding: '16px', 
                  textAlign: 'center',
                  borderBottom: '2px solid #2b2f44',
                  color: '#cbd5e1',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {interviewStatusData.map((interview) => (
                <tr key={interview.id} style={{ 
                  borderBottom: '1px solid #2b2f44',
                  transition: 'background-color 0.2s ease'
                }}>
                  <td style={{ 
                    padding: '16px',
                    fontSize: '14px',
                    color: '#e2e8f0',
                    fontWeight: '500'
                  }}>
                    {interview.company}
                  </td>
                  <td style={{ 
                    padding: '16px',
                    fontSize: '14px',
                    color: '#a6b0cf'
                  }}>
                    {interview.position}
                  </td>
                  <td style={{ 
                    padding: '16px',
                    fontSize: '14px',
                    color: '#a6b0cf'
                  }}>
                    {interview.stage}
                  </td>
                  <td style={{ 
                    padding: '16px',
                    fontSize: '14px',
                    color: '#a6b0cf'
                  }}>
                    {new Date(interview.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                  <td style={{ 
                    padding: '16px',
                    textAlign: 'center'
                  }}>
                    <span className="interview-status-badge" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: interview.statusColor,
                      background: `${interview.statusColor}15`,
                      border: `1px solid ${interview.statusColor}30`
                    }}>
                      {interview.status === 'Completed' && <FiCheck size={12} />}
                      {interview.status === 'Scheduled' && <FiClock size={12} />}
                      {interview.status === 'Under Review' && <FiClock size={12} />}
                      {interview.status === 'Pending' && <FiClock size={12} />}
                      {interview.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Summary Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginTop: '24px',
          padding: '20px',
          background: '#0f1629',
          borderRadius: '12px',
          border: '1px solid #2b2f44'
        }}>
          <div className="summary-stat" style={{ textAlign: 'center' }}>
            <div className="stat-number" style={{ fontSize: '24px', fontWeight: '700', color: '#27ae60', marginBottom: '4px' }}>
              {interviewStatusData.filter(i => 
                i.status === 'Completed' || 
                i.status === 'Selected' || 
                i.status === 'Interview Completed'
              ).length}
            </div>
            <div style={{ fontSize: '12px', color: '#a6b0cf', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed</div>
          </div>
          <div className="summary-stat" style={{ textAlign: 'center' }}>
            <div className="stat-number" style={{ fontSize: '24px', fontWeight: '700', color: '#f39c12', marginBottom: '4px' }}>
              {interviewStatusData.filter(i => 
                i.status === 'Scheduled' || 
                i.status === 'Interview Scheduled' ||
                i.status === 'Shortlisted'
              ).length}
            </div>
            <div style={{ fontSize: '12px', color: '#a6b0cf', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scheduled</div>
          </div>
          <div className="summary-stat" style={{ textAlign: 'center' }}>
            <div className="stat-number" style={{ fontSize: '24px', fontWeight: '700', color: '#3498db', marginBottom: '4px' }}>
              {interviewStatusData.filter(i => 
                i.status === 'Under Review' || 
                i.status === 'In Progress' ||
                i.status === 'Applied'
              ).length}
            </div>
            <div style={{ fontSize: '12px', color: '#a6b0cf', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Under Review</div>
          </div>
          <div className="summary-stat" style={{ textAlign: 'center' }}>
            <div className="stat-number" style={{ fontSize: '24px', fontWeight: '700', color: '#95a5a6', marginBottom: '4px' }}>
              {interviewStatusData.filter(i => 
                i.status === 'Pending' || 
                i.status === 'Rejected'
              ).length}
            </div>
            <div style={{ fontSize: '12px', color: '#a6b0cf', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending</div>
          </div>
        </div>
      </div>

    </div>
  );
}
