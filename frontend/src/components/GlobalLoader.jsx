import React, { useEffect, useRef } from 'react';
import { useLoading } from '../contexts/LoadingContext';

const GlobalLoader = () => {
  const { isLoading } = useLoading();
  const dotsRef = useRef(null);

  useEffect(() => {
    if (!isLoading) return;
    
    const timer = setTimeout(() => {
      if (dotsRef.current) {
        dotsRef.current.style.display = 'block';
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="loader-overlay">
      <style>{`
        .loader-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: transparent;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }
        .loader {
          position: relative;
          width: 100px;
          height: 100px;
        }
        .part {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          transform: scale(0.8);
        }
        .left {
          animation: showLeft 1s forwards;
        }
        .right {
          animation: showRight 1s forwards;
          animation-delay: 1s;
        }
        .tick {
          width: 60%;
          height: auto;
          top: 17%;
          left: 23%;
          animation: showTick 1s forwards;
          animation-delay: 2s;
        }
        .dots {
          position: absolute;
          bottom: 8px;
          right: 39px;
          display: none;
          font-size: 30px;
          color: #f1f1f1;
          letter-spacing: 2px;
        }
        .dots span {
          opacity: 0.2;
          animation: blink 1.5s infinite;
        }
        .dots span:nth-child(1) { animation-delay: 0s; }
        .dots span:nth-child(2) { animation-delay: 0.3s; }
        .dots span:nth-child(3) { animation-delay: 0.6s; }
        @keyframes showLeft {
          from { opacity: 0; transform: translateX(-30px) scale(0.8); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes showRight {
          from { opacity: 0; transform: translateX(30px) scale(0.8); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes showTick {
          from { opacity: 0; transform: scale(0.5) rotate(-20deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }
      `}</style>
      <div className="loader">
        <img src="/left_logo.png" className="part left" alt="Left Brain" />
        <img src="/right_logo.png" className="part right" alt="Right Brain" />
        <img src="/tick_logo.png" className="part tick" alt="Check Mark" />
        <div className="dots" ref={dotsRef}>
          <span>.</span><span>.</span><span>.</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalLoader;
