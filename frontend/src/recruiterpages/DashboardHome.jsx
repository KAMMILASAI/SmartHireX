import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { FiUsers, FiFileText, FiBriefcase, FiCalendar, FiUserCheck, FiUser, FiMessageCircle } from 'react-icons/fi';
import './DashboardHome.css';

const StatCard = ({ title, value, icon, gradient }) => (
  <div className="rdh-card rdh-stat">
    <div className="head">
      <h3 className="title">{title}</h3>
      <div className={`icon ${gradient}`}>{icon}</div>
    </div>
    <p className="value">{value}</p>
  </div>
);

const QuickAction = ({ title, icon, to, gradient }) => (
  <Link to={to} className={`rdh-quick-item ${gradient}`}>
    <div className="ico">{icon}</div>
    <span>{title}</span>
  </Link>
);

export default function DashboardHome() {
  const [stats, setStats] = useState({
    totalCandidates: 0,
    activeChats: 0,
    drivesConducted: 0,
    totalEmployees: 0,
    charts: {
      candidatesByMonth: [],
      drivesByMonth: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    companyName: 'Your Company',
    location: 'Location not set',
    website: '',
    numEmployees: 0,
    image: ''
  });


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Use Promise.all to fetch both stats and profile in parallel
      try {
        const [statsRes, profileRes] = await Promise.all([
          // Fetch stats from API
          axios.get(`${API_BASE_URL}/recruiter/dashboard-stats`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000 // 5 second timeout
          }).catch(err => {
            console.log('Stats API failed:', err.message);
            return { data: null };
          }),
          
          // Fetch profile with error handling
          axios.get(`${API_BASE_URL}/user/profile`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }).catch(err => {
            console.log('Using default profile data:', err.message);
            return { data: profile }; // Use existing profile state if fetch fails
          })
        ]);
        
        // Process stats response
        const incoming = statsRes.data || {};
        setStats({
          totalCandidates: incoming.totalCandidates ?? 0,
          activeChats: incoming.activeChats ?? 0,
          drivesConducted: incoming.drivesConducted ?? 0,
          totalEmployees: incoming.totalEmployees ?? 0,
          charts: {
            candidatesByMonth: Array.isArray(incoming?.charts?.candidatesByMonth) 
              ? incoming.charts.candidatesByMonth 
              : [],
            drivesByMonth: Array.isArray(incoming?.charts?.drivesByMonth) 
              ? incoming.charts.drivesByMonth 
              : [],
          },
        });
        
        // Process profile response
        if (profileRes.data) {
          setProfile(prev => ({
            ...prev,
            ...profileRes.data,
            companyName: profileRes.data.company || profileRes.data.companyName || prev.companyName,
            location: profileRes.data.location || prev.location,
            numEmployees: profileRes.data.numEmployees || prev.numEmployees,
            website: profileRes.data.companyLink || profileRes.data.website || prev.website,
            image: profileRes.data.image || prev.image
          }));
        }
      } catch (err) {
        console.error('Error in dashboard data fetch:', err);
        // Set empty stats if API fails
        setStats({
          totalCandidates: 0,
          activeChats: 0,
          drivesConducted: 0,
          totalEmployees: 0,
          charts: {
            candidatesByMonth: [],
            drivesByMonth: []
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Safe chart arrays and max scaling
  const candidatesByMonth = Array.isArray(stats?.charts?.candidatesByMonth) ? stats.charts.candidatesByMonth : [];
  const drivesByMonth = Array.isArray(stats?.charts?.drivesByMonth) ? stats.charts.drivesByMonth : [];
  const maxCandidates = Math.max(1, ...candidatesByMonth.map(d => d?.count || 0));
  const maxDrives = Math.max(1, ...drivesByMonth.map(d => d?.count || 0));

  if (loading) {
    return (
      <div className="rdh-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 160 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="rdh-container">
      {/* Welcome Header */}
      <div className="rdh-card rdh-welcome">
        <div className="welcome-main">
          <div className="welcome-avatar" aria-label={profile.companyName || 'Company'}>
            {profile.image ? (
              <img src={profile.image} alt={profile.companyName || 'Company'} />
            ) : (
              <span>{(profile.companyName || 'C')[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="welcome-text">
            <h1>{profile.companyName || 'Your Company'}</h1>
            <p>Recruiter Dashboard</p>
          </div>
        </div>
        <div className="meta">
          {profile.location && <span className="meta-chip">📍 {profile.location}</span>}
          {profile.website && <span className="meta-chip">🌐 {profile.website}</span>}
          <span className="meta-chip">👥 {profile.numEmployees || stats.totalEmployees} employees</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="rdh-grid-4">
        <StatCard 
          title="Candidates Contacted" 
          value={stats.totalCandidates} 
          icon={<FiUsers size={20} />} 
          gradient="grad-blue"
        />
        <StatCard 
          title="Active Conversations" 
          value={stats.activeChats} 
          icon={<FiMessageCircle size={20} />} 
          gradient="grad-green"
        />
        <StatCard 
          title="Drives Conducted" 
          value={stats.drivesConducted} 
          icon={<FiBriefcase size={20} />} 
          gradient="grad-purple"
        />
        <StatCard 
          title="Total Employees" 
          value={profile.numEmployees || stats.totalEmployees} 
          icon={<FiUsers size={20} />} 
          gradient="grad-amber"
        />
      </div>

      {/* Charts */}
      <div className="rdh-grid-2">
        <div className="rdh-card rdh-chart">
          <h3 className="rdh-title">Candidates Contacted</h3>
          <div className="rdh-bars">
            {candidatesByMonth.map((item, index) => {
              const height = (item.count / maxCandidates) * 100;
              const isMax = item.count === maxCandidates && item.count > 0;
              return (
                <div key={index} className={`rdh-bar ${isMax ? 'max' : 'norm'}`} style={{ height: `${height}%` }}>
                  <span className="rdh-label">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rdh-card rdh-chart">
          <h3 className="rdh-title">Drives Conducted</h3>
          <div className="rdh-bars">
            {drivesByMonth.map((item, index) => {
              const height = item.count > 0 ? (item.count / maxDrives) * 100 : 5;
              const isMax = item.count === maxDrives && item.count > 0;
              return (
                <div key={index} className={`rdh-bar ${isMax ? 'max' : 'norm'}`} style={{ height: `${height}%` }}>
                  <span className="rdh-label">
                    {item.month}
                    <span className="rdh-count">{item.count}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rdh-card rdh-quick">
        <h3 className="rdh-title">Quick Actions</h3>
        <div className="rdh-quick-grid">
          <QuickAction 
            title="Generate Test" 
            icon={<FiFileText />}
            to="/recruiter/generate-test"
            gradient="grad-blue"
          />
          <QuickAction 
            title="Schedule Interview" 
            icon={<FiCalendar />}
            to="/recruiter/generate-test"
            gradient="grad-green"
          />
          <QuickAction 
            title="View Candidates" 
            icon={<FiUserCheck />}
            to="/recruiter/candidate-profiles"
            gradient="grad-purple"
          />
          <QuickAction 
            title="Update Profile" 
            icon={<FiUser />}
            to="/recruiter/edit-profile"
            gradient="grad-amber"
          />
        </div>
      </div>
    </div>
  );
}
