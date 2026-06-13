import api from './api';

class CustomerService {
  // Mechanic discovery
  async getNearbyMechanics(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });
      
      console.log('Making API call to:', `/customer/mechanics/nearby?${queryParams.toString()}`);
      console.log('Query params object:', params);
      console.log('Query string:', queryParams.toString());
      const response = await api.get(`/customer/mechanics/nearby?${queryParams.toString()}`);
      console.log('API response:', response.data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch nearby mechanics' };
    }
  }

  async getMechanicDetails(mechanicId) {
    try {
      const response = await api.get(`/customer/mechanics/${mechanicId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch mechanic details' };
    }
  }

  // Service requests
  async createServiceRequest(requestData) {
    try {
      const response = await api.post('/customer/service-requests', requestData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create service request' };
    }
  }

  async getServiceRequests(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });
      
      const response = await api.get(`/customer/requests?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch service requests' };
    }
  }

  // Profile management
  async getProfile() {
    try {
      const response = await api.get('/customer/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch profile' };
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await api.patch('/customer/profile', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update profile' };
    }
  }

  // File uploads
  async uploadImages(files) {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });
      
      const response = await api.post('/customer/upload/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to upload images' };
    }
  }

  async uploadAvatar(file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post('/customer/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to upload avatar' };
    }
  }

  // Reviews
  async createReview(reviewData) {
    try {
      const response = await api.post('/customer/reviews', reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create review' };
    }
  }

  async getReviews(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });
      
      const response = await api.get(`/customer/reviews?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch reviews' };
    }
  }

  // Payment methods
  async createPaymentOrder(paymentData) {
    try {
      const response = await api.post('/payments/create-order', paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async verifyPayment(verificationData) {
    try {
      const response = await api.post('/payments/verify', verificationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getPaymentHistory(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          queryParams.append(key, filters[key]);
        }
      });
      const response = await api.get(`/payments/history?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

const customerService = new CustomerService();
export default customerService;
