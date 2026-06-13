
import api from '../api/apiClient';

const paymentService = {
  // Create payment order
  createPaymentOrder: async (requestData) => {
    try {
      const response = await api.post('/payments/create-order', requestData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Verify payment
  verifyPayment: async (paymentData) => {
    try {
      const response = await api.post('/payments/verify', paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payment history
  getPaymentHistory: async (filters = {}) => {
    try {
      const response = await api.get('/payments/history', { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payment details
  getPaymentDetails: async (paymentId) => {
    try {
      const response = await api.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Process demo payment
  processDemoPayment: async (paymentData) => {
    try {
      const response = await api.post('/payments/demo', paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default paymentService;
