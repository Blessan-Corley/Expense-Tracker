import { motion } from 'framer-motion';
import { Navigation } from 'lucide-react';

const CompassButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = ''
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-900 to-amber-500 hover:from-blue-800 hover:to-amber-600 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-white border-2 border-blue-900/20 text-blue-900 hover:bg-blue-50 hover:border-blue-900/40',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg hover:shadow-xl',
    ghost: 'text-blue-900 hover:bg-blue-50'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
    xl: 'px-8 py-5 text-xl'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5', 
    lg: 'h-6 w-6',
    xl: 'h-7 w-7'
  };

  const Icon = icon || Navigation;

  return (
    <motion.button
      whileHover={{ 
        scale: disabled ? 1 : 1.02,
        rotate: disabled ? 0 : 1
      }}
      whileTap={{ 
        scale: disabled ? 1 : 0.98,
        rotate: disabled ? 0 : -1
      }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]} 
        ${sizes[size]}
        inline-flex items-center justify-center space-x-2 rounded-xl font-semibold
        transition-all duration-200 
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className={`${iconSizes[size]} border-2 border-current border-t-transparent rounded-full`}
        />
      ) : (
        icon && <Icon className={iconSizes[size]} />
      )}
      
      {children && <span>{children}</span>}
      
      {!loading && !icon && variant === 'primary' && (
        <motion.div
          animate={{ 
            rotate: [0, 15, -15, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            repeatDelay: 3,
            ease: "easeInOut"
          }}
        >
          <Navigation className={iconSizes[size]} />
        </motion.div>
      )}
    </motion.button>
  );
};

export default CompassButton;