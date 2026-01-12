import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import AuthProvider from './components/AuthProvider';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import Login from './pages/Login';
import Register from './pages/Register';
import EnhancedDashboard from './pages/EnhancedDashboard';
import EnhancedExpenses from './pages/EnhancedExpenses';
import EnhancedAddExpense from './pages/EnhancedAddExpense';
import Goals from './pages/Goals';
import RecurringTransactions from './pages/RecurringTransactions';
import ScrollToTop from './components/ScrollToTop';

function App() {
  const { token } = useAuthStore();

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-stone-50 overflow-x-hidden">
            <ScrollToTop />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          
          {token && <Navbar />}
          
          <main className={token ? "pt-16 pb-24 md:pb-0" : ""}>
            <Routes>
              <Route 
                path="/login" 
                element={!token ? <Login /> : <Navigate to="/dashboard" />} 
              />
              <Route 
                path="/register" 
                element={!token ? <Register /> : <Navigate to="/dashboard" />} 
              />
              <Route 
                path="/dashboard" 
                element={token ? <EnhancedDashboard /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/expenses" 
                element={token ? <EnhancedExpenses /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/add-expense" 
                element={token ? <EnhancedAddExpense /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/goals" 
                element={token ? <Goals /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/recurring" 
                element={token ? <RecurringTransactions /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/" 
                element={<Navigate to={token ? "/dashboard" : "/login"} />} 
              />
            </Routes>
          </main>
          
            {token && <MobileNav />}
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
