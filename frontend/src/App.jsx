import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/common/PageTransition';

// Auth pages
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ForgotPassword from './components/auth/ForgotPassword';

// Landing page
import LandingPage from './pages/common/LandingPage';

// Layout components
import CustomerLayout from './layouts/CustomerLayout';
import MechanicLayout from './layouts/MechanicLayout';
import AdminLayout from './layouts/AdminLayout';

// Role-based redirect component
const RoleBasedRedirect = () => {
  const { user } = useAuth();

  console.log('RoleBasedRedirect - User:', user ? `${user.name} (${user.role})` : 'None');

  if (!user) {
    console.log('RoleBasedRedirect - No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('RoleBasedRedirect - Redirecting based on role:', user.role);
  
  switch (user.role) {
    case 'customer':
      return <Navigate to="/customer/dashboard" replace />;
    case 'mechanic':
      return <Navigate to="/mechanic/dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    default:
      console.log('RoleBasedRedirect - Unknown role, redirecting to login');
      return <Navigate to="/login" replace />;
  }
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginForm /></PageTransition>} />
        <Route path="/register" element={<PageTransition><RegisterForm /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />

        {/* Role-based redirect */}
        <Route path="/dashboard" element={<RoleBasedRedirect />} />

        {/* Customer routes */}
        <Route
          path="/customer/*"
          element={
            <PrivateRoute roles={['customer']}>
              <PageTransition>
                <CustomerLayout />
              </PageTransition>
            </PrivateRoute>
          }
        />

        {/* Mechanic routes */}
        <Route
          path="/mechanic/*"
          element={
            <PrivateRoute roles={['mechanic']}>
              <PageTransition>
                <MechanicLayout />
              </PageTransition>
            </PrivateRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            <PrivateRoute roles={['admin']}>
              <PageTransition>
                <AdminLayout />
              </PageTransition>
            </PrivateRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AnimatedRoutes />

          {/* Toast notifications */}
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
                  primary: '#22c55e',
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

          {/* Debug component (only in development) */}
          {/* <AuthDebug /> */}
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
