import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Navigation, Route, Plus, Target, RefreshCw, Compass } from 'lucide-react';

const MobileNav = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { to: '/dashboard', icon: Navigation, label: 'Control' },
    { to: '/expenses', icon: Route, label: 'Journey' },
    { to: '/add-expense', icon: Plus, label: 'Add', isSpecial: true },
    { to: '/goals', icon: Target, label: 'Goals' },
    { to: '/recurring', icon: RefreshCw, label: 'Recurring' },
  ];

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/50 px-2 pt-2 pb-1 z-50 md:hidden safe-area-inset-bottom"
    >
      <div className="grid grid-cols-5 items-end gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          
          if (item.isSpecial) {
            return (
              <Link key={item.to} to={item.to}>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-900 to-amber-500 rounded-full flex items-center justify-center shadow-lg -mt-6">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <motion.div 
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity, 
                      ease: "linear"
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-900 to-amber-500 rounded-full flex items-center justify-center"
                  >
                    <Compass className="h-2.5 w-2.5 text-white" />
                  </motion.div>
                </motion.div>
              </Link>
            );
          }

          return (
            <Link key={item.to} to={item.to} className="min-w-0">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center py-2 relative min-w-0 px-1"
              >
                <div className={`p-2 rounded-xl transition-all duration-200 ${
                  active 
                    ? 'bg-gradient-to-r from-blue-900/10 to-amber-500/10' 
                    : 'hover:bg-gray-100'
                }`}>
                  <Icon 
                    className={`h-5 w-5 transition-colors duration-200 ${
                      active ? 'text-blue-900' : 'text-gray-500'
                    }`} 
                  />
                </div>
                
                <span className={`text-xs font-medium mt-1 leading-tight transition-colors duration-200 truncate max-w-full ${
                  active ? 'text-blue-900' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>

                {active && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -top-1 w-1 h-1 bg-gradient-to-r from-blue-900 to-amber-500 rounded-full"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
};

export default MobileNav;
