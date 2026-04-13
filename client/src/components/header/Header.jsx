import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaUser, 
  FaComments, 
  FaSignOutAlt, 
  FaUserCircle, 
  FaCog, 
  FaHistory,
  FaWallet,
  FaPlus,
  FaMinus,
  FaChevronRight,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaArrowLeft,
  FaArrowRight,
  FaCreditCard,
  FaUniversity,
  FaMobileAlt,
  FaMoneyBillWave,
} from 'react-icons/fa';
import { MdAttachMoney, MdAccountBalance, MdPayment } from 'react-icons/md';
import { BiTransfer, BiLogOut } from 'react-icons/bi';
import { GiTakeMyMoney, GiPayMoney, GiReceiveMoney } from 'react-icons/gi';
import { SB_TOP, TOP_NAV_H, MEGA_LETTERS } from "../constants/constants";
import { FaBangladeshiTakaSign } from "react-icons/fa6";
import { TbCoinTaka } from 'react-icons/tb';

// ─── Payment method → gateway productId mapping ───────────────────────────────
const DEPOSIT_PRODUCT_IDS = {
  bkash:  '5301',
  nagad:  '5302',
  rocket: '5304',
};

const WITHDRAW_PRODUCT_IDS = {
  bkash:  '5304',
  nagad:  '5305',
  rocket: '5306',
};

// Updated deposit methods with custom icons/images
const DEPOSIT_METHODS = [
  { 
    id: 'bkash',   
    label: 'bKash',        
    icon: FaMobileAlt, 
    color: '#e2136e', 
    min: 100,  
    max: 25000,
    imageUrl: 'https://static.vecteezy.com/system/resources/thumbnails/068/706/001/small_2x/bkash-logo-horizontal-bangla-mobile-banking-app-icon-free-png.png'
  },
  { 
    id: 'nagad',   
    label: 'Nagad',        
    icon: FaMobileAlt, 
    color: '#f26522', 
    min: 100,  
    max: 25000,
    imageUrl: 'https://media.prothomalo.com/prothomalo-english%2F2020-04%2Fcada797e-1d38-4a22-ae54-9a3317d35f39%2FNagad.png'
  },
  { 
    id: 'rocket',  
    label: 'Rocket',       
    icon: FaMobileAlt, 
    color: '#8b2fc9', 
    min: 100,  
    max: 25000,
    imageUrl: 'https://static.vecteezy.com/system/resources/thumbnails/068/706/013/small/rocket-color-logo-mobile-banking-icon-free-png.png'
  },
];

const WITHDRAW_METHODS = [
  { 
    id: 'bkash',  
    label: 'bKash',  
    icon: FaMobileAlt, 
    color: '#e2136e', 
    min: 200, 
    max: 20000,
    imageUrl: 'https://static.vecteezy.com/system/resources/thumbnails/068/706/001/small_2x/bkash-logo-horizontal-bangla-mobile-banking-app-icon-free-png.png'
  },
  { 
    id: 'nagad',  
    label: 'Nagad',  
    icon: FaMobileAlt, 
    color: '#f26522', 
    min: 200, 
    max: 20000,
    imageUrl: 'https://media.prothomalo.com/prothomalo-english%2F2020-04%2Fcada797e-1d38-4a22-ae54-9a3317d35f39%2FNagad.png'
  },
  { 
    id: 'rocket', 
    label: 'Rocket', 
    icon: FaMobileAlt, 
    color: '#8b2fc9', 
    min: 200, 
    max: 20000,
    imageUrl: 'https://static.vecteezy.com/system/resources/thumbnails/068/706/013/small/rocket-color-logo-mobile-banking-icon-free-png.png'
  },
];

const QUICK_AMOUNTS = [200, 500, 1000, 2000, 5000, 10000];

const STATUS_MAP = {
  0:  { label: 'In Progress', bg: 'bg-blue-500/20',    text: 'text-blue-400', icon: FaSpinner },
  1:  { label: 'Success',     bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: FaCheckCircle },
  3:  { label: 'Timeout',     bg: 'bg-orange-500/20',  text: 'text-orange-400', icon: FaClock },
  10: { label: 'Created',     bg: 'bg-gray-500/20',    text: 'text-gray-400', icon: FaClock },
  11: { label: 'Failed',      bg: 'bg-red-500/20',     text: 'text-red-400', icon: FaTimesCircle },
};

const statusStyle = {
  success: STATUS_MAP[1],
  pending: STATUS_MAP[0],
  failed:  STATUS_MAP[11],
};

// ─── API helpers ──────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_KEY_Base_URL || '',
  timeout: 30000,
});

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

const makeMchOrderNo = (userId) =>
  `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const WalletModal = ({ open, onClose, balance, setBalance, userId, onBalanceUpdate }) => {
  const [tab, setTab] = useState('deposit');
  const [step, setStep] = useState('method');
  const [method, setMethod] = useState(null);
  const [amount, setAmount] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [payUrl, setPayUrl] = useState('');
  const overlayRef = useRef(null);

  useEffect(() => {
    setStep('method');
    setMethod(null);
    setAmount('');
    setAccountNo('');
    setError('');
    setPayUrl('');
    if (tab === 'history') fetchHistory();
  }, [tab]);

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

  const methods = tab === 'deposit' ? DEPOSIT_METHODS : WITHDRAW_METHODS;
  const selectedMethod = methods.find(m => m.id === method);
  const MethodIcon = selectedMethod?.icon || FaCreditCard;

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
      const amountInPaise = Math.round(amountNum * 100); // Convert to paise/cents
      const amountInPaise2 = Math.round(amountNum * 100);

      if (tab === 'deposit') {
        // Use deposit product ID mapping
        const productId = DEPOSIT_PRODUCT_IDS[method];
        if (!productId) throw new Error('Invalid payment method');
        
        const response = await apiClient.post(`/api/payment/order/create`, {
          mchId: 8,
          productId: productId,
          mchOrderNo,
          amount: amountInPaise2,
          clientIp: '0.0.0.0',
          notifyUrl: `https://api.dgpaybd.com/api/payment/callback`,
          returnUrl: `https://dgpaybd.netlify.app/deposit/result?order=${mchOrderNo}`,
          subject: 'Deposit',
          body: `${selectedMethod.label} deposit`,
          param1: user._id,
          param2: tab,
        });
        
        if (!response.data.success) throw new Error(response.data.message || 'Order creation failed');
        const gatewayPayUrl = response.data.data?.payUrl || response.data.data?.data?.payUrl || '';
        if (gatewayPayUrl) setPayUrl(gatewayPayUrl);
            if (gatewayPayUrl) {
        // Open payment gateway in new window/tab
        window.open(gatewayPayUrl, '_blank');
      }
      
        const newBalance = balance.main + amountNum;
        setBalance(b => ({ ...b, main: newBalance }));
        if (onBalanceUpdate) await onBalanceUpdate(newBalance);
        
      } else {
        // Use withdrawal product ID mapping
        const productId = WITHDRAW_PRODUCT_IDS[method];
        if (!productId) throw new Error('Invalid withdrawal method');
        
        const withdrawalPayload = {
          mchId: 8,
          productId: productId,
          mchOrderNo,
          amount: amountInPaise,
          clientIp: '0.0.0.0',
          notifyUrl: `https://api.dgpaybd.com/api/withdrawal/callback`,
          userName: user.username || user.name || 'User',
          cardNumber: accountNo,
          bankName: selectedMethod.label,
          accountType: selectedMethod.id === 'bank' ? 'bank' : 'UPI',
          param1: user._id,
          ifscCode: 'ABHY0065001',
          param2: tab,
        };

        if (selectedMethod.id === 'bank') {
          withdrawalPayload.ifscCode = 'ABHY0065001';
        }

        const response = await apiClient.post(`/api/payment/order/create-withdrawal`, withdrawalPayload);
        if (!response.data.success) throw new Error(response.data || 'Withdrawal request failed');
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
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === overlayRef.current && onClose()}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <FaWallet className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">My Wallet</h2>
              <p className="text-gray-400 text-xs">Manage your funds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Balance Card */}
        <div className="mx-6 mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Total Balance</p>
              <div className="flex items-baseline gap-1 mt-1">
                <FaBangladeshiTakaSign className="text-gray-300 text-sm" />
                <span className="text-2xl font-bold text-white">{balance.main.toLocaleString()}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <TbCoinTaka className="text-blue-400 text-2xl" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mx-6 mt-4 rounded-xl overflow-hidden border border-white/10 bg-white/5">
          {[
            { id: 'deposit', label: 'Deposit', icon: FaPlus },
            { id: 'withdraw', label: 'Withdraw', icon: FaMinus },
          ].map(tabItem => {
            const Icon = tabItem.icon;
            return (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`flex-1 py-3 text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 ${
                  tab === tabItem.id ? 'text-white bg-gradient-to-r from-blue-500 to-blue-600' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tabItem.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-4 min-h-[340px]">

          {/* HISTORY TAB */}
          {tab === 'history' && (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scroll">
              {historyLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm gap-3">
                  <FaSpinner className="animate-spin text-3xl" />
                  <span>Loading transactions...</span>
                </div>
              )}
              {!historyLoading && history.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-sm gap-3">
                  <FaHistory className="text-4xl opacity-50" />
                  <span>No transactions yet</span>
                </div>
              )}
              {!historyLoading && history.map(tx => {
                const sKey = typeof tx.status === 'number' ? tx.status : (tx.status === 'success' ? 1 : tx.status === 'failed' ? 11 : 0);
                const sStyle = STATUS_MAP[sKey] ?? statusStyle[tx.status] ?? STATUS_MAP[0];
                const StatusIcon = sStyle.icon;
                const isDeposit = tx.type === 'deposit';
                const dateStr = tx.createdAt
                  ? new Date(tx.createdAt).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })
                  : tx.date ?? '';
                return (
                  <div key={tx.id ?? tx.mchOrderNo} className="flex items-center justify-between rounded-xl px-4 py-3 transition-all hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isDeposit ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                        {isDeposit ? <GiReceiveMoney className="text-emerald-400 text-xl" /> : <GiPayMoney className="text-red-400 text-xl" />}
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{tx.method ?? tx.productId}</p>
                        <p className="text-gray-500 text-xs">{dateStr}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-base font-bold ${isDeposit ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isDeposit ? '+' : '-'}৳{Number(tx.amount).toLocaleString()}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${sStyle.bg} ${sStyle.text} flex items-center gap-1`}>
                        <StatusIcon className="text-xs" />
                        {sStyle.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DEPOSIT / WITHDRAW TABS */}
          {(tab === 'deposit' || tab === 'withdraw') && (
            <>
              {step === 'method' && (
                <div>
                  <p className="text-gray-400 text-xs mb-4 font-semibold uppercase tracking-wider">Select Payment Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    {methods.map(m => {
                      const MethodIconComponent = m.icon;
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleSelectMethod(m.id)}
                          className="group flex flex-col items-center gap-2 rounded-xl py-4 px-3 transition-all hover:scale-105 active:scale-95"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid rgba(255,255,255,0.1)`,
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = m.color}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                        >
                          {m.imageUrl ? (
                            <img 
                              src={m.imageUrl} 
                              alt={m.label}
                              className="w-20 h-20 object-contain"
                            />
                          ) : (
                            <MethodIconComponent className="text-3xl" style={{ color: m.color }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 'amount' && selectedMethod && (
                <div>
                  <button onClick={() => setStep('method')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
                    <FaArrowLeft className="text-xs" />
                    Back
                  </button>

                  <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <p className="text-white font-bold">{selectedMethod.label}</p>
                      <p className="text-gray-400 text-xs">Min ৳{selectedMethod.min.toLocaleString()} — Max ৳{selectedMethod.max.toLocaleString()}</p>
                    </div>
                  </div>

                  {tab === 'withdraw' && (
                    <div className="mb-4">
                      <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-2">Account Number</label>
                      <input
                        type="text"
                        placeholder="Enter your account number"
                        value={accountNo}
                        onChange={e => setAccountNo(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 transition-all bg-white/5 border border-white/10 focus:border-blue-500"
                      />
                    </div>
                  )}

                  <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-2">Amount (৳)</label>
                  <div className="relative mb-3">
                    <FaBangladeshiTakaSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={e => { setAmount(e.target.value); setError(''); }}
                      className={`w-full rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none transition-all bg-white/5 border ${error ? 'border-red-500' : 'border-white/10'} focus:border-blue-500`}
                    />
                  </div>

                  {error && <p className="text-red-400 text-xs mb-3 flex items-center gap-1"><FaTimesCircle className="text-xs" />{error}</p>}

                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {QUICK_AMOUNTS.map(a => (
                      <button
                        key={a}
                        onClick={() => { setAmount(String(a)); setError(''); }}
                        className={`rounded-lg py-2 text-sm font-bold transition-all hover:scale-105 ${
                          amount === String(a) ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : 'bg-white/5 text-gray-300 border border-white/10'
                        }`}
                      >
                        ৳{a.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleAmountNext}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30"
                  >
                    Continue
                  </button>
                </div>
              )}

              {step === 'confirm' && selectedMethod && (
                <div>
                  <p className="text-gray-400 text-xs mb-4 font-semibold uppercase tracking-wider">Confirm {tab === 'deposit' ? 'Deposit' : 'Withdrawal'}</p>

                  <div className="rounded-xl p-4 mb-4 space-y-3 bg-white/5 border border-white/10">
                    {[
                      { label: 'Method', value: `${selectedMethod.label}` },
                      { label: 'Amount', value: `৳ ${parseFloat(amount).toLocaleString()}` },
                      ...(tab === 'withdraw' && accountNo ? [{ label: 'Account', value: accountNo }] : []),
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">{row.label}</span>
                        <span className="text-white font-semibold">{row.value}</span>
                      </div>
                    ))}
                    <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                      <span className="text-gray-300 text-sm font-bold uppercase">Total</span>
                      <span className="text-white font-black text-xl">৳ {parseFloat(amount).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('amount')}
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl text-gray-300 text-sm font-bold transition-colors hover:text-white bg-white/5 border border-white/10"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={loading}
                      className="flex-[2] py-3 rounded-xl text-white text-sm font-bold tracking-wide transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30"
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Confirm ${tab === 'deposit' ? 'Deposit' : 'Withdrawal'}`
                      )}
                    </button>
                  </div>
                </div>
              )}

              {step === 'success' && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-emerald-500/20 border-2 border-emerald-500/40">
                    <FaCheckCircle className="text-emerald-400 text-4xl" />
                  </div>
                  <h3 className="text-white text-2xl font-black mb-2">
                    {tab === 'deposit' ? 'Order Created!' : 'Withdrawal Requested!'}
                  </h3>
                  <p className="text-gray-400 text-base mb-1">
                    ৳ {parseFloat(amount).toLocaleString()} via {selectedMethod?.label}
                  </p>
                  <p className="text-gray-500 text-sm mb-6">
                    {tab === 'deposit'
                      ? 'Complete your payment on the gateway page.'
                      : 'Processing within 1–24 hours.'}
                  </p>

                  {payUrl && tab === 'deposit' && (
                    <a
                      href={payUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mb-3 py-3.5 rounded-xl text-white text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all hover:scale-[1.02] bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30"
                    >
                      <MdPayment className="text-lg" />
                      Complete Payment on Gateway
                    </a>
                  )}

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => { setStep('method'); setAmount(''); setAccountNo(''); setPayUrl(''); }}
                      className="flex-1 py-3 rounded-xl text-gray-300 text-sm font-bold transition-colors hover:text-white bg-white/5 border border-white/10"
                    >
                      New {tab === 'deposit' ? 'Deposit' : 'Withdrawal'}
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-blue-500 to-blue-600"
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
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────
const Header = ({ activeHNav, setActiveHNav, drawerOpen, openDrawer, closeDrawer }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState({ main: 0, bonus: 0 });
  const [walletOpen, setWalletOpen] = useState(false);

  const fetchUserData = useCallback(async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        const response = await apiClient.get(`/api/users/${parsedUser._id}`);
        if (response.data.success && response.data.data) {
          setBalance({
            main: response.data.data.balance || 0,
            bonus: 0
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setBalance({ main: parsedUser.balance || 0, bonus: 0 });
        }
      }
    } else {
      setUser(null);
      setBalance({ main: 0, bonus: 0 });
    }
  }, []);

  const updateBalanceOnServer = useCallback(async (newBalance) => {
    if (!user?._id) return false;
    
    try {
      const response = await apiClient.put(`/api/users/${user._id}/balance`, {
        balance: newBalance
      });
      
      if (response.data.success) {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          parsedUser.balance = newBalance;
          localStorage.setItem('user', JSON.stringify(parsedUser));
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating balance:', error);
      return false;
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setBalance({ main: 0, bonus: 0 });
    navigate('/login');
  };

  const Logo = () => (
    <div className="flex flex-col items-center cursor-pointer leading-none gap-px flex-shrink-0" onClick={() => navigate('/')}>
      <div className="flex items-center gap-1">
        <span className="text-xl">👑</span>
        <span className="font-barlow text-2xl font-black text-blue-600 tracking-wide">GLORY</span>
      </div>
      <span className="font-barlow text-[10px] font-bold text-red-600 tracking-[3px] uppercase">Casino</span>
    </div>
  );

  const IconMenu = ({ open }) => open ? (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ) : (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" />
    </svg>
  );

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-[100] shadow-md">
        <div className="flex items-center py-3 px-4 gap-3 max-w-[1600px] mx-auto">
          {/* Burger Menu Button - Mobile */}
          <button
            className="lg:hidden bg-transparent border-none cursor-pointer p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
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
                  className={`flex items-center justify-center px-2 h-full bg-transparent border-b-2 border-transparent cursor-pointer font-barlow text-sm font-bold text-gray-700 tracking-wide whitespace-nowrap uppercase transition-all hover:text-blue-600 ${
                    activeHNav === item.id ? 'text-blue-600 border-b-2 border-blue-600' : ''
                  }`}
                  onClick={() => setActiveHNav(item.id)}
                >
                  <div className="inline-flex items-center bg-gradient-to-br from-indigo-950 to-indigo-800 rounded-md py-0.5 px-2 h-6">
                    {MEGA_LETTERS.map((l, i) => <span key={i} className="font-barlow text-sm font-black leading-none drop-shadow-md" style={{ color: l.c }}>{l.ch}</span>)}
                  </div>
                </button>
              );
              if (item.type === 'aviator') return (
                <button
                  key={item.id}
                  className={`relative flex items-center h-full px-4 cursor-pointer bg-transparent border-b-2 border-transparent transition-all hover:border-b-2 hover:border-red-500 ${
                    activeHNav === item.id ? 'border-b-2 border-red-500' : ''
                  }`}
                  onClick={() => setActiveHNav(item.id)}
                >
                  <span className="font-serif text-base font-bold italic text-red-500">Aviator</span>
                  <span className="absolute top-2 right-0 bg-red-500 text-white text-[8px] font-extrabold font-barlow py-px px-1.5 rounded-sm tracking-wide uppercase">HOT</span>
                </button>
              );
              return (
                <button
                  key={item.id}
                  className={`flex items-center justify-center px-4 h-full bg-transparent border-b-2 border-transparent cursor-pointer font-barlow text-sm font-bold text-gray-700 tracking-wide whitespace-nowrap uppercase transition-all hover:text-blue-600 ${
                    activeHNav === item.id ? 'text-blue-600 border-b-2 border-blue-600' : ''
                  }`}
                  onClick={() => setActiveHNav(item.id)}
                >
                  {item.label.toUpperCase()}
                </button>
              );
            })}
          </nav>

          {/* Right Section - Professional Design */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            {user ? (
              <>
                {/* Professional Balance Card */}
                <div className="hidden md:block relative">
                  <div className="flex items-center gap-3 px-4 py-1 rounded-xl border-[1px] border-gray-200">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                      <FaBangladeshiTakaSign className="text-white text-sm" />
                    </div>
                    <div className="flex flex-col ">
                      <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Balance</span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-lg font-black text-gray-900 tracking-tight">{balance.main.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Balance */}
                <div className="md:hidden flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                  <FaBangladeshiTakaSign className="text-blue-600 text-xs" />
                  <span className="text-sm font-bold text-gray-900">{balance.main.toLocaleString()}</span>
                </div>

                {/* Deposit Button */}
                <button
                  onClick={() => setWalletOpen(true)}
                  className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 border-none cursor-pointer flex items-center justify-center text-white transition-all hover:scale-105 hover:shadow-lg group"
                  aria-label="Deposit"
                >
                  <span className="absolute inset-0 rounded-lg bg-white opacity-0 group-hover:opacity-20 transition-opacity"></span>
                  <FaPlus className="text-sm" />
                </button>
                {/* User Dropdown */}
                <div className="relative group">
                  <button className="relative flex items-center gap-2 px-2 py-1.5 rounded-lg  cursor-pointer transition-all hover:bg-gray-100 hover:border-gray-300">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-inner">
                      <FaUser className="text-white text-sm" />
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-72 rounded-xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {/* User Header */}
                    <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                          <FaUser className="text-white text-xl" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-bold">{user.username}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      
                      {/* Balance Card in Dropdown */}
                      <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-300">Available Balance</span>
                          <div className="flex items-baseline gap-1">
                            <FaBangladeshiTakaSign className="text-emerald-400 text-xs" />
                            <span className="text-lg font-black text-emerald-400">{balance.main.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <button
                      onClick={() => setWalletOpen(true)}
                      className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-white/10 transition-colors group"
                    >
                      <FaWallet className="text-emerald-400 text-base" />
                      <span className="flex-1 font-medium">Deposit / Withdraw</span>
                      <FaArrowRight className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-white/10 transition-colors group">
                      <FaUserCircle className="text-blue-400 text-base" />
                      <span className="flex-1 font-medium">Profile</span>
                    </button>
                    
                    <button className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-white/10 transition-colors group">
                      <FaCog className="text-gray-400 text-base" />
                      <span className="flex-1 font-medium">Settings</span>
                    </button>
                    
                    <NavLink to="/transactions" className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-white/10 transition-colors group">
                      <FaHistory className="text-purple-400 text-base" />
                      <span className="flex-1 font-medium">Transaction History</span>
                    </NavLink>
                    
                    <div className="border-t border-white/10 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/10 transition-colors group"
                      >
                        <BiLogOut className="text-base" />
                        <span className="flex-1 font-medium">Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/login')}
                  className="px-5 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-[5px] transition-all"
                >
                  Sign Up
                </button>
              </div>
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
        userId={user?._id}
        onBalanceUpdate={updateBalanceOnServer}
      />
    </>
  );
};

export default Header;