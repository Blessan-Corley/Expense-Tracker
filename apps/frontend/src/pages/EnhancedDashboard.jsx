import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Target,
  PiggyBank,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Plus,
  Download,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { motion } from 'framer-motion';
import { useTransactionStore } from '../store/transactionStore';
import { useGoalsStore } from '../store/goalsStore';
import { formatCurrency } from '../utils/currency';
import { useAuthStore } from '../store/authStore';
import CompassLoader from '../components/CompassLoader';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const getDefaultMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getDefaultDateRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { start, end };
};

const formatModalDate = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const EnhancedDashboard = () => {
  const { periodAnalytics, fetchPeriodAnalytics, downloadReport } = useTransactionStore();
  const { goals, summary: goalsSummary, fetchGoals, fetchSummary: fetchGoalsSummary } = useGoalsStore();
  const { user } = useAuthStore();

  const currentYear = String(new Date().getFullYear());
  const [period, setPeriod] = useState('monthly');
  const [weekSelection, setWeekSelection] = useState('current');
  const [monthSelection, setMonthSelection] = useState(getDefaultMonth());
  const [quarterSelection, setQuarterSelection] = useState(String(Math.floor(new Date().getMonth() / 3) + 1));
  const [yearSelection, setYearSelection] = useState(currentYear);
  const [customDates, setCustomDates] = useState(getDefaultDateRange());
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  useEffect(() => {
    fetchGoals();
    fetchGoalsSummary();
  }, [fetchGoals, fetchGoalsSummary]);

  const periodQuery = useMemo(() => {
    if (period === 'weekly') return { period, week: weekSelection };
    if (period === 'monthly') return { period, month: monthSelection };
    if (period === 'quarterly') return { period, quarter: quarterSelection, year: yearSelection };
    if (period === 'yearly') return { period, year: yearSelection };
    if (period === 'custom') {
      if (!customDates.start || !customDates.end || customDates.start > customDates.end) {
        return null;
      }
      return { period, startDate: customDates.start, endDate: customDates.end };
    }
    return { period: 'monthly', month: monthSelection };
  }, [period, weekSelection, monthSelection, quarterSelection, yearSelection, customDates]);

  useEffect(() => {
    if (!periodQuery) return;
    fetchPeriodAnalytics(periodQuery);
  }, [fetchPeriodAnalytics, periodQuery]);

  if (!periodAnalytics || !goalsSummary) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <CompassLoader size="lg" message="Charting your financial course..." />
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];
  const selectedPeriodLabel = periodAnalytics.label || 'Selected Period';
  const comparisonLabel = periodAnalytics.comparisonLabel || 'Previous Period';
  const rangeLabel = periodAnalytics.range?.text || '';
  const periodMetrics = periodAnalytics.metrics || {};
  const trendData = periodAnalytics.trend || [];
  const periodCategoryBreakdown = periodAnalytics.categoryBreakdown?.expenses || [];

  const periodIncome = periodMetrics.income || 0;
  const periodExpenses = periodMetrics.expenses || 0;
  const periodNetIncome = periodMetrics.netIncome ?? (periodIncome - periodExpenses);
  const periodSavingsRate = periodMetrics.savingsRate || 0;

  const customRangeInvalid = period === 'custom' && (!periodQuery || customDates.start > customDates.end);

  const reportParams = periodQuery
    ? {
      timeframe: periodQuery.period,
      ...Object.fromEntries(Object.entries(periodQuery).filter(([key]) => key !== 'period'))
    }
    : null;

  const downloadScopeLabel = !selectedPeriodLabel
    ? 'the selected period'
    : (!rangeLabel || period === 'custom')
      ? selectedPeriodLabel
      : `${selectedPeriodLabel} (${rangeLabel})`;
  const rangeStart = periodAnalytics.range?.start;
  const rangeEnd = periodAnalytics.range?.end;
  const downloadDetails = (
    <div className="space-y-1">
      <p>
        <span className="font-semibold text-gray-900">Period:</span>{' '}
        {selectedPeriodLabel}
      </p>
      {rangeLabel ? (
        <p>
          <span className="font-semibold text-gray-900">Range:</span>{' '}
          {rangeLabel}
        </p>
      ) : null}
      {rangeStart && rangeEnd ? (
        <p>
          <span className="font-semibold text-gray-900">From:</span>{' '}
          {formatModalDate(rangeStart)}
          <span className="mx-2 text-gray-400">to</span>
          <span className="font-semibold text-gray-900">To:</span>{' '}
          {formatModalDate(rangeEnd)}
        </p>
      ) : null}
    </div>
  );

  const handleDownloadReport = async () => {
    if (!reportParams) {
      toast.error('Please choose a valid date range before downloading.');
      return;
    }
    setIsDownloadingReport(true);
    const result = await downloadReport(reportParams);
    setIsDownloadingReport(false);
    setShowDownloadConfirm(false);

    if (result.success) toast.success(`${selectedPeriodLabel} report downloaded`);
    else toast.error(result.error || 'Failed to download report');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="mb-8"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-amber-600 bg-clip-text text-transparent">
                Financial Control Center
              </h1>
              <p className="mt-2 text-gray-600">
                Welcome back, {user?.name}! Navigate your financial journey with confidence.
              </p>
            </div>

            <button
              onClick={() => setShowDownloadConfirm(true)}
              disabled={customRangeInvalid}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span>Report</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                ['weekly', 'Week'],
                ['monthly', 'Month'],
                ['quarterly', 'Quarter'],
                ['yearly', 'Year'],
                ['custom', 'Custom']
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    period === value
                      ? 'bg-gradient-to-r from-blue-900 to-amber-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              {period === 'weekly' && (
                <label className="text-sm text-gray-700">
                  <span className="block mb-1 font-medium">Week</span>
                  <select
                    value={weekSelection}
                    onChange={(e) => setWeekSelection(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  >
                    <option value="current">Current Week</option>
                    <option value="previous">Previous Week</option>
                  </select>
                </label>
              )}

              {period === 'monthly' && (
                <label className="text-sm text-gray-700">
                  <span className="block mb-1 font-medium">Month</span>
                  <input
                    type="month"
                    value={monthSelection}
                    onChange={(e) => setMonthSelection(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  />
                </label>
              )}

              {period === 'quarterly' && (
                <>
                  <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">Quarter</span>
                    <select
                      value={quarterSelection}
                      onChange={(e) => setQuarterSelection(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 bg-white"
                    >
                      <option value="1">Q1</option>
                      <option value="2">Q2</option>
                      <option value="3">Q3</option>
                      <option value="4">Q4</option>
                    </select>
                  </label>
                  <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">Year</span>
                    <input
                      type="number"
                      min="1970"
                      max="3000"
                      value={yearSelection}
                      onChange={(e) => setYearSelection(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 bg-white w-28"
                    />
                  </label>
                </>
              )}

              {period === 'yearly' && (
                <label className="text-sm text-gray-700">
                  <span className="block mb-1 font-medium">Year</span>
                  <input
                    type="number"
                    min="1970"
                    max="3000"
                    value={yearSelection}
                    onChange={(e) => setYearSelection(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 bg-white w-28"
                  />
                </label>
              )}

              {period === 'custom' && (
                <>
                  <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">Start Date</span>
                    <input
                      type="date"
                      value={customDates.start}
                      onChange={(e) => setCustomDates((prev) => ({ ...prev, start: e.target.value }))}
                      className="rounded-lg border border-gray-300 px-3 py-2 bg-white"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    <span className="block mb-1 font-medium">End Date</span>
                    <input
                      type="date"
                      value={customDates.end}
                      onChange={(e) => setCustomDates((prev) => ({ ...prev, end: e.target.value }))}
                      className="rounded-lg border border-gray-300 px-3 py-2 bg-white"
                    />
                  </label>
                </>
              )}
            </div>

            <p className="mt-3 text-sm text-gray-600">
              Showing: <span className="font-semibold text-gray-900">{selectedPeriodLabel}</span>
              {rangeLabel ? <span> ({rangeLabel})</span> : null}
              <span className="mx-2">-</span>
              Compared with <span className="font-semibold text-gray-900">{comparisonLabel}</span>
            </p>
            {customRangeInvalid && (
              <p className="mt-2 text-sm text-red-600">Custom range is invalid. End date must be on or after start date.</p>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {[
          {
            title: 'Income',
            value: formatCurrency(periodIncome),
            icon: ArrowUpRight,
            gradient: 'from-green-500 to-green-600'
          },
          {
            title: 'Expenses',
            value: formatCurrency(periodExpenses),
            icon: ArrowDownRight,
            gradient: 'from-red-500 to-red-600'
          },
          {
            title: 'Net Income',
            value: formatCurrency(periodNetIncome),
            icon: periodNetIncome >= 0 ? TrendingUp : TrendingDown,
            gradient: periodNetIncome >= 0 ? 'from-blue-500 to-blue-600' : 'from-red-500 to-red-600'
          },
          {
            title: 'Savings Rate',
            value: `${periodSavingsRate.toFixed(1)}%`,
            icon: PiggyBank,
            gradient: 'from-purple-500 to-purple-600'
          }
        ].map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1, duration: 0.6 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 transform-gpu"
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${card.gradient} shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              </div>
              <div className={`h-1 bg-gradient-to-r ${card.gradient}`} />
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.6 }}
        className="bg-white shadow-xl rounded-2xl mb-8 border border-gray-100 overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-600" />
              <span>Financial Goals</span>
            </h2>
            <Link to="/goals" className="text-green-600 hover:text-green-700 text-sm font-semibold">
              Manage Goals
            </Link>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{goalsSummary.total}</div>
              <div className="text-sm text-gray-600">Total Goals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{goalsSummary.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{goalsSummary.active}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{goalsSummary.overallProgress}%</div>
              <div className="text-sm text-gray-600">Overall Progress</div>
            </div>
          </div>

          <div className="space-y-4">
            {goals.filter((g) => !g.isCompleted).slice(0, 3).map((goal, index) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + index * 0.1, duration: 0.4 }}
                className="p-4 bg-gray-50 rounded-xl"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">{goal.title}</span>
                  <span className="text-sm text-gray-600">
                    {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress}%` }}
                    transition={{ delay: 1.4 + index * 0.1, duration: 0.8 }}
                    className="h-2 rounded-full bg-gradient-to-r from-green-500 to-green-600"
                  />
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>{goal.progress}% complete</span>
                  <span>{goal.daysRemaining} days left</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden"
        >
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              <span className="text-sm sm:text-base">Income vs Expenses</span>
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" fontSize={12} tick={{ fontSize: 12 }} />
                <YAxis fontSize={12} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="income" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Income" />
                <Area type="monotone" dataKey="expenses" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.3, duration: 0.6 }}
          className="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden"
        >
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center space-x-2">
              <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              <span className="text-sm sm:text-base">Expense Categories</span>
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            {periodCategoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={periodCategoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }) => {
                      if (window.innerWidth < 640) return '';
                      return `${category} ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="category"
                  >
                    {periodCategoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${entry.category}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <PieChartIcon className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm sm:text-base">No expense data to display</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="bg-white shadow-xl rounded-2xl border border-gray-100 p-6"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Add Transaction', to: '/add-expense', icon: Plus, color: 'blue' },
            { label: 'View Transactions', to: '/expenses', icon: CreditCard, color: 'green' },
            { label: 'Hidden Entries', to: '/expenses?visibility=hidden', icon: Calendar, color: 'purple' },
            { label: 'Manage Goals', to: '/goals', icon: Target, color: 'purple' },
            { label: 'Manage Recurring', to: '/recurring', icon: BarChart3, color: 'orange' }
          ].map((action) => {
            const Icon = action.icon;
            const colorClasses = {
              blue: 'hover:border-blue-200 hover:bg-blue-50',
              green: 'hover:border-green-200 hover:bg-green-50',
              purple: 'hover:border-purple-200 hover:bg-purple-50',
              orange: 'hover:border-orange-200 hover:bg-orange-50'
            };
            const iconClasses = {
              blue: 'text-blue-600 group-hover:text-blue-700',
              green: 'text-green-600 group-hover:text-green-700',
              purple: 'text-purple-600 group-hover:text-purple-700',
              orange: 'text-orange-600 group-hover:text-orange-700'
            };

            return (
              <motion.div key={action.label} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to={action.to}
                  className={`flex items-center space-x-3 p-4 rounded-xl border-2 border-gray-100 transition-all duration-200 group ${colorClasses[action.color]}`}
                >
                  <Icon className={`h-6 w-6 ${iconClasses[action.color]}`} />
                  <span className="font-medium text-gray-700 group-hover:text-gray-900">{action.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <ConfirmModal
        isOpen={showDownloadConfirm}
        title="Download Report"
        message={`Are you sure you want to download data for ${downloadScopeLabel}?`}
        details={downloadDetails}
        confirmText="Download"
        cancelText="Cancel"
        onConfirm={handleDownloadReport}
        onCancel={() => {
          if (!isDownloadingReport) {
            setShowDownloadConfirm(false);
          }
        }}
        isLoading={isDownloadingReport}
      />
    </motion.div>
  );
};

export default EnhancedDashboard;
