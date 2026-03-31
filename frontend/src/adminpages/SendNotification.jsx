import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './SendNotification.css';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

export default function SendNotification() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all'); // Allow audience selection
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: null
  });

  const closeConfirmModal = () => setConfirmModal({ isOpen: false, id: null });

  function formatDateSafe(dt) {
    if (!dt) return '-';
    const ms = Date.parse(dt);
    if (isNaN(ms)) return '-';
    try { return new Date(ms).toLocaleString(); } catch { return '-'; }
  }

  async function fetchNotifications() {
    try {
      setListLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      const res = await axios.get(`${API_BASE_URL}/admin/notifications`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-skip-loader': 'true'  // Background fetch, don't show loader
        }
      });
      setNotifications(res.data || []);
    } catch (e) {
      // Silent fail for list, but log for debugging
      console.error('Failed to load notifications:', e);
    } finally {
      setListLoading(false);
    }
  }

  // Load on mount
  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      await axios.post(`${API_BASE_URL}/admin/notifications`, 
        { title, message, audience },
        {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-skip-loader': 'false'  // Show loader for main action
          }
        }
      );
      setSuccess('Notification sent to all users!');
      showSuccess('Notification sent to all users!');
      setTitle('');
      setMessage('');
      fetchNotifications();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send notification';
      setError(msg);
      showError(msg);
    }
    setLoading(false);
  }

  async function processDelete(id) {
    closeConfirmModal();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      await axios.delete(`${API_BASE_URL}/admin/notifications/${id}`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-skip-loader': 'false'  // Show loader for delete action
        }
      });
      setNotifications(curr => curr.filter(n => n.id !== id));
      showSuccess('Notification deleted successfully');
    } catch (err) {
      console.error('Failed to delete notification:', err);
      const msg = err?.response?.data?.message || 'Failed to delete notification';
      showError(msg);
    }
  }

  function handleDelete(id) {
    setConfirmModal({
      isOpen: true,
      id: id
    });
  }

  return (
    <div className="send-notification-root">
      <h2 className="sn-heading">Send Notification</h2>
      <form className="send-notification-form" onSubmit={handleSubmit}>
        <label className="sn-label" htmlFor="notif-title">Title</label>
        <input className="sn-input"
          id="notif-title"
          name="title"
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
        <textarea className="sn-textarea"
          placeholder="Message"
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
          rows={4}
        />
        <div className="sn-audience-selector">
          <label className="sn-label">Send To:</label>
          <div className="audience-options">
            <label className="radio-option">
              <input 
                type="radio" 
                name="audience" 
                value="all" 
                checked={audience === 'all'}
                onChange={e => setAudience(e.target.value)}
              />
              <span>All Users</span>
            </label>
            <label className="radio-option">
              <input 
                type="radio" 
                name="audience" 
                value="candidate" 
                checked={audience === 'candidate'}
                onChange={e => setAudience(e.target.value)}
              />
              <span>Candidates Only</span>
            </label>
            <label className="radio-option">
              <input 
                type="radio" 
                name="audience" 
                value="recruiter" 
                checked={audience === 'recruiter'}
                onChange={e => setAudience(e.target.value)}
              />
              <span>Recruiters Only</span>
            </label>
          </div>
        </div>
        <div className="send-notification-actions">
          <button type="submit" disabled={loading || !title.trim() || !message.trim()}>
            {loading ? 'Sending...' : `Send to ${audience === 'all' ? 'All Users' : audience === 'candidate' ? 'Candidates' : 'Recruiters'}`}
          </button>
        </div>
      </form>
      {success && <div className="notif-success">{success}</div>}
      {error && <div className="notif-error">{error}</div>}

      <h3 className="sn-subheading">Recent Notifications</h3>
      {listLoading && <div className="notif-list-loading">Loading notifications...</div>}
      {!listLoading && notifications.length === 0 && <div className="notif-empty">No notifications sent yet.</div>}
      {!listLoading && notifications.length > 0 && (
        <div className="notification-list-wrapper">
          <table className="notification-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Message</th>
                <th>Audience</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map(n => (
                <tr key={n.id}>
                  <td>{n.title}</td>
                  <td>{n.message}</td>
                  <td><span className={`badge badge-${n.audience}`}>{n.audience}</span></td>
                  <td>{formatDateSafe(n.createdAt)}</td>
                  <td>
                    <button className="notif-delete-btn" onClick={() => handleDelete(n.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title="Delete Notification"
        message="Are you sure you want to delete this notification? This action cannot be undone."
        onConfirm={() => processDelete(confirmModal.id)}
        onCancel={closeConfirmModal}
        confirmText="Delete Notification"
        type="danger"
      />
    </div>
  );
}
