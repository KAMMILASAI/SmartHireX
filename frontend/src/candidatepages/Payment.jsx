import React, { useEffect, useState } from 'react';
import './Payment.css';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';
import { RiQrCodeLine } from 'react-icons/ri';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';

// Fallback for Vite environment variables
const envBase = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;

export default function Payment() {
  // Design-only payment screen
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('qrcode'); // qrcode | upi | card
  const [supportUpi, setSupportUpi] = useState('');
  const [qrGenerated, setQrGenerated] = useState(false);
  const [paid, setPaid] = useState(false);
  const [txnId, setTxnId] = useState('');
  const [qrError, setQrError] = useState(false);
  const [qrServiceIndex, setQrServiceIndex] = useState(0); // 0: primary, 1: backup1, 2: backup2
  // Design-only fields for UPI/Card
  const [upiId, setUpiId] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const { showInfo, showSuccess } = useToast();

  // Fetch UPI ID from backend configuration
  useEffect(() => {
    const fetchSupportUpi = async () => {
      try {
        const response = await axios.get(`${envBase}/config/support-upi`);
        if (response.data && response.data.upi) {
          setSupportUpi(response.data.upi);
        } else {
          setSupportUpi('');
          setError('Support UPI is not configured. Please contact admin.');
        }
      } catch (error) {
        console.error('Failed to fetch support UPI:', error);
        setSupportUpi('');
        setError('Failed to load support UPI. Please try again later.');
      }
    };
    
    fetchSupportUpi();
  }, []);

  // Reset generated QR when inputs or tab change
  useEffect(() => {
    setQrGenerated(false);
    setQrServiceIndex(0); // Reset to primary QR service
    setQrError(false);
  }, [amount, activeTab]);

  const upiUri = (id, amt) => {
    const pn = 'SmartHireX';
    const tn = 'SmartHireX Support Payment';
    const mc = '1234'; // Merchant code (optional but helps with compatibility)
    
    // Standard UPI URI format for better app compatibility
    return `upi://pay?pa=${encodeURIComponent(id)}&pn=${encodeURIComponent(pn)}&tn=${encodeURIComponent(tn)}&am=${encodeURIComponent(amt || '')}&cu=INR&mc=${mc}`;
  };
  const effectiveUpi = (supportUpi || '').trim();
  
  // Generate QR code with better compatibility and error correction
  const qrUrl = Number(amount) > 0 && effectiveUpi
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=M&format=png&data=${encodeURIComponent(upiUri(effectiveUpi, amount))}`
    : '';
  
  // Alternative QR service for better compatibility (backup)
  const qrUrlBackup = Number(amount) > 0 && effectiveUpi
    ? `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(upiUri(effectiveUpi, amount))}&choe=UTF-8`
    : '';
  
  // Third backup QR service
  const qrUrlBackup2 = Number(amount) > 0 && effectiveUpi
    ? `https://quickchart.io/qr?text=${encodeURIComponent(upiUri(effectiveUpi, amount))}&size=300`
    : '';

  const startPay = () => {
    if (Number(amount) <= 0) return setError('Enter amount > 0');
    setError('');
    setError('Payment method not allowed. Please use QR Code payment only.');
  };

  const markPaid = async () => {
    if (Number(amount) <= 0) return setError('Enter amount > 0');
    if (!effectiveUpi) return setError('Support UPI not configured.');
    setError('');
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${envBase}${envBase.endsWith('/') ? '' : '/'}payments/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ amount: Number(amount), transactionId: txnId })
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `Failed to save payment (${resp.status})`);
      }
      setPaid(true);
      showSuccess('Payment recorded successfully.');
      
      // Navigate back to previous page after successful payment
      setTimeout(() => {
        navigate(-1); // Go back to previous page
      }, 2000); // Wait 2 seconds to show success message
      
    } catch (e) {
      setError('Failed to record payment. Please login and try again.');
    }
  };

  return (
    <div className="payment-page">
      <div className="payment-card">
        <h2 className="payment-title">Checkout</h2>
        <p className="payment-subtitle">Scan and pay via QR Code. Default UPI is used if none is entered.</p>

        <div className="checkout-grid">
          <div className="checkout-left">
            <div className="section-title">Amount</div>
            <div className="amount-row">
              <input className="amount-input" type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} disabled={paid} style={{ background:'#0f1629', color:'#e5e7eb' }} />
            </div>
            {error && <div className="payment-error" style={{ marginTop: '.5rem' }}>{error}</div>}

            <div className="method-tabs">
              {['qrcode','upi','card'].map(m => (
                <button key={m} className={`method-tab ${activeTab===m ? 'active' : ''}`} onClick={()=>setActiveTab(m)}>
                  {m === 'qrcode' && <RiQrCodeLine style={{ marginRight: 6 }} />}
                  {m === 'qrcode' ? 'QR Code' : m === 'upi' ? 'UPI' : 'Card'}
                </button>
              ))}
            </div>
            <div className="method-panel">
              {activeTab === 'qrcode' && (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <button
                    className={`pay-btn generate-qr ${qrGenerated ? 'success' : ''}`}
                    onClick={()=>setQrGenerated(true)}
                    disabled={!(Number(amount) > 0 && !!effectiveUpi) || (paid && activeTab==='qrcode')}
                  >{qrGenerated ? 'QR Generated ✓' : 'Generate QR'}</button>
                  <small style={{ color: '#94a3b8' }}>
                    {effectiveUpi ? 'QR Code will appear in top right corner' : 'Support UPI not configured. Please set support.upi in backend.'}
                  </small>
                  <div className="amount-row">
                    <input
                      className="amount-input"
                      type="text"
                      placeholder="Transaction ID (optional)"
                      value={txnId}
                      onChange={e=>setTxnId(e.target.value)}
                      disabled={paid && activeTab==='qrcode'}
                      style={{ background:'#0f1629', color:'#e5e7eb' }}
                    />
                  </div>
                </div>
              )}
              {activeTab === 'upi' && (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <label className="section-title" style={{ fontSize: 14 }}>UPI</label>
                  <input
                    className="amount-input"
                    type="text"
                    placeholder="Enter your UPI ID (e.g., username@bank)"
                    value={upiId}
                    onChange={e=>setUpiId(e.target.value)}
                    style={{ background:'#0f1629', color:'#e5e7eb' }}
                  />
                  <small style={{ color: '#94a3b8' }}>Design preview only. This does not process payments.</small>
                </div>
              )}
              {activeTab === 'card' && (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <label className="section-title" style={{ fontSize: 14 }}>Card</label>
                  <input
                    className="amount-input"
                    type="text"
                    placeholder="Name on card"
                    value={cardName}
                    onChange={e=>setCardName(e.target.value)}
                    style={{ background:'#0f1629', color:'#e5e7eb' }}
                  />
                  <input
                    className="amount-input"
                    type="text"
                    placeholder="Card number"
                    value={cardNumber}
                    onChange={e=>setCardNumber(e.target.value)}
                    style={{ background:'#0f1629', color:'#e5e7eb' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <input
                      className="amount-input"
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={e=>setCardExpiry(e.target.value)}
                      style={{ background:'#0f1629', color:'#e5e7eb' }}
                    />
                    <input
                      className="amount-input"
                      type="password"
                      placeholder="CVV"
                      value={cardCvv}
                      onChange={e=>setCardCvv(e.target.value)}
                      style={{ background:'#0f1629', color:'#e5e7eb' }}
                    />
                  </div>
                  <small style={{ color: '#94a3b8' }}>Design preview only. This does not process payments.</small>
                </div>
              )}
            </div>
          </div>

          <div className="checkout-right">
            <div className="qr-section-right">
              {qrGenerated && (qrUrl || qrUrlBackup || qrUrlBackup2) ? (
                <div>
                  <img 
                    src={qrServiceIndex === 0 ? qrUrl : qrServiceIndex === 1 ? qrUrlBackup : qrUrlBackup2} 
                    alt="UPI QR Code" 
                    className="payment-qr-right"
                    onError={() => {
                      if (qrServiceIndex === 0 && qrUrlBackup) {
                        setQrServiceIndex(1);
                      } else if (qrServiceIndex === 1 && qrUrlBackup2) {
                        setQrServiceIndex(2);
                      } else {
                        setQrError(true);
                      }
                    }}
                    onLoad={() => setQrError(false)}
                  />
                  {qrError && (
                    <div style={{ color: '#ff6b6b', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center' }}>
                      QR Code failed to load. Please try refreshing.
                    </div>
                  )}
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'center' }}>
                    Scan with any UPI app (PhonePe, GPay, Paytm)
                  </div>
                </div>
              ) : (
                <div className="qr-box-right" aria-label="QR Code will appear here">
                  Generate QR to scan
                </div>
              )}
            </div>
            <div className="section-title">Summary</div>
            <div className="summary-row"><span>Amount</span><span>₹{Number(amount||0)}</span></div>
            <div className="summary-row"><span>Platform Fee</span><span>₹0</span></div>
            <div className="summary-row"><span>Method</span><span>{activeTab==='qrcode' ? 'QR Code' : activeTab==='upi' ? 'UPI' : 'Card'}</span></div>
            <div className="summary-row"><span>Status</span><span>{activeTab==='qrcode' ? (paid ? 'Success' : 'Pending') : 'Pending'}</span></div>
            <div className="summary-row total"><span>Total</span><span>₹{Number(amount||0)}</span></div>
            <div className="checkout-actions">
              {activeTab !== 'qrcode' && (
                <button className="pay-btn not-allowed" onClick={startPay}>Not Allowed</button>
              )}
              {activeTab === 'qrcode' && (
                <button
                  className={`pay-btn paid-confirm ${paid ? 'success' : ''}`}
                  onClick={markPaid}
                  disabled={!(qrGenerated && !!qrUrl) || (paid && activeTab==='qrcode')}
                >{paid ? 'Payment Confirmed ✓' : "I've Paid"}</button>
              )}
              <button className="cancel-btn" onClick={()=>window.history.back()}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}