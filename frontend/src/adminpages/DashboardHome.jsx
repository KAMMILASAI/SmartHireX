import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from 'recharts';
import './AdminDashboardHome.css';
import './UserTable.css';

export default function AdminDashboardHome() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatJoinedDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
  };

  const normalizeRole = (role) => {
    if (!role) return 'unknown';
    return String(role).toLowerCase();
  };

  const fetchStats = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/admin/stats`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        timeout: 10000 // 10 second timeout
      });
      setStats(res.data);
    } catch (err) {
      console.error('Dashboard stats error:', err);
      
      // Retry logic for connection errors
      if (err.code === 'ECONNREFUSED' && retryCount < 2) {
        console.log(`Retrying connection... (${retryCount + 1}/3)`);
        setTimeout(() => fetchStats(retryCount + 1), 2000);
        return;
      }
      
      if (err.response?.status === 401) {
        setError('Authentication failed. Please login again.');
      } else if (err.code === 'ECONNREFUSED') {
        setError('Cannot connect to server. Please check if backend is running.');
      } else {
        setError('Failed to load dashboard statistics');
      }
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="admin-dashboard-home">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-home">
        <div className="error-container">
          <div className="error-message">
            <h3>⚠️ Error Loading Dashboard</h3>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="retry-button"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-home">

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>Total Users</h3>
            <p className="stat-number">{stats?.total || 0}</p>
            <span className={`stat-change ${stats?.totalGrowth >= 0 ? 'positive' : 'negative'}`}>
              {stats?.totalGrowth >= 0 ? '+' : ''}{stats?.totalGrowth || 0}%
            </span>
          </div>
          <div className="stat-icon users">👥</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-info">
            <h3>Candidates</h3>
            <p className="stat-number">{stats?.candidates || 0}</p>
            <span className={`stat-change ${stats?.candidateGrowth >= 0 ? 'positive' : 'negative'}`}>
              {stats?.candidateGrowth >= 0 ? '+' : ''}{stats?.candidateGrowth || 0}%
            </span>
          </div>
          <div className="stat-icon candidates">👨‍🎓</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-info">
            <h3>Recruiters</h3>
            <p className="stat-number">{stats?.recruiters || 0}</p>
            <span className={`stat-change ${stats?.recruiterGrowth >= 0 ? 'positive' : 'negative'}`}>
              {stats?.recruiterGrowth >= 0 ? '+' : ''}{stats?.recruiterGrowth || 0}%
            </span>
          </div>
          <div className="stat-icon recruiters">👨‍💼</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-info">
            <h3>Revenue</h3>
            <p className="stat-number">₹{stats?.paymentStats?.totalRevenue ? (stats.paymentStats.totalRevenue / 1000).toFixed(1) + 'K' : '0'}</p>
            <span className={`stat-change ${stats?.revenueGrowth >= 0 ? 'positive' : 'negative'}`}>
              {stats?.revenueGrowth >= 0 ? '+' : ''}{stats?.revenueGrowth || 0}%
            </span>
          </div>
          <div className="stat-icon revenue">💰</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-container">
        {/* Side by Side Charts */}
        <div className="side-by-side-charts">
          {/* Monthly Revenue Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Monthly Revenue & Registrations</h3>
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-dot blue"></span>Candidates</span>
                <span className="legend-item"><span className="legend-dot pink"></span>Recruiters</span>
                <span className="legend-item"><span className="legend-dot purple"></span>Revenue (₹)</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.monthlyData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                stroke="#666" 
                label={{ value: 'Months', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                stroke="#666" 
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                formatter={(value, name) => {
                  if (name === 'revenue') return [`₹${value.toLocaleString()}`, 'Revenue'];
                  if (name === 'candidates') return [value, 'Candidates'];
                  if (name === 'recruiters') return [value, 'Recruiters'];
                  return [value, name];
                }}
                labelFormatter={(label) => `Month: ${label} 2025`}
              />
              <Bar dataKey="candidates" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recruiters" fill="#EC4899" radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Registrations Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Daily Registrations (Last 7 Days)</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.dailyData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  stroke="#666" 
                  label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  stroke="#666" 
                  label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => {
                    if (name === 'candidates') return [value, 'Candidates'];
                    if (name === 'recruiters') return [value, 'Recruiters'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `${label} - Last 7 Days`}
                />
                <Line 
                  type="monotone" 
                  dataKey="candidates" 
                  stroke="#4F46E5" 
                  strokeWidth={3}
                  dot={{ fill: '#4F46E5', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#4F46E5', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="recruiters" 
                  stroke="#EC4899" 
                  strokeWidth={3}
                  dot={{ fill: '#EC4899', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#EC4899', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User List Table */}
        <div className="user-list-section">
          <div className="user-list-card">
            <div className="user-list-header">
              <h3>Recent Users</h3>
            </div>
            <div className="user-table-container">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentUsers && stats.recentUsers.length > 0 ? (
                    stats.recentUsers.map((user, index) => (
                      <tr key={index}>
                        <td>
                          <span className="user-name">{user.name || 'Unknown'}</span>
                        </td>
                        <td className="user-email">{user.email}</td>
                        <td>
                          <span className={`role-badge ${normalizeRole(user.role)}`}>
                            {normalizeRole(user.role) === 'candidate' ? '👨‍🎓' : '💼'} {normalizeRole(user.role).toUpperCase()}
                          </span>
                        </td>
                        <td className="join-date">
                          {formatJoinedDate(user.createdAt)}
                        </td>
                        <td>
                          <span className={`status-badge ${user.isOnline ? 'active' : 'inactive'}`}>
                            {user.isOnline ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="no-users">No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="activity-section">
        <div className="activity-stats">
          {(stats?.activityData || []).map((item, index) => (
            <div key={index} className="activity-card">
              <div className="activity-info">
                <p className="activity-value">{item.value?.toLocaleString() || '0'}</p>
                <p className="activity-change" style={{color: item.change?.startsWith('+') ? '#10B981' : '#EF4444'}}>
                  {item.change || '0'}
                </p>
                <p className="activity-label">{item.name || 'Activity'}</p>
              </div>
              <div className="activity-progress">
                <div 
                  className="progress-bar" 
                  style={{width: `${item.percentage || 0}%`}}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
