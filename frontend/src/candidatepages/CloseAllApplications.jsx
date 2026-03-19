import React, { useEffect, useState } from 'react';
import { FiMonitor, FiEye, FiTool, FiGrid } from 'react-icons/fi';

const CheckRow = ({ok, title, message, icon: Icon}) => (
  <div style={{display: 'flex', gap: 16, alignItems: 'center', padding: '16px 20px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '10px', border: `1px solid ${ok ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`}}>
    <div style={{width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ok ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', borderRadius: '10px', color: ok ? '#22c55e' : '#ef4444', flexShrink: 0}}>
      <Icon size={24} />
    </div>
    <div style={{flex: 1}}>
      <div style={{fontWeight: 600, fontSize: '16px', color: '#e2e8f0', marginBottom: '4px'}}>{title}</div>
      <div style={{fontSize: 14, color: '#94a3b8', margin: 0, lineHeight: 1.4}}>{message}</div>
    </div>
    <div style={{width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1, color: ok ? '#22c55e' : '#ef4444', flexShrink: 0}}>{ok ? '✓' : '✕'}</div>
  </div>
);

const CloseAllApplications = ({ onNext, onBack }) => {
  const [visible, setVisible] = useState(!document.hidden);
  const [focused, setFocused] = useState(document.hasFocus());
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [multiScreen, setMultiScreen] = useState(false);

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);

    const detectDevTools = () => {
      const threshold = 160;
      const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
      const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
      setDevToolsOpen(widthDiff > threshold || heightDiff > threshold);
    };

    const screenCheck = () => {
      try {
        setMultiScreen(window.screen.width > window.innerWidth + 200);
      } catch {
        setMultiScreen(false);
      }
    };

    window.addEventListener('resize', detectDevTools);
    window.addEventListener('resize', screenCheck);
    const t = setInterval(detectDevTools, 1000);
    screenCheck();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', detectDevTools);
      window.removeEventListener('resize', screenCheck);
      clearInterval(t);
    };
  }, []);

  const allChecksPassed = visible && focused && !devToolsOpen && !multiScreen;

  return (
    <div className="check-in-step-view">
      <div className="system-check-header">
        <h1 className="system-check-title">Close other apps & windows</h1>
        <p className="system-check-subtitle">Before the exam, close other programs, browser tabs and tools that could interfere.</p>
      </div>

      <div style={{marginTop: 24, display: 'grid', gap: 16, maxWidth: '700px', margin: '24px auto 0'}}>
        <CheckRow ok={visible} title="Exam tab visible" message={visible ? 'This tab is visible.' : 'Bring this tab to the front.'} icon={FiEye} />
        <CheckRow ok={focused} title="Window focused" message={focused ? 'Window is focused.' : 'Click this window to focus it.'} icon={FiMonitor} />
        <CheckRow ok={!devToolsOpen} title="Developer tools" message={!devToolsOpen ? 'Dev tools are closed.' : 'Close developer tools and refresh the page.'} icon={FiTool} />
        <CheckRow ok={!multiScreen} title="Other displays" message={!multiScreen ? 'No extra displays detected.' : 'Check other monitors for visible apps.'} icon={FiGrid} />
      </div>

      <div style={{display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24}}>
        <button className="retake-btn" onClick={() => { window.dispatchEvent(new Event('resize')); window.dispatchEvent(new Event('visibilitychange')); }}>Check again</button>
      </div>

      <div className="actions-footer" style={{marginTop: 24}}>
        <button className="back-step-btn" onClick={onBack}>Back</button>
        <button 
          className="next-step-btn" 
          onClick={onNext}
          disabled={!allChecksPassed}
          style={{
            opacity: allChecksPassed ? 1 : 0.5,
            cursor: allChecksPassed ? 'pointer' : 'not-allowed'
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default CloseAllApplications;
