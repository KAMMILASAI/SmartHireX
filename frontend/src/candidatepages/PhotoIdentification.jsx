import React, { useState, useRef, useEffect } from 'react';
import { FiCamera, FiCheck, FiX, FiArrowLeft } from 'react-icons/fi';

const GOVERNMENT_ID_KEYWORDS = [
  'aadhaar',
  'aadhar',
  'government',
  'government of india',
  'govt',
  'passport',
  'voter',
  'voter id',
  'election commission',
  'election commission of india',
  'elector',
  'electors photo identity card',
  'epic',
  'driving license',
  'driving licence',
  'driver license',
  'driver licence',
  'national id',
  'pan card'
];

const COLLEGE_ID_KEYWORDS = [
  'college',
  'university',
  'universit',
  'institute',
  'engineering college',
  'student id',
  'student',
  'student identity card',
  'identity card',
  'student identity',
  'roll no',
  'roll',
  'registration no',
  'reg no',
  'reg',
  'admission',
  'campus',
  'department'
];

const includesAnyKeyword = (normalizedText, keywords) => {
  const compactText = normalizedText.replace(/[^a-z0-9]/g, '');
  return keywords.some((keyword) => {
    const normalizedKeyword = keyword.toLowerCase();
    const compactKeyword = normalizedKeyword.replace(/[^a-z0-9]/g, '');
    return normalizedText.includes(normalizedKeyword) || compactText.includes(compactKeyword);
  });
};

const hasDocumentSignals = (normalizedText) => {
  return /(id|identity|card|number|no\b|dob|birth|issue|valid|student|passport|license|licence|aadhaar|voter)/i.test(normalizedText);
};

const hasIdNumberPattern = (normalizedText) => {
  return /\b\d{4,}\b/.test(normalizedText);
};

const matchesAnyIdTypeSoftly = (normalizedText) => {
  return /(gov|government|election|elector|india|voter|aadhaar|aadhar|passport|licen|uidai|epic|college|univers|institute|engineering|student|campus|roll|reg|registration|id|identity|b\.?tech)/i.test(normalizedText);
};

const rotateImageDataUrl = (imageData, degrees) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const radians = (degrees * Math.PI) / 180;
      const isQuarterTurn = degrees % 180 !== 0;

      const canvas = document.createElement('canvas');
      canvas.width = isQuarterTurn ? img.height : img.width;
      canvas.height = isQuarterTurn ? img.width : img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(radians);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = () => reject(new Error('Failed to load image for rotation'));
    img.src = imageData;
  });
};

const PhotoIdentification = ({ onNext, onBack }) => {
  const [idImage, setIdImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(mediaStream);
      setIsCapturing(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn('Video play failed:', playError);
        }
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check camera permissions and try again.');
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      setIdImage(imageData);
      stopCamera();
      // Auto-verify after capture
      verifyDocument(imageData);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const handleRetake = () => {
    setIdImage(null);
    setIsVerified(false);
    setVerifyMessage('');
    startCamera();
  };

  const verifyDocument = async (imageData) => {
    setIsVerifying(true);
    setVerifyMessage('Verifying document...');
    
    try {
      // Load Tesseract.js for OCR if not already loaded
      if (!window.Tesseract) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/tesseract.min.js';
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load OCR library'));
          document.head.appendChild(script);
        });
      }

      const runOcr = async (imgData) => {
        const ocrPromise = window.Tesseract.recognize(imgData, 'eng', {
          logger: m => console.log(m)
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OCR timeout')), 20000)
        );
        const result = await Promise.race([ocrPromise, timeoutPromise]);
        return result?.data?.text || '';
      };

      let text = await runOcr(imageData);
      let normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();

      // Retry OCR for sideways card captures (common for ID cards).
      if (normalizedText.length < 25) {
        const rotated90 = await rotateImageDataUrl(imageData, 90);
        const rotated270 = await rotateImageDataUrl(imageData, 270);

        const text90 = await runOcr(rotated90);
        const text270 = await runOcr(rotated270);

        const candidates = [text, text90, text270].map((value) => ({
          raw: value,
          normalized: (value || '').toLowerCase().replace(/\s+/g, ' ').trim()
        }));

        const best = candidates.reduce((prev, current) =>
          current.normalized.length > prev.normalized.length ? current : prev
        );

        text = best.raw;
        normalizedText = best.normalized;
      }

      console.log('OCR Result:', text);

      const isGovernmentId = includesAnyKeyword(normalizedText, GOVERNMENT_ID_KEYWORDS)
        || /(elector|uidai|government of|govt of|driver|licence|license)/i.test(normalizedText);
      const isCollegeId = includesAnyKeyword(normalizedText, COLLEGE_ID_KEYWORDS)
        || /(student|college|university|institute|campus|semester|department)/i.test(normalizedText);

      const hasStructure = hasDocumentSignals(normalizedText) || hasIdNumberPattern(normalizedText);
      const softTypeMatch = matchesAnyIdTypeSoftly(normalizedText);
      const strongTypeDetected = isGovernmentId || isCollegeId;
      const weakOcrButPlausibleId = softTypeMatch && (hasStructure || normalizedText.length >= 10);

      if ((strongTypeDetected && (hasStructure || normalizedText.length >= 25)) || weakOcrButPlausibleId) {
        setIsVerified(true);
        if (strongTypeDetected) {
          const detectedType = isGovernmentId ? 'Government ID' : 'College ID';
          setVerifyMessage(`${detectedType} verified successfully!`);
        } else {
          setVerifyMessage('ID accepted (OCR text is weak).');
        }
      } else {
        setIsVerified(false);
        setVerifyMessage('Only College ID or Government ID cards are allowed. Please capture a clearer photo with ID text visible.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setIsVerified(false);
      setVerifyMessage('Could not verify ID type. Please capture a clear College ID or Government ID card.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleNext = () => {
    if (idImage && isVerified) {
      stopCamera();
      onNext();
    } else if (idImage && !isVerified) {
      alert('Only College ID or Government ID cards are allowed. Please retake with a valid ID card.');
    } else {
      alert('Please capture your ID document');
    }
  };

  useEffect(() => {
    if (stream && videoRef.current && isCapturing) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err);
      });
    }
  }, [stream, isCapturing]);

  useEffect(() => {
    // Start camera automatically when component mounts
    let mounted = true;
    
    const initCamera = async () => {
      if (mounted && !idImage) {
        await startCamera();
      }
    };
    
    initCamera();
    
    return () => {
      mounted = false;
      // Cleanup camera stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="check-in-step-view">
      <div className="system-check-header">
        <h1 className="system-check-title">Photo Identification</h1>
        <p className="system-check-subtitle">Capture your College ID or Government-issued ID document</p>
      </div>

      <div className="photo-id-container">
        <div className="id-instructions-top">
          <h3>College ID or Government ID Required</h3>
          <p>Please capture a clear photo of your identification card. Accepted documents include:</p>
          <ul>
            <li>College / University ID Card</li>
            <li>National ID Card / Aadhaar Card</li>
            <li>Voter ID Card</li>
            <li>Passport</li>
            <li>Driver's License</li>
          </ul>
        </div>

        <div className="id-capture-area">
          {!idImage && isCapturing && (
            <div className="camera-view">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button className="capture-btn" onClick={capturePhoto}>
                <FiCamera size={24} /> Capture
              </button>
            </div>
          )}

          {idImage && (
            <div className="id-preview">
              <img src={idImage} alt="ID Document" />
              <div className="preview-actions">
                <button className="retake-btn" onClick={handleRetake}>
                  <FiX /> Retake Photo
                </button>
                {isVerifying ? (
                  <div className="success-indicator" style={{ background: 'rgba(251, 191, 36, 0.15)', borderColor: 'rgba(251, 191, 36, 0.4)', color: '#fbbf24' }}>
                    Verifying...
                  </div>
                ) : isVerified ? (
                  <div className="success-indicator">
                    <FiCheck /> Verified
                  </div>
                ) : (
                  <div className="success-indicator" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}>
                    <FiX /> Not Verified
                  </div>
                )}
              </div>
              {verifyMessage && (
                <div style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 8,
                  background: isVerified ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${isVerified ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: isVerified ? '#22c55e' : '#ef4444',
                  fontSize: 14,
                  textAlign: 'center'
                }}>
                  {verifyMessage}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="id-instructions">
          <h4>Photo Guidelines:</h4>
          <ul>
            <li><strong>Name Visibility:</strong> Ensure your name is clearly visible and readable</li>
            <li><strong>Complete Document:</strong> All four corners of the ID must be visible</li>
            <li><strong>Lighting:</strong> Use adequate lighting and avoid glare or shadows</li>
            <li><strong>Focus:</strong> Make sure the image is not blurred</li>
            <li><strong>Authenticity:</strong> Submit only original, unedited documents</li>
          </ul>
        </div>
      </div>

      <div className="actions-footer">
        <button className="back-step-btn" onClick={() => { stopCamera(); onBack(); }}>
          <FiArrowLeft /> Back
        </button>
        <button 
          className="next-step-btn" 
          onClick={handleNext}
          disabled={!idImage || !isVerified || isVerifying}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PhotoIdentification;
