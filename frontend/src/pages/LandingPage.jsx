import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { 
  FaArrowRight, 
  FaStar, 
  FaUsers, 
  FaBriefcase, 
  FaChartLine, 
  FaLaptopCode, 
  FaRobot, 
  FaComments, 
  FaRegStar, 
  FaRegSmile, 
  FaRegFrown, 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaChevronRight,
  FaChevronLeft,
  FaTwitter, 
  FaLinkedin, 
  FaFacebookF, 
  FaInstagram 
} from 'react-icons/fa';
import './LandingPage.css';

const FeatureCard = ({ icon, title, description }) => (
  <div className="feature-card">
    <div className="feature-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

const StarRating = ({ rating, onRate }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hoverRating || rating);
        return (
          <span 
            key={star} 
            className={`star ${isFilled ? 'active' : ''}`}
            onClick={() => onRate(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
          >
            {isFilled ? <FaStar /> : <FaRegStar />}
          </span>
        );
      })}
    </div>
  );
};

const Section = ({ id, children, className = '', ...props }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);
  
  return (
    <section 
      id={id} 
      ref={ref} 
      className={`section ${className} ${isVisible ? 'visible' : ''}`}
      {...props}
    >
      <div className="section-content">
        {children}
      </div>
    </section>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const testimonialsRef = useRef(null);
  const [userRating, setUserRating] = useState(0);
  const [showThankYou, setShowThankYou] = useState(false);
  
  // Animation states
  const [animationKey, setAnimationKey] = useState(0);
  const [companiesCount, setCompaniesCount] = useState(0);
  const [candidatesCount, setCandidatesCount] = useState(0);
  const [successRate, setSuccessRate] = useState(0);

  // Check if user is already authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      // Redirect based on user role if trying to access landing page
      const rawRole = JSON.parse(userData).role?.toLowerCase() || 'candidate';
      const userRole = rawRole.startsWith('role_') ? rawRole.substring(5) : rawRole;
      
      const redirectPath = userRole === 'admin' ? '/admin/dashboard' :
                         userRole === 'recruiter' ? '/recruiter/dashboard' :
                         '/candidate/dashboard';
      
      // Small delay to ensure all components are mounted
      const timer = setTimeout(() => {
        navigate(redirectPath);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [navigate]);

  // Handle OAuth2 redirect and URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const message = urlParams.get('message');
    const error = urlParams.get('error');
    
    if (location.state?.showRegister) {
      navigate('/register');
    } else if (location.state?.showAuthForm) {
      navigate(`/${location.state.showAuthForm}`);
    } else if (message === 'recruiter_pending') {
      // Handle pending recruiter approval
      navigate('/login');
    } else if (error) {
      // Handle any authentication errors
      navigate('/login');
    }
    
    // Clean up URL parameters after processing
    if (message || error) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [location.state, location.search, navigate]);

  
  // Auto-scroll testimonials horizontally
  useEffect(() => {
    const testimonialContainer = testimonialsRef.current;
    if (!testimonialContainer) return;

    let scrollInterval;
    let isScrollingRight = true;
    let isPaused = false;

    const startAutoScroll = () => {
      scrollInterval = setInterval(() => {
        if (isPaused) return;

        const { scrollLeft, scrollWidth, clientWidth } = testimonialContainer;
        const maxScroll = scrollWidth - clientWidth;

        if (isScrollingRight) {
          if (scrollLeft >= maxScroll - 10) {
            isScrollingRight = false;
            // Pause at right end
            isPaused = true;
            setTimeout(() => { isPaused = false; }, 2000);
          } else {
            testimonialContainer.scrollBy({ left: 2, behavior: 'smooth' });
          }
        } else {
          if (scrollLeft <= 10) {
            isScrollingRight = true;
            // Pause at left end
            isPaused = true;
            setTimeout(() => { isPaused = false; }, 2000);
          } else {
            testimonialContainer.scrollBy({ left: -2, behavior: 'smooth' });
          }
        }
      }, 50);
    };

    const stopAutoScroll = () => {
      if (scrollInterval) {
        clearInterval(scrollInterval);
      }
    };

    // Start auto-scroll
    const timer = setTimeout(startAutoScroll, 3000);

    // Pause on hover
    testimonialContainer.addEventListener('mouseenter', stopAutoScroll);
    testimonialContainer.addEventListener('mouseleave', startAutoScroll);

    return () => {
      clearTimeout(timer);
      stopAutoScroll();
      testimonialContainer.removeEventListener('mouseenter', stopAutoScroll);
      testimonialContainer.removeEventListener('mouseleave', startAutoScroll);
    };
  }, []);



  // Animation refresh every 10 seconds
  useEffect(() => {
    const animationInterval = setInterval(() => {
      setAnimationKey(prev => prev + 1);
    }, 10000);

    return () => clearInterval(animationInterval);
  }, []);

  // Counter animations
  useEffect(() => {
    const animateCounter = (setter, target, duration = 2000) => {
      let start = 0;
      const increment = target / (duration / 50);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setter(target);
          clearInterval(timer);
        } else {
          setter(Math.floor(start));
        }
      }, 50);
      return timer;
    };

    // Reset counters to 0 first
    setCompaniesCount(0);
    setCandidatesCount(0);
    setSuccessRate(0);

    // Start counter animations after a delay
    const delay = setTimeout(() => {
      animateCounter(setCompaniesCount, 10000, 2000);
      animateCounter(setCandidatesCount, 50000, 2500);
      animateCounter(setSuccessRate, 95, 1500);
    }, 1000);

    return () => clearTimeout(delay);
  }, [animationKey]);

  const handleRate = (rating) => {
    setUserRating(rating);
    setShowThankYou(true);
    
    // Hide thank you message after 3 seconds
    setTimeout(() => {
      setShowThankYou(false);
    }, 3000);
  };
  const scrollToSection = (id, event = null) => {
    console.log('scrollToSection called with id:', id);
    
    // Small delay to ensure the DOM is fully rendered
    setTimeout(() => {
      try {
        // If no ID is provided, scroll to top
        if (!id) {
          console.log('No ID provided, scrolling to top');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      
        // Get the target element
        const element = document.getElementById(id);
        console.log('Target element:', element);
        if (!element) {
          console.warn(`Element with id '${id}' not found`);
          // Try to find any element with the ID in the entire document
          const allElements = document.querySelectorAll(`[id]`);
          console.log('All elements with IDs:', Array.from(allElements).map(el => el.id));
          return;
        }
        
        // Prevent default if this was triggered by a click event
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        
        // Calculate position
        const headerHeight = 70; // Match header height from CSS
        const rect = element.getBoundingClientRect();
        console.log('Element rect:', rect);
        const elementPosition = rect.top + window.pageYOffset - headerHeight;
        console.log('Calculated scroll position:', elementPosition);
        
        // Ensure the page is scrollable
        document.documentElement.style.overflowY = 'auto';
        document.body.style.overflowY = 'auto';
        
        // Force a reflow to ensure the DOM is updated
        document.body.getBoundingClientRect();
        
        // Use smooth scrolling with a single scrollTo call
        window.scrollTo({
          top: elementPosition,
          behavior: 'smooth'
        });
        
        // Update URL without adding to history
        if (window.history.pushState) {
          window.history.pushState(null, null, `#${id}`);
        } else {
          window.location.hash = `#${id}`;
        }
      
        // Focus the target element for better accessibility
        element.setAttribute('tabindex', '-1');
        element.focus({ preventScroll: true });
      } catch (error) {
        console.error('Error during scrollToSection:', error);
        // Fallback to default behavior
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, 50); // 50ms delay
  };

  // Add smooth scrolling for anchor links
  useEffect(() => {
    const handleAnchorClick = (e) => {
      const target = e.target.closest('a[href^="#"]');
      if (target) {
        e.preventDefault();
        const id = target.getAttribute('href').substring(1);
        scrollToSection(id);
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div 
          className="site-name clickable" 
          onClick={() => {
            const heroSection = document.getElementById('hero');
            if (heroSection) {
              heroSection.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        >
          <div className="logo-container">
            <img 
              src="/SmarthireX-logo.jpeg" 
              alt="SmartHireX Logo" 
              className="logo-image"
            />
            <h1>SmartHireX</h1>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="header-button register-btn"
            onClick={() => navigate('/register')}
          >
            <FaUser size={16} className="button-icon" />
            <span>Register</span>
          </button>
          <button 
            className="header-button login-btn"
            onClick={() => navigate('/login')}
          >
            <FaUser size={16} className="button-icon" />
            <span>Login</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="hero">
        <div className="hero-content">
          <div className="hero-left">
            <h1>Smart Hiring, Simplified</h1>
            <p>Revolutionizing recruitment with AI-powered candidate assessment and smart hiring solutions. Find the perfect candidates faster with our intelligent platform.</p>
            
            <div className="cta-buttons">
              <button 
                className="btn btn-primary btn-large"
                onClick={() => navigate('/register')}
              >
                Get Started
              </button>
              <button 
                className="btn btn-outline btn-large"
                onClick={(e) => {
                  e.preventDefault();
                  setTimeout(() => {
                    const featuresSection = document.getElementById('features');
                    if (featuresSection) {
                      featuresSection.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                      });
                    }
                  }, 100);
                }}
              >
                Learn More
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">{companiesCount.toLocaleString()}+</div>
                <div className="stat-label">Companies Trust Us</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{candidatesCount.toLocaleString()}+</div>
                <div className="stat-label">Candidates Hired</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{successRate}%</div>
                <div className="stat-label">Success Rate</div>
              </div>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-image">
              <img 
                src="/Auth-logo.png" 
                alt="SmartHireX Dashboard" 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/600x400/0D1B2A/FFFFFF?text=SmartHireX+Dashboard';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <Section id="features" className="features">
        <h2>Why Choose SmartHireX?</h2>
        <div className="features-grid">
          <FeatureCard
            icon={<FaRobot />}
            title="AI-Powered Everything"
            description="AI resume analysis, question generation, mock interviews, and intelligent candidate matching with Gemini AI integration."
          />
          <FeatureCard
            icon={<FaLaptopCode />}
            title="Complete Coding Platform"
            description="Live coding environments, custom problem creation, real-time compilation, and automated testing with multiple language support."
          />
          <FeatureCard
            icon={<FaChartLine />}
            title="Advanced Proctoring & Security"
            description="Secure exam environments, real-time monitoring, anti-cheating measures, and comprehensive result analytics."
          />
          <FeatureCard
            icon={<FaUsers />}
            title="Integrated Communication"
            description="Video interviews with meeting codes, real-time chat, notifications, and collaborative hiring workflows."
          />
          <FeatureCard
            icon={<FaBriefcase />}
            title="Multi-Format Assessments"
            description="MCQ tests, coding challenges, mixed exams, AI interviews, and customizable evaluation rounds."
          />
          <FeatureCard
            icon={<FaComments />}
            title="Real-Time Features"
            description="Live interview sessions, instant results, real-time collaboration, and dynamic question generation."
          />
          <FeatureCard
            icon={<FaStar />}
            title="Smart Analytics & Reports"
            description="Detailed performance analytics, candidate scoring, hiring insights, and comprehensive reporting dashboards."
          />
          <FeatureCard
            icon={<FaChevronRight />}
            title="Seamless Integration"
            description="Easy setup, role-based access, customizable workflows, and integration with existing HR systems."
          />
        </div>
      </Section>

      {/* How It Works */}
      <Section id="how-it-works" className="how-it-works">
        <div className="section-header">
          <h2>How SmartHireX Works</h2>
          <p className="section-subtitle">Transform your hiring process in 6 simple steps</p>
        </div>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-icon">
              <FaUser />
            </div>
            <div className="step-content">
              <div className="step-number">01</div>
              <h3>Register & Setup</h3>
              <p>Create your account as a recruiter or candidate. Set up your profile with AI-powered optimization and role-based dashboard access.</p>
            </div>
          </div>
          
          <div className="step-card">
            <div className="step-icon">
              <FaRobot />
            </div>
            <div className="step-content">
              <div className="step-number">02</div>
              <h3>AI Assessment Creation</h3>
              <p>Generate custom tests using AI. Create MCQ questions, coding challenges, and mixed exams tailored to specific job requirements.</p>
            </div>
          </div>
          
          <div className="step-card">
            <div className="step-icon">
              <FaLaptopCode />
            </div>
            <div className="step-content">
              <div className="step-number">03</div>
              <h3>Secure Testing</h3>
              <p>Conduct proctored exams with anti-cheating measures. Live coding environments with real-time compilation and automated testing.</p>
            </div>
          </div>
          
          <div className="step-card">
            <div className="step-icon">
              <FaComments />
            </div>
            <div className="step-content">
              <div className="step-number">04</div>
              <h3>Video Interviews</h3>
              <p>Schedule and conduct video interviews with meeting codes. AI mock interviews and real-time collaboration tools.</p>
            </div>
          </div>
          
          <div className="step-card">
            <div className="step-icon">
              <FaChartLine />
            </div>
            <div className="step-content">
              <div className="step-number">05</div>
              <h3>Smart Analytics</h3>
              <p>Get detailed performance analytics, candidate scoring, and comprehensive reports. AI-powered insights for better decisions.</p>
            </div>
          </div>
          
          <div className="step-card">
            <div className="step-icon">
              <FaStar />
            </div>
            <div className="step-content">
              <div className="step-number">06</div>
              <h3>Hire & Onboard</h3>
              <p>Make data-driven hiring decisions with candidate rankings. Seamless integration with HR systems and onboarding workflows.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Reviews Section */}
      <Section id="reviews" className="reviews">
        <div className="section-header">
          <h2>What Our Users Say</h2>
          <p className="section-subtitle">Trusted by thousands of companies worldwide</p>
        </div>
        <div className="testimonials-container">
          <div className="testimonials-scroll" ref={testimonialsRef}>
          {[
            {
              id: 1,
              name: 'Sarah Johnson',
              role: 'HR Manager',
              company: 'TechCorp Inc.',
              rating: 4.8,
              avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
              review: 'SmartHireX has transformed our hiring process. The AI screening saves us countless hours while ensuring we find the best candidates.'
            },
            {
              id: 2,
              name: 'Michael Thompson',
              role: 'Tech Lead',
              company: 'InnovateX',
              rating: 4.9,
              avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
              review: 'The platform is incredibly intuitive and the support team is always responsive. It has significantly improved our hiring efficiency.'
            },
            {
              id: 3,
              name: 'Priya Patel',
              role: 'Recruitment Director',
              company: 'GlobalTech',
              rating: 4.7,
              avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
              review: 'The analytics and insights provided by SmartHireX have been invaluable in making data-driven hiring decisions.'
            },
            {
              id: 4,
              name: 'David Kim',
              role: 'CEO',
              company: 'StartupHub',
              rating: 4.9,
              avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
              review: 'The best recruitment platform we\'ve used. The AI matching is incredibly accurate and has helped us find top talent.'
            },
            {
              id: 5,
              name: 'Emily Chen',
              role: 'Talent Acquisition',
              company: 'FutureSoft',
              rating: 4.6,
              avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
              review: 'Streamlined our entire recruitment process. The candidate experience is excellent and our hiring metrics have improved dramatically.'
            },
            {
              id: 6,
              name: 'James Wilson',
              role: 'CTO',
              company: 'DataFlow Systems',
              rating: 4.8,
              avatar: 'https://randomuser.me/api/portraits/men/86.jpg',
              review: 'The technical assessments are top-notch. We\'ve seen a 40% reduction in bad hires since implementing SmartHireX.'
            }
          ].map((review) => (
            <div key={review.id} className="testimonial-card">
              <div className="testimonial-content">
                <div className="quote-icon">
                  <FaStar />
                </div>
                <p className="testimonial-text">"{review.review}"</p>
                <div className="rating-stars">
                  {[...Array(5)].map((_, i) => (
                    <FaStar 
                      key={i} 
                      className={`star ${i < Math.floor(review.rating) ? 'filled' : ''}`} 
                    />
                  ))}
                  <span className="rating-number">{review.rating}</span>
                </div>
              </div>
              <div className="testimonial-author">
                <div className="author-info">
                  <div className="author-name">{review.name}</div>
                  <div className="author-role">{review.role}</div>
                  <div className="author-company">{review.company}</div>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
        
        {/* User Rating Section */}
        <div className="user-rating-section">
          <div className="rating-prompt">
            <h3>Rate Your Experience</h3>
            <p>How would you rate SmartHireX?</p>
          </div>
          <div className="rating-container">
            <StarRating rating={userRating} onRate={handleRate} />
            {showThankYou && (
              <div className="thank-you-message">
                <FaRegSmile className="thank-you-icon" />
                <span>Thank you for your feedback!</span>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* CTA Section */}
      <Section className="cta">
        <div className="cta-container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Transform Your Hiring Process?</h2>
            <p className="cta-description">
              Join thousands of companies that trust SmartHireX for their recruitment needs. 
              Start hiring smarter with AI-powered assessments and seamless workflows.
            </p>
            <div className="cta-stats">
              <div className="stat-item">
                <div className="stat-number">95%</div>
                <div className="stat-label">Faster Hiring</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">40%</div>
                <div className="stat-label">Better Matches</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">24/7</div>
                <div className="stat-label">AI Support</div>
              </div>
            </div>
            <div className="cta-buttons">
              <button 
                className="cta-primary-btn"
                onClick={() => navigate('/register')}
              >
                <span>Get Started for Free</span>
                <FaArrowRight className="btn-icon" />
              </button>
              <button 
                className="cta-secondary-btn"
                onClick={() => navigate('/login')}
              >
                <FaUser className="btn-icon" />
                <span>Sign In</span>
              </button>
            </div>
            <div className="cta-features">
              <div className="feature-item">
                <FaRegSmile className="feature-icon" />
                <span>No Credit Card Required</span>
              </div>
              <div className="feature-item">
                <FaUsers className="feature-icon" />
                <span>Lifetime Free</span>
              </div>
              <div className="feature-item">
                <FaChartLine className="feature-icon" />
                <span>Setup in 5 Minutes</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Contact Section */}
      <Section className="contact-section full-width" id="contact">
        <div className="contact-wrapper">
          <div className="contact-header">
            <h2 className="contact-title">Get In Touch</h2>
            <p className="contact-subtitle">Have questions or want to learn more? We'd love to hear from you!</p>
          </div>
          
          <div className="contact-content">
            <div className="contact-info">
              <div className="info-card">
                <div className="info-icon">
                  <FaEnvelope />
                </div>
                <div className="info-details">
                  <h3>Email Us</h3>
                  <p>support@smarthirex.com</p>
                  <span>We'll respond within 24 hours</span>
                </div>
              </div>
              
              <div className="info-card">
                <div className="info-icon">
                  <FaPhone />
                </div>
                <div className="info-details">
                  <h3>Call Us</h3>
                  <p>+91  123-456-7890</p>
                  <span>Mon-Fri, 9:30AM-4:30PM (IST)</span>
                </div>
              </div>
              
              <div className="info-card">
                <div className="info-icon">
                  <FaMapMarkerAlt />
                </div>
                <div className="info-details">
                  <h3>Visit Us</h3>
                  <p>123 SVEC</p>
                  <span>Tadepalligudem</span>
                </div>
              </div>
            </div>
            
            <div className="contact-form-wrapper">
              <div className="form-header">
                <h3>Send us a message</h3>
                <p>Fill out the form below and we'll get back to you as soon as possible.</p>
              </div>
            <form 
              className="contact-form" 
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target;
                const formData = new FormData(form);
                const submitButton = form.querySelector('button[type="submit"]');
                const originalButtonText = submitButton.textContent;
                
                try {
                  // Disable button and show loading state
                  submitButton.disabled = true;
                  submitButton.textContent = 'Sending...';
                  
                  // Prepare form data
                  const formValues = Object.fromEntries(formData);
                  
                  // Send email via API
                  const response = await fetch(`${API_BASE_URL}/contact`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formValues),
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to send message');
                  }
                  
                  // Show success message
                  alert('Your message has been sent successfully! We\'ll get back to you soon.');
                  form.reset();
                  
                  form.reset();
                } catch (error) {
                  console.error('Error submitting form:', error);
                  alert(error.message || 'Failed to send message. Please try again later.');
                } finally {
                  // Reset button state
                  submitButton.disabled = false;
                  submitButton.textContent = originalButtonText;
                }
              }}
            >
              <div className="form-row">
                <div className="form-group">
                  <input 
                    type="text" 
                    name="name" 
                    placeholder="Your Name" 
                    required 
                    minLength="2"
                    maxLength="100"
                  />
                </div>
                <div className="form-group">
                  <input 
                    type="email" 
                    name="email" 
                    placeholder="Your Email" 
                    required 
                    pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
                    title="Please enter a valid email address"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <input 
                  type="text" 
                  name="subject" 
                  placeholder="Subject" 
                  required 
                  minLength="5"
                  maxLength="200"
                />
              </div>
              
              <div className="form-group">
                <textarea 
                  name="message" 
                  placeholder="Your Message" 
                  rows="6" 
                  required
                  minLength="10"
                  maxLength="1000"
                ></textarea>
              </div>
              
              <button type="submit" className="contact-submit-btn">
                <span>Send Message</span>
                <FaArrowRight className="btn-icon" />
              </button>
            </form>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-links-container">
              <div className="link-column">
                <h4>Platform</h4>
                <div className="links">
                  {[
                    { id: 'features', label: 'Features', icon: <FaStar /> },
                    { id: 'how-it-works', label: 'How It Works', icon: <FaChartLine /> },
                    { id: 'reviews', label: 'Testimonials', icon: <FaUsers /> },
                    { id: 'contact', label: 'Contact Us', icon: <FaEnvelope /> }
                  ].map(({ id, label, icon }) => (
                    <a 
                      key={id}
                      href={`#${id}`}
                      className="footer-link"
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById(id);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    >
                      {icon}
                      <span>{label}</span>
                    </a>
                  ))}
                </div>
              </div>
              
              <div className="link-column">
                <h4>Solutions</h4>
                <div className="links">
                  <a href="#" className="footer-link">
                    <FaRobot />
                    <span>AI Screening</span>
                  </a>
                  <a href="#" className="footer-link">
                    <FaLaptopCode />
                    <span>MQCs/Coding Tests</span>
                  </a>
                  <a href="#" className="footer-link">
                    <FaComments />
                    <span>Video Interviews</span>
                  </a>
                  <a href="#" className="footer-link">
                    <FaChartLine />
                    <span>Analytics</span>
                  </a>
                </div>
              </div>
              
              <div className="link-column">
                <h4>Connect</h4>
                <div className="links">
                  <a 
                    href="https://twitter.com/smarthirex" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="footer-link"
                  >
                    <FaTwitter />
                    <span>Twitter</span>
                  </a>
                  <a 
                    href="https://linkedin.com/company/smarthirex" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="footer-link"
                  >
                    <FaLinkedin />
                    <span>LinkedIn</span>
                  </a>
                  <a 
                    href="https://facebook.com/smarthirex" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="footer-link"
                  >
                    <FaFacebookF />
                    <span>Facebook</span>
                  </a>
                  <a 
                    href="https://instagram.com/smarthirex" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="footer-link"
                  >
                    <FaInstagram />
                    <span>Instagram</span>
                  </a>
                </div>
              </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p>© {new Date().getFullYear()} SmartHireX. All rights reserved.</p>
            <div className="footer-badge">
              <FaStar className="badge-star" />
              <span>Trusted by Industry Leaders</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
