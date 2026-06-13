import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { debugAuthState } from '../../utils/helpers';

const PrivateRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Debug authentication state in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      debugAuthState();
    }
  }, [isAuthenticated, user]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('PrivateRoute: User not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (roles.length > 0 && !roles.includes(user?.role)) {
    // Redirect based on user role
    const redirectPath = getRoleBasedRedirect(user?.role);
    console.log(`PrivateRoute: User role ${user?.role} not allowed, redirecting to ${redirectPath}`);
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

// Helper function to get role-based redirect path
const getRoleBasedRedirect = (role) => {
  switch (role) {
    case 'customer':
      return '/customer/dashboard';
    case 'mechanic':
      return '/mechanic/dashboard';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/';
  }
};

export default PrivateRoute;
