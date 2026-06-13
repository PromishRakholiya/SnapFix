import apiClient from './apiClient';

const customerApi = {
  // Vehicle Management
  getVehicles: async () => {
    try {
      const response = await apiClient.get('/customer/vehicles');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  addVehicle: async (vehicleData) => {
    try {
      const response = await apiClient.post('/customer/vehicles', vehicleData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateVehicle: async (vehicleId, vehicleData) => {
    try {
      const response = await apiClient.put(`/customer/vehicles/${vehicleId}`, vehicleData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteVehicle: async (vehicleId) => {
    try {
      const response = await apiClient.delete(`/customer/vehicles/${vehicleId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  setDefaultVehicle: async (vehicleId) => {
    try {
      const response = await apiClient.patch(`/customer/vehicles/${vehicleId}/default`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mechanic Discovery
  getNearbyMechanics: async (params = {}) => {
    try {
      const response = await apiClient.get('/customer/mechanics/nearby', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getMechanicDetails: async (mechanicId) => {
    try {
      const response = await apiClient.get(`/customer/mechanics/${mechanicId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Service Requests
  getServiceRequests: async (params = {}) => {
    try {
      const response = await apiClient.get('/customer/service-requests', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default customerApi;
