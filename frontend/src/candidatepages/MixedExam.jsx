import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiClock, FiCheckCircle, FiHelpCircle, FiCode, FiArrowRight } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import Coding from './Coding';
import './MixedExam.css';

const MixedExam = () => {
  const { roundId } = useParams();
  const navigate = useNavigate();
  
  const [components, setComponents] = useState([]);
  const [currentComponent, setCurrentComponent] = useState(null);
  const [componentStatus, setComponentStatus] = useState({});
  const [examStarted, setExamStarted] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [examTimer, setExamTimer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    fetchExamContent();
  }, [roundId]);

  const fetchExamContent = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/candidate/mixed-exam/${roundId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      console.log('Exam data received:', data);

      // Build components: ONE MCQ component with all questions, and coding components
      const individualComponents = [];

      // Single MCQ component that contains all questions
      if (data.mcqQuestions && data.mcqQuestions.length > 0) {
        individualComponents.push({
          id: 'mcq-all',
          type: 'MCQ',
          title: `MCQ (${data.mcqQuestions.length})`,
          data: data.mcqQuestions,
        });
      }

      // Coding problems (keep as-is; one card per problem)
      if (data.codingProblems && data.codingProblems.length > 0) {
        data.codingProblems.forEach((problem, index) => {
          individualComponents.push({
            id: `coding-${problem.id}`,
            type: 'CODING',
            title: `Coding Problem ${index + 1}`,
            data: problem,
          });
        });
      }

      // Set total exam time from round duration (in minutes, convert to seconds)
      const totalTimeInSeconds = (data.duration || 60) * 60;
      setTimeRemaining(totalTimeInSeconds);

      console.log('Individual components created:', individualComponents);
      setComponents(individualComponents);
      setLoading(false);

    } catch (error) {
      console.error('Error fetching exam content:', error);
      setError('Failed to load exam content. Please try again.');
      setLoading(false);
    }
  };

  const startExam = () => {
    console.log('=== START EXAM CLICKED ===');
    console.log('Components available:', components.length);
    console.log('Total exam time:', timeRemaining, 'seconds');
    
    setExamStarted(true);
    
    // Start the single exam timer
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          console.log('⏰ TIME UP! Auto-submitting exam...');
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setExamTimer(timer);
    console.log('Exam started successfully with timer');
  };

  const handleTimeUp = async () => {
    if (examTimer) {
      clearInterval(examTimer);
    }
    
    console.log('⏰ EXAM TIME COMPLETED - AUTO SUBMITTING');
    alert('Time is up! Your exam will be submitted automatically.');
    
    // Auto-submit the entire exam
    await handleSubmitEntireExam();
  };

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (examTimer) {
        clearInterval(examTimer);
      }
    };
  }, [examTimer]);

  const handleComponentComplete = async (componentId, results) => {
    try {
      // Handle back navigation case
      if (results && results.cancelled) {
        console.log('User cancelled component, returning to selector');
        setCurrentComponent(null);
        return;
      }

      // Handle case where componentId is null or undefined
      if (!componentId) {
        console.log('No component ID provided, returning to selector');
        setCurrentComponent(null);
        return;
      }

      const token = localStorage.getItem('token');
      const component = components.find(c => c.id === componentId);
      
      // Handle case where component is not found
      if (!component) {
        console.log('Component not found, returning to selector');
        setCurrentComponent(null);
        return;
      }
      
      console.log('=== COMPONENT COMPLETION ===');
      console.log('Component ID:', componentId);
      console.log('Component Type:', component.type);
      console.log('Results:', results);

      let response;
      
      // Submit results to backend based on component type
      if (component.type === 'MCQ') {
        // Grouped MCQ submission: results should contain an answers map { [questionId]: selectedOption }
        if (!results || !results.answers) {
          console.log('No results provided for grouped MCQ component');
          setCurrentComponent(null);
          return;
        }

        const answers = results.answers; // { [questionId]: 'A' | 'B' | ... or option text }
        const entries = Object.entries(answers);
        let totalScore = 0;

        // Submit each MCQ answer individually to reuse existing endpoint
        for (const [qIdStr, selected] of entries) {
          const questionId = Number(qIdStr);
          const mcqData = {
            questionId,
            answer: selected,
            timeSpent: results.timeSpent || 0,
          };
          console.log('Sending MCQ data:', mcqData);
          const res = await axios.post(
            `${API_BASE_URL}/candidate/mixed-exam/${roundId}/submit-mcq`,
            mcqData,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          // Accumulate score from backend per-question score
          totalScore += Number(res.data?.questionScore || 0);
          response = res; // keep last response for logs
        }

        // Average MCQ score over number of questions answered
        const averageMcqScore = entries.length > 0 ? totalScore / entries.length : 0;
        // Overwrite results.score so downstream UI shows averaged score
        results.score = averageMcqScore;
      } else if (component.type === 'CODING') {
        // Handle case where results is null or undefined
        if (!results) {
          console.log('No results provided for coding component');
          setCurrentComponent(null);
          return;
        }
        
        // Extract solution from various possible sources
        let solution = '';
        if (results.solution) {
          solution = results.solution;
        } else if (results.code) {
          solution = results.code;
        } else if (results.solutions && component.data.id) {
          solution = results.solutions[component.data.id] || '';
        }
        
        const codingData = {
          problemId: component.data.id,
          solution: solution,
          language: results.language || 'java',
          timeSpent: results.timeSpent || 0,
          score: results.score || 0,
          passedTests: results.passedTests || 0,
          totalTests: results.totalTests || 0
        };
        console.log('Sending Coding data:', codingData);
        console.log('Solution length:', solution.length);
        
        response = await axios.post(`${API_BASE_URL}/candidate/mixed-exam/${roundId}/submit-coding`, codingData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      console.log('Backend response:', response.data);
      
      // Get the actual score from backend response
      const actualScore = component.type === 'MCQ'
        ? (typeof results.score === 'number' ? results.score : (response?.data?.questionScore || 0))
        : (response?.data?.problemScore || results.score || 0);

      // Update component status with backend-calculated score
      let updatedStatus = null;
      setComponentStatus(prev => {
        updatedStatus = {
          ...prev,
          [componentId]: {
            completed: true,
            score: actualScore || 0,
            timeSpent: results.timeSpent || 0
          }
        };
        console.log('Updated component status:', updatedStatus);
        return updatedStatus;
      });

      // Don't auto-complete exam, just update status and continue
      console.log('Component submitted successfully');
      console.log('Backend response:', response.data);
      
      // Move to next incomplete component or go back to selector
      const nextComponent = components.find(comp => 
        !updatedStatus?.[comp.id]?.completed && comp.id !== componentId
      );
      if (nextComponent) {
        setCurrentComponent(nextComponent);
      } else {
        // Go back to component selector
        setCurrentComponent(null);
      }

    } catch (error) {
      console.error('Error submitting component:', error);
      setError('Failed to submit component results. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="mixed-exam">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading exam content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mixed-exam">
        <div className="error-container">
          <h2>Error Loading Exam</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        background: '#1a1a1a', 
        color: '#f0f0f0',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          background: '#2d2d2d',
          padding: '40px',
          borderRadius: '12px',
          border: '1px solid #404040',
          maxWidth: '600px'
        }}>
          <h1 style={{ color: '#f0f0f0', marginBottom: '20px' }}>Mixed Exam</h1>
          <p style={{ fontSize: '16px', marginBottom: '30px', color: '#e5e7eb' }}>
            This exam contains both MCQ questions and coding problems.
          </p>
          
          <div style={{ 
            backgroundColor: '#374151', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '30px',
            border: '1px solid #4b5563'
          }}>
            <h3 style={{ color: '#f9fafb', marginBottom: '15px', fontSize: '18px' }}>📋 Instructions:</h3>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              margin: 0,
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <li style={{ 
                padding: '8px 0', 
                color: '#d1d5db',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{ color: '#10b981', marginRight: '10px', fontSize: '16px' }}>✓</span>
                Complete individual components in any order
              </li>
              <li style={{ 
                padding: '8px 0', 
                color: '#d1d5db',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{ color: '#10b981', marginRight: '10px', fontSize: '16px' }}>✓</span>
                Each component has its own time limit
              </li>
              <li style={{ 
                padding: '8px 0', 
                color: '#d1d5db',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{ color: '#10b981', marginRight: '10px', fontSize: '16px' }}>✓</span>
                Submit components individually or use "Submit Entire Exam"
              </li>
              <li style={{ 
                padding: '8px 0', 
                color: '#d1d5db',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{ color: '#10b981', marginRight: '10px', fontSize: '16px' }}>✓</span>
                You can navigate back and forth between components
              </li>
            </ul>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <button 
              onClick={startExam}
              style={{
                padding: '15px 40px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s'
              }}
            >
              🚀 Start Mixed Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmitEntireExam = async () => {
    try {
      console.log('=== SUBMITTING ENTIRE EXAM ===');
      
      // Auto-submit incomplete components with saved/default values
      for (const component of components) {
        if (!componentStatus[component.id]?.completed) {
          console.log('Auto-submitting component:', component.title);
          
          if (component.type === 'CODING') {
            // Check for auto-saved code in localStorage
            const savedData = localStorage.getItem(`coding_draft_${roundId}_${component.data.id}`);
            if (savedData) {
              try {
                const parsed = JSON.parse(savedData);
                console.log('Found auto-saved code for problem:', component.data.id);
                
                // Submit the auto-saved code
                await handleComponentComplete(component.id, {
                  solution: parsed.code,
                  language: parsed.language,
                  score: 0, // Default score for auto-submitted
                  passedTests: 0,
                  totalTests: 0,
                  timeSpent: 0
                });
                continue;
              } catch (e) {
                console.log('Failed to parse saved code for:', component.data.id);
              }
            }
            
            // If no saved code, submit empty solution
            await handleComponentComplete(component.id, {
              solution: '',
              language: 'java',
              score: 0,
              passedTests: 0,
              totalTests: 0,
              timeSpent: 0
            });
          } else if (component.type === 'MCQ') {
            // Submit default MCQ answers for all questions
            const defaultAnswers = {};
            if (component.data && Array.isArray(component.data)) {
              component.data.forEach(question => {
                defaultAnswers[question.id] = ''; // Leave unanswered instead of forcing a guess
              });
            }
            await handleComponentComplete(component.id, {
              score: 0,
              correctAnswers: 0,
              totalQuestions: component.data ? component.data.length : 0,
              timeSpent: 0,
              answers: defaultAnswers
            });
          }
        }
      }
      
      // Mark exam as completed and redirect
      setExamCompleted(true);
      alert('Entire exam submitted successfully!\nYour results will be evaluated and shared with you soon.');
      
      setTimeout(() => {
        navigate('/candidate/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting entire exam:', error);
      alert('Failed to submit exam. Please try again.');
    }
  };

  const switchToComponent = (component) => {
    if (componentStatus[component.id]?.completed) {
      alert('This component has already been completed.');
      return;
    }
    
    if (component.type === 'MCQ') {
      // Navigate to SecureExam for MCQ portions (maintains security/proctoring)
      navigate(`/candidate/exam/${roundId}`, {
        state: {
          isMixedComponent: true,
          returnUrl: `/candidate/mixed-exam/${roundId}`,
          mcqQuestions: component.data,
          timeRemaining: timeRemaining
        }
      });
    } else {
      setCurrentComponent(component);
    }
  };

  if (currentComponent) {
    if (currentComponent.type === 'CODING') {
      return (
        <Coding
          roundId={roundId}
          onExamComplete={(results) => handleComponentComplete(currentComponent.id, results)}
          timeLimit={null} // No individual timer - use shared exam timer
          problems={[currentComponent.data]}
          isMixedComponent={true}
        />
      );
    }
  }

  return (
    <div className="mixed-exam" style={{ 
      width: '100%', 
      minHeight: '100vh', 
      background: '#1a1a1a', 
      color: '#f0f0f0',
      padding: '20px'
    }}>
      <div className="component-selector" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '10px', color: '#f0f0f0' }}>Mixed Exam Components</h2>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: timeRemaining < 300 ? '#ef4444' : '#10b981',
            marginBottom: '10px'
          }}>
            ⏰ {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </div>
          <p style={{ color: '#b0b0b0' }}>Complete individual components or submit the entire exam.</p>
        </div>
        
        {/* Submit Entire Exam Button */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <button 
            onClick={handleSubmitEntireExam}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            Submit Entire Exam
          </button>
          <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
            This will submit all components, including incomplete ones
          </p>
        </div>
        
        {/* Components Grid */}
        <div className="components-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '20px',
          marginBottom: '40px'
        }}>
          {components.map(component => {
            const status = componentStatus[component.id];
            const isCompleted = status?.completed;
            
            return (
              <div 
                key={component.id} 
                className="component-card"
                style={{
                  background: isCompleted ? '#1f2937' : '#2d2d2d',
                  border: isCompleted ? '2px solid #059669' : '1px solid #404040',
                  borderRadius: '12px',
                  padding: '24px',
                  position: 'relative',
                  cursor: isCompleted ? 'default' : 'pointer'
                }}
                onClick={() => !isCompleted && switchToComponent(component)}
              >
                {isCompleted && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: '#059669',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    <FiCheckCircle style={{ marginRight: '4px' }} />
                    Completed
                  </div>
                )}
                
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    fontSize: '24px', 
                    marginBottom: '8px',
                    color: component.type === 'MCQ' ? '#3b82f6' : '#10b981'
                  }}>
                    {component.type === 'MCQ' ? <FiHelpCircle /> : <FiCode />}
                  </div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#f0f0f0' }}>{component.title}</h3>
                  <p style={{ margin: '0', color: '#9ca3af', fontSize: '14px' }}>
                    Type: {component.type}
                  </p>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <span style={{ color: '#b0b0b0', fontSize: '14px' }}>
                    <FiClock style={{ marginRight: '4px' }} />
                    {component.timeLimit} min
                  </span>
                </div>
                
                {!isCompleted && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      switchToComponent(component);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: component.type === 'MCQ' ? '#3b82f6' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}
                  >
                    <FiArrowRight style={{ marginRight: '8px' }} />
                    Start Component
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MixedExam;
