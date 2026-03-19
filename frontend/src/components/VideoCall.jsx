import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaUsers, FaExpand, FaCompress, FaComment, FaTimes, FaDesktop, FaClipboardList } from 'react-icons/fa';
import Chat from './Chat';
import ParticipantList from './ParticipantList';
import { API_BASE_URL } from '../config';
import './VideoCall.css';

// Build WS URL from the configured API base URL.
const WS_URL = (() => {
  // Convert http:// to ws:// and https:// to wss://
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = new URL(API_BASE_URL).host;
  return `${wsProtocol}//${host}/ws/signaling`;
})();
const API_URL = `${API_BASE_URL}/rooms`;

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add free TURN servers for better NAT traversal
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Add public TURN servers (these are free but may have limitations)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

function VideoCall() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId'); // Extract jobId from URL parameters
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState('');
  const [isRoomInactive, setIsRoomInactive] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [inputName, setInputName] = useState('');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [userRole, setUserRole] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState({
    communication: 5,
    confidence: 5,
    technical: 5,
    softSkills: 5,
    problemSolving: 5,
    analytics: 5,
    overallComments: '',
    candidateName: '',
    interviewDate: new Date().toISOString().split('T')[0]
  });
  
  // Get user role from authentication
  useEffect(() => {
    const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || 'participant';
    console.log('🎯 Setting userRole:', role);
    setUserRole(role);
  }, []);

  // Load chat history
  const loadChatHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/history/${roomCode}`);
      if (response.ok) {
        const history = await response.json();
        setMessages(history.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };
  
  const localVideoRef = useRef(null);
  const wsRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const streamRef = useRef(null); // Add stream ref for immediate access
  
  // Get interview parameters from URL
  const isScheduled = searchParams.get('scheduled') === 'true';
  const interviewName = searchParams.get('interviewName') || '';
  const roomPassword = searchParams.get('password') || '';
  
  // Set local video stream to video element
  useEffect(() => {
    const currentStream = streamRef.current || localStream;
    if (localVideoRef.current && currentStream) {
      console.log('📹 Setting local stream to video element:', {
        hasVideoRef: !!localVideoRef.current,
        hasStream: !!currentStream,
        streamId: currentStream.id,
        tracks: currentStream.getTracks().length
      });
      localVideoRef.current.srcObject = currentStream;
    } else {
      // Only log warning if we actually have a stream but no video ref
      if (currentStream && !localVideoRef.current) {
        console.log('⚠️ Video element not ready yet, will retry when available');
      }
    }
  }, [localStream]);

  // Also update when streamRef changes
  useEffect(() => {
    if (localVideoRef.current && streamRef.current) {
      console.log('📹 Updating local stream from streamRef');
      localVideoRef.current.srcObject = streamRef.current;
    }
  }, [streamRef.current]);

  // Additional effect to set stream when video element becomes available
  useEffect(() => {
    const currentStream = streamRef.current || localStream;
    if (localVideoRef.current && currentStream && !localVideoRef.current.srcObject) {
      console.log('📹 Video element now ready, setting stream');
      localVideoRef.current.srcObject = currentStream;
    }
  });
  
  // Automatically get user information from authentication
  const [username, setUsername] = useState('');
  
  useEffect(() => {
    const getAuthenticatedUser = () => {
      try {
        // Get user from localStorage (authentication data)
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
        
        console.log('🔍 Authentication check:', { storedUser, userRole, isScheduled, roomCode });
        console.log('🔍 Debug - storedUser.name:', storedUser.name);
        console.log('🔍 Debug - storedUser.firstName:', storedUser.firstName);
        console.log('🔍 Debug - storedUser.lastName:', storedUser.lastName);
        
        // Determine username based on user data and role
        let autoUsername = '';
        
        if (storedUser.name) {
          autoUsername = storedUser.name;
        } else if (storedUser.firstName && storedUser.lastName) {
          autoUsername = `${storedUser.firstName} ${storedUser.lastName}`;
        } else if (storedUser.firstName) {
          autoUsername = storedUser.firstName;
        } else if (storedUser.email) {
          // Extract name from email if no name available
          autoUsername = storedUser.email.split('@')[0];
        } else {
          // Default based on role
          autoUsername = userRole === 'recruiter' ? 'Recruiter' : 'Candidate';
        }
        
        // Clean username to prevent duplication (remove existing role suffixes and repeated names)
        autoUsername = autoUsername.replace(/\s*\((Recruiter|Candidate)\)$/, '').trim();
        
        // Fix repeated names (e.g., "Sai Kammila Kammila Kammila" -> "Sai Kammila")
        const words = autoUsername.split(' ');
        const uniqueWords = [];
        for (let i = 0; i < words.length; i++) {
          if (i === 0 || words[i] !== words[i-1]) {
            uniqueWords.push(words[i]);
          }
        }
        autoUsername = uniqueWords.join(' ');
        
        console.log('🔧 Cleaned username:', autoUsername);
        
        // Add role suffix for clarity and update userRole state
        if (userRole === 'recruiter') {
          autoUsername += ' (Recruiter)';
          setUserRole('recruiter');
        } else if (userRole === 'candidate') {
          autoUsername += ' (Candidate)';
          setUserRole('candidate');
        } else {
          // If no role detected, try to determine from scheduled parameter
          if (isScheduled) {
            autoUsername += ' (Recruiter)';
            setUserRole('recruiter');
          } else {
            autoUsername += ' (Candidate)';
            setUserRole('candidate');
          }
        }
        
        console.log('👤 Auto-detected username:', autoUsername);
        console.log('🎯 Auto-detected userRole:', userRole);
        
        // Set username automatically
        sessionStorage.setItem('username', autoUsername);
        setUsername(autoUsername);
        
        // No need for name modal - join automatically
        setShowNameModal(false);
        
      } catch (error) {
        console.error('Error getting authenticated user:', error);
        // Fallback to generic names based on scheduled parameter
        if (isScheduled) {
          sessionStorage.setItem('username', 'Recruiter');
          setUsername('Recruiter');
          setUserRole('recruiter');
        } else {
          sessionStorage.setItem('username', 'Candidate');
          setUsername('Candidate');
          setUserRole('candidate');
        }
        setShowNameModal(false);
      }
    };
    
    // Always get authenticated user info
    getAuthenticatedUser();
  }, [isScheduled, roomCode]);

  const handleNameSubmit = () => {
    if (inputName.trim()) {
      const newUsername = inputName.trim();
      sessionStorage.setItem('username', newUsername);
      setUsername(newUsername);
      setShowNameModal(false);
    }
  };

  useEffect(() => {
    // Auto-join when username is set and room code is available
    if (username && roomCode) {
      console.log('🚀 Auto-joining call with:', { username, roomCode, userRole });
      initializeCall();
    }

    return () => {
      cleanup();
    };
  }, [username, roomCode]);

  // Load chat history when chat is opened
  useEffect(() => {
    if (isChatOpen && roomCode) {
      loadChatHistory();
    }
  }, [isChatOpen, roomCode]);

  // Add this useEffect to handle peer connections when localStream is ready
  useEffect(() => {
    if (localStream && participants.length > 0) {
      console.log(`🔄 Local stream updated, recreating connections with ${participants.length} participants`);
      
      // Recreate peer connections for existing participants now that we have the stream
      participants.forEach(async (participant) => {
        if (username > participant) {
          // Remove existing connection if any
          const existingPc = peerConnectionsRef.current.get(participant);
          if (existingPc) {
            existingPc.close();
            peerConnectionsRef.current.delete(participant);
          }
          
          // Create new connection with stream
          await createPeerConnection(participant, true);
        }
      });
    }
  }, [localStream, participants]);

  const initializeCall = async () => {
    try {
      console.log('Requesting camera and microphone permissions...');
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      console.log('✅ Camera and microphone access granted');
      
      // Set video source immediately
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Set stream in state
      setLocalStream(stream);
      
      // Use the actual stream variable for checking, not state
      if (stream && stream.getTracks().length > 0) {
        console.log(`📹 Stream ready with ${stream.getTracks().length} tracks`);
        // Store stream in a ref for immediate access
        streamRef.current = stream;
        connectWebSocket();
      } else {
        console.warn('⚠️ Stream not properly initialized');
        setError('Stream initialization failed');
      }
      
    } catch (err) {
      console.error('❌ Error accessing media devices:', err);
      
      // Show user-friendly error message
      if (err.name === 'NotAllowedError') {
        setError('Camera/Microphone permission denied. Please allow access and refresh the page.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found. Please connect devices and refresh.');
      } else {
        setError('Failed to access camera/microphone: ' + err.message);
      }
      
      // Set default states when no media
      setIsVideoOff(true);
      setIsMuted(true);
      
      // Still connect to WebSocket even without media
      connectWebSocket();
    }
  };

  const connectWebSocket = () => {
  // Try multiple WebSocket endpoints
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = new URL(API_BASE_URL).host;
  const WS_ENDPOINTS = [
    `${wsProtocol}//${host}/api/ws/signaling`, // Try the working endpoint first
    `${wsProtocol}//${host}/ws/signaling`
  ];
  
  let currentEndpointIndex = 0;
  
  console.log('🔌 Attempting WebSocket connection...');
  console.log('📋 Room details:', { roomCode, username, hasPassword: !!roomPassword });
  console.log('🔌 Available endpoints:', WS_ENDPOINTS);
  
  let connectionTimeout;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 3;
  const RECONNECT_DELAY = 2000; // 2 seconds

  const connect = () => {
    const currentWsUrl = WS_ENDPOINTS[currentEndpointIndex];
    console.log(`🔌 Connecting to WebSocket (attempt ${reconnectAttempts + 1}) at: ${currentWsUrl}`);
    
    const ws = new WebSocket(currentWsUrl);
    wsRef.current = ws;
    
    // Clear any existing timeout
    if (connectionTimeout) clearTimeout(connectionTimeout);
    
    // Set a connection timeout
    connectionTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.warn('⚠️ WebSocket connection timeout');
        ws.close();
        attemptReconnect();
      }
    }, 10000); // 10 seconds timeout
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected successfully');
      clearTimeout(connectionTimeout);
      reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      setConnectionStatus('connected');
      
      // Send join message after a small delay to ensure WebSocket is fully ready
      setTimeout(() => {
        const joinMessage = {
          type: 'join',
          roomCode: roomCode,
          username: username,
          ...(roomPassword && { password: roomPassword })
        };
        console.log('📤 Sending join message:', joinMessage);
        ws.send(JSON.stringify(joinMessage));
      }, 100);
      
      setupWebSocketHandlers(ws);
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      console.log('🔄 WebSocket error detected, will try next endpoint on close');
      // Don't show error to user here, let onclose handle reconnection
    };
    
    ws.onclose = (event) => {
      clearTimeout(connectionTimeout);
      console.log(`🔌 WebSocket connection closed. Code:`, event.code, 'Reason:', event.reason);
      setConnectionStatus('disconnected');
      
      if (event.code !== 1000) { // 1000 is normal closure
        setConnectionStatus('reconnecting');
        attemptReconnect();
      }
    };
  };

  const attemptReconnect = () => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`♻️ Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      
      // Switch to next endpoint on each failure
      currentEndpointIndex = (currentEndpointIndex + 1) % WS_ENDPOINTS.length;
      console.log(`🔄 Switching to endpoint: ${WS_ENDPOINTS[currentEndpointIndex]}`);
      
      // Shorter delay for faster endpoint switching
      const delay = reconnectAttempts === 1 ? 500 : RECONNECT_DELAY; // Quick retry for first attempt
      connectionTimeout = setTimeout(connect, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      setError(
        <div>
          <p>Unable to connect to video server. Please try:</p>
          <ul style={{textAlign: 'left', margin: '10px 0'}}>
            <li>Check if the backend server is running on port 8080</li>
            <li>Refresh the page and try again</li>
            <li>Check browser console for detailed error messages</li>
            <li>Ensure WebSocket connections are not blocked by firewall</li>
          </ul>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
  };
  
  const showError = (message) => {
    setError(message);
    console.error('🚨 VideoCall Error:', message);
  };
  
  // Start the initial connection
  connect();
  
  // Cleanup function
  return () => {
    clearTimeout(connectionTimeout);
    if (wsRef.current) {
      wsRef.current.close();
    }
  };
};
  
  const setupWebSocketHandlers = (ws, connectionTimeout = null) => {
    // Note: onopen handler is set in the main connection function

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log('📨 Received WebSocket message:', message);

      // Handle error messages from server
      if (message.type === 'error') {
        if (message.message.includes('Room is not active')) {
          setIsRoomInactive(true);
          setError('Room is inactive. Only the creator can reactivate it.');
        } else {
          setError(message.message || 'Connection error');
        }
        return;
      }

      // Handle regular messages
      switch (message.type) {
        case 'participants':
          handleParticipants(message.users);
          break;
        case 'user-joined':
          handleUserJoined(message.username);
          break;
        case 'offer':
          handleOffer(message);
          break;
        case 'answer':
          handleAnswer(message);
          break;
        case 'ice-candidate':
          handleIceCandidate(message);
          break;
        case 'user-left':
          handleUserLeft(message.username);
          break;
        case 'chat':
          setMessages(prev => [...prev, {
            ...message,
            timestamp: new Date(message.timestamp)
          }]);
          break;
        case 'meeting-ended':
          alert('The meeting has been ended by the host. The video call window will now close.');
          // Clean up local resources
          if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
          }
          if (screenShareStream) {
            screenShareStream.getTracks().forEach(track => track.stop());
          }
          if (wsRef.current) {
            wsRef.current.close();
          }
          // Clear session storage
          sessionStorage.clear();
          // Close the video call window
          window.close();
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      
      // Try alternative URL immediately on error
      if (ws.url.includes('/ws/signaling') && !ws.url.includes('/api/')) {
        console.log('🔄 Primary WebSocket failed, trying alternative URL immediately...');
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = new URL(API_BASE_URL).host;
        const alternativeURL = `${wsProtocol}//${host}/api/ws/signaling`;
        console.log('🔌 Trying alternative WebSocket URL:', alternativeURL);
        const newWs = new WebSocket(alternativeURL);
        wsRef.current = newWs;
        setupWebSocketHandlers(newWs);
      } else {
        setError('Connection error - Unable to connect to video server');
      }
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket disconnected:', event.code, event.reason);
      if (event.code === 1008) { // Policy violation - room might be inactive
        setIsRoomInactive(true);
        setError('Room is inactive. Only the creator can reactivate it.');
      } else if (event.code === 1006) {
        console.error('🚨 WebSocket closed abnormally - server might be down');
        setError('Unable to connect to video server. Please check if the backend is running.');
      }
    };
  };

  const handleParticipants = async (users) => {
    console.log('👥 Received participants:', users, 'Current username:', username);
    const otherUsers = Array.from(users).filter(u => u !== username);
    console.log('👥 Other users:', otherUsers);
    setParticipants(otherUsers);

    // Create peer connections for all other users
    for (const user of otherUsers) {
      console.log(`🔗 Checking peer connection for ${user}`);
      if (!peerConnectionsRef.current.has(user)) {
        // Use a more reliable method to determine who creates the offer
        const shouldCreateOffer = username.localeCompare(user) > 0;
        console.log(`🔗 ${username} vs ${user}: shouldCreateOffer = ${shouldCreateOffer}`);
        await createPeerConnection(user, shouldCreateOffer);
      } else {
        console.log(`🔗 Peer connection already exists for ${user}`);
      }
    }
  };

  const handleUserJoined = async (newUser) => {
    console.log(`👤 User joined: ${newUser}, current username: ${username}`);
    if (newUser !== username) {
      setParticipants(prev => {
        const updated = [...prev, newUser];
        console.log('👥 Updated participants:', updated);
        return updated;
      });
      
      // Create peer connection if it doesn't exist
      if (!peerConnectionsRef.current.has(newUser)) {
        // Use a more reliable method to determine who creates the offer
        const shouldCreateOffer = username.localeCompare(newUser) > 0;
        console.log(`🔗 ${username} vs ${newUser}: shouldCreateOffer = ${shouldCreateOffer}`);
        await createPeerConnection(newUser, shouldCreateOffer);
      }
    }
  };

  const createPeerConnection = async (remoteUser, createOffer) => {
    if (peerConnectionsRef.current.has(remoteUser)) {
      return peerConnectionsRef.current.get(remoteUser);
    }

    console.log(`🔗 Creating peer connection with ${remoteUser}, createOffer: ${createOffer}`);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(remoteUser, pc);

    // Log connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`📡 Connection state with ${remoteUser}:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.error(`❌ Connection failed with ${remoteUser}, attempting to restart...`);
        // Optionally restart ICE connection
      }
    };

    // Log ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state with ${remoteUser}:`, pc.iceConnectionState);
    };

    // Log signaling state changes
    pc.onsignalingstatechange = () => {
      console.log(`📶 Signaling state with ${remoteUser}:`, pc.signalingState);
    };

    // Add local tracks with detailed logging
    const currentStream = streamRef.current || localStream;
    if (currentStream) {
      const tracks = currentStream.getTracks();
      console.log(`📹 Found ${tracks.length} local tracks for ${remoteUser}:`, tracks.map(t => `${t.kind} (${t.enabled ? 'enabled' : 'disabled'})`));
      
      tracks.forEach(track => {
        console.log(`➕ Adding ${track.kind} track to peer connection with ${remoteUser}`);
        pc.addTrack(track, currentStream);
      });
    } else {
      console.warn(`⚠️ No local stream available when creating connection with ${remoteUser}`);
    }

    // Handle remote stream with detailed logging
    pc.ontrack = (event) => {
      console.log(`📺 Received remote track from ${remoteUser}:`, {
        kind: event.track.kind,
        enabled: event.track.enabled,
        streams: event.streams.length,
        streamId: event.streams[0]?.id,
        trackId: event.track.id
      });
      
      if (event.streams[0]) {
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(remoteUser, event.streams[0]);
          console.log(`📊 Updated remote streams, now tracking ${newMap.size} users:`, Array.from(newMap.keys()));
          return newMap;
        });
      } else {
        console.warn(`⚠️ No stream received in ontrack event from ${remoteUser}`);
      }
    };

    // Handle ICE candidates with detailed logging
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🧊 Generated ICE candidate for ${remoteUser}:`, {
          candidate: event.candidate.candidate.substring(0, 50) + '...',
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port
        });
        
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
            target: remoteUser,
            sender: username,
            roomCode: roomCode
          }));
        }
      } else {
        console.log(`🧊 ICE gathering complete for ${remoteUser}`);
      }
    };

    if (createOffer) {
      try {
        console.log(`📤 Creating offer for ${remoteUser}`);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        console.log(`📤 Sending offer to ${remoteUser}:`, {
          type: offer.type,
          sdp: offer.sdp.substring(0, 100) + '...'
        });
        
        wsRef.current.send(JSON.stringify({
          type: 'offer',
          offer: offer,
          target: remoteUser,
          sender: username,
          roomCode: roomCode
        }));
      } catch (err) {
        console.error('❌ Error creating offer:', err);
      }
    }

    return pc;
  };

  const handleOffer = async (message) => {
    console.log(`📥 Received offer from ${message.sender}:`, {
      type: message.offer.type,
      sdp: message.offer.sdp.substring(0, 100) + '...'
    });
    
    const pc = await createPeerConnection(message.sender, false);
    
    try {
      console.log(`📝 Setting remote description for offer from ${message.sender}`);
      await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
      
      console.log(`📤 Creating answer for ${message.sender}`);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log(`📤 Sending answer to ${message.sender}:`, {
        type: answer.type,
        sdp: answer.sdp.substring(0, 100) + '...'
      });
      
      wsRef.current.send(JSON.stringify({
        type: 'answer',
        answer: answer,
        target: message.sender,
        sender: username,
        roomCode: roomCode
      }));
    } catch (err) {
      console.error('❌ Error handling offer:', err);
    }
  };

  const handleAnswer = async (message) => {
    console.log(`📥 Received answer from ${message.sender}:`, {
      type: message.answer.type,
      sdp: message.answer.sdp.substring(0, 100) + '...'
    });
    
    const pc = peerConnectionsRef.current.get(message.sender);
    if (pc) {
      try {
        console.log(`📝 Current signaling state with ${message.sender}:`, pc.signalingState);
        
        // Check if we're in the right state to receive an answer
        if (pc.signalingState !== 'have-local-offer') {
          console.warn(`⚠️ Cannot process answer from ${message.sender}. Current state: ${pc.signalingState}`);
          return;
        }
        
        console.log(`📝 Setting remote description for answer from ${message.sender}`);
        await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
        console.log(`✅ Answer processed for ${message.sender}`);
      } catch (err) {
        console.error('❌ Error handling answer:', err);
        // If state is wrong, recreate the connection
        if (err.message.includes('wrong state')) {
          console.log(`🔄 Recreating connection with ${message.sender} due to state conflict`);
          peerConnectionsRef.current.delete(message.sender);
          await createPeerConnection(message.sender, false);
        }
      }
    } else {
      console.warn(`⚠️ No peer connection found for ${message.sender}`);
    }
  };

  const handleIceCandidate = async (message) => {
    console.log(`🧊 Received ICE candidate from ${message.sender}:`, {
      candidate: message.candidate.candidate.substring(0, 50) + '...',
      type: message.candidate.type,
      protocol: message.candidate.protocol,
      address: message.candidate.address,
      port: message.candidate.port
    });
    
    const pc = peerConnectionsRef.current.get(message.sender);
    if (pc && message.candidate) {
      try {
        console.log(`➕ Adding ICE candidate from ${message.sender}`);
        await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        console.log(`✅ ICE candidate added from ${message.sender}`);
      } catch (err) {
        console.error(`❌ Error adding ICE candidate from ${message.sender}:`, err);
      }
    } else {
      console.warn(`⚠️ No peer connection found for ${message.sender} or no candidate provided`);
    }
  };

  const handleUserLeft = (user) => {
    setParticipants(prev => prev.filter(u => u !== user));
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(user);
      return newMap;
    });

    const pc = peerConnectionsRef.current.get(user);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(user);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        
        setScreenShareStream(screenStream);
        setIsScreenSharing(true);
        
        // Handle when user stops sharing
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenShareStream(null);
        };
        
        // Replace video track in all peer connections
        peerConnectionsRef.current.forEach((pc, participant) => {
          const sender = pc.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(screenStream.getVideoTracks()[0]);
          }
        });
        
        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
      } else {
        // Stop screen sharing and switch back to camera
        if (screenShareStream) {
          screenShareStream.getTracks().forEach(track => track.stop());
        }
        
        setIsScreenSharing(false);
        setScreenShareStream(null);
        
        // Restore camera video track in all peer connections
        if (localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          peerConnectionsRef.current.forEach((pc, participant) => {
            const sender = pc.getSenders().find(s => 
              s.track && s.track.kind === 'video'
            );
            if (sender && videoTrack) {
              sender.replaceTrack(videoTrack);
            }
          });
          
          // Restore local video
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
        }
      }
    } catch (err) {
      console.error('Error toggling screen share:', err);
      setError('Screen sharing failed or was denied');
    }
  };

  const reactivateRoom = async () => {
    try {
      const response = await fetch(`${API_URL}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomCode: roomCode,
          username: username
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsRoomInactive(false);
        setError('');
        // Reconnect WebSocket
        connectWebSocket();
      } else {
        setError(data.error || 'Failed to reactivate room');
      }
    } catch (err) {
      console.error('Error reactivating room:', err);
      setError('Failed to reactivate room');
    }
  };

  const endMeeting = async () => {
    if (!window.confirm('Are you sure you want to end this meeting? This will permanently delete the room and all chat data.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/end-meeting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomCode: roomCode,
          username: username
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Notify all participants that meeting is ending
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'meeting-ended',
            roomCode: roomCode,
            username: username
          }));
        }
        
        // Clean up local resources
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        if (screenShareStream) {
          screenShareStream.getTracks().forEach(track => track.stop());
        }
        if (wsRef.current) {
          wsRef.current.close();
        }
        
        // Clear session storage
        sessionStorage.clear();
        
        // Close the video call window
        window.close();
      } else {
        setError(data.error || 'Failed to end meeting');
      }
    } catch (err) {
      console.error('Error ending meeting:', err);
      setError('Failed to end meeting');
    }
  };

  const leaveCall = async () => {
    console.log('🚪 Leaving call - user initiated');
    // Notify server
    try {
      await fetch(`${API_URL}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomCode: roomCode,
          username: username
        }),
      });
    } catch (err) {
      console.error('Error leaving room:', err);
    }

    // Notify other participants
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'leave',
        roomCode: roomCode,
        username: username
      }));
    }

    cleanup();
    // Close the video call window and return to previous window
    window.close();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(err => {
          console.error('Error attempting to exit fullscreen:', err);
        });
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const cleanup = () => {
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  // Handle sending chat messages
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !wsRef.current) return;

    const chatMessage = {
      type: 'chat',
      roomCode: roomCode,
      username: username,
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    wsRef.current.send(JSON.stringify(chatMessage));
    
    // Add message to local state immediately
    setMessages(prev => [...prev, chatMessage]);
    setNewMessage('');
  };

  // Feedback handling functions
  const handleFeedbackChange = (category, value) => {
    setFeedback(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleSubmitFeedback = async () => {
    // Validate required fields
    if (!feedback.candidateName.trim()) {
      alert('❌ Please enter the candidate name before submitting feedback.');
      return;
    }
    
    if (!roomCode) {
      alert('❌ No room code available. Please try again.');
      return;
    }
    
    if (!username) {
      alert('❌ User not identified. Please refresh and try again.');
      return;
    }
    
    const feedbackData = {
      ...feedback,
      candidateName: feedback.candidateName.trim(),
      roomCode,
      recruiterName: username,
      jobId: jobId ? parseInt(jobId) : null, // Include jobId if available
      submittedAt: new Date().toISOString()
    };

    try {
      // First test if the endpoint exists
      const token = localStorage.getItem('token');
      const testUrl = `${API_BASE_URL}/interview-feedback/test`;
      console.log('🧪 Testing endpoint:', testUrl);
      
      try {
        const testResponse = await fetch(testUrl);
        console.log('🧪 Test response:', testResponse.status);
      } catch (testError) {
        console.warn('⚠️ Test endpoint failed:', testError.message);
      }

      // Save feedback to backend API with fallback
      const apiUrl = `${API_BASE_URL}/interview-feedback/submit`;
      console.log('🔗 Full API URL:', apiUrl);
      console.log('📤 Sending feedback data:', feedbackData);
      
      let response;
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(feedbackData)
        });
        
        if (!response.ok && response.status === 404) {
          throw new Error('Endpoint not found, trying alternative');
        }
      } catch (fetchError) {
        console.warn('⚠️ Primary endpoint failed, trying admin endpoint...');
        // Try admin endpoint as fallback
        const adminUrl = `${API_BASE_URL}/admin/interview-feedback/submit`;
        console.log('🔄 Trying admin endpoint:', adminUrl);
        response = await fetch(adminUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(feedbackData)
        });
      }
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to save feedback'}`);
      }

      const result = await response.json();
      console.log('📥 Response data:', result);

      if (result.success) {
        console.log('📝 Feedback saved:', result);
        alert(`Feedback saved successfully!\nAverage Score: ${result.averageScore.toFixed(1)}/10`);
        setShowFeedbackModal(false);
      } else {
        console.error('❌ API Error:', result);
        throw new Error(result.error || 'Failed to save feedback');
      }
      
      // Reset feedback form
      setFeedback({
        communication: 5,
        confidence: 5,
        technical: 5,
        softSkills: 5,
        problemSolving: 5,
        analytics: 5,
        overallComments: '',
        candidateName: '',
        interviewDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('❌ Error saving feedback to API:', error);
      
      // Provide detailed error information
      let errorMessage = 'Failed to save feedback. ';
      
      if (error.response) {
        // Server responded with error status
        console.error('📥 Server Error Response:', error.response.status, error.response.data);
        errorMessage += `Server Error (${error.response.status}): ${error.response.data?.error || error.response.data?.message || 'Unknown server error'}`;
      } else if (error.request) {
        // Request was made but no response received
        console.error('📡 Network Error - No Response:', error.request);
        errorMessage += 'Network Error: Cannot connect to server. Please check if the backend is running.';
      } else {
        // Something else happened
        console.error('⚠️ Request Setup Error:', error.message);
        errorMessage += `Request Error: ${error.message}`;
      }
      
      // Show detailed error to user
      alert(errorMessage);
      
      // Fallback: Save to localStorage
      try {
        const existingFeedback = JSON.parse(localStorage.getItem('interviewFeedback') || '[]');
        existingFeedback.push(feedbackData);
        localStorage.setItem('interviewFeedback', JSON.stringify(existingFeedback));
        
        console.log('💾 Feedback saved to localStorage as fallback');
        alert('✅ Feedback saved locally as backup!\n\n(Note: This will sync to server when connection is restored)');
        setShowFeedbackModal(false);
        
        // Reset form
        setFeedback({
          communication: 5,
          confidence: 5,
          technical: 5,
          softSkills: 5,
          problemSolving: 5,
          analytics: 5,
          overallComments: '',
          candidateName: '',
          interviewDate: new Date().toISOString().split('T')[0]
        });
      } catch (localError) {
        console.error('❌ Failed to save to localStorage:', localError);
        alert('❌ Complete failure: Cannot save feedback anywhere. Please try again later.');
      }
    }
  };

  // Show loading state while initializing
  if (!roomCode) {
    return (
      <div className="video-call-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading video call...</p>
        </div>
      </div>
    );
  }

  // Show loading while auto-detecting user info
  if (!username) {
    return (
      <div className="video-call-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Detecting user information...</p>
          <p>Auto-joining meeting...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's a connection issue
  if (error && error.includes('Unable to connect to video server')) {
    return (
      <div className="video-call-container">
        <div className="error-container">
          <h2>Connection Error</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={() => window.location.reload()}>Retry Connection</button>
            <button onClick={() => window.close()}>Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (

      <div className="video-call-container">
        <div className="video-header">
          <div className="header-left">
            <h2>SmartHireX</h2>
            {interviewName && <span className="interview-title"> - {interviewName}</span>}
        </div>
        <div className="header-right">
          <h2>Room: {roomCode}</h2>
          <div className="connection-status">
            <span className={`status-indicator ${connectionStatus}`}></span>
            <span className="status-text">{connectionStatus}</span>
            <button 
              className="debug-toggle"
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              title="Toggle debug panel"
            >
              🔧
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <strong>⚠️ {isRoomInactive ? 'Room Inactive' : 'Camera/Microphone Issue'}:</strong> {error}
          <div className="error-help">
            {isRoomInactive ? (
              <div>
                <p>🔄 This room is inactive because everyone left.</p>
                <p>Only the person who created this room can reactivate it.</p>
                <button 
                  className="reactivate-btn" 
                  onClick={reactivateRoom}
                  style={{
                    marginTop: '10px',
                    padding: '10px 20px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🔄 Reactivate Room
                </button>
              </div>
            ) : (
              <div>
                <p>💡 To fix this:</p>
                <ol>
                  <li>Click the 🔒 lock icon in your browser address bar</li>
                  <li>Allow Camera and Microphone access</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="debug-panel">
          <h3>🔧 Debug Information</h3>
          <div className="debug-info">
            <div><strong>Connection Status:</strong> {connectionStatus}</div>
            <div><strong>Room Code:</strong> {roomCode}</div>
            <div><strong>Username:</strong> {username}</div>
            <div><strong>Participants:</strong> {participants.length} ({participants.join(', ')})</div>
            <div><strong>Remote Streams:</strong> {remoteStreams.size}</div>
            <div><strong>Local Stream:</strong> {localStream ? 'Active' : 'None'}</div>
            <div><strong>Video:</strong> {isVideoOff ? 'Off' : 'On'}</div>
            <div><strong>Audio:</strong> {isMuted ? 'Muted' : 'On'}</div>
            <div><strong>Screen Sharing:</strong> {isScreenSharing ? 'Active' : 'Off'}</div>
            <div><strong>Chat Open:</strong> {isChatOpen ? 'Yes' : 'No'}</div>
            <div><strong>Participants Panel:</strong> {isParticipantsOpen ? 'Open' : 'Closed'}</div>
            <div><strong>User Role:</strong> {userRole || 'Not set'}</div>
            <div><strong>WebSocket:</strong> {wsRef.current?.readyState === 1 ? 'Connected' : 'Disconnected'}</div>
          </div>
          <div className="debug-actions">
            <button onClick={() => console.log('Participants:', participants)}>Log Participants</button>
            <button onClick={() => console.log('Remote Streams:', remoteStreams)}>Log Streams</button>
            <button onClick={() => console.log('Local Stream:', localStream)}>Log Local Stream</button>
            <button onClick={() => console.log('Peer Connections:', peerConnectionsRef.current)}>Log Peer Connections</button>
            <button onClick={() => {
              console.log('=== FULL DEBUG INFO ===');
              console.log('Username:', username);
              console.log('Room Code:', roomCode);
              console.log('Participants:', participants);
              console.log('Remote Streams:', remoteStreams);
              console.log('Peer Connections:', peerConnectionsRef.current);
              console.log('WebSocket State:', wsRef.current?.readyState);
              console.log('Local Stream:', localStream);
            }}>Full Debug</button>
            <button onClick={() => {
              // Simulate a user joining for testing
              const testUser = 'TestUser' + Math.floor(Math.random() * 100);
              console.log('🧪 Simulating user join:', testUser);
              handleUserJoined(testUser);
            }}>Test User Join</button>
          </div>
        </div>
      )}

      {participants.length >= 5 ? (
        // 5+ participants: 2 big videos on top, rest small in bottom
        <div className="video-grid has-5-or-more">
          {/* Top row with 2 big videos */}
          <div className="top-row">
            {/* Local Video */}
            <div className="video-wrapper local">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="video-element"
              />
              <div className="video-label">You ({username})</div>
              <div className={`video-role-badge ${userRole}`}>{userRole}</div>
              {isVideoOff && <div className="video-off-overlay">Video Off</div>}
            </div>

            {/* First remote video or placeholder */}
            {Array.from(remoteStreams.entries()).length > 0 ? (
              <RemoteVideo 
                key={Array.from(remoteStreams.entries())[0][0]} 
                username={Array.from(remoteStreams.entries())[0][0]} 
                stream={Array.from(remoteStreams.entries())[0][1]} 
              />
            ) : participants.length > 0 ? (
              <div className="video-wrapper waiting">
                <div className="video-off-overlay">
                  <div>📹</div>
                  <div>{participants[0]}</div>
                  <div style={{ fontSize: '12px', marginTop: '5px' }}>Connecting...</div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Bottom row with small videos */}
          <div className="bottom-row">
            {/* Remaining remote videos */}
            {Array.from(remoteStreams.entries()).slice(1).map(([user, stream]) => (
              <RemoteVideo key={user} username={user} stream={stream} />
            ))}
            
            {/* Remaining placeholders */}
            {participants.filter(p => !remoteStreams.has(p)).slice(1).map(user => (
              <div key={user} className="video-wrapper waiting">
                <div className="video-off-overlay">
                  <div>📹</div>
                  <div>{user}</div>
                  <div style={{ fontSize: '12px', marginTop: '5px' }}>Connecting...</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // 1-4 participants: use grid layout
        <div className={`video-grid ${participants.length === 4 ? 'has-4' : participants.length === 3 ? 'has-3' : participants.length === 2 ? 'has-2' : ''}`}>
          {/* Local Video */}
          <div className="video-wrapper local">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="video-element"
            />
            <div className="video-label">You ({username})</div>
            <div className={`video-role-badge ${userRole}`}>{userRole}</div>
            {isVideoOff && <div className="video-off-overlay">Video Off</div>}
          </div>

          {/* Remote Videos */}
          {Array.from(remoteStreams.entries()).map(([user, stream]) => (
            <RemoteVideo key={user} username={user} stream={stream} />
          ))}
          
          {/* Show placeholder for participants who haven't sent video yet */}
          {participants.filter(p => !remoteStreams.has(p)).map(user => (
            <div key={user} className="video-wrapper waiting">
              <div className="video-off-overlay">
                <div>📹</div>
                <div>{user}</div>
                <div style={{ fontSize: '12px', marginTop: '5px' }}>Connecting...</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="controls-bar">
        <button
          className={`control-btn ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <FaMicrophoneSlash size={24} /> : <FaMicrophone size={24} />}
        </button>

        <button
          className={`control-btn ${isVideoOff ? 'active' : ''}`}
          onClick={toggleVideo}
          title={isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
        >
          {isVideoOff ? <FaVideoSlash size={24} /> : <FaVideo size={24} />}
        </button>

        {userRole === 'candidate' && (
          <button
            className={`control-btn screen-share-btn ${isScreenSharing ? 'active' : ''}`}
            onClick={toggleScreenShare}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <FaDesktop size={20} />
          </button>
        )}

        <button
          className={`control-btn fullscreen-btn ${isFullscreen ? 'active' : ''}`}
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <FaCompress size={20} /> : <FaExpand size={20} />}
        </button>

        <button
          className={`control-btn participants-btn ${isParticipantsOpen ? 'active' : ''}`}
          onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
          title={isParticipantsOpen ? 'Close Participants' : 'Show Participants'}
        >
          <FaUsers size={20} />
          {participants.length > 0 && (
            <span className="participant-count">
              {participants.length + 1}
            </span>
          )}
        </button>

        <button
          className={`control-btn chat-btn ${isChatOpen ? 'active' : ''}`}
          onClick={() => setIsChatOpen(!isChatOpen)}
          title={isChatOpen ? 'Close Chat' : 'Open Chat'}
        >
          {isChatOpen ? <FaTimes size={20} /> : <FaComment size={20} />}
        </button>

        {/* Feedback button - Only for recruiters */}
        {userRole === 'recruiter' && (
          <button
            className="control-btn feedback-btn"
            onClick={() => {
              // Auto-populate candidate name from participants
              console.log('🎯 Available participants for feedback:', participants);
              const candidateNames = participants.filter(p => 
                p.toLowerCase().includes('candidate') || 
                !p.toLowerCase().includes('recruiter')
              );
              const candidateName = candidateNames.length > 0 ? candidateNames[0] : 
                (participants.length > 0 ? participants[0] : '');
              
              console.log('📝 Auto-populating candidate name:', candidateName);
              
              setFeedback(prev => ({
                ...prev,
                candidateName: candidateName,
                interviewDate: new Date().toISOString().split('T')[0]
              }));
              setShowFeedbackModal(true);
            }}
            title="Give Interview Feedback"
          >
            <FaClipboardList size={20} />
          </button>
        )}

        {sessionStorage.getItem('isCreator') === 'true' ? (
          <button
            className="control-btn end-meeting-btn"
            onClick={endMeeting}
            title="End Meeting"
          >
            <FaPhoneSlash size={24} />
          </button>
        ) : (
          <button
            className="control-btn leave-btn"
            onClick={leaveCall}
            title="Leave Call"
          >
            <FaPhoneSlash size={24} />
          </button>
        )}
      </div>
      
      {/* Chat Component */}
      <Chat 
        roomCode={roomCode} 
        username={username} 
        ws={wsRef.current} 
        messages={messages}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        handleSendMessage={handleSendMessage}
        isOpen={isChatOpen}
        setIsOpen={setIsChatOpen}
      />
      
      {/* Participant List Component */}
      <ParticipantList 
        participants={participants}
        username={username}
        isOpen={isParticipantsOpen}
        setIsOpen={setIsParticipantsOpen}
      />

      {/* Feedback Modal - Only for recruiters */}
      {showFeedbackModal && userRole === 'recruiter' && (
        <div className="feedback-modal-overlay">
          <div className="feedback-modal">
            <div className="feedback-header">
              <h3>Interview Feedback</h3>
              <button 
                className="close-btn"
                onClick={() => setShowFeedbackModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="feedback-content">
              <div className="feedback-section">
                <label>Candidate Name:</label>
                <input
                  type="text"
                  value={feedback.candidateName}
                  onChange={(e) => handleFeedbackChange('candidateName', e.target.value)}
                  placeholder="Auto-populated from participants"
                  className="feedback-input"
                  style={{
                    backgroundColor: feedback.candidateName ? '#1a2332' : '#1e2a3a',
                    border: feedback.candidateName ? '2px solid #4CAF50' : '1px solid #3a4a5c',
                    color: '#e2e8f0'
                  }}
                />
                {feedback.candidateName && (
                  <small style={{color: '#4CAF50', fontSize: '12px'}}>
                    ✓ Auto-populated from video call participants
                  </small>
                )}
              </div>

              <div className="feedback-section">
                <label>Communication Skills (1-10):</label>
                <div className="rating-container">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={feedback.communication}
                    onChange={(e) => handleFeedbackChange('communication', parseInt(e.target.value))}
                    className="rating-slider"
                  />
                  <span className="rating-value">{feedback.communication}/10</span>
                </div>
              </div>

              <div className="feedback-section">
                <label>Confidence Level (1-10):</label>
                <div className="rating-container">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={feedback.confidence}
                    onChange={(e) => handleFeedbackChange('confidence', parseInt(e.target.value))}
                    className="rating-slider"
                  />
                  <span className="rating-value">{feedback.confidence}/10</span>
                </div>
              </div>

              <div className="feedback-section">
                <label>Technical Skills (1-10):</label>
                <div className="rating-container">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={feedback.technical}
                    onChange={(e) => handleFeedbackChange('technical', parseInt(e.target.value))}
                    className="rating-slider"
                  />
                  <span className="rating-value">{feedback.technical}/10</span>
                </div>
              </div>

              <div className="feedback-section">
                <label>Soft Skills (1-10):</label>
                <div className="rating-container">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={feedback.softSkills}
                    onChange={(e) => handleFeedbackChange('softSkills', parseInt(e.target.value))}
                    className="rating-slider"
                  />
                  <span className="rating-value">{feedback.softSkills}/10</span>
                </div>
              </div>

              <div className="feedback-section">
                <label>Problem-Solving (1-10):</label>
                <div className="rating-container">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={feedback.problemSolving}
                    onChange={(e) => handleFeedbackChange('problemSolving', parseInt(e.target.value))}
                    className="rating-slider"
                  />
                  <span className="rating-value">{feedback.problemSolving}/10</span>
                </div>
              </div>

              <div className="feedback-section">
                <label>Analytics (1-10):</label>
                <div className="rating-container">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={feedback.analytics}
                    onChange={(e) => handleFeedbackChange('analytics', parseInt(e.target.value))}
                    className="rating-slider"
                  />
                  <span className="rating-value">{feedback.analytics}/10</span>
                </div>
              </div>

              <div className="feedback-section">
                <label>Overall Comments:</label>
                <textarea
                  value={feedback.overallComments}
                  onChange={(e) => handleFeedbackChange('overallComments', e.target.value)}
                  placeholder="Enter detailed feedback about the interview..."
                  className="feedback-textarea"
                  rows="4"
                />
              </div>

              <div className="feedback-actions">
                <button 
                  className="btn-cancel"
                  onClick={() => setShowFeedbackModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-submit"
                  onClick={handleSubmitFeedback}
                >
                  Save Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RemoteVideo({ username, stream }) {
  const videoRef = useRef(null);
  // Extract role from username if it's in format "username (role)"
  const userRole = username.includes('(') ? 
    username.split('(')[1].replace(')', '').trim() : 
    'participant';

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log(`📺 Setting remote stream for ${username}:`, {
        hasVideoRef: !!videoRef.current,
        hasStream: !!stream,
        streamId: stream.id,
        tracks: stream.getTracks().length,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      videoRef.current.srcObject = stream;
    } else {
      console.log(`⚠️ Cannot set remote stream for ${username}:`, {
        hasVideoRef: !!videoRef.current,
        hasStream: !!stream
      });
    }
  }, [stream, username]);

  return (
    <div className="video-wrapper">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="video-element"
      />
      <div className="video-label">{username}</div>
      <div className={`video-role-badge ${userRole}`}>{userRole}</div>
    </div>
  );
}

export default VideoCall;
