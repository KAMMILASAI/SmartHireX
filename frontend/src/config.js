// Base API URL
export const API_BASE_URL = 'http://localhost:8080/api';

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
