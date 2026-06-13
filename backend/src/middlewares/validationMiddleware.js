const Joi = require('joi');
const logger = require('../config/logger');

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Property to validate (body, query, params)
 * @returns {Function} Express middleware function
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Validation failed', {
        property,
        errors,
        endpoint: req.originalUrl,
        method: req.method,
        body: req.body
      });

      console.log('Validation failed:', {
        property,
        errors,
        endpoint: req.originalUrl,
        method: req.method,
        body: req.body
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Replace the original property with the validated value
    req[property] = value;
    next();
  };
};

/**
 * Validation schemas
 */
const schemas = {
  // Authentication schemas
  register: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(6).required(), // Simplified for development
    phone: Joi.string().min(10).required(), // Simplified phone validation
    role: Joi.string().valid('customer', 'mechanic').required(),
    location: Joi.object().optional(),
    vehicles: Joi.array().optional()
  }),

  login: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().default(false)
  }),

  verifyOTP: Joi.object({
    identifier: Joi.string().required().messages({
      'any.required': 'Identifier (email or phone) is required'
    }),
    code: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'OTP must be 6 digits',
      'any.required': 'OTP code is required'
    }),
    purpose: Joi.string().valid('registration', 'login', 'password_reset', 'phone_verification', 'email_verification').required().messages({
      'any.required': 'OTP purpose is required'
    })
  }),

  verifyLoginOTP: Joi.object({
    email: Joi.string().email().lowercase().required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required()
  }),

  resendLoginOTP: Joi.object({
    email: Joi.string().email().lowercase().required()
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().lowercase().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  }),

  // Service request schema
  serviceRequest: Joi.object({
    issueType: Joi.string().valid(
      'flat_tire',
      'battery_dead',
      'engine_trouble',
      'fuel_empty',
      'key_locked',
      'accident',
      'overheating',
      'brake_failure',
      'transmission_issue',
      'other'
    ).required(),
    description: Joi.string().trim().max(500).required(),
    vehicleInfo: Joi.object({
      type: Joi.string().valid('car', 'motorcycle', 'truck', 'bus', 'other').required(),
      make: Joi.string().optional().default('Unknown'),
      model: Joi.string().optional().default('Unknown'),
      year: Joi.number().min(1900).max(new Date().getFullYear() + 1).optional(),
      plate: Joi.string().optional().default('N/A')
    }).required(),
    location: Joi.alternatives().try(
      Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required(),
        address: Joi.string().trim().max(200).optional().default('Address not provided')
      }),
      Joi.string().custom((value, helpers) => {
        if (typeof value === 'object' && value !== null) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'object' && parsed !== null) {
              return parsed;
            }
          } catch (error) {
            return helpers.error('any.invalid');
          }
        }
        return helpers.error('any.invalid');
      }, 'parse location json')
    ).required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'emergency').default('medium'),
    broadcastRadius: Joi.number().min(1).max(50).default(25)
  }),

  // Profile schemas
  updateProfile: Joi.object({
    name: Joi.string().trim().min(2).max(50),
    phone: Joi.string().pattern(/^\+?[1-9]\d{10,14}$/),
    address: Joi.alternatives().try(
      Joi.object({
        street: Joi.string().trim().max(100),
        city: Joi.string().trim().max(50),
        state: Joi.string().trim().max(50),
        country: Joi.string().trim().max(50),
        zipCode: Joi.string().trim().max(10)
      }),
      Joi.string().custom((value, helpers) => {
        if (typeof value === 'object' && value !== null) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'object' && parsed !== null) {
              return parsed;
            }
          } catch (error) {
            return helpers.error('any.invalid');
          }
        }
        return helpers.error('any.invalid');
      }, 'parse address json')
    )
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
  }),

  // Review schema
  review: Joi.object({
    serviceRequestId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    mechanicId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().trim().max(1000).optional(),
    tags: Joi.array().items(
      Joi.string().valid(
        'excellent_service', 'quick_response', 'professional', 'fair_pricing',
        'courteous', 'skilled', 'helpful', 'reliable', 'needs_improvement',
        'expensive', 'delayed', 'unprofessional'
      )
    ).optional()
  }),

  // Mechanic verification schemas
  submitVerification: Joi.object({
    shopName: Joi.string().trim().min(2).max(100).required(),
    shopAddress: Joi.alternatives().try(
      Joi.object({
        street: Joi.string().trim().min(5).max(200).required(),
        city: Joi.string().trim().min(2).max(50).required(),
        state: Joi.string().trim().min(2).max(50).required(),
        zipCode: Joi.string().trim().min(3).max(10).required(),
        country: Joi.string().trim().min(2).max(50).required()
      }),
      Joi.string().custom((value, helpers) => {
        if (typeof value === 'object' && value !== null) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'object' && parsed !== null) {
              return parsed;
            }
          } catch (error) {
            return helpers.error('any.invalid');
          }
        }
        return helpers.error('any.invalid');
      }, 'parse shopAddress json')
    ).required(),
    location: Joi.alternatives().try(
      Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required()
      }),
      Joi.string().custom((value, helpers) => {
        if (typeof value === 'object' && value !== null) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'object' && parsed !== null) {
              return parsed;
            }
          } catch (error) {
            return helpers.error('any.invalid');
          }
        }
        return helpers.error('any.invalid');
      }, 'parse location json')
    ).required(),
    gstNumber: Joi.string().trim().max(15).optional(),
    documentType: Joi.string().valid('aadhar', 'pan', 'driving_license', 'shop_license', 'other').required()
  }),

  updateVerification: Joi.object({
    shopName: Joi.string().trim().min(2).max(100).optional(),
    shopAddress: Joi.alternatives().try(
      Joi.object({
        street: Joi.string().trim().min(5).max(200).required(),
        city: Joi.string().trim().min(2).max(50).required(),
        state: Joi.string().trim().min(2).max(50).required(),
        zipCode: Joi.string().trim().min(3).max(10).required(),
        country: Joi.string().trim().min(2).max(50).required()
      }),
      Joi.string().custom((value, helpers) => {
        if (typeof value === 'object' && value !== null) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'object' && parsed !== null) {
              return parsed;
            }
          } catch (error) {
            return helpers.error('any.invalid');
          }
        }
        return helpers.error('any.invalid');
      }, 'parse shopAddress json')
    ).optional(),
    location: Joi.alternatives().try(
      Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required()
      }),
      Joi.string().custom((value, helpers) => {
        if (typeof value === 'object' && value !== null) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'object' && parsed !== null) {
              return parsed;
            }
          } catch (error) {
            return helpers.error('any.invalid');
          }
        }
        return helpers.error('any.invalid');
      }, 'parse location json')
    ).optional(),
    gstNumber: Joi.string().trim().max(15).optional(),
    documentType: Joi.string().valid('aadhar', 'pan', 'driving_license', 'shop_license', 'other').optional()
  }),

  reviewVerification: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    notes: Joi.string().trim().max(500).optional().allow(''),
    rejectionReason: Joi.string().trim().max(500).when('status', {
      is: 'rejected',
      then: Joi.string().required().min(1),
      otherwise: Joi.forbidden()
    })
  }),

  // Payment schema
  payment: Joi.object({
    serviceRequestId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    amount: Joi.number().min(0.01).required(),
    currency: Joi.string().length(3).uppercase().default('USD'),
    paymentMethod: Joi.string().valid('card', 'wallet', 'upi').required(),
    tip: Joi.number().min(0).default(0)
  }),

  // Post-completion payment schema
  postCompletionPayment: Joi.object({
    serviceRequestId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  }),

  // Update request status schema
  updateRequestStatus: Joi.object({
    status: Joi.string().valid('assigned', 'enroute', 'in_progress', 'completed', 'cancelled').required()
  }),
  
  createServiceRequest: Joi.object({
    mechanicId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    issueType: Joi.string().valid(
      'flat_tire', 'battery_dead', 'fuel_empty', 'engine_trouble', 
      'accident', 'key_locked', 'overheating', 'brake_failure', 
      'transmission_issue', 'other'
    ).required(),
    description: Joi.string().trim().min(10).max(1000).required(),
    vehicleInfo: Joi.alternatives().try(
      Joi.object({
        type: Joi.string().valid('car', 'motorcycle', 'truck', 'bus', 'other').required(),
        model: Joi.string().trim().min(2).max(50).required(),
        plate: Joi.string().trim().min(3).max(20).required(),
        year: Joi.number().min(1900).max(new Date().getFullYear() + 1).optional()
      }),
      Joi.string().custom((value, helpers) => {
        if (typeof value === 'object' && value !== null) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'object' && parsed !== null) {
              return parsed;
            }
          } catch (error) {
            return helpers.error('any.invalid');
          }
        }
        return helpers.error('any.invalid');
      }, 'parse vehicleInfo json')
    ).required(),
    location: Joi.alternatives().try(
      Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required(),
        address: Joi.string().max(200).optional()
      }),
      Joi.string().custom((value, helpers) => {
        if (typeof value === 'object' && value !== null) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'object' && parsed !== null) {
              return parsed;
            }
          } catch (error) {
            return helpers.error('any.invalid');
          }
        }
        return helpers.error('any.invalid');
      }, 'parse location json')
    ).required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'emergency').default('medium'),
    broadcastRadius: Joi.number().min(1).max(50).default(25),
    isDirectBooking: Joi.boolean().default(false),
    images: Joi.array().items(Joi.string()).max(5).optional(),
    userExpectedPrice: Joi.number().min(0).required()
  }),

  // Vehicle management schemas
  addVehicle: Joi.object({
    name: Joi.string().trim().min(1).max(50).required(),
    type: Joi.string().valid('car', 'motorcycle', 'truck', 'bus', 'other').required(),
    make: Joi.string().trim().min(1).max(50).required(),
    model: Joi.string().trim().min(1).max(50).required(),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).required(),
    plate: Joi.string().trim().min(3).max(20).required(),
    color: Joi.string().trim().max(30).optional(),
    isDefault: Joi.boolean().default(false)
  }),

  updateVehicle: Joi.object({
    name: Joi.string().trim().min(1).max(50).required(),
    type: Joi.string().valid('car', 'motorcycle', 'truck', 'bus', 'other').required(),
    make: Joi.string().trim().min(1).max(50).required(),
    model: Joi.string().trim().min(1).max(50).required(),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).required(),
    plate: Joi.string().trim().min(3).max(20).required(),
    color: Joi.string().trim().max(30).optional(),
    isDefault: Joi.boolean().default(false)
  }),

  // Chat schemas
  sendMessage: Joi.object({
    content: Joi.string().trim().min(1).max(1000).required(),
    messageType: Joi.string().valid('text', 'image', 'file').default('text'),
    fileUrl: Joi.string().uri().optional()
  })
};

module.exports = {
  validate,
  schemas
};
