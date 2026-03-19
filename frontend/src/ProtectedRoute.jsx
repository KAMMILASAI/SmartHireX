import { Navigate, useLocation } from 'react-router-dom';
import Unauthorized from './components/Unauthorized';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = userData.role?.toLowerCase() || '';

  // If no token, redirect to login with return URL
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no specific roles required, allow access
  if (allowedRoles.length === 0) {
    return children;
  }

  // Check if user has required role (handle 'ROLE_' prefix if present)
  const hasRequiredRole = allowedRoles.some(role => {
    const r = role.toLowerCase();
    return r === userRole || `role_${r}` === userRole;
  });

  // If user has required role, render the children
  if (hasRequiredRole) {
    return children;
  }

  // If user is authenticated but doesn't have required role
  return <Unauthorized />;
};

export default ProtectedRoute;
