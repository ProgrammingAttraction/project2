import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SB_TOP, TOP_NAV_H, MEGA_LETTERS } from "../constants/constants";

// ─── Payment method → gateway productId mapping ───────────────────────────────
// Update these productIds to match your actual gateway channel IDs
const PRODUCT_IDS = {
  bkash:  '3001',
  nagad:  '3002',
  rocket: '3003',
  upay:   '3004',
  bank:   '3005',
};

const DEPOSIT_METHODS = [
  { id: 'bkash',   label: 'bKash',        icon: '💳', color: '#e2136e', min: 100,  max: 25000  },
  { id: 'nagad',   label: 'Nagad',        icon: '🟠', color: '#f26522', min: 100,  max: 25000  },
  { id: 'rocket',  label: 'Rocket',       icon: '🟣', color: '#8b2fc9', min: 100,  max: 25000  },
  { id: 'upay',    label: 'Upay',         icon: '🔵', color: '#0066cc', min: 200,  max: 50000  },
  { id: 'bank',    label: 'Bank Transfer', icon: '🏦', color: '#1a6b3c', min: 500,  max: 100000 },
];

const WITHDRAW_METHODS = [
  { id: 'bkash',  label: 'bKash',  icon: '💳', color: '#e2136e', min: 200, max: 20000 },
  { id: 'nagad',  label: 'Nagad',  icon: '🟠', color: '#f26522', min: 200, max: 20000 },
  { id: 'rocket', label: 'Rocket', icon: '🟣', color: '#8b2fc9', min: 200, max: 20000 },
  { id: 'bank',   label: 'Bank',   icon: '🏦', color: '#1a6b3c', min: 500, max: 50000 },
];

const QUICK_AMOUNTS = [200, 500, 1000, 2000, 5000, 10000];

// Payment status codes from gateway:
// 0=In progress  1=Completed  3=Timeout  10=Created  11=Failed
const STATUS_MAP = {
  0:  { label: 'In Progress', bg: 'bg-blue-500/20',    text: 'text-blue-400'    },
  1:  { label: 'Success',     bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  3:  { label: 'Timeout',     bg: 'bg-orange-500/20',  text: 'text-orange-400'  },
  10: { label: 'Created',     bg: 'bg-gray-500/20',    text: 'text-gray-400'    },
  11: { label: 'Failed',      bg: 'bg-red-500/20',     text: 'text-red-400'     },
};

// Fallback for local history entries not yet returned from gateway
const statusStyle = {
  success: STATUS_MAP[1],
  pending: STATUS_MAP[0],
  failed:  STATUS_MAP[11],
};

// ─── API helpers ──────────────────────────────────────────────────────────────
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Create axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_KEY_Base_URL || '',
  timeout: 30000,
});

// Add request interceptor for auth headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['Content-Type'] = 'application/json';
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generate a unique merchant order number: userId_timestamp_random
const makeMchOrderNo = (userId) =>
  `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const WalletModal = ({ open, onClose, balance, setBalance }) => {
  const [tab, setTab]             = useState('deposit');  // deposit | withdraw | history
  const [step, setStep]           = useState('method');   // method | amount | confirm | success
  const [method, setMethod]       = useState(null);
  const [amount, setAmount]       = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [history, setHistory]     = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [payUrl, setPayUrl]       = useState('');       // redirect URL from gateway on deposit
  const overlayRef                = useRef(null);

  // Reset on tab change; fetch history when switching to that tab
  useEffect(() => {
    setStep('method');
    setMethod(null);
    setAmount('');
    setAccountNo('');
    setError('');
    setPayUrl('');
    if (tab === 'history') fetchHistory();
  }, [tab]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setTab('deposit');
        setStep('method');
        setMethod(null);
        setAmount('');
        setAccountNo('');
        setError('');
        setLoading(false);
        setPayUrl('');
      }, 300);
    }
  }, [open]);

  // ── Fetch transaction history from backend ────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      if (!user) { setHistory([]); return; }

      const response = await apiClient.get(`/api/payment/history`, {
        params: { mchId: user._id }
      });
      
      if (response.data.success && Array.isArray(response.data.data)) {
        setHistory(response.data.data);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Also poll the gateway for latest order status for "pending" orders
  const queryOrderStatus = useCallback(async (mchOrderNo) => {
    try {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      if (!user) return null;

      const response = await apiClient.post(`/api/payment/order/query`, {
        mchId: user._id,
        mchOrderNo
      });
      
      return response.data.data ?? null;
    } catch (error) {
      console.error('Error querying order status:', error);
      return null;
    }
  }, []);

  const methods = tab === 'deposit' ? DEPOSIT_METHODS : WITHDRAW_METHODS;
  const selectedMethod = methods.find(m => m.id === method);

  const handleSelectMethod = (id) => {
    setMethod(id);
    setStep('amount');
    setError('');
  };

  const validateAmount = () => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) return 'Please enter a valid amount';
    if (num < selectedMethod.min) return `Minimum amount is ৳${selectedMethod.min.toLocaleString()}`;
    if (num > selectedMethod.max) return `Maximum amount is ৳${selectedMethod.max.toLocaleString()}`;
    if (tab === 'withdraw' && num > balance.main) return 'Insufficient balance';
    return '';
  };

  const handleAmountNext = () => {
    const err = validateAmount();
    if (err) { setError(err); return; }
    setError('');
    setStep('confirm');
  };

const handleConfirm = async () => {
  setLoading(true);
  setError('');
  try {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    if (!user) throw new Error('Not logged in');

    const mchOrderNo = makeMchOrderNo(user._id);
    const amountNum = parseFloat(amount);
    const amountInPaise = Math.round(amountNum); // Convert to paise/cents as backend expects

    if (tab === 'deposit') {
      // Deposit logic remains the same
      const response = await apiClient.post(`/api/payment/order/create`, {
        mchId: 5,
        productId: '5301',
        mchOrderNo,
        amount: amountInPaise,
        clientIp: '0.0.0.0',
        notifyUrl: `https://api.dgpaybd.com/api/payment/callback`,
        returnUrl: `http://localhost:5173/deposit/result?order=${mchOrderNo}`,
        subject: 'Deposit',
        body: `${selectedMethod.label} deposit`,
        param1: user._id,
        param2: tab,
      });
      
      if (!response.data.success) throw new Error(response.data.message || 'Order creation failed');
      const gatewayPayUrl = response.data.data?.payUrl || response.data.data?.data?.payUrl || '';
      if (gatewayPayUrl) setPayUrl(gatewayPayUrl);
      setBalance(b => ({ ...b, main: b.main + amountNum }));

    } else {
      // FIXED: Withdrawal request with correct parameters
      const withdrawalPayload = {
        mchId: 5,
        productId: '5304', // Withdrawal product ID
        mchOrderNo,
        amount: amountInPaise, // Send in paise/cents (e.g., 1000 = 10.00)
        clientIp: '0.0.0.0',
        notifyUrl: `https://api.dgpaybd.com/api/withdrawal/callback`,
        userName: user.username || user.name || 'User', // Required field
        cardNumber: accountNo, // Account number for bank/UPI
        bankName: selectedMethod.label, // Bank name from selected method
        accountType: selectedMethod.id === 'bank' ? 'bank' : 'UPI', // Default to bank
        param1: user._id,
        ifscCode:   'ABHY0065001',
        param2: tab,
      };

      // Add IFSC code only for bank transfers
      if (selectedMethod.id === 'bank') {
        withdrawalPayload.ifscCode = 'ABHY0065001'; // Example IFSC, get from user input if needed
      }

      console.log("Withdrawal payload:", withdrawalPayload);

      const response = await apiClient.post(`/api/payment/order/create-withdrawal`, withdrawalPayload);
      
      if (!response.data.success) throw new Error(response.data.message || 'Withdrawal request failed');

      // Deduct from local balance optimistically
      setBalance(b => ({ ...b, main: Math.max(0, b.main - amountNum) }));
    }

    setStep('success');
  } catch (err) {
    console.error("Error:", err);
    setError(err.response?.data?.message || err.message || 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
};

  if (!open) return null;



          

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === overlayRef.current && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          animation: 'modalIn 0.25s cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <span className="text-white font-bold text-lg tracking-wide">My Wallet</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-400">Balance</span>
            <span className="text-white font-bold text-base">৳ {balance.main.toLocaleString()}</span>
          </div>
          <button
            onClick={onClose}
            className="ml-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mx-5 mt-4 rounded-xl overflow-hidden border border-white/10">
          {[
            { id: 'deposit',  label: '⬇ Deposit'  },
            { id: 'withdraw', label: '⬆ Withdraw' },
            { id: 'history',  label: '📋 History'  },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2.5 text-xs font-bold tracking-wide transition-all"
              style={{
                background: tab === t.id ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'transparent',
                color: tab === t.id ? '#fff' : '#94a3b8',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-5 pb-5 pt-4 min-h-[320px]">

          {/* ── HISTORY TAB ─────────────────────────────────── */}
          {tab === 'history' && (
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 custom-scroll">
              {historyLoading && (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                    <path d="M21 12a9 9 0 00-9-9"/>
                  </svg>
                  Loading transactions...
                </div>
              )}
              {!historyLoading && history.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-sm">
                  <span className="text-3xl mb-2">📭</span>
                  No transactions yet
                </div>
              )}
              {!historyLoading && history.map(tx => {
                // Support both gateway status codes (numbers) and string statuses
                const sKey   = typeof tx.status === 'number' ? tx.status : (tx.status === 'success' ? 1 : tx.status === 'failed' ? 11 : 0);
                const sStyle = STATUS_MAP[sKey] ?? statusStyle[tx.status] ?? STATUS_MAP[0];
                const isDeposit = tx.type === 'deposit';
                const dateStr = tx.createdAt
                  ? new Date(tx.createdAt).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })
                  : tx.date ?? '';
                return (
                  <div key={tx.id ?? tx.mchOrderNo} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-base" style={{ background: isDeposit ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                        {isDeposit ? '⬇' : '⬆'}
                      </div>
                      <div>
                        <p className="text-white text-xs font-semibold">{tx.method ?? tx.productId}</p>
                        <p className="text-gray-500 text-[10px]">{dateStr}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-sm font-bold ${isDeposit ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isDeposit ? '+' : '-'}৳{Number(tx.amount).toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sStyle.bg} ${sStyle.text}`}>{sStyle.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── DEPOSIT / WITHDRAW TABS ──────────────────────── */}
          {(tab === 'deposit' || tab === 'withdraw') && (

            <>
              {/* STEP: METHOD */}
              {step === 'method' && (
                <div>
                  <p className="text-gray-400 text-xs mb-3 font-medium uppercase tracking-widest">Select Payment Method</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {methods.map(m => (
                      <button
                        key={m.id}
                        onClick={() => handleSelectMethod(m.id)}
                        className="flex flex-col items-center gap-2 rounded-xl py-4 px-3 transition-all hover:scale-105 active:scale-95"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: `1px solid rgba(255,255,255,0.08)`,
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = m.color}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                      >
                        <span className="text-2xl">{m.icon}</span>
                        <span className="text-white text-xs font-bold">{m.label}</span>
                        <span className="text-gray-500 text-[10px]">Min ৳{m.min.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP: AMOUNT */}
              {step === 'amount' && selectedMethod && (
                <div>
                  <button onClick={() => setStep('method')} className="flex items-center gap-1 text-gray-400 hover:text-white text-xs mb-4 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Back
                  </button>

                  <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <span className="text-2xl">{selectedMethod.icon}</span>
                    <div>
                      <p className="text-white text-sm font-bold">{selectedMethod.label}</p>
                      <p className="text-gray-400 text-xs">Min ৳{selectedMethod.min.toLocaleString()} — Max ৳{selectedMethod.max.toLocaleString()}</p>
                    </div>
                  </div>

                  {tab === 'withdraw' && (
                    <div className="mb-4">
                      <label className="text-gray-400 text-xs font-medium uppercase tracking-widest block mb-2">Account Number</label>
                      <input
                        type="text"
                        placeholder="Enter your account number"
                        value={accountNo}
                        onChange={e => setAccountNo(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2"
                        style={{
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          focusRingColor: selectedMethod.color,
                        }}
                      />
                    </div>
                  )}

                  <label className="text-gray-400 text-xs font-medium uppercase tracking-widest block mb-2">Amount (৳)</label>
                  <div className="relative mb-3">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">৳</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={e => { setAmount(e.target.value); setError(''); }}
                      className="w-full rounded-xl pl-8 pr-4 py-3 text-white text-sm outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.12)'}`,
                      }}
                    />
                  </div>

                  {error && <p className="text-red-400 text-xs mb-3 flex items-center gap-1"><span>⚠</span>{error}</p>}

                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {QUICK_AMOUNTS.map(a => (
                      <button
                        key={a}
                        onClick={() => { setAmount(String(a)); setError(''); }}
                        className="rounded-lg py-2 text-xs font-bold transition-all hover:scale-105"
                        style={{
                          background: amount === String(a) ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'rgba(255,255,255,0.07)',
                          color: amount === String(a) ? '#fff' : '#94a3b8',
                          border: `1px solid ${amount === String(a) ? '#2563eb' : 'rgba(255,255,255,0.1)'}`,
                        }}
                      >
                        ৳{a.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleAmountNext}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }}
                  >
                    Continue →
                  </button>
                </div>
              )}

              {/* STEP: CONFIRM */}
              {step === 'confirm' && selectedMethod && (
                <div>
                  <p className="text-gray-400 text-xs mb-4 font-medium uppercase tracking-widest">Confirm {tab === 'deposit' ? 'Deposit' : 'Withdrawal'}</p>

                  <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {[
                      { label: 'Method',  value: `${selectedMethod.icon} ${selectedMethod.label}` },
                      { label: 'Amount',  value: `৳ ${parseFloat(amount).toLocaleString()}` },
                      ...(tab === 'withdraw' && accountNo ? [{ label: 'Account', value: accountNo }] : []),
                      { label: 'Type',    value: tab === 'deposit' ? '⬇ Deposit' : '⬆ Withdraw' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs">{row.label}</span>
                        <span className="text-white text-sm font-semibold">{row.value}</span>
                      </div>
                    ))}
                    <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                      <span className="text-gray-300 text-xs font-bold uppercase tracking-wide">Total</span>
                      <span className="text-white font-black text-lg">৳ {parseFloat(amount).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep('amount')}
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl text-gray-300 text-sm font-bold transition-colors hover:text-white"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={loading}
                      className="flex-[2] py-3 rounded-xl text-white text-sm font-bold tracking-wide transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                            <path d="M21 12a9 9 0 00-9-9"/>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        `Confirm ${tab === 'deposit' ? 'Deposit' : 'Withdrawal'}`
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP: SUCCESS */}
              {step === 'success' && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <h3 className="text-white text-xl font-black mb-1">
                    {tab === 'deposit' ? 'Order Created!' : 'Withdrawal Requested!'}
                  </h3>
                  <p className="text-gray-400 text-sm mb-1">
                    ৳ {parseFloat(amount).toLocaleString()} via {selectedMethod?.label}
                  </p>
                  <p className="text-gray-500 text-xs mb-5">
                    {tab === 'deposit'
                      ? 'Complete your payment on the gateway page.'
                      : 'Processing within 1–24 hours.'}
                  </p>

                  {/* If gateway returned a payUrl, show prominent redirect button */}
                  {payUrl && tab === 'deposit' && (
                    <a
                      href={payUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mb-3 py-3.5 rounded-xl text-white text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 4px 20px rgba(5,150,105,0.4)' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                      Complete Payment on Gateway
                    </a>
                  )}

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => { setStep('method'); setAmount(''); setAccountNo(''); setPayUrl(''); }}
                      className="flex-1 py-3 rounded-xl text-gray-300 text-sm font-bold transition-colors hover:text-white"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                    >
                      New {tab === 'deposit' ? 'Deposit' : 'Withdrawal'}
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 rounded-xl text-white text-sm font-bold"
                      style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)' }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);     }
        }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
      `}</style>
    </div>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────
const Header = ({ activeHNav, setActiveHNav, drawerOpen, openDrawer, closeDrawer }) => {
  const navigate = useNavigate();
  const [user, setUser]           = useState(null);
  const [balance, setBalance]     = useState({ main: 0, bonus: 0 });
  const [walletOpen, setWalletOpen] = useState(false);
  const base_url = import.meta.env.VITE_API_KEY_Base_URL;

  useEffect(() => {
    const token    = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      setBalance({ main: 1000, bonus: 500 });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const Logo = () => (
    <div className="flex flex-col items-center cursor-pointer leading-none gap-px flex-shrink-0" onClick={() => navigate('/')}>
      <div className="flex items-center gap-1">
        <span className="text-base">👑</span>
        <span className="font-barlow text-[22px] font-black text-blue-600 tracking-[1.5px]">GLORY</span>
      </div>
      <span className="font-barlow text-[10px] font-bold text-red-600 tracking-[3.5px] uppercase">Casino</span>
    </div>
  );

  const IconUser = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#9ca3af">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );

  const IconChat = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );

  const IconMenu = ({ open }) => open ? (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ) : (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" />
    </svg>
  );

  return (
    <>
      <header className="bg-gray-100 border-b border-gray-200 sticky top-0 z-[100] shadow-md">
        <div className="flex items-center h-14 px-4 gap-2 max-w-[1600px] mx-auto">
          {/* Burger Menu Button - Mobile */}
          <button
            className="lg:hidden bg-transparent border-none cursor-pointer p-1.5 rounded-md text-gray-900 hover:bg-black/10 transition-colors flex-shrink-0"
            onClick={() => drawerOpen ? closeDrawer() : openDrawer()}
            aria-label="Menu"
          >
            <IconMenu open={drawerOpen} />
          </button>

          <Logo />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-stretch h-14 flex-1 justify-center">
            {TOP_NAV_H.map(item => {
              if (item.type === 'megablock') return (
                <button
                  key={item.id}
                  className={`flex items-center justify-center px-2 h-full bg-transparent border-none border-b-3 border-transparent cursor-pointer font-barlow text-[13px] font-bold text-gray-900 tracking-wide whitespace-nowrap uppercase transition-colors hover:text-blue-600 ${
                    activeHNav === item.id ? 'text-blue-600 border-b-3 border-blue-600' : ''
                  }`}
                  onClick={() => setActiveHNav(item.id)}
                  style={{ padding: '0 7px' }}
                  aria-label="Megablock"
                >
                  <div className="inline-flex items-center bg-gradient-to-br from-indigo-950 to-indigo-800 rounded-md py-0.5 px-2 h-6">
                    {MEGA_LETTERS.map((l, i) => <span key={i} className="font-barlow text-[13px] font-black leading-none drop-shadow-md" style={{ color: l.c }}>{l.ch}</span>)}
                  </div>
                </button>
              );
              if (item.type === 'aviator') return (
                <button
                  key={item.id}
                  className={`relative flex items-center h-full px-3 cursor-pointer bg-transparent border-none border-b-3 border-transparent transition-colors hover:border-b-3 hover:border-red-500 ${
                    activeHNav === item.id ? 'border-b-3 border-red-500' : ''
                  }`}
                  onClick={() => setActiveHNav(item.id)}
                >
                  <span className="font-serif text-base font-bold italic text-red-500">Aviator</span>
                  <span className="absolute top-2 right-1 bg-red-500 text-white text-[7px] font-extrabold font-barlow py-px px-1 rounded-sm tracking-wide uppercase">HOT</span>
                </button>
              );
              return (
                <button
                  key={item.id}
                  className={`flex items-center justify-center px-3 h-full bg-transparent border-none border-b-3 border-transparent cursor-pointer font-barlow text-[13px] font-bold text-gray-900 tracking-wide whitespace-nowrap uppercase transition-colors hover:text-blue-600 ${
                    activeHNav === item.id ? 'text-blue-600 border-b-3 border-blue-600' : ''
                  }`}
                  onClick={() => setActiveHNav(item.id)}
                >
                  {item.label.toUpperCase()}
                </button>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
            {user ? (
              <>
                {/* Balance Display */}
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-xs font-bold text-gray-900">৳ {balance.main.toLocaleString()}</span>
                  <span className="text-xs font-bold text-gray-500">⊕ {balance.bonus.toLocaleString()}</span>
                </div>

                {/* Deposit Button — opens wallet */}
                <button
                  onClick={() => setWalletOpen(true)}
                  className="w-8 h-8 rounded-lg bg-blue-600 border-none cursor-pointer flex items-center justify-center text-white text-xl font-light flex-shrink-0 transition-all hover:bg-blue-700 hover:scale-105"
                  aria-label="Deposit"
                >
                  +
                </button>

                {/* Chat Button */}
                <button className="hidden sm:flex w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer items-center justify-center text-gray-500 flex-shrink-0 transition-colors hover:text-blue-600" aria-label="Chat">
                  <IconChat />
                </button>

                {/* User Avatar + Dropdown */}
                <div className="relative group">
                  <button className="relative bg-transparent border-2 border-gray-200 rounded-full w-[34px] h-[34px] cursor-pointer flex items-center justify-center p-0 overflow-visible flex-shrink-0 transition-colors hover:border-blue-600" aria-label="Account">
                    <div className="w-[30px] h-[30px] rounded-full bg-gray-200 flex items-center justify-center">
                      <IconUser />
                    </div>
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-100" />
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-52 rounded-xl shadow-2xl py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden"
                    style={{ background: 'linear-gradient(160deg,#0f172a,#1e293b)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-sm font-bold text-white">{user.username}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                      <div className="mt-1.5 flex items-center gap-1">
                        <span className="text-xs text-emerald-400 font-bold">৳ {balance.main.toLocaleString()}</span>
                        <span className="text-gray-600 text-xs">•</span>
                        <span className="text-xs text-yellow-400 font-bold">⊕ {balance.bonus}</span>
                      </div>
                    </div>

                    {/* Quick Deposit from dropdown */}
                    <button
                      onClick={() => setWalletOpen(true)}
                      className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-emerald-400 hover:bg-white/5 transition-colors font-semibold"
                    >
                      <span>💰</span> Deposit / Withdraw
                    </button>

                    <button className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                      <span>👤</span> Profile
                    </button>
                    <button className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                      <span>⚙️</span> Settings
                    </button>
                    <NavLink to="/transactions" className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                      <span>📋</span> Transaction History
                    </NavLink>
                    <div className="border-t border-white/10 mt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
                      >
                        <span>🚪</span> Logout
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Wallet Modal */}
      <WalletModal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        balance={balance}
        setBalance={setBalance}
      />
    </>
  );
};

export default Header;