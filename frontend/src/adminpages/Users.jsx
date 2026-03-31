import { useEffect, useMemo, useState } from 'react';
import './UserCard.css';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { FiTrash2, FiUserPlus, FiUser, FiMessageSquare } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function Users() {
  const navigate = useNavigate();
  const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'candidates' | 'recruiters'
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [promoteLoading, setPromoteLoading] = useState(null);
  const [failedImages, setFailedImages] = useState(() => new Set());
  
  const { showSuccess, showError } = useToast();

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger',
    confirmText: 'Delete'
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [candRes, recRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/admin/candidates`, { headers }),
          axios.get(`${API_BASE_URL}/admin/recruiters`, { headers })
        ]);
        setCandidates(Array.isArray(candRes.data) ? candRes.data : []);
        setRecruiters(Array.isArray(recRes.data) ? recRes.data : []);
      } catch (e) {
        setError('Failed to load users');
        showError('Failed to load users data.');
      }
      setLoading(false);
    }
    fetchAll();
  }, [showError]);

  const handleDeleteCandidate = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Candidate',
      message: `Are you sure you want to delete candidate "${name}"? This will permanently remove all associated data including exam results and applications.`,
      confirmText: 'Delete Candidate',
      type: 'danger',
      onConfirm: async () => {
        closeConfirmModal();
        setDeleteLoading(`c-${id}`);
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API_BASE_URL}/admin/candidates/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCandidates(prev => prev.filter(u => (u._id ?? u.id) !== id));
          showSuccess('Candidate deleted successfully');
        } catch (e) {
          showError(e.response?.data?.message || 'Failed to delete candidate');
        }
        setDeleteLoading(null);
      }
    });
  };

  const handleDeleteRecruiter = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Recruiter',
      message: `Are you sure you want to delete recruiter "${name}"? This will permanently remove all their job postings, rounds, and associated candidate results.`,
      confirmText: 'Delete Recruiter',
      type: 'danger',
      onConfirm: async () => {
        closeConfirmModal();
        setDeleteLoading(`r-${id}`);
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API_BASE_URL}/admin/recruiters/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setRecruiters(prev => prev.filter(u => (u._id ?? u.id) !== id));
          showSuccess('Recruiter deleted successfully');
        } catch (e) {
          showError(e.response?.data?.message || 'Failed to delete recruiter');
        }
        setDeleteLoading(null);
      }
    });
  };

  const handlePromoteToRecruiter = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: 'Promote to Recruiter',
      message: `Do you want to promote candidate "${name}" to a recruiter role? They will gain full administrative access to create jobs and manage rounds.`,
      confirmText: 'Promote User',
      type: 'info',
      onConfirm: async () => {
        closeConfirmModal();
        setPromoteLoading(`c-${id}`);
        try {
          const token = localStorage.getItem('token');
          const response = await axios.post(`${API_BASE_URL}/admin/promote-to-recruiter/${id}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.user) {
            setCandidates(prev => prev.filter(u => (u._id ?? u.id) !== id));
            const promotedUser = response.data.user;
            setRecruiters(prev => [...prev, {
              id: promotedUser.id,
              _id: promotedUser.id,
              firstName: name.split(' ')[0] || '',
              lastName: name.split(' ').slice(1).join(' ') || '',
              email: promotedUser.email,
              role: promotedUser.role,
              createdAt: new Date().toISOString()
            }]);
            showSuccess('User promoted to recruiter role successfully');
          }
        } catch (e) {
          showError(e.response?.data?.message || 'Failed to promote candidate');
        }
        setPromoteLoading(null);
      }
    });
  };

  // Build the list based on active tab with strict role checks to avoid cross-list leakage
  const list = useMemo(() => {
    const isCandidate = (u) => (u.role || '').toLowerCase() === 'candidate';
    const isRecruiter = (u) => (u.role || '').toLowerCase() === 'recruiter';

    if (activeTab === 'candidates') {
      return candidates.filter(isCandidate).map(u => ({ ...u, __type: 'candidate' }));
    }
    if (activeTab === 'recruiters') {
      return recruiters.filter(isRecruiter).map(u => ({ ...u, __type: 'recruiter' }));
    }
    // all: merge both, enforcing role-based membership
    const c = candidates.filter(isCandidate).map(u => ({ ...u, __type: 'candidate' }));
    const r = recruiters.filter(isRecruiter).map(u => ({ ...u, __type: 'recruiter' }));
    return [...c, ...r];
  }, [activeTab, candidates, recruiters]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(u =>
      (u.name || `${u.firstName || ''} ${u.lastName || ''}` || '')
        .toLowerCase()
        .includes(q) || (u.email || '').toLowerCase().includes(q)
    );
  }, [list, query]);

  return (
    <div className="user-list-container">
      <div className="users-toolbar">
        <h2>Users</h2>
        <div className="toolbar-right">
          <select
            className="filter-select"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            <option value="all">All Users</option>
            <option value="candidates">Candidates</option>
            <option value="recruiters">Recruiters</option>
          </select>
          <input
            className="search-input"
            placeholder="Search by name or email"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div className="user-card-list">
        {filtered.length === 0 && !loading && (
          <div className="empty-state">
            <h3>No users found</h3>
            <p>Try adjusting your search or switching tabs.</p>
          </div>
        )}
        {filtered.map((user) => {
          const name = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
          const uid = user._id ?? user.id;
          const role = (user.role || '').toLowerCase();
          const derivedType = role === 'candidate' ? 'candidate' : role === 'recruiter' ? 'recruiter' : undefined;
          const type = user.__type || derivedType || (activeTab === 'candidates' ? 'candidate' : 'recruiter');
          const isDeleting = deleteLoading === `${type === 'candidate' ? 'c' : 'r'}-${uid}`;
          const isPromoting = promoteLoading === `c-${uid}`;
          const resolveImage = () => {
            const img = user.image;
            if (img && typeof img === 'string' && img.trim()) {
              if (/^https?:/i.test(img)) return img; // Cloudinary or full URL
              return img.startsWith('/') ? `${API_ORIGIN}${img}` : `${API_ORIGIN}/${img}`;
            }
            return null;
          };
          const profileImage = resolveImage();
          const imageBroken = failedImages.has(String(uid));
          const userInitial = (name || 'U').trim()[0]?.toUpperCase() || 'U';
          return (
            <div className="user-card" key={`${type}-${uid}`}>
              <div className="user-avatar-wrapper">
                {profileImage && !imageBroken ? (
                  <img
                    className="user-avatar"
                    src={profileImage}
                    alt={name || 'User'}
                    onError={() => {
                      setFailedImages((prev) => {
                        const next = new Set(prev);
                        next.add(String(uid));
                        return next;
                      });
                    }}
                  />
                ) : (
                  <div className="user-avatar user-avatar-placeholder" aria-label={name || 'User'}>
                    {userInitial}
                  </div>
                )}
              </div>

              <div className="user-info">
                <h3 className="user-name">{name}</h3>
                <p className="user-email">{user.email}</p>
              </div>

              <div className="user-card-actions">
                {type === 'candidate' && (
                  <button
                    className={`action-btn promote-btn ${isPromoting ? 'btn-loading' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePromoteToRecruiter(uid, name);
                    }}
                    disabled={isPromoting}
                  >
                    {isPromoting ? (
                      <div className="spinner-sm"></div>
                    ) : (
                      <>
                        <FiUserPlus size={14} />
                        <span>Promote</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  className="action-btn message-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/admin/chat', { state: { targetUserId: uid } });
                  }}
                >
                  <FiMessageSquare size={14} />
                  <span>Message</span>
                </button>
                
                <button
                  className={`action-btn delete-btn ${isDeleting ? 'btn-loading' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    type === 'candidate' 
                      ? handleDeleteCandidate(uid, name) 
                      : handleDeleteRecruiter(uid, name);
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <div className="spinner-sm"></div>
                  ) : (
                    <>
                      <FiTrash2 size={14} />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
}
