import React, { useState, useRef, useEffect } from 'react';
import { FiMic, FiVideo, FiWifi, FiCheck, FiX, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';
import './SystemCheck.css';

const SystemCheck = ({ onNext, onBack }) => {
  const [cameraStatus, setCameraStatus] = useState('pending');
  const [micStatus, setMicStatus] = useState('pending');
  const [internetStatus, setInternetStatus] = useState('pending');
  const [cameraStream, setCameraStream] = useState(null);
  const [micLevel, setMicLevel] = useState(0);
  const [internetSpeed, setInternetSpeed] = useState(null);
  const [availableMics, setAvailableMics] = useState([]);
  const [selectedMic, setSelectedMic] = useState('');

  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const testCamera = async () => {
    setCameraStatus('checking');
    try {
      // Stop any existing stream
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      
      // Get new stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      setCameraStream(stream);
      
      // Set video source and play
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Ensure video plays
        const playPromise = videoRef.current.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(error => {
            console.warn('Video play failed:', error);
            // Try again with user interaction
            setTimeout(() => {
              videoRef.current.play().catch(() => {});
            }, 100);
          });
        }
      }
      
      setCameraStatus('success');
    } catch (error) {
      console.error('Camera test failed:', error);
      setCameraStatus('failed');
    }
  };

  const testMicrophone = async () => {
    setMicStatus('checking');
    try {
      const constraints = {
        audio: {
          deviceId: selectedMic ? { exact: selectedMic } : undefined
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext);
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setMicLevel(Math.round(average));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

      setMicStatus('success');

      setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop());
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      }, 5000);
    } catch (error) {
      console.error('Microphone test failed:', error);
      setMicStatus('failed');
    }
  };

  const testInternetSpeed = async () => {
    setInternetStatus('checking');
    try {
      const startTime = Date.now();
      await fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        cache: 'no-store',
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (duration < 500) {
        setInternetSpeed('fast');
        setInternetStatus('success');
      } else if (duration < 2000) {
        setInternetSpeed('moderate');
        setInternetStatus('success');
      } else {
        setInternetSpeed('slow');
        setInternetStatus('failed');
      }
    } catch (error) {
      console.error('Internet test failed:', error);
      try {
        const startTime = Date.now();
        await fetch(`${window.location.origin}/favicon.ico`, { cache: 'no-store' });
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (duration < 1000) {
          setInternetSpeed('moderate');
          setInternetStatus('success');
        } else {
          setInternetStatus('failed');
        }
      } catch {
        setInternetStatus('failed');
      }
    }
  };

  const runAllTests = async () => {
    await testCamera();
    await testMicrophone();
    await testInternetSpeed();
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  // Get available microphone devices
  const getAvailableMics = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      const micOptions = audioDevices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${device.deviceId.slice(0, 8)}...`
      }));
      
      setAvailableMics(micOptions);
      if (micOptions.length > 0 && !selectedMic) {
        setSelectedMic(micOptions[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting microphone devices:', error);
    }
  };

  // Load available devices on component mount
  useEffect(() => {
    getAvailableMics();
  }, []);

  const allTestsPassed = cameraStatus === 'success' && micStatus === 'success' && internetStatus === 'success';

  return (
    <div className="technical-verification-view">
      <div className="system-check-header">
        <h1 className="system-check-title">System Check</h1>
        <p className="system-check-subtitle">Checking your requirements</p>
      </div>

      <div className="verification-tests-container">
        <div className="test-row">
          <div className={`test-card ${micStatus} ${micStatus !== 'pending' ? 'expanded' : ''}`}>
            <div className="test-header">
              <div className="test-icon">
                <FiMic size={24} />
              </div>
              <div className="test-info">
                <h3>Microphone</h3>
                {availableMics.length > 0 && (
                  <select 
                    className="mic-select" 
                    value={selectedMic} 
                    onChange={(e) => setSelectedMic(e.target.value)}
                    disabled={micStatus === 'checking'}
                  >
                    {availableMics.map((mic) => (
                      <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="test-status">
                {micStatus === 'success' && <FiCheck className="status-icon success" />}
                {micStatus === 'failed' && <FiX className="status-icon failed" />}
                {micStatus === 'checking' && <FiRefreshCw className="status-icon checking spinning" />}
                {micStatus === 'pending' && <span className="status-pending">Pending</span>}
              </div>
            </div>
            {micStatus === 'pending' && (
              <button className="test-button-inline" onClick={testMicrophone}>
                Test Microphone
              </button>
            )}
            {micStatus !== 'pending' && (
              <div className="test-content">
                {micStatus === 'success' && micLevel > 0 && (
                  <div className="mic-level-indicator">
                    <div className="mic-level-bar" style={{ width: `${Math.min(micLevel * 2, 100)}%` }} />
                    <span className="mic-level-text">Audio level: {micLevel}</span>
                  </div>
                )}
                <button className="test-button" onClick={testMicrophone} disabled={micStatus === 'checking'}>
                  {micStatus === 'checking' ? 'Testing...' : 'Retest'}
                </button>
              </div>
            )}
          </div>

          <div className={`test-card ${internetStatus} ${internetStatus !== 'pending' ? 'expanded' : ''}`}>
            <div className="test-header">
              <div className="test-icon">
                <FiWifi size={24} />
              </div>
              <div className="test-info">
                <h3>Internet speed</h3>
                <p>Stable connection required</p>
              </div>
              <div className="test-status">
                {internetStatus === 'success' && <FiCheck className="status-icon success" />}
                {internetStatus === 'failed' && <FiX className="status-icon failed" />}
                {internetStatus === 'checking' && <FiRefreshCw className="status-icon checking spinning" />}
                {internetStatus === 'pending' && <span className="status-pending">Pending</span>}
              </div>
            </div>
            {internetStatus === 'pending' && (
              <button className="test-button-inline" onClick={testInternetSpeed}>
                Test Connection
              </button>
            )}
            {internetStatus !== 'pending' && (
              <div className="test-content">
                {internetSpeed && (
                  <div className="internet-speed-info">
                    <span className={`speed-badge ${internetSpeed}`}>
                      {internetSpeed === 'fast' && 'Excellent'}
                      {internetSpeed === 'moderate' && 'Good'}
                      {internetSpeed === 'slow' && 'Poor'}
                    </span>
                  </div>
                )}
                <button className="test-button" onClick={testInternetSpeed} disabled={internetStatus === 'checking'}>
                  {internetStatus === 'checking' ? 'Testing...' : 'Retest'}
                </button>
              </div>
            )}
          </div>

          <div className={`test-card ${cameraStatus} ${cameraStatus !== 'pending' ? 'expanded' : ''}`}>
            <div className="test-header">
              <div className="test-icon">
                <FiVideo size={24} />
              </div>
              <div className="test-info">
                <h3>Webcam</h3>
                <p>USB Camera (046d:0825)</p>
              </div>
              <div className="test-status">
                {cameraStatus === 'success' && <FiCheck className="status-icon success" />}
                {cameraStatus === 'failed' && <FiX className="status-icon failed" />}
                {cameraStatus === 'checking' && <FiRefreshCw className="status-icon checking spinning" />}
                {cameraStatus === 'pending' && <span className="status-pending">Pending</span>}
              </div>
            </div>
            {cameraStatus === 'pending' && (
              <button className="test-button-inline" onClick={testCamera}>
                Test Camera
              </button>
            )}
            {cameraStatus !== 'pending' && (
              <div className="test-content">
                {cameraStatus === 'success' && (
                  <div className="camera-preview">
                    <video ref={videoRef} autoPlay playsInline muted />
                  </div>
                )}
                <button className="test-button" onClick={testCamera} disabled={cameraStatus === 'checking'}>
                  {cameraStatus === 'checking' ? 'Testing...' : 'Retest'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="run-all-tests-container">
        <button className="run-all-tests-btn" onClick={runAllTests} disabled={cameraStatus === 'checking' || micStatus === 'checking' || internetStatus === 'checking'}>
          Run All Tests
        </button>
      </div>

      <div className="actions-footer">
        <button className="back-step-btn" onClick={onBack}>
          <FiArrowLeft /> Back
        </button>
        <button className="next-step-btn" disabled={!allTestsPassed} onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  );
};

export default SystemCheck;
