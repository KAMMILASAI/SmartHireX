import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiClock, FiTrendingUp, FiAward, FiBook, FiCode, FiMic, FiArchive, FiX, FiCheck, FiAlertCircle, FiUpload, FiRefreshCw } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import './Partices.css';

const DIFFICULTY = ["Low", "Medium", "High"];
const DSA_TOPICS = [
  // Basic Data Structures
  'Arrays', 'Strings', 'Linked Lists', 'Stacks', 'Queues', 'Hash Tables', 'Sets', 'Maps', 'Priority Queues',
  
  // Advanced Data Structures  
  'Trees', 'Binary Trees', 'Binary Search Trees', 'AVL Trees', 'Red-Black Trees', 'B-Trees', 'B+ Trees',
  'Heaps', 'Tries', 'Segment Trees', 'Fenwick Trees (BIT)', 'Disjoint Set Union (DSU)', 'Sparse Table',
  'Square Root Decomposition', 'Suffix Array', 'Suffix Tree', 'Heavy Light Decomposition (HLD)',
  'Centroid Decomposition', 'Treap', 'Splay Tree', 'Interval Tree', 'Segment Tree Beats',
  
  // Graph Structures
  'Graphs', 'Directed Graphs', 'Undirected Graphs', 'Weighted Graphs', 'Adjacency Matrix', 'Adjacency List',
  'Bipartite Graphs', 'Planar Graphs', 'Tournament Graphs', 'DAG (Directed Acyclic Graph)',
  
  // Sorting Algorithms
  'Bubble Sort', 'Selection Sort', 'Insertion Sort', 'Merge Sort', 'Quick Sort', 'Heap Sort', 
  'Counting Sort', 'Radix Sort', 'Bucket Sort', 'Tim Sort', 'Shell Sort', 'Cycle Sort', 'Pancake Sorting',
  
  // Searching Algorithms
  'Linear Search', 'Binary Search', 'Ternary Search', 'Exponential Search', 'Interpolation Search',
  'Jump Search', 'Fibonacci Search',
  
  // Graph Algorithms
  'BFS', 'DFS', 'Dijkstra Algorithm', 'Bellman-Ford', 'Floyd-Warshall', 'Kruskal Algorithm',
  'Prim Algorithm', 'Topological Sort', 'Strongly Connected Components (SCC)', 'Articulation Points',
  'Bridges in Graph', 'Tarjan Algorithm', 'Kosaraju Algorithm', 'Eulerian Path/Circuit',
  'Hamiltonian Path/Circuit', 'Maximum Flow (Ford-Fulkerson, Dinic)', 'Bipartite Matching (Hopcroft-Karp)',
  'Min-Cost Max-Flow', 'Lowest Common Ancestor (LCA)',
  
  // Dynamic Programming
  'Dynamic Programming', 'Memoization', 'Tabulation', 'Knapsack Problem', 'LCS', 'LIS',
  'Edit Distance', 'Coin Change', 'Matrix Chain Multiplication', 'Palindrome Partitioning',
  'DP on Trees', 'Bitmask DP', 'Digit DP', 'Convex Hull Trick', 'Divide and Conquer Optimization',
  'SOS DP (Sum over Subsets)', 'Knuth Optimization',
  
  // Greedy Algorithms
  'Greedy Algorithms', 'Activity Selection', 'Fractional Knapsack', 'Job Scheduling',
  'Huffman Coding', 'Minimum Spanning Tree (MST)', 'K-centers Problem', 'Huffman Coding',
  
  // Advanced Algorithms
  'Backtracking', 'Branch and Bound', 'Divide and Conquer', 'Two Pointers', 'Sliding Window',
  'Recursion', 'Bit Manipulation', 'Mathematical Algorithms', 'Number Theory', 'Combinatorics',
  'Fast Fourier Transform (FFT)', 'Number Theoretic Transform (NTT)', 'Mo Algorithm',
  'Geometric Algorithms (Convex Hull, Line Sweep)', 'String Matching (KMP, Z-Algorithm, Rabin-Karp)',
  'Aho-Corasick Algorithm', 'Manacher Algorithm'
];

const MCQ_TOPICS = [
  // Programming Languages
  'JavaScript', 'Python', 'Java', 'C++', 'C', 'C#', 'Go', 'TypeScript', 'Rust', 'Kotlin', 'Swift', 'PHP', 'Ruby',
  'Scala', 'Dart', 'Elixir', 'Haskell', 'Lua', 'Perl', 'R', 'SQL', 'NoSQL', 'Solidity', 'Zig',
  
  // Web Technologies
  'React', 'Node.js', 'HTML', 'CSS', 'Angular', 'Vue.js', 'Next.js', 'Express.js', 'FastAPI', 'Spring Boot',
  '.NET Core', 'Laravel', 'Django', 'Flask', 'Ruby on Rails', 'Svelte', 'SolidJS', 'Remix', 'Astro',
  'REST API', 'GraphQL', 'gRPC', 'WebSockets', 'WebRTC', 'Redux', 'Zustand', 'TanStack Query',
  'Tailwind CSS', 'Material UI', 'Bootstrap', 'Chakra UI', 'Shadcn UI',
  
  // Databases & Storage
  'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Cassandra', 'DynamoDB', 'SQLite', 'MariaDB', 'Oracle',
  'Elasticsearch', 'InfluxDB', 'Neo4j', 'ClickHouse', 'Firebase', 'Supabase', 'Appwrite',
  
  // Core Computer Science Subjects
  'Operating Systems', 'DBMS', 'Computer Networks', 'OOP', 'Software Engineering', 'Discrete Mathematics',
  'Computer Architecture', 'Compiler Design', 'Theory of Computation', 'Cryptography', 'Cyber Security',
  'Machine Learning', 'AI', 'Deep Learning', 'NLP', 'Computer Vision', 'Data Science', 'Big Data',
  
  // System Design & Architecture
  'System Design', 'Microservices', 'Serverless', 'Load Balancing', 'Caching', 'Database Sharding',
  'Replication', 'Scalability', 'Distributed Systems', 'Message Queues (RabbitMQ, Kafka)', 'API Design',
  'Event-Driven Architecture', 'Cloud Computing', 'Edge Computing',
  
  // DevOps & Tools
  'Git', 'GitHub Actions', 'GitLab CI', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Jenkins', 'Terraform',
  'Ansible', 'Prometheus', 'Grafana', 'ELK Stack', 'Splunk', 'Linux', 'Shell Scripting', 'Nginx', 'Apache',
  
  // Testing
  'Unit Testing', 'Integration Testing', 'E2E Testing', 'Jest', 'Cypress', 'Playwright', 'Selenium',
  'Vitest', 'Testing Library', 'TDD (Test Driven Development)', 'BDD (Behavior Driven Development)',
  
  // Aptitude & Reasoning Topics
  'Quantitative Aptitude', 'Logical Reasoning', 'Verbal Reasoning', 'Analytical Reasoning',
  'Data Interpretation', 'Number Systems', 'Percentages', 'Profit and Loss', 'Time and Work',
  'Speed and Distance', 'Permutation and Combination', 'Probability', 'Statistics',
  'Blood Relations', 'Coding-Decoding', 'Series Completion', 'Pattern Recognition',
  'Syllogisms', 'Analogies', 'Classification', 'Direction Sense', 'Ranking and Order',
  
  // Verbal & English Topics
  'English Grammar', 'Vocabulary', 'Reading Comprehension', 'Sentence Correction',
  'Para Jumbles', 'Fill in the Blanks', 'Synonyms and Antonyms', 'Idioms and Phrases',
  'Active and Passive Voice', 'Direct and Indirect Speech', 'Tenses', 'Articles',
  
  // General Knowledge
  'Current Affairs', 'General Knowledge', 'History', 'Geography', 'Science', 'Sports',
  'Politics', 'Economics', 'Technology News', 'Business Awareness'
];

// Popular technologies for autocomplete suggestions
const POPULAR_TECHS = [
  'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'TypeScript', 'HTML', 'CSS',
  'Angular', 'Vue.js', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
  'MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'Express.js', 'Django', 'Flask', 'Spring Boot',
  'Next.js', 'Tailwind CSS', 'AWS', 'Azure', 'GCP', 'Git', 'Docker', 'Kubernetes', 
  'Machine Learning', 'AI', 'System Design', 'Data Structures', 'Algorithms'
];

// Safe date-time formatting for backend timestamps (supports 'created_at')
function formatDateTime(input) {
  try {
    if (!input) return '';
    if (input instanceof Date && !isNaN(input)) return input.toLocaleString();
    // If numeric epoch
    if (typeof input === 'number') {
      const d = new Date(input > 1e12 ? input : input * 1000);
      return isNaN(d) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    }
    let str = String(input).trim();
    // Handle comma-separated components: YYYY,MM,DD,HH,mm,ss,ns/ms
    if (/^\d{4},\d{1,2},\d{1,2}(,\d{1,2},\d{1,2}(,\d{1,2}(,\d{1,9})?)?)?$/.test(str)) {
      const parts = str.split(',').map(n => parseInt(n, 10));
      const [y, m, d, hh = 0, mm = 0, ss = 0, frac = 0] = parts;
      // If last part looks like nanoseconds (>= 1e6), convert to ms
      const ms = frac >= 1e6 ? Math.floor(frac / 1e6) : frac; // supports micro/nano
      const dt = new Date(y, (m || 1) - 1, d || 1, hh, mm, ss, ms);
      if (!isNaN(dt)) {
        return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(dt);
      }
    }
    // Replace space between date and time with 'T' if present
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
      str = str.replace(' ', 'T');
    }
    // Normalize fractional seconds to milliseconds but keep timezone suffix (Z or ±HH:MM)
    const rx = /^(.*T\d{2}:\d{2}:\d{2})(\.(\d+))?(Z|[+-]\d{2}:?\d{2})?$/;
    const m = str.match(rx);
    if (m) {
      const base = m[1];
      const fraction = m[3] ? `.${m[3].slice(0, 3)}` : '';
      let tz = m[4] || '';
      // Ensure timezone has colon if missing (e.g., +0530 -> +05:30)
      if (/^[+-]\d{4}$/.test(tz)) {
        tz = tz.slice(0, 3) + ':' + tz.slice(3);
      }
      str = base + fraction + tz;
    }
    const d = new Date(str);
    if (isNaN(d)) {
      // Fallback: try only date part
      const onlyDate = str.split('T')[0];
      const d2 = new Date(onlyDate);
      return isNaN(d2)
        ? String(input)
        : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d2);
    }
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch {
    return String(input || '');
  }
}

// Multi-value Autocomplete Input Component
function AutocompleteInput({ value, onChange, placeholder, suggestions = MCQ_TOPICS }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Get current typing word (after last comma)
  const getCurrentWord = (text) => {
    const parts = text.split(',');
    return parts[parts.length - 1].trim();
  };

  // Get text before current word
  const getTextBeforeCurrentWord = (text) => {
    const parts = text.split(',');
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join(', ') + ', ';
  };

  useEffect(() => {
    const currentWord = getCurrentWord(inputValue);
    if (currentWord.length > 0) {
      // Filter suggestions based on current word and exclude already added items
      const existingItems = inputValue.split(',').map(item => item.trim()).filter(item => item);
      const filtered = suggestions.filter(tech => 
        tech.toLowerCase().includes(currentWord.toLowerCase()) &&
        !existingItems.includes(tech)
      ).slice(0, 10);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(-1);
    } else {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }, [inputValue, suggestions]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSuggestionClick = (suggestion) => {
    const beforeText = getTextBeforeCurrentWord(inputValue);
    const newValue = beforeText + suggestion;
    setInputValue(newValue);
    onChange(newValue);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        handleSuggestionClick(filteredSuggestions[selectedIndex]);
      } else {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Tab') {
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        e.preventDefault();
        handleSuggestionClick(filteredSuggestions[selectedIndex]);
      }
    } else if (e.key === ',') {
      // Auto-complete current word if there's a suggestion
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        e.preventDefault();
        const beforeText = getTextBeforeCurrentWord(inputValue);
        const newValue = beforeText + filteredSuggestions[selectedIndex] + ', ';
        setInputValue(newValue);
        onChange(newValue);
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // Parse tags from input value
  const tags = inputValue.split(',').map(tag => tag.trim()).filter(tag => tag);
  const currentWord = getCurrentWord(inputValue);

  return (
    <div style={{ position: 'relative' }}>
      {/* Tags Display */}
      {tags.length > 0 && (
        <div style={{ 
          marginBottom: '8px', 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '6px' 
        }}>
          {tags.map((tag, index) => (
            <span
              key={index}
              style={{
                background: '#374151',
                color: '#e5e7eb',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {tag}
              <button
                onClick={() => {
                  const newTags = tags.filter((_, i) => i !== index);
                  const newValue = newTags.join(', ');
                  setInputValue(newValue);
                  onChange(newValue);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '0',
                  fontSize: '14px',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      
      <input
        className="form-input"
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => getCurrentWord(inputValue).length > 0 && setShowSuggestions(filteredSuggestions.length > 0)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={tags.length > 0 ? "Add another..." : placeholder}
        style={{
          width: '100%',
          padding: '12px',
          border: '1px solid #374151',
          borderRadius: '8px',
          background: '#111827',
          color: '#e5e7eb',
          fontSize: '14px'
        }}
      />
      
      {showSuggestions && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
        }}>
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: index < filteredSuggestions.length - 1 ? '1px solid #374151' : 'none',
                color: '#e5e7eb',
                fontSize: '14px',
                transition: 'background-color 0.2s',
                backgroundColor: selectedIndex === index ? '#374151' : 'transparent'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#374151';
                setSelectedIndex(index);
              }}
              onMouseLeave={(e) => {
                if (selectedIndex !== index) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Partices() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [historyStats, setHistoryStats] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  
  const [startTime, setStartTime] = useState(null);
  
  // MCQ States
  const [mcqDialog, setMcqDialog] = useState(false);
  const [mcqInput, setMcqInput] = useState({ tech: '', num: 5, difficulty: 'Medium' });
  const [mcqLoading, setMcqLoading] = useState(false);
  const [mcqs, setMcqs] = useState([]);
  // MCQ Timer
  const [mcqTimerEnabled, setMcqTimerEnabled] = useState(false);
  const [mcqTimerMinutes, setMcqTimerMinutes] = useState(10);
  
  // Coding States
  const [codingDialog, setCodingDialog] = useState(false);
  const [codingInput, setCodingInput] = useState({ tech: '', difficulty: 'Medium', num: 1, testCases: 10 });
  const [codingLoading, setCodingLoading] = useState(false);
  const [codingQ, setCodingQ] = useState(null);
  const [codingAns, setCodingAns] = useState('');
  const [codingScore, setCodingScore] = useState(null);
  // Coding Timer
  const [codingTimerEnabled, setCodingTimerEnabled] = useState(false);
  const [codingTimerMinutes, setCodingTimerMinutes] = useState(30);

  // Interview States
  const [interviewDialog, setInterviewDialog] = useState(false);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewInput, setInterviewInput] = useState({
    type: 'technology', // 'technology' | 'project'
    tech: '',
    projectSummary: '',
    num: 5,
    difficulty: 'Medium',
    resumeFile: null,
    resumeText: ''
  });

  // History Detail Modal States
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);
  const [selectedHistorySession, setSelectedHistorySession] = useState(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);



  // Load practice history
  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError('');
      const token = localStorage.getItem('token');
      let currentUser = null;
      try { currentUser = JSON.parse(localStorage.getItem('user') || 'null'); } catch {}
      
      console.log('🔄 Loading practice history...');
      console.log('Token:', token ? 'Present' : 'Missing');
      console.log('User:', currentUser);
      
      const res = await axios.get(`/api/candidate/practice/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ History response:', res.data);
      const data = res?.data;
      // Accept {sessions:[...]}, or array directly, or fallback key names
      const sessions = Array.isArray(data)
        ? data
        : (data?.sessions || data?.items || []);
      const stats = data?.stats || [];
      const uid = currentUser?.id || currentUser?._id || currentUser?.userId || currentUser?.user?.id;
      const filtered = (Array.isArray(sessions) ? sessions : []).filter(s => {
        // Must be an object
        if (!s || typeof s !== 'object' || Array.isArray(s)) return false;
        // If server provides ownership, enforce it
        const owner = s.candidateId ?? s.candidate_id ?? s.userId ?? s.user_id ?? s.ownerId;
        if (uid && owner != null && String(owner) !== String(uid)) return false;
        // Require at least one realistic session trait
        const hasQuestions = Array.isArray(s.questions) && s.questions.length > 0;
        const hasTechs = Array.isArray(s.technologies) && s.technologies.length > 0;
        const hasCompleted = typeof s.completed === 'boolean';
        const hasTotals = typeof s.totalQuestions === 'number' && s.totalQuestions >= 1;
        const ts = s.created_at || s.createdAt || s.startedAt || s.timestamp;
        const tsOk = !!formatDateTime(ts);
        return hasQuestions || hasTechs || hasCompleted || hasTotals || tsOk;
      });
      console.log('📊 Filtered sessions:', filtered);
      setPracticeHistory(filtered);
      setHistoryStats(Array.isArray(stats) ? stats : []);
    } catch (err) {
      console.error('❌ Failed to load history:', err);
      console.error('Error details:', err.response?.data || err.message);
      setHistoryError(`Unable to load practice history: ${err.response?.data?.error || err.message}`);
      setPracticeHistory([]);
      setHistoryStats([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory]);

  // Save practice session
  const savePracticeSession = async (sessionData) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/candidate/practice/save-session`, sessionData, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  };

  // Load session details for history modal
  const loadSessionDetails = async (sessionId) => {
    try {
      setSessionDetailLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/candidate/practice/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    } catch (err) {
      console.error('Failed to load session details:', err);
      return null;
    } finally {
      setSessionDetailLoading(false);
    }
  };

  // MCQ Handlers
  const handleGenerateMcqs = async () => {
    if (!mcqInput.tech.trim()) {
      alert('Please enter at least one technology');
      return;
    }
    
    setMcqLoading(true);
    setMcqs([]);
    setStartTime(new Date());
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/candidate/practice/ai-mcqs`, {
        topic: mcqInput.tech,
        numQuestions: mcqInput.num,
        difficulty: mcqInput.difficulty
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      console.log('MCQ Response:', res.data);
      
      if (res.data && res.data.length > 0) {
        // Backend now sends data in the correct format already
        const convertedMcqs = res.data.map(q => ({
          q: q.q,
          options: q.options,
          answer: q.answer,
          technology: q.technology || mcqInput.tech,
          explanation: q.explanation
        }));
        console.log('Converted MCQs:', convertedMcqs);
        setMcqs(convertedMcqs);
        setMcqDialog(false);
        // Keep mode as 'mcq' so the Start Test button shows
      } else {
        console.error('No questions in response:', res.data);
        alert('Failed to generate questions. Please try again.');
      }
    } catch (err) {
      console.error('MCQ Generation Error:', err);
      
      // Handle AI service unavailable error
      if (err.response && err.response.status === 503) {
        const errorData = err.response.data;
        alert(`${errorData.error}\n\n${errorData.message}\n\nSuggestions:\n• ${errorData.suggestions.join('\n• ')}`);
      } else {
        alert('Failed to generate questions. Please check your input and try again.');
      }
      setMcqs([]);
    }
    setMcqLoading(false);
  };
  

  // Coding Handlers
  const handleGenerateCoding = async () => {
    if (!codingInput.tech.trim()) {
      alert('Please enter at least one technology');
      return;
    }
    
    setCodingLoading(true);
    setCodingQ(null);
    setCodingScore(null);
    setCodingAns('');
    setStartTime(new Date());
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/candidate/practice/ai-coding`, {
        topic: codingInput.tech,
        difficulty: codingInput.difficulty,
        numProblems: codingInput.num,
        testCases: codingInput.testCases
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.data && res.data.length > 0) {
        // Backend returns array of problems, take the first one
        const problem = res.data[0];
        const convertedProblem = {
          title: problem.title,
          difficulty: problem.difficulty,
          description: problem.problemContent,
          technology: codingInput.tech
        };
        setCodingQ(convertedProblem);
        setCodingDialog(false);
        // Keep mode as 'coding' so the Start Test button shows
      } else {
        alert('Failed to generate coding question. Please try again.');
      }
    } catch (err) {
      console.error('Coding Generation Error:', err);
      
      // Handle AI service unavailable error
      if (err.response && err.response.status === 503) {
        const errorData = err.response.data;
        alert(`${errorData.error}\n\n${errorData.message}\n\nSuggestions:\n• ${errorData.suggestions.join('\n• ')}`);
      } else {
        alert('Failed to generate coding question. Please try again.');
      }
      setCodingQ(null);
    }
    setCodingLoading(false);
  };
  
  const handleSubmitCoding = async () => {
    const endTime = new Date();
    const timeSpent = startTime ? Math.round((endTime - startTime) / 60000) : 0;
    
    // Simple scoring based on code length and keywords (demo)
    const codeLength = codingAns.length;
    const hasFunction = /function|def|=>|class/.test(codingAns);
    const hasLogic = /if|for|while|map|filter|reduce/.test(codingAns);
    const score = Math.min(100, (codeLength > 50 ? 30 : 0) + (hasFunction ? 35 : 0) + (hasLogic ? 35 : 0));
    
    const sessionData = {
      type: 'coding',
      technologies: codingInput.tech.split(',').map(t => t.trim()),
      difficulty: codingInput.difficulty,
      score,
      totalQuestions: 1,
      timeSpent,
      questions: [{
        question: codingQ.title,
        options: [], // No options for coding questions
        userAnswer: codingAns,
        correctAnswer: 'Multiple solutions possible',
        isCorrect: score >= 70,
        technology: codingQ.technology
      }]
    };
    
    await savePracticeSession(sessionData);
    setCodingScore({ 
      feedback: `Code analysis: ${score >= 70 ? 'Good solution!' : 'Needs improvement'}`, 
      score,
      timeSpent 
    });
  };

  // Technology tags input (chips + suggestions)
  const TechTagsInput = ({ value, onChange, placeholder }) => {
    const [input, setInput] = useState('');
    const [tags, setTags] = useState(() => value.split(',').map(t => t.trim()).filter(Boolean));
    const allTagsLower = tags.map(t => t.toLowerCase());

    useEffect(() => {
      const arr = value.split(',').map(t => t.trim()).filter(Boolean);
      setTags(arr);
    }, [value]);

    const commitTags = (next) => {
      setTags(next);
      onChange(next.join(', '));
    };

    const addFromInput = () => {
      const token = input.trim();
      if (!token) return;
      if (allTagsLower.includes(token.toLowerCase())) { setInput(''); return; }
      const next = [...tags, token];
      setInput('');
      commitTags(next);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addFromInput();
      } else if (e.key === 'Backspace' && input.length === 0 && tags.length > 0) {
        const next = tags.slice(0, -1);
        commitTags(next);
      }
    };

    const filtered = input
      ? POPULAR_TECHS.filter(t => t.toLowerCase().includes(input.toLowerCase()) && !allTagsLower.includes(t.toLowerCase())).slice(0, 8)
      : [];

    return (
      <div className="tags-input-container">
        <div className="tags-input">
          {tags.map(t => (
            <span key={t} className="tag-chip">
              {t}
              <button className="tag-remove" onClick={() => commitTags(tags.filter(x => x !== t))} aria-label={`Remove ${t}`}>×</button>
            </span>
          ))}
          <input
            className="tags-input-field"
            placeholder={tags.length === 0 ? placeholder : 'Add more...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => input.trim() && addFromInput()}
          />
        </div>
        {filtered.length > 0 && (
          <div className="tech-suggestions">
            {filtered.map(opt => (
              <div key={opt} className="tech-suggestion" onMouseDown={() => {
                // onMouseDown so blur doesn't fire first
                if (!allTagsLower.includes(opt.toLowerCase())) {
                  const next = [...tags, opt];
                  commitTags(next);
                  setInput('');
                }
              }}>
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="practice-container">
      <div className="practice-content">
        <div className="practice-header">
          <h1 className="practice-title">Practice Area</h1>
          <button 
            className={`history-toggle-btn ${showHistory ? 'close' : ''}`}
            onClick={() => setShowHistory(!showHistory)}
          >
            <FiArchive size={18} />
            {showHistory ? 'Close History' : 'View History'}
          </button>
        </div>

        {/* History Section */}
        {showHistory && (
          <div className="history-section">
            <h3 className="history-title">
              <FiTrendingUp size={20} />
              Practice History & Analytics
            </h3>
          
            {/* Stats Cards (shown only if backend provides stats) */}
            {Array.isArray(historyStats) && historyStats.length > 0 && (
              <div className="stats-grid">
                {historyStats.map(stat => (
                  <div key={stat._id} className="stat-card">
                    <div className="stat-label">
                      {stat._id.toUpperCase()}
                    </div>
                    <div className="stat-value">
                      {Math.round(stat.averageScore)}%
                    </div>
                    <div className="stat-details">
                      {stat.totalSessions} sessions • Best: {Math.round(stat.bestScore)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          
          {/* Recent Sessions */}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {historyLoading ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 12px' }}></div>
                Loading history...
              </div>
            ) : historyError ? (
              <div style={{ textAlign: 'center', color: '#f87171', padding: '24px', background: '#1a2236', borderRadius: 12, border: '1px solid #2b3a55' }}>
                <div style={{ marginBottom: 10 }}>⚠️ {historyError}</div>
                <button className="btn" onClick={loadHistory}>Retry</button>
              </div>
            ) : Array.isArray(practiceHistory) && practiceHistory.length > 0 ? (
              practiceHistory.map(session => (
                <div key={session.id || session._id} style={{
                  background: '#0b1220',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                  border: '1px solid #1f2937'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#e5e7eb', marginBottom: 4 }}>
                      {String(session.type || 'session').toUpperCase()}
                      {Array.isArray(session.technologies) && session.technologies.length > 0
                        ? ` - ${session.technologies.join(', ')}`
                        : ''}
                    </div>
                    <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                      {(session.difficulty || '').toString()}
                      {(() => {
                        const ts = session.created_at || session.createdAt || session.startedAt || session.timestamp;
                        const formatted = formatDateTime(ts);
                        return formatted ? ` • ${formatted}` : '';
                      })()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: '18px', 
                        fontWeight: '700', 
                        color: (session.percentage || 0) >= 80 ? '#10b981' : (session.percentage || 0) >= 60 ? '#3b82f6' : '#ef4444'
                      }}>
                        {(session.percentage ?? Math.round(((session.score || 0) * 100) / Math.max(1, (session.totalQuestions || 0))))}%
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {(session.score ?? 0)}/{(session.totalQuestions ?? 0)}
                      </div>
                    </div>
                    {(session.id || session._id) && (
                      <button
                        className="btn"
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          background: '#374151',
                          border: '1px solid #4b5563',
                          borderRadius: '6px',
                          color: '#e5e7eb',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const sessionDetails = await loadSessionDetails(session.id || session._id);
                          if (sessionDetails) {
                            setSelectedHistorySession(sessionDetails);
                            setShowHistoryDetail(true);
                          } else {
                            // Fallback to basic session data if detailed fetch fails
                            setSelectedHistorySession(session);
                            setShowHistoryDetail(true);
                          }
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = '#4b5563';
                          e.target.style.borderColor = '#6b7280';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = '#374151';
                          e.target.style.borderColor = '#4b5563';
                        }}
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
                <FiBook size={48} style={{ margin: '0 auto 16px', opacity: 0.7 }} />
                <div>No practice history yet. Start practicing to see your progress!</div>
              </div>
            )}
          </div>
        </div>
      )}

        {/* Practice Mode Buttons */}
        {!showHistory && (
          <div className="practice-cards-grid">
            <div className="practice-card mcq">
              <div className="practice-card-icon">
                <FiBook size={48} />
              </div>
              <h3 className="practice-card-title">MCQ Practice</h3>
              <p className="practice-card-description">
                Test your knowledge with multiple choice questions across various technologies
              </p>
              <div className="practice-card-actions">
                {mcqs.length > 0 && mode === 'mcq' ? (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                      className="start-test-btn"
                      onClick={() => {
                        // Map MCQ format to match what MCQs.jsx expects
                        const mappedQuestions = mcqs.map((q, idx) => ({
                          id: `mcq-${idx + 1}`,
                          question: q.q,
                          options: q.options,
                          correctAnswer: q.answer,
                          technology: q.technology
                        }));
                        
                        navigate('/candidate/mcqs', {
                          state: {
                            questions: mappedQuestions,
                            timerEnabled: mcqTimerEnabled,
                            timerMinutes: mcqTimerMinutes
                          }
                        });
                      }}
                    >
                      <FiBook size={16} />
                      Start Test
                    </button>
                    <button 
                      className="start-test-btn"
                      style={{ background: '#6b7280' }}
                      onClick={() => { setMcqDialog(true); }}
                    >
                      <FiRefreshCw size={16} />
                      Generate New
                    </button>
                  </div>
                ) : (
                  <button 
                    className="start-test-btn"
                    onClick={() => { setMode('mcq'); setMcqDialog(true); }}
                  >
                    <FiBook size={16} />
                    Generate Test
                  </button>
                )}
              </div>
            </div>
            
            <div className="practice-card coding">
              <div className="practice-card-icon">
                <FiCode size={48} />
              </div>
              <h3 className="practice-card-title">Coding Challenges</h3>
              <p className="practice-card-description">
                Solve real-world programming problems and improve your coding skills
              </p>
              <div className="practice-card-actions">
                {codingQ && mode === 'coding' ? (
                  <button 
                    className="start-test-btn"
                    onClick={() => {
                      const count = Math.max(1, Math.min(5, parseInt(codingInput.num) || 1));
                      const mapped = Array.from({ length: count }).map((_, idx) => ({
                        id: Date.now() + idx,
                        title: codingQ.title || 'Coding Problem',
                        difficulty: codingQ.difficulty || codingInput.difficulty,
                        description: codingQ.description || 'Solve this coding problem.',
                        examples: Array.isArray(codingQ.examples) ? codingQ.examples : [],
                        constraints: Array.isArray(codingQ.constraints) ? codingQ.constraints : [],
                        starterCode: codingQ.starterCode || {},
                        technology: codingQ.technology || codingInput.tech || 'General'
                      }));
                      
                      navigate('/candidate/coding', {
                        state: {
                          problems: mapped,
                          timerEnabled: codingTimerEnabled,
                          timerMinutes: codingTimerMinutes
                        }
                      });
                    }}
                  >
                    <FiCode size={16} />
                    Start Test
                  </button>
                ) : (
                  <button 
                    className="start-test-btn"
                    onClick={() => { setMode('coding'); setCodingDialog(true); }}
                  >
                    <FiCode size={16} />
                    Generate Test
                  </button>
                )}
              </div>
            </div>
            
            <div className="practice-card interview">
              <div className="practice-card-icon">
                <FiMic size={48} />
              </div>
              <h3 className="practice-card-title">Mock Interview</h3>
              <p className="practice-card-description">
                Practice interview questions and scenarios to ace your next interview
              </p>
              <div className="practice-card-actions">
                <button 
                  className="start-test-btn"
                  onClick={() => { setMode('interview'); setInterviewDialog(true); }}
                >
                  <FiMic size={16} />
                  Generate Interview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MCQ Dialog */}
        {mcqDialog && (
          <div className="modal-overlay">
            <div className="modal-dialog">
              <div className="modal-header">
                <h3 className="modal-title">Generate MCQ Test</h3>
                <button className="close-button" onClick={() => setMcqDialog(false)} aria-label="Close">
                  <span style={{ fontSize: 20, fontWeight: 800 }}>x</span>
                </button>
              </div>
              
              <div className="form-group">
                <label className="form-label">Technologies</label>
                <AutocompleteInput 
                  placeholder="Type topics separated by commas (e.g., JavaScript, Python, DBMS)..."
                  value={mcqInput.tech}
                  onChange={tech => setMcqInput({ ...mcqInput, tech })}
                  suggestions={MCQ_TOPICS}
                />
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Number of Questions</label>
                  <input 
                    className="form-input"
                    type="number" 
                    min={1} 
                    max={100}
                    step={1}
                    value={mcqInput.num} 
                    onChange={e => setMcqInput({ 
                      ...mcqInput, 
                      num: Math.max(1, Math.min(100, parseInt(e.target.value) || 5)) 
                    })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Difficulty Level</label>
                  <select 
                    className="form-input"
                    value={mcqInput.difficulty} 
                    onChange={e => setMcqInput({ ...mcqInput, difficulty: e.target.value })}
                  >
                    {DIFFICULTY.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Timer</label>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                    <label className="switch" aria-label="Toggle timer">
                      <input
                        type="checkbox"
                        checked={mcqTimerEnabled}
                        onChange={(e) => setMcqTimerEnabled(e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af' }}>
                      <FiClock size={14} />
                      <span style={{ fontSize: 13 }}>{mcqTimerEnabled ? 'Timer will auto-submit' : 'No time limit'}</span>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Time Limit</label>
                  <select
                    className="form-input"
                    value={mcqTimerMinutes}
                    onChange={e => setMcqTimerMinutes(parseInt(e.target.value) || 10)}
                    disabled={!mcqTimerEnabled}
                  >
                    {[5,10,15,20,30].map(m => (
                      <option key={m} value={m}>{m} minutes</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="btn-group">
                <button 
                  className={`btn btn-full ${mcqLoading ? 'loading' : ''}`}
                  style={{ padding: '14px 24px', fontSize: 16, fontWeight: 700 }}
                  onClick={handleGenerateMcqs} 
                  disabled={mcqLoading || !mcqInput.tech.trim()}
                >
                  {mcqLoading ? (
                    <>
                      <div className="loading-spinner"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FiBook size={16} />
                      Generate MCQs
                    </>
                  )}
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Coding Dialog */}
      {codingDialog && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Generate Coding Challenge</h3>
              <button className="close-button" onClick={() => setCodingDialog(false)} aria-label="Close">
                <span style={{ fontSize: 20, fontWeight: 800 }}>x</span>
              </button>
            </div>
            
            <div className="form-group">
              <label className="form-label">Technologies</label>
              <AutocompleteInput 
                placeholder="Type DSA topics separated by commas (e.g., Arrays, Trees, Dynamic Programming)..."
                value={codingInput.tech}
                onChange={tech => setCodingInput({ ...codingInput, tech })}
                suggestions={DSA_TOPICS}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Difficulty Level</label>
              <select 
                className="form-input"
                value={codingInput.difficulty} 
                onChange={e => setCodingInput({ ...codingInput, difficulty: e.target.value })}
              >
                {DIFFICULTY.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Number of Questions</label>
              <select
                className="form-input"
                value={codingInput.num}
                onChange={e => setCodingInput({ ...codingInput, num: Math.max(1, Math.min(5, parseInt(e.target.value) || 1)) })}
              >
                {[1,2,3,4,5].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Number of Test Cases</label>
              <select
                className="form-input"
                value={codingInput.testCases}
                onChange={e => setCodingInput({ ...codingInput, testCases: Math.max(5, Math.min(20, parseInt(e.target.value) || 10)) })}
              >
                {[5,8,10,12,15,20].map(n => (
                  <option key={n} value={n}>{n} test cases</option>
                ))}
              </select>
              <small style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
                More test cases = better problem validation
              </small>
            </div>
            
            {/* Timer Controls (match MCQ dialog) */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Timer</label>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                  <label className="switch" aria-label="Toggle timer">
                    <input
                      type="checkbox"
                      checked={codingTimerEnabled}
                      onChange={(e) => setCodingTimerEnabled(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af' }}>
                    <FiClock size={14} />
                    <span style={{ fontSize: 13 }}>{codingTimerEnabled ? 'Timer will auto-submit' : 'No time limit'}</span>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Time Limit</label>
                <select
                  className="form-input"
                  value={codingTimerMinutes}
                  onChange={e => setCodingTimerMinutes(parseInt(e.target.value) || 30)}
                  disabled={!codingTimerEnabled}
                >
                  {[5,10,15,20,30,45,60].map(m => (
                    <option key={m} value={m}>{m} minutes</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="btn-group">
              <button 
                className={`btn btn-full ${codingLoading ? 'loading' : ''}`}
                style={{ padding: '14px 28px', fontSize: 16, fontWeight: 700 }}
                onClick={handleGenerateCoding}
                disabled={codingLoading || !codingInput.tech.trim()}
              >
                {codingLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FiCode size={16} />
                    Generate Challenge
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Dialog */}
      {interviewDialog && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Setup Mock Interview</h3>
              <button className="close-button" onClick={() => setInterviewDialog(false)} aria-label="Close">
                <span style={{ fontSize: 20, fontWeight: 800 }}>x</span>
              </button>
            </div>

            {/* Type Selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                className={`btn ${interviewInput.type === 'technology' ? 'btn-primary' : ''}`}
                onClick={() => setInterviewInput({ ...interviewInput, type: 'technology' })}
              >Technology-based</button>
              <button
                className={`btn ${interviewInput.type === 'project' ? 'btn-primary' : ''}`}
                onClick={() => setInterviewInput({ ...interviewInput, type: 'project' })}
              >Project/Resume-based</button>
            </div>

            {interviewInput.type === 'technology' ? (
              <div className="form-group">
                <label className="form-label">Technologies</label>
                <TechTagsInput
                  placeholder="Add a technology and press Enter"
                  value={interviewInput.tech}
                  onChange={tech => setInterviewInput({ ...interviewInput, tech })}
                />
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Project Summary / Focus Areas</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Describe your project, role, and key tech stacks..."
                    value={interviewInput.projectSummary}
                    onChange={e => setInterviewInput({ ...interviewInput, projectSummary: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Upload Resume (optional)</label>
                  <label className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <FiUpload />
                    Choose File
                    <input
                      type="file"
                      accept=".txt"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const text = await file.text().catch(() => '');
                        setInterviewInput({ ...interviewInput, resumeFile: file, resumeText: text });
                      }}
                    />
                  </label>
                  {interviewInput.resumeFile && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#9ca3af' }}>Selected: {interviewInput.resumeFile.name}</div>
                  )}
                </div>
              </>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Number of Questions</label>
                <input
                  className="form-input"
                  type="number"
                  min={3}
                  max={20}
                  value={interviewInput.num}
                  onChange={e => setInterviewInput({ ...interviewInput, num: Math.max(3, Math.min(20, parseInt(e.target.value) || 5)) })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <select
                  className="form-input"
                  value={interviewInput.difficulty}
                  onChange={e => setInterviewInput({ ...interviewInput, difficulty: e.target.value })}
                >
                  {DIFFICULTY.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="btn-group">
              <button
                className={`btn btn-full ${interviewLoading ? 'loading' : ''}`}
                style={{ padding: '14px 24px', fontSize: 16, fontWeight: 700 }}
                onClick={() => {
                  if (interviewInput.type === 'technology' && !interviewInput.tech.trim()) {
                    alert('Please enter at least one technology');
                    return;
                  }
                  setInterviewDialog(false);
                  navigate('/candidate/interview', {
                    state: {
                      interview: {
                        type: interviewInput.type,
                        tech: interviewInput.tech,
                        projectSummary: interviewInput.projectSummary,
                        num: interviewInput.num,
                        difficulty: interviewInput.difficulty,
                        resumeText: interviewInput.resumeText || ''
                      }
                    }
                  });
                }}
                disabled={interviewLoading}
              >
                <>
                  <FiMic size={16} />
                  Start Voice Interview
                </>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Detail Modal */}
      {showHistoryDetail && selectedHistorySession && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {String(selectedHistorySession.type || 'session').toUpperCase()} Practice Details
              </h3>
              <button 
                className="close-button" 
                onClick={() => {
                  setShowHistoryDetail(false);
                  setSelectedHistorySession(null);
                }}
                aria-label="Close"
              >
                <span style={{ fontSize: 20, fontWeight: 800 }}>×</span>
              </button>
            </div>
            
            <div style={{ padding: '20px' }}>
              {sessionDetailLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={spinnerStyle}></div>
                  <div style={{ marginTop: 16, color: '#6b7280' }}>Loading session details...</div>
                </div>
              ) : (
                <>
              {/* Session Summary */}
              <div style={{ 
                background: '#1a2236', 
                borderRadius: '12px', 
                padding: '16px', 
                marginBottom: '20px',
                border: '1px solid #2b3a55'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#e5e7eb' }}>
                      {Array.isArray(selectedHistorySession.technologies) && selectedHistorySession.technologies.length > 0
                        ? selectedHistorySession.technologies.join(', ')
                        : 'Practice Session'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                      {selectedHistorySession.difficulty} • {formatDateTime(
                        selectedHistorySession.created_at || 
                        selectedHistorySession.createdAt || 
                        selectedHistorySession.startedAt || 
                        selectedHistorySession.timestamp
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: '700', 
                      color: (selectedHistorySession.percentage || 0) >= 80 ? '#10b981' : 
                             (selectedHistorySession.percentage || 0) >= 60 ? '#3b82f6' : '#ef4444'
                    }}>
                      {selectedHistorySession.percentage ?? Math.round(((selectedHistorySession.score || 0) * 100) / Math.max(1, (selectedHistorySession.totalQuestions || 0)))}%
                    </div>
                    <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                      {selectedHistorySession.score ?? 0}/{selectedHistorySession.totalQuestions ?? 0} correct
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions and Answers */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#e5e7eb', marginBottom: '16px', fontSize: '18px' }}>Questions & Answers</h4>
                {Array.isArray(selectedHistorySession.questions) && selectedHistorySession.questions.length > 0 ? (
                  selectedHistorySession.questions.map((q, index) => (
                  <div key={index} style={{
                    background: '#0b1220',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px',
                    border: `2px solid ${q.isCorrect ? '#10b981' : '#ef4444'}`
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        color: '#e5e7eb',
                        marginBottom: '12px'
                      }}>
                        Question {index + 1}
                      </div>
                      <div style={{ fontSize: '15px', color: '#d1d5db', lineHeight: '1.5', marginBottom: '16px' }}>
                        {q.question}
                      </div>
                      
                      {/* Show options if available */}
                      {Array.isArray(q.options) && q.options.length > 0 ? (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Options:</div>
                          {q.options.map((option, optionIndex) => {
                            const isUserAnswer = q.userAnswer === optionIndex.toString() || q.userAnswer === option;
                            const isCorrectAnswer = q.correctAnswer === optionIndex.toString() || q.correctAnswer === option;
                            
                            let backgroundColor = '#1f2937';
                            let borderColor = '#374151';
                            let textColor = '#d1d5db';
                            
                            if (isCorrectAnswer) {
                              backgroundColor = 'rgba(16, 185, 129, 0.15)';
                              borderColor = '#10b981';
                              textColor = '#10b981';
                            } else if (isUserAnswer && !q.isCorrect) {
                              backgroundColor = 'rgba(239, 68, 68, 0.15)';
                              borderColor = '#ef4444';
                              textColor = '#ef4444';
                            }
                            
                            return (
                              <div
                                key={optionIndex}
                                style={{
                                  padding: '12px 16px',
                                  marginBottom: '8px',
                                  borderRadius: '8px',
                                  border: `2px solid ${borderColor}`,
                                  background: backgroundColor,
                                  color: textColor,
                                  fontWeight: (isCorrectAnswer || (isUserAnswer && !q.isCorrect)) ? '600' : '400',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px'
                                }}
                              >
                                <span style={{ 
                                  minWidth: '24px', 
                                  height: '24px', 
                                  borderRadius: '50%', 
                                  background: borderColor, 
                                  color: '#fff', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  fontSize: '12px', 
                                  fontWeight: '600' 
                                }}>
                                  {String.fromCharCode(65 + optionIndex)}
                                </span>
                                <span style={{ flex: 1 }}>{option}</span>
                                {isCorrectAnswer && (
                                  <FiCheck size={16} style={{ color: '#10b981' }} />
                                )}
                                {isUserAnswer && !q.isCorrect && (
                                  <FiX size={16} style={{ color: '#ef4444' }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Fallback for non-MCQ questions or missing options */
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
                          <div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Your Answer:</div>
                            <div style={{ 
                              fontSize: '14px', 
                              color: q.isCorrect ? '#10b981' : '#ef4444',
                              fontWeight: '600',
                              padding: '8px 12px',
                              background: q.isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              borderRadius: '6px',
                              display: 'inline-block'
                            }}>
                              {q.userAnswer || 'No answer'}
                            </div>
                          </div>
                          
                          {!q.isCorrect && (
                            <div>
                              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Correct Answer:</div>
                              <div style={{ 
                                fontSize: '14px', 
                                color: '#10b981',
                                fontWeight: '600',
                                padding: '8px 12px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                borderRadius: '6px',
                                display: 'inline-block'
                              }}>
                                {q.correctAnswer}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status indicator */}
                    <div style={{ 
                      marginTop: '12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: q.isCorrect ? '#10b981' : '#ef4444'
                    }}>
                      {q.isCorrect ? (
                        <>
                          <FiCheck size={16} />
                          Correct
                        </>
                      ) : (
                        <>
                          <FiX size={16} />
                          Incorrect
                        </>
                      )}
                    </div>
                  </div>
                  ))
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: '#9ca3af',
                    background: '#0b1220',
                    borderRadius: '12px',
                    border: '1px solid #374151'
                  }}>
                    <FiAlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.7 }} />
                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>No detailed questions available</div>
                    <div style={{ fontSize: '14px' }}>
                      This practice session was completed before detailed question tracking was enabled.
                    </div>
                  </div>
                )}
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

function MCQStepper({ mcqs, mcqAnswers, setMcqAnswers, onSubmit, timerEnabled, timerMinutes }) {
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(timerEnabled && timerMinutes ? timerMinutes * 60 : null);

  // Start/handle countdown
  useEffect(() => {
    if (!timerEnabled || !timerMinutes) return;
    // reset remaining when minutes change
    setRemaining(timerMinutes * 60);
    let id = setInterval(() => {
      setRemaining(prev => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(id);
          // Auto-submit on time up
          try { onSubmit(); } catch (e) { /* noop */ }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerEnabled, timerMinutes, onSubmit]);

  const formatTime = (s) => {
    if (s === null || s === undefined) return '';
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // Safety check for questions
  if (!mcqs || mcqs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
        <FiAlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.7 }} />
        <div>No questions available. Please generate questions first.</div>
      </div>
    );
  }

  const q = mcqs[current];
  if (!q) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
        <FiAlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.7 }} />
        <div>Question not found. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="mcq-container">
      {/* Header with timer and progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ color: '#9ca3af', fontSize: 14 }}>Question {current + 1} of {mcqs.length}</div>
        {timerEnabled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#111827', border: '1px solid #1f2937', padding: '6px 10px', borderRadius: 999, color: remaining !== null && remaining <= 30 ? '#f59e0b' : '#e5e7eb' }}>
            <FiClock size={14} />
            <span style={{ fontWeight: 700 }}>{formatTime(remaining ?? 0)}</span>
          </div>
        )}
      </div>
      <div className="mcq-question">
        <div className="mcq-question-text">{current + 1}. {q.q}</div>
        <div className="mcq-options">
          {q.options.map((opt, j) => (
            <label key={j} className={`mcq-option ${mcqAnswers[current] === j ? 'selected' : ''}`}>
              <input 
                type="radio" 
                name={`mcq${current}`} 
                value={j} 
                checked={mcqAnswers[current] === j} 
                onChange={() => setMcqAnswers(a => { const b = [...a]; b[current] = j; return b; })} 
              />
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#6366f1',
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
                marginRight: 8,
              }}>{String.fromCharCode(65 + j)}</span>
              <span style={{ verticalAlign: 'middle', fontWeight: 500 }}>{
                typeof opt === 'string' ? opt.replace(/^([A-Da-d][\.:\)\-]?\s*)/, '') : opt
              }</span>
            </label>
          ))}
        </div>
      </div>
      <div className="mcq-navigation">
        <button
          className="btn btn-secondary"
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
        >Previous</button>
        {current < mcqs.length - 1 ? (
          <button
            className="btn"
            onClick={() => setCurrent(c => Math.min(mcqs.length - 1, c + 1))}
          >Next</button>
        ) : (
          <button className="btn" onClick={onSubmit}>Submit</button>
        )}
      </div>
    </div>
  );
}

function ScoreBoard({ score, total }) {
  const percent = total > 0 ? (score / total) * 100 : 0;
  let color = '#ef4444', msg = 'Needs improvement!';
  if (percent >= 80) { color = '#22c55e'; msg = 'Excellent!'; }
  else if (percent >= 60) { color = '#2563eb'; msg = 'Good job!'; }
  else if (percent >= 40) { color = '#f59e42'; msg = 'Keep practicing!'; }
  return (
    <div style={{ marginTop: 32, background: '#e0e7ff', borderRadius: 12, padding: 24, textAlign: 'center' }}>
      <h3>Score Board</h3>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{score} / {total}</div>
      <div style={{ color, fontWeight: 600, marginTop: 8 }}>{msg}</div>
    </div>
  );
}

// Spinner animation
const style = document.createElement('style');
style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
document.head.appendChild(style);

// Enhanced Styles
const btnStyle = {
  background: 'linear-gradient(90deg, #6366f1 60%, #0dcaf0 100%)',
  color: '#fff',
  fontSize: 16,
  fontWeight: 600,
  border: 'none',
  borderRadius: 8,
  padding: '12px 24px',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
  transition: 'all 0.2s ease',
  ':hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
    transform: 'none'
  }
};

const practiceCardStyle = {
  padding: 24,
  borderRadius: 16,
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  ':hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
  }
};

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)'
};

const enhancedDialogStyle = {
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
  padding: 32,
  minWidth: 480,
  maxWidth: '90vw',
  maxHeight: '90vh',
  overflow: 'auto'
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 8,
  borderRadius: 8,
  color: '#6b7280',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f3f4f6',
    color: '#374151'
  }
};

const labelStyle = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 8
};

const inputStyle = {
  width: '100%',
  fontSize: 16,
  padding: '12px 16px',
  borderRadius: 8,
  border: '2px solid #e0e7ff',
  outline: 'none',
  transition: 'border-color 0.2s ease',
  fontFamily: 'inherit',
  ':focus': {
    borderColor: '#6366f1',
    boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)'
  }
};

const spinnerStyle = {
  width: 20,
  height: 20,
  border: '2px solid #e0e7ff',
  borderTop: '2px solid #6366f1',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  display: 'inline-block'
};

// Legacy styles for compatibility
const dialogStyle = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 2px 24px #23233a33',
  padding: 32,
  zIndex: 1002,
  minWidth: 320,
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
};
