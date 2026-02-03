import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import CompassLoader from './CompassLoader';

const AuthProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { token, validateToken } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        // Validate the stored token
        await validateToken();
      }
      setIsInitialized(true);
    };

    initializeAuth();
  }, [token, validateToken]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 via-amber-50 to-stone-50">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-xl font-bold text-white">CC</span>
          </div>
          <CompassLoader />
          <p className="mt-4 text-stone-600 font-medium">Loading Cash Compass...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default AuthProvider;