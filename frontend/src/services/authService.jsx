import api from './api';

class AuthService {
  // Login - Step 1: Verify credentials and send OTP
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  }

  // Login - Step 2: Verify OTP and complete login
  async verifyLoginOTP(email, otp) {
    try {
      const response = await api.post('/auth/verify-login-otp', { email, otp });
      
      if (response.data.success) {
        const { user, tokens } = response.data.data;
        
        // Store user data and tokens
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        return response.data;
      }
      
      throw new Error('OTP verification failed');
    } catch (error) {
      throw error.response?.data || { message: 'OTP verification failed' };
    }
  }

  // Resend login OTP
  async resendLoginOTP(email) {
    try {
      const response = await api.post('/auth/resend-login-otp', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to resend OTP' };
    }
  }

  // Register new user
  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  }

  // Verify email OTP after registration
  async verifyOTP(email, otp) {
    try {
      const response = await api.post('/auth/verify-otp', { 
        identifier: email, 
        code: otp, 
        purpose: 'email_verification' 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'OTP verification failed' };
    }
  }

  // Forgot password
  async forgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send reset email' };
    }
  }

  // Reset password
  async resetPassword(email, otp, newPassword) {
    try {
      const response = await api.post('/auth/reset-password', {
        email,
        otp,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Password reset failed' };
    }
  }

  // Refresh token
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh-token', { refreshToken });
      
      if (response.data.success && response.data.data) {
        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        return accessToken;
      }
      
      throw new Error('Token refresh failed');
    } catch (error) {
      // Clear stored data and redirect to login
      this.logout();
      throw error.response?.data || { message: 'Session expired' };
    }
  }

  // Logout
  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Get current user from storage
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem('accessToken');
    const user = this.getCurrentUser();
    const isTokenValid = this.isTokenValid();
    
    // User is authenticated if we have all required data and token is valid
    return !!(token && user && isTokenValid);
  }

  // Get access token
  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  // Validate token (check if it's expired)
  isTokenValid() {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      // Decode JWT token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }

  // Check if token needs refresh (refresh 5 minutes before expiry)
  shouldRefreshToken() {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = payload.exp - currentTime;
      return timeUntilExpiry < 300; // 5 minutes
    } catch (error) {
      return false;
    }
  }
}

const authService = new AuthService();

export default authService;
