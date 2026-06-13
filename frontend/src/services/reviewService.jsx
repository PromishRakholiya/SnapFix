import api from './api';

const reviewService = {
  // Submit a new review
  submitReview: async (reviewData) => {
    try {
      const response = await api.post('/reviews', reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get reviews with filtering and pagination
  getReviews: async (params = {}) => {
    try {
      const response = await api.get('/reviews', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get a specific review by ID
  getReviewById: async (reviewId) => {
    try {
      const response = await api.get(`/reviews/${reviewId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update a review (within 24 hours)
  updateReview: async (reviewId, updateData) => {
    try {
      const response = await api.patch(`/reviews/${reviewId}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get mechanic review statistics
  getMechanicReviewStats: async (mechanicId) => {
    try {
      const response = await api.get(`/reviews/mechanic/${mechanicId}/stats`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get recent reviews for a mechanic
  getRecentReviews: async (mechanicId, limit = 5) => {
    try {
      const response = await api.get(`/reviews`, {
        params: {
          mechanicId,
          limit,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default reviewService;
