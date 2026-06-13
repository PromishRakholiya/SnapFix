// API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  VERIFY_LOGIN_OTP: '/auth/verify-login-otp',
  RESEND_LOGIN_OTP: '/auth/resend-login-otp',
  REGISTER: '/auth/register',
  VERIFY_OTP: '/auth/verify-otp',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  REFRESH_TOKEN: '/auth/refresh-token',

  // Customer
  CUSTOMER_PROFILE: '/customer/profile',
  CUSTOMER_REQUESTS: '/customer/requests',
  CUSTOMER_REVIEWS: '/customer/reviews',
  CUSTOMER_PAYMENTS: '/payments',
  CUSTOMER_VEHICLES: '/customer/vehicles',

  // Mechanic
  MECHANIC_PROFILE: '/mechanic/profile',
  MECHANIC_REQUESTS: '/mechanic/requests',
  MECHANIC_AVAILABILITY: '/mechanic/availability',
  MECHANIC_EARNINGS: '/mechanic/earnings',

  // Admin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_ANALYTICS: '/admin/analytics',

  // Payments
  PAYMENT_CREATE: '/payments/create-order',
  PAYMENT_VERIFY: '/payments/verify',
  PAYMENT_HISTORY: '/payments/history',
};

// Request status options
export const REQUEST_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  ENROUTE: 'enroute',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  OFFERED: 'offered',
};

export const REQUEST_STATUS_LABELS = {
  [REQUEST_STATUS.PENDING]: 'Pending',
  [REQUEST_STATUS.ASSIGNED]: 'Assigned',
  [REQUEST_STATUS.ENROUTE]: 'En Route',
  [REQUEST_STATUS.IN_PROGRESS]: 'In Progress',
  [REQUEST_STATUS.COMPLETED]: 'Completed',
  [REQUEST_STATUS.CANCELLED]: 'Cancelled',
  [REQUEST_STATUS.OFFERED]: 'Price Offered',
};

export const REQUEST_STATUS_COLORS = {
  [REQUEST_STATUS.PENDING]: 'warning',
  [REQUEST_STATUS.ASSIGNED]: 'primary',
  [REQUEST_STATUS.ENROUTE]: 'blue',
  [REQUEST_STATUS.IN_PROGRESS]: 'blue',
  [REQUEST_STATUS.COMPLETED]: 'success',
  [REQUEST_STATUS.CANCELLED]: 'danger',
  [REQUEST_STATUS.OFFERED]: 'warning',
};

// Issue types
export const ISSUE_TYPES = {
  FLAT_TIRE: 'flat_tire',
  BATTERY_DEAD: 'battery_dead',
  ENGINE_TROUBLE: 'engine_trouble',
  FUEL_EMPTY: 'fuel_empty',
  KEY_LOCKED: 'key_locked',
  ACCIDENT: 'accident',
  OVERHEATING: 'overheating',
  BRAKE_FAILURE: 'brake_failure',
  TRANSMISSION_ISSUE: 'transmission_issue',
  OTHER: 'other',
};

export const ISSUE_TYPE_LABELS = {
  [ISSUE_TYPES.FLAT_TIRE]: 'Flat Tire',
  [ISSUE_TYPES.BATTERY_DEAD]: 'Dead Battery',
  [ISSUE_TYPES.ENGINE_TROUBLE]: 'Engine Trouble',
  [ISSUE_TYPES.FUEL_EMPTY]: 'Out of Fuel',
  [ISSUE_TYPES.KEY_LOCKED]: 'Keys Locked Inside',
  [ISSUE_TYPES.ACCIDENT]: 'Accident',
  [ISSUE_TYPES.OVERHEATING]: 'Engine Overheating',
  [ISSUE_TYPES.BRAKE_FAILURE]: 'Brake Failure',
  [ISSUE_TYPES.TRANSMISSION_ISSUE]: 'Transmission Issue',
  [ISSUE_TYPES.OTHER]: 'Other',
};

// Priority levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  EMERGENCY: 'emergency',
};

export const PRIORITY_LABELS = {
  [PRIORITY_LEVELS.LOW]: 'Low',
  [PRIORITY_LEVELS.MEDIUM]: 'Medium',
  [PRIORITY_LEVELS.HIGH]: 'High',
  [PRIORITY_LEVELS.EMERGENCY]: 'Emergency',
};

export const PRIORITY_COLORS = {
  [PRIORITY_LEVELS.LOW]: 'secondary',
  [PRIORITY_LEVELS.MEDIUM]: 'primary',
  [PRIORITY_LEVELS.HIGH]: 'warning',
  [PRIORITY_LEVELS.EMERGENCY]: 'danger',
};

// Vehicle types
export const VEHICLE_TYPES = {
  CAR: 'car',
  MOTORCYCLE: 'motorcycle',
  TRUCK: 'truck',
  BUS: 'bus',
  OTHER: 'other',
};

export const VEHICLE_TYPE_LABELS = {
  [VEHICLE_TYPES.CAR]: 'Car',
  [VEHICLE_TYPES.MOTORCYCLE]: 'Motorcycle',
  [VEHICLE_TYPES.TRUCK]: 'Truck',
  [VEHICLE_TYPES.BUS]: 'Bus',
  [VEHICLE_TYPES.OTHER]: 'Other',
};

// User roles
export const USER_ROLES = {
  CUSTOMER: 'customer',
  MECHANIC: 'mechanic',
  ADMIN: 'admin',
};

export const USER_ROLE_LABELS = {
  [USER_ROLES.CUSTOMER]: 'Customer',
  [USER_ROLES.MECHANIC]: 'Mechanic',
  [USER_ROLES.ADMIN]: 'Admin',
};

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.PENDING]: 'Pending',
  [PAYMENT_STATUS.SUCCESS]: 'Success',
  [PAYMENT_STATUS.FAILED]: 'Failed',
  [PAYMENT_STATUS.REFUNDED]: 'Refunded',
};

// Local storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
};

// Default values
export const DEFAULTS = {
  PAGE_SIZE: 10,
  SEARCH_RADIUS: 10, // kilometers
  REQUEST_TIMEOUT: 30000, // milliseconds
  DEBOUNCE_DELAY: 300, // milliseconds
  LOCATION_ACCURACY: 10, // meters
};

// Map configuration
export const MAP_CONFIG = {
  DEFAULT_CENTER: {
    lat: 28.6139, // New Delhi
    lng: 77.2090,
  },
  DEFAULT_ZOOM: 13,
  MARKER_COLORS: {
    CUSTOMER: '#ef4444',
    MECHANIC: '#22c55e',
    REQUEST: '#f59e0b',
  },
};

// Notification types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

// Socket events
export const SOCKET_EVENTS = {
  // Client to Server
  JOIN_REQUEST: 'join_request',
  LEAVE_REQUEST: 'leave_request',
  UPDATE_LOCATION: 'update_location',
  SEND_MESSAGE: 'send_message',
  EMERGENCY_ALERT: 'emergency_alert',

  // Server to Client
  REQUEST_UPDATED: 'request_updated',
  LOCATION_UPDATED: 'location_updated',
  NEW_MESSAGE: 'new_message',
  EMERGENCY_RECEIVED: 'emergency_alert',
  MECHANIC_ASSIGNED: 'mechanic_assigned',
  SERVICE_STARTED: 'service_started',
  SERVICE_COMPLETED: 'service_completed',
};

// Form validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[+]?[1-9][\d]{7,14}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
  LICENSE_PLATE: /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,
};

// Error messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  WEAK_PASSWORD: 'Password must be at least 6 characters with uppercase, lowercase, and number',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  INVALID_OTP: 'Please enter a valid 6-digit OTP',
  LOCATION_REQUIRED: 'Location access is required for this feature',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
};

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  REGISTER_SUCCESS: 'Registration successful!',
  OTP_SENT: 'OTP sent successfully',
  PASSWORD_RESET: 'Password reset successful',
  PROFILE_UPDATED: 'Profile updated successfully',
  REQUEST_CREATED: 'Service request created successfully',
  REQUEST_CANCELLED: 'Request cancelled successfully',
  PAYMENT_SUCCESS: 'Payment completed successfully',
  REVIEW_SUBMITTED: 'Review submitted successfully',
};
