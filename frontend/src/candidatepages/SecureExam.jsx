import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { API_BASE_URL } from '../config';
import { useToast } from '../contexts/ToastContext';
import {
  FiClock,
  FiAlertTriangle,
  FiEye,
  FiShield,
  FiMonitor,
  FiLock,
  FiArrowLeft,
  FiVideo,
  FiMinimize2,
  FiMove,
  FiChevronsLeft,
  FiInfo,
  FiCode,
  FiFileText,
  FiCheckCircle,
  FiArrowRight
} from 'react-icons/fi';
import './SecureExam.css';

const EDGE_OFFSET = 12;
const PROCTOR_DOCK_WIDTH = 200;
const PROCTOR_DOCK_HEIGHT = 320;
const CAMERA_VIEW_WIDTH = 200;
const CAMERA_VIEW_HEIGHT = 320;

const SecureExam = () => {
  const { roundId } = useParams();
  const navigate = useNavigate();
  const { showError } = useToast();
  
  // Exam state
  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStartTime, setExamStartTime] = useState(null);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examTerminated, setExamTerminated] = useState(false);
  
  // Coding-specific states
  const [selectedLanguage, setSelectedLanguage] = useState('java');
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState(''); // '', 'saving', 'saved'
  const [sampleTestsPassed, setSampleTestsPassed] = useState(new Set()); // problem IDs that passed sample tests
  const autoSaveTimerRef = useRef(null);

  // Starter templates per language (competitive-programming style)
  const getStarterCode = (lang) => {
    switch (lang) {
      case 'java':
        return `// Java Template\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n        // Read input\n        int n = sc.nextInt();\n        \n        // Your solution here\n        \n        System.out.println(n);\n        sc.close();\n    }\n}\n`;
      case 'python':
        return `# Python Template\nimport sys\ninput = sys.stdin.readline\n\ndef solve():\n    n = int(input())\n    \n    # Your solution here\n    \n    print(n)\n\nsolve()\n`;
      case 'cpp':
        return `// C++ Template\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    int n;\n    cin >> n;\n    \n    // Your solution here\n    \n    cout << n << endl;\n    return 0;\n}\n`;
      case 'c':
        return `// C Template\n#include <stdio.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    \n    // Your solution here\n    \n    printf("%d\\n", n);\n    return 0;\n}\n`;
      default:
        return '';
    }
  };
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [proctoringActive, setProctoringActive] = useState(false);
  const [, setProctorWarnings] = useState(0);
  const [proctorStatusMessage, setProctorStatusMessage] = useState('Initializing...');
  const [examStarted, setExamStarted] = useState(false);
  const [needsFullscreen, setNeedsFullscreen] = useState(false);
  const [isInitializingProctor, setIsInitializingProctor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Proctoring control bar states
  const [showProctoringBar, setShowProctoringBar] = useState(true);
  const [showCameraView, setShowCameraView] = useState(true);
  const [showWarningsPanel, setShowWarningsPanel] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [proctoringBarPosition, setProctoringBarPosition] = useState(() => {
    if (typeof window === 'undefined') {
      return { x: 0, y: 0 };
    }
    return {
      x: Math.round(window.innerWidth / 2 - 150),
      y: 75
    };
  });
  const [cameraPosition, setCameraPosition] = useState(() => {
    if (typeof window === 'undefined') {
      return { x: 0, y: 0 };
    }
    return {
      x: window.innerWidth - CAMERA_VIEW_WIDTH - EDGE_OFFSET,
      y: EDGE_OFFSET
    };
  });
  const [isDraggingBar, setIsDraggingBar] = useState(false);
  const [isDraggingCamera, setIsDraggingCamera] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [_tabSwitchCount, setTabSwitchCount] = useState(0);
  const [, setWarningCount] = useState(0);
  const [warningHistory, setWarningHistory] = useState([]);
  const [proctorReady, setProctorReady] = useState(false);
  const [hasCriticalProctorAlert, setHasCriticalProctorAlert] = useState(false);
  const [, setViolations] = useState([]);
  
  // Refs
  const examContainerRef = useRef(null);
  const timerRef = useRef(null);
  const visibilityTimeRef = useRef(Date.now());
  const proctorVideoRef = useRef(null);
  const draggableCameraRef = useRef(null);
  const proctorStreamRef = useRef(null);
  const proctorIntervalRef = useRef(null);
  const darkScreenIntervalRef = useRef(null);
  const nativeFaceIntervalRef = useRef(null);   // kept for cleanup compat
  const lastProctorAlertRef = useRef({ reason: '', at: 0 });
  const lastNoFaceAlertRef = useRef(0);         // debounce for no-face alerts
  const resizeViolationRef = useRef(0);
  const lastResizeAlertRef = useRef(0);
  const submitExamRef = useRef(null);
  const lookDownCountRef = useRef(0);
  const lastLookDownAlertRef = useRef(0);

  // Security thresholds
  const MAX_TAB_SWITCHES = 1; // Auto-submit on first tab switch
  const MAX_WARNINGS = 5;
  const MAX_PROCTOR_WARNINGS = 5; // Increased limit for serious violations only
  const PROCTOR_CHECK_INTERVAL_MS = 3000;
  const RESIZE_THRESHOLD_RATIO = 0.92;
  const RESIZE_TERMINATION_COUNT = 2;
  const RESIZE_ALERT_DEBOUNCE_MS = 1500;
  const LOOK_DOWN_THRESHOLD = 5; // 5 detections before violation
  const LOOK_DOWN_ANGLE = 30; // Approximate angle threshold for looking down

  // --- Utility & Security Functions (Defined early to avoid hoisting issues) ---
  
  const handleAutoSubmit = useCallback(() => {
    if (!examSubmitted) {
      // Use a ref to avoid dependency issues
      submitExamRef.current?.();
    }
  }, [examSubmitted]);

  const sendViolationToBackend = useCallback(async (violation) => {
    try {
      // Only terminal violations should disqualify the candidate.
      if (!violation?.violation?.startsWith('Exam terminated:')) {
        return;
      }

      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      await axios.post(`${API_BASE_URL}/candidate/exam/${roundId}/violation`, violation, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to log violation:', error);
    }
  }, [roundId]);

  const logViolation = useCallback((violation) => {
    const timestamp = new Date().toISOString();
    const newViolation = {
      timestamp,
      violation,
      questionIndex: currentQuestionIndex
    };
    
    setViolations(prev => [...prev, newViolation]);
    
    // Send violation to backend
    sendViolationToBackend(newViolation);
  }, [currentQuestionIndex, sendViolationToBackend]);

  const terminateExam = useCallback((reason) => {
    setExamTerminated(true);
    logViolation(`Exam terminated: ${reason}`);
    handleAutoSubmit();
  }, [logViolation, handleAutoSubmit]);

  const showWarning = useCallback((message, isProctoring = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const newWarning = { message, timestamp, id: Date.now(), type: isProctoring ? 'proctoring' : 'security' };
    
    setWarningCount(prev => {
      const newCount = prev + 1;
      if (newCount >= MAX_WARNINGS) {
        terminateExam('Too many security violations');
      }
      return newCount;
    });
    
    if (isProctoring) {
      setProctorWarnings(prev => {
        const newCount = prev + 1;
        if (newCount >= MAX_PROCTOR_WARNINGS) {
          terminateExam('Maximum proctoring violations exceeded');
        }
        return newCount;
      });
    }
    
    setWarningHistory(prev => [...prev, newWarning]);
    // No toast/alert popups — alert is shown via the red dot on the warnings button
  }, [terminateExam]);

  // --- End of Utility & Security Functions ---
  const requestFullscreen = useCallback(() => {
    if (examContainerRef.current && examContainerRef.current.requestFullscreen) {
      return examContainerRef.current.requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
          setNeedsFullscreen(false);
        })
        .catch(err => {
          console.warn('Fullscreen request failed:', err);
          setNeedsFullscreen(true);
          throw err;
        });
    }

    console.warn('Fullscreen API not supported in this browser');
    setNeedsFullscreen(true);
    return Promise.resolve(); // Don't reject, just warn
  }, []);

  // Initialize exam security
  useEffect(() => {
    if (examStarted && !examSubmitted) {
      initializeSecurityMeasures();
      return () => {
        cleanupSecurityMeasures();
        stopProctoring();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStarted, examSubmitted]);

  const attachProctorStream = useCallback(() => {
    if (!proctorStreamRef.current) {
      return;
    }
    
    // Attach to hidden video (for detection)
    if (proctorVideoRef.current && proctorVideoRef.current.srcObject !== proctorStreamRef.current) {
      proctorVideoRef.current.srcObject = proctorStreamRef.current;
      proctorVideoRef.current.muted = true;
      proctorVideoRef.current.playsInline = true;
      proctorVideoRef.current.play().catch(() => {});
    }
    
    // Attach to draggable camera view (for display)
    if (draggableCameraRef.current && draggableCameraRef.current.srcObject !== proctorStreamRef.current) {
      draggableCameraRef.current.srcObject = proctorStreamRef.current;
      draggableCameraRef.current.muted = true;
      draggableCameraRef.current.playsInline = true;
      draggableCameraRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    // Only attach once when stream is ready and exam has started
    if (proctorStreamRef.current && examStarted) {
      attachProctorStream();
    }
  }, [attachProctorStream, examStarted]);

  useEffect(() => {
    if (showWarningsPanel) {
      setHasCriticalProctorAlert(false);
    }
  }, [showWarningsPanel]);

  // Timer effect
  useEffect(() => {
    if (examStarted && timeRemaining > 0 && !examSubmitted) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStarted, examSubmitted]); // handleAutoSubmit uses ref, no dependency needed

  const preventContextMenu = useCallback((e) => {
    e.preventDefault();
    logViolation('Right-click attempted');
    return false;
  }, [logViolation]);

  const preventKeyboardShortcuts = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      logViolation('Attempted to exit fullscreen via ESC');
      showWarning('Fullscreen mode is mandatory. ESC has been disabled.');
      requestFullscreen().catch(() => {
        setNeedsFullscreen(true);
      });
      return false;
    }

    // Disable Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+S, Ctrl+P and Ctrl+Shift+Esc
    if (e.ctrlKey && ['c', 'v', 'x', 'a', 's', 'p'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      logViolation(`Keyboard shortcut attempted: Ctrl+${e.key.toUpperCase()}`);
      return false;
    }
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'escape') {
      e.preventDefault();
      logViolation('Attempted to exit fullscreen via Ctrl+Shift+Esc');
      return false;
    }
    
    // Disable F12, Ctrl+Shift+I/J/C, Ctrl+U
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key === 'u')) {
      e.preventDefault();
      logViolation('Developer tools access attempted');
      return false;
    }
  }, [logViolation, showWarning, requestFullscreen]);

  const preventClipboardEvents = useCallback((e) => {
    e.preventDefault();
    logViolation(`${e.type.toUpperCase()} operation blocked`);
    showWarning('Copy, cut, and paste are disabled during the exam.');
    return false;
  }, [logViolation, showWarning]);

  const preventDevTools = useCallback((e) => {
    // Additional dev tools prevention
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J')) {
      e.preventDefault();
      logViolation('Developer tools blocked');
      showWarning('Developer tools are not allowed during the exam!');
      return false;
    }
  }, [logViolation, showWarning]);

  const preventTextSelection = useCallback((e) => {
    e.preventDefault();
    return false;
  }, []);

  const preventDragDrop = useCallback((e) => {
    // Only prevent actual file drops, not internal drag interactions
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      logViolation('File drop attempted');
      return false;
    }
    // Allow internal drag events for proctoring controls
    if (e.target.closest('.proctor-dock') || e.target.closest('.draggable-camera-view')) {
      return true; // Allow drag on proctoring controls
    }
  }, [logViolation]);

  const preventTouchGestures = useCallback((e) => {
    // Prevent back/forward navigation gestures
    if (e.scale !== 1) {
      e.preventDefault();
      logViolation('Zoom gesture blocked');
      return false;
    }
  }, [logViolation]);

  const preventSwipeNavigation = useCallback((e) => {
    // Prevent horizontal swipe navigation
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 50) {
      e.preventDefault();
      logViolation('Swipe navigation blocked');
      return false;
    }
  }, [logViolation]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      visibilityTimeRef.current = Date.now();
      logViolation('Tab switched or window minimized');
      setTabSwitchCount(prev => {
        const newCount = prev + 1;
        if (newCount >= MAX_TAB_SWITCHES) {
          terminateExam('Tab switching detected - Maximum violations exceeded');
        } else {
          showWarning(`⚠️ Security Alert: Tab switching detected! (${newCount}/${MAX_TAB_SWITCHES}) - Exam will be terminated if this continues.`);
          // Flash the screen red briefly
          document.body.style.backgroundColor = 'rgba(220, 38, 38, 0.3)';
          setTimeout(() => {
            document.body.style.backgroundColor = '';
          }, 500);
        }
        return newCount;
      });
    } else {
      const timeAway = Date.now() - visibilityTimeRef.current;
      if (timeAway > 1000) { // More than 1 second away
        logViolation(`Returned after ${Math.round(timeAway/1000)} seconds`);
        showWarning(`You were away for ${Math.round(timeAway/1000)} seconds. Please stay focused on the exam.`);
      }
    }
  }, [logViolation, showWarning, terminateExam]);

  const handleWindowBlur = useCallback(() => {
    logViolation('Window lost focus');
  }, [logViolation]);

  const handleWindowFocus = useCallback(() => {
    // Window regained focus
  }, []);

  const handleWindowResize = useCallback(() => {
    if (!examStarted || examSubmitted) {
      return;
    }

    const now = Date.now();
    if (now - lastResizeAlertRef.current < RESIZE_ALERT_DEBOUNCE_MS) {
      return;
    }

    const widthRatio = window.innerWidth / window.screen.width;
    const heightRatio = window.innerHeight / window.screen.height;

    if (widthRatio >= RESIZE_THRESHOLD_RATIO && heightRatio >= RESIZE_THRESHOLD_RATIO) {
      resizeViolationRef.current = 0;
      return;
    }

    lastResizeAlertRef.current = now;
    resizeViolationRef.current += 1;

    logViolation('Split screen or window resize detected');
    showWarning('Split screen is not allowed during the exam. Returning to secure fullscreen.');
    setNeedsFullscreen(true);

    setTimeout(() => {
      requestFullscreen().catch(() => {
        // User interaction required; overlay will prompt via needsFullscreen flag.
      });
    }, 0);

    if (resizeViolationRef.current >= RESIZE_TERMINATION_COUNT) {
      terminateExam('Split screen detected multiple times');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStarted, examSubmitted, requestFullscreen]);

  const initializeSecurityMeasures = useCallback(() => {
    // Disable right-click context menu
    document.addEventListener('contextmenu', preventContextMenu);
    
    // Disable copy/paste/cut
    document.addEventListener('keydown', preventKeyboardShortcuts);
    document.addEventListener('copy', preventClipboardEvents, true);
    document.addEventListener('cut', preventClipboardEvents, true);
    document.addEventListener('paste', preventClipboardEvents, true);
    
    // Disable text selection
    document.addEventListener('selectstart', preventTextSelection);
    
    // Monitor tab switching
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Disable drag and drop (only file drops, not internal drags)
    document.addEventListener('dragstart', (e) => {
      // Only prevent dragstart if it's for files
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        logViolation('File drag attempted');
        return false;
      }
    });
    document.addEventListener('drop', (e) => {
      // Only prevent drop if it's for files
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        logViolation('File drop attempted');
        return false;
      }
    });
    document.addEventListener('dragover', (e) => {
      // Only prevent dragover if it's for files
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        return false;
      }
    });
    
    // Disable touch gestures and swipe navigation
    document.addEventListener('touchmove', preventTouchGestures, { passive: false });
    document.addEventListener('wheel', preventSwipeNavigation, { passive: false });
    
    // Disable browser back/forward buttons (only when exam is active)
    popstateHandlerRef.current = (e) => {
      if (examStarted && !examSubmitted) {
        e.preventDefault();
        logViolation('Browser navigation attempted during exam');
        window.history.pushState(null, null, window.location.href);
      }
    };
    window.addEventListener('popstate', popstateHandlerRef.current);
    
    // Push initial state to prevent back navigation
    if (examStarted && !examSubmitted) {
      window.history.pushState(null, null, window.location.href);
    }
    
    // Monitor window focus
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    
    // Disable developer tools (F12, Ctrl+Shift+I, etc.)
    document.addEventListener('keydown', preventDevTools);
    
    // Request fullscreen
    requestFullscreen();
    
    // Disable drag and drop
    document.addEventListener('dragstart', preventDragDrop);
    document.addEventListener('drop', preventDragDrop);
    window.addEventListener('resize', handleWindowResize);
    resizeViolationRef.current = 0;
    lastResizeAlertRef.current = 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    preventContextMenu,
    preventKeyboardShortcuts,
    preventClipboardEvents,
    preventTextSelection,
    handleVisibilityChange,
    handleWindowBlur,
    handleWindowFocus,
    preventDevTools,
    requestFullscreen,
    preventDragDrop,
    handleWindowResize
  ]);

  const cleanupSecurityMeasures = useCallback(() => {
    document.removeEventListener('contextmenu', preventContextMenu);
    document.removeEventListener('keydown', preventKeyboardShortcuts);
    document.removeEventListener('copy', preventClipboardEvents, true);
    document.removeEventListener('cut', preventClipboardEvents, true);
    document.removeEventListener('paste', preventClipboardEvents, true);
    document.removeEventListener('selectstart', preventTextSelection);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
    document.removeEventListener('keydown', preventDevTools);
    document.removeEventListener('dragstart', preventDragDrop);
    document.removeEventListener('drop', preventDragDrop);
    document.removeEventListener('dragover', preventDragDrop);
    document.removeEventListener('touchmove', preventTouchGestures);
    document.removeEventListener('wheel', preventSwipeNavigation);
    window.removeEventListener('resize', handleWindowResize);
    
    // Remove popstate handler
    if (popstateHandlerRef.current) {
      window.removeEventListener('popstate', popstateHandlerRef.current);
    }
    
    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, [
    preventContextMenu,
    preventKeyboardShortcuts,
    preventClipboardEvents,
    preventTextSelection,
    handleVisibilityChange,
    handleWindowBlur,
    handleWindowFocus,
    preventDevTools,
    preventDragDrop,
    preventTouchGestures,
    preventSwipeNavigation,
    handleWindowResize
  ]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = document.fullscreenElement === examContainerRef.current;
      setIsFullscreen(isCurrentlyFullscreen);

      if (!isCurrentlyFullscreen && examStarted && !examSubmitted) {
        logViolation('Exited fullscreen mode');
        setNeedsFullscreen(true);
        showWarning('Fullscreen mode is required. Click "Resume Fullscreen" to continue.');
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [examStarted, examSubmitted, showWarning, logViolation]);


  const fetchExamData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Loading exam data for round:', roundId);
      console.log('🔑 Using token:', token ? 'Present' : 'Missing');
      console.log('🌐 API Base URL:', API_BASE_URL);
      
      // Check if this is a coding exam based on URL
      const isCodingExam = window.location.pathname.includes('/coding-exam/');
      console.log('💻 Is Coding Exam:', isCodingExam);
      
      if (isCodingExam) {
        // Fetch coding problems for coding exam
        try {
          const codingResponse = await axios.get(`${API_BASE_URL}/candidate/coding/round/${roundId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log('✅ Coding problems response:', codingResponse.data);
          
          const codingProblems = codingResponse.data.codingProblems || [];
          
          if (codingProblems.length === 0) {
            showError('No coding problems found for this round.');
            navigate('/candidate/shortlisted-jobs');
            return;
          }
          
          // Fetch round details to get round order and title
          let roundData = null;
          try {
            const roundResponse = await axios.get(`${API_BASE_URL}/candidate/round/${roundId}/check-in`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            roundData = roundResponse.data;
          } catch (err) {
            console.warn('Could not fetch round details:', err);
          }
          
          // Set up exam data for coding
          const examData = {
            title: roundData?.title || `Coding Round`,
            roundOrder: roundData?.roundOrder || null,
            duration: roundData?.duration || 60,
            instructions: 'Solve the coding problems within the given time limit. You can test your code and submit when ready.'
          };
          
          setExamData(examData);
          setQuestions(codingProblems);
          setExamStartTime(Date.now());
          setTimeRemaining(examData.duration * 60); // Convert minutes to seconds
          
          // Initialize answers with default code for each coding problem
          const defaultAnswers = {};
          codingProblems.forEach(problem => {
            // Restore saved draft from localStorage if available, else load starter
            const saved = localStorage.getItem(`coding_draft_${problem.id}`);
            defaultAnswers[problem.id] = saved || getStarterCode('java');
          });
          setAnswers(defaultAnswers);
          
          console.log('🎯 Coding exam setup complete');
          
        } catch (error) {
          console.error('❌ Error fetching coding problems:', error);
          
          if (error.response?.status === 404) {
            showError('No coding problems found for this round. Please contact the recruiter to add coding problems.');
          } else if (error.response?.status === 403) {
            showError('You do not have permission to access this coding exam.');
          } else {
            showError('Failed to load coding problems. Please try again.');
          }
          
          navigate('/candidate/shortlisted-jobs');
          return;
        }
      } else {
        // Original MCQ exam logic
        try {
          const examResponse = await axios.get(`${API_BASE_URL}/candidate/exam-data/${roundId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log('✅ Full exam data response:', examResponse.data);
          
          // Check if already taken
          if (examResponse.data.hasBeenTaken) {
            showError('You have already taken this exam. Results have been submitted.');
            navigate('/candidate/shortlisted-jobs');
            return;
          }
          
          const roundData = examResponse.data.round;
          const questionsData = examResponse.data.questions || [];
          
          console.log('📊 Round data:', roundData);
          console.log('❓ Questions data:', questionsData);
        
        // Validate we have both round and questions data
        if (!roundData) {
          throw new Error('Round data not found in response');
        }
        
        if (questionsData.length === 0) {
          showError('No questions have been added to this round yet. Please contact the recruiter.');
          navigate('/candidate/shortlisted-jobs');
          return;
        }
        
        // Set exam data from round details (backend uses timeLimit, not duration)
        const examData = {
          title: roundData.title || 'MCQ Round',
          roundOrder: roundData.roundOrder || null,
          duration: roundData.timeLimit || roundData.duration || 60,
          instructions: roundData.instructions || 'Answer all questions to the best of your ability. Each question has only one correct answer.'
        };
        
        // Normalize question format (backend uses questionText field)
        const normalizedQuestions = questionsData.map((q, idx) => ({
          id: q.id || `q-${idx}`,
          question: q.questionText || q.question || q.text || `Question ${idx + 1}`,
          options: Array.isArray(q.options) ? q.options : (q.choices || q.answers || []),
          // Note: correctAnswer is not provided to candidates for security
          correctAnswer: undefined
        }));
        
        setExamData(examData);
        setQuestions(normalizedQuestions);
        setTimeRemaining(examData.duration * 60);
        
        console.log('✅ Exam data loaded successfully:', {
          title: examData.title,
          duration: examData.duration,
          questionCount: normalizedQuestions.length,
          questions: normalizedQuestions.slice(0, 3).map(q => ({ 
            id: q.id, 
            question: q.question.substring(0, 50) + '...',
            optionsCount: q.options.length 
          }))
        });
        
      } catch (examError) {
        console.warn('❌ Main exam endpoint failed:', examError);
        console.warn('❌ Server error detail:', JSON.stringify(examError.response?.data));
        
        // Fallback: Try to get questions directly
        try {
          const questionsResponse = await axios.get(`${API_BASE_URL}/candidate/rounds/${roundId}/questions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const questionsData = Array.isArray(questionsResponse.data) ? questionsResponse.data : [];
          console.log('✅ Questions loaded from fallback endpoint:', questionsData);
          
          if (questionsData.length === 0) {
            showError('No questions found for this round. Please contact the recruiter to add questions.');
            navigate('/candidate/shortlisted-jobs');
            return;
          }
          
          // Set basic round data since we couldn't get it from main endpoint
          const examData = {
            title: 'MCQ Assessment',
            duration: 60,
            instructions: 'Answer all questions to the best of your ability. Each question has only one correct answer.'
          };
          
        // Normalize question format (backend uses questionText field)
        const normalizedQuestions = questionsData.map((q, idx) => ({
          id: q.id || `q-${idx}`,
          question: q.questionText || q.question || q.text || `Question ${idx + 1}`,
          options: Array.isArray(q.options) ? q.options : (q.choices || q.answers || []),
          // Note: correctAnswer is not provided to candidates for security
          correctAnswer: undefined
        }));
          
          setExamData(examData);
          setQuestions(normalizedQuestions);
          setTimeRemaining(examData.duration * 60);
          
        } catch (questionsError) {
          console.error('❌ Both endpoints failed:', questionsError);
          
          if (questionsError.response?.status === 404) {
            showError('This exam round was not found. Please check the URL or contact support.');
          } else if (questionsError.response?.status === 403) {
            showError('You do not have permission to access this exam.');
          } else {
            showError('Failed to load exam data. Please try again or contact support.');
          }
          
          navigate('/candidate/shortlisted-jobs');
          return;
        }
        }
      }
      
    } catch (error) {
      console.error('❌ Error fetching exam data:', error);
      showError('Failed to load exam data. Please try again or contact support.');
      navigate('/candidate/shortlisted-jobs');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Proctoring: load face-api.js from CDN once ──────────────────────────
  const faceApiLoadedRef = useRef(false);
  const faceApiReadyRef  = useRef(false);
  
  // ── Proctoring: popstate handler ref ──────────────────────────
  const popstateHandlerRef = useRef(null);

  const loadFaceApi = () => new Promise((resolve, reject) => {
    if (faceApiReadyRef.current) { console.log('[FaceAPI] already ready'); resolve(); return; }
    if (faceApiLoadedRef.current) {
      console.log('[FaceAPI] script already injected, waiting...');
      let waited = 0;
      const wait = setInterval(() => {
        waited += 100;
        if (window.faceapi && window.faceapi.nets?.tinyFaceDetector) {
          clearInterval(wait);
          faceApiReadyRef.current = true;
          console.log('[FaceAPI] ready after wait');
          resolve();
        } else if (waited > 15000) {
          clearInterval(wait);
          reject(new Error('face-api.js wait timeout'));
        }
      }, 100);
      return;
    }
    faceApiLoadedRef.current = true;
    console.log('[FaceAPI] injecting script tag...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
    script.onload = async () => {
      console.log('[FaceAPI] script loaded, loading models...');
      try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL); // Use full landmark model
        faceApiReadyRef.current = true;
        console.log('[FaceAPI] models loaded successfully ✓');
        resolve();
      } catch (e) {
        console.error('[FaceAPI] model load failed:', e);
        reject(e);
      }
    };
    script.onerror = (e) => {
      console.error('[FaceAPI] script load failed:', e);
      reject(new Error('face-api.js CDN script failed to load'));
    };
    document.head.appendChild(script);
  });

  // Canvas-based brightness check (same formula as reference: 0.2126R + 0.7152G + 0.0722B)
  const checkBrightness = useCallback(() => {
    // Prefer hidden video (always mounted during exam), fall back to draggable camera
    const video = proctorVideoRef.current || draggableCameraRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 40; canvas.height = 30;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, 40, 30);
      const data = ctx.getImageData(0, 0, 40, 30).data;
      let brightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        brightness += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      }
      return brightness / (data.length / 4);
    } catch (e) {
      console.warn('[Brightness] canvas error:', e);
      return null;
    }
  }, []);

  // Whether face-api loaded successfully (false = brightness-only fallback)
  const faceApiAvailableRef = useRef(false);

  const initializeProctoring = async () => {
    if (proctoringActive || examSubmitted) return;

    try {
      if (!proctorStreamRef.current) throw new Error('No camera stream available');

      setProctorStatusMessage('Loading face detection...');
      console.log('[Proctor] initializing...');

      // Try to load face-api; fall back to brightness-only if it fails
      try {
        await loadFaceApi();
        faceApiAvailableRef.current = true;
        console.log('[Proctor] face-api ready ✓');
      } catch (faceApiErr) {
        faceApiAvailableRef.current = false;
        console.warn('[Proctor] face-api unavailable, running brightness-only mode:', faceApiErr);
      }

      setProctorStatusMessage('Proctoring active');
      setProctoringActive(true);
      console.log('[Proctor] interval starting every', PROCTOR_CHECK_INTERVAL_MS, 'ms');

      // Main detection interval — brightness + optional face detection
      proctorIntervalRef.current = setInterval(async () => {
        // Always prefer the hidden video (always mounted during exam)
        const video = proctorVideoRef.current || draggableCameraRef.current;

        if (!video) {
          console.warn('[Proctor] no video element found');
          return;
        }
        if (video.readyState < 2) {
          console.warn('[Proctor] video not ready, readyState=', video.readyState);
          return;
        }
        if (video.videoWidth === 0) {
          console.warn('[Proctor] video has zero width (stream not flowing)');
          return;
        }

        console.log('[Proctor] tick — readyState:', video.readyState, 'size:', video.videoWidth, 'x', video.videoHeight);

        try {
          // ── Brightness check ──────────────────────────────────────────
          const avg = checkBrightness();
          console.log('[Proctor] brightness avg:', avg);

          if (avg !== null && avg < 35) {
            const now = Date.now();
            const reason = 'Low light detected — please improve lighting';
            if (lastProctorAlertRef.current.reason !== reason ||
                now - lastProctorAlertRef.current.at > PROCTOR_CHECK_INTERVAL_MS * 4) {
              lastProctorAlertRef.current = { reason, at: now };
              console.log('[Proctor] firing LOW LIGHT alert (informational)');
              handleProctorViolationRef.current(reason, false); // Not critical - just informational
            }
            // Don't skip face detection — still check even in low light
          }

          // ── Face detection (only if face-api loaded) ──────────────────
          if (!faceApiAvailableRef.current || !window.faceapi) {
            console.log('[Proctor] face-api not available, skipping face check');
            return;
          }

          const detections = await window.faceapi.detectAllFaces(
            video,
            new window.faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.1, inputSize: 160 })
          );

          const count = detections.length;
          const now = Date.now();
          const FACE_DEBOUNCE = PROCTOR_CHECK_INTERVAL_MS * 3;

          console.log('[Proctor] faces detected:', count);
          
          if (count === 0) {
            if (lastNoFaceAlertRef.current === 0 ||
                now - lastNoFaceAlertRef.current > FACE_DEBOUNCE) {
              lastNoFaceAlertRef.current = now;
              console.log('[Proctor] firing NO FACE alert');
              handleProctorViolationRef.current('No face detected — please stay in frame');
            }
          } else if (count > 1) {
            if (now - lastNoFaceAlertRef.current > FACE_DEBOUNCE) {
              lastNoFaceAlertRef.current = now;
              console.log('[Proctor] firing MULTIPLE FACES alert');
              handleProctorViolationRef.current('Multiple faces detected');
            }
          } else if (count === 1) {
            // ── Head pose detection for looking down ───────────────────────
            try {
              const landmarks = await window.faceapi.detectFaceLandmarks(
                video,
                new window.faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.1, inputSize: 160 })
              );
              
              if (landmarks && landmarks.length > 0) {
                const landmark = landmarks[0];
                // Use eye and nose positions to estimate head tilt
                const leftEye = landmark.getLeftEye();
                const rightEye = landmark.getRightEye();
                const nose = landmark.getNose();
                
                if (leftEye && rightEye && nose) {
                  // Calculate eye center
                  const eyeCenterY = (leftEye[1].y + rightEye[1].y) / 2;
                  const noseY = nose[0].y;
                  
                  // If nose is significantly below eyes, looking down
                  const verticalRatio = (noseY - eyeCenterY) / (noseY - leftEye[1].y);
                  console.log('[Proctor] head pose - vertical ratio:', verticalRatio.toFixed(2));
                  
                  if (verticalRatio > 0.7) { // Threshold for looking down
                    lookDownCountRef.current++;
                    console.log('[Proctor] looking down detected, count:', lookDownCountRef.current);
                    
                    if (lookDownCountRef.current >= LOOK_DOWN_THRESHOLD) {
                      if (now - lastLookDownAlertRef.current > PROCTOR_CHECK_INTERVAL_MS * 10) {
                        lastLookDownAlertRef.current = now;
                        console.log('[Proctor] firing LOOK DOWN violation');
                        handleProctorViolationRef.current('Looking down suspiciously — please maintain eye level');
                        lookDownCountRef.current = 0; // Reset count after violation
                      }
                    }
                  } else {
                    // Reset count if looking normally
                    lookDownCountRef.current = Math.max(0, lookDownCountRef.current - 1);
                  }
                } else {
                  console.log('[Proctor] landmarks detected but missing eye/nose data');
                }
              } else {
                console.log('[Proctor] no landmarks detected');
              }
            } catch (landmarkErr) {
              console.warn('[Proctor] landmark detection error:', landmarkErr);
            }
            
            // All clear for face detection
            lastNoFaceAlertRef.current = 0;
            setProctorStatusMessage('Proctoring active — no issues detected');
          }
        } catch (e) {
          console.warn('[Proctor] detection error:', e);
        }
      }, PROCTOR_CHECK_INTERVAL_MS);

    } catch (err) {
      console.error('[Proctor] init failed:', err);
      setProctorStatusMessage('Proctoring initialization failed.');
    }
  };

  useEffect(() => {
    // Camera is acquired in requestCameraPermission called from startExam()
  }, []);
 

  const stopProctoring = () => {
    setProctoringActive(false);
    if (proctorIntervalRef.current) {
      clearInterval(proctorIntervalRef.current);
      proctorIntervalRef.current = null;
    }
    if (darkScreenIntervalRef.current) {
      clearInterval(darkScreenIntervalRef.current);
      darkScreenIntervalRef.current = null;
    }
    if (nativeFaceIntervalRef.current) {
      clearInterval(nativeFaceIntervalRef.current);
      nativeFaceIntervalRef.current = null;
    }

    if (proctorStreamRef.current) {
      proctorStreamRef.current.getTracks().forEach(track => track.stop());
      proctorStreamRef.current = null;
    }
  };

  // Handle answer selection
  const handleAnswerChange = useCallback((questionId, selectedOption) => {
    setAnswers(prev => {
      const updated = { ...prev, [questionId]: selectedOption };
      // Auto-save coding answers to localStorage
      const isCodingExam = window.location.pathname.includes('/coding-exam/');
      if (isCodingExam) {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        setAutoSaveStatus('saving');
        autoSaveTimerRef.current = setTimeout(() => {
          localStorage.setItem(`coding_draft_${questionId}`, selectedOption || '');
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus(''), 2000);
        }, 800);
      }
      return updated;
    });
  }, []);

  // Handle code execution
  const handleRunCode = async (questionId) => {
    const code = answers[questionId];
    if (!code || !code.trim()) {
      showError('Please write some code first!');
      return;
    }

    setIsRunning(true);
    setRunOutput('Running...');
    setTestResults(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/judge`, {
        code,
        language: selectedLanguage,
        input: codeInput || ''
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000
      });

      const data = response.data;
      console.log('Judge response:', JSON.stringify(data));

      // output field from local execution, stdout from Judge0
      const stdout = data.output != null ? String(data.output) : (data.stdout != null ? String(data.stdout) : '');
      const stderr = data.stderr != null ? String(data.stderr) : '';
      const err    = data.error  != null ? String(data.error)  : '';

      if (err && err.trim() && err.trim() !== 'null') {
        setRunOutput(err.trim());
      } else if (stderr && stderr.trim()) {
        setRunOutput(stderr.trim());
      } else if (stdout && stdout.trim()) {
        setRunOutput(stdout.trim());
      } else {
        setRunOutput('(no output)');
      }
    } catch (error) {
      console.error('Judge error:', error.response?.data || error.message);
      setRunOutput(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Handle test case execution
  const handleRunTests = async (questionId) => {
    const code = answers[questionId];
    if (!code || !code.trim()) {
      showError('Please write some code first!');
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion.testCases || currentQuestion.testCases.length === 0) {
      showError('No test cases available for this problem.');
      return;
    }

    setIsRunning(true);
    setRunOutput('');
    setTestResults(null);

    try {
      const token = localStorage.getItem('token');
      const cases = [];

      for (const tc of currentQuestion.testCases) {
        const input = tc.input ?? '';
        const expected = (tc.expectedOutput ?? tc.output ?? '').trim();

        try {
          const resp = await axios.post(`/api/judge`, {
            code,
            language: selectedLanguage,
            input
          }, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 20000
          });

          const data = resp.data;
          const got = (data.output ?? data.stdout ?? '').trim();
          const err = (data.error ?? data.stderr ?? '').trim();
          const actual = err || got;
          const passed = !err && got === expected;

          cases.push({ passed, got: actual, expected, error: err || null });
        } catch (e) {
          cases.push({ passed: false, got: '', expected, error: e.message });
        }
      }

      const passedCount = cases.filter(c => c.passed).length;
      const results = {
        passed: passedCount === cases.length,
        results: cases,
        passedCount,
        totalCount: cases.length,
        score: Math.round((passedCount / cases.length) * 100)
      };

      setTestResults(results);
      sessionStorage.setItem(`testResults_${questionId}`, JSON.stringify(cases));

      // Mark problem as sample-passed if all sample test cases pass
      if (passedCount === cases.length && cases.length > 0) {
        setSampleTestsPassed(prev => new Set([...prev, questionId]));
      } else {
        setSampleTestsPassed(prev => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
      }

    } catch (error) {
      setTestResults({
        passed: false, passedCount: 0, totalCount: 0,
        error: error.response?.data?.error || error.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-submit the exam when time runs out or violations occur

  const handleProctorViolation = (reason, isCritical = true) => {
    logViolation(`Proctoring warning: ${reason}`);
    const timestamp = new Date().toLocaleTimeString();
    const newWarning = {
      id: Date.now(),
      message: reason,
      timestamp,
      type: isCritical ? 'proctoring' : 'informational'
    };
    setWarningHistory(prev => [...prev, newWarning]);
    
    // Only count critical violations toward the limit
    if (isCritical) {
      setProctorWarnings(prev => {
        const newCount = prev + 1;
        if (newCount >= MAX_PROCTOR_WARNINGS) {
          terminateExam('Maximum proctoring violations exceeded');
        }
        return newCount;
      });
      setHasCriticalProctorAlert(true);
    }
    
    setProctorStatusMessage(`⚠ Alert: ${reason}`);
  };

  // Stable ref so interval closures always call the latest version
  const handleProctorViolationRef = useRef(handleProctorViolation);
  useEffect(() => {
    handleProctorViolationRef.current = handleProctorViolation;
  });

  // Drag functionality for proctoring controls
  const handleMouseDown = (e, type) => {
    if (type === 'bar' && panelCollapsed) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDragOffset({ x: offsetX, y: offsetY });
    
    if (type === 'bar') {
      setIsDraggingBar(true);
    } else if (type === 'camera') {
      setIsDraggingCamera(true);
    }
  };

  const handleDockClick = () => {
    if (panelCollapsed) {
      setPanelCollapsed(false);
    }
  };

  const handleCameraToggle = (e) => {
    e.stopPropagation();
    setShowCameraView(prev => !prev);
  };

  const handleWarningsToggle = (e) => {
    e.stopPropagation();
    setShowWarningsPanel(prev => {
      const next = !prev;
      if (next) {
        // Opening the panel — clear the red dot
        setHasCriticalProctorAlert(false);
      }
      return next;
    });
  };

  const handleCollapsePanel = (e) => {
    e.stopPropagation();
    setPanelCollapsed(true);
    setShowWarningsPanel(false);
  };

  const handleMouseMove = useCallback((e) => {
    if (isDraggingBar) {
      const maxX = Math.max(EDGE_OFFSET, window.innerWidth - PROCTOR_DOCK_WIDTH - EDGE_OFFSET);
      const maxY = Math.max(EDGE_OFFSET, window.innerHeight - PROCTOR_DOCK_HEIGHT - EDGE_OFFSET);
      const newX = Math.max(EDGE_OFFSET, Math.min(maxX, e.clientX - dragOffset.x));
      const newY = Math.max(EDGE_OFFSET, Math.min(maxY, e.clientY - dragOffset.y));
      setProctoringBarPosition({ x: newX, y: newY });
    } else if (isDraggingCamera) {
      const maxX = Math.max(EDGE_OFFSET, window.innerWidth - CAMERA_VIEW_WIDTH - EDGE_OFFSET);
      const maxY = Math.max(EDGE_OFFSET, window.innerHeight - CAMERA_VIEW_HEIGHT - EDGE_OFFSET);
      const newX = Math.max(EDGE_OFFSET, Math.min(maxX, e.clientX - dragOffset.x));
      const newY = Math.max(EDGE_OFFSET, Math.min(maxY, e.clientY - dragOffset.y));
      setCameraPosition({ x: newX, y: newY });
    }
  }, [dragOffset.x, dragOffset.y, isDraggingBar, isDraggingCamera]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingBar(false);
    setIsDraggingCamera(false);
  }, []);

  // Add mouse event listeners for dragging
  useEffect(() => {
    if (isDraggingBar || isDraggingCamera) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingBar, isDraggingCamera, handleMouseMove, handleMouseUp]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Removed old loadExamData function - using fetchExamData instead

  // Submit exam
  const submitExam = useCallback(async () => {
    if (examSubmitted) return; // Prevent multiple submissions
    
    setExamSubmitted(true);
    const token = localStorage.getItem('token');
    const isCodingExam = window.location.pathname.includes('/coding-exam/');

    if (!token) {
      showError('Authentication error. Please log in again.');
      navigate('/login');
      return;
    }

    try {
      setProctorStatusMessage('Submitting your exam...');
      const timeSpent = Math.floor((Date.now() - examStartTime) / 1000);
      
      if (isCodingExam) {
        // Run all problems against test cases and score based on results
        const problemScores = {};
        let totalScore = 0;
        let totalProblems = 0;

        setProctorStatusMessage('Running your code against test cases...');

        for (const question of questions) {
          const userCode = (answers[question.id] || '').trim();
          let problemScore = 0;

          if (!userCode) {
            // No code submitted
            problemScores[question.id] = 0;
            totalProblems++;
            continue;
          }

          const testCases = question.testCases || [];

          if (testCases.length === 0) {
            // No test cases — score by code presence
            problemScore = userCode.length > 50 ? 60 : 30;
          } else {
            try {
              await axios.post(
                `/api/judge`,
                { code: userCode, language: selectedLanguage, input: testCases[0]?.input || '' },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
              );

              // Run all test cases
              let passed = 0;
              for (const tc of testCases) {
                try {
                  const r = await axios.post(`/api/judge`,
                    { code: userCode, language: selectedLanguage, input: tc.input || '' },
                    { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 }
                  );
                  const got = (r.data.output ?? r.data.stdout ?? '').trim();
                  const expected = (tc.expectedOutput ?? tc.output ?? '').trim();
                  if (!r.data.error && got === expected) passed++;
                } catch { /* count as failed */ }
              }
              problemScore = Math.round((passed / testCases.length) * 100);
            } catch {
              // Network/timeout — fall back to stored results if any
              const storedResults = sessionStorage.getItem(`testResults_${question.id}`);
              if (storedResults) {
                try {
                  const results = JSON.parse(storedResults);
                  const passed = results.filter(r => r.passed).length;
                  problemScore = Math.round((passed / results.length) * 100);
                } catch {
                  problemScore = 20;
                }
              } else {
                problemScore = userCode.length > 50 ? 40 : 20;
              }
            }
          }

          // Clean up draft after submission
          localStorage.removeItem(`coding_draft_${question.id}`);

          problemScores[question.id] = problemScore;
          totalScore += problemScore;
          totalProblems++;
        }

        const averageScore = totalProblems > 0 ? Math.round(totalScore / totalProblems) : 0;

        const codingSubmissionData = {
          roundId: parseInt(roundId),
          totalScore: averageScore,
          timeSpent: timeSpent,
          submittedAt: new Date().toISOString(),
          problemScores: problemScores,
          language: selectedLanguage
        };

        console.log('Submitting coding exam data:', codingSubmissionData);

        await axios.post(
          `${API_BASE_URL}/candidate/coding/submit-exam`,
          codingSubmissionData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
      } else {
        // Submit MCQ exam
        const answersArray = questions.map((question) => ({
          questionId: parseInt(question.id) || question.id,
          selectedAnswer: answers[question.id] !== undefined ? answers[question.id] : null,
          timeSpentSeconds: Math.floor(timeSpent / questions.length)
        }));

        const mcqSubmissionData = {
          roundId: parseInt(roundId),
          answers: answersArray,
          timeTaken: timeSpent,
          startTime: new Date(examStartTime).toISOString(),
          endTime: new Date().toISOString()
        };

        console.log('Submitting MCQ exam data:', mcqSubmissionData);

        await axios.post(
          `${API_BASE_URL}/candidate/exam/submit`, 
          mcqSubmissionData,
          {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
      }

      // Cleanup and redirect
      setTimeout(() => {
        cleanupSecurityMeasures();
        stopProctoring();
        navigate('/candidate/shortlisted-jobs');
      }, 2000);

    } catch (error) {
      console.error('Error submitting exam:', error);
      
      // Always save answers as backup before handling error
      localStorage.setItem(`exam_${roundId}_backup`, JSON.stringify({
        answers,
        timestamp: new Date().toISOString(),
        examType: isCodingExam ? 'coding' : 'mcq'
      }));
      
      // Handle different error scenarios
      if (error.code === 'ECONNABORTED') {
        showError('Submission timed out. Your responses have been saved locally. Please contact support.');
      } else if (error.response?.status === 401) {
        showError('Session expired. Your responses have been saved. Please log in again.');
        navigate('/login');
      } else if (error.response?.status === 400) {
        showError('Invalid submission data. Please check your answers and try again.');
        setExamSubmitted(false);
      } else if (error.response?.status >= 500) {
        // Server error but exam data was sent — treat as submitted and redirect
        setTimeout(() => {
          cleanupSecurityMeasures();
          stopProctoring();
          navigate('/candidate/shortlisted-jobs');
        }, 2000);
      } else {
        showError('Failed to submit exam. Your responses have been saved. Please check your connection and try again.');
        setExamSubmitted(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examSubmitted, examStartTime, questions, answers, roundId, navigate, showError, selectedLanguage]);

  // Initialize exam and setup security measures
  useEffect(() => {
    if (roundId) {
      fetchExamData();
      // Enter fullscreen mode when component mounts
      enterFullscreen();
      // Add class to body to hide header/sidebar
      document.body.classList.add('exam-mode');
    }
    
    return () => {
      // Cleanup: remove class when component unmounts
      document.body.classList.remove('exam-mode');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  // Request camera as soon as exam data loads (instructions page preview)
  // so the Start Exam button can be enabled before the user clicks it
  useEffect(() => {
    if (!isLoading && examData && !examStarted && !cameraPermissionGranted && !isInitializingProctor) {
      requestCameraPermission().catch(() => {
        // Permission denied — user will see the notice; exam can still proceed
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, examData, examStarted]);

  // Fullscreen functionality
  const enterFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().catch(err => {
        console.warn('Could not enter fullscreen:', err);
      });
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  };

  // Monitor fullscreen changes and enforce fullscreen mode
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenActive = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      
      setIsFullscreen(fullscreenActive);
      
      if (!fullscreenActive && !examSubmitted && !examTerminated) {
        // Re-enter fullscreen if user exits
        setTimeout(() => {
          enterFullscreen();
          showWarning('⚠️ Fullscreen mode is required for this exam. Please stay in fullscreen.');
        }, 500);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [examSubmitted, examTerminated, showWarning]);

  // Assign submitExam to ref for handleAutoSubmit
  useEffect(() => {
    submitExamRef.current = submitExam;
  }, [submitExam]);

  // Timer countdown (removed duplicate - already handled in earlier useEffect)

  // Request camera permission for proctoring with retry logic
  const requestCameraPermission = async (retryCount = 0, maxRetries = 2) => {
    try {
      setIsInitializingProctor(true);
      setProctorStatusMessage('Requesting camera access...');
      
      const constraints = {
        video: { 
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Double check stream is valid
      if (!stream || !stream.active) {
        throw new Error('Failed to access camera stream');
      }
      
      // Stop any existing stream
      if (proctorStreamRef.current) {
        proctorStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      proctorStreamRef.current = stream;
      setCameraPermissionGranted(true);
      setProctorStatusMessage('Camera access granted');

      // Attach stream to video refs immediately
      if (proctorVideoRef.current) {
        proctorVideoRef.current.srcObject = stream;
        proctorVideoRef.current.muted = true;
        proctorVideoRef.current.playsInline = true;
        await proctorVideoRef.current.play().catch(() => {});
      }
      if (draggableCameraRef.current) {
        draggableCameraRef.current.srcObject = stream;
        draggableCameraRef.current.muted = true;
        draggableCameraRef.current.playsInline = true;
        await draggableCameraRef.current.play().catch(() => {});
      }

      // Mark camera as ready — proctoring detection will be started by startExam()
      // after the hidden video element is mounted in the exam UI
      setProctorReady(true);
      console.log('[Camera] stream acquired, proctoring will start when exam begins');
      
    } catch (error) {
      console.error('Camera access error:', error);
      
      if (retryCount < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return requestCameraPermission(retryCount + 1, maxRetries);
      }
      
      setCameraPermissionGranted(false);
      setProctorStatusMessage('Camera access required for proctoring');
      
      // Update warning count but don't block exam start
      setWarningHistory(prev => [
        ...prev, 
        { 
          type: 'camera_error', 
          message: 'Could not access camera for proctoring',
          timestamp: new Date().toISOString()
        }
      ]);
      
      throw error;
    } finally {
      setIsInitializingProctor(false);
    }
  };

  // Start exam
  const startExam = async () => {
    setExamStarted(true);
    setExamStartTime(Date.now());
    
    // Camera is already acquired on the instructions page.
    // Only re-request if somehow it wasn't granted.
    if (!cameraPermissionGranted) {
      try {
        await requestCameraPermission();
      } catch {
        console.warn('Camera permission denied, continuing without proctoring');
        setWarningCount(prev => prev + 1);
      }
    }

    // Start detection interval after a short delay so the hidden video element
    // (rendered only when examStarted=true) has time to mount and receive the stream
    setTimeout(async () => {
      try {
        await initializeProctoring();
      } catch (err) {
        console.error('[startExam] proctoring init failed:', err);
      }
    }, 800);
    
    // Note: visibilitychange handler is already set up in initializeSecurityMeasures()
    // via the handleVisibilityChange callback (line 374)
  };


  // Get current question
  const currentQuestion = questions[currentQuestionIndex];

  if (examTerminated) {
    return (
      <div className="exam-terminated">
        <div className="termination-message">
          <FiAlertTriangle className="termination-icon" />
          <h2>Exam Terminated</h2>
          <p>Your exam has been terminated due to security violations.</p>
          <p>Your answers have been automatically submitted.</p>
        </div>
      </div>
    );
  }

  if (examSubmitted) {
    return (
      <div className="exam-submitted">
        <div className="submission-message">
          <div className="submission-check">✓</div>
          <h2>Submitted</h2>
          <p>Your exam has been received.</p>
          <p className="redirect-note">Redirecting you shortly...</p>
        </div>
      </div>
    );
  }

  if (isLoading || !examData) {
    return (
      <div className="exam-loading">
        <div className="loading-spinner"></div>
        <p>Loading exam...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="exam-instructions">
        <div className="instructions-container">
          <div className="exam-header">
            <h1>No Questions Available</h1>
            <div className="exam-meta">
              <span>Round: {examData.title}</span>
            </div>
          </div>

          <div className="security-notice">
            <FiAlertTriangle className="security-icon" />
            <h3>Questions Not Ready</h3>
            <p>No questions have been added to this round yet. Please contact the recruiter to add questions before starting the exam.</p>
          </div>

          <div className="start-exam-section">
            <button className="start-exam-button" onClick={() => navigate('/candidate/shortlisted-jobs')}>
              <FiArrowLeft /> Back to Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    const isCodingExam = window.location.pathname.includes('/coding-exam/');
    const examType = isCodingExam ? 'Coding' : 'MCQ';
    
    return (
      <div className="exam-instructions" ref={examContainerRef}>
        {isFullscreen && (
          <div className="fullscreen-notice">
            <FiMonitor />
            Fullscreen Mode Active
          </div>
        )}
        <div className="instructions-container">
          {/* 1. Title */}
          <div className="exam-header-enhanced">
            <h1>{examData.title}</h1>
            <p className="round-subtitle">
              {examData.roundOrder ? `Round ${examData.roundOrder}` : `Round ${roundId}`}
            </p>
          </div>

          {/* 2. Top Info Bar - Time, Type, Problems */}
          <div className="exam-top-info">
            <div className="info-item">
              <FiClock size={16} />
              <span>{examData.duration} minutes</span>
            </div>
            <div className="info-item">
              <FiShield size={16} />
              <span>{examType}</span>
            </div>
            <div className="info-item">
              {isCodingExam ? <FiCode size={16} /> : <FiFileText size={16} />}
              <span>{questions.length} {isCodingExam ? 'Problems' : 'Questions'}</span>
            </div>
          </div>

          {/* 3. Instructions (Left) + Camera (Right) */}
          <div className="exam-content-grid">
            {/* Left: Instructions */}
            <div className="exam-instructions-section">
              <div className="instructions-header">
                <FiInfo size={16} />
                <h3>Exam Instructions</h3>
              </div>
              <div className="instructions-content">
                {isCodingExam ? (
                  <ul className="instructions-list">
                    <li>
                      <FiCode className="instruction-icon" />
                      <div>
                        <strong>Write and test your code</strong>
                        <p>You can write code in multiple programming languages and test against sample cases</p>
                      </div>
                    </li>
                    <li>
                      <FiClock className="instruction-icon" />
                      <div>
                        <strong>Time management</strong>
                        <p>Each problem has a time limit. Manage your time wisely across all problems</p>
                      </div>
                    </li>
                    <li>
                      <FiCheckCircle className="instruction-icon" />
                      <div>
                        <strong>Test your solution</strong>
                        <p>Run your code against sample test cases before final submission</p>
                      </div>
                    </li>
                    <li>
                      <FiAlertTriangle className="instruction-icon" />
                      <div>
                        <strong>Hidden test cases</strong>
                        <p>Your solution will be evaluated against hidden test cases after submission</p>
                      </div>
                    </li>
                    <li>
                      <FiEye className="instruction-icon" />
                      <div>
                        <strong>Proctoring active</strong>
                        <p>Your camera will monitor you throughout the exam. Stay in frame at all times</p>
                      </div>
                    </li>
                  </ul>
                ) : (
                  <ul className="instructions-list">
                    <li>
                      <FiFileText className="instruction-icon" />
                      <div>
                        <strong>Read carefully</strong>
                        <p>Read each question thoroughly before selecting your answer</p>
                      </div>
                    </li>
                    <li>
                      <FiCheckCircle className="instruction-icon" />
                      <div>
                        <strong>Single choice</strong>
                        <p>Each question has only one correct answer. Choose the best option</p>
                      </div>
                    </li>
                    <li>
                      <FiClock className="instruction-icon" />
                      <div>
                        <strong>Time limit</strong>
                        <p>Complete all questions within the allocated time. The exam will auto-submit when time expires</p>
                      </div>
                    </li>
                    <li>
                      <FiArrowRight className="instruction-icon" />
                      <div>
                        <strong>Navigation</strong>
                        <p>You can navigate between questions and change answers before final submission</p>
                      </div>
                    </li>
                    <li>
                      <FiEye className="instruction-icon" />
                      <div>
                        <strong>Proctoring active</strong>
                        <p>Your camera will monitor you throughout the exam. Stay in frame at all times</p>
                      </div>
                    </li>
                  </ul>
                )}
              </div>
            </div>

            {/* Right: Camera Preview */}
            <div className="camera-preview-card">
              <div className="camera-preview-header">
                <div>
                  <FiEye size={16} color="#60a5fa" />
                  <h3>Proctoring Camera</h3>
                </div>
                {proctorReady && cameraPermissionGranted && (
                  <div className="camera-status-badge ready">
                    <FiCheckCircle size={14} />
                    <span>Ready</span>
                  </div>
                )}
              </div>
              <div className="camera-preview-container">
                {proctorStreamRef.current ? (
                  <video
                    ref={proctorVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-preview-video"
                  />
                ) : (
                  <div className="camera-loading">
                    <FiVideo size={36} color="#60a5fa" />
                    <p>
                      {isInitializingProctor 
                        ? 'Initializing camera...' 
                        : !cameraPermissionGranted 
                          ? 'Waiting for camera access...' 
                          : 'Loading camera...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Start Button in Middle */}
          <div className="start-exam-section">
            <button 
              className="start-exam-button"
              disabled={!cameraPermissionGranted || isInitializingProctor || !proctorReady}
              onClick={startExam}
            >
              <FiLock /> 
              {!cameraPermissionGranted 
                ? 'Grant Camera Access to Continue' 
                : !proctorReady 
                  ? 'Please Wait...' 
                  : 'Start Exam'
              }
            </button>
            {!cameraPermissionGranted && (
              <p className="camera-notice">
                Camera access is required for exam proctoring. Please allow camera permissions to continue.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="secure-exam-container" ref={examContainerRef}>
      {/* Hidden video element always mounted during exam — used by detection interval */}
      <video
        ref={proctorVideoRef}
        muted
        playsInline
        autoPlay
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
      {/* Modern SmartHireX Header */}
      <div className="secure-exam-header">
        <div className="header-left">
          <div className="brand-section">
            <div className="brand-logo">
              <span className="logo-text">SmartHireX</span>
            </div>
            <div className="exam-status">
              <FiShield className="shield-icon" />
              <span>SECURE EXAM</span>
            </div>
          </div>
        </div>
        
        <div className="header-center">
          <div className="exam-info">
            <span className="exam-title">{examData?.title || 'MCQ Assessment'}</span>
          </div>
        </div>
        
        <div className="header-right">
          <div className="timer-section">
            <FiClock className="timer-icon" />
            <span className="timer-text">{formatTime(timeRemaining)}</span>
          </div>
          <div className="security-status">
            <div className="status-indicator active"></div>
            <span>Monitoring Active</span>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="question-container">
        <div className="question-header">
          <h2>
            {currentQuestion?.problemStatement ? 'Problem' : 'Question'} {currentQuestionIndex + 1} of {questions.length}
          </h2>
        </div>

        {currentQuestion && (
          <div className="question-content">
            {/* Check if this is a coding problem */}
            {currentQuestion.problemStatement ? (
              // Coding Problem Layout - Split View
              <div className="coding-problem">
                {/* Left Side: Problem Details */}
                <div className="problem-details-section">
                  <div className="problem-header">
                    <h3>{currentQuestion.title}</h3>
                    <span className={`difficulty-badge ${currentQuestion.difficulty?.toLowerCase()}`}>
                      {currentQuestion.difficulty}
                    </span>
                  </div>
                  
                  <div className="problem-statement">
                    <h4>Problem Statement</h4>
                    <p>{currentQuestion.problemStatement}</p>
                  </div>
                  
                  {currentQuestion.inputFormat && (
                    <div className="problem-section">
                      <h4>Input Format</h4>
                      <p>{currentQuestion.inputFormat}</p>
                    </div>
                  )}
                  
                  {currentQuestion.outputFormat && (
                    <div className="problem-section">
                      <h4>Output Format</h4>
                      <p>{currentQuestion.outputFormat}</p>
                    </div>
                  )}
                  
                  {currentQuestion.constraints && (
                    <div className="problem-section">
                      <h4>Constraints</h4>
                      <p>{currentQuestion.constraints}</p>
                    </div>
                  )}
                  
                  {currentQuestion.testCases && currentQuestion.testCases.length > 0 && (
                    <div className="problem-section">
                      <h4>Sample Test Cases</h4>
                      {currentQuestion.testCases.filter(tc => tc.isSample).map((testCase, index) => (
                        <div key={index} className="test-case">
                          <div className="test-case-input">
                            <strong>Input:</strong>
                            <pre>{testCase.input}</pre>
                          </div>
                          <div className="test-case-output">
                            <strong>Output:</strong>
                            <pre>{testCase.expectedOutput}</pre>
                          </div>
                          {testCase.explanation && (
                            <div className="test-case-explanation">
                              <strong>Explanation:</strong>
                              <p>{testCase.explanation}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Side: Solution/Code Editor */}
                <div className="solution-section">
                  <div className="code-editor-section">
                    <div className="editor-header">
                      <h4>Your Solution</h4>
                      <div className="editor-controls">                        <select 
                          className="language-selector"
                          value={selectedLanguage || 'java'}
                          onChange={(e) => {
                            const newLanguage = e.target.value;
                            const currentCode = answers[currentQuestion.id] || '';
                            // Swap starter if editor is empty or still has a starter template
                            const isStarter = ['java','python','cpp','c'].some(
                              l => currentCode.trim() === getStarterCode(l).trim()
                            );
                            if (!currentCode.trim() || isStarter) {
                              handleAnswerChange(currentQuestion.id, getStarterCode(newLanguage));
                            }
                            setSelectedLanguage(newLanguage);
                          }}
                        >
                          <option value="java">Java</option>
                          <option value="python">Python</option>
                          <option value="cpp">C++</option>
                          <option value="c">C</option>
                        </select>
                        <button 
                          className="run-btn"
                          onClick={() => handleRunCode(currentQuestion.id)}
                          disabled={isRunning}
                        >
                          {isRunning ? 'Running...' : '▶ Run'}
                        </button>
                        <button 
                          className="test-btn"
                          onClick={() => handleRunTests(currentQuestion.id)}
                          disabled={isRunning}
                        >
                          {isRunning ? 'Testing...' : '🧪 Test'}
                        </button>
                      </div>
                    </div>

                    {/* Auto-save indicator */}
                    <div className="autosave-bar">
                      {autoSaveStatus === 'saving' && <span className="autosave-saving">⏳ Saving...</span>}
                      {autoSaveStatus === 'saved' && <span className="autosave-saved">✓ Saved</span>}
                      {autoSaveStatus === '' && <span className="autosave-idle">💾 Auto-save on</span>}
                    </div>
                    
                    <Editor
                      height="calc(100vh - 420px)"
                      language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage === 'c' ? 'c' : selectedLanguage || 'java'}
                      value={answers[currentQuestion.id] || ''}
                      onChange={(val) => handleAnswerChange(currentQuestion.id, val || '')}
                      theme="vs-dark"
                      options={{
                        fontSize: 13,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        tabSize: 2,
                        lineNumbers: 'on',
                        contextmenu: false,
                      }}
                    />
                    
                    <div className="input-section">
                      <label htmlFor="code-input" className="input-label">
                        📥 Custom Input (Optional):
                      </label>
                      <textarea
                        id="code-input"
                        className="code-input"
                        placeholder="Enter input for your code (e.g., numbers, arrays, strings)..."
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    {/* Terminal Console - only visible after Run or Test */}
                    {(runOutput || testResults) && <div className="terminal-console">
                      <div className="terminal-titlebar">
                        <div className="terminal-dots">
                          <span className="dot dot-red"></span>
                          <span className="dot dot-yellow"></span>
                          <span className="dot dot-green"></span>
                        </div>
                        <span className="terminal-title">terminal</span>
                        {(runOutput || testResults) && (
                          <button
                            className="terminal-clear-btn"
                            onClick={() => { setRunOutput(''); setTestResults(null); }}
                          >
                            clear
                          </button>
                        )}
                      </div>

                      <div className="terminal-body">
                        {!runOutput && !testResults && (
                          <div className="terminal-idle">
                            <span className="terminal-prompt">$</span>
                            <span className="terminal-idle-text"> waiting for execution...</span>
                          </div>
                        )}

                        {runOutput && (() => {
                          const isError = runOutput.includes('❌') || runOutput.toLowerCase().includes('error');
                          return (
                            <div className="terminal-output">
                              <div className="terminal-cmd-line">
                                <span className="terminal-prompt">$</span>
                                <span className="terminal-cmd"> run {selectedLanguage}</span>
                              </div>
                              <pre className={`terminal-pre ${isError ? 'terminal-error' : 'terminal-success'}`}>
                                {runOutput}
                              </pre>
                              <div className="terminal-prompt-end">
                                <span className="terminal-prompt">$</span>
                                <span className="terminal-cursor">▋</span>
                              </div>
                            </div>
                          );
                        })()}

                        {testResults && (
                          <div className="terminal-tests">
                            <div className="terminal-cmd-line">
                              <span className="terminal-prompt">$</span>
                              <span className="terminal-cmd"> run tests ({testResults.totalCount} cases)</span>
                            </div>
                            <div className={`terminal-test-summary ${testResults.passed ? 'pass' : 'fail'}`}>
                              {testResults.passed ? '✓' : '✗'} {testResults.passedCount}/{testResults.totalCount} passed
                            </div>
                            {(testResults.results || testResults.details || []).map((test, i) => (
                              <div key={i} className={`terminal-test-case ${test.passed || test.pass ? 'pass' : 'fail'}`}>
                                <span className="terminal-test-icon">{test.passed || test.pass ? '✓' : '✗'}</span>
                                <span className="terminal-test-label">Case {i + 1}</span>
                                {!(test.passed || test.pass) && (
                                  <div className="terminal-test-diff">
                                    <span className="diff-expected">expected: <code>{test.expected ?? test.expectedOutput}</code></span>
                                    <span className="diff-got">got: <code>{test.actual ?? test.got ?? test.output}</code></span>
                                    {(test.error) && <span className="diff-error">err: <code>{test.error}</code></span>}
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className="terminal-prompt-end">
                              <span className="terminal-prompt">$</span>
                              <span className="terminal-cursor">▋</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    }
                  </div>
                </div>
              </div>
            ) : (
              // MCQ Layout with Sidebar
              <div className="mcq-layout">
                <div className="mcq-main-content">
                  <div className="mcq-question">
                    <div className="question-number-badge">Q{currentQuestionIndex + 1}</div>
                    <div className="question-text">
                      <p>{currentQuestion.question}</p>
                    </div>

                    <div className="options-container">
                      {currentQuestion.options.map((option, index) => (
                        <div 
                          key={index} 
                          className={`option-item ${answers[currentQuestion.id] === index ? 'selected' : ''}`}
                          onClick={() => handleAnswerChange(currentQuestion.id, index)}
                        >
                          <div className="option-radio"></div>
                          <div className="option-text">
                            <strong>{String.fromCharCode(65 + index)}.</strong> {option}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mcq-sidebar">
                  <div className="sidebar-header">
                    <h3>Question Status</h3>
                    <button 
                      className="sidebar-toggle-btn"
                      onClick={() => {
                        const sidebar = document.querySelector('.mcq-sidebar');
                        sidebar.classList.toggle('collapsed');
                      }}
                      title="Toggle sidebar"
                    >
                      ›
                    </button>
                  </div>
                  
                  <div className="sidebar-content">
                    <div className="status-summary">
                      <div className="status-item">
                        <span className="status-dot answered"></span>
                        <span>Ans</span>
                        <span>{sampleTestsPassed.size}</span>
                      </div>
                      <div className="status-item">
                        <span className="status-dot current"></span>
                        <span>Left</span>
                        <span>{questions.length - Object.keys(answers).length}</span>
                      </div>
                    </div>
                  
                    <div className="sidebar-questions">
                      {questions.map((q, index) => (
                        <button
                          key={index}
                          className={`sidebar-question-btn ${index === currentQuestionIndex ? 'current' : ''} ${sampleTestsPassed.has(q.id) ? 'answered' : 'not-answered'}`}
                          onClick={() => setCurrentQuestionIndex(index)}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>

                    <div className="sidebar-legend">
                      <div className="legend-item">
                        <span className="legend-dot current"></span>
                        <span>Current</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-dot answered"></span>
                        <span>Answered</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-dot not-answered"></span>
                        <span>Not Answered</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="exam-navigation">
          <button
            className="nav-button"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <FiArrowLeft />
            Previous
          </button>

          {/* Only show question indicators for coding exams, MCQ has sidebar */}
          {currentQuestion?.problemStatement && (
            <div className="question-indicators">
              {questions.map((_, index) => (
                <button
                  key={index}
                  className={`question-indicator ${index === currentQuestionIndex ? 'current' : ''} ${sampleTestsPassed.has(questions[index]?.id) ? 'answered' : ''}`}
                  onClick={() => setCurrentQuestionIndex(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          )}

          {currentQuestionIndex < questions.length - 1 ? (
            <button
              className="nav-button"
              onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
            >
              Next
              <FiChevronsLeft style={{ transform: 'rotate(180deg)' }} />
            </button>
          ) : (
            <button
              className="nav-button submit-button"
              onClick={submitExam}
            >
              <FiLock />
              Submit Exam
            </button>
          )}
        </div>
      </div>

      {/* Draggable Proctoring Control Bar */}
      {showProctoringBar && (
        <div
          className={`proctor-dock ${panelCollapsed ? 'collapsed' : ''}`}
          style={{
            position: 'fixed',
            left: `${proctoringBarPosition.x}px`,
            top: `${proctoringBarPosition.y}px`,
            zIndex: 1000,
            cursor: isDraggingBar ? 'grabbing' : 'grab'
          }}
          onClick={handleDockClick}
          onMouseDown={(e) => handleMouseDown(e, 'bar')}
        >
          {!panelCollapsed && (
            <div className="proctor-dock-body">
              <div className="dock-icon" title={proctoringActive ? 'Proctoring active' : 'Proctoring idle'}>
                <span className={`status-pill ${proctoringActive ? 'online' : 'idle'}`}></span>
              </div>
              <div className="dock-status" title={proctorStatusMessage}>
                <span className="status-text">{proctorStatusMessage}</span>
              </div>
              <div className="dock-count" title={`Warnings: ${warningHistory.length}`}>
                <span>{warningHistory.length}</span>
              </div>
              {hasCriticalProctorAlert && <span className="dock-alert" title="Critical warning"></span>}
            </div>
          )}

          <div className="proctor-dock-rail">
            {panelCollapsed ? (
              <div className="collapsed-rail">
                <FiChevronsLeft size={20} />
              </div>
            ) : (
              <>
                <button
                  className={`rail-btn ${showCameraView ? 'active' : ''}`}
                  data-label={showCameraView ? 'Hide camera view' : 'Show camera view'}
                  aria-label={showCameraView ? 'Hide camera view' : 'Show camera view'}
                  onClick={handleCameraToggle}
                >
                  <FiVideo size={18} />
                </button>
                <button
                  className={`rail-btn ${showWarningsPanel ? 'active' : ''} ${hasCriticalProctorAlert ? 'alert' : ''}`}
                  data-label="View warnings"
                  aria-label="View warnings"
                  onClick={handleWarningsToggle}
                >
                  <FiAlertTriangle size={18} />
                  {hasCriticalProctorAlert && <span className="rail-alert-dot"></span>}
                </button>
                <button
                  className="rail-btn"
                  data-label="Collapse panel"
                  aria-label="Collapse panel"
                  onClick={handleCollapsePanel}
                >
                  <FiMinimize2 size={18} />
                </button>
                <button
                  className="rail-btn"
                  data-label="Hide proctor controls"
                  aria-label="Hide proctor controls"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProctoringBar(false);
                  }}
                >
                  ×
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Draggable Camera View */}
      {showCameraView && (
        <div 
          className="draggable-camera-view"
          style={{
            position: 'fixed',
            top: `${cameraPosition.y}px`,
            left: `${cameraPosition.x}px`,
            zIndex: 1001
          }}
        >
          <div 
            className="camera-header"
            onMouseDown={(e) => handleMouseDown(e, 'camera')}
            style={{
              cursor: isDraggingCamera ? 'grabbing' : 'move'
            }}
          >
            <span>Camera View</span>
            <button 
              className="close-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowCameraView(false);
              }}
            >
              ×
            </button>
          </div>
          <div className="camera-content">
            <video
              ref={draggableCameraRef}
              className="draggable-proctor-video"
              playsInline
              muted
              autoPlay
            ></video>
            {!cameraPermissionGranted && (
              <div className="camera-overlay">
                <p>Camera access required</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings Panel */}
      {showWarningsPanel && (
        <div className="warnings-panel">
          <div className="warnings-header">
            <h3>
              <FiAlertTriangle size={16} style={{ marginRight: 6, color: '#f87171' }} />
              Proctoring Alerts
              {warningHistory.length > 0 && (
                <span className="warnings-count-badge">{warningHistory.length}</span>
              )}
            </h3>
            <div className="warnings-header-actions">
              {warningHistory.length > 0 && (
                <button
                  className="clear-all-btn"
                  onClick={() => {
                    setWarningHistory([]);
                    setHasCriticalProctorAlert(false);
                  }}
                  title="Clear all alerts"
                >
                  Clear all
                </button>
              )}
              <button onClick={() => setShowWarningsPanel(false)}>×</button>
            </div>
          </div>
          <div className="warnings-content">
            {warningHistory.length === 0 ? (
              <p className="no-warnings">No alerts</p>
            ) : (
              <div className="warnings-list">
                {warningHistory.map((warning) => (
                  <div key={warning.id ?? warning.timestamp} className={`warning-item ${warning.type}`}>
                    <div className="warning-item-top">
                      <span className="warning-time">{warning.timestamp}</span>
                      <button
                        className="warning-dismiss-btn"
                        title="Dismiss"
                        onClick={() => {
                          setWarningHistory(prev => prev.filter(w => (w.id ?? w.timestamp) !== (warning.id ?? warning.timestamp)));
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <div className="warning-message">{warning.message}</div>
                    <div className="warning-type-badge">{warning.type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen overlay prompt */}
      {needsFullscreen && !examSubmitted && (
        <div className="fullscreen-overlay">
          <div className="fullscreen-card">
            <h3>Resume Secure Fullscreen</h3>
            <p>
              This exam requires fullscreen mode so that monitoring and security checks can remain active.
              Please re-enter fullscreen to continue.
            </p>
            <div className="overlay-actions">
              <button
                className="resume-fullscreen-btn"
                onClick={() => requestFullscreen().catch(() => {})}
              >
                Re-enter Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show Control Bar Button (when hidden) */}
      {!showProctoringBar && (
        <button 
          className="show-controls-btn"
          onClick={() => {
            setPanelCollapsed(false);
            setShowProctoringBar(true);
          }}
          style={{
            position: 'fixed',
            right: '20px',
            top: '20px',
            zIndex: 1001
          }}
        >
          <FiVideo /> Controls
        </button>
      )}

          </div>
  );
};

export default SecureExam;
