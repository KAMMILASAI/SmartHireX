import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import Editor, { loader } from '@monaco-editor/react';
import './Coding.css';
import './MCQs.css';
import { FiArrowLeft, FiCode, FiTerminal, FiPlay, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';

// Configure Monaco loader to use a reliable CDN
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs'
  }
});

// Helper functions to parse problem content (pure functions - defined outside component for stable references)
const extractDescriptionFromContent = (content) => {
  const lines = content.split('\n');
  let description = '';
  let inDescription = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('# Problem Statement') || trimmedLine.startsWith('## Problem Statement')) {
      inDescription = true;
      continue;
    }
    if (trimmedLine.match(/^#+\s*Examples/i) || 
        trimmedLine.match(/^#+\s*Constraints/i) || 
        trimmedLine.match(/^\*\*Examples/i) ||
        trimmedLine.match(/^\*\*Constraints/i)) {
      break;
    }
    if (inDescription && trimmedLine) {
      if (description && !description.endsWith('.') && !description.endsWith(':')) {
        description += '. ';
      } else if (description) {
        description += ' ';
      }
      description += trimmedLine;
    }
  }
  
  return description.replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').trim();
};

const extractExamplesFromContent = (content) => {
  if (!content) return [];
  const examples = [];
  console.log('Extracting examples from content length:', content.length);
  
  // Method 1: Robust regex for "Example N:" format
  // This handles both inline and multiline Input/Output, and various line endings
  // It also captures JSON inputs like {"nums": [1,2,2,1,3,4,3,2], "k": 2}
  const simpleExampleRegex = /Example\s*(\d+):?\s*[\r\n]+(?:[\s\S]*?)Input:\s*(.*?)\s*[\r\n]+\s*Output:\s*(.*?)(?=\s*[\r\n]+\s*Example|\s*[\r\n]+\s*Constraints|\s*[\r\n]+\s*\*\*|\s*$)/gis;
  
  let match;
  while ((match = simpleExampleRegex.exec(content)) !== null) {
    const input = match[2].trim();
    const output = match[3].trim();
    if (input && output) {
      examples.push({
        input,
        output,
        explanation: `Example ${match[1]}`
      });
      console.log(`Successfully parsed example ${match[1]}:`, { input, output });
    }
  }
  
  // Method 2: Look for Input:/Output: pairs anywhere in the text (fallback)
  if (examples.length === 0) {
    console.log('Method 1 failed, trying Method 2 (Input/Output pairs)...');
    const pairRegex = /Input:\s*(.*?)\s*[\r\n]+\s*Output:\s*(.*?)(?=\s*[\r\n]|$)/gis;
    let i = 1;
    while ((match = pairRegex.exec(content)) !== null) {
      examples.push({
        input: match[1].trim(),
        output: match[2].trim(),
        explanation: `Example ${i++}`
      });
    }
  }
  
  // Method 3: Look for code blocks with Input/Output
  if (examples.length === 0) {
    console.log('Method 2 failed, trying Method 3 (Code blocks)...');
    const codeBlockRegex = /```[\s\S]*?Input:\s*(.*?)\s*Output:\s*(.*?)\s*```/gis;
    let i = 1;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      examples.push({
        input: match[1].trim(),
        output: match[2].trim(),
        explanation: `Example ${i++}`
      });
    }
  }
  
  console.log(`Total examples extracted: ${examples.length}`);
  return examples;
};

const extractConstraintsFromContent = (content) => {
  const constraints = [];
  const lines = content.split('\n');
  let inConstraints = false;
  
  for (const line of lines) {
    if (line.startsWith('## Constraints')) {
      inConstraints = true;
      continue;
    }
    if (inConstraints && line.startsWith('- ')) {
      constraints.push(line.substring(2).trim());
    }
  }
  
  return constraints;
};

export default function Coding({ 
  onExamComplete,
  isMixedComponent = false,
  roundId: _propRoundId,
  timeLimit: _propTimeLimit, 
  problems: _propProblems
} = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const abortRef = useRef(null);
  const navState = useMemo(() => (location && location.state) || {}, [location]);
  const mixedMode = isMixedComponent || navState.isMixedComponent === true;
  const [problems, setProblems] = useState([]);
  const [currentProblem, setCurrentProblem] = useState(0);
  const [solutions, setSolutions] = useState({});
  const [timerEnabled, setTimerEnabled] = useState(() => {
    const fromNav = typeof navState.timerEnabled === 'boolean' ? navState.timerEnabled : true;
    return fromNav;
  });
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = sessionStorage.getItem('coding_timeLeft');
    if (saved) return Number(saved);
    const fromNav = navState && typeof navState.timerMinutes === 'number' ? navState.timerMinutes * 60 : null;
    if (timerEnabled) return fromNav ?? 3600; // default 60 minutes
    return 0;
  });

  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('java');
  const [runOutput, setRunOutput] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [userInput, setUserInput] = useState('');

  // Helper to get default starter code for a language
  const getStarterCode = (lang) => {
    if (lang === 'python') {
      return `# GFG/HackerEarth Style Python Template\n# Read input\nn = int(input())\narr = list(map(int, input().split()))\n\n# Your solution here\nresult = sum(arr)\n\n# Print output\nprint(result)\n`;
    } else if (lang === 'java') {
      return `// GFG/HackerEarth Style Java Template\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n        // Read input\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            int[] arr = new int[n];\n            for (int i = 0; i < n; i++) {\n                if (sc.hasNextInt()) arr[i] = sc.nextInt();\n            }\n            \n            // Your solution here\n            int result = 0;\n            for (int num : arr) {\n                result += num;\n            }\n            \n            // Print output\n            System.out.println(result);\n        }\n        \n        sc.close();\n    }\n}\n`;
    } else if (lang === 'cpp') {
      return `// GFG/HackerEarth Style C++ Template\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Read input\n    int n;\n    if (cin >> n) {\n        vector<int> arr(n);\n        for (int i = 0; i < n; i++) {\n            cin >> arr[i];\n        }\n        \n        // Your solution here\n        int result = 0;\n        for (int num : arr) {\n            result += num;\n        }\n        \n        // Print output\n        cout << result << endl;\n    }\n    \n    return 0;\n}\n`;
    } else if (lang === 'c') {
      return `// GFG/HackerEarth Style C Template\n#include <stdio.h>\n\nint main() {\n    // Read input\n    int n;\n    if (scanf("%d", &n) == 1) {\n        int arr[n];\n        for (int i = 0; i < n; i++) {\n            scanf("%d", &arr[i]);\n        }\n        \n        // Your solution here\n        int result = 0;\n        for (int i = 0; i < n; i++) {\n            result += arr[i];\n        }\n        \n        // Print output\n        printf("%d\\n", result);\n    }\n    \n    return 0;\n}\n`;
    }
    return '';
  };

  const initializeSolutions = useCallback((problemsList) => {
    // Initialize solutions with starter code
    const storageKey = `coding_solutions_${language}`;
    const saved = localStorage.getItem(storageKey);
    
    const initial = {};
    const savedObj = saved ? JSON.parse(saved) : {};
    
    problemsList.forEach(p => {
      // Priority: 1. LocalStorage, 2. Backend starter code, 3. Default template
      initial[p.id] = savedObj[p.id] || p.starterCode?.[language] || getStarterCode(language);
    });
    
    setSolutions(initial);
    localStorage.setItem(storageKey, JSON.stringify(initial));
  }, [language]);

  const loadProblems = useCallback(async () => {
    setLoading(true);
    console.log('Loading problems, navState:', navState);
    
    try {
      // If navigation already provided problems, use them directly
      if (Array.isArray(navState.problems) && navState.problems.length > 0) {
        console.log('Using problems from navigation:', navState.problems);
        setProblems(navState.problems);
        initializeSolutions(navState.problems);
        setLoading(false);
        return;
      }
      
      // If no navigation state, try API
      console.log('No navigation problems, trying API...');
      let finalProblems = [];
      
      try {
        // Use the current language as the technology for AI generation
        const tech = language || 'Java';
        const difficulty = navState.difficulty || 'Medium';
        
        const token = localStorage.getItem('token');
        const resp = await axios.post(
          '/api/candidate/practice/ai-coding',
          { topic: tech, difficulty, numProblems: 1, testCases: 10 },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        const data = resp?.data;
        console.log('Backend response:', data); // Debug log
        
        if (Array.isArray(data) && data.length > 0) {
          finalProblems = data.map((q, idx) => {
            console.log('Raw backend response for problem:', q);
            
            // Use structured data directly from backend if available
            const structuredExamples = q.examples || [];
            const structuredConstraints = q.constraints || [];
            
            // CRITICAL: Clean the description to remove hardcoded examples/constraints
            const cleanDescription = (desc) => {
              if (!desc) return '';
              // Stop at any version of "Examples" or "Constraints" headers
              const stopRegex = /(?:#+\s*Examples|\*\*Examples:?|\*\*Test\s*Cases:?|#+\s*Constraints|\*\*Constraints:?)/i;
              const parts = desc.split(stopRegex);
              return parts[0].trim();
            };

            const rawDescription = q.description || '';
            const rawProblemContent = q.problemContent || '';
            
            let finalExamples = structuredExamples;
            let finalConstraints = structuredConstraints;
            let finalDescription = cleanDescription(rawDescription);
            
            // FALLBACK PARSING: If backend didn't provide structured examples, parse them from text
            if (finalExamples.length === 0) {
              console.log('Parsing examples from description/content fallback...');
              // Try parsing from raw description first (since AI often dumps everything there)
              finalExamples = extractExamplesFromContent(rawDescription);
              
              // If still nothing, try problemContent
              if (finalExamples.length === 0 && rawProblemContent) {
                finalExamples = extractExamplesFromContent(rawProblemContent);
              }
            }

            if (finalConstraints.length === 0) {
              finalConstraints = extractConstraintsFromContent(rawDescription);
              if (finalConstraints.length === 0 && rawProblemContent) {
                finalConstraints = extractConstraintsFromContent(rawProblemContent);
              }
            }

            if (!finalDescription && rawProblemContent) {
              finalDescription = cleanDescription(extractDescriptionFromContent(rawProblemContent));
            }
            
            return {
              id: Date.now() + idx,
              title: q.title || 'Coding Problem',
              difficulty: q.difficulty || difficulty,
              description: finalDescription,
              examples: finalExamples,
              constraints: finalConstraints,
              starterCode: {},
              technology: tech,
            };
          });
        }
      } catch (e) {
        console.error('API failed:', e);
        finalProblems = [];
      }

      setProblems(finalProblems);
      initializeSolutions(finalProblems);

    } catch (error) {
      console.error('Failed to load problems:', error);
      setProblems([]);
    }
    setLoading(false);
  }, [navState, initializeSolutions]);

  // Cancel current run/tests
const handleCancel = () => {
  try {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  } catch {
    // Ignore abort errors - cancellation proceeds regardless
  }
  setIsRunning(false);
  setRunOutput((prev) => (prev ? `${prev}\nCanceled by user` : 'Canceled by user'));
};

  // Helper to call backend judge for non-JS languages with timeout/cancellation
  const judgeRun = async ({ language: lang, code, input, timeoutMs = 20000, signal }) => {
    const controller = signal ? null : new AbortController();
    const usedSignal = signal || controller?.signal;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const resp = await axios.post(
        '/api/judge',
        { language: lang, code, input },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: usedSignal,
          timeout: timeoutMs,
        }
      );
      const data = resp?.data || {};
      // Normalize common fields
      const output = data.output ?? data.stdout ?? data.result ?? '';
      const error = data.error ?? data.stderr ?? null;
      const logs = Array.isArray(data.logs) ? data.logs : [];
      return { output, error, logs };
    } catch (err) {
      const isAborted = err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED';
      const isTimeout = err?.code === 'ECONNABORTED' || /timeout/i.test(String(err?.message || ''));
      const msg = isAborted ? 'Request was canceled' : (isTimeout ? 'Execution timed out' : (err?.response?.data?.message || err.message || String(err)));
      return { output: '', error: msg, logs: [] };
    } finally {
      // no-op
    }
  };

  const handleRun = async () => {
    const currentProb = problems[currentProblem];
    const code = solutions[currentProb?.id] || '';
    
    // Check if code uses Scanner or input() - if so, show interactive console
    const needsInput = (
      (language === 'java' && (code.includes('Scanner') || code.includes('nextLine') || code.includes('nextInt'))) ||
      (language === 'python' && code.includes('input(')) ||
      (language === 'cpp' && code.includes('cin')) ||
      (language === 'c' && code.includes('scanf'))
    );
    
    if (needsInput) {
      // Show interactive console for user input
      setRunOutput('🎯 Your code needs input. Please enter input below and press Enter:\n');
      setWaitingForInput(true);
      setInputPrompt('Enter input: ');
      return;
    }
    
    // For code that doesn't need input, run directly
    let input = '';
    const first = currentProb?.examples?.[0];
    if (first?.input) {
      // Handle different input formats
      let processedInput = first.input;
      
      // If input looks like JSON array, convert to space/newline separated
      if (processedInput.startsWith('[') && processedInput.endsWith(']')) {
        try {
          const arr = JSON.parse(processedInput);
          processedInput = arr.join(' ') + '\n';
        } catch {
          processedInput = first.input + '\n';
        }
      } else if (processedInput.startsWith('{') && processedInput.endsWith('}')) {
        // Handle JSON objects - extract values
        try {
          const obj = JSON.parse(processedInput);
          const values = Object.values(obj);
          processedInput = values.join(' ') + '\n';
        } catch {
          processedInput = first.input + '\n';
        }
      } else {
        // Plain text input - ensure it ends with newline
        processedInput = first.input + (first.input.endsWith('\n') ? '' : '\n');
      }
      
      input = processedInput;
    } else {
      // No input provided - let code run without input
      input = '';
    }
    
    await executeCode(code, input);
  };

  // Function to execute code with input
  const executeCode = async (code, input) => {
    setIsRunning(true);
    setRunOutput('Running code...');
    
    try {
      // Call backend judge for all languages - server-side execution
      const controller = new AbortController();
      abortRef.current = controller;
      
      console.log('🚀 Running code:', { language, code: code.substring(0, 100) + '...', input });
      console.log('📡 API Endpoint:', '/api/judge');
      console.log('🌐 Full URL:', window.location.origin + '/api/judge');
      
      const { output, error, logs } = await judgeRun({ language, code, input, timeoutMs: 20000, signal: controller.signal });
      
      console.log('📤 Judge response:', { output, error, logs });
      
      if (error) {
        if (error.includes('Cannot run program')) {
          setRunOutput(`❌ Compiler Error: ${language.toUpperCase()} compiler not available on server.\n\nServer needs to install:\n- For Java: JDK (javac, java)\n- For Python: Python interpreter\n- For C++: g++ compiler\n- For C: gcc compiler\n\nPlease contact admin to install compilers on server.`);
        } else if (error.includes('No line found') || error.includes('Scanner')) {
          setRunOutput(`❌ Input Error: Scanner.nextLine() failed - no input provided.\n\nTip: For testing, use simple input/output:\n\nExample Java code:\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello World");\n  }\n}\n\nOr handle input properly:\nScanner sc = new Scanner(System.in);\nString line = sc.nextLine();\nSystem.out.println(line);`);
        } else {
          const logsText = logs && logs.length ? `\n\nLogs:\n${logs.join('\n')}` : '';
          setRunOutput(`❌ Execution Error: ${error}${logsText}`);
        }
      } else {
        const logsText = logs && logs.length ? `\n\nDebug Logs:\n${logs.join('\n')}` : '';
        const outputText = typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output);
        setRunOutput(`Output:\n${outputText}${logsText}`);
      }
    } catch (e) {
      console.error('❌ Judge call failed:', e);
      
      if (e.message.includes('Network Error') || e.message.includes('ERR_NETWORK')) {
        setRunOutput(`❌ Network Error: Cannot connect to code execution server.\n\nTroubleshooting:\n1. ✅ Check if backend server is running on localhost:8080\n2. ✅ Verify /judge endpoint is accessible\n3. ✅ Check browser console for CORS errors\n4. ✅ Ensure Vite proxy is configured correctly\n\nCurrent endpoint: /judge\nExpected server: http://localhost:8080/judge`);
      } else if (e.message.includes('timeout') || e.code === 'ECONNABORTED') {
        setRunOutput(`❌ Timeout Error: Code execution took too long (>20 seconds).\n\nPossible causes:\n1. Infinite loop in your code\n2. Very large input data\n3. Server overload\n\nTry:\n- Check for infinite loops\n- Use smaller test inputs\n- Optimize your algorithm`);
      } else {
        setRunOutput(`❌ Unexpected Error: ${String(e)}\n\nPlease check:\n1. Code syntax is correct\n2. Backend server is running\n3. Browser console for more details`);
      }
    } finally {
      setIsRunning(false);
      setWaitingForInput(false);
      abortRef.current = null;
    }
  };

  // Handle user input submission
  const handleInputSubmit = async () => {
    if (!userInput.trim()) return;
    
    const currentProb = problems[currentProblem];
    const code = solutions[currentProb?.id] || '';
    
    // Add user input to console output
    setRunOutput(prev => prev + `\n> ${userInput}\n\nExecuting with your input...\n`);
    
    // Execute code with user input
    await executeCode(code, userInput);
    
    // Reset input states
    setUserInput('');
    setWaitingForInput(false);
    setInputPrompt('');
  };

  // Handle Enter key press in input
  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    }
  };

  const handleRunTests = async () => {
    console.log('handleRunTests called');
    const currentProb = problems[currentProblem];
    console.log('=== CURRENT PROBLEM DEBUG ===');
    console.log('Current problem:', currentProb);
    console.log('Problem keys:', currentProb ? Object.keys(currentProb) : 'No problem');
    console.log('testCases field:', currentProb?.testCases);
    console.log('examples field:', currentProb?.examples);
    console.log('testCases is array:', Array.isArray(currentProb?.testCases));
    console.log('examples is array:', Array.isArray(currentProb?.examples));
    
    // Get test cases from backend response
    let ex = [];
    
    // Backend sends testCases array with TestCaseDTO objects
    if (Array.isArray(currentProb?.testCases)) {
      console.log('Using testCases field');
      ex = currentProb.testCases.map(testCase => ({
        input: testCase.input,
        output: testCase.expectedOutput
      }));
    } 
    // Fallback to examples field if available
    else if (Array.isArray(currentProb?.examples)) {
      console.log('Using examples field');
      ex = currentProb.examples;
    }
    
    console.log('Test cases found:', ex.length);
    console.log('Test cases:', ex);
    
    if (ex.length === 0) {
      console.log('No test cases found');
      setTestResults({ 
        supported: true, 
        total: 0, 
        passed: 0, 
        cases: [],
        error: 'No test cases available. The problem may not have test cases configured.'
      });
      setIsRunning(false);
      return;
    }
    
    const code = solutions[currentProb?.id] || '';
    console.log('Code for testing:', code.substring(0, 100) + '...');
    console.log('Language:', language);
    
    setIsRunning(true);
    setTestResults({ supported: true, total: ex.length, passed: 0, cases: [] });
    
    try {
      // Server-side execution for all languages
      const cases = [];
      const controller = new AbortController();
      abortRef.current = controller;
      
      for (let i = 0; i < ex.length; i++) {
        console.log(`Running test case ${i + 1}/${ex.length}`);
        const e = ex[i];
        let input = e.input || '';
        
        console.log(`Test ${i + 1} input:`, input);
        console.log(`Test ${i + 1} expected output:`, e.output);
        
        // Convert input if needed - handle JSON objects properly
        let processedInput = input;
        try { 
          if (input.startsWith('{') || input.startsWith('[')) {
            // For JSON input, pass it as a string to the backend
            processedInput = input;
          }
        } catch {
          // Keep as string
        }
        
        console.log(`Test ${i + 1} processed input:`, processedInput);
        
        const { output, error } = await judgeRun({ 
          language, 
          code, 
          input: String(processedInput), 
          timeoutMs: 20000, 
          signal: controller.signal 
        });
        
        console.log(`Test ${i + 1} execution result:`, { output, error });
        
        const expectedRaw = e.output || '';
        let pass = false;
        
        if (!error && output) {
          // Compare outputs - handle JSON arrays and objects
          const actualOutput = String(output).trim();
          const expectedOutput = String(expectedRaw).trim();
          
          // Try JSON comparison first for structured data
          try {
            if ((expectedOutput.startsWith('[') || expectedOutput.startsWith('{')) &&
                (actualOutput.startsWith('[') || actualOutput.startsWith('{'))) {
              const expectedJson = JSON.parse(expectedOutput);
              const actualJson = JSON.parse(actualOutput);
              pass = JSON.stringify(expectedJson) === JSON.stringify(actualJson);
            } else {
              pass = actualOutput === expectedOutput;
            }
          } catch {
            // Fallback to string comparison
            pass = actualOutput === expectedOutput;
          }
        }
        
        cases.push({ 
          idx: i + 1, 
          pass: pass && !error, 
          got: error ? `Error: ${error}` : output, 
          expected: expectedRaw, 
          error: error || null 
        });
        
        if (error === 'Request was canceled') {
          break;
        }
      }
      
      const passed = cases.filter(c => c.pass && !c.error).length;
      setTestResults({ supported: true, total: cases.length, passed, cases });
      
    } catch (e) {
      setTestResults({ 
        supported: true, 
        total: ex.length, 
        passed: 0, 
        cases: [{ 
          idx: 1, 
          pass: false, 
          got: 'Connection Error', 
          expected: 'Server Response', 
          error: `Cannot connect to server: ${String(e)}` 
        }] 
      });
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  };

  useEffect(() => {
    // Timer countdown (only if enabled)
    if (!timerEnabled) return;
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleSubmit();
    }
  }, [timeLeft, timerEnabled]);

  // Persist timer each tick
  useEffect(() => {
    sessionStorage.setItem('coding_timeLeft', String(timeLeft));
  }, [timeLeft]);

  // Load problems effect - runs once on mount or when navState/props change
  useEffect(() => {
    // Check if this is a resumed session
    if (navState.resumeSession && navState.sessionData) {
      console.log('🔄 Resuming Coding session:', navState);
      
      // Restore session data
      const sessionData = navState.sessionData || {};
      const answersData = navState.answersData || {};
      
      // Restore problems from session
      if (sessionData.problems && Array.isArray(sessionData.problems)) {
        setProblems(sessionData.problems);
      }
      
      // Restore current problem position
      if (typeof navState.currentQuestion === 'number') {
        setCurrentProblem(navState.currentQuestion);
      }
      
      // Restore solutions
      if (answersData && typeof answersData === 'object') {
        setSolutions(answersData);
      }
      
      // Restore timer
      if (typeof navState.timeRemaining === 'number') {
        setTimeLeft(navState.timeRemaining);
        setTimerEnabled(true);
      }
      
      setLoading(false);
      return; // Skip normal problem loading
    }
    
    // Initialize timer settings from navigation
    if (typeof navState.timerEnabled === 'boolean') setTimerEnabled(navState.timerEnabled);
    
    // If problems are provided via props (for mixed component), use them
    if (_propProblems && _propProblems.length > 0) {
      setProblems(_propProblems);
      setLoading(false);
      initializeSolutions(_propProblems);
    }
    // If problems are provided via navigation state, use them; otherwise load from AI API
    else if (Array.isArray(navState.problems) && navState.problems.length > 0) {
      const provided = navState.problems;
      setProblems(provided);
      initializeSolutions(provided);
    } else {
      // Load coding problems from AI API
      loadProblems();
    }
  }, [_propProblems, _propTimeLimit, navState, initializeSolutions, loadProblems]);

  const handleCodeChange = (problemId, code) => {
    const updated = {
      ...solutions,
      [problemId]: code,
    };
    setSolutions(updated);
    const storageKey = `coding_solutions_${language}`;
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    // Try to load saved solutions for the chosen language, else starter code
    const storageKey = `coding_solutions_${newLanguage}`;
    const saved = localStorage.getItem(storageKey);
    
    const updatedSolutions = saved ? JSON.parse(saved) : {};
    
    problems.forEach((problem) => {
      const cur = updatedSolutions[problem.id];
      if (!cur || String(cur).trim().length === 0) {
        // Priority: 1. Backend starter code, 2. Default template
        updatedSolutions[problem.id] = problem?.starterCode?.[newLanguage] || getStarterCode(newLanguage);
      }
    });
    
    setSolutions(updatedSolutions);
    localStorage.setItem(storageKey, JSON.stringify(updatedSolutions));
  };

  const handlePrevious = () => {
    if (currentProblem > 0) {
      setCurrentProblem(currentProblem - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Simple local scoring: count non-empty answers
      const answered = Object.values(solutions).filter(
        (s) => typeof s === 'string' && s.trim().length > 0
      ).length;
      const newScore = answered;

      // Persist session to backend history
      try {
        const token = localStorage.getItem('token');
        const technologies = problems.map((p) => p.technology || 'General');
        const difficulty = problems[0]?.difficulty || 'Medium';
        const totalQuestions = problems.length;
        const minutesSpent = Math.max(0, Math.round((3600 - timeLeft) / 60));
        const questionsPayload = problems.map((p) => ({
          question: p.title,
          userAnswer: solutions[p.id] || '',
          correctAnswer: null,
          isCorrect: null,
          technology: p.technology || 'General',
        }));

        await axios.post(
          '/api/candidate/practice/save-session',
          {
            type: 'coding',
            technologies,
            difficulty,
            score: newScore,
            totalQuestions,
            timeSpent: minutesSpent,
            questions: questionsPayload,
            feedback: '',
          },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
      } catch (err) {
        console.error('Failed to save coding session:', err);
      }

      // In mixed mode, return result to parent instead of navigating away.
      if (mixedMode && typeof onExamComplete === 'function') {
        const activeProblem = problems[currentProblem] || problems[0] || null;
        const activeSolution = activeProblem ? (solutions[activeProblem.id] || '') : '';
        const passedTests = Number(testResults?.passedTests || testResults?.passed || 0);
        const totalTests = Number(testResults?.totalTests || testResults?.total || 0);
        const computedScore = totalTests > 0
          ? Math.round((passedTests * 100) / totalTests)
          : 0;

        onExamComplete({
          problemId: activeProblem?.id,
          solution: activeSolution,
          language,
          score: computedScore,
          passedTests,
          totalTests,
          timeSpent: timerEnabled ? Math.max(0, (Number(_propTimeLimit || 0) * 60) - timeLeft) : 0,
        });
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Failed to submit test:', error);
    }
    setLoading(false);
    navigate('/candidate/partices');
  };

  // Simple markdown parser for problem descriptions
  const parseMarkdown = (text) => {
    if (!text) return [];
    
    const lines = text.split('\n');
    const elements = [];
    let currentCodeBlock = null;
    let currentList = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (currentCodeBlock !== null) {
          // End code block
          elements.push({
            type: 'code',
            content: currentCodeBlock,
            key: `code-${i}`
          });
          currentCodeBlock = null;
        } else {
          // Start code block
          currentCodeBlock = '';
        }
        continue;
      }
      
      if (currentCodeBlock !== null) {
        currentCodeBlock += line + '\n';
        continue;
      }
      
      // Handle headers
      if (line.startsWith('# ')) {
        elements.push({
          type: 'h1',
          content: line.substring(2),
          key: `h1-${i}`
        });
      } else if (line.startsWith('## ')) {
        elements.push({
          type: 'h2',
          content: line.substring(3),
          key: `h2-${i}`
        });
      } else if (line.startsWith('### ')) {
        elements.push({
          type: 'h3',
          content: line.substring(4),
          key: `h3-${i}`
        });
      }
      // Handle bold text with **
      else if (line.includes('**')) {
        const parts = line.split('**');
        const content = parts.map((part, index) => {
          if (index % 2 === 1) {
            return <strong key={`bold-${i}-${index}`}>{part}</strong>;
          }
          return part;
        });
        elements.push({
          type: 'p',
          content: content,
          key: `p-${i}`
        });
      }
      // Handle list items
      else if (line.trim().startsWith('- ')) {
        const listItem = line.trim().substring(2);
        if (!currentList) {
          currentList = [];
        }
        currentList.push(listItem);
      }
      // Handle empty lines
      else if (line.trim() === '') {
        if (currentList) {
          elements.push({
            type: 'ul',
            content: currentList,
            key: `ul-${i}`
          });
          currentList = null;
        }
        elements.push({
          type: 'br',
          content: '',
          key: `br-${i}`
        });
      }
      // Handle regular paragraphs
      else if (line.trim() !== '') {
        elements.push({
          type: 'p',
          content: line,
          key: `p-${i}`
        });
      }
    }
    
    // Handle any remaining list
    if (currentList) {
      elements.push({
        type: 'ul',
        content: currentList,
        key: `ul-final`
      });
    }
    
    // Handle any remaining code block
    if (currentCodeBlock !== null) {
      elements.push({
        type: 'code',
        content: currentCodeBlock,
        key: `code-final`
      });
    }
    
    return elements;
  };

  // Render parsed markdown elements
  const renderMarkdownElement = (element) => {
    switch (element.type) {
      case 'h1':
        return <h1 key={element.key} className="markdown-h1">{element.content}</h1>;
      case 'h2':
        return <h2 key={element.key} className="markdown-h2">{element.content}</h2>;
      case 'h3':
        return <h3 key={element.key} className="markdown-h3">{element.content}</h3>;
      case 'p':
        return <p key={element.key} className="markdown-p">{element.content}</p>;
      case 'code':
        return <pre key={element.key} className="markdown-code"><code>{element.content}</code></pre>;
      case 'ul':
        return (
          <ul key={element.key} className="markdown-ul">
            {element.content.map((item, index) => (
              <li key={`${element.key}-${index}`}>{item}</li>
            ))}
          </ul>
        );
      case 'br':
        return <br key={element.key} />;
      default:
        return null;
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return '#22c55e';
      case 'medium':
        return '#f59e0b';
      case 'hard':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (loading && problems.length === 0) {
    return (
      <div className="coding-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading coding problems...</p>
        </div>
      </div>
    );
  }

  // After submit, do not switch to a separate result page; keep rendering the test UI

  const currentProb = problems[currentProblem];

  // Empty state when no problems are available and not loading
  if (!loading && problems.length === 0) {
    return (
      <div className="coding-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ background: '#0b1220', border: '1px solid #1f2937', color: '#e5e7eb', padding: 20, borderRadius: 12, textAlign: 'center' }}>
          <h3 style={{ margin: 0, marginBottom: 8 }}>No coding problems available</h3>
          <div style={{ color: '#9ca3af' }}>Please try again later or adjust your settings.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`coding-container`}>
      <div
        className="coding-test"
        style={{
          padding: '20px',
        }}
      >
        {/* Main Content */}
        <div className="coding-content" style={{ padding: '0 20px 80px 20px' }}>
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', position: 'relative' }}>
            {mixedMode ? (
              <button
                type="button"
                onClick={() => typeof onExamComplete === 'function' && onExamComplete({ cancelled: true })}
                style={{
                  position: 'absolute', left: 0, display: 'flex', alignItems: 'center', gap: 8,
                  color: '#9ca3af', background: 'transparent', border: 'none', fontSize: '14px',
                  zIndex: 10, cursor: 'pointer'
                }}
              >
                <FiArrowLeft /> <span>Back to Mixed Exam</span>
              </button>
            ) : (
              <Link to="/candidate/partices" style={{ position: 'absolute', left: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', textDecoration: 'none', fontSize: '14px', zIndex: 10 }}>
                <FiArrowLeft /> <span>Back to Practice</span>
              </Link>
            )}
            <h2 style={{ flex: 1, textAlign: 'center', margin: 0, fontSize: '20px', fontWeight: '700', color: '#f8fafc', letterSpacing: '0.5px' }}>
              {currentProb?.title || 'Coding Problem'}
            </h2>
          </div>
          {problems.length > 0 ? (
            <div className="problem-layout" style={{ display: 'grid !important', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'stretch' }}>
              {/* Problem Description */}
              <div className="problem-panel">
                <div className="problem-header">
                  <h3 className="problem-title">{currentProb?.title}</h3>
                  <span
                    className="difficulty-badge"
                    style={{
                      backgroundColor: getDifficultyColor(currentProb?.difficulty),
                    }}
                  >
                    {currentProb?.difficulty}
                  </span>
                </div>

                <div className="problem-description">
                  {parseMarkdown(currentProb?.description).map(renderMarkdownElement)}
                </div>

                {/* Examples - Strictly show only first 2 */}
                {currentProb?.examples && currentProb.examples.length > 0 && (
                  <div className="problem-section">
                    <h4 style={{ marginBottom: '12px' }}>Examples:</h4>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      {currentProb.examples.slice(0, 2).map((example, index) => (
                        <div key={index} className="example-block" style={{ margin: 0 }}>
                          <div>
                            <strong>Example {index + 1}:</strong>
                          </div>
                          <div style={{ marginTop: '4px' }}>
                            <strong>Input:</strong> <code>{example.input}</code>
                          </div>
                          <div>
                            <strong>Output:</strong> <code>{example.output}</code>
                          </div>
                          {example.explanation && (
                            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                              <strong>Explanation:</strong> {example.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {currentProb.examples.length > 2 && (
                      <div style={{ marginTop: '12px', color: '#64748b', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                        Run "Run Tests" to verify all {currentProb.examples.length} test cases
                      </div>
                    )}
                  </div>
                )}

                {/* Constraints */}
                {currentProb?.constraints && currentProb.constraints.length > 0 && (
                  <div className="problem-section">
                    <h4>Constraints:</h4>
                    <ul className="constraints-list">
                      {currentProb.constraints.map((constraint, index) => (
                        <li key={index}>{constraint}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Code Editor */}
              <div className="editor-panel" style={{ display: 'block !important', visibility: 'visible !important', minHeight: '600px', border: '2px solid #3b82f6' }}>
                <div className="editor-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#1e293b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <FiCode size={18} color="#60a5fa" />
                    <span style={{ fontWeight: 600 }}>Code Editor</span>
                    <div style={{ width: '1px', height: '20px', background: '#374151', margin: '0 4px' }}></div>
                    <select
                      value={language}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="language-select"
                      style={{ padding: '4px 8px', background: '#0f172a', color: '#e5e7eb', border: '1px solid #1f2937', borderRadius: 6, fontSize: '12px' }}
                    >
                      <option value="java">Java</option>
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="c">C</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!isRunning ? (
                      <>
                        <button onClick={handleRun} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FiTerminal size={14} /> <span>Run</span>
                        </button>
                        <button onClick={handleRunTests} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#4f46e5', borderColor: '#6366f1' }}>
                          <FiCheckCircle size={14} /> <span>Run Tests</span>
                        </button>
                      </>
                    ) : (
                      <button onClick={handleCancel} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444' }}>
                        <FiAlertCircle size={14} /> <span>Cancel</span>
                      </button>
                    )}
                    <button onClick={handleSubmit} disabled={loading} className="btn-submit" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#10b981', borderColor: '#059669' }}>
                      <FiPlay size={14} /> <span>{loading ? 'Submitting…' : (mixedMode ? 'Submit Component' : 'Submit Practice')}</span>
                    </button>
                  </div>
                </div>
                <div className="editor-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#111827', padding: '12px', borderRadius: '8px' }}>
                  <div className="monaco-editor-wrapper" style={{ height: '500px', width: '100%', position: 'relative', background: '#1e1e1e', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
                    <Editor
                      height="500px"
                      language={language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : language}
                      value={solutions[currentProb?.id] || getStarterCode(language)}
                      onChange={(val) => handleCodeChange(currentProb?.id, val || '')}
                      theme="vs-dark"
                      loading={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', background: '#1e1e1e' }}>
                          <div className="loading-spinner" style={{ width: '30px', height: '30px', border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spinner 0.6s linear infinite', marginBottom: '10px' }}></div>
                          <span>Loading Editor...</span>
                        </div>
                      }
                      options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        tabSize: 2,
                        lineNumbers: 'on',
                        contextmenu: false,
                        padding: { top: 10, bottom: 10 },
                        hideCursorInOverviewRuler: true,
                        overviewRulerBorder: false,
                      }}
                    />
                  </div>
                  <style>{`
                    @keyframes spinner {
                      to { transform: rotate(360deg); }
                    }
                  `}</style>
                  <div className="editor-output" style={{ minHeight: '200px', maxHeight: '300px', overflowY: 'auto', background: '#0f172a', borderRadius: '8px', padding: '16px', border: '1px solid #1f2937' }}>
                    <div className="editor-output-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FiTerminal size={14} /> <span>Console Output</span>
                    </div>
                    <pre className="editor-output-pre">{runOutput || '—'}</pre>
                    
                    {/* Interactive Input Field */}
                    {waitingForInput && (
                      <div style={{ 
                        marginTop: '8px', 
                        padding: '8px', 
                        background: '#1e293b', 
                        borderRadius: '4px',
                        border: '1px solid #334155'
                      }}>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#94a3b8', 
                          marginBottom: '4px' 
                        }}>
                          {inputPrompt}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyPress={handleInputKeyPress}
                            placeholder="Type your input and press Enter..."
                            autoFocus
                            style={{
                              flex: 1,
                              padding: '6px 8px',
                              background: '#0f172a',
                              color: '#e5e7eb',
                              border: '1px solid #1f2937',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontFamily: 'monospace'
                            }}
                          />
                          <button
                            onClick={handleInputSubmit}
                            disabled={!userInput.trim()}
                            style={{
                              padding: '6px 12px',
                              background: userInput.trim() ? '#3b82f6' : '#374151',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: userInput.trim() ? 'pointer' : 'not-allowed'
                            }}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="editor-output-title" style={{ marginTop: 12 }}>Test Results</div>
                    {testResults ? (
                      testResults.supported === false ? (
                        <div>Only JavaScript tests are supported in browser.</div>
                      ) : testResults.total === 0 ? (
                        <div>No structured examples found to run as tests.</div>
                      ) : (
                        <div>
                          <div style={{ marginBottom: 10, fontSize: '16px', fontWeight: 'bold' }}>
                            <span>Test Results: {testResults.passed} / {testResults.total} Passed</span>
                          </div>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {testResults.cases.map((c, index) => {
                              const example = currentProb?.examples?.[index];
                              return (
                                <div key={c.idx} style={{ 
                                  background: c.pass && !c.error ? '#052e1a' : '#3f1d1f', 
                                  border: '1px solid #1f2937', 
                                  borderRadius: 8, 
                                  padding: 12 
                                }}>
                                  <div style={{ fontWeight: 600, marginBottom: 8, color: c.pass && !c.error ? '#10b981' : '#ef4444', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Example {c.idx}: {c.pass && !c.error ? '✅ PASS' : '❌ FAIL'}</span>
                                  </div>
                                  {example && (
                                    <div style={{ marginBottom: 8, fontSize: '14px', color: '#9ca3af' }}>
                                      <div><strong>Input:</strong> <code>{example.input}</code></div>
                                    </div>
                                  )}
                                  {c.error ? (
                                    <div style={{ color: '#ef4444' }}>Error: {c.error}</div>
                                  ) : (
                                    <>
                                      <div style={{ marginBottom: 4 }}>
                                        <strong>Expected:</strong> <code>{c.expected}</code>
                                      </div>
                                      <div>
                                        <strong>Got:</strong> <code>{typeof c.got === 'object' ? JSON.stringify(c.got) : String(c.got)}</code>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    ) : (
                      <div>Run your code to see test results</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-problems">
              <p>No coding problems available. Please check back later.</p>
            </div>
          )}
        </div>

        {/* Navigation (simplified for practice) */}
        {problems.length > 0 && (
          <div className="coding-navigation">
            <button
              onClick={handlePrevious}
              disabled={currentProblem === 0}
              className="btn-secondary"
            >
              ← Previous
            </button>

            <div className="nav-center">
              <span className="problem-indicator">
                Problem {currentProblem + 1} of {problems.length}
              </span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-submit"
            >
              {loading ? 'Submitting…' : (mixedMode ? 'Submit Component' : 'Submit Practice')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
