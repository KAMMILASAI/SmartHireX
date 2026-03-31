import React, { useRef, useState, useEffect } from 'react';
import { FiUser, FiUpload, FiSave, FiArrowLeft, FiGlobe, FiPhone } from 'react-icons/fi';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';
import './EditProfile.css';
import AvatarPicker from '../components/AvatarPicker';
import { useToast } from '../contexts/ToastContext';

export default function AdminEditProfile() {
  const [isLoading, setIsLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileInputRef = useRef();
  const { showSuccess, showError } = useToast();

  const getProfilePhotoApiUrl = () => (
    API_BASE_URL.endsWith('/')
      ? `${API_BASE_URL}user/profile-photo`
      : `${API_BASE_URL}/user/profile-photo`
  );

  const getProfileAvatarApiUrl = () => (
    API_BASE_URL.endsWith('/')
      ? `${API_BASE_URL}user/profile-avatar`
      : `${API_BASE_URL}/user/profile-avatar`
  );
  
  const [form, setForm] = useState({
    image: '',
    name: '',
    email: '',
    phone: '',
    website: ''
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const userData = res.data;
        setForm({
          image: userData.image || '',
          name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          email: userData.email || '',
          phone: userData.phone || '',
          website: userData.website || userData.portfolio || ''
        });
        setImagePreview(userData.image || null);
      } catch (err) {
        showError('Failed to load profile: ' + (err.response?.data?.message || err.message));
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [showError]);

  const handleImageClick = () => setShowAvatarPicker(true);

  const handleAvatarSelect = async (avatarPath) => {
    const token = localStorage.getItem('token');
    const previousImage = imagePreview || form.image || '';

    try {
      setImagePreview(avatarPath);

      const params = new URLSearchParams();
      params.append('avatarPath', avatarPath);
      const response = await axios.patch(`${getProfileAvatarApiUrl()}?${params.toString()}`, null, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const imageUrl = response.data.imageUrl || response.data.image || avatarPath;
      setForm((f) => ({ ...f, image: imageUrl }));
      setImagePreview(imageUrl);

      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, image: imageUrl }));

      showSuccess('Avatar updated successfully');
    } catch (error) {
      setImagePreview(previousImage || null);
      showError('Failed to set avatar. Please try again.');
    } finally {
      setShowAvatarPicker(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const token = localStorage.getItem('token');
      setImagePreview(URL.createObjectURL(file));
      
      const response = await axios.patch(
        getProfilePhotoApiUrl(),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const imageUrl = response.data.imageUrl || response.data.image;
      setForm(f => ({ ...f, image: imageUrl }));
      
      // Update localStorage
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, image: imageUrl }));
      
      showSuccess('Profile photo updated successfully');
    } catch (error) {
      showError('Failed to upload image. Please try again.');
    } finally {
      e.target.value = '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const scrollContainer = document.querySelector('.dashboard-main');
    const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
    try {
      const token = localStorage.getItem('token');
      
      // Since it's admin, we might need a specific endpoint or use a general one
      // If there's no specific admin update, we can use the general user profile update if it exists
      // For now, let's assume we can update name, phone, website
      await axios.put(`${API_BASE_URL}/user/profile`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showSuccess('Profile updated successfully!');
      
      // Update localStorage
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ 
        ...stored, 
        name: form.name,
        phone: form.phone,
        website: form.website
      }));
      
    } catch (err) {
      showError('Failed to update profile: ' + (err.response?.data?.message || err.message));
    } finally {
      requestAnimationFrame(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop = savedScrollTop;
        } else {
          window.scrollTo(0, savedScrollTop);
        }
      });
    }
  };

  if (isLoading) return <div className="admin-ep-loading">Loading profile...</div>;

  return (
    <div className="admin-ep-container">
      <div className="admin-ep-card">
        <div className="admin-ep-header">
          <h1 className="admin-ep-title">Admin Profile</h1>
          <p className="admin-ep-subtitle">Manage your account information</p>
        </div>
        
        <div className="admin-ep-avatar-section">
          <div className="admin-ep-avatar-wrapper" onClick={handleImageClick}>
            <img
              src={imagePreview || form.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(form.name || 'Admin') + '&background=0ea5e9&color=fff&size=128'}
              alt="Profile"
              className="admin-ep-avatar"
            />
            <div className="admin-ep-avatar-overlay">
              <FiUpload size={24} />
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            style={{
              marginTop: '10px',
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#e2e8f0',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer'
            }}
          >
            Upload From Device
          </button>
          <p className="admin-ep-upload-hint">Click to change profile picture</p>
        </div>

        <AvatarPicker
          open={showAvatarPicker}
          onClose={() => setShowAvatarPicker(false)}
          onSelect={handleAvatarSelect}
          selectedAvatar={imagePreview || form.image || ''}
        />

        <form onSubmit={handleSubmit} className="admin-ep-form">
          <div className="admin-ep-form-group">
            <label><FiUser /> Full Name</label>
            <input 
              type="text" 
              name="name" 
              value={form.name} 
              onChange={handleChange}
              placeholder="Enter your full name"
              required 
            />
          </div>
          
          <div className="admin-ep-form-group">
            <label>Email Address (Read-only)</label>
            <input 
              type="email" 
              value={form.email} 
              disabled
              className="admin-ep-input-disabled"
            />
          </div>
          
          <div className="admin-ep-form-group">
            <label><FiPhone /> Phone Number</label>
            <input 
              type="tel" 
              name="phone" 
              value={form.phone} 
              onChange={handleChange}
              placeholder="+91 1234567890"
            />
          </div>
          
          <div className="admin-ep-form-group">
            <label><FiGlobe /> Website</label>
            <input 
              type="url" 
              name="website" 
              value={form.website} 
              onChange={handleChange}
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div className="admin-ep-actions">
            <Link to="/admin/dashboard" className="admin-ep-btn-secondary">
              <FiArrowLeft /> Back
            </Link>
            <button type="submit" className="admin-ep-btn-primary">
              <FiSave /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
