import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  Plus, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Edit3, 
  Trash2, 
  CheckCircle,
  AlertTriangle,
  Clock,
  Repeat,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import axiosInstance from '../utils/axios';
import { formatCurrency } from '../utils/currency';
import { useTransactionStore } from '../store/transactionStore';
import ConfirmModal from '../components/ConfirmModal';

const RecurringTransactions = () => {
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterFrequency, setFilterFrequency] = useState('all');
  const [recurringToDelete, setRecurringToDelete] = useState(null);

  const { categories: apiCategories, fetchCategories } = useTransactionStore();

  useEffect(() => {
    fetchRecurringTransactions();
    fetchSummary();
    fetchCategories();
  }, [fetchCategories]);

  const fetchRecurringTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/recurring');
      setRecurringTransactions(response.data.recurringTransactions || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load recurring transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axiosInstance.get('/recurring/summary');
      setSummary(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load recurring summary');
    }
  };

  const addRecurringTransaction = async (formData) => {
    setIsLoading(true);
    try {
      const payload = {
        type: formData.type,
        description: formData.description,
        amount: Number(formData.amount),
        category: formData.category,
        subcategory: formData.subcategory || null,
        paymentMethod: formData.paymentMethod,
        frequency: formData.frequency,
        nextDate: formData.nextDate,
        endDate: formData.endDate || null
      };
      await axiosInstance.post('/recurring', payload);
      toast.success('Recurring transaction created');
      setShowAddForm(false);
      fetchRecurringTransactions();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create recurring transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const updateRecurringTransaction = async (id, formData) => {
    setIsLoading(true);
    try {
      const payload = {
        type: formData.type,
        description: formData.description,
        amount: Number(formData.amount),
        category: formData.category,
        subcategory: formData.subcategory || null,
        paymentMethod: formData.paymentMethod,
        frequency: formData.frequency,
        nextDate: formData.nextDate,
        endDate: formData.endDate || null
      };
      await axiosInstance.put(`/recurring/${id}`, payload);
      toast.success('Recurring transaction updated');
      setEditingTransaction(null);
      fetchRecurringTransactions();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update recurring transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRecurringTransaction = async () => {
    if (!recurringToDelete) return;
    setIsLoading(true);
    try {
      await axiosInstance.delete(`/recurring/${recurringToDelete}`);
      toast.success('Recurring transaction deleted');
      fetchRecurringTransactions();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete recurring transaction');
    } finally {
      setIsLoading(false);
      setRecurringToDelete(null);
    }
  };

  const processRecurringTransaction = async () => {
    setIsLoading(true);
    try {
      await axiosInstance.post('/recurring/process');
      toast.success('Processed due recurring transactions');
      fetchRecurringTransactions();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process recurring transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const categoryOptions = [
    ...(apiCategories?.expense || []),
    ...(apiCategories?.income || [])
  ].filter((item, index, self) => self.indexOf(item) === index);

  const frequencyOptions = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'BIWEEKLY', label: 'Biweekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
    { value: 'YEARLY', label: 'Yearly' }
  ];

  const isOverdue = (nextDue) => {
    return new Date(nextDue) < new Date();
  };

  const filteredTransactions = recurringTransactions.filter(transaction => {
    const typeMatch = filterType === 'all' || transaction.type === filterType;
    const frequencyMatch = filterFrequency === 'all' || transaction.frequency === filterFrequency;
    return typeMatch && frequencyMatch;
  });

  const RecurringTransactionCard = ({ transaction }) => {
    const nextDue = transaction.nextDate;
    const overdue = isOverdue(nextDue);
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -5 }}
        className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border ${
          overdue ? 'border-orange-200 bg-orange-50' : 
          !transaction.isActive ? 'border-gray-200 bg-gray-50' : 'border-gray-100'
        }`}
      >
        {/* Header */}
        <div className={`p-4 text-white ${
          transaction.type === 'INCOME' 
            ? 'bg-gradient-to-r from-green-500 to-green-600'
            : 'bg-gradient-to-r from-red-500 to-red-600'
        }`}>
          <div className="flex items-center justify-between mb-2">
            {transaction.type === 'INCOME' ? (
              <ArrowUpRight className="h-6 w-6" />
            ) : (
              <ArrowDownRight className="h-6 w-6" />
            )}
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                transaction.isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {transaction.isActive ? 'Active' : 'Inactive'}
              </span>
              {overdue && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Overdue
                </span>
              )}
            </div>
          </div>
          <h3 className="text-lg font-bold">{transaction.description}</h3>
          <p className="text-sm text-white/80">{transaction.category}</p>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Amount */}
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1">Amount</div>
            <div className={`text-2xl font-bold ${
              transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(transaction.amount)}
            </div>
          </div>

          {/* Frequency & Next Due */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <div className="text-gray-500 mb-1">Frequency</div>
              <div className="font-semibold text-gray-900 flex items-center">
                <RefreshCw className="h-4 w-4 mr-1" />
                {transaction.frequency}
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Next Due</div>
              <div className={`font-semibold ${
                overdue ? 'text-orange-600' : 'text-gray-900'
              }`}>
                {format(new Date(nextDue), 'MMM dd, yyyy')}
              </div>
            </div>
          </div>

          {/* Created */}
          <div className="mb-4 text-sm">
            <div className="text-gray-500 mb-1">Created</div>
            <div className="font-semibold text-gray-900">
              {transaction.createdAt ? format(new Date(transaction.createdAt), 'MMM dd, yyyy') : ''}
            </div>
          </div>

          {/* Status */}
          <div className={`flex items-center justify-center space-x-2 p-2 rounded-lg mb-4 ${
            overdue ? 'bg-orange-50 text-orange-700' :
            !transaction.isActive ? 'bg-gray-50 text-gray-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {overdue ? (
              <AlertTriangle className="h-4 w-4" />
            ) : !transaction.isActive ? (
              <Clock className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {overdue ? 'Due for Processing' :
               !transaction.isActive ? 'Inactive' :
               'Active'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            {transaction.isActive && overdue && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => processRecurringTransaction()}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-3 rounded-lg font-medium text-sm hover:from-green-600 hover:to-green-700 transition-all duration-200"
              >
                Process Now
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setEditingTransaction(transaction)}
              className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200 transition-colors duration-200"
            >
              <Edit3 className="h-4 w-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setRecurringToDelete(transaction.id)}
              className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors duration-200"
            >
              <Trash2 className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  };

  const RecurringTransactionForm = ({ transaction, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      type: transaction?.type || 'EXPENSE',
      description: transaction?.description || '',
      amount: transaction?.amount || '',
      category: transaction?.category || '',
      subcategory: transaction?.subcategory || '',
      paymentMethod: transaction?.paymentMethod || '',
      frequency: transaction?.frequency || 'MONTHLY',
      nextDate: transaction?.nextDate 
        ? format(new Date(transaction.nextDate), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
      endDate: transaction?.endDate 
        ? format(new Date(transaction.endDate), 'yyyy-MM-dd')
        : ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
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
          className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {transaction ? 'Edit Recurring Transaction' : 'Create Recurring Transaction'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                >
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="100.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="e.g., Monthly salary, Rent payment"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              >
                <option value="">Select category</option>
                {categoryOptions.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frequency
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              >
                {frequencyOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Date
                </label>
                <input
                  type="date"
                  value={formData.nextDate}
                  onChange={(e) => setFormData({...formData, nextDate: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                >
                  <option value="">Select payment method</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Check">Check</option>
                  <option value="Digital Wallet">Digital Wallet</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory (Optional)
                </label>
                <input
                  type="text"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="e.g., Rent, Salary"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200"
              >
                {isLoading ? 'Saving...' : transaction ? 'Update Transaction' : 'Create Transaction'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onCancel}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
              >
                Cancel
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    );
  };

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
              Auto-Pilot Navigation
            </h1>
            <p className="mt-2 text-gray-600">
              Set your course on autopilot with automated income and expense tracking
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddForm(true)}
            className="mt-4 sm:mt-0 flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5" />
            <span>Add Recurring Transaction</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <Repeat className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">{recurringTransactions.length}</span>
          </div>
          <div className="text-sm text-gray-600">Total Recurring</div>
        </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-bold text-green-600">{summary.totalActive || 0}</span>
          </div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            <span className="text-2xl font-bold text-orange-600">
              {recurringTransactions.filter(r => r.isActive && isOverdue(r.nextDate)).length}
            </span>
          </div>
          <div className="text-sm text-gray-600">Overdue</div>
        </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold text-purple-600">
              {formatCurrency((summary.monthlyIncome || 0) + (summary.monthlyExpenses || 0))}
            </span>
          </div>
          <div className="text-sm text-gray-600">Monthly Total</div>
        </div>
      </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100"
      >
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Frequencies</option>
              {frequencyOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Recurring Transactions Grid */}
      <AnimatePresence>
        {filteredTransactions.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredTransactions.map((transaction) => (
              <RecurringTransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Repeat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No recurring transactions</h3>
            <p className="text-gray-600 mb-6">Set up automated income and expense transactions!</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              Create Your First Recurring Transaction
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddForm && (
          <RecurringTransactionForm
            onSubmit={addRecurringTransaction}
            onCancel={() => setShowAddForm(false)}
          />
        )}
        {editingTransaction && (
          <RecurringTransactionForm
            transaction={editingTransaction}
            onSubmit={(data) => updateRecurringTransaction(editingTransaction.id, data)}
            onCancel={() => setEditingTransaction(null)}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={Boolean(recurringToDelete)}
        title="Delete Recurring Transaction?"
        message="This recurring transaction will be removed permanently."
        confirmText="Delete"
        cancelText="Cancel"
        isDanger
        isLoading={isLoading}
        onConfirm={deleteRecurringTransaction}
        onCancel={() => setRecurringToDelete(null)}
      />
    </motion.div>
  );
};

export default RecurringTransactions;

