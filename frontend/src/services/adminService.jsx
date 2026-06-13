import api from './api';

class AdminService {
  // Dashboard Statistics
  async getDashboardStats() {
    try {
      const response = await api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch dashboard statistics' };
    }
  }

  async getAnalytics(period = '30d') {
    try {
      const response = await api.get(`/admin/analytics?period=${period}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch analytics' };
    }
  }

  // User Management
  async getUsers(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });
      
      const response = await api.get(`/admin/users?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch users' };
    }
  }

  async updateUserStatus(userId, statusData) {
    try {
      const response = await api.patch(`/admin/users/${userId}/status`, statusData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update user status' };
    }
  }

  async verifyUser(userId) {
    try {
      const response = await api.put(`/admin/users/${userId}/verify`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to verify user' };
    }
  }

  async bulkUserActions(actionData) {
    try {
      const response = await api.post('/admin/users/bulk-action', actionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to perform bulk action' };
    }
  }

  // Service Request Management
  async getServiceRequests(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });
      
      const response = await api.get(`/admin/service-requests?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch service requests' };
    }
  }

  // Payment Management
  async getPayments(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });
      
      const response = await api.get(`/admin/payments?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch payments' };
    }
  }

  async getPaymentDetails(paymentId) {
    try {
      const response = await api.get(`/admin/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch payment details' };
    }
  }

  // Review Management
  async getReviews(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });
      
      const response = await api.get(`/admin/reviews?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch reviews' };
    }
  }

  async getReviewById(reviewId) {
    try {
      const response = await api.get(`/admin/reviews/${reviewId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch review details' };
    }
  }

  async deleteReview(reviewId) {
    try {
      const response = await api.delete(`/admin/reviews/${reviewId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete review' };
    }
  }

  async getMechanicReviewStats(mechanicId) {
    try {
      const response = await api.get(`/admin/reviews/mechanic/${mechanicId}/stats`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch mechanic review stats' };
    }
  }

  // Mechanic Verification Management
  async getVerifications(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });
      
      const response = await api.get(`/admin/verifications?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch verifications' };
    }
  }

  async reviewVerification(verificationId, reviewData) {
    try {
      const response = await api.post(`/admin/verifications/${verificationId}/review`, reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to review verification' };
    }
  }

  // System Health
  async getSystemHealth() {
    try {
      const response = await api.get('/admin/system/health');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch system health' };
    }
  }

  // Admin Profile
  async getProfile() {
    try {
      const response = await api.get('/admin/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch profile' };
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await api.patch('/admin/profile', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update profile' };
    }
  }

  async uploadAvatar(formData) {
    try {
      const response = await api.post('/admin/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to upload avatar' };
    }
  }

  async changePassword(passwordData) {
    try {
      const response = await api.patch('/admin/change-password', passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to change password' };
    }
  }

  async getActivity(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });
      
      const response = await api.get(`/admin/activity?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch activity' };
    }
  }
}

const adminService = new AdminService();

export default adminService;

