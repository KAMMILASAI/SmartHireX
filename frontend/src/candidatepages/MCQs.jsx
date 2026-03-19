import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import axios from 'axios';
import './MCQs.css';

export default function MCQs() {
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // This component is for PRACTICE MODE ONLY
  const isTestMode = false;
  
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(1800); // default 30 minutes
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [result, setResult] = useState(null); // {score, total}
  const [showQuestionStatus, setShowQuestionStatus] = useState(false);
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  // Simple mode for practice
  const [simpleMode] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSimpleSidebar, setShowSimpleSidebar] = useState(true);
  const [webcamStream, setWebcamStream] = useState(null);
  const [webcamPermission, setWebcamPermission] = useState('pending');
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [isInitializingProctor, setIsInitializingProctor] = useState(false);
  
  // Constants for security limits
  const MAX_TAB_SWITCHES = 3;
  const MAX_WARNINGS = 5;

  const query = new URLSearchParams(location.search);
  const companyOrRecruiter =
    query.get('company') || query.get('recruiter') || 'Assessment Platform';

  useEffect(() => {
    // Load MCQ questions (prefer state from navigation)
    const state = location.state || {};
    
    
    // Normal question loading (not resumed session)
    const incoming = Array.isArray(state.questions) ? state.questions : null;
    const enabled = typeof state.timerEnabled === 'boolean' ? state.timerEnabled : true;
    const minutes = Number.isFinite(state.timerMinutes) && state.timerMinutes > 0 ? state.timerMinutes : 30;

    setTimerEnabled(enabled);
    setTimeLeft(enabled ? minutes * 60 : 0);

    if (incoming && incoming.length > 0) {
      // Normalize incoming questions similar to fetched ones
      try {
        const topic = (new URLSearchParams(location.search)).get('topic') || state.topic || 'general';
        const stripBracketTag = (t) => typeof t === 'string' ? t.replace(/^\s*\[[^\]]*\]\s*/,'').trim() : t;
        const stripSample = (t) => typeof t === 'string' ? t.replace(/\bsample\s+question\s+#?\d+\b/ig, '').trim() : t;
        const stripTopicParen = (t) => typeof t === 'string' ? t.replace(new RegExp(`\s*\(\s*${topic}\s*\)$`, 'i'), '').trim() : t;
        const stripLeadingLabel = (t) => typeof t === 'string'
          ? t.replace(/^\s*[\(\[]?[A-Da-d][\)\].:-]?\s+/, '').trim()
          : (t == null ? '' : String(t));
        const toStringSafe = (t) => (t == null ? '' : String(t));
        const cleanQ = (t) => stripSample(stripBracketTag(toStringSafe(t)));
        const cleanOpt = (t) => stripLeadingLabel(stripTopicParen(toStringSafe(t)));
        const deriveCorrectIndex = (qObj, opts) => {
          const cand = qObj.correctAnswer ?? qObj.answerIndex ?? qObj.correct ?? qObj.answer ?? qObj.key ?? qObj.correctOption ?? qObj.correct_choice ?? qObj.solution;
          if (typeof cand === 'number' && Number.isFinite(cand)) {
            if (cand >= 1 && cand <= opts.length) return cand - 1;
            return cand;
          }
          if (typeof cand === 'string') {
            const s = cand.trim();
            if (/^[A-D]$/i.test(s)) return s.toUpperCase().charCodeAt(0) - 65;
            const byText = opts.findIndex(o => (o ?? '').toString().trim().toLowerCase() === cleanOpt(s).toLowerCase());
            if (byText !== -1) return byText;
            const num = parseInt(s, 10);
            if (!isNaN(num)) {
              if (num >= 1 && num <= opts.length) return num - 1;
              return num;
            }
          }
          return undefined;
        };

        const normalized = incoming
          .map((q, idx) => {
            const options = (q.options ?? q.choices ?? q.answers ?? []).map(cleanOpt);
            return {
              id: q.id ?? q.questionId ?? `q-${idx + 1}`,
              question: cleanQ(q.question ?? q.prompt ?? q.text ?? ''),
              options,
              correctAnswer: deriveCorrectIndex(q, options)
            };
          })
          .filter(q => q.question && Array.isArray(q.options) && q.options.length > 0);
        setQuestions(normalized);
        setExamStarted(true); // Start exam when questions are loaded
      } catch {
        setQuestions(incoming);
        setExamStarted(true); // Start exam even with fallback questions
      }
      return;
    }
    loadQuestions();
  }, []);

  useEffect(() => {
    if (examStarted) {
      // Disable security features
      disableSecurityFeatures();
    }
    
    return () => {
      if (examStarted) {
        enableSecurityFeatures();
      }
    };
  }, [examStarted]);


  // Sync theme class globally (html, body, #root) for background/text
  useEffect(() => {
    const body = document.body;
    const htmlEl = document.documentElement;
    const rootEl = document.getElementById('root');
    [htmlEl, body, rootEl].forEach(el => {
      if (!el) return;
      el.classList.remove('theme-dark', 'theme-light');
      el.classList.add(`theme-${theme}`);
    });
  }, [theme]);

  useEffect(() => {
    // Timer countdown (only if enabled)
    if (!timerEnabled) return; 
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isSubmitted) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitted, timerEnabled]);

  // After submit, stay on the same page (no auto-redirect)
  useEffect(() => {
    // Intentionally left blank to avoid navigation on submit
  }, [isSubmitted]);

  // Dynamically set CSS header height variable so toggle/sidebar sit below header
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (!containerRef.current) return;
      const h = headerRef.current ? Math.round(headerRef.current.getBoundingClientRect().height) : 0;
      containerRef.current.style.setProperty('--header-height', `${h}px`);
    };
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    let ro;
    if (typeof ResizeObserver !== 'undefined' && headerRef.current) {
      ro = new ResizeObserver(updateHeaderHeight);
      ro.observe(headerRef.current);
    }
    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
      if (ro) ro.disconnect();
    };
  }, [examStarted]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      // Practice mode only - generate practice questions from backend
      const sp = new URLSearchParams(location.search);
      const state = (location && location.state) || {};
      const topic = sp.get('topic') || state.topic || 'general';
      const level = sp.get('level') || state.level || 'mixed';
      const count = sp.get('count') || state.count || 10;
      
      const apiUrl = `${API_BASE_URL}/candidate/practice/mcqs`;
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: topic,
          level: level,
          count: parseInt(count)
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to load practice questions. Please try again later.');
      }
      
      const data = await res.json();
      if (Array.isArray(data)) {
        // Normalize question format
        const normalized = data.map((q, idx) => ({
          id: q.id ?? q.questionId ?? `q-${idx + 1}`,
          question: q.questionText ?? q.question ?? q.prompt ?? q.text ?? `Question ${idx + 1}`,
          options: Array.isArray(q.options) ? q.options : (q.choices ?? q.answers ?? []),
          correctAnswer: q.correctAnswer // Show correct answers in practice mode
        })).filter(q => q.question && Array.isArray(q.options) && q.options.length > 0);
        
        setQuestions(normalized);
        setExamStarted(true); // Start exam when questions are loaded
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
      setQuestions([]);
      setExamStarted(false);
      alert('Failed to load practice questions. Please try again.');
    }
    setLoading(false);
  };

  const handleAnswerSelect = (questionId, answerIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: answerIndex
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Practice mode - calculate score
      let correctAnswers = 0;
      questions.forEach(question => {
        const selectedIndex = selectedAnswers[question.id];
        if (typeof selectedIndex === 'number' && selectedIndex === question.correctAnswer) {
          correctAnswers++;
        }
      });
      
      setScore(correctAnswers);
      setResult({ score: correctAnswers, total: questions.length });
      setIsSubmitted(true);
      setShowSuccessPopup(true);
      
      // Save practice session to backend
      try {
        await savePracticeSession(correctAnswers, questions.length);
      } catch (error) {
        console.error('Failed to save practice session:', error);
      }
      
      // Auto-redirect after 3 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
        navigate('/candidate/partices', { replace: true });
      }, 3000);
      
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to submit. Please try again.');
    }
    setLoading(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Save practice session to backend
  const savePracticeSession = async (correctAnswers, totalQuestions) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found, skipping session save');
        return;
      }

      const percentage = Math.round((correctAnswers / totalQuestions) * 100);
      
      // Prepare questions with user answers for history
      const questionsWithAnswers = questions.map(q => ({
        question: q.question,
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.options && q.options[q.correctAnswer] ? q.options[q.correctAnswer] : 'Unknown',
        userAnswer: selectedAnswers[q.id] !== undefined && q.options && q.options[selectedAnswers[q.id]] 
          ? q.options[selectedAnswers[q.id]] 
          : 'Not answered',
        isCorrect: selectedAnswers[q.id] === q.correctAnswer,
        technology: q.technology || 'General',
        questionType: 'mcq'
      }));

      const sessionData = {
        type: 'mcq',
        difficulty: 'Medium', // Default difficulty
        technologies: [...new Set(questions.map(q => q.technology || 'General'))],
        score: correctAnswers,
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswers,
        percentage: percentage,
        timeSpent: Math.ceil((1800 - timeLeft) / 60), // Time spent in minutes
        questions: questionsWithAnswers
      };

      console.log('💾 Saving practice session:', sessionData);
      
      const response = await axios.post('/api/candidate/practice/save-session', sessionData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Practice session saved successfully:', response.data);
    } catch (error) {
      console.error('Error saving practice session:', error);
      throw error;
    }
  };

  const getRating = (percentage) => {
    if (percentage >= 70) return 'Good';
    if (percentage >= 40) return 'Average';
    return 'Poor';
  };

  const getAnsweredCount = () => Object.values(selectedAnswers || {}).filter(v => v !== undefined).length;
  const getLeftCount = () => Math.max(0, (questions || []).length - getAnsweredCount());

  const confirmSubmit = async () => {
    setShowConfirmModal(false);
    await handleSubmit();
  };

  const startExam = async () => {
    setShowTerms(false);
    setExamStarted(true);
    
    // Request webcam permission
    await requestWebcamPermission();
  };

  const requestWebcamPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      setWebcamStream(stream);
      setWebcamPermission('granted');
      setCameraPermissionGranted(true);
      
      // Create video element for webcam preview in header
      setTimeout(() => {
        const videoElement = document.getElementById('webcam-preview-mcq');
        if (videoElement && stream) {
          videoElement.srcObject = stream;
          videoElement.play();
        }
      }, 100);
      
    } catch (error) {
      console.error('Webcam permission denied:', error);
      setWebcamPermission('denied');
      setCameraPermissionGranted(false);
      
      // Show warning but allow test to continue
      alert('⚠️ Webcam access denied. The test will continue but may be monitored through other means.');
    }
  };

  const requestCameraPermission = async () => {
    setIsInitializingProctor(true);
    await requestWebcamPermission();
    setIsInitializingProctor(false);
  };

  const hideDashboardLayout = () => {
    // Function to hide dashboard layout during exam
    const dashboardElements = document.querySelectorAll('.dashboard-layout, .sidebar, .header');
    dashboardElements.forEach(el => {
      if (el) el.style.display = 'none';
    });
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
      setWebcamPermission('pending');
    }
  };

  const getQuestionStatus = () => {
    return questions.map((q, index) => ({
      questionNumber: index + 1,
      answered: selectedAnswers[q.id] !== undefined,
      current: index === currentQuestion
    }));
  };

  // Fullscreen functions
  const enterFullscreen = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen not supported:', error);
    }
  };


  const disableSecurityFeatures = () => {
    // Disable keyboard shortcuts and copy/paste
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
  };

  const enableSecurityFeatures = () => {
    // Re-enable keyboard shortcuts and copy/paste
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('contextmenu', handleRightClick);
    document.removeEventListener('selectstart', handleSelectStart);
    document.removeEventListener('copy', handleCopyPaste);
    document.removeEventListener('paste', handleCopyPaste);
    document.removeEventListener('cut', handleCopyPaste);
  };

  const handleKeyDown = (e) => {
    // Disable common shortcuts
    if (
      e.key === 'F12' || // Developer tools
      (e.ctrlKey && e.key === 'u') || // View source
      (e.ctrlKey && e.key === 'c') || // Copy
      (e.ctrlKey && e.key === 'v') || // Paste
      (e.ctrlKey && e.key === 'x') || // Cut
      (e.ctrlKey && e.key === 'a') || // Select all
      (e.ctrlKey && e.key === 's') || // Save
      (e.ctrlKey && e.key === 'p') || // Print
      (e.ctrlKey && e.shiftKey && e.key === 'I') || // Dev tools
      (e.ctrlKey && e.shiftKey && e.key === 'J') || // Console
      (e.ctrlKey && e.shiftKey && e.key === 'C') || // Inspect
      e.key === 'Escape' // Escape key
    ) {
      e.preventDefault();
      return false;
    }
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    return false;
  };

  const handleSelectStart = (e) => {
    e.preventDefault();
    return false;
  };

  const handleCopyPaste = (e) => {
    e.preventDefault();
    return false;
  };

  // Simple, minimal test UI (inline-friendly). Skips terms/fullscreen/webcam.
  if (simpleMode) {
    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
          <div>Loading MCQs...</div>
        </div>
      );
    }

    // After submit, do not switch to a separate result page; keep rendering the test UI
    return (
      <div className="mcq-test-fullscreen theme-dark" ref={containerRef}>
        {/* Backdrop for modals/popups */}
        {(showConfirmModal || showSuccessPopup) && createPortal(
          (<div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 2147483646 }} />),
          document.body
        )}
        {/* Centered Success Popup for simple mode */}
        {showSuccessPopup && createPortal(
          (
            <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2147483647, pointerEvents: 'none' }}>
              <div style={{
                background: '#111827',
                padding: '16px 20px',
                borderRadius: 12,
                color: '#e5e7eb',
                minWidth: 320,
                maxWidth: 520,
                boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                border: '1px solid #1f2937',
                textAlign: 'center',
                pointerEvents: 'auto'
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>🎉 Submitted successfully</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>Redirecting to Practice…</div>
                <div style={{ color: '#10b981', marginTop: 6, fontWeight: 700 }}>
                  Score: {(result?.score ?? score)}/{(result?.total ?? questions.length)}
                </div>
                <div style={{ color: '#2563eb', marginBottom: '8px', fontWeight: 700 }}>
                  Rating: {getRating(((result?.total ?? questions.length)) ? Math.round(((result?.score ?? score) / (result?.total ?? questions.length)) * 100) : 0)}
                </div>
                <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Closing in 5 seconds…</p>
              </div>
            </div>
          ),
          document.body
        )}
        {/* Centered Confirm Modal for simple mode */}
        {showConfirmModal && createPortal(
          (
            <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2147483647 }}>
              <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 12, padding: 20, width: 420, color: '#e5e7eb' }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Confirm Submit</div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>Are you sure you want to submit?
                  Review your progress below:</div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
                  <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#9ca3af', textTransform: 'uppercase' }}>Answered</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{getAnsweredCount()}</div>
                  </div>
                  <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#9ca3af', textTransform: 'uppercase' }}>Left</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{getLeftCount()}</div>
                  </div>
                  <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#9ca3af', textTransform: 'uppercase' }}>Total</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#60a5fa' }}>{questions.length}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button onClick={() => setShowConfirmModal(false)} style={{ padding: '8px 12px', borderRadius: 8, background: '#111827', color: '#e5e7eb', border: '1px solid #374151' }}>Cancel</button>
                  <button onClick={confirmSubmit} style={{ padding: '8px 12px', borderRadius: 8, background: '#10b981', color: '#fff', border: '1px solid #059669', fontWeight: 700 }}>Confirm Submit</button>
                </div>
              </div>
            </div>
          ),
          document.body
        )}
        <div className="simple-mcq-container" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0, position: 'relative', height: 'calc(100vh - 80px)', boxSizing: 'border-box' }}>
          <div className="simple-mcq-card" style={{ background: '#0b1220', border: '1px solid #1f2937', borderRadius: 8, overflow: 'visible', position: 'relative', height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="simple-mcq-header" ref={headerRef} style={{ background: '#0b1426', borderBottom: '1px solid #1f2937', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, minHeight: '60px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', flexShrink: 0 }}></div>
                  <h1 style={{ color: '#e5e7eb', fontWeight: 700, fontSize: 18, margin: 0, whiteSpace: 'nowrap' }}>
                    MCQ Practice Test
                  </h1>
                </div>
              </div>
              {timerEnabled ? (
                <div style={{ color: '#e5e7eb', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                  ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontWeight: 600 }}>No time limit</div>
              )}
            </div>

            {/* Progress */}
            <div className="simple-mcq-progress" style={{ padding: 16, borderBottom: '1px solid #1f2937' }}>
              <div style={{ width: '100%', height: 8, background: '#1f2937', borderRadius: 999 }}>
                <div
                  className="simple-mcq-progress-fill"
                  style={{
                    width: `${questions.length ? ((currentQuestion + 1) / questions.length) * 100 : 0}%`,
                    height: '100%',
                    background: '#3b82f6',
                    borderRadius: 999,
                    transition: 'width .2s ease'
                  }}
                />
              </div>
            </div>

            {/* Content with Sidebar */}
            <div className="simple-mcq-body" style={{ display: 'flex', gap: 0, flex: 1, minHeight: 0, position: 'relative' }}>
              {/* Left Sidebar: Question Status */}
              <aside className="simple-mcq-sidebar" style={{ width: showSimpleSidebar ? 260 : 0, transition: 'width .2s ease', borderLeft: '1px solid #1f2937', padding: showSimpleSidebar ? 16 : 0, background: '#0b1426', overflow: 'visible', overflowY: showSimpleSidebar ? 'auto' : 'visible', position: 'relative', zIndex: 3, order: 2 }}>
                {/* Sticky header with counters */}
                <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(11,20,38,0.95)', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #1f2937' }}>
                  <div className="simple-mcq-sidebar-title" style={{ color: '#e5e7eb', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Question Status</span>
                    <span style={{ display: 'flex', gap: 6 }}>
                      <span style={{ background: '#111827', color: '#9ca3af', border: '1px solid #1f2937', borderRadius: 999, padding: '2px 8px', fontSize: 12 }}>Ans {Object.values(selectedAnswers || {}).filter(v => v !== undefined).length}</span>
                      <span style={{ background: '#111827', color: '#9ca3af', border: '1px solid #1f2937', borderRadius: 999, padding: '2px 8px', fontSize: 12 }}>Left {(questions || []).length - Object.values(selectedAnswers || {}).filter(v => v !== undefined).length}</span>
                    </span>
                  </div>
                </div>
                <div className="simple-mcq-status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {questions.map((q, idx) => {
                    const isCurrent = idx === currentQuestion;
                    const answered = selectedAnswers[q.id] !== undefined;
                    const bg = isCurrent ? 'linear-gradient(180deg,#3b82f6,#2563eb)' : answered ? 'rgba(16,185,129,0.15)' : 'transparent';
                    const border = isCurrent ? '#2563eb' : answered ? 'rgba(16,185,129,0.7)' : '#374151';
                    const color = isCurrent ? '#fff' : answered ? '#10b981' : '#9ca3af';
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestion(idx)}
                        title={`Go to question ${idx + 1}`}
                        style={{
                          background: bg,
                          border: `1px solid ${border}`,
                          color,
                          height: 36,
                          borderRadius: 10,
                          fontWeight: 800,
                          boxShadow: isCurrent ? '0 6px 14px rgba(37,99,235,0.25)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center'
                        }}
                      >
                        {idx + 1}
                      </button>
                  )})}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 16, color: '#9ca3af', fontSize: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, background: '#3b82f6', borderRadius: 999, display: 'inline-block' }}></span>
                    Current
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, background: '#10b981', borderRadius: 999, display: 'inline-block' }}></span>
                    Answered
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, border: '1px solid #374151', borderRadius: 999, display: 'inline-block' }}></span>
                    Not Answered
                  </span>
                </div>
              </aside>

              {/* Right: Question and Navigation */}
              {/* Toggle handle anchored to right boundary (sidebar on right) */}
              <button
                onClick={() => setShowSimpleSidebar(s => !s)}
                aria-label="Toggle question status sidebar"
                title="Toggle question status"
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: showSimpleSidebar ? 268 : 8,
                  transform: 'translateY(-50%)',
                  width: 36,
                  height: 48,
                  borderRadius: 10,
                  border: '1px solid #334155',
                  background: '#111827',
                  color: '#f9fafb',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                  zIndex: 30,
                  fontSize: 18,
                  lineHeight: '1'
                }}
              >
                {showSimpleSidebar ? '❯' : '❮'}
              </button>

              <div className="simple-mcq-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 1, order: 1 }}>
                {/* Question */}
                <div className="simple-mcq-question" style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
                  {questions.length > 0 ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                        <span style={{ background: '#3b82f6', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>Q{currentQuestion + 1}</span>
                        <h3 style={{ margin: 0, color: '#e5e7eb', fontSize: 18 }}>{questions[currentQuestion]?.question}</h3>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {questions[currentQuestion]?.options?.map((option, index) => (
                          <label key={index} className="simple-mcq-option" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: '#0f172a',
                            border: '1px solid #1f2937',
                            color: '#e5e7eb',
                            borderRadius: 10,
                            padding: '10px 12px',
                            cursor: 'pointer'
                          }}>
                            <input
                              type="radio"
                              name={`question-${questions[currentQuestion].id}`}
                              value={index}
                              checked={selectedAnswers[questions[currentQuestion].id] === index}
                              onChange={() => handleAnswerSelect(questions[currentQuestion].id, index)}
                              style={{ width: 16, height: 16 }}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0' }}>No questions available.</div>
                  )}
                </div>

                {/* Navigation - replaced by floating bottom-right mini buttons */}
              </div>
            </div>
          </div>
          {/* Floating bottom-right mini navigation */}
          <div style={{ position: 'fixed', right: 20, bottom: 20, display: 'flex', gap: 8, zIndex: 2100 }}>
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              style={{ padding: '8px 12px', borderRadius: 6, background: '#111827', color: '#e5e7eb', border: '1px solid #374151', opacity: currentQuestion === 0 ? 0.6 : 1, fontSize: 12 }}
              title="Previous"
            >
              Prev
            </button>
            {currentQuestion < Math.max(0, questions.length - 1) ? (
              <button
                onClick={handleNext}
                style={{ padding: '8px 12px', borderRadius: 6, background: '#2563eb', color: '#fff', border: '1px solid #1d4ed8', fontSize: 12 }}
                title="Next"
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={loading}
                style={{ padding: '8px 12px', borderRadius: 6, background: '#10b981', color: '#fff', border: '1px solid #059669', fontSize: 12, opacity: loading ? 0.7 : 1 }}
                title="Submit"
              >
                {loading ? 'Submitting…' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Terms and Conditions Screen
  if (showTerms) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#f8fafc', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '30px',
            color: '#1f2937'
          }}>Terms & Conditions</h2>
          
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px',
            maxHeight: '300px',
            overflowY: 'auto',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ color: '#374151', marginBottom: '15px' }}>Exam Rules & Regulations:</h3>
            <ul style={{ color: '#6b7280', lineHeight: '1.6', paddingLeft: '20px' }}>
              <li>This is a timed examination. You have 30 minutes to complete all questions.</li>
              <li>Once started, the exam will enter full-screen mode for security.</li>
              <li>Copy, paste, and text selection are disabled during the exam.</li>
              <li>Right-click context menu is disabled.</li>
              <li>Browser shortcuts (F12, Ctrl+U, etc.) are blocked.</li>
              <li>You cannot exit full-screen mode until the exam is completed.</li>
              <li>Each question has only one correct answer.</li>
              <li>You can navigate between questions using Previous/Next buttons.</li>
              <li>Your answers are automatically saved as you select them.</li>
              <li>Click 'Submit Test' when you're done with all questions.</li>
              <li>Once submitted, you cannot change your answers.</li>
              <li>Your score will be displayed immediately after submission.</li>
            </ul>
          </div>
          
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '30px'
          }}>
            <p style={{ color: '#92400e', margin: 0, fontWeight: '500' }}>
              ⚠️ Warning: Any attempt to cheat or violate exam rules will result in automatic disqualification.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              onClick={() => window.history.back()}
              style={{
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button
              onClick={startExam}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem'
              }}
            >
              I Agree - Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading MCQs...</div>
      </div>
    );
  }

  // Pre-exam screen for test mode
  if (isTestMode && !examStarted && questions.length > 0) {
    return (
      <div className="mcq-pre-exam-screen" style={{ color: '#e5e7eb' }}>
        <div className="mcq-pre-exam-content">
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>🔒</div>
          <h1 style={{ fontSize: '32px', marginBottom: '16px', color: '#ef4444' }}>
            SECURE EXAM MODE
          </h1>
          <h2 style={{ fontSize: '24px', marginBottom: '32px', color: '#e5e7eb' }}>
            {companyOrRecruiter}
          </h2>
          
          <div style={{ textAlign: 'left', marginBottom: '32px', lineHeight: '1.6' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>⚠️ Security Notice:</h3>
            <ul style={{ paddingLeft: '20px', color: '#cbd5e1' }}>
              <li>This exam will enter fullscreen mode</li>
              <li>Camera monitoring will be activated</li>
              <li>Tab switching is limited to {MAX_TAB_SWITCHES} times</li>
              <li>Right-click and developer tools are disabled</li>
              <li>Maximum {MAX_WARNINGS} security warnings allowed</li>
              <li>Exam will auto-terminate on violations</li>
            </ul>
          </div>

          <div style={{ 
            background: '#0f172a',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '32px',
            border: '1px solid #1e293b'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>📝 Questions:</span>
              <span>{questions.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>⏱️ Time Limit:</span>
              <span>{Math.floor(timeLeft / 60)} minutes</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>📹 Proctoring:</span>
              <span style={{ color: cameraPermissionGranted ? '#10b981' : '#f59e0b' }}>
                {cameraPermissionGranted ? 'Ready' : 'Initializing...'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setExamStarted(true);
              if (!cameraPermissionGranted) {
                requestCameraPermission();
              }
            }}
            disabled={isInitializingProctor}
            style={{
              background: cameraPermissionGranted ? '#ef4444' : '#6b7280',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: cameraPermissionGranted ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto'
            }}
          >
            <span>🚀</span>
            {isInitializingProctor ? 'Initializing...' : 'START SECURE EXAM'}
          </button>

          {!cameraPermissionGranted && (
            <p style={{ 
              marginTop: '16px', 
              fontSize: '14px', 
              color: '#f59e0b' 
            }}>
              Please allow camera access to start the exam
            </p>
          )}

          {/* Debug buttons for testing */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                console.log('🔧 Testing dashboard hide...');
                hideDashboardLayout();
              }}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Test Hide Dashboard
            </button>
            <button
              onClick={() => {
                console.log('🔧 Testing camera...');
                requestCameraPermission();
              }}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Test Camera
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">MCQ Test Completed!</h2>
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-lg mb-4">Your Score: {score}/{questions.length}</p>
          <p className="text-gray-600">Percentage: {Math.round((score/questions.length) * 100)}%</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`mcq-test-fullscreen ${showQuestionStatus ? 'qs-open' : ''} theme-${theme}`} style={{
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      minHeight: '100vh',
      position: 'relative'
    }}>
      {/* Backdrop for modals/popups */}
      {(showConfirmModal || showSuccessPopup) && createPortal(
        (<div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 2147483646 }} />),
        document.body
      )}
      {/* Centered Success Popup */}
      {showSuccessPopup && createPortal(
        (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2147483647, pointerEvents: 'none' }}>
            <div style={{
              background: '#111827',
              padding: '16px 20px',
              borderRadius: 12,
              color: '#e5e7eb',
              minWidth: 320,
              maxWidth: 520,
              boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
              border: '1px solid #1f2937',
              textAlign: 'center',
              pointerEvents: 'auto'
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>🎉 Submitted successfully</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Redirecting to Practice…</div>
              <div style={{ color: '#10b981', marginTop: 6, fontWeight: 700 }}>
                Score: {score}/{questions.length}
              </div>
              <div style={{ color: '#2563eb', marginBottom: '8px', fontWeight: 700 }}>
                Rating: {getRating(questions.length ? Math.round((score / questions.length) * 100) : 0)}
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Closing in 5 seconds…</p>
            </div>
          </div>
        ),
        document.body
      )}
      {/* Centered Confirm Modal */}
      {showConfirmModal && createPortal(
        (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2147483647 }}>
            <div style={{ background: theme === 'light' ? '#ffffff' : '#0f172a', border: '1px solid #1f2937', borderRadius: 12, padding: 20, width: 420, color: theme === 'light' ? '#111827' : '#e5e7eb' }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Confirm Submit</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>Are you sure you want to submit? Review your progress below:</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ background: theme === 'light' ? '#f3f4f6' : '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase' }}>Answered</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{getAnsweredCount()}</div>
                </div>
                <div style={{ background: theme === 'light' ? '#f3f4f6' : '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase' }}>Left</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{getLeftCount()}</div>
                </div>
                <div style={{ background: theme === 'light' ? '#f3f4f6' : '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase' }}>Total</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#60a5fa' }}>{questions.length}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={() => setShowConfirmModal(false)} style={{ padding: '8px 12px', borderRadius: 8, background: theme === 'light' ? '#f3f4f6' : '#111827', color: 'inherit', border: '1px solid #374151' }}>Cancel</button>
                <button onClick={confirmSubmit} style={{ padding: '8px 12px', borderRadius: 8, background: '#10b981', color: '#fff', border: '1px solid #059669', fontWeight: 700 }}>Confirm Submit</button>
              </div>
            </div>
          </div>
        ),
        document.body
      )}

      {/* Custom Test Header */}
      {examStarted && (
        <div ref={headerRef} className="custom-header">
          {/* Left: Brand + Recruiter/Company */}
          <div className="header-left">
            <div className="brand-badge">SmartHireX</div>
            <div className="brand-sub">{companyOrRecruiter}</div>
          </div>

          {/* Center: Small Timer */}
          <div className="header-center">
            <div className="timer-badge" style={{
              animation: timeLeft <= 300 ? 'pulse 2s infinite' : 'none'
            }}>
              <span>⏱️</span>
              <span className="timer-text">{formatTime(timeLeft)}</span>
            </div>
            {examStarted && (
              <div className="timer-subtext">
                Question {currentQuestion + 1} of {questions.length} complete
              </div>
            )}
          </div>

          {/* Right: Webcam + Toggles */}
          <div className="header-right">
            <div className="header-right-stack">
              <div className="secure-pill">🔒 SECURE MODE</div>
              <button
                onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
                className={`theme-toggle-switch ${theme === 'light' ? 'on' : 'off'}`}
                role="switch"
                aria-checked={theme === 'light'}
                aria-label="Toggle light mode"
                title={theme === 'dark' ? 'Enable light mode' : 'Enable dark mode'}
              >
                <span className="switch-track">
                  <span className="icon left">🌙</span>
                  <span className="icon right">☀️</span>
                </span>
                <span className="switch-knob" />
              </button>
            </div>

            <div className="webcam-container">
              {webcamPermission === 'granted' && webcamStream ? (
                <video
                  id="webcam-preview-mcq"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
                  autoPlay
                  muted
                  playsInline
                />
              ) : (
                <>
                  <div style={{
                    fontSize: '20px',
                    animation: webcamPermission === 'granted' ? 'blink 1s infinite' : 'none',
                    color: webcamPermission === 'granted' ? '#10b981' : webcamPermission === 'denied' ? '#ef4444' : '#fbbf24'
                  }}>📹</div>
                  <div style={{ fontSize: '10px', marginTop: '2px' }}>
                    {webcamPermission === 'granted' ? 'LOADING' : webcamPermission === 'denied' ? 'DENIED' : 'WEBCAM'}
                  </div>
                </>
              )}
              {webcamPermission === 'granted' && (
                <div className="webcam-indicator"></div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Floating right-center toggle for Question Status */}
      {examStarted && (
        <div
          className={`qs-toggle ${showQuestionStatus ? 'open' : ''}`}
          onClick={() => setShowQuestionStatus(!showQuestionStatus)}
          title="Question Status"
        >
          <span style={{ fontSize: '18px' }}>{showQuestionStatus ? '❯' : '❮'}</span>
        </div>
      )}

      {/* Question Status Sidebar + Overlay */}
      {examStarted && (
        <>
          <div
            className={`qs-overlay ${showQuestionStatus ? 'open' : ''}`}
            onClick={() => setShowQuestionStatus(false)}
          />
          <div className={`qs-sidebar ${showQuestionStatus ? 'open' : ''}`}>
            <div className="qs-grid">
              {getQuestionStatus().map((status, index) => (
                <div
                  key={index}
                  className="qs-item"
                  style={{
                    backgroundColor: status.current
                      ? '#3b82f6'
                      : status.answered
                      ? '#10b981'
                      : (theme === 'light' ? '#e5e7eb' : 'rgba(255,255,255,0.15)')
                  }}
                  onClick={() => setCurrentQuestion(index)}
                >
                  {status.questionNumber}
                </div>
              ))}
            </div>
            <div className="qs-legend">
              <div>🔵 Current Question</div>
              <div>🟢 Answered</div>
              <div>⚪ Not Answered</div>
            </div>
          </div>
        </>
      )}
      
    <div className="mcq-content" style={{ 
      maxWidth: examStarted ? '100%' : '1000px', 
      margin: examStarted ? '0' : '0 auto', 
      padding: examStarted ? '20px' : '20px'
    }}>
      <div className="bg-white rounded-lg shadow-md">
        {/* Header - Only show if not in exam mode */}
        {!examStarted && (
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <h1 className="text-xl font-semibold">MCQ Practice Test</h1>
            <div className="text-lg font-mono">⏱️ {formatTime(timeLeft)}</div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="p-4 border-b">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Content */}
        <div className="p-6 question-card">
          {questions.length > 0 ? (
            <div>
              <h3 className="question-title mb-4">
                <span className="q-badge">Q{currentQuestion + 1}</span>
                <span>{questions[currentQuestion]?.question}</span>
              </h3>
              <div className="space-y-3">
                {questions[currentQuestion]?.options?.map((option, index) => (
                  <label key={index} className="option-item">
                    <input
                      type="radio"
                      name={`question-${questions[currentQuestion].id}`}
                      value={index}
                      checked={selectedAnswers[questions[currentQuestion].id] === index}
                      onChange={() => handleAnswerSelect(questions[currentQuestion].id, index)}
                      className="w-4 h-4"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No questions available. Please check back later.</p>
            </div>
          )}
        </div>

        {/* Navigation (show here only before exam starts) */}
        {!examStarted && questions.length > 0 && (
          <div className="p-4 border-t flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded disabled:opacity-50"
            >
              ← Previous
            </button>
            {currentQuestion < questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Test'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    {/* Floating bottom-right navigation during exam */}
    {examStarted && questions.length > 0 && (
      <div className="mcq-nav-floating">
        <button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className="mcq-btn btn-prev"
          title="Previous"
        >
          ← Prev
        </button>
        {currentQuestion < questions.length - 1 ? (
          <button
            onClick={handleNext}
            className="mcq-btn btn-next"
            title="Next"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={loading}
            className="mcq-btn btn-submit"
            title="Submit"
          >
            {loading ? 'Submitting…' : 'Submit'}
          </button>
        )}
      </div>
    )}
    
    </div>
  );
}
