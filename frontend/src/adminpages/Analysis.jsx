import { useEffect, useState } from 'react';
import './UserCard.css';
import './AnalysisDynamic.css';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { FiTrash2, FiUsers, FiUserCheck, FiTrendingUp, FiActivity } from 'react-icons/fi';

export default function Analysis() {
  const [allUsers, setAllUsers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCandidates: 0,
    totalRecruiters: 0,
    recentUsers: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch candidates
      const candidatesRes = await axios.get(`${API_BASE_URL}/admin/candidates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fetch recruiters
      const recruitersRes = await axios.get(`${API_BASE_URL}/admin/recruiters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const candidateData = candidatesRes.data || [];
      const recruiterData = recruitersRes.data || [];
      
      setCandidates(candidateData);
      setRecruiters(recruiterData);
      
      // Combine all users and sort by creation date
      const combined = [
        ...candidateData.map(user => ({ ...user, userType: 'candidate' })),
        ...recruiterData.map(user => ({ ...user, userType: 'recruiter' }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setAllUsers(combined);
      
      // Calculate stats
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const recentUsers = combined.filter(user => 
        new Date(user.createdAt) > oneWeekAgo
      ).length;
      
      setStats({
        totalUsers: combined.length,
        totalCandidates: candidateData.length,
        totalRecruiters: recruiterData.length,
        recentUsers: recentUsers
      });
      
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load user data');
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId, userName, userType) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete ${userType} "${userName}"?\n\nThis action cannot be undone and will remove all their data from the system.`
    );
    
    if (!confirmDelete) return;
    
    setDeleteLoading(userId);
    try {
      const token = localStorage.getItem('token');
      const endpoint = userType === 'candidate' ? 'candidates' : 'recruiters';
      
      await axios.delete(`${API_BASE_URL}/admin/${endpoint}/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove user from all relevant states
      setAllUsers(prev => prev.filter(user => user._id !== userId));
      if (userType === 'candidate') {
        setCandidates(prev => prev.filter(user => user._id !== userId));
      } else {
        setRecruiters(prev => prev.filter(user => user._id !== userId));
      }
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalUsers: prev.totalUsers - 1,
        totalCandidates: userType === 'candidate' ? prev.totalCandidates - 1 : prev.totalCandidates,
        totalRecruiters: userType === 'recruiter' ? prev.totalRecruiters - 1 : prev.totalRecruiters
      }));
      
      alert(`${userType.charAt(0).toUpperCase() + userType.slice(1)} deleted successfully!`);
    } catch (err) {
      console.error('Delete error:', err);
      alert(`Failed to delete ${userType}. Please try again.`);
    }
    setDeleteLoading(null);
  };

  const getDisplayUsers = () => {
    switch (activeTab) {
      case 'candidates':
        return candidates.map(user => ({ ...user, userType: 'candidate' }));
      case 'recruiters':
        return recruiters.map(user => ({ ...user, userType: 'recruiter' }));
      default:
        return allUsers;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="analysis-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading user analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchAllData} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  const displayUsers = getDisplayUsers();

  return (
    <div className="analysis-container">
      <div className="analysis-header">
        <h1>User Analysis</h1>
        <p>Comprehensive overview of all platform users</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <FiUsers />
          </div>
          <div className="stat-info">
            <h3>Total Users</h3>
            <span className="stat-number">{stats.totalUsers}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon candidates">
            <FiUsers />
          </div>
          <div className="stat-info">
            <h3>Candidates</h3>
            <span className="stat-number">{stats.totalCandidates}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon recruiters">
            <FiUserCheck />
          </div>
          <div className="stat-info">
            <h3>Recruiters</h3>
            <span className="stat-number">{stats.totalRecruiters}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon recent">
            <FiTrendingUp />
          </div>
          <div className="stat-info">
            <h3>Recent (7 days)</h3>
            <span className="stat-number">{stats.recentUsers}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <FiActivity /> All Users ({stats.totalUsers})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'candidates' ? 'active' : ''}`}
          onClick={() => setActiveTab('candidates')}
        >
          <FiUsers /> Candidates ({stats.totalCandidates})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'recruiters' ? 'active' : ''}`}
          onClick={() => setActiveTab('recruiters')}
        >
          <FiUserCheck /> Recruiters ({stats.totalRecruiters})
        </button>
      </div>

      {/* Users List */}
      <div className="users-section">
        {displayUsers.length === 0 ? (
          <div className="no-users-message">
            <div className="no-users-icon">
              <FiUsers />
            </div>
            <h3>No {activeTab === 'all' ? 'users' : activeTab} found</h3>
            <p>
              {activeTab === 'all' 
                ? 'No users have registered on the platform yet.' 
                : `No ${activeTab} have registered yet.`
              }
            </p>
            <button onClick={fetchAllData} className="refresh-btn">
              Refresh Data
            </button>
          </div>
        ) : (
          <div className="user-cards-grid">
            {displayUsers.map((user, index) => (
              <div key={user._id} className="user-card" style={{
                background: `linear-gradient(135deg, ${getGradientColors(index)[0]} 0%, ${getGradientColors(index)[1]} 100%)`
              }}>
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteUser(user._id, user.name || `${user.firstName} ${user.lastName}`, user.userType)}
                  disabled={deleteLoading === user._id}
                  title="Delete User"
                >
                  {deleteLoading === user._id ? (
                    <div className="delete-spinner"></div>
                  ) : (
                    <FiTrash2 />
                  )}
                </button>

                <div className="user-avatar">
                  {user.image ? (
                    <img src={user.image} alt={user.name} />
                  ) : (
                    <div className="avatar-placeholder">
                      {(user.name || `${user.firstName} ${user.lastName}`).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="user-info">
                  <h3>{user.name || `${user.firstName} ${user.lastName}`}</h3>
                  <p className="user-email">{user.email}</p>
                  
                  <div className="user-meta">
                    <span className={`user-role ${user.userType}`}>
                      {user.userType === 'candidate' ? '👨‍🎓' : '💼'} {user.userType}
                    </span>
                    <span className="join-date">
                      Joined {formatDate(user.createdAt)}
                    </span>
                  </div>

                  {user.userType === 'candidate' && user.college && (
                    <div className="additional-info">
                      <p><strong>College:</strong> {user.college}</p>
                    </div>
                  )}

                  {user.userType === 'recruiter' && user.company && (
                    <div className="additional-info">
                      <p><strong>Company:</strong> {user.company}</p>
                      {user.isApproved !== undefined && (
                        <span className={`approval-status ${user.isApproved ? 'approved' : 'pending'}`}>
                          {user.isApproved ? '✅ Approved' : '⏳ Pending'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function for gradient colors
function getGradientColors(index) {
  const gradients = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140']
  ];
  return gradients[index % gradients.length];
}
