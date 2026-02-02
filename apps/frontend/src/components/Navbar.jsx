import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { LogOut, User, Target, RefreshCw, Compass, Navigation, Route, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import ConfirmModal from './ConfirmModal';

const Navbar = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <motion.div 
              className="flex-shrink-0 flex items-center space-x-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-amber-500 rounded-lg flex items-center justify-center shadow-lg">
                <motion.div
                  animate={{ 
                    rotate: [0, 15, -15, 0],
                    scale: [1, 1.1, 1, 1.05, 1]
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    repeatDelay: 2,
                    ease: "easeInOut"
                  }}
                >
                  <Compass className="h-5 w-5 text-white" />
                </motion.div>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-900 to-amber-600 bg-clip-text text-transparent">
                CashCompass
              </h1>
            </motion.div>
            
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-2">
                {[
                  { to: '/dashboard', icon: Navigation, label: 'Control Center' },
                  { to: '/expenses', icon: Route, label: 'Journey Log' },
                  { to: '/add-expense', icon: Plus, label: 'Add Entry', isSpecial: true },
                  { to: '/goals', icon: Target, label: 'Destinations' },
                  { to: '/recurring', icon: RefreshCw, label: 'Auto-Pilot' }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.to}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        to={item.to}
                        className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center space-x-2 transition-all duration-200 ${
                          item.isSpecial
                            ? 'bg-gradient-to-r from-blue-900 to-amber-500 text-white shadow-lg hover:shadow-xl'
                            : isActive(item.to)
                            ? 'bg-gradient-to-r from-blue-900 to-amber-500 text-white shadow-lg'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 bg-gray-50 rounded-xl px-3 py-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-amber-500 rounded-full flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">{user?.name}</span>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-200 border border-gray-200 hover:border-red-500"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </motion.button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Log Out?"
        message="Are you sure you want to log out from your account?"
        confirmText="Log Out"
        cancelText="Stay Logged In"
        isDanger
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </motion.nav>
  );
};

export default Navbar;
