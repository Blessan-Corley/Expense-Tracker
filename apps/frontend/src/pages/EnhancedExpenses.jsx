import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  X, 
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  TrendingDown,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Upload,
  SortAsc,
  SortDesc,
  Grid,
  List as ListIcon,
  Eye,
  EyeOff,
  MapPin,
  FileText,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useTransactionStore } from '../store/transactionStore';
import CompassLoader from '../components/CompassLoader';
import { formatCurrency } from '../utils/currency';
import { toast } from 'react-hot-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import ConfirmModal from '../components/ConfirmModal';

const EnhancedExpenses = () => {
  const location = useLocation();
  const {
    transactions,
    filters,
    isLoading,
    currentPage,
    setFilters,
    clearFilters,
    fetchTransactions,
    updateTransaction,
    deleteTransaction,
    setTransactionVisibility,
    exportTransactions,
    categories: apiCategories,
    fetchCategories
  } = useTransactionStore();

  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [exportPeriod, setExportPeriod] = useState('monthly');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const visibilityFromQuery = params.get('visibility');
    if (visibilityFromQuery === 'hidden' || visibilityFromQuery === 'visible' || visibilityFromQuery === 'all') {
      setFilters({ visibility: visibilityFromQuery });
    }
  }, [location.search, setFilters]);

  useEffect(() => {
    fetchCategories();
    fetchTransactions({ 
      ...filters, 
      sortBy, 
      sortOrder,
      page: currentPage,
      limit: 12
    });
  }, [fetchTransactions, fetchCategories, filters, sortBy, sortOrder, currentPage]);

  const categoryOptions = [
    ...(apiCategories?.expense || []),
    ...(apiCategories?.income || [])
  ].filter((item, index, self) => self.indexOf(item) === index);

  const paymentMethods = [
    'Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 
    'UPI', 'Digital Wallet', 'Check', 'Other'
  ];

  const handleDelete = async (id) => {
    setTransactionToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (transactionToDelete) {
      const result = await deleteTransaction(transactionToDelete);
      if (result.success) {
        toast.success('Transaction deleted successfully!');
      } else {
        toast.error(result.error);
      }
      setShowDeleteModal(false);
      setTransactionToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) return;
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedTransactions.length === 0) return;

    for (const id of selectedTransactions) {
      await deleteTransaction(id);
    }
    toast.success(`${selectedTransactions.length} transactions deleted successfully!`);
    setSelectedTransactions([]);
    setShowBulkDeleteModal(false);
  };

  const openEditModal = (transaction) => {
    setEditingTransaction(transaction);
    setEditFormData({
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      subcategory: transaction.subcategory || '',
      description: transaction.description,
      date: format(new Date(transaction.date), 'yyyy-MM-dd'),
      paymentMethod: transaction.paymentMethod,
      location: transaction.location || '',
      notes: transaction.notes || '',
      tags: transaction.tags || [],
      attachments: transaction.attachments || []
    });
  };

  const closeEditModal = () => {
    setEditingTransaction(null);
    setEditFormData(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTransaction || !editFormData) return;

    const payload = {
      ...editFormData,
      amount: Number(editFormData.amount),
      subcategory: editFormData.subcategory || null,
      location: editFormData.location || null,
      notes: editFormData.notes || null
    };

    const result = await updateTransaction(editingTransaction.id, payload);
    if (result.success) {
      toast.success('Transaction updated successfully!');
      closeEditModal();
    } else {
      toast.error(result.error);
    }
  };

  const toggleHiddenStatus = async (transaction) => {
    const result = await setTransactionVisibility(transaction.id, !transaction.isHidden);
    if (result.success) {
      toast.success(transaction.isHidden ? 'Transaction is now visible' : 'Transaction hidden successfully');
    } else {
      toast.error(result.error);
    }
  };

  const handleExport = async () => {
    try {
      const result = await exportTransactions(filters);
      if (result.success) {
        toast.success('Transactions exported successfully!');
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to export transactions');
    }
  };

  const getPeriodDateRange = (period) => {
    const now = new Date();
    if (period === 'quarterly') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterStartMonth, 1);
      const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
      return { start, end };
    }

    if (period === 'yearly') {
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31)
      };
    }

    return {
      start: startOfMonth(now),
      end: endOfMonth(now)
    };
  };

  const handlePeriodExport = async () => {
    try {
      const { start, end } = getPeriodDateRange(exportPeriod);
      const result = await exportTransactions({
        type: 'EXPENSE',
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd')
      });
      if (result.success) {
        toast.success(`${exportPeriod.charAt(0).toUpperCase() + exportPeriod.slice(1)} expenses exported successfully!`);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to export monthly expenses');
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const toggleTransactionSelection = (id) => {
    setSelectedTransactions(prev => 
      prev.includes(id) 
        ? prev.filter(tid => tid !== id)
        : [...prev, id]
    );
  };

  const selectAllTransactions = () => {
    setSelectedTransactions(
      selectedTransactions.length === transactions.length 
        ? [] 
        : transactions.map(t => t.id)
    );
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Food & Dining': 'bg-green-100 text-green-800 border-green-200',
      'Transportation': 'bg-blue-100 text-blue-800 border-blue-200',
      'Shopping': 'bg-purple-100 text-purple-800 border-purple-200',
      'Bills & Utilities': 'bg-red-100 text-red-800 border-red-200',
      'Entertainment': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Health & Fitness': 'bg-pink-100 text-pink-800 border-pink-200',
      'Travel': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Education': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Other': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTypeIcon = (type) => {
    return type === 'INCOME' ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-600" />
    );
  };

  const getTypeColor = (type) => {
    return type === 'INCOME' 
      ? 'text-green-600 bg-green-50 border-green-200'
      : 'text-red-600 bg-red-50 border-red-200';
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'visibility') return value && value !== 'all';
    return value !== '' && value !== null;
  });

  const getDisplayDescription = (transaction) => (
    transaction.isHidden ? 'Hidden Transaction' : transaction.description
  );

  const getDisplaySubDescription = (transaction) => (
    transaction.isHidden ? 'Anonymous entry' : transaction.subcategory
  );

  const TransactionCard = ({ transaction }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
    >
      <div className={`p-4 ${getTypeColor(transaction.type)}`}>
        <div className="flex items-center justify-between mb-2">
          {getTypeIcon(transaction.type)}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedTransactions.includes(transaction.id)}
              onChange={() => toggleTransactionSelection(transaction.id)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            {transaction.isHidden && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-gray-900/70 text-white">
                Hidden
              </span>
            )}
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/20">
              {transaction.type}
            </span>
          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-900">{getDisplayDescription(transaction)}</h3>
        <p className="text-sm opacity-80">{format(new Date(transaction.date), 'MMM dd, yyyy')}</p>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1">Amount</div>
          <div className={`text-2xl font-bold ${
            transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(transaction.amount)}
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Category</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(transaction.category)}`}>
              {transaction.category}
            </span>
          </div>
          
          {getDisplaySubDescription(transaction) && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Subcategory</span>
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {getDisplaySubDescription(transaction)}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Payment</span>
            <span className="text-sm text-gray-900">{transaction.paymentMethod}</span>
          </div>

          {transaction.tags && transaction.tags.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Tags</span>
              <div className="flex flex-wrap gap-1">
                {transaction.tags.map((tag, index) => (
                  <span key={index} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {transaction.location && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Location</span>
              <span className="text-sm text-gray-600 flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                {transaction.location}
              </span>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openEditModal(transaction)}
            className="flex-1 bg-blue-100 text-blue-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors duration-200"
          >
            <Edit className="h-4 w-4 mx-auto" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleHiddenStatus(transaction)}
            className="flex-1 bg-green-100 text-green-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors duration-200"
          >
            {transaction.isHidden ? (
              <EyeOff className="h-4 w-4 mx-auto" />
            ) : (
              <Eye className="h-4 w-4 mx-auto" />
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleDelete(transaction.id)}
            className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors duration-200"
          >
            <Trash2 className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  const TransactionRow = ({ transaction }) => (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="hover:bg-gray-50 transition-colors duration-200"
    >
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={selectedTransactions.includes(transaction.id)}
          onChange={() => toggleTransactionSelection(transaction.id)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {getTypeIcon(transaction.type)}
          <div className="ml-2">
            <div className="text-sm text-gray-900 font-medium">
              {format(new Date(transaction.date), 'MMM dd')}
            </div>
            {/* Mobile: Show description under date */}
            <div className="text-xs text-gray-500 sm:hidden">
              {getDisplayDescription(transaction)}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 sm:px-6 py-4 hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-900 font-medium">{getDisplayDescription(transaction)}</div>
          {transaction.isHidden && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">Hidden</span>
          )}
        </div>
        {getDisplaySubDescription(transaction) && (
          <div className="text-xs text-gray-500">{getDisplaySubDescription(transaction)}</div>
        )}
      </td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(transaction.category)}`}>
          {transaction.category}
        </span>
      </td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
        {transaction.paymentMethod}
      </td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
        <div className={`text-sm font-semibold ${
          transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
        }`}>
          {formatCurrency(transaction.amount)}
        </div>
        {/* Mobile: Show category under amount */}
        <div className="text-xs text-gray-500 md:hidden">
          {transaction.category}
        </div>
      </td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
        {transaction.tags && transaction.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {transaction.tags.slice(0, 2).map((tag, index) => (
              <span key={index} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                {tag}
              </span>
            ))}
            {transaction.tags.length > 2 && (
              <span className="text-xs text-gray-500">+{transaction.tags.length - 2}</span>
            )}
          </div>
        )}
      </td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right">
        <div className="flex space-x-1">
          <button
            onClick={() => toggleHiddenStatus(transaction)}
            className="text-green-600 hover:text-green-900 p-1"
          >
            {transaction.isHidden ? (
              <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : (
              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
          </button>
          <button
            onClick={() => openEditModal(transaction)}
            className="text-blue-600 hover:text-blue-900 p-1"
          >
            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          <button
            onClick={() => handleDelete(transaction.id)}
            className="text-red-600 hover:text-red-900 p-1"
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </div>
      </td>
    </motion.tr>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-amber-600 bg-clip-text text-transparent">
              Journey Log
            </h1>
            <p className="mt-2 text-gray-600">
              Navigate through your financial journey with detailed transaction records
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExport}
              className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-all duration-200"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </motion.button>
            <select
              value={exportPeriod}
              onChange={(e) => setExportPeriod(e.target.value)}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-xl border border-gray-200 text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePeriodExport}
              className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-all duration-200"
            >
              <Download className="h-4 w-4" />
              <span>Export Period</span>
            </motion.button>
            <Link to="/add-expense">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5" />
                <span>Add Transaction</span>
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6 bg-white rounded-2xl shadow-lg border border-gray-100"
      >
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ search: e.target.value })}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  placeholder="Search transactions..."
                />
              </div>

              {/* Filter Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-3 border rounded-xl font-medium transition-all duration-200 ${
                  hasActiveFilters || showFilters
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </motion.button>
            </div>

            {/* View Controls */}
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex bg-gray-100 rounded-lg p-1">
                {[
                  { label: 'All', value: 'all' },
                  { label: 'Visible', value: 'visible' },
                  { label: 'Hidden', value: 'hidden' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilters({ visibility: option.value })}
                    className={`px-3 py-2 rounded text-xs font-medium ${
                      (filters.visibility || 'all') === option.value
                        ? 'bg-white shadow text-blue-700'
                        : 'text-gray-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : 'text-gray-500'}`}
                >
                  <ListIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : 'text-gray-500'}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-gray-100"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={filters.type || ''}
                    onChange={(e) => setFilters({ type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">All types</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visibility
                  </label>
                  <select
                    value={filters.visibility || 'all'}
                    onChange={(e) => setFilters({ visibility: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="visible">Visible</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={filters.category || ''}
                    onChange={(e) => setFilters({ category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">All categories</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={filters.paymentMethod || ''}
                    onChange={(e) => setFilters({ paymentMethod: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">All methods</option>
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount Range
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minAmount || ''}
                      onChange={(e) => setFilters({ minAmount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxAmount || ''}
                      onChange={(e) => setFilters({ maxAmount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => setFilters({ startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => setFilters({ endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    placeholder="Enter tags"
                    value={filters.tags || ''}
                    onChange={(e) => setFilters({ tags: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-end">
                  {hasActiveFilters && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={clearFilters}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                    >
                      <X className="h-4 w-4" />
                      <span>Clear All</span>
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bulk Actions */}
          {selectedTransactions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">
                  {selectedTransactions.length} transaction(s) selected
                </span>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Selected</span>
                  </button>
                  <button
                    onClick={() => setSelectedTransactions([])}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center items-center py-12"
          >
            <CompassLoader size="md" message="Loading your journey log..." />
          </motion.div>
        ) : transactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-600 mb-6">Start tracking your income and expenses!</p>
            <Link to="/add-expense">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                Add Your First Transaction
              </motion.button>
            </Link>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {transactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </motion.div>
        ) : (
          <motion.div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Mobile-friendly responsive table */}
            <div className="overflow-x-auto">
              <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedTransactions.length === transactions.length && transactions.length > 0}
                            onChange={selectAllTransactions}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('date')}
                            className="flex items-center space-x-1 hover:text-gray-700 min-w-0"
                          >
                            <span className="truncate">Date</span>
                            {sortBy === 'date' && (
                              sortOrder === 'asc' ? <SortAsc className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" /> : <SortDesc className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            )}
                          </button>
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                          Description
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Category
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          Payment
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('amount')}
                            className="flex items-center space-x-1 hover:text-gray-700 min-w-0"
                          >
                            <span className="truncate">Amount</span>
                            {sortBy === 'amount' && (
                              sortOrder === 'asc' ? <SortAsc className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" /> : <SortDesc className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            )}
                          </button>
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          Tags
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <AnimatePresence>
                    {transactions.map((transaction) => (
                      <TransactionRow key={transaction.id} transaction={transaction} />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Transaction Modal */}
      <AnimatePresence>
        {editingTransaction && editFormData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[120]"
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto pb-24 sm:pb-6"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Transaction</h3>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={editFormData.type}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, type: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200"
                      required
                    >
                      <option value="INCOME">Income</option>
                      <option value="EXPENSE">Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <input
                    type="text"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={editFormData.category}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200"
                      required
                    >
                      <option value="">Select category</option>
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <select
                      value={editFormData.paymentMethod}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200"
                      required
                    >
                      <option value="">Select payment method</option>
                      {paymentMethods.map((method) => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={editFormData.date}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
                    <input
                      type="text"
                      value={editFormData.subcategory}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, subcategory: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={editFormData.location}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, location: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <input
                      type="text"
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        title="Delete Selected Transactions?"
        message={`This will permanently delete ${selectedTransactions.length} selected transaction(s).`}
        confirmText="Delete Selected"
        cancelText="Cancel"
        isDanger
        isLoading={isLoading}
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[120]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Transaction
              </h3>
              
              <p className="text-sm text-gray-600 text-center mb-6">
                Are you sure you want to delete this transaction? This action cannot be undone.
              </p>
              
              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTransactionToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all duration-200"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EnhancedExpenses;
