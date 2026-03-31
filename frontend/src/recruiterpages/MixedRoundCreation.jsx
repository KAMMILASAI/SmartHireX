import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiPlus, FiTrash2, FiSave, FiArrowLeft, FiSettings, FiCode, FiHelpCircle } from 'react-icons/fi';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './MixedRoundCreation.css';

const MixedRoundCreation = () => {
  const navigate = useNavigate();
  const { roundId } = useParams();
  
  const [roundDetails, setRoundDetails] = useState(null);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Default component templates
  const componentTemplates = {
    MCQ: {
      type: 'MCQ',
      weight: 50,
      timeLimit: 30,
      questionCount: 0, // Will be updated after adding questions
      icon: FiHelpCircle,
      color: '#3b82f6'
    },
    CODING: {
      type: 'CODING',
      weight: 50,
      timeLimit: 60,
      problemCount: 0, // Will be updated after adding problems
      icon: FiCode,
      color: '#10b981'
    }
  };

  useEffect(() => {
    fetchRoundDetails();
    fetchMixedConfiguration();
  }, [roundId]);

  const fetchRoundDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/recruiter/rounds/${roundId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoundDetails(response.data);
    } catch (error) {
      console.error('Error fetching round details:', error);
      setError('Failed to fetch round details');
    }
  };

  const fetchMixedConfiguration = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/recruiter/mixed-rounds/${roundId}/configuration`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.isMixed && response.data.components.length > 0) {
        setComponents(response.data.components.map(comp => ({
          id: comp.id,
          type: comp.componentType,
          weight: parseFloat(comp.componentWeight),
          timeLimit: comp.timeLimitMinutes,
          questionCount: comp.mcqCount || 0,
          problemCount: comp.codingCount || 0
        })));
      } else {
        // Initialize with default MCQ component
        setComponents([{
          id: null,
          type: 'MCQ',
          weight: 100,
          timeLimit: 60,
          questionCount: 0,
          problemCount: 0
        }]);
      }
    } catch (error) {
      console.error('Error fetching mixed configuration:', error);
      // Initialize with default component if no configuration exists
      setComponents([{
        id: null,
        type: 'MCQ',
        weight: 100,
        timeLimit: 60,
        questionCount: 0,
        problemCount: 0
      }]);
    } finally {
      setLoading(false);
    }
  };

  const addComponent = (type) => {
    const template = componentTemplates[type];
    const existingTypes = components.map(c => c.type);
    
    if (existingTypes.includes(type)) {
      setError(`${type} component already exists`);
      return;
    }

    // Adjust weights when adding second component
    let newWeight = 50;
    if (components.length === 1) {
      // Update existing component to 50%
      const updatedComponents = components.map(comp => ({
        ...comp,
        weight: 50
      }));
      setComponents([...updatedComponents, {
        id: null,
        type: template.type,
        weight: newWeight,
        timeLimit: template.timeLimit,
        questionCount: 0,
        problemCount: 0
      }]);
    } else {
      setComponents([...components, {
        id: null,
        type: template.type,
        weight: newWeight,
        timeLimit: template.timeLimit,
        questionCount: 0,
        problemCount: 0
      }]);
    }
    
    setError('');
  };

  const removeComponent = (index) => {
    if (components.length === 1) {
      setError('At least one component is required');
      return;
    }

    const newComponents = components.filter((_, i) => i !== index);
    
    // Redistribute weights if only one component remains
    if (newComponents.length === 1) {
      newComponents[0].weight = 100;
    }
    
    setComponents(newComponents);
    setError('');
  };

  const updateComponent = (index, field, value) => {
    const newComponents = [...components];
    newComponents[index][field] = value;
    
    // Auto-adjust weights to maintain 100% total
    if (field === 'weight') {
      const otherIndex = index === 0 ? 1 : 0;
      if (newComponents[otherIndex]) {
        newComponents[otherIndex].weight = 100 - value;
      }
    }
    
    setComponents(newComponents);
    setError('');
  };

  const validateConfiguration = () => {
    if (components.length === 0) {
      return 'At least one component is required';
    }

    const totalWeight = components.reduce((sum, comp) => sum + comp.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return 'Component weights must sum to 100%';
    }

    for (let comp of components) {
      if (comp.weight <= 0 || comp.weight > 100) {
        return 'Component weights must be between 1% and 100%';
      }
      if (comp.timeLimit <= 0) {
        return 'Time limits must be greater than 0';
      }
    }

    return null;
  };

  const saveConfiguration = async () => {
    const validationError = validateConfiguration();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      const configData = {};
      
      components.forEach(comp => {
        if (comp.type === 'MCQ') {
          configData.mcqComponent = {
            weight: comp.weight,
            questionCount: comp.questionCount,
            timeLimit: comp.timeLimit
          };
        } else if (comp.type === 'CODING') {
          configData.codingComponent = {
            weight: comp.weight,
            problemCount: comp.problemCount,
            timeLimit: comp.timeLimit
          };
        }
      });

      await axios.post(
        `${API_BASE_URL}/recruiter/mixed-rounds/${roundId}/configure`,
        configData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Mixed round configuration saved successfully!');
      
      // Update round type to MIXED
      await axios.put(
        `${API_BASE_URL}/recruiter/rounds/${roundId}`,
        { ...roundDetails, roundType: 'MIXED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTimeout(() => {
        navigate(`/recruiter/rounds/${roundId}`);
      }, 2000);

    } catch (error) {
      console.error('Error saving configuration:', error);
      setError('Failed to save configuration: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const getComponentIcon = (type) => {
    const template = componentTemplates[type];
    const IconComponent = template.icon;
    return <IconComponent style={{ color: template.color }} />;
  };

  if (loading) {
    return (
      <div className="mixed-round-creation">
        <div className="loading">Loading round configuration...</div>
      </div>
    );
  }

  return (
    <div className="mixed-round-creation">
      <div className="header">
        <button className="back-btn" onClick={() => navigate(`/recruiter/rounds/${roundId}`)}>
          <FiArrowLeft /> Back to Round
        </button>
        <div className="header-content">
          <h1>
            <FiSettings />
            Configure Mixed Round
          </h1>
          <p>Set up MCQ and Coding components with custom weights and time limits</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="round-info">
        <h2>{roundDetails?.title}</h2>
        <p>{roundDetails?.description}</p>
      </div>

      <div className="components-section">
        <div className="section-header">
          <h3>Exam Components</h3>
          <div className="add-component-buttons">
            <button 
              className="add-component-btn mcq"
              onClick={() => addComponent('MCQ')}
              disabled={components.some(c => c.type === 'MCQ')}
            >
              <FiHelpCircle /> Add MCQ Component
            </button>
            <button 
              className="add-component-btn coding"
              onClick={() => addComponent('CODING')}
              disabled={components.some(c => c.type === 'CODING')}
            >
              <FiCode /> Add Coding Component
            </button>
          </div>
        </div>

        <div className="components-list">
          {components.map((component, index) => (
            <div key={index} className={`component-card ${component.type.toLowerCase()}`}>
              <div className="component-header">
                <div className="component-title">
                  {getComponentIcon(component.type)}
                  <span>{component.type} Component</span>
                </div>
                {components.length > 1 && (
                  <button 
                    className="remove-btn"
                    onClick={() => removeComponent(index)}
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>

              <div className="component-config">
                <div className="config-row">
                  <div className="config-field">
                    <label>Weight (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={component.weight}
                      onChange={(e) => updateComponent(index, 'weight', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="config-field">
                    <label>Time Limit (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      value={component.timeLimit}
                      onChange={(e) => updateComponent(index, 'timeLimit', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="config-info">
                  {component.type === 'MCQ' && (
                    <div className="info-item">
                      <span>Questions will be added after saving this configuration</span>
                      <small>Current questions: {component.questionCount}</small>
                    </div>
                  )}
                  {component.type === 'CODING' && (
                    <div className="info-item">
                      <span>Coding problems will be added after saving this configuration</span>
                      <small>Current problems: {component.problemCount}</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="weight-summary">
          <h4>Weight Distribution</h4>
          <div className="weight-bars">
            {components.map((component, index) => (
              <div key={index} className="weight-bar">
                <div className="weight-label">
                  {component.type}: {component.weight}%
                </div>
                <div className="weight-visual">
                  <div 
                    className={`weight-fill ${component.type.toLowerCase()}`}
                    style={{ width: `${component.weight}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div className="total-weight">
            Total: {components.reduce((sum, comp) => sum + comp.weight, 0)}%
          </div>
        </div>
      </div>

      <div className="actions">
        <button 
          className="save-btn"
          onClick={saveConfiguration}
          disabled={saving}
        >
          <FiSave />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};

export default MixedRoundCreation;
