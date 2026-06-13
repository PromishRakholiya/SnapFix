import apiClient from './apiClient';

const mechanicApi = {
  // Profile Management
  getProfile: async () => {
    try {
      const response = await apiClient.get('/mechanic/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await apiClient.patch('/mechanic/profile', profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  uploadAvatar: async (formData) => {
    try {
      const response = await apiClient.post('/mechanic/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await apiClient.patch('/mechanic/change-password', passwordData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Statistics & Analytics
  getStats: async () => {
    try {
      const response = await apiClient.get('/mechanic/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Earnings Management
  getEarningsSummary: async (params = {}) => {
    try {
      const response = await apiClient.get('/mechanic/earnings/summary', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getDetailedEarnings: async (params = {}) => {
    try {
      const response = await apiClient.get('/mechanic/earnings/detailed', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEarningsChart: async (params = {}) => {
    try {
      const response = await apiClient.get('/mechanic/earnings/chart', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  exportEarnings: async (params = {}) => {
    try {
      const response = await apiClient.get('/mechanic/earnings/export', { 
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEarnings: async (params = {}) => {
    try {
      const response = await apiClient.get('/mechanic/earnings', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Service Areas
  getServiceAreas: async () => {
    try {
      const response = await apiClient.get('/mechanic/service-areas');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  addServiceArea: async (areaData) => {
    try {
      const response = await apiClient.post('/mechanic/service-areas', areaData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateServiceArea: async (areaId, areaData) => {
    try {
      const response = await apiClient.put(`/mechanic/service-areas/${areaId}`, areaData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  removeServiceArea: async (areaId) => {
    try {
      const response = await apiClient.delete(`/mechanic/service-areas/${areaId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Availability
  updateAvailability: async (availabilityData) => {
    try {
      const response = await apiClient.patch('/mechanic/availability', availabilityData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Request Management
  getAssignedRequests: async (params = {}) => {
    try {
      const response = await apiClient.get('/mechanic/requests', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  acceptRequest: async (requestId, data = {}) => {
    try {
      const response = await apiClient.patch(`/mechanic/requests/${requestId}/accept`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  rejectRequest: async (requestId, data = {}) => {
    try {
      const response = await apiClient.post(`/mechanic/requests/${requestId}/reject`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  startWork: async (requestId, data = {}) => {
    try {
      const response = await apiClient.patch(`/mechanic/requests/${requestId}/start`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  completeRequest: async (requestId, data = {}) => {
    try {
      const response = await apiClient.patch(`/mechanic/requests/${requestId}/complete`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateRequestStatus: async (requestId, statusData) => {
    try {
      const response = await apiClient.patch(`/mechanic/requests/${requestId}/status`, statusData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Payment History
  getPaymentHistory: async (params = {}) => {
    try {
      const response = await apiClient.get('/mechanic/payments/history', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPaymentDetails: async (paymentId) => {
    try {
      const response = await apiClient.get(`/mechanic/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Reviews
  getReviews: async (params = {}) => {
    try {
      const response = await apiClient.get('/mechanic/reviews', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getReviewById: async (reviewId) => {
    try {
      const response = await apiClient.get(`/mechanic/reviews/${reviewId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Activity
  getActivity: async (params = {}) => {
    try {
      const response = await apiClient.get('/mechanic/activity', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Verification
  submitVerification: async (verificationData) => {
    try {
      const response = await apiClient.post('/mechanic/verification', verificationData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getVerificationStatus: async () => {
    try {
      const response = await apiClient.get('/mechanic/verification');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateVerification: async (verificationData) => {
    try {
      const response = await apiClient.put('/mechanic/verification', verificationData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Wallet Actions
  redeemWallet: async (redeemData) => {
    try {
      const response = await apiClient.post('/mechanic/wallet/redeem', redeemData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default mechanicApi;
