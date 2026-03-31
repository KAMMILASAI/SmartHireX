import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Interview.css';
import logo from '../assets/SmarthireX-logo.jpeg';
import { API_BASE_URL } from '../config';
import { useToast } from '../contexts/ToastContext';

export default function Interview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess } = useToast();
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(2700); // 45 minutes
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [webcamStream, setWebcamStream] = useState(null);
  const [webcamPermission, setWebcamPermission] = useState('pending');
  // Typing animations
  const [questionTyping, setQuestionTyping] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const questionTypingTimerRef = useRef(null);
  // Per-question timer starts when user starts speaking
  const questionTimerRef = useRef(null);
  const [questionTimerRunning, setQuestionTimerRunning] = useState(false);
  // Chat history per question: { [questionId]: [{ role: 'ai'|'user', text: string }] }
  const [chatHistory, setChatHistory] = useState({});
  // UI: chat autoscroll
  const chatScrollRef = useRef(null);
  // Video layout: which stream is primary in the big area
  const [primaryVideo, setPrimaryVideo] = useState('interviewer'); // 'interviewer' | 'user'
  // Video refs for attaching MediaStreams
  const userBigVideoRef = useRef(null);
  const userPipVideoRef = useRef(null);
  // Removed Q-Status feature for a cleaner header

  // Auto-scroll chat to latest message/typing
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatHistory, questionTyping, liveTranscript, currentQuestion]);

  // Attach webcam stream to the correct video based on primaryVideo
  useEffect(() => {
    if (!webcamStream) return;
    try {
      if (primaryVideo === 'user') {
        if (userBigVideoRef.current) userBigVideoRef.current.srcObject = webcamStream;
        if (userPipVideoRef.current) userPipVideoRef.current.srcObject = webcamStream;
      } else {
        if (userPipVideoRef.current) userPipVideoRef.current.srcObject = webcamStream;
        if (userBigVideoRef.current) userBigVideoRef.current.srcObject = webcamStream; // keep ready if swapped
      }
    } catch (e) {
      // no-op; some browsers require a small delay
      setTimeout(() => {
        if (primaryVideo === 'user') {
          if (userBigVideoRef.current) userBigVideoRef.current.srcObject = webcamStream;
          if (userPipVideoRef.current) userPipVideoRef.current.srcObject = webcamStream;
        } else {
          if (userPipVideoRef.current) userPipVideoRef.current.srcObject = webcamStream;
          if (userBigVideoRef.current) userBigVideoRef.current.srcObject = webcamStream;
        }
      }, 50);
    }
  }, [webcamStream, primaryVideo]);

  // Helper: format seconds to MM:SS
  const formatTime = (totalSeconds) => {
    const s = Math.max(0, Number(totalSeconds) || 0);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  // Helper: format timestamp to HH:MM
  const formatStamp = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Helper: return an icon for question type
  const getQuestionTypeIcon = (type) => {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'technical':
        return '🧠';
      case 'behavioral':
        return '💬';
      case 'system design':
      case 'design':
        return '🛠️';
      case 'culture':
        return '🤝';
      default:
        return '❓';
    }
  };

  // Helper: return a hex color used to style badges based on question type
  const getQuestionTypeColor = (type) => {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'technical':
        return '#3b82f6'; // blue
      case 'behavioral':
        return '#f59e0b'; // amber
      case 'system design':
      case 'design':
        return '#10b981'; // green
      case 'culture':
        return '#a855f7'; // purple
      default:
        return '#94a3b8'; // neutral slate for unknown/undefined
    }
  };

  // Load questions from AI API or use fallback
  const loadQuestions = async () => {
    try {
      setLoading(true);
      const state = location.state || {};
      const interviewParams = state.interview;
      
      let qs = [];
      
      // Try to generate AI questions if interview parameters are provided
      if (interviewParams) {
        try {
          console.log('Generating AI interview questions with params:', interviewParams);
          
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/candidate/practice/ai-interview`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(interviewParams)
          });
          
          if (response.ok) {
            const data = await response.json();
            qs = data.questions || [];
            console.log('Generated AI questions:', qs);
          } else {
            console.error('AI interview API failed:', response.status);
            throw new Error('AI service unavailable');
          }
        } catch (aiError) {
          console.error('AI interview generation failed:', aiError);
          showError('AI Interview Service Unavailable', 'Unable to generate interview questions. Please try again later or contact support.');
          setTimeout(() => navigate('/candidate/partices', { replace: true }), 100);
          return;
        }
      }
      
      // If no AI questions and no params, show error
      if (qs.length === 0) {
        console.error('No interview questions available');
        showError('Interview Setup Required', 'Please set up your interview parameters from the practice page.');
        setTimeout(() => navigate('/candidate/partices', { replace: true }), 100);
        return;
      }
      
      setQuestions(qs);
      setCurrentQuestion(0);
      setQuestionTimeLeft(qs[0]?.timeLimit ?? 120);
      // Don't speak the first question yet - wait for user to start exam
    } catch (err) {
      console.error('Failed to load questions', err);
      showError('Interview System Error', 'Unable to initialize interview system. Please try again or contact support.');
      setTimeout(() => navigate('/candidate/partices', { replace: true }), 100);
      return;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load interview questions
    loadQuestions();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { enableSecurityFeatures(); } catch {}
      try { exitFullscreen(); } catch {}
      try { stopWebcam(); } catch {}
    };
  }, []);

  // (removed erroneous useEffect)

  // Text-to-Speech
  const speak = (text) => {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.pitch = 1;
      utter.onstart = () => {
        setIsSpeaking(true);
        // Ensure recording is not active while AI is speaking
        stopRecognition();
      };
      utter.onend = () => {
        setIsSpeaking(false);
        // Auto-start recording only after AI finishes asking the question
        if (!isRecording) {
          setTimeout(() => startRecognition(), 200);
        }
      };
      window.speechSynthesis.speak(utter);
    } catch {}
  };

  const stopSpeaking = () => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {}
    setIsSpeaking(false);
  };

  // Auto-speak on question change then auto-start recording when speaking ends
  useEffect(() => {
    if (!examStarted) return;
    const q = questions[currentQuestion];
    if (q?.text) {
      stopSpeaking();
      speak(q.text);
      // Start one-time typing animation for question text
      try { if (questionTypingTimerRef.current) clearInterval(questionTypingTimerRef.current); } catch {}
      setQuestionTyping('');
      let i = 0;
      const text = q.text;
      questionTypingTimerRef.current = setInterval(() => {
        i += 1;
        setQuestionTyping(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(questionTypingTimerRef.current);
          questionTypingTimerRef.current = null;
          // After typing completes, persist AI message into chat history
          setChatHistory((prev) => {
            const pid = q.id;
            const existing = prev[pid] || [];
            const hasAi = existing.some((m) => m.role === 'ai' && m.text === text);
            return hasAi ? prev : { ...prev, [pid]: [...existing, { role: 'ai', text, ts: Date.now() }] };
          });
        }
      }, 25);
    }
    // stop recognition when changing question
    stopRecognition();
  }, [currentQuestion, examStarted]);

  // Initialize time for the current question but don't start timer yet
  useEffect(() => {
    if (!examStarted || questions.length === 0) return;
    const q = questions[currentQuestion];
    const initial = Number(q?.timeLimit) || 120;
    setQuestionTimeLeft(initial);
    // reset timer state
    try { if (questionTimerRef.current) clearInterval(questionTimerRef.current); } catch {}
    setQuestionTimerRunning(false);
  }, [examStarted, currentQuestion, questions.length]);

  // Start countdown when recording starts
  useEffect(() => {
    if (!examStarted) return;
    if (isRecording && !questionTimerRunning) {
      setQuestionTimerRunning(true);
      questionTimerRef.current = setInterval(() => {
        setQuestionTimeLeft((prev) => {
          if (prev <= 1) {
            try { clearInterval(questionTimerRef.current); } catch {}
            setQuestionTimerRunning(false);
            // Stop recording and advance/submit
            stopRecognition();
            if (currentQuestion < questions.length - 1) {
              setCurrentQuestion((c) => c + 1);
            } else {
              handleSubmit();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      // cleanup interval if component rerenders with different deps
      if (!isRecording && questionTimerRunning) {
        try { clearInterval(questionTimerRef.current); } catch {}
        setQuestionTimerRunning(false);
      }
    };
  }, [examStarted, isRecording, currentQuestion, questions.length]);

  // Cleanup timers on unmount
  useEffect(() => () => {
    try { if (questionTypingTimerRef.current) clearInterval(questionTypingTimerRef.current); } catch {}
    try { if (questionTimerRef.current) clearInterval(questionTimerRef.current); } catch {}
  }, []);


  // Ensure speech recognition is set up
  const ensureRecognition = () => {
    if (recognitionRef.current) {
      return recognitionRef.current;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setLiveTranscript(interimTranscript);

      if (finalTranscript) {
        const q = questions[currentQuestion];
        if (q) {
          setAnswers(prev => ({
            ...prev,
            [q.id]: ((prev[q.id] || '') + ' ' + finalTranscript).trim()
          }));

          setChatHistory(prev => {
            const list = prev[q.id] || [];
            const newList = [...list];
            if (newList.length > 0 && newList[newList.length - 1].role === 'user') {
              const last = { ...newList[newList.length - 1] };
              last.text = (last.text + ' ' + finalTranscript).trim();
              last.ts = Date.now();
              newList[newList.length - 1] = last;
            } else {
              newList.push({ role: 'user', text: finalTranscript, ts: Date.now() });
            }
            return { ...prev, [q.id]: newList };
          });
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        showError('Microphone Permission Denied', 'Please allow microphone access to continue with the interview.');
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsRecording(false);
      setLiveTranscript('');
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const startRecognition = () => {
    console.log('startRecognition called, isSpeaking:', isSpeaking, 'examStarted:', examStarted);
    
    // Do not allow starting while AI is speaking
    if (isSpeaking) {
      console.log('Cannot start recognition: AI is speaking');
      return;
    }
    
    // Only allow recognition during exam
    if (!examStarted) {
      console.log('Cannot start recognition: Exam not started');
      return;
    }
    
    const rec = ensureRecognition();
    if (!rec) {
      showError('Speech Recognition Not Supported', 'Your browser does not support speech recognition. Please use Chrome or Edge.');
      return;
    }
    
    try {
      console.log('Starting speech recognition...');
      rec.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      showError('Speech Recognition Error', 'Unable to start speech recognition. Please check your microphone permissions.');
    }
  };

  const stopRecognition = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
    setIsRecording(false);
  };

  // Toggle mic recording; don't start while AI is speaking
  const toggleRecording = () => {
    if (isSpeaking) {
      // Prevent talking over the AI; user can press again after TTS
      return;
    }
    if (isRecording) {
      stopRecognition();
    } else {
      startRecognition();
    }
  };

  const enterFullscreen = () => {
    const elem = document.documentElement;
    try {
      if (elem.requestFullscreen) {
        const p = elem.requestFullscreen();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } catch (_) {
      // Ignore lack of user gesture or unsupported API
    }
    
    // Hide dashboard elements
    const sidebar = document.querySelector('.sidebar');
    const header = document.querySelector('.header');
    if (sidebar) sidebar.style.display = 'none';
    if (header) header.style.display = 'none';
  };

  const exitFullscreen = () => {
    try {
      // Check if document is actually in fullscreen mode before trying to exit
      if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
    } catch (error) {
      console.warn('Error exiting fullscreen:', error);
    }
    
    // Show dashboard elements
    const sidebar = document.querySelector('.sidebar');
    const header = document.querySelector('.header');
    if (sidebar) sidebar.style.display = 'block';
    if (header) header.style.display = 'block';
  };

  const disableSecurityFeatures = () => {
    // Disable right-click
    document.addEventListener('contextmenu', preventAction);
    
    // Disable keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
    
    // Disable copy/paste
    document.addEventListener('copy', preventAction);
    document.addEventListener('paste', preventAction);
    document.addEventListener('cut', preventAction);
    
    // Disable text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
  };

  const enableSecurityFeatures = () => {
    document.removeEventListener('contextmenu', preventAction);
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('copy', preventAction);
    document.removeEventListener('paste', preventAction);
    document.removeEventListener('cut', preventAction);
    
    document.body.style.userSelect = 'auto';
    document.body.style.webkitUserSelect = 'auto';
    try { document.body.style.overflow = 'auto'; } catch {}
  };

  const preventAction = (e) => {
    e.preventDefault();
    return false;
  };

  const handleKeyDown = (e) => {
    // Disable F12, Ctrl+Shift+I, Ctrl+U, etc.
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && e.key === 'I') ||
      (e.ctrlKey && e.key === 'u') ||
      (e.ctrlKey && e.key === 'U') ||
      e.key === 'Escape' ||
      (e.ctrlKey && e.key === 's') ||
      (e.ctrlKey && e.key === 'S')
    ) {
      e.preventDefault();
      return false;
    }
  };

  // Webcam management
  const stopWebcam = () => {
    try {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => {
          track.stop();
        });
        setWebcamStream(null);
        setWebcamPermission('denied');
      }
    } catch (error) {
      console.error('Error stopping webcam:', error);
    }
  };


  const startExam = async () => {
    setShowTerms(false);
    // First ask mic and webcam permissions with a user gesture
    await requestWebcamPermission();
    // Enter secure mode only after permissions
    disableSecurityFeatures();
    enterFullscreen();
    setExamStarted(true);
    // Lock page scroll to fixed window size during interview
    try { document.body.style.overflow = 'hidden'; } catch {}
    
    // The useEffect will automatically speak the first question when examStarted becomes true
  };

  const requestWebcamPermission = async () => {
    try {
      // Request both audio (mic) and video (webcam)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setWebcamStream(stream);
      setWebcamPermission('granted');
      
      // Create video element for webcam preview in header
      setTimeout(() => {
        const videoElement = document.getElementById('webcam-preview-interview');
        if (videoElement && stream) {
          videoElement.srcObject = stream;
          videoElement.play();
        }
      }, 100);
      // We only needed mic permission prompt; stop audio tracks to avoid conflicts
      try { stream.getAudioTracks().forEach(t => t.stop()); } catch {}
      
    } catch (error) {
      console.error('Webcam permission denied:', error);
      setWebcamPermission('denied');
      alert('⚠️ Webcam access denied. The test will continue but may be monitored through other means.');
    }
  };

  // Navigation handlers
  const handlePrevious = () => {
    if (currentQuestion <= 0) return;
    stopRecognition();
    setCurrentQuestion((c) => Math.max(0, c - 1));
  };

  const handleNext = () => {
    if (currentQuestion >= questions.length - 1) return;
    stopRecognition();
    setCurrentQuestion((c) => Math.min(questions.length - 1, c + 1));
  };

  // Submit current answer manually and move next (or finish)
  const submitCurrentAnswer = () => {
    // Stop listening first
    stopRecognition();
    const q = questions[currentQuestion];
    if (q) {
      // If there is interim text, merge it into the single user bubble and answers
      const interim = (liveTranscript || '').trim();
      if (interim) {
        setAnswers((prev) => ({
          ...prev,
          [q.id]: ((prev[q.id] || '') + (prev[q.id] ? ' ' : '') + interim).trim(),
        }));
        setChatHistory((prev) => {
          const list = prev[q.id] || [];
          const newList = [...list];
          if (newList.length > 0 && newList[newList.length - 1].role === 'user') {
            const last = { ...newList[newList.length - 1] };
            last.text = (last.text ? last.text + ' ' : '') + interim;
            last.ts = Date.now();
            newList[newList.length - 1] = last;
          } else {
            newList.push({ role: 'user', text: interim, ts: Date.now() });
          }
          return { ...prev, [q.id]: newList };
        });
        setLiveTranscript('');
      }
    }

    // Move to next question or finish
    if (currentQuestion < questions.length - 1) {
      const nextIdx = currentQuestion + 1;
      setCurrentQuestion(nextIdx);
      const nq = questions[nextIdx];
      if (nq?.text) {
        // Speak next question; mic will auto-start after TTS
        setTimeout(() => speak(nq.text), 150);
      }
    } else {
      // Last question -> finalize whole interview
      handleSubmit();
    }
  };

  // Submit handler
  const handleSubmit = async () => {
    try {
      setLoading(true);
      stopRecognition();
      stopSpeaking();
      // Compute a simple completion score (answered count)
      const answered = questions.filter((q) => (answers[q.id] || '').trim().length > 0).length;
      setScore(answered);
      setIsSubmitted(true);
      setShowSuccessPopup(true);
      
      // Show success notification
      showSuccess('Interview Completed!', `Successfully answered ${answered}/${questions.length} questions. Great job!`);

      // Gracefully exit fullscreen and stop webcam if active
      try { exitFullscreen(); } catch {}
      try { stopWebcam(); } catch {}

      // Start countdown timer
      setRedirectCountdown(5);
      const countdownInterval = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            navigate('/candidate/partices', { replace: true });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="interview-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading Interview Questions...</div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="interview-container">
        <div className="interview-result">
          <div className="result-content">
            <h2 className="result-title">Interview Practice Completed!</h2>
            <div className="result-emoji">🎤</div>
            <p className="result-score">Questions Answered: {score}/{questions.length}</p>
            <p className="result-percentage">Completion Rate: {Math.round((score/questions.length) * 100)}%</p>
            <div className="result-feedback">
              <h3>Next Steps:</h3>
              <ul>
                <li>Review your answers and practice speaking more confidently</li>
                <li>Research common interview questions for your target role</li>
                <li>Practice the STAR method for behavioral questions</li>
                <li>Prepare specific examples from your experience</li>
              </ul>
            </div>
            <div className="result-actions">
              <button className="btn-primary" onClick={() => window.location.reload()}>
                Practice Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className={`interview-container ${examStarted ? 'exam-mode' : ''}`}>
      {/* Permission Prompt (no terms popup) */}
      {!examStarted && (
        <div style={{
          margin: '30px auto 10px',
          maxWidth: 720,
          background: 'linear-gradient(135deg, #111827, #0b1020)',
          border: '1px solid #1f2937',
          borderRadius: 12,
          color: '#e5e7eb',
          padding: 24,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>Enable Voice & Webcam</div>
          <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 16 }}>
            We need access to your microphone and camera for the voice-interactive mock interview.
          </div>
          <button
            onClick={startExam}
            style={{
              backgroundColor: '#7c3aed',
              color: 'white',
              padding: '10px 18px',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Allow Mic & Camera
          </button>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '50px 40px',
            borderRadius: '20px',
            textAlign: 'center',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
            maxWidth: '500px',
            width: '90%'
          }}>
            {/* Success Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 25px auto',
              fontSize: '40px',
              color: 'white'
            }}>
              ✓
            </div>
            
            {/* Title */}
            <h2 style={{ 
              color: '#1f2937', 
              marginBottom: '15px',
              fontSize: '24px',
              fontWeight: '600'
            }}>
              Interview Complete!
            </h2>
            
            {/* AI Analysis Results */}
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '25px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ color: '#475569', fontSize: '14px', marginBottom: '10px' }}>
                <strong>AI Analysis Results</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Questions Answered:</span>
                <span style={{ color: '#059669', fontWeight: '600' }}>{score}/{questions.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Completion Rate:</span>
                <span style={{ color: '#059669', fontWeight: '600' }}>{Math.round((score/questions.length) * 100)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>AI Confidence:</span>
                <span style={{ color: '#059669', fontWeight: '600' }}>
                  {score === questions.length ? 'High' : score >= questions.length * 0.7 ? 'Good' : 'Moderate'}
                </span>
              </div>
            </div>
            
            {/* Redirect Timer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '15px',
              marginBottom: '25px'
            }}>
              <div style={{
                width: '30px',
                height: '30px',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #059669',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span style={{ color: '#6b7280', fontSize: '16px' }}>
                Redirecting in <strong style={{ color: '#059669' }}>{redirectCountdown}s</strong>
              </span>
            </div>
            
            {/* Action Button */}
            <button
              onClick={() => navigate('/candidate/partices', { replace: true })}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 30px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              Continue to Practice
            </button>
          </div>
        </div>
      )}

      {/* Concise Header (like MCQs) */}
      {examStarted && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          background: 'linear-gradient(135deg, #0b1020 0%, #0b1220 50%, #111827 100%)',
          color: 'white',
          padding: '15px 25px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
          borderBottom: '1px solid #1f2937'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={logo} alt="SmartHire Logo" style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px' }} />
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>SmartHire Platform</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Interview Assessment</div>
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: timeLeft <= 300 ? '#fbbf24' : 'white' }}>
            ⏱️ {formatTime(timeLeft)}
          </div>
        </div>
      )}

      {/* Split screen (50/50): left video call, right chat panel */}
      {examStarted && (
        <div style={{ marginTop: '100px', padding: '16px', background: '#050810', minHeight: 'calc(100vh - 100px)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16
          }}>
            {/* Left: Video call area with swap-on-click */}
            <div style={{
              background: '#0b1220',
              border: '1px solid #1f2937',
              borderRadius: 12,
              minHeight: 520,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af'
            }}>
              {/* Mic/recording indicator */}
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: isRecording ? '#ef4444' : '#6b7280', display: 'inline-block' }} />
                <span style={{ color: '#e5e7eb', fontSize: 12 }}>{isRecording ? 'Recording' : 'Mic idle'}</span>
              </div>
              {/* Primary area: show either interviewer or user, click to swap */}
              <div
                onClick={() => setPrimaryVideo((p) => (p === 'interviewer' ? 'user' : 'interviewer'))}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                {primaryVideo === 'interviewer' ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 64, marginBottom: 8 }}>🧑‍💼</div>
                    <div>Interviewer video stream will appear here</div>
                  </div>
                ) : (
                  (webcamPermission === 'granted' && webcamStream) ? (
                    <video
                      ref={userBigVideoRef}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      autoPlay
                      muted
                      playsInline
                    />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 64, marginBottom: 8 }}>📷</div>
                      <div>Your camera preview</div>
                    </div>
                  )
                )}
              </div>

              {/* PiP: show the other stream, click to swap */}
              {primaryVideo === 'interviewer' ? (
                <div
                  onClick={() => setPrimaryVideo('user')}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 220,
                    height: 140,
                    borderRadius: 10,
                    border: '2px solid #1f2937',
                    overflow: 'hidden',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                    background: '#0b1220',
                    cursor: 'pointer'
                  }}
                >
                  {webcamPermission === 'granted' && webcamStream ? (
                    <video
                      ref={userPipVideoRef}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      autoPlay
                      muted
                      playsInline
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Your camera preview</div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => setPrimaryVideo('interviewer')}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 220,
                    height: 140,
                    borderRadius: 10,
                    border: '2px solid #1f2937',
                    overflow: 'hidden',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                    background: '#0b1220',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>🧑‍💼</div>
                    <div style={{ fontSize: 12 }}>Interviewer</div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Chat panel */}
            <div style={{
              background: '#0b1220',
              border: '1px solid #1f2937',
              borderRadius: 12,
              minHeight: 520,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid #1f2937',
                color: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: isSpeaking ? '#60a5fa' : (isRecording ? '#34d399' : '#6b7280'),
                    display: 'inline-block'
                  }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    {isSpeaking ? 'Speaking: Interviewer' : (isRecording ? 'Speaking: You' : 'Speaking: Idle')}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#cbd5e1' }}>
                  Time left for this question: <span style={{ fontWeight: 700 }}>{formatTime(questionTimeLeft)}</span>
                </div>
              </div>
              <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(() => {
                  const q = questions[currentQuestion];
                  const items = (q && chatHistory[q.id]) ? chatHistory[q.id] : [];
                  return (
                    <>
                      {/* AI typing bubble when typing is in progress (always show if typing text exists) */}
                      {questionTyping && (
                        <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 10, padding: '10px 12px', color: '#e5e7eb', fontSize: 14, lineHeight: 1.5 }}>
                            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Interviewer</div>
                            {questionTyping}
                            <span style={{ marginLeft: 2, opacity: 0.8, animation: 'blink 1s infinite' }}>|</span>
                          </div>
                        </div>
                      )}

                      {/* Persisted chat history */}
                      {items.map((m, idx) => (
                        <div key={idx} style={{ alignSelf: m.role === 'ai' ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                          <div style={{
                            background: m.role === 'ai' ? '#111827' : '#0b3b2e',
                            border: m.role === 'ai' ? '1px solid #374151' : '1px solid #115e59',
                            borderRadius: 10,
                            padding: '10px 12px',
                            color: '#e5e7eb',
                            fontSize: 14,
                            lineHeight: 1.5
                          }}>
                            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, display: 'flex', justifyContent: m.role === 'ai' ? 'space-between' : 'space-between' }}>
                              <span>{m.role === 'ai' ? 'Interviewer' : 'You'}</span>
                              <span style={{ opacity: 0.7 }}>{formatStamp(m.ts)}</span>
                            </div>
                            {m.text}
                          </div>
                        </div>
                      ))}

                      {/* Live interim transcript as a temporary bubble with typing cursor */}
                      {liveTranscript && (
                        <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                          <div style={{ background: '#0b3b2e', border: '1px solid #115e59', borderRadius: 10, padding: '10px 12px', color: '#e5e7eb', fontSize: 14, lineHeight: 1.5 }}>
                            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                              <span>You (speaking)</span>
                              <span style={{ opacity: 0.7 }}>{formatStamp(Date.now())}</span>
                            </div>
                            {liveTranscript}
                            <span style={{ marginLeft: 2, opacity: 0.8, animation: 'blink 1s infinite' }}>|</span>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div style={{ padding: '10px 14px', borderTop: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>Voice-only. Speak to answer. Recording starts after AI finishes speaking.</div>
                <button onClick={submitCurrentAnswer} style={{
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  {currentQuestion < (questions.length - 1) ? 'Submit Answer' : 'Finish Interview'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
