const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * Basic rate limiter for general API requests - DISABLED FOR DEVELOPMENT
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Very high limit - essentially disabled
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'Rate limit exceeded'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      error: 'Rate limit exceeded'
    });
  }
});
/**
 * Strict rate limiter for authentication endpoints - DISABLED FOR DEVELOPMENT
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Very high limit - essentially disabled
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    error: 'Authentication rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      error: 'Authentication rate limit exceeded'
    });
  }
});

/**
 * Very strict rate limiter for password reset and OTP requests - DISABLED FOR DEVELOPMENT
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10000, // Very high limit - essentially disabled
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.',
    error: 'Password reset rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Password reset rate limit exceeded', {
      ip: req.ip,
      endpoint: req.originalUrl,
      method: req.method,
      email: req.body?.email,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts, please try again later.',
      error: 'Password reset rate limit exceeded'
    });
  }
});

/**
 * Rate limiter for file upload endpoints
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 upload requests per windowMs
  message: {
    success: false,
    message: 'Too many upload requests, please try again later.',
    error: 'Upload rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many upload requests, please try again later.',
      error: 'Upload rate limit exceeded'
    });
  }
});

/**
 * Rate limiter for payment endpoints - RELAXED FOR DEVELOPMENT
 */
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Very high limit - essentially disabled
  message: {
    success: false,
    message: 'Too many payment requests, please try again later.',
    error: 'Payment rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Payment rate limit exceeded', {
      ip: req.ip,
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many payment requests, please try again later.',
      error: 'Payment rate limit exceeded'
    });
  }
});

/**
 * Rate limiter for admin endpoints
 */
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for admin operations
  message: {
    success: false,
    message: 'Too many admin requests, please try again later.',
    error: 'Admin rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Admin rate limit exceeded', {
      ip: req.ip,
      endpoint: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many admin requests, please try again later.',
      error: 'Admin rate limit exceeded'
    });
  }
});

/**
 * Rate limiter for search and filtering endpoints
 */
const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 search requests per 5 minutes
  message: {
    success: false,
    message: 'Too many search requests, please try again later.',
    error: 'Search rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Search rate limit exceeded', {
      ip: req.ip,
      endpoint: req.originalUrl,
      method: req.method,
      query: req.query,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many search requests, please try again later.',
      error: 'Search rate limit exceeded'
    });
  }
});

/**
 * Create a custom rate limiter with specific options
 * @param {Object} options - Rate limit options
 * @returns {Function} Express middleware
 */
const createCustomLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
      success: false,
      message: 'Too many requests, please try again later.',
      error: 'Rate limit exceeded'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Custom rate limit exceeded', {
        ip: req.ip,
        endpoint: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent'),
        options: options.name || 'custom'
      });
      
      res.status(429).json(options.message || defaultOptions.message);
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
  paymentLimiter,
  adminLimiter,
  searchLimiter,
  createCustomLimiter
};
