import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService';
import socketService from '../services/socketService';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  otpStep: false,
  tempEmail: null,
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_OTP_REQUIRED: 'LOGIN_OTP_REQUIRED',
  LOGOUT: 'LOGOUT',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_USER: 'SET_USER',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        error: null,
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      console.log('AuthContext: LOGIN_SUCCESS action with payload:', action.payload);
      return {
        ...state,
        loading: false,
        error: null,
        user: action.payload,
        isAuthenticated: true,
        otpStep: false,
        tempEmail: null,
      };

    case AUTH_ACTIONS.LOGIN_OTP_REQUIRED:
      return {
        ...state,
        loading: false,
        error: null,
        otpStep: true,
        tempEmail: action.payload,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        otpStep: false,
        tempEmail: null,
      };

    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        otpStep: true,
        tempEmail: action.payload,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const user = authService.getCurrentUser();
        const isAuthenticated = authService.isAuthenticated();
        const isTokenValid = authService.isTokenValid();

        console.log('Auth initialization:', {
          user: user ? 'Present' : 'Missing',
          isAuthenticated,
          isTokenValid,
          accessToken: localStorage.getItem('accessToken') ? 'Present' : 'Missing',
          refreshToken: localStorage.getItem('refreshToken') ? 'Present' : 'Missing'
        });

        // If localStorage is empty, clear any existing auth state
        if (!user || !isAuthenticated) {
          console.log('Clearing auth state - no valid data in localStorage');
          authService.logout();
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
          return;
        }

        // If we have user data and tokens, restore the session
        if (user && isAuthenticated) {
          console.log('Restoring user session from localStorage');
          
          if (isTokenValid) {
            // Check if token needs refresh
            if (authService.shouldRefreshToken()) {
              try {
                console.log('Refreshing token during initialization');
                await authService.refreshToken();
              } catch (error) {
                console.error('Token refresh failed during initialization:', error);
                // Continue with current token if refresh fails
              }
            }

            // Set the user in context
            dispatch({ type: AUTH_ACTIONS.SET_USER, payload: user });
            
            // Initialize socket connection
            const token = authService.getAccessToken();
            if (token) {
              socketService.init(token);
              
              // Join user room after socket connects
              setTimeout(() => {
                if (user && user._id) {
                  socketService.joinUserRoom(user._id);
                }
              }, 1000);
            }
            
            console.log('User session restored successfully');
          } else {
            // Token is invalid, try to refresh
            try {
              console.log('Token invalid, attempting refresh');
              await authService.refreshToken();
              dispatch({ type: AUTH_ACTIONS.SET_USER, payload: user });
              
              const token = authService.getAccessToken();
              if (token) {
                socketService.init(token);
                
                // Join user room after socket connects
                setTimeout(() => {
                  if (user && user._id) {
                    socketService.joinUserRoom(user._id);
                  }
                }, 1000);
              }
            } catch (error) {
              console.error('Token refresh failed, logging out:', error);
              // Refresh failed, clear auth state
              authService.logout();
              dispatch({ type: AUTH_ACTIONS.LOGOUT });
            }
          }
        } else {
          console.log('No valid user session found in localStorage');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authService.logout();
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    };

    initializeAuth();
  }, []);

  // Set up periodic token validation
  useEffect(() => {
    if (state.isAuthenticated) {
      const tokenCheckInterval = setInterval(async () => {
        try {
          const isTokenValid = authService.isTokenValid();
          
          if (!isTokenValid) {
            // Token is expired, try to refresh
            try {
              await authService.refreshToken();
            } catch (error) {
              // Refresh failed, logout user
              authService.logout();
              socketService.disconnect();
              dispatch({ type: AUTH_ACTIONS.LOGOUT });
              toast.error('Session expired. Please login again.');
            }
          } else if (authService.shouldRefreshToken()) {
            // Token is about to expire, refresh proactively
            try {
              await authService.refreshToken();
            } catch (error) {
              console.error('Proactive token refresh failed:', error);
            }
          }
        } catch (error) {
          console.error('Token validation error:', error);
        }
      }, 60000); // Check every minute

      return () => clearInterval(tokenCheckInterval);
    }
  }, [state.isAuthenticated]);

  // Monitor localStorage changes and sync state
  useEffect(() => {
    const checkAuthConsistency = () => {
      const user = authService.getCurrentUser();
      const isAuthenticated = authService.isAuthenticated();
      
      // If localStorage is empty but context thinks we're authenticated, clear the state
      if (!user || !isAuthenticated) {
        if (state.isAuthenticated) {
          console.log('AuthContext: localStorage empty but state authenticated, clearing state');
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      } else {
        // If localStorage has data but context doesn't think we're authenticated, sync
        if (!state.isAuthenticated) {
          console.log('AuthContext: localStorage has data but state not authenticated, syncing');
          dispatch({ type: AUTH_ACTIONS.SET_USER, payload: user });
        }
      }
    };

    // Check immediately
    checkAuthConsistency();

    // Set up storage event listener
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken' || e.key === 'refreshToken' || e.key === 'user') {
        console.log('AuthContext: localStorage changed, checking consistency');
        checkAuthConsistency();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case storage events don't fire
    const consistencyInterval = setInterval(checkAuthConsistency, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(consistencyInterval);
    };
  }, [state.isAuthenticated]);

  // Login function
  const login = async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      const response = await authService.login(email, password);
      console.log('AuthContext: Login response:', response);

      if (response.data.requiresOTP) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_OTP_REQUIRED,
          payload: response.data.email,
        });
        toast.success('OTP sent to your email');
        return { requiresOTP: true };
      } else if (response.data.user && response.data.tokens) {
        // Direct login without OTP - store tokens and user data
        console.log('AuthContext: Direct login successful, user:', response.data.user);
        
        // Store tokens and user data in localStorage
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('accessToken', response.data.tokens.accessToken);
        localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: response.data.user,
        });
        
        // Initialize socket connection
        const token = response.data.tokens.accessToken;
        if (token) {
          socketService.init(token);
        }
        
        toast.success('Login successful!');
        return { requiresOTP: false };
      }
    } catch (error) {
      const errorMessage = error.message || 'Login failed';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Verify OTP function
  const verifyOTP = async (email, otp) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      const response = await authService.verifyLoginOTP(email, otp);

      if (response.data.user) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: response.data.user,
        });
        
        // Initialize socket connection
        const token = authService.getAccessToken();
        if (token) {
          socketService.init(token);
        }
        
        toast.success('Login successful!');
      }
    } catch (error) {
      const errorMessage = error.message || 'OTP verification failed';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Resend OTP function
  const resendOTP = async (email) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      await authService.resendLoginOTP(email);
      
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      toast.success('OTP sent successfully');
    } catch (error) {
      const errorMessage = error.message || 'Failed to resend OTP';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      await authService.register(userData);

      dispatch({
        type: AUTH_ACTIONS.REGISTER_SUCCESS,
        payload: userData.email,
      });
      
      toast.success('Registration successful! Please verify your email.');
    } catch (error) {
      const errorMessage = error.message || 'Registration failed';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Verify registration OTP
  const verifyRegistrationOTP = async (email, otp) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      await authService.verifyOTP(email, otp);

      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      toast.success('Email verified successfully! You can now login.');
      
      // Reset to login state
      dispatch({
        type: AUTH_ACTIONS.LOGOUT,
      });
    } catch (error) {
      const errorMessage = error.message || 'OTP verification failed';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Forgot password function
  const forgotPassword = async (email) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      await authService.forgotPassword(email);

      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      toast.success('Password reset link sent to your email');
    } catch (error) {
      const errorMessage = error.message || 'Failed to send reset email';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Reset password function
  const resetPassword = async (email, otp, newPassword) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      await authService.resetPassword(email, otp, newPassword);

      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      toast.success('Password reset successful! You can now login.');
    } catch (error) {
      const errorMessage = error.message || 'Password reset failed';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    socketService.disconnect();
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    toast.success('Logged out successfully');
  };

  // Update user function
  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    dispatch({ type: AUTH_ACTIONS.SET_USER, payload: updatedUser });
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Context value
  const value = {
    // State
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    otpStep: state.otpStep,
    tempEmail: state.tempEmail,

    // Actions
    login,
    verifyOTP,
    resendOTP,
    register,
    verifyRegistrationOTP,
    forgotPassword,
    resetPassword,
    logout,
    updateUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
