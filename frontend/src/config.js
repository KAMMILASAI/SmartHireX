// Base API URL (Render/production can override via VITE_API_BASE_URL)
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = configuredApiBaseUrl && configuredApiBaseUrl.trim().length > 0
  ? configuredApiBaseUrl.trim()
  : 'https://smarthirex-vdsn.onrender.com/api';

// Helper function to get auth headers
export const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

// Helper function to get auth headers for file uploads
export const getFileUploadHeaders = () => ({
  'Content-Type': 'multipart/form-data',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});
