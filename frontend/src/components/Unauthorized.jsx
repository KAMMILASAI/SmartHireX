import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaUserAstronaut } from 'react-icons/fa';
import './Unauthorized.css';

const Unauthorized = () => {
  const navigate = useNavigate();

  const goBack = () => navigate(-1);
  const goHome = () => {
    // Clear potentially inconsistent auth state
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Navigate to home
    navigate('/');
  };

  const handleLoginClick = () => {
    // Clear potentially inconsistent auth state to break redirection loops
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Navigate to home and show login form
    navigate('/', { 
      state: { 
        showAuthForm: 'login'
      } 
    });
  };

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-card">
        <div className="unauthorized-icon-container">
          <div className="unauthorized-icon-wrapper">
            <FaUserAstronaut className="unauthorized-icon" />
          </div>
        </div>
        
        {/* Alien emoji with animation */}
        <div className="alien-emoji">👽</div>
        
        <h1 className="unauthorized-title">Access Denied</h1>
        <p className="unauthorized-message">
          You don't have permission to access this page. Please log in with the appropriate account.
        </p>
        
        <div className="unauthorized-buttons">
          <button
            onClick={goBack}
            className="unauthorized-button unauthorized-button-primary"
            aria-label="Go back to previous page"
          >
            <FaArrowLeft className="unauthorized-button-icon" />
            Go Back
          </button>
          
          <button
            onClick={goHome}
            className="unauthorized-button unauthorized-button-secondary"
            aria-label="Go to home page"
          >
            <FaHome className="unauthorized-button-icon" />
            Back to Home
          </button>
          
          <button
            onClick={handleLoginClick}
            className="unauthorized-login"
            aria-label="Log in"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
