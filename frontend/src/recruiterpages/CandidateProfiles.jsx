import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import '../adminpages/UserCard.css';

export default function CandidateProfiles() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCandidates() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/admin/candidates`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCandidates(res.data);
      } catch (err) {
        setError('Failed to load candidates');
      }
      setLoading(false);
    }
    fetchCandidates();
  }, []);

  return (
    <div className="user-list-container">
      <h2>Candidates</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{color: 'red'}}>{error}</div>}
      <div className="user-card-list">
        {candidates.map(user => (
          <div className="user-card" key={user._id}>
            <div className="user-card-header">
              <img className="user-avatar" src={user.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.firstName || 'User') + '&background=6366f1&color=fff'} alt={user.name || user.firstName} />
              <div className="user-info">
                <div className="user-name">{user.name || (user.firstName + ' ' + (user.lastName || ''))}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
              <div className="user-meta">
                <div>College: <b>{user.college || '-'}</b></div>
                {user.cgpa && <div>CGPA: <b>{user.cgpa}</b></div>}
                {user.degree && <div>Degree: <b>{user.degree}</b></div>}
                {user.location && <div>Location: <b>{user.location}</b></div>}
                {user.resumeScore > 0 && <div>Resume Score: <b>{user.resumeScore}%</b></div>}
              </div>
              
            {/* Social Links */}
            <div className="social-links">
              {user.linkedin && (
                <a 
                  href={user.linkedin.startsWith('http') ? user.linkedin : `https://${user.linkedin}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  🔗 LinkedIn
                </a>
              )}
              {user.github && (
                <a 
                  href={user.github.startsWith('http') ? user.github : `https://${user.github}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  💻 GitHub
                </a>
              )}
              {user.portfolio && (
                <a 
                  href={user.portfolio.startsWith('http') ? user.portfolio : `https://${user.portfolio}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  🌐 Portfolio
                </a>
              )}
            </div>

            {/* Skills */}
            {user.skills && (
              <div className="skills">
                <div>Skills:</div>
                <div>
                  {user.skills.split(',').slice(0, 3).map((skill, index) => (
                    <span key={index}>
                      {skill.trim()}
                    </span>
                  ))}
                  {user.skills.split(',').length > 3 && (
                    <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                      +{user.skills.split(',').length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
