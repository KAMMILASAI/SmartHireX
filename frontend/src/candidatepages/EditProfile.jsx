import React, { useRef, useState, useEffect } from 'react';
import { FiUser, FiUpload, FiSave, FiArrowLeft, FiLinkedin, FiGithub, FiExternalLink, FiBriefcase, FiLink } from 'react-icons/fi';
import { FaLinkedin, FaGithub } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';
import './EditProfile.css';
import TagInput from '../components/TagInput';
import '../components/TagInput.css';
import AvatarPicker from '../components/AvatarPicker';
import { useToast } from '../contexts/ToastContext';

export default function EditProfile() {
  const userData = JSON.parse(localStorage.getItem('user')) || {};
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
  
  // Helper function to ensure skills is always an array
  const normalizeSkills = (skills) => {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') return skills.split(',').map(s => s.trim()).filter(s => s);
    return [];
  };

  const [form, setForm] = useState({
    image: userData.image || '',
    name: userData.name || '',
    email: userData.email || '',
    profileType: userData.profileType || 'student', // 'student' | 'postgraduate'
    isFresher: userData.isFresher || false,
    degree: userData.degree || '',
    college: userData.college || '',
    cgpa: userData.cgpa || '',
    company: userData.company || '',
    lpa: userData.lpa || '',
    yearsExp: userData.yearsExp || '',
    regNo: userData.regNo || '',
    location: userData.location || '',
    portfolio: userData.portfolio || '',
    github: userData.github || '',
    linkedin: userData.linkedin || '',
    skills: normalizeSkills(userData.skills),
    phone: userData.phone || ''
  });
  // State for form sections
  const [activeSection, setActiveSection] = useState('personal');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/candidate/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setForm(prev => ({
          ...prev,
          ...res.data,
          profileType: res.data.profileType || prev.profileType,
          isFresher: !!res.data.isFresher,
          degree: res.data.degree || '',
          college: res.data.college || '',
          cgpa: res.data.cgpa ?? '',
          company: res.data.company || '',
          lpa: res.data.lpa ?? '',
          yearsExp: res.data.yearsExp ?? '',
          skills: normalizeSkills(res.data.skills)
        }));
        setImagePreview(res.data.image || null);
        console.log('Profile loaded:', res.data);
      } catch (err) {
        showError('Failed to load profile: ' + (err.response?.data?.message || err.message));
        console.error('Profile load error:', err);
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
      showSuccess('Avatar updated successfully');

      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, image: imageUrl }));
      } catch (_) {}
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
    formData.append('image', file); // Changed from 'file' to 'image' to match backend expectation
    
    try {
      const token = localStorage.getItem('token');
      setImagePreview(URL.createObjectURL(file));
      
      // Make sure API_BASE_URL doesn't have a trailing slash
      const apiUrl = getProfilePhotoApiUrl();
        
      const response = await axios.patch(
        apiUrl,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          withCredentials: false // Changed to false to see if it resolves CORS
        }
      );
      
      setForm(f => ({ ...f, image: response.data.imageUrl || response.data.image }));
      showSuccess('Profile photo updated successfully');
    } catch (error) {
      console.error('Image upload failed', error);
      showError('Failed to upload image. Please try again.');
    } finally {
      // Reset file input to allow selecting the same file again
      e.target.value = '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const scrollContainer = document.querySelector('.dashboard-main');
    const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      // Convert skills array back to comma-separated string for backend
      const dataToSend = {
        ...form,
        skills: Array.isArray(form.skills) ? form.skills.join(',') : (form.skills || ''),
      };
      Object.entries(dataToSend).forEach(([k, v]) => formData.append(k, v));
      const res = await axios.put(`${API_BASE_URL}/candidate/profile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });
      showSuccess('Profile updated successfully!');
      setForm(prev => ({ ...prev, ...res.data, skills: normalizeSkills(res.data.skills) }));
      setImagePreview(res.data.image || null);
      // Update localStorage so DashboardLayout header reflects new name
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, name: res.data?.name ?? stored.name, image: res.data?.image ?? stored.image }));
      } catch (_) {}
      console.log('Profile updated:', res.data);
    } catch (err) {
      console.error('Profile update error:', err);
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
        <h1>Edit Profile</h1>
        <p>Keep your professional profile up to date to attract the best opportunities.</p>
      </div>

      <div className="ep-card">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar-container" onClick={handleImageClick}>
            <div className="profile-avatar">
              {imagePreview || form.image ? (
                <img src={imagePreview || form.image} alt="Profile" className="profile-avatar-img" />
              ) : (
                <FiUser className="profile-avatar-icon" />
              )}
            </div>
            <div className="ep-avatar-overlay">
              <FiUpload size={24} />
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="profile-upload-input"
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
        </div>

        <AvatarPicker
          open={showAvatarPicker}
          onClose={() => setShowAvatarPicker(false)}
          onSelect={handleAvatarSelect}
          selectedAvatar={imagePreview || form.image || ''}
        />

        <form onSubmit={handleSubmit}>
          <div className="ep-section">
            <h2 className="ep-section-title">
              <FiUser /> Personal Information
            </h2>
            <div className="profile-form-grid">
              <div className="profile-form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={form.name || ''} 
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required 
                />
              </div>
              
              <div className="profile-form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  value={form.email || ''} 
                  disabled
                  className="input-disabled"
                />
              </div>
              
              <div className="profile-form-group">
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={form.phone || ''} 
                  onChange={handleChange}
                  placeholder="+91 "
                />
              </div>
              
              <div className="profile-form-group">
                <label>Location</label>
                <input 
                  type="text" 
                  name="location" 
                  value={form.location || ''} 
                  onChange={handleChange}
                  placeholder="City, Country"
                />
              </div>

              <div className="profile-form-group">
                <label>College Registration No.</label>
                <input 
                  type="text" 
                  name="regNo" 
                  value={form.regNo || ''} 
                  onChange={handleChange}
                  placeholder="Registration Number"
                />
              </div>
            </div>
          </div>

          <div className="ep-section">
            <h2 className="ep-section-title">
              <FiBriefcase /> Education & Experience
            </h2>
            
            <div className="profile-form-group" style={{ marginBottom: '2rem' }}>
              <div className="ep-radio-group">
                <span style={{ marginRight: '1rem', fontWeight: 600 }}>Profile Type:</span>
                <label className="ep-radio-label">
                  <input 
                    type="radio" 
                    name="profileType" 
                    value="student" 
                    checked={form.profileType === 'student'} 
                    onChange={handleChange} 
                  />
                  <span>Student</span>
                </label>
                <label className="ep-radio-label" style={{ marginLeft: '1rem' }}>
                  <input 
                    type="radio" 
                    name="profileType" 
                    value="postgraduate" 
                    checked={form.profileType === 'postgraduate'} 
                    onChange={handleChange}
                  />
                  <span>Post Graduate</span>
                </label>
              </div>
            </div>

            <div className="profile-form-grid">
              {form.profileType === 'postgraduate' && (
                <div className="profile-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="ep-checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!form.isFresher}
                      onChange={(e) => setForm(f => ({ ...f, isFresher: e.target.checked }))}
                    />
                    <span style={{ marginLeft: '0.5rem' }}>I am a fresher</span>
                  </label>
                </div>
              )}

              {form.profileType === 'postgraduate' && form.isFresher && (
                <div className="profile-form-group">
                  <label>Graduation Degree</label>
                  <select 
                    name="degree" 
                    value={form.degree || ''} 
                    onChange={handleChange}
                    className="profile-select"
                  >
                    <option value="">Select degree</option>
                    <option value="BTech">BTech</option>
                    <option value="BE">BE</option>
                    <option value="MTech">MTech</option>
                    <option value="ME">ME</option>
                    <option value="BSc">BSc</option>
                    <option value="MSc">MSc</option>
                    <option value="BCA">BCA</option>
                    <option value="MCA">MCA</option>
                    <option value="MBA">MBA</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              {(form.profileType === 'student' || (form.profileType === 'postgraduate' && form.isFresher)) && (
                <>
                  <div className="profile-form-group">
                    <label>College</label>
                    <input 
                      type="text" 
                      name="college" 
                      value={form.college || ''} 
                      onChange={handleChange} 
                      placeholder="College Name"
                    />
                  </div>
                  <div className="profile-form-group">
                    <label>CGPA</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="cgpa" 
                      value={form.cgpa || ''} 
                      onChange={handleChange} 
                      placeholder="e.g. 8.5"
                    />
                  </div>
                </>
              )}

              {form.profileType === 'postgraduate' && !form.isFresher && (
                <>
                  <div className="profile-form-group">
                    <label>Company Name</label>
                    <input 
                      type="text" 
                      name="company" 
                      value={form.company || ''} 
                      onChange={handleChange} 
                      placeholder="Current or last company"
                    />
                  </div>
                  <div className="profile-form-group">
                    <label>Current/Last CTC (LPA)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      name="lpa" 
                      value={form.lpa || ''} 
                      onChange={handleChange}
                      placeholder="e.g. 6.5"
                    />
                  </div>
                  <div className="profile-form-group">
                    <label>Years of Experience</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      min="0"
                      name="yearsExp" 
                      value={form.yearsExp || ''} 
                      onChange={handleChange}
                      placeholder="e.g. 2.5"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="ep-section">
            <h2 className="ep-section-title">
              <FiLink /> Links & Socials
            </h2>
            <div className="profile-form-grid">
              <div className="profile-form-group">
                <label>Portfolio Website</label>
                <div className="input-with-icon">
                  <FiExternalLink />
                  <input 
                    type="url" 
                    name="portfolio" 
                    value={form.portfolio || ''} 
                    onChange={handleChange}
                    placeholder="https://yourportfolio.com"
                  />
                </div>
              </div>

              <div className="profile-form-group">
                <label>GitHub Profile</label>
                <div className="input-with-icon">
                  <FiGithub />
                  <input 
                    type="url" 
                    name="github" 
                    value={form.github || ''} 
                    onChange={handleChange}
                    placeholder="https://github.com/username"
                  />
                </div>
              </div>

              <div className="profile-form-group">
                <label>LinkedIn Profile</label>
                <div className="input-with-icon">
                  <FiLinkedin />
                  <input 
                    type="url" 
                    name="linkedin" 
                    value={form.linkedin || ''} 
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="ep-section">
            <h2 className="ep-section-title">
              <FiBriefcase /> Professional Skills
            </h2>
            <div className="skills-section">
              <TagInput 
                tags={Array.isArray(form.skills) ? form.skills : (form.skills ? [form.skills] : [])}
                setTags={(newTags) => setForm(f => ({ ...f, skills: newTags }))}
                placeholder="Add skills (e.g., JavaScript, React, Python)"
              />
            </div>
          </div>

          <div className="profile-actions">
            <Link to="/candidate/dashboard" className="ep-btn-back">
              <FiArrowLeft /> Back to Dashboard
            </Link>
            <button type="submit" className="profile-submit-btn">
              <FiSave /> Save Profile Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
