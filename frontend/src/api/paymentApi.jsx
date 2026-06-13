import apiClient from './apiClient';

const paymentApi = {
  // Create payment order
  createPaymentOrder: async (paymentData) => {
    try {
      const response = await apiClient.post('/payments/create-order', paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create post-completion payment order
  createPostCompletionPaymentOrder: async (serviceRequestId) => {
    try {
      const response = await apiClient.post('/payments/create-post-completion-order', {
        serviceRequestId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Verify payment
  verifyPayment: async (paymentData) => {
    try {
      const response = await apiClient.post('/payments/verify', paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payment history
  getPaymentHistory: async (params = {}) => {
    try {
      const response = await apiClient.get('/payments/history', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payment details
  getPaymentDetails: async (paymentId) => {
    try {
      const response = await apiClient.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payment statistics
  getPaymentStats: async () => {
    try {
      const response = await apiClient.get('/payments/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Request refund
  requestRefund: async (paymentId, reason) => {
    try {
      const response = await apiClient.post(`/payments/${paymentId}/refund`, {
        reason
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get refund status
  getRefundStatus: async (paymentId) => {
    try {
      const response = await apiClient.get(`/payments/${paymentId}/refund-status`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payment methods
  getPaymentMethods: async () => {
    try {
      const response = await apiClient.get('/payments/methods');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create payment intent (for advanced payment flows)
  createPaymentIntent: async (paymentData) => {
    try {
      const response = await apiClient.post('/payments/create-intent', paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Confirm payment
  confirmPayment: async (paymentData) => {
    try {
      const response = await apiClient.post('/payments/confirm', paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payment analytics
  getPaymentAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/payments/analytics', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default paymentApi;
