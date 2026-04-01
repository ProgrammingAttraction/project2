// Withdraw.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BANNERS, ALL_GAMES, PILL_CATS, PROVIDERS, SB_TOP, SB_CATS } from "../../components/constants/constants";
import Header from '../../components/header/Header';
import Sidebar from '../../components/sidebar/Sidebar';

const Withdraw = () => {
  const navigate = useNavigate();
  const [activeHNav, setActiveHNav] = useState('CASINO');
  const [activeTop, setActiveTop] = useState('Lobby');
  const [activeCat, setActiveCat] = useState('Top Games');
  const [activeProv, setActiveProv] = useState('All');
  const [sbCollapsed, setSbCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerClose, setDrawerClose] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    confirmAccountNumber: ''
  });
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [withdrawals, setWithdrawals] = useState([]);
  const [showWithdrawForm, setShowWithdrawForm] = useState(true);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);

  // API Configuration
  const BASE_URL = import.meta.env.VITE_API_KEY_Base_URL || 'http://localhost:5000/api';

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Fetch user balance on component mount
  useEffect(() => {
    fetchUserBalance();
    fetchWithdrawalHistory();
  }, []);

  // Fetch user balance
  const fetchUserBalance = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login to continue');
        return;
      }

      const response = await axios.get(`${BASE_URL}/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setUserBalance(response.data.data.balance);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Failed to fetch balance');
    }
  };

  // Fetch withdrawal history
  const fetchWithdrawalHistory = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await axios.get(`${BASE_URL}/withdrawal/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setWithdrawalHistory(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching withdrawal history:', err);
    }
  };

  // Handle withdrawal submission
  const handleWithdrawal = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate amount
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    // Check minimum withdrawal amount (e.g., ₹500)
    if (amount < 500) {
      setError('Minimum withdrawal amount is ₹500');
      setLoading(false);
      return;
    }

    // Check maximum withdrawal amount (e.g., ₹50,000)
    if (amount > 50000) {
      setError('Maximum withdrawal amount is ₹50,000');
      setLoading(false);
      return;
    }

    // Check if amount exceeds balance
    if (amount > userBalance) {
      setError(`Insufficient balance. Your current balance is ₹${userBalance.toFixed(2)}`);
      setLoading(false);
      return;
    }

    // Validate bank details
    if (!bankDetails.accountHolderName.trim()) {
      setError('Please enter account holder name');
      setLoading(false);
      return;
    }

    if (!bankDetails.bankName.trim()) {
      setError('Please enter bank name');
      setLoading(false);
      return;
    }

    if (!bankDetails.accountNumber.trim()) {
      setError('Please enter account number');
      setLoading(false);
      return;
    }

    if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
      setError('Account numbers do not match');
      setLoading(false);
      return;
    }

    if (bankDetails.accountNumber.length < 9 || bankDetails.accountNumber.length > 18) {
      setError('Please enter a valid account number (9-18 digits)');
      setLoading(false);
      return;
    }

    if (!bankDetails.ifscCode.trim()) {
      setError('Please enter IFSC code');
      setLoading(false);
      return;
    }

    // Validate IFSC code format (11 characters, alphanumeric)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(bankDetails.ifscCode.toUpperCase())) {
      setError('Please enter a valid IFSC code (e.g., SBIN0001234)');
      setLoading(false);
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login to continue');
        setLoading(false);
        return;
      }

      // Generate unique order number
      const mchOrderNo = `WD${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      // Convert amount to paise/cents for gateway
      const amountInPaise = amount * 100;

      // Prepare withdrawal request payload
      const withdrawalData = {
        mchId: 'MCH001', // Your merchant ID
        productId: 'WITHDRAWAL_001',
        mchOrderNo: mchOrderNo,
        amount: amountInPaise,
        clientIp: '127.0.0.1', // Get actual client IP in production
        notifyUrl: `${window.location.origin}/api/withdrawal/callback`,
        userName: bankDetails.accountHolderName,
        cardNumber: bankDetails.accountNumber,
        ifscCode: bankDetails.ifscCode.toUpperCase(),
        bankName: bankDetails.bankName,
        param1: 'withdrawal_request',
        param2: mchOrderNo
      };

      const response = await axios.post(`${BASE_URL}/withdrawal/create`, withdrawalData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSuccess(`Withdrawal request of ₹${amount.toFixed(2)} submitted successfully! Reference ID: ${mchOrderNo}`);
        setWithdrawAmount('');
        setBankDetails({
          accountHolderName: '',
          bankName: '',
          accountNumber: '',
          ifscCode: '',
          confirmAccountNumber: ''
        });
        
        // Refresh balance and history
        fetchUserBalance();
        fetchWithdrawalHistory();
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(response.data.message || 'Withdrawal failed');
      }
    } catch (err) {
      console.error('Withdrawal error:', err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to process withdrawal. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle quick amount selection
  const quickAmounts = [1000, 2000, 5000, 10000, 25000];

  const handleQuickAmount = (amount) => {
    setWithdrawAmount(amount.toString());
    setError('');
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch(status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  // Check responsive layout
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  function openDrawer() { setDrawerClose(false); setDrawerOpen(true); }
  function closeDrawer() {
    setDrawerClose(true);
    setTimeout(() => { setDrawerOpen(false); setDrawerClose(false); }, 220);
  }

  function pickTop(id) { setActiveTop(id); setActiveCat(''); if (isMobile) closeDrawer(); }
  function pickCat(id) { setActiveCat(id); setActiveTop(''); if (isMobile) closeDrawer(); }

  const displayGames = activeProv === 'All'
    ? ALL_GAMES
    : ALL_GAMES.filter(g => g.provider === activeProv);

  const topGames = displayGames.filter(g => g.badge === 'hot' || g.badge === 'jackpot');
  const newGames = displayGames.filter(g => g.badge === 'new');

  const BannerSlider = () => {
    const [cur, setCur] = useState(0);
    const timerRef = useRef(null);

    const go = useCallback((idx) => {
      setCur((idx + BANNERS.length) % BANNERS.length);
    }, []);

    useEffect(() => {
      timerRef.current = setInterval(() => go(cur + 1), 4500);
      return () => clearInterval(timerRef.current);
    }, [cur, go]);

    const IconArrow = () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
      </svg>
    );

    return (
      <div className="relative rounded-xl overflow-hidden mb-6 bg-gray-900">
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${cur * 100}%)` }}>
          {BANNERS.map((b, i) => (
            <div key={i} className="min-w-full relative flex-shrink-0 h-[220px] md:h-[280px] lg:h-[320px]">
              <img 
                src={b.img} 
                alt={b.title} 
                className="w-full h-full object-cover block"
                onError={e => { e.target.style.display = 'none'; }} 
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent flex flex-col justify-center p-7 md:p-9">
                <span className="font-barlow text-[11px] font-bold tracking-[2px] uppercase text-yellow-400 mb-1.5">{b.tag}</span>
                <div className="font-barlow text-3xl md:text-4xl font-black text-white leading-tight mb-2.5 max-w-xs">{b.title}</div>
                <button className="inline-flex items-center gap-1.5 bg-blue-600 text-white border-none rounded-lg px-5 py-2.5 cursor-pointer font-barlow text-sm font-bold tracking-wide uppercase hover:bg-blue-700 transition-all hover:scale-105 w-fit">
                  {b.cta} <IconArrow />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button 
          className="absolute top-1/2 -translate-y-1/2 left-3 w-9 h-9 rounded-full border-none cursor-pointer bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-base font-bold hover:bg-white/30 transition-all z-10"
          onClick={() => go(cur - 1)}
        >‹</button>
        <button 
          className="absolute top-1/2 -translate-y-1/2 right-3 w-9 h-9 rounded-full border-none cursor-pointer bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-base font-bold hover:bg-white/30 transition-all z-10"
          onClick={() => go(cur + 1)}
        >›</button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {BANNERS.map((_, i) => (
            <button 
              key={i} 
              className={`w-2 h-2 rounded-full border-none cursor-pointer transition-all ${cur === i ? 'bg-white w-5 rounded-md' : 'bg-white/40'}`}
              onClick={() => go(i)}
              aria-label={`Slide ${i + 1}`} 
            />
          ))}
        </div>
      </div>
    );
  };

  const GameCard = ({ game }) => {
    const IconPlay = () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    );

    return (
      <div className="rounded-xl overflow-hidden bg-white shadow-md cursor-pointer transition-all hover:-translate-y-1 hover:shadow-blue-200/50 relative group">
        <div className="relative">
          <img
            className="w-full aspect-[3/4] object-cover block"
            src={game.img}
            alt={game.name}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
          <div className="w-full aspect-[3/4] hidden items-center justify-center text-4xl bg-gradient-to-br from-indigo-100 to-indigo-200 absolute inset-0">{game.emoji || '🎮'}</div>
          {game.badge && (
            <span className={`absolute top-2 left-2 font-barlow text-[10px] font-extrabold px-1.5 py-0.5 rounded-md tracking-wide uppercase ${
              game.badge === 'new' ? 'bg-green-600 text-white' : 
              game.badge === 'jackpot' ? 'bg-purple-600 text-white' : 
              'bg-red-500 text-white'
            }`}>
              {game.badge.toUpperCase()}
            </span>
          )}
          <div className="absolute inset-0 top-0 bottom-auto h-[calc(100%-48px)] bg-blue-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-12 h-12 rounded-full border-4 border-white flex items-center justify-center text-lg text-white bg-white/20">
              <IconPlay />
            </div>
          </div>
        </div>
        <div className="p-2">
          <div className="text-xs font-bold text-gray-900 truncate">{game.name}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">{game.provider}</div>
        </div>
      </div>
    );
  };

  const GameSection = ({ title, games, showCount = false, totalCount = 0 }) => {
    const IconArrow = () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
      </svg>
    );

    if (!games || games.length === 0) return null;
    return (
      <div className="mb-7">
        <div className="flex items-center justify-between mb-3.5">
          <span className="font-barlow text-xl font-extrabold text-gray-900 tracking-wide">{title}</span>
          {showCount ? (
            <span className="text-xs font-semibold text-gray-500">{totalCount} games</span>
          ) : (
            <button className="text-xs font-bold text-blue-600 bg-none border-none cursor-pointer flex items-center gap-1 hover:opacity-75 transition-opacity">
              See all <IconArrow />
            </button>
          )}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3 mb-7">
          {games.map((g, i) => <GameCard key={i} game={g} />)}
        </div>
      </div>
    );
  };

  const MobileDrawer = () => {
    if (!drawerOpen) return null;
    const SidebarContent = () => (
      <div className="pb-6">
        <div className="text-[10px] font-bold text-gray-500 tracking-[0.8px] uppercase mb-2 px-1">Categories</div>
        {SB_TOP.map(item => (
          <button 
            key={item.id} 
            className={`flex items-center gap-2.5 w-full py-2 px-2.5 rounded-lg border-none bg-transparent cursor-pointer font-nunito text-[13.5px] font-semibold text-gray-900 whitespace-nowrap text-left transition-colors mb-0.5 hover:bg-gray-100 ${
              activeTop === item.id ? 'bg-indigo-100 text-indigo-700 font-bold' : ''
            }`} 
            onClick={() => pickTop(item.id)}
          >
            <span className="text-lg leading-none w-5.5 text-center flex-shrink-0">{item.emoji}</span>{item.label}
          </button>
        ))}
        <button 
          className="flex items-center w-full py-2.5 px-3 rounded-lg border-none bg-blue-600 cursor-pointer font-barlow text-sm font-extrabold text-white tracking-wide uppercase gap-2 transition-all hover:bg-blue-700 mb-0.5"
          onClick={() => pickTop('GLORY_CLUB')}
        >
          <span className="text-base">🛡️</span>
          <span className="flex-1 text-left">GLORY CLUB</span>
          <span className="text-sm">›</span>
        </button>
        <div className="h-px bg-gray-200 my-2.5 mx-1" />
        {SB_CATS.map(cat => (
          <button 
            key={cat.id} 
            className={`flex items-center gap-2.5 w-full py-1.5 px-2.5 rounded-lg border-none bg-transparent cursor-pointer font-nunito text-[13px] font-semibold text-gray-900 whitespace-nowrap text-left transition-colors mb-0.5 hover:bg-gray-100 ${
              activeCat === cat.id ? 'bg-indigo-100 text-indigo-700 font-bold' : ''
            }`} 
            onClick={() => pickCat(cat.id)}
          >
            <span className="text-lg leading-none w-6 text-center flex-shrink-0">{cat.emoji}</span>{cat.label}
          </button>
        ))}
      </div>
    );

    const Logo = () => (
      <div className="flex flex-col items-center cursor-pointer leading-none gap-px flex-shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-base">👑</span>
          <span className="font-barlow text-[22px] font-black text-blue-600 tracking-[1.5px]">GLORY</span>
        </div>
        <span className="font-barlow text-[10px] font-bold text-red-600 tracking-[3.5px] uppercase">Casino</span>
      </div>
    );

    return (
      <>
        <div 
          className={`fixed inset-0 bg-black/40 z-[200] animate-in fade-in duration-200 ${drawerClose ? 'animate-out fade-out duration-200' : ''}`}
          onClick={closeDrawer}
          aria-hidden="true" 
        />
        <nav 
          className={`fixed top-0 left-0 w-[min(260px,86vw)] h-full bg-white z-[201] shadow-xl flex flex-col overflow-y-auto animate-in slide-in-from-left duration-300 ${
            drawerClose ? 'animate-out slide-out-to-left duration-200' : ''
          }`}
          aria-label="Mobile nav"
        >
          <div className="flex items-center justify-between p-3.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <Logo />
            <button className="bg-none border-none cursor-pointer text-gray-500 p-1 rounded-md flex items-center justify-center hover:text-red-600 transition-colors" onClick={closeDrawer} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="p-2.5 pb-6 flex-1">
            <SidebarContent />
          </div>
        </nav>
      </>
    );
  };

  return (
    <div className="min-h-screen font-roboto bg-gray-100">
      <Header activeHNav={activeHNav} setActiveHNav={setActiveHNav} drawerOpen={drawerOpen} openDrawer={openDrawer} closeDrawer={closeDrawer} />
      
      <div className="relative">
        <div className="flex">
          <div className="lg:block flex-shrink-0">
            <Sidebar isMobile={isMobile} sbCollapsed={sbCollapsed} activeTop={activeTop} activeCat={activeCat} pickTop={pickTop} pickCat={pickCat} />
          </div>
          
          <main className="flex-1 min-w-0">
            <div className="p-5 pb-10 w-full">
              <BannerSlider />
              
              {/* Category Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
                {PILL_CATS.map(cat => (
                  <button 
                    key={cat.id} 
                    className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full border-2 border-gray-200 bg-white cursor-pointer font-nunito text-xs font-bold text-gray-500 whitespace-nowrap transition-all flex-shrink-0 hover:border-blue-600 hover:text-blue-600 hover:bg-indigo-50 ${
                      activeCat === cat.id ? 'bg-blue-600 border-blue-600 text-white' : ''
                    }`}
                    onClick={() => pickCat(cat.id)}
                  >
                    <span className="text-base leading-none">{cat.emoji}</span>{cat.label}
                  </button>
                ))}
              </div>

              {/* Withdrawal Section */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
                <div className="border-b border-gray-200">
                  <div className="flex">
                    <button
                      className={`px-6 py-3 font-semibold text-sm transition-colors ${showWithdrawForm ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setShowWithdrawForm(true)}
                    >
                      Withdraw Funds
                    </button>
                    <button
                      className={`px-6 py-3 font-semibold text-sm transition-colors ${!showWithdrawForm ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setShowWithdrawForm(false)}
                    >
                      Withdrawal History
                    </button>
                  </div>
                </div>

                {showWithdrawForm ? (
                  <div className="p-6">
                    {/* Balance Display */}
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 mb-6 text-white">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm opacity-90 mb-1">Available Balance</p>
                          <p className="text-3xl font-bold">₹{userBalance.toFixed(2)}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Error and Success Messages */}
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        {success}
                      </div>
                    )}

                    <form onSubmit={handleWithdrawal}>
                      {/* Amount Section */}
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Withdrawal Amount (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="number"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="500"
                            max={userBalance}
                            step="100"
                            required
                          />
                        </div>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {quickAmounts.map(amount => (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => handleQuickAmount(amount)}
                              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              ₹{amount.toLocaleString()}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Minimum: ₹500 | Maximum: ₹50,000
                        </p>
                      </div>

                      {/* Bank Details Section */}
                      <div className="mb-6">
                        <h3 className="text-md font-semibold text-gray-800 mb-3">Bank Account Details</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Account Holder Name
                            </label>
                            <input
                              type="text"
                              value={bankDetails.accountHolderName}
                              onChange={(e) => setBankDetails({...bankDetails, accountHolderName: e.target.value})}
                              placeholder="As per bank records"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bank Name
                            </label>
                            <input
                              type="text"
                              value={bankDetails.bankName}
                              onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                              placeholder="e.g., State Bank of India"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Account Number
                            </label>
                            <input
                              type="text"
                              value={bankDetails.accountNumber}
                              onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value.replace(/\D/g, '')})}
                              placeholder="Enter account number"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              maxLength="18"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Confirm Account Number
                            </label>
                            <input
                              type="text"
                              value={bankDetails.confirmAccountNumber}
                              onChange={(e) => setBankDetails({...bankDetails, confirmAccountNumber: e.target.value.replace(/\D/g, '')})}
                              placeholder="Re-enter account number"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              maxLength="18"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              IFSC Code
                            </label>
                            <input
                              type="text"
                              value={bankDetails.ifscCode}
                              onChange={(e) => setBankDetails({...bankDetails, ifscCode: e.target.value.toUpperCase()})}
                              placeholder="e.g., SBIN0001234"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                              maxLength="11"
                              required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              IFSC code is 11 characters (e.g., SBIN0001234)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Important Notes */}
                      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm font-semibold text-yellow-800 mb-2">Important Notes:</p>
                        <ul className="text-xs text-yellow-700 space-y-1">
                          <li>• Withdrawal requests are processed within 24-48 hours</li>
                          <li>• First withdrawal requires account verification</li>
                          <li>• Ensure bank details are correct to avoid delays</li>
                          <li>• Withdrawal charges: ₹0 (Free for all users)</li>
                          <li>• Processing time may vary during bank holidays</li>
                        </ul>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
                          loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </span>
                        ) : (
                          'Submit Withdrawal Request'
                        )}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="p-6">
                    {withdrawalHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500">No withdrawal requests yet</p>
                        <button
                          onClick={() => setShowWithdrawForm(true)}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Make a Withdrawal
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {withdrawalHistory.map((withdrawal) => (
                          <div key={withdrawal._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  ₹{(withdrawal.amount / 100).toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDate(withdrawal.createdAt)}
                                </p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(withdrawal.status)}`}>
                                {getStatusText(withdrawal.status)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-2">
                              <p>Bank: {withdrawal.bankName || 'N/A'}</p>
                              <p className="text-xs mt-1">
                                Order ID: {withdrawal.mchOrderNo}
                              </p>
                              {withdrawal.rejectReason && (
                                <p className="text-xs text-red-600 mt-1">
                                  Reason: {withdrawal.rejectReason}
                                </p>
                              )}
                              {withdrawal.utr && (
                                <p className="text-xs text-green-600 mt-1">
                                  UTR: {withdrawal.utr}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Provider Filters */}
              <div className="flex gap-2.5 overflow-x-auto pb-1 mb-6 scrollbar-none items-center">
                <span className="text-xs font-bold text-gray-500 flex-shrink-0 mr-0.5">Provider:</span>
                {PROVIDERS.map(p => (
                  <button 
                    key={p} 
                    className={`py-1.5 px-3.5 rounded-full border-2 border-gray-200 bg-white text-xs font-bold text-gray-500 cursor-pointer whitespace-nowrap flex-shrink-0 transition-all hover:bg-blue-600 hover:border-blue-600 hover:text-white ${
                      activeProv === p ? 'bg-blue-600 border-blue-600 text-white' : ''
                    }`}
                    onClick={() => setActiveProv(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <GameSection title="🔥 Top Games" games={topGames} />
              <GameSection title="🆕 New Arrivals" games={newGames} />
              <GameSection title="🎮 All Games" games={displayGames} showCount={true} totalCount={displayGames.length} />
            </div>
          </main>
        </div>
      </div>
      
      <MobileDrawer />
    </div>
  );
};

export default Withdraw;