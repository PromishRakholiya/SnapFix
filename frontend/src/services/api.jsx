import axios from "axios";
import toast from "react-hot-toast";

// Create helper to dynamically set base URL based on browser location
const getBaseURL = () => {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000/api";
  }
  return process.env.REACT_APP_API_URL || "https://snapfix-hq4w.onrender.com/api";
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
});

// Request interceptor to add auth token and handle FormData uploads
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      // Let the browser set the correct multipart boundary for FormData
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 unauthorized errors (skip for auth login/refresh endpoints)
    const isAuthRequest = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh-token');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const response = await axios.post(
            `${getBaseURL()}/auth/refresh-token`,
            { refreshToken },
          );

          // Handle the correct response structure
          if (response.data.success && response.data.data) {
            const { accessToken } = response.data.data;
            localStorage.setItem("accessToken", accessToken);

            // Retry the original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          } else {
            throw new Error("Invalid refresh token response");
          }
        } else {
          throw new Error("No refresh token available");
        }
      } catch (refreshError) {
        // Refresh failed, clear all auth data
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        // Only redirect if we're not already on login page
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      toast.error("Too many requests. Please try again later.");
    }

    // Handle network errors
    if (!error.response) {
      toast.error("Network error. Please check your connection.");
    }

    return Promise.reject(error);
  },
);

export default api;
