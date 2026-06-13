const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError, sendErrorResponse, asyncHandler } = require('../utils/response');

// Protect routes - require authentication
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check for token in cookies (for web sessions)
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return sendErrorResponse(res, 401, 'Access denied. No token provided.');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.id).select('+passwordHash');
    if (!user) {
      return sendErrorResponse(res, 401, 'User no longer exists.');
    }

    // Check if user is active
    if (!user.isActive) {
      return sendErrorResponse(res, 401, 'User account is deactivated.');
    }

    // Check if user changed password after token was issued
    if (user.passwordChangedAt && decoded.iat < parseInt(user.passwordChangedAt.getTime() / 1000, 10)) {
      return sendErrorResponse(res, 401, 'User recently changed password. Please log in again.');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendErrorResponse(res, 401, 'Invalid token.');
    } else if (error.name === 'TokenExpiredError') {
      return sendErrorResponse(res, 401, 'Token expired.');
    }
    
    return sendErrorResponse(res, 401, 'Token verification failed.');
  }
});

// Optional authentication - doesn't fail if no token
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
    }
  }

  next();
});

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// Generate refresh token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

// Verify refresh token
const verifyRefreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendErrorResponse(res, 400, 'Refresh token is required.');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return sendErrorResponse(res, 401, 'Invalid refresh token.');
    }

    // Generate new access token
    const newToken = generateToken(user._id);
    
    req.user = user;
    req.newToken = newToken;
    next();
  } catch (error) {
    return sendErrorResponse(res, 401, 'Invalid refresh token.');
  }
});

// Check if user owns resource
const checkOwnership = (resourceField = 'customerId') => {
  return asyncHandler(async (req, res, next) => {
    const resource = req.resource || req.serviceRequest || req.payment || req.review;
    
    if (!resource) {
      return sendErrorResponse(res, 404, 'Resource not found.');
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check ownership based on resource field
    let isOwner = false;
    
    if (resourceField === 'customerId' && resource.customerId) {
      isOwner = resource.customerId.toString() === req.user._id.toString();
    } else if (resourceField === 'mechanicId' && resource.mechanicId) {
      isOwner = resource.mechanicId.toString() === req.user._id.toString();
    } else if (resourceField === 'userId' && resource.userId) {
      isOwner = resource.userId.toString() === req.user._id.toString();
    } else if (resourceField === '_id') {
      isOwner = resource._id.toString() === req.user._id.toString();
    }

    if (!isOwner) {
      return sendErrorResponse(res, 403, 'Access denied. You can only access your own resources.');
    }

    next();
  });
};

// Rate limiting for sensitive operations
const createRateLimiter = (windowMs, max, message) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip || req.user?._id?.toString() || 'anonymous';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    const userAttempts = attempts.get(key) || [];
    const recentAttempts = userAttempts.filter(time => time > windowStart);
    
    if (recentAttempts.length >= max) {
      const retryAfter = Math.ceil((recentAttempts[0] + windowMs - now) / 1000);
      res.set('Retry-After', retryAfter);
      return sendErrorResponse(res, 429, message || 'Too many requests. Please try again later.');
    }

    // Add current attempt
    recentAttempts.push(now);
    attempts.set(key, recentAttempts);

    next();
  };
};

// Specific rate limiters
const authRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  20, // 20 attempts (increased from 5)
  'Too many authentication attempts. Please try again in 15 minutes.'
);

// More lenient rate limiter for login attempts
const loginRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  50, // 50 attempts (very lenient for login)
  'Too many login attempts. Please try again in 15 minutes.'
);

const otpRateLimit = createRateLimiter(
  60 * 1000, // 1 minute
  5, // 5 attempts (increased from 3)
  'Too many OTP requests. Please wait 1 minute before requesting again.'
);

const paymentRateLimit = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  10, // 10 attempts
  'Too many payment requests. Please try again in 5 minutes.'
);

// Role-based authorization middleware
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Alias for protect function to match import name
const authenticateToken = protect;

module.exports = {
  protect,
  authenticateToken,
  authorize,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  checkOwnership,
  authRateLimit,
  loginRateLimit,
  otpRateLimit,
  paymentRateLimit
};
