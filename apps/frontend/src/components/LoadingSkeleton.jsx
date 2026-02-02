import { motion } from 'framer-motion';

const LoadingSkeleton = ({ className = "" }) => {
  return (
    <motion.div
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={`bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-xl ${className}`}
    />
  );
};

export const DashboardSkeleton = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8"
    >
      {/* Header Skeleton */}
      <div className="mb-8">
        <LoadingSkeleton className="h-8 w-48 mb-2" />
        <LoadingSkeleton className="h-4 w-64" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <LoadingSkeleton className="h-4 w-20" />
                <LoadingSkeleton className="h-6 w-16" />
              </div>
              <LoadingSkeleton className="w-12 h-12 rounded-xl" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Overview Panel Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="bg-white shadow-xl rounded-2xl mb-8 border border-gray-100 p-6"
      >
        <LoadingSkeleton className="h-6 w-40 mb-4" />
        <LoadingSkeleton className="h-3 w-full mb-2" />
        <LoadingSkeleton className="h-4 w-32" />
      </motion.div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {[...Array(2)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: i === 0 ? -50 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.1, duration: 0.6 }}
            className="bg-white shadow-xl rounded-2xl border border-gray-100 p-6"
          >
            <LoadingSkeleton className="h-6 w-32 mb-6" />
            <LoadingSkeleton className="h-64 w-full" />
          </motion.div>
        ))}
      </div>

      {/* Recent Transactions Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="bg-white shadow-xl rounded-2xl border border-gray-100 p-6"
      >
        <LoadingSkeleton className="h-6 w-36 mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <LoadingSkeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <LoadingSkeleton className="h-4 w-32" />
                <LoadingSkeleton className="h-3 w-24" />
              </div>
              <LoadingSkeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LoadingSkeleton;
