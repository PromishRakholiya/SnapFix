// Custom Error Class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Success Response Utility
const sendSuccessResponse = (res, statusCode, message, data = null, meta = null) => {
  const response = {
    success: true,
    message,
    ...(data && { data }),
    ...(meta && { meta })
  };

  res.status(statusCode).json(response);
};

// Error Response Utility
const sendErrorResponse = (res, statusCode, message, error = null) => {
  const response = {
    success: false,
    message,
    ...(error && process.env.NODE_ENV === 'development' && { error })
  };

  res.status(statusCode).json(response);
};

// Async Handler Wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Pagination Utility
const getPaginationOptions = (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Ensure reasonable limits
  const maxLimit = 100;
  const actualLimit = limit > maxLimit ? maxLimit : limit;

  return {
    page,
    limit: actualLimit,
    skip
  };
};

// Generate Pagination Meta
const generatePaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    }
  };
};

// Filter and Sort Utility
const buildQueryFilter = (query, allowedFields = []) => {
  const filter = {};
  
  // Build filter from allowed fields
  allowedFields.forEach(field => {
    if (query[field] !== undefined) {
      if (Array.isArray(query[field])) {
        filter[field] = { $in: query[field] };
      } else {
        filter[field] = query[field];
      }
    }
  });

  // Date range filters
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) {
      filter.createdAt.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filter.createdAt.$lte = new Date(query.endDate);
    }
  }

  // Search functionality
  if (query.search && query.searchFields) {
    const searchFields = Array.isArray(query.searchFields) 
      ? query.searchFields 
      : [query.searchFields];
    
    filter.$or = searchFields.map(field => ({
      [field]: { $regex: query.search, $options: 'i' }
    }));
  }

  return filter;
};

// Build Sort Options
const buildSortOptions = (query) => {
  let sort = {};
  
  if (query.sortBy) {
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    sort[query.sortBy] = sortOrder;
  } else {
    // Default sort by creation date (newest first)
    sort.createdAt = -1;
  }

  return sort;
};

// Distance Calculation (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

// Geospatial Query Builder
const buildLocationQuery = (lat, lng, radiusKm = 10) => {
  return {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusKm * 1000 // Convert to meters
      }
    }
  };
};

// Sanitize Input
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
};

// Generate Random String
const generateRandomString = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Format Phone Number
const formatPhoneNumber = (phone) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code if not present
  if (cleaned.length === 10 && !cleaned.startsWith('91')) {
    return `+91${cleaned}`;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  
  return phone;
};

// Validate Email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate Phone
const isValidPhone = (phone) => {
  const phoneRegex = /^[+]?[1-9][\d]{7,14}$/;
  return phoneRegex.test(phone);
};

// Cache Utility (In-memory for development)
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
  }

  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, value);
    if (ttlSeconds > 0) {
      this.ttl.set(key, Date.now() + (ttlSeconds * 1000));
    }
  }

  get(key) {
    if (this.ttl.has(key) && Date.now() > this.ttl.get(key)) {
      this.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  size() {
    return this.cache.size;
  }
}

const cache = new SimpleCache();

module.exports = {
  AppError,
  sendSuccessResponse,
  sendErrorResponse,
  asyncHandler,
  getPaginationOptions,
  generatePaginationMeta,
  buildQueryFilter,
  buildSortOptions,
  calculateDistance,
  buildLocationQuery,
  sanitizeInput,
  generateRandomString,
  formatPhoneNumber,
  isValidEmail,
  isValidPhone,
  cache
};
