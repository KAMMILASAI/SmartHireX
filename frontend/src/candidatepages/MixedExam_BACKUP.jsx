import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiClock, FiCheckCircle, FiHelpCircle, FiCode, FiArrowRight } from 'react-icons/fi';
import Coding from './Coding';
import MCQComponent from './MCQComponent';
import { API_BASE_URL } from '../config';
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

      // Create individual components from MCQ questions and coding problems
      const individualComponents = [];
      
      // Add MCQ questions as individual components
      if (data.mcqQuestions && data.mcqQuestions.length > 0) {
        data.mcqQuestions.forEach((question, index) => {
          individualComponents.push({
            id: `mcq-${question.id}`,
            type: 'MCQ',
            title: `MCQ Question ${index + 1}`,
            data: question,
            timeLimit: data.mcqTimeLimit || 30,
            weight: data.mcqWeight || 50
          });
        });
      }

      // Add coding problems as individual components
      if (data.codingProblems && data.codingProblems.length > 0) {
        data.codingProblems.forEach((problem, index) => {
          individualComponents.push({
            id: `coding-${problem.id}`,
            type: 'CODING',
            title: `Coding Problem ${index + 1}`,
            data: problem,
            timeLimit: data.codingTimeLimit || 60,
            weight: data.codingWeight || 50
          });
        });
      }

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
    
    setExamStarted(true);
    console.log('Exam started successfully');
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

  return (
    <div className="mixed-exam">
      <div className="component-selector">
        <h2>Mixed Exam Components</h2>
        <p>Select a component to begin.</p>
        
        <div className="components-grid">
          {components.map(component => (
            <div key={component.id} className="component-card">
              <h3>{component.title}</h3>
              <p>Type: {component.type}</p>
              <button onClick={() => setCurrentComponent(component)}>
                Start Component
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MixedExam;
