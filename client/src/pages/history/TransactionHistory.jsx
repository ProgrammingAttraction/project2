import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowUp, FiArrowDown, FiDollarSign, FiTrendingUp, FiTrendingDown, FiClock, FiFilter, FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';
import { FaMoneyBillWave, FaWallet, FaSpinner } from 'react-icons/fa';
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
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [balance, setBalance] = useState(0);
  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0
  });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [itemsPerPageOptions] = useState([5, 10, 20, 50]);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch transaction data from combined endpoint
  useEffect(() => {
    fetchAllTransactions();
  }, []);

  const fetchAllTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const response = await axios.get(`${import.meta.env.VITE_API_KEY_Base_URL}/api/transactions/all`, config);
      
      if (response.data.success) {
        const { transactions: allTransactions, stats: transactionStats, balance: currentBalance } = response.data.data;
        
        const formattedTransactions = allTransactions.map(transaction => ({
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          status: transaction.status,
          date: new Date(transaction.date),
          orderId: transaction.orderId,
          utr: transaction.utr,
          paymentMethod: transaction.type === 'deposit' 
            ? 'Online Payment' 
            : transaction.details?.method || 'Bank Transfer',
          details: transaction.details
        }));
        
        setTransactions(formattedTransactions);
        setBalance(currentBalance);
        setStats({
          totalDeposits: transactionStats.totalDeposits,
          totalWithdrawals: transactionStats.totalWithdrawals,
          pendingWithdrawals: transactionStats.pendingWithdrawals
        });
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
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

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
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
    switch(status?.toLowerCase()) {
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'failed': return 'Failed';
      case 'timeout': return 'Timeout';
      case 'cancelled': return 'Cancelled';
      default: return status || 'Unknown';
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

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>
            {formatBDT(value)}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color.replace('text', 'bg').replace('800', '100')}`}>
          <Icon className="text-xl" />
        </div>
      </div>
    </div>
  );

  const FilterButton = ({ value, label, count }) => (
    <button
      onClick={() => setFilter(value)}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
        filter === value
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
      }`}
    >
      {value === 'all' && <FiFilter className="text-sm" />}
      {value === 'deposit' && <FiTrendingUp className="text-sm" />}
      {value === 'withdraw' && <FiTrendingDown className="text-sm" />}
      {label} {count !== undefined && `(${count})`}
    </button>
  );

  const Pagination = () => {
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Show</span>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {itemsPerPageOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <span>entries</span>
          <span className="ml-4">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTransactions.length)} of {filteredTransactions.length} entries
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-md transition-colors ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            <FiChevronsLeft className="text-sm" />
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-md transition-colors ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            <FiChevronLeft className="text-sm" />
          </button>

          {startPage > 1 && (
            <>
              <button
                onClick={() => handlePageChange(1)}
                className="px-3 py-1 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              >
                1
              </button>
              {startPage > 2 && <span className="px-2 text-gray-500">...</span>}
            </>
          )}

          {pageNumbers.map(number => (
            <button
              key={number}
              onClick={() => handlePageChange(number)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                currentPage === number
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {number}
            </button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="px-2 text-gray-500">...</span>}
              <button
                onClick={() => handlePageChange(totalPages)}
                className="px-3 py-1 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-md transition-colors ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            <FiChevronRight className="text-sm" />
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-md transition-colors ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            <FiChevronsRight className="text-sm" />
          </button>
        </div>
      </div>
    );
  };

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
                <FaMoneyBillWave className="text-base text-blue-600" />
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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Current Balance</p>
                      <p className="text-3xl font-bold mt-2">{formatBDT(balance)}</p>
                    </div>
                    <FaWallet className="text-3xl text-blue-200" />
                  </div>
                </div>
                <StatCard title="Total Deposits" value={stats.totalDeposits} icon={FiTrendingUp} color="text-green-600" />
                <StatCard title="Total Withdrawals" value={stats.totalWithdrawals} icon={FiTrendingDown} color="text-red-600" />
                <StatCard title="Pending Withdrawals" value={stats.pendingWithdrawals} icon={FiClock} color="text-yellow-600" />
              </div>

              {/* Filters */}
              <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                <FilterButton value="all" label="All Transactions" count={transactions.length} />
                <FilterButton value="deposit" label="Deposits" count={transactions.filter(t => t.type === 'deposit').length} />
                <FilterButton value="withdraw" label="Withdrawals" count={transactions.filter(t => t.type === 'withdraw').length} />
              </div>

              {/* Transactions Table */}
              {filteredTransactions.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                  <FiDollarSign className="text-6xl text-gray-300 mx-auto mb-4" />
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
                <>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Order ID</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment Method</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">UTR/Reference</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {currentTransactions.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                  transaction.type === 'deposit' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {transaction.type === 'deposit' ? <FiArrowUp className="text-xs" /> : <FiArrowDown className="text-xs" />}
                                  {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-mono text-gray-700">{transaction.orderId}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-sm font-semibold ${
                                  transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {transaction.type === 'deposit' ? '+' : '-'} {formatBDT(transaction.amount)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                                  {transaction.status === 'processing' && <FaSpinner className="text-xs animate-spin" />}
                                  {getStatusText(transaction.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-gray-600 capitalize">{transaction.paymentMethod}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-mono text-gray-600">
                                  {transaction.utr || '-'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-gray-600">{formatDate(transaction.date)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && <Pagination />}
                </>
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