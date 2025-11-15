import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Plus, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Flag, 
  Edit3, 
  Trash2, 
  CheckCircle,
  Clock,
  PiggyBank,
  Home,
  Car,
  GraduationCap,
  Plane,
  Shield,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import { useGoalsStore } from '../store/goalsStore';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/currency';
import ConfirmModal from '../components/ConfirmModal';

const Goals = () => {
  const { goals, summary, fetchGoals, fetchSummary, addGoal, updateGoal, contributeToGoal, deleteGoal, isLoading } = useGoalsStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [contributionGoal, setContributionGoal] = useState(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [goalToDelete, setGoalToDelete] = useState(null);

  useEffect(() => {
    fetchGoals();
    fetchSummary();
  }, [fetchGoals, fetchSummary]);

  const goalIcons = {
    EMERGENCY_FUND: Shield,
    VACATION: Plane,
    HOME_PURCHASE: Home,
    CAR_PURCHASE: Car,
    INVESTMENT: TrendingUp,
    DEBT_PAYOFF: TrendingDown,
    EDUCATION: GraduationCap,
    RETIREMENT: PiggyBank,
    OTHER: Flag
  };

  const goalColors = {
    EMERGENCY_FUND: 'from-red-500 to-red-600',
    VACATION: 'from-blue-500 to-blue-600',
    HOME_PURCHASE: 'from-green-500 to-green-600',
    CAR_PURCHASE: 'from-purple-500 to-purple-600',
    INVESTMENT: 'from-yellow-500 to-yellow-600',
    DEBT_PAYOFF: 'from-orange-500 to-orange-600',
    EDUCATION: 'from-indigo-500 to-indigo-600',
    RETIREMENT: 'from-pink-500 to-pink-600',
    OTHER: 'from-gray-500 to-gray-600'
  };

  const priorityColors = {
    LOW: 'text-gray-500 bg-gray-100',
    MEDIUM: 'text-blue-600 bg-blue-100',
    HIGH: 'text-orange-600 bg-orange-100',
    CRITICAL: 'text-red-600 bg-red-100'
  };

  const handleAddGoal = async (formData) => {
    const result = await addGoal(formData);
    if (result.success) {
      toast.success('Goal created successfully!');
      setShowAddForm(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleUpdateGoal = async (id, formData) => {
    const result = await updateGoal(id, formData);
    if (result.success) {
      toast.success('Goal updated successfully!');
      setEditingGoal(null);
    } else {
      toast.error(result.error);
    }
  };

  const handleContribute = async (id, amount) => {
    const result = await contributeToGoal(id, parseFloat(amount));
    if (result.success) {
      toast.success(result.message);
      setContributionGoal(null);
      setContributionAmount('');
    } else {
      toast.error(result.error);
    }
  };

  const handleDeleteGoal = async () => {
    if (!goalToDelete) return;

    const result = await deleteGoal(goalToDelete);
    if (result.success) {
      toast.success('Goal deleted successfully!');
    } else {
      toast.error(result.error);
    }

    setGoalToDelete(null);
  };

  const GoalCard = ({ goal }) => {
    const Icon = goalIcons[goal.category] || Flag;
    const colorClass = goalColors[goal.category] || goalColors.OTHER;
    const priorityClass = priorityColors[goal.priority] || priorityColors.MEDIUM;
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -5 }}
        className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border ${
          goal.isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-100'
        }`}
      >
        {/* Header */}
        <div className={`p-4 bg-gradient-to-r ${colorClass} text-white`}>
          <div className="flex items-center justify-between mb-2">
            <Icon className="h-6 w-6" />
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityClass} text-gray-800 bg-white/20`}>
              {goal.priority}
            </span>
          </div>
          <h3 className="text-lg font-bold">{goal.title}</h3>
          {goal.description && (
            <p className="text-sm text-white/80 mt-1">{goal.description}</p>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Progress</span>
              <span className="text-sm font-bold text-gray-900">{goal.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goal.progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-3 bg-gradient-to-r ${colorClass} rounded-full`}
              />
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Saved</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(goal.currentAmount)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Target</div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(goal.targetAmount)}
              </div>
            </div>
          </div>

          {/* Remaining & Date */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <div className="text-gray-500 mb-1">Remaining</div>
              <div className="font-semibold text-gray-900">
                {formatCurrency(goal.remainingAmount)}
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Target Date</div>
              <div className={`font-semibold ${
                goal.daysRemaining < 0 ? 'text-red-600' : 
                goal.daysRemaining < 30 ? 'text-orange-600' : 'text-gray-900'
              }`}>
                {format(new Date(goal.targetDate), 'MMM dd, yyyy')}
              </div>
            </div>
          </div>

          {/* Days Remaining */}
          <div className={`text-center p-2 rounded-lg mb-4 ${
            goal.daysRemaining < 0 ? 'bg-red-50 text-red-700' :
            goal.daysRemaining < 30 ? 'bg-orange-50 text-orange-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {goal.daysRemaining < 0 ? (
              <div className="flex items-center justify-center space-x-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Overdue by {Math.abs(goal.daysRemaining)} days
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {goal.daysRemaining} days remaining
                </span>
              </div>
            )}
          </div>

          {/* Status */}
          {goal.isCompleted && (
            <div className="flex items-center justify-center space-x-2 p-2 bg-green-50 text-green-700 rounded-lg mb-4">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Goal Completed!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2">
            {!goal.isCompleted && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setContributionGoal(goal)}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-3 rounded-lg font-medium text-sm hover:from-green-600 hover:to-green-700 transition-all duration-200 min-h-[48px] flex items-center justify-center"
              >
                <span className="hidden sm:inline">Add Money</span>
                <span className="sm:hidden">+$</span>
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setEditingGoal(goal)}
              className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200 transition-colors duration-200 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Edit3 className="h-4 w-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setGoalToDelete(goal.id)}
              className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors duration-200 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Trash2 className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  };

  const GoalForm = ({ goal, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      title: goal?.title || '',
      description: goal?.description || '',
      targetAmount: goal?.targetAmount || '',
      targetDate: goal?.targetDate ? format(new Date(goal.targetDate), 'yyyy-MM-dd') : '',
      category: goal?.category || 'OTHER',
      priority: goal?.priority || 'MEDIUM',
      currentAmount: goal?.currentAmount || 0
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
            {goal ? 'Edit Goal' : 'Add New Goal'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Goal Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="e.g., Emergency Fund"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                rows={3}
                placeholder="Brief description of your goal"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({...formData, targetAmount: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="1000.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Date
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({...formData, targetDate: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  <option value="EMERGENCY_FUND">Emergency Fund</option>
                  <option value="VACATION">Vacation</option>
                  <option value="HOME_PURCHASE">Home Purchase</option>
                  <option value="CAR_PURCHASE">Car Purchase</option>
                  <option value="INVESTMENT">Investment</option>
                  <option value="DEBT_PAYOFF">Debt Payoff</option>
                  <option value="EDUCATION">Education</option>
                  <option value="RETIREMENT">Retirement</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            {goal && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.currentAmount}
                  onChange={(e) => setFormData({...formData, currentAmount: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200"
              >
                {isLoading ? 'Saving...' : goal ? 'Update Goal' : 'Create Goal'}
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
              Financial Destinations
            </h1>
            <p className="mt-2 text-gray-600">
              Set your course and navigate towards your financial milestones
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddForm(true)}
            className="mt-4 sm:mt-0 flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5" />
            <span>Add Goal</span>
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
              <Target className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">{summary.total}</span>
            </div>
            <div className="text-sm text-gray-600">Total Goals</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{summary.completed}</span>
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold text-purple-600">{formatCurrency(summary.totalSavedAmount)}</span>
            </div>
            <div className="text-sm text-gray-600">Total Saved</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <span className="text-2xl font-bold text-orange-600">{summary.overallProgress}%</span>
            </div>
            <div className="text-sm text-gray-600">Overall Progress</div>
          </div>
        </motion.div>
      )}

      {/* Goals Grid */}
      <AnimatePresence>
        {goals.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No goals yet</h3>
            <p className="text-gray-600 mb-6">Start by creating your first financial goal!</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              Create Your First Goal
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Goal Modal */}
      <AnimatePresence>
        {showAddForm && (
          <GoalForm
            onSubmit={handleAddGoal}
            onCancel={() => setShowAddForm(false)}
          />
        )}
        {editingGoal && (
          <GoalForm
            goal={editingGoal}
            onSubmit={(data) => handleUpdateGoal(editingGoal.id, data)}
            onCancel={() => setEditingGoal(null)}
          />
        )}
      </AnimatePresence>

      {/* Contribution Modal */}
      <AnimatePresence>
        {contributionGoal && (
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
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Add Money to {contributionGoal.title}
              </h2>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                <div className="text-sm text-gray-600 mb-1">Current Progress</div>
                <div className="text-lg font-bold text-gray-900 mb-2">
                  {formatCurrency(contributionGoal.currentAmount)} / {formatCurrency(contributionGoal.targetAmount)}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                    style={{ width: `${contributionGoal.progress}%` }}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Add
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-lg font-semibold"
                  placeholder="100.00"
                  autoFocus
                />
              </div>

              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleContribute(contributionGoal.id, contributionAmount)}
                  disabled={!contributionAmount || parseFloat(contributionAmount) <= 0 || isLoading}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition-all duration-200"
                >
                  {isLoading ? 'Adding...' : 'Add Money'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setContributionGoal(null);
                    setContributionAmount('');
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={Boolean(goalToDelete)}
        title="Delete Goal?"
        message="This goal will be removed permanently."
        confirmText="Delete"
        cancelText="Cancel"
        isDanger
        isLoading={isLoading}
        onConfirm={handleDeleteGoal}
        onCancel={() => setGoalToDelete(null)}
      />
    </motion.div>
  );
};

export default Goals;
