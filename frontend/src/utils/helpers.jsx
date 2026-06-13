import moment from 'moment';
import { VALIDATION_PATTERNS, ERROR_MESSAGES } from './constants';

// Format date and time
export const formatDate = (date, format = 'MMM DD, YYYY') => {
  return moment(date).format(format);
};

export const formatDateTime = (date) => {
  return moment(date).format('MMM DD, YYYY HH:mm');
};

export const formatTime = (date) => {
  return moment(date).format('HH:mm');
};

export const getRelativeTime = (date) => {
  return moment(date).fromNow();
};

// Format currency
export const formatCurrency = (amount, currency = '₹') => {
  if (!amount && amount !== 0) return `${currency}0`;
  return `${currency}${amount.toLocaleString('en-IN')}`;
};

// Format phone number
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{5})(\d{5})$/);
  if (match) {
    return `+${match[1]} ${match[2]} ${match[3]}`;
  }
  return phone;
};

// Validation functions
export const validateEmail = (email) => {
  if (!email) return ERROR_MESSAGES.REQUIRED_FIELD;
  if (!VALIDATION_PATTERNS.EMAIL.test(email)) return ERROR_MESSAGES.INVALID_EMAIL;
  return null;
};

export const validatePhone = (phone) => {
  if (!phone) return ERROR_MESSAGES.REQUIRED_FIELD;
  if (!VALIDATION_PATTERNS.PHONE.test(phone)) return ERROR_MESSAGES.INVALID_PHONE;
  return null;
};

export const validatePassword = (password) => {
  if (!password) return ERROR_MESSAGES.REQUIRED_FIELD;
  if (password.length < 6) return ERROR_MESSAGES.WEAK_PASSWORD;
  return null;
};

export const validateOTP = (otp) => {
  if (!otp) return ERROR_MESSAGES.REQUIRED_FIELD;
  if (!/^\d{6}$/.test(otp)) return ERROR_MESSAGES.INVALID_OTP;
  return null;
};

export const validateRequired = (value, fieldName = 'This field') => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
};

// Location utilities
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

export const formatDistance = (distance) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};

export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
};

// Get current location
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let message = 'Unable to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
          default:
            message = 'An unknown error occurred';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
};

// String utilities
export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalizeWords = (str) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Array utilities
export const groupBy = (array, key) => {
  return array.reduce((result, currentValue) => {
    (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
    return result;
  }, {});
};

export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    if (order === 'asc') {
      return a[key] > b[key] ? 1 : -1;
    }
    return a[key] < b[key] ? 1 : -1;
  });
};

export const filterBy = (array, filters) => {
  return array.filter(item => {
    return Object.keys(filters).every(key => {
      if (filters[key] === '' || filters[key] === null || filters[key] === undefined) {
        return true;
      }
      return item[key] === filters[key];
    });
  });
};

// Debounce function
export const debounce = (func, wait, immediate) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};

// Generate unique ID
export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

// Download file
export const downloadFile = (data, filename, type = 'text/csv') => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Storage utilities
export const setLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Error setting localStorage:', error);
    return false;
  }
};

export const getLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error getting localStorage:', error);
    return defaultValue;
  }
};

export const removeLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing localStorage:', error);
    return false;
  }
};

// Token utilities
export const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

export const isTokenExpired = (token) => {
  const payload = decodeJWT(token);
  if (!payload) return true;
  
  const currentTime = Date.now() / 1000;
  return payload.exp < currentTime;
};

export const getTokenExpiryTime = (token) => {
  const payload = decodeJWT(token);
  if (!payload) return null;
  
  return new Date(payload.exp * 1000);
};

export const getTimeUntilExpiry = (token) => {
  const payload = decodeJWT(token);
  if (!payload) return 0;
  
  const currentTime = Date.now() / 1000;
  return Math.max(0, payload.exp - currentTime);
};

// Debug utilities
export const debugAuthState = () => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const user = localStorage.getItem('user');
  
  console.log('=== Auth Debug Info ===');
  console.log('Access Token:', accessToken ? 'Present' : 'Missing');
  console.log('Refresh Token:', refreshToken ? 'Present' : 'Missing');
  console.log('User Data:', user ? 'Present' : 'Missing');
  
  if (accessToken) {
    const payload = decodeJWT(accessToken);
    if (payload) {
      console.log('Token Expiry:', new Date(payload.exp * 1000));
      console.log('Time Until Expiry:', getTimeUntilExpiry(accessToken), 'seconds');
      console.log('Is Expired:', isTokenExpired(accessToken));
    }
  }
  
  console.log('=======================');
};

// Image utilities
export const compressImage = (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(resolve, 'image/jpeg', quality);
    };

    img.src = URL.createObjectURL(file);
  });
};

export const getFilePreview = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Error handling
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { data, status } = error.response;
    return {
      message: data.message || 'An error occurred',
      status,
      errors: data.errors || [],
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: 'Network error. Please check your connection.',
      status: 0,
      errors: [],
    };
  } else {
    // Something else happened
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
      errors: [],
    };
  }
};

// Class names utility for conditional classes
export const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ');
};
