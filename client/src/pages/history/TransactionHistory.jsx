import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header/Header';
import Sidebar from '../../components/sidebar/Sidebar';
import axios from 'axios';

const TransactionHistory = () => {
  const navigate = useNavigate();
  const [activeHNav, setActiveHNav] = useState('CASINO');
  const [activeTop, setActiveTop] = useState('Lobby');
  const [activeCat, setActiveCat] = useState('Top Games');
  const [sbCollapsed, setSbCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerClose, setDrawerClose] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'deposit', 'withdraw'
  const [balance, setBalance] = useState(0);
  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0
  });

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch transaction data
  useEffect(() => {
    fetchTransactionData();
  }, []);

  const fetchTransactionData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Fetch deposits
      const depositsRes = await axios.get('/api/payment/deposits', config);
      
      // Fetch withdrawals
      const withdrawalsRes = await axios.get('/api/withdraw/history', config);
      
      // Fetch current balance
      const balanceRes = await axios.get('/api/balance', config);

      // Combine and format transactions
      const depositTransactions = depositsRes.data.data.map(deposit => ({
        id: deposit._id,
        type: 'deposit',
        amount: deposit.realAmount ? deposit.realAmount / 100 : deposit.amount / 100,
        status: deposit.status,
        date: new Date(deposit.createdAt),
        orderId: deposit.mchOrderNo,
        utr: deposit.utr,
        paymentMethod: 'Online Payment',
        details: {
          productId: deposit.productId,
          payOrderId: deposit.payOrderId
        }
      }));

      const withdrawTransactions = withdrawalsRes.data.data.withdrawals.map(withdraw => ({
        id: withdraw._id,
        type: 'withdraw',
        amount: withdraw.amount,
        status: withdraw.status,
        date: new Date(withdraw.requestedAt),
        orderId: withdraw._id,
        utr: withdraw.transactionId,
        paymentMethod: withdraw.withdrawalMethod,
        details: {
          accountDetails: withdraw.accountDetails,
          remarks: withdraw.remarks
        }
      }));

      // Combine and sort by date (newest first)
      const allTransactions = [...depositTransactions, ...withdrawTransactions]
        .sort((a, b) => b.date - a.date);

      setTransactions(allTransactions);
      setBalance(balanceRes.data.data.balance);
      
      // Calculate stats
      const totalDeposits = depositTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalWithdrawals = withdrawTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const pendingWithdrawals = withdrawTransactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

      setStats({
        totalDeposits,
        totalWithdrawals,
        pendingWithdrawals
      });

    } catch (error) {
      console.error('Error fetching transactions:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

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

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  const getStatusColor = (status, type) => {
    switch(status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'timeout':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      case 'timeout': return 'Timeout';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const formatBDT = (amount) => {
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>
            {formatBDT(value)}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color.replace('text', 'bg').replace('800', '100')}`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  const TransactionRow = ({ transaction }) => (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            transaction.type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <span className="text-xl">
              {transaction.type === 'deposit' ? '💰' : '💸'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 capitalize">
                {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status, transaction.type)}`}>
                {getStatusText(transaction.status)}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
              <div>Order ID: {transaction.orderId}</div>
              {transaction.utr && <div>UTR/Ref: {transaction.utr}</div>}
              <div>{formatDate(transaction.date)}</div>
              {transaction.details?.paymentMethod && (
                <div className="capitalize">Method: {transaction.details.paymentMethod}</div>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${
            transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
          }`}>
            {transaction.type === 'deposit' ? '+' : '-'} {formatBDT(transaction.amount)}
          </div>
          {transaction.status === 'pending' && transaction.type === 'withdraw' && (
            <div className="text-xs text-yellow-600 mt-1">Awaiting processing</div>
          )}
        </div>
      </div>
    </div>
  );

  const FilterButton = ({ value, label, count }) => (
    <button
      onClick={() => setFilter(value)}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
        filter === value
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
      }`}
    >
      {label} {count !== undefined && `(${count})`}
    </button>
  );

  const MobileDrawer = () => {
    if (!drawerOpen) return null;
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
        >
          <div className="flex items-center justify-between p-3.5 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col items-center cursor-pointer leading-none gap-px">
              <div className="flex items-center gap-1">
                <span className="text-base">👑</span>
                <span className="font-barlow text-[22px] font-black text-blue-600 tracking-[1.5px]">GLORY</span>
              </div>
              <span className="font-barlow text-[10px] font-bold text-red-600 tracking-[3.5px] uppercase">Casino</span>
            </div>
            <button className="p-1 rounded-md hover:text-red-600 transition-colors" onClick={closeDrawer}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="p-2.5 pb-6">
            {/* Sidebar content can be added here if needed */}
          </div>
        </nav>
      </>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-roboto bg-gray-100">
      <Header 
        activeHNav={activeHNav} 
        setActiveHNav={setActiveHNav} 
        drawerOpen={drawerOpen} 
        openDrawer={openDrawer} 
        closeDrawer={closeDrawer} 
      />
      
      <div className="relative">
        <div className="flex">
          <div className="lg:block flex-shrink-0">
            <Sidebar 
              isMobile={isMobile} 
              sbCollapsed={sbCollapsed} 
              activeTop={activeTop} 
              activeCat={activeCat} 
              pickTop={pickTop} 
              pickCat={pickCat} 
            />
          </div>
          
          <main className="flex-1 min-w-0">
            <div className="p-5 pb-10">
              {/* Page Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
                <p className="text-gray-500 text-sm mt-1">View all your deposits and withdrawals</p>
              </div>

              {/* Balance and Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow-lg">
                  <p className="text-blue-100 text-sm font-medium">Current Balance</p>
                  <p className="text-3xl font-bold mt-2">{formatBDT(balance)}</p>
                </div>
                <StatCard title="Total Deposits" value={stats.totalDeposits} icon="💰" color="text-green-600" />
                <StatCard title="Total Withdrawals" value={stats.totalWithdrawals} icon="💸" color="text-red-600" />
                <StatCard title="Pending Withdrawals" value={stats.pendingWithdrawals} icon="⏳" color="text-yellow-600" />
              </div>

              {/* Filters */}
              <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                <FilterButton value="all" label="All Transactions" count={transactions.length} />
                <FilterButton value="deposit" label="Deposits" count={transactions.filter(t => t.type === 'deposit').length} />
                <FilterButton value="withdraw" label="Withdrawals" count={transactions.filter(t => t.type === 'withdraw').length} />
              </div>

              {/* Transactions List */}
              {filteredTransactions.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
                  <p className="text-gray-500 mb-4">
                    {filter === 'all' 
                      ? "You haven't made any deposits or withdrawals yet" 
                      : filter === 'deposit' 
                      ? "You haven't made any deposits yet" 
                      : "You haven't made any withdrawals yet"}
                  </p>
                  <button 
                    onClick={() => navigate('/deposit')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Make a Deposit
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map(transaction => (
                    <TransactionRow key={transaction.id} transaction={transaction} />
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      
      <MobileDrawer />
    </div>
  );
};

export default TransactionHistory;