import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiCamera } from 'react-icons/fi';
import { API_BASE_URL } from '../config';

const FinalStep = ({ roundId }) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(null);
  const [roundData, setRoundData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [examStarted, setExamStarted] = useState(false);
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    const fetchRoundData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Use the new check-in specific endpoint
        const response = await axios.get(`${API_BASE_URL}/candidate/round/${roundId}/check-in`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const roundInfo = response.data;
        setRoundData(roundInfo);
        
        // Check if exam has started
        if (roundInfo.startTime) {
          let startTime;
          if (Array.isArray(roundInfo.startTime)) {
            const [year, month, day, hour, minute] = roundInfo.startTime;
            startTime = new Date(year, month - 1, day, hour || 0, minute || 0);
          } else {
            startTime = new Date(roundInfo.startTime);
          }
          
          const now = new Date();
          const hasStarted = now >= startTime;
          setExamStarted(hasStarted);
        } else {
          // If no start time, assume exam can start
          setExamStarted(true);
        }
        
        // Set countdown based on actual exam duration (convert minutes to seconds)
        const durationInSeconds = (roundInfo.duration || 60) * 60;
        setCountdown(durationInSeconds);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching round data:', error);
        // If endpoint fails, assume exam has started and use default duration
        setExamStarted(true);
        setCountdown(60 * 60);
        setLoading(false);
      }
    };

    if (roundId) {
      fetchRoundData();
    } else {
      setCountdown(60 * 60);
      setExamStarted(true);
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    // Start camera for proctoring
    let mounted = true;
    let localStream = null;
    
    const startCamera = async () => {
      try {
        console.log('FinalStep: Requesting camera access...');
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        
        console.log('FinalStep: Camera stream acquired', mediaStream);
        
        if (mounted) {
          localStream = mediaStream;
          setStream(mediaStream);
          setCameraError(false);
          console.log('FinalStep: Stream set to state');
        } else {
          // Component unmounted before stream was set, clean up
          console.log('FinalStep: Component unmounted, cleaning up stream');
          mediaStream.getTracks().forEach(track => track.stop());
        }
      } catch (error) {
        console.error('FinalStep: Error accessing camera:', error);
        if (mounted) {
          setCameraError(true);
        }
      }
    };

    startCamera();

    return () => {
      console.log('FinalStep: Cleanup - stopping camera');
      mounted = false;
      // Only stop tracks if we're not navigating into an exam
      // (exam pages acquire their own stream via requestCameraPermission)
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Separate effect to handle video element
  useEffect(() => {
    const attachStream = async () => {
      if (stream && videoRef.current) {
        console.log('FinalStep: Attaching stream to video element');
        try {
          const video = videoRef.current;
          
          // Set srcObject first
          video.srcObject = stream;
          
          // Ensure video is properly configured
          video.muted = true;
          video.playsInline = true;
          video.autoplay = true;
          
          console.log('FinalStep: Video element configured');
          
          // Add event listener for when metadata is loaded
          const onLoadedMetadata = () => {
            console.log('FinalStep: Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
            video.play()
              .then(() => console.log('FinalStep: Video playing successfully'))
              .catch(err => console.error('FinalStep: Play failed:', err));
          };
          
          // Add event listener for when video can play
          const onCanPlay = () => {
            console.log('FinalStep: Video can play');
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('canplay', onCanPlay);
          
          // Try to play immediately
          await video.play();
          console.log('FinalStep: Video playing successfully');
          
          // Cleanup function
          return () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('canplay', onCanPlay);
          };
        } catch (err) {
          console.error('FinalStep: Error playing video:', err);
          // Retry after a delay
          setTimeout(async () => {
            try {
              if (videoRef.current && stream) {
                console.log('FinalStep: Retrying video play');
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                console.log('FinalStep: Retry successful');
              }
            } catch (retryErr) {
              console.error('FinalStep: Retry failed:', retryErr);
            }
          }, 500);
        }
      } else {
        if (!stream) console.log('FinalStep: No stream available');
        if (!videoRef.current) console.log('FinalStep: Video ref not available');
      }
    };
    
    attachStream();
  }, [stream]);

  useEffect(() => {
    if (countdown === null || examStarted) return;

    const timer = setInterval(() => {
      setCountdown((prevCountdown) => {
        if (prevCountdown <= 1) {
          clearInterval(timer);
          setExamStarted(true);
          return 0;
        }
        return prevCountdown - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, examStarted]);

  const handleStartExam = () => {
    // Determine exam type and route accordingly
    if (roundData) {
      const roundType = roundData.type?.toLowerCase() || '';
      
      if (roundType.includes('mixed')) {
        navigate(`/candidate/mixed-exam/${roundId}`);
      } else if (roundType.includes('coding')) {
        navigate(`/candidate/coding-exam/${roundId}`);
      } else {
        navigate(`/candidate/exam/${roundId}`);
      }
    } else {
      // Default to MCQ exam if no round data
      navigate(`/candidate/exam/${roundId}`);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="check-in-step-view final-step">
        <div className="system-check-header">
          <h1 className="system-check-title">Loading exam details...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="check-in-step-view final-step">
      <div className="system-check-header">
        <h1 className="system-check-title">You are almost done with the check-in process</h1>
        {examStarted ? (
          <p className="system-check-subtitle" style={{ color: '#22c55e', fontSize: '16px', fontWeight: 600 }}>
            Your exam has started - you can begin now!
          </p>
        ) : (
          <p className="system-check-subtitle">Your exam will begin in {countdown !== null ? formatTime(countdown) : '00:00'}</p>
        )}
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        maxWidth: '1000px',
        margin: '24px auto 0',
        padding: '0 20px'
      }}>
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(71, 85, 105, 0.5)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: '#e2e8f0'
          }}>Before You Start</h3>
          
          <ul style={{
            margin: 0,
            paddingLeft: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            color: '#94a3b8',
            fontSize: '15px',
            lineHeight: 1.6
          }}>
            <li>Ensure your face is clearly visible in the camera</li>
            <li>Stay in frame throughout the entire exam</li>
            <li>Keep your workspace clear and organized</li>
            <li>Have a water bottle ready if needed</li>
            <li>Once started, the exam cannot be paused</li>
          </ul>

          <div style={{
            marginTop: 'auto',
            padding: '16px',
            background: examStarted ? 'rgba(34, 197, 94, 0.1)' : 'rgba(56, 189, 248, 0.1)',
            border: `1px solid ${examStarted ? 'rgba(34, 197, 94, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
            borderRadius: '8px',
            fontSize: '14px',
            color: examStarted ? '#22c55e' : '#7dd3fc',
            textAlign: 'center'
          }}>
            {examStarted ? 'Exam is ready - click "Start Exam" to begin' : 'Please wait until the exam starts'}
          </div>
        </div>

        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(71, 85, 105, 0.5)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8
          }}>
            <FiCamera size={20} color="#38bdf8" />
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#e2e8f0'
            }}>Proctoring Camera</h3>
          </div>

          <div style={{
            position: 'relative',
            width: '100%',
            height: '320px',
            borderRadius: '8px',
            overflow: 'hidden',
            background: '#000',
            border: '2px solid rgba(56, 189, 248, 0.5)'
          }}>
            {!cameraError ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  onLoadedMetadata={(e) => {
                    console.log('FinalStep: Video metadata loaded event');
                    e.target.play().catch(err => console.error('Play on metadata failed:', err));
                  }}
                  onCanPlay={() => console.log('FinalStep: Video can play event')}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    transform: 'scaleX(-1)', // Mirror the video for natural view
                    backgroundColor: '#000'
                  }}
                />
                {!stream && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    fontSize: '14px',
                    backgroundColor: '#000'
                  }}>
                    Initializing camera...
                  </div>
                )}
              </>
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                color: '#ef4444'
              }}>
                <FiCamera size={48} />
                <p style={{ margin: 0, fontSize: '14px' }}>Camera access denied</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Please enable camera permissions</p>
              </div>
            )}
          </div>

          <p style={{
            margin: 0,
            fontSize: '13px',
            color: '#94a3b8',
            textAlign: 'center'
          }}>
            Your exam session will be recorded for security purposes
          </p>
        </div>
      </div>

      <div className="actions-footer" style={{ marginTop: 32 }}>
        <button 
          className="get-started-btn" 
          onClick={handleStartExam}
          disabled={!examStarted}
          style={{
            opacity: examStarted ? 1 : 0.5,
            cursor: examStarted ? 'pointer' : 'not-allowed'
          }}
        >
          Start Exam
        </button>
      </div>
    </div>
  );
};

export default FinalStep;
