import api from "./api";

class MechanicVerificationService {
  // Submit verification request
  async submitVerification(formData) {
    try {
      console.log("Submitting verification with FormData:", formData);

      const response = await api.post("/mechanic/verification", formData);

      console.log("Verification submission response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Verification submission error:", error);
      console.error("Error response:", error.response?.data);
      throw (
        error.response?.data || { message: "Failed to submit verification" }
      );
    }
  }

  // Get verification status
  async getVerificationStatus() {
    try {
      const response = await api.get("/mechanic/verification");
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Failed to get verification status" }
      );
    }
  }

  // Update verification request
  async updateVerification(formData) {
    try {
      const response = await api.put("/mechanic/verification", formData);
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Failed to update verification" }
      );
    }
  }

  // Admin: Get all verification requests
  async getAllVerifications(filters = {}) {
    try {
      const response = await api.get("/admin/verifications", {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Failed to fetch verifications" }
      );
    }
  }

  // Admin: Review verification request
  async reviewVerification(verificationId, reviewData) {
    try {
      console.log("Reviewing verification:", { verificationId, reviewData });
      const response = await api.post(
        `/admin/verifications/${verificationId}/review`,
        reviewData,
      );
      console.log("Review response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Review verification error:", error);
      console.error("Error response:", error.response?.data);
      throw (
        error.response?.data || { message: "Failed to review verification" }
      );
    }
  }
}

const mechanicVerificationService = new MechanicVerificationService();

export default mechanicVerificationService;
