import { motion } from 'framer-motion';
import { Compass, Navigation } from 'lucide-react';

const CompassLoader = ({ size = 'md', message = 'Navigating your finances...' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg', 
    xl: 'text-xl'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      {/* Compass Container */}
      <div className="relative">
        {/* Outer compass ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className={`${sizeClasses[size]} border-4 border-blue-900/20 border-t-blue-900 rounded-full`}
        />
        
        {/* Inner compass needle */}
        <motion.div
          animate={{ 
            rotate: [0, 45, 90, 180, 270, 360],
            scale: [1, 1.1, 1, 1.1, 1]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            ease: "easeInOut",
            times: [0, 0.2, 0.4, 0.6, 0.8, 1]
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className={`${sizeClasses[size]} bg-gradient-to-r from-blue-900 to-amber-500 rounded-full flex items-center justify-center shadow-lg`}>
            <Navigation className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
          </div>
        </motion.div>

        {/* Compass points */}
        <div className="absolute inset-0 flex items-center justify-center">
          {['N', 'E', 'S', 'W'].map((direction, index) => (
            <motion.div
              key={direction}
              animate={{ 
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1, 0.8]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                delay: index * 0.5,
                ease: "easeInOut"
              }}
              className={`absolute text-xs font-bold text-blue-900/60 ${
                direction === 'N' ? '-top-8' :
                direction === 'E' ? '-right-8 top-1/2 -translate-y-1/2' :
                direction === 'S' ? '-bottom-8' :
                '-left-8 top-1/2 -translate-y-1/2'
              }`}
            >
              {direction}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Loading message */}
      <motion.div
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className={`${textSizes[size]} font-medium text-blue-900/80 text-center max-w-xs`}
      >
        {message}
      </motion.div>

      {/* Progress dots */}
      <div className="flex space-x-1">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.2,
              ease: "easeInOut"
            }}
            className="w-2 h-2 bg-gradient-to-r from-blue-900 to-amber-500 rounded-full"
          />
        ))}
      </div>
    </div>
  );
};

export default CompassLoader;