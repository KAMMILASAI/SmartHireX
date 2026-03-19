import React, { useState } from 'react';
import { FiPlus, FiTrash2, FiCode, FiPlay, FiCheck, FiX, FiArrowLeft, FiArrowRight, FiSave } from 'react-icons/fi';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './CodingProblemCreator.css';

const CodingProblemCreator = ({ roundId, onProblemCreated, onProblemUpdated, initialProblem = null, onClose }) => {
  const isEditMode = Boolean(initialProblem);
  const [currentStep, setCurrentStep] = useState(1);
  const [problem, setProblem] = useState({
    title: '',
    problemStatement: '',
    explanation: '',
    inputFormat: '',
    outputFormat: '',
    constraints: '',
    difficulty: 'MEDIUM',
    timeLimit: 2000,
    memoryLimit: 256,
    allowedLanguages: 'java,python,cpp,javascript'
  });

  const [testCases, setTestCases] = useState([
    {
      input: '',
      expectedOutput: '',
      isSample: true,
      isHidden: false,
      explanation: '',
      order: 0
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (!initialProblem) {
      return;
    }

    setProblem({
      title: initialProblem.title || '',
      problemStatement: initialProblem.problemStatement || '',
      explanation: initialProblem.explanation || '',
      inputFormat: initialProblem.inputFormat || '',
      outputFormat: initialProblem.outputFormat || '',
      constraints: initialProblem.constraints || '',
      difficulty: initialProblem.difficulty || 'MEDIUM',
      timeLimit: initialProblem.timeLimit || 2000,
      memoryLimit: initialProblem.memoryLimit || 256,
      allowedLanguages: initialProblem.allowedLanguages || 'java,python,cpp,javascript'
    });

    setTestCases(
      (initialProblem.testCases || []).length > 0
        ? initialProblem.testCases.map((tc, index) => ({
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
            isSample: tc.isSample ?? true,
            isHidden: tc.isHidden ?? false,
            explanation: tc.explanation || '',
            order: tc.order ?? index
          }))
        : [
            {
              input: '',
              expectedOutput: '',
              isSample: true,
              isHidden: false,
              explanation: '',
              order: 0
            }
          ]
    );
  }, [initialProblem]);

  const steps = [
    { id: 1, title: 'Problem Details', icon: FiCode, description: 'Define your coding problem' },
    { id: 2, title: 'Test Cases', icon: FiPlay, description: 'Add sample and hidden test cases' },
    { id: 3, title: 'Review & Save', icon: FiCheck, description: 'Review and create the problem' }
  ];

  const handleProblemChange = (field, value) => {
    setProblem(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!problem.title.trim()) newErrors.title = 'Title is required';
      if (!problem.problemStatement.trim()) newErrors.problemStatement = 'Problem statement is required';
      if (!problem.inputFormat.trim()) newErrors.inputFormat = 'Input format is required';
      if (!problem.outputFormat.trim()) newErrors.outputFormat = 'Output format is required';
    }
    
    if (step === 2) {
      if (testCases.length === 0) {
        newErrors.testCases = 'At least one test case is required';
      } else {
        testCases.forEach((tc, index) => {
          if (!tc.input.trim()) newErrors[`testCase${index}Input`] = 'Input is required';
          if (!tc.expectedOutput.trim()) newErrors[`testCase${index}Output`] = 'Expected output is required';
        });
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleTestCaseChange = (index, field, value) => {
    const updatedTestCases = [...testCases];
    updatedTestCases[index] = {
      ...updatedTestCases[index],
      [field]: value
    };
    setTestCases(updatedTestCases);
  };

  const addTestCase = () => {
    setTestCases(prev => [
      ...prev,
      {
        input: '',
        expectedOutput: '',
        isSample: false,
        isHidden: false,
        explanation: '',
        order: prev.length
      }
    ]);
  };

  const removeTestCase = (index) => {
    if (testCases.length > 1) {
      setTestCases(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...problem,
        roundId: roundId,
        testCases: testCases
      };

      const endpoint = isEditMode
        ? `${API_BASE_URL}/recruiter/coding-problems/${initialProblem.id || initialProblem._id}`
        : `${API_BASE_URL}/recruiter/coding-problems`;
      const response = isEditMode
        ? await axios.put(endpoint, payload, {
            headers: { Authorization: `Bearer ${token}` }
          })
        : await axios.post(endpoint, payload, {
            headers: { Authorization: `Bearer ${token}` }
          });

      if (isEditMode && onProblemUpdated) {
        onProblemUpdated(response.data);
      }

      if (!isEditMode && onProblemCreated) {
        onProblemCreated(response.data);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} coding problem:`, error);
      setErrors({
        submit: error.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} coding problem`
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <div className="step-header">
              <h3>Problem Details</h3>
              <p>Let's start by defining your coding problem</p>
            </div>

            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="title">Problem Title *</label>
                <input
                  type="text"
                  id="title"
                  value={problem.title}
                  onChange={(e) => handleProblemChange('title', e.target.value)}
                  placeholder="e.g., Two Sum, Palindrome Check, Binary Search"
                  className={errors.title ? 'error' : ''}
                />
                {errors.title && <span className="error-text">{errors.title}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="difficulty">Difficulty</label>
                <select
                  id="difficulty"
                  value={problem.difficulty}
                  onChange={(e) => handleProblemChange('difficulty', e.target.value)}
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>


              <div className="form-group full-width">
                <label htmlFor="problemStatement">Problem Statement *</label>
                <textarea
                  id="problemStatement"
                  value={problem.problemStatement}
                  onChange={(e) => handleProblemChange('problemStatement', e.target.value)}
                  placeholder="Describe the problem clearly. What should the function do?"
                  rows="6"
                  className={errors.problemStatement ? 'error' : ''}
                />
                {errors.problemStatement && <span className="error-text">{errors.problemStatement}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="inputFormat">Input Format *</label>
                <textarea
                  id="inputFormat"
                  value={problem.inputFormat}
                  onChange={(e) => handleProblemChange('inputFormat', e.target.value)}
                  placeholder="Describe the input format"
                  rows="3"
                  className={errors.inputFormat ? 'error' : ''}
                />
                {errors.inputFormat && <span className="error-text">{errors.inputFormat}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="outputFormat">Output Format *</label>
                <textarea
                  id="outputFormat"
                  value={problem.outputFormat}
                  onChange={(e) => handleProblemChange('outputFormat', e.target.value)}
                  placeholder="Describe the expected output format"
                  rows="3"
                  className={errors.outputFormat ? 'error' : ''}
                />
                {errors.outputFormat && <span className="error-text">{errors.outputFormat}</span>}
              </div>

              <div className="form-group full-width">
                <label htmlFor="constraints">Constraints</label>
                <textarea
                  id="constraints"
                  value={problem.constraints}
                  onChange={(e) => handleProblemChange('constraints', e.target.value)}
                  placeholder="e.g., 1 ≤ n ≤ 10^5, -10^9 ≤ arr[i] ≤ 10^9"
                  rows="2"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <div className="step-header">
              <h3>Test Cases</h3>
              <p>Add sample and hidden test cases to validate solutions</p>
            </div>

            <div className="test-cases-section">
              {testCases.map((testCase, index) => (
                <div key={index} className="test-case-card">
                  <div className="test-case-header">
                    <h4>Test Case {index + 1}</h4>
                    <div className="test-case-controls">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={testCase.isSample}
                          onChange={(e) => handleTestCaseChange(index, 'isSample', e.target.checked)}
                        />
                        Sample (visible to candidates)
                      </label>
                      {testCases.length > 1 && (
                        <button
                          type="button"
                          className="remove-test-case"
                          onClick={() => removeTestCase(index)}
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="test-case-content">
                    <div className="form-group">
                      <label>Input *</label>
                      <textarea
                        value={testCase.input}
                        onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                        placeholder="Enter the input for this test case"
                        rows="3"
                        className={errors[`testCase${index}Input`] ? 'error' : ''}
                      />
                      {errors[`testCase${index}Input`] && (
                        <span className="error-text">{errors[`testCase${index}Input`]}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Expected Output *</label>
                      <textarea
                        value={testCase.expectedOutput}
                        onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                        placeholder="Enter the expected output"
                        rows="3"
                        className={errors[`testCase${index}Output`] ? 'error' : ''}
                      />
                      {errors[`testCase${index}Output`] && (
                        <span className="error-text">{errors[`testCase${index}Output`]}</span>
                      )}
                    </div>

                    {testCase.isSample && (
                      <div className="form-group">
                        <label>Explanation (optional)</label>
                        <textarea
                          value={testCase.explanation}
                          onChange={(e) => handleTestCaseChange(index, 'explanation', e.target.value)}
                          placeholder="Explain this test case to help candidates understand"
                          rows="2"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="add-test-case-btn"
                onClick={addTestCase}
              >
                <FiPlus /> Add Another Test Case
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <div className="step-header">
              <h3>Review & Save</h3>
              <p>Review your coding problem before saving</p>
            </div>

            <div className="review-section">
              <div className="review-card">
                <h4>{problem.title}</h4>
                <div className="review-meta">
                  <span className={`difficulty-badge ${problem.difficulty.toLowerCase()}`}>
                    {problem.difficulty}
                  </span>
                </div>
                <p className="problem-preview">{problem.problemStatement}</p>
                <div className="test-cases-summary">
                  <span>{testCases.length} test cases</span>
                  <span>{testCases.filter(tc => tc.isSample).length} sample cases</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="coding-problem-creator">
      <div className="creator-header">
        <div className="header-content">
          <FiCode className="header-icon" />
          <h2>{isEditMode ? 'Edit Coding Problem' : 'Create Coding Problem'}</h2>
        </div>
        <button className="close-btn" onClick={onClose}>
          <FiX />
        </button>
      </div>

      <div className="step-indicator">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
          >
            <div className="step-number">
              {currentStep > step.id ? <FiCheck /> : (
                <step.icon size={18} />
              )}
            </div>
            <div className="step-info">
              <span className="step-title">{step.title}</span>
              <span className="step-description">{step.description}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="creator-content">
        {renderStepContent()}
      </div>

      <div className="creator-footer">
        <div className="footer-buttons">
          {currentStep > 1 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={prevStep}
            >
              <FiArrowLeft /> Previous
            </button>
          )}
          
          {currentStep < 3 ? (
            <button
              type="button"
              className="btn-primary"
              onClick={nextStep}
            >
              Next <FiArrowRight />
            </button>
          ) : (
            <button
              type="button"
              className="btn-success"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (
                <>
                  <FiSave /> {isEditMode ? 'Update Problem' : 'Create Problem'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodingProblemCreator;
