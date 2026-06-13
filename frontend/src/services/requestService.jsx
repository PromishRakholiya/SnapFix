import api from './api';

class RequestService {
  // Create a new service request (Customer)
  async createRequest(requestData) {
    try {
      const response = await api.post('/customer/service-requests', requestData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create request' };
    }
  }

  // Get customer's requests
  async getMyRequests(filters = {}) {
    try {
      const response = await api.get('/customer/requests', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch requests' };
    }
  }

  // Get specific request details
  async getRequestDetails(requestId) {
    try {
      const response = await api.get(`/customer/requests/${requestId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch request details' };
    }
  }

  // Cancel a request (Customer)
  async cancelRequest(requestId, reason = '') {
    try {
      const response = await api.patch(`/customer/requests/${requestId}/cancel`, {
        reason
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to cancel request' };
    }
  }

  // Delete a request (Customer - only if unassigned)
  async deleteRequest(requestId) {
    try {
      const response = await api.delete(`/customer/requests/${requestId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete request' };
    }
  }

  // Confirm price and assign mechanic (Customer)
  async confirmRequestPrice(requestId) {
    try {
      const response = await api.patch(`/customer/requests/${requestId}/confirm-price`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to confirm price' };
    }
  }

  // Get assigned requests (Mechanic)
  async getAssignedRequests(filters = {}) {
    try {
      const response = await api.get('/mechanic/requests', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch assigned requests' };
    }
  }

  // Accept a request (Mechanic)
  async acceptRequest(requestId, data) {
    try {
      const response = await api.patch(`/mechanic/requests/${requestId}/accept`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to accept request' };
    }
  }

  // Reject a service request (for direct bookings)
  async rejectRequest(requestId, data) {
    try {
      const response = await api.post(`/mechanic/requests/${requestId}/reject`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to reject request' };
    }
  }

  // Start work on a request (Mechanic)
  async startWork(requestId, data = {}) {
    try {
      const response = await api.patch(`/mechanic/requests/${requestId}/start`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to start work' };
    }
  }

  // Complete a request (Mechanic)
  async completeRequest(requestId, data) {
    try {
      const response = await api.patch(`/mechanic/requests/${requestId}/complete`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to complete request' };
    }
  }

  // Update request status (Mechanic)
  async updateRequestStatus(requestId, status) {
    try {
      const response = await api.patch(`/mechanic/requests/${requestId}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update request status' };
    }
  }

  // Upload images for a request
  async uploadImages(files) {
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`images`, file);
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

  // Get nearby mechanics (Customer)
  async getNearbyMechanics(latitude, longitude, radius = 10) {
    try {
      const response = await api.get('/customer/mechanics/nearby', {
        params: { latitude, longitude, radius }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to find nearby mechanics' };
    }
  }
}

const requestService = new RequestService();

export default requestService;
