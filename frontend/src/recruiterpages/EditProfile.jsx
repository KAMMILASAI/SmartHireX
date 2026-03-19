import React, { useRef, useState, useEffect } from 'react';
import { FiUser, FiUpload, FiSave, FiArrowLeft, FiLinkedin, FiGithub, FiExternalLink, FiBriefcase, FiLink } from 'react-icons/fi';
import { FaLinkedin, FaGithub } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';
import './EditProfile.css';
import AvatarPicker from '../components/AvatarPicker';
import { useToast } from '../contexts/ToastContext';

export default function EditProfile() {
  // Get user data from localStorage or context if available
  const userData = JSON.parse(localStorage.getItem('user')) || {};
  const [form, setForm] = useState(() => ({
    image: userData?.image ?? '',
    name: userData?.name ?? '',
    email: userData?.email ?? '',
    company: userData?.company ?? '',
    companyLink: userData?.companyLink ?? '',
    linkedin: userData?.linkedin ?? '',
    github: userData?.github ?? '',
    location: userData?.location ?? '',
    numEmployees: userData?.numEmployees ?? '',
    bio: userData?.bio ?? '',
    phone: userData?.phone ?? ''
  }));
  const [imagePreview, setImagePreview] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileInputRef = useRef();
  const { showSuccess, showError } = useToast();

  const getProfilePhotoApiUrl = () => (
    API_BASE_URL.endsWith('/')
      ? `${API_BASE_URL}user/profile-photo`
      : `${API_BASE_URL}/user/profile-photo`
  );

  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setForm({
          image: res.data?.image ?? '',
          name: res.data?.name ?? '',
          email: res.data?.email ?? '',
          company: res.data?.company ?? '',
          companyLink: res.data?.companyLink ?? '',
          linkedin: res.data?.linkedin ?? '',
          github: res.data?.github ?? '',
          location: res.data?.location ?? '',
          numEmployees: res.data?.numEmployees ?? '',
          bio: res.data?.bio ?? '',
          phone: res.data?.phone ?? ''
        });
        setImagePreview(res.data?.image ?? null);
      } catch (err) {
        showError('Failed to load profile: ' + (err.response?.data?.message || err.message));
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

      const avatarResponse = await fetch(avatarPath);
      if (!avatarResponse.ok) {
        throw new Error('Failed to load selected avatar');
      }

      const avatarBlob = await avatarResponse.blob();
      const extension = avatarPath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
      const avatarFile = new File([avatarBlob], `avatar-${Date.now()}.${extension}`, {
        type: avatarBlob.type || `image/${extension}`
      });

      const data = new FormData();
      data.append('image', avatarFile);

      const res = await axios.patch(getProfilePhotoApiUrl(), data, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });

      const imageUrl = res.data?.image || res.data?.imageUrl || avatarPath;
      setForm((f) => ({ ...f, image: imageUrl }));
      setImagePreview(imageUrl);
      showSuccess('Avatar updated successfully');

      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, image: imageUrl }));
      } catch (_) {}
    } catch (err) {
      setImagePreview(previousImage || null);
      showError('Failed to set avatar. Please try again.');
    } finally {
      setShowAvatarPicker(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      data.append('image', file);
      const res = await axios.patch(getProfilePhotoApiUrl(), data, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });
      setForm(f => ({ ...f, image: res.data?.image ?? '' }));
      showSuccess('Profile photo updated successfully');
    } catch (err) {
      console.error('Image upload failed', err);
      showError('Image upload failed. Please try again.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value ?? '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const scrollContainer = document.querySelector('.dashboard-main');
    const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
    try {
      const token = localStorage.getItem('token');
      const payload = { ...form };
      const res = await axios.put(`${API_BASE_URL}/user/profile`, payload, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      showSuccess('Profile updated successfully!');
      const updated = {
        ...res.data,
        image: res.data?.image ?? '',
        name: res.data?.name ?? '',
        email: res.data?.email ?? '',
        company: res.data?.company ?? '',
        companyLink: res.data?.companyLink ?? '',
        linkedin: res.data?.linkedin ?? '',
        github: res.data?.github ?? '',
        location: res.data?.location ?? '',
        numEmployees: res.data?.numEmployees ?? '',
        bio: res.data?.bio ?? '',
        phone: res.data?.phone ?? ''
      };
      setForm(updated);
      setImagePreview(res.data?.image ?? null);
      // Update localStorage so DashboardLayout header reflects new name
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, name: res.data?.name ?? stored.name, image: res.data?.image ?? stored.image }));
      } catch (_) {}
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

  return (
    <div className="ep-container">
      <div className="ep-header">
        <h1>Edit Your Profile</h1>
        <p>Update your personal information, company details, and social links to keep your profile current.</p>
      </div>

      <div className="ep-card">
        <div className="ep-avatar-upload" onClick={handleImageClick}>
          {imagePreview ? (
            <img src={imagePreview} alt="Profile" className="ep-avatar" />
          ) : (
            <div className="ep-avatar-placeholder">
              <FiUser />
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <span className="ep-avatar-upload-label">
            <FiUpload /> Change Photo
          </span>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          style={{
            marginTop: '8px',
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

        <AvatarPicker
          open={showAvatarPicker}
          onClose={() => setShowAvatarPicker(false)}
          onSelect={handleAvatarSelect}
          selectedAvatar={imagePreview || form.image || ''}
        />

        <h2 className="ep-section-title">
          <FiUser /> Personal Information
        </h2>

        <div className="ep-form-grid">
          <div className="ep-form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="ep-form-control"
              placeholder="Enter your full name"
            />
          </div>

          <div className="ep-form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="ep-form-control"
              placeholder="Enter your email"
              disabled
            />
          </div>

          <div className="ep-form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="ep-form-control"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className="ep-form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={form.location}
              onChange={handleChange}
              className="ep-form-control"
              placeholder="City, Country"
            />
          </div>
        </div>

        <div className="ep-form-group">
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            name="bio"
            value={form.bio}
            onChange={handleChange}
            className="ep-form-control"
            rows="4"
            placeholder="Tell us about yourself and your role..."
          ></textarea>
        </div>
      </div>

      <div className="ep-card">
        <h2 className="ep-section-title">
          <FiBriefcase /> Company Information
        </h2>

        <div className="ep-form-grid">
          <div className="ep-form-group">
            <label htmlFor="company">Company Name</label>
            <input
              type="text"
              id="company"
              name="company"
              value={form.company}
              onChange={handleChange}
              className="ep-form-control"
              placeholder="Company name"
            />
          </div>

          <div className="ep-form-group">
            <label htmlFor="companyLink">Company Website</label>
            <div style={{ position: 'relative' }}>
              <input
                type="url"
                id="companyLink"
                name="companyLink"
                value={form.companyLink}
                onChange={handleChange}
                className="ep-form-control"
                placeholder="https://company.com"
              />
              {form.companyLink && (
                <a 
                  href={form.companyLink.startsWith('http') ? form.companyLink : `https://${form.companyLink}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ep-social-link"
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none'
                  }}
                >
                  <FiExternalLink size={16} />
                </a>
              )}
            </div>
          </div>

          <div className="ep-form-group">
            <label htmlFor="numEmployees">Number of Employees</label>
            <select
              id="numEmployees"
              name="numEmployees"
              value={form.numEmployees}
              onChange={handleChange}
              className="ep-form-control"
            >
              <option value="">Select size</option>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-500">201-500 employees</option>
              <option value="501-1000">501-1000 employees</option>
              <option value="1001-5000">1001-5000 employees</option>
              <option value="5000+">5000+ employees</option>
            </select>
          </div>
        </div>
      </div>

      <div className="ep-card">
        <h2 className="ep-section-title">
          <FiLink /> Social Links
        </h2>

        <div className="ep-form-grid">
          <div className="ep-form-group">
            <label htmlFor="linkedin">
              <FaLinkedin style={{ marginRight: '8px', color: '#0A66C2' }} />
              LinkedIn Profile
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="url"
                id="linkedin"
                name="linkedin"
                value={form.linkedin}
                onChange={handleChange}
                className="ep-form-control"
                placeholder="https://linkedin.com/in/username"
              />
              {form.linkedin && (
                <a 
                  href={form.linkedin.startsWith('http') ? form.linkedin : `https://${form.linkedin}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ep-social-link"
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none'
                  }}
                >
                  <FiExternalLink size={16} />
                </a>
              )}
            </div>
          </div>

          <div className="ep-form-group">
            <label htmlFor="github">
              <FaGithub style={{ marginRight: '8px' }} />
              GitHub Profile
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="url"
                id="github"
                name="github"
                value={form.github}
                onChange={handleChange}
                className="ep-form-control"
                placeholder="https://github.com/username"
              />
              {form.github && (
                <a 
                  href={form.github.startsWith('http') ? form.github : `https://${form.github}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ep-social-link"
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none'
                  }}
                >
                  <FiExternalLink size={16} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="ep-form-actions">
        <Link to="/recruiter/dashboard" className="ep-btn ep-btn-outline">
          <FiArrowLeft /> Back to Dashboard
        </Link>
        <button type="button" className="ep-btn ep-btn-primary" onClick={handleSubmit}>
          <FiSave /> Save Changes
        </button>
      </div>
    </div>
  );
}

