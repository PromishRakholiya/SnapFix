const Joi = require('joi');

// Custom validation function to handle JSON strings and objects
const parseJsonOrObject = (value, helpers) => {
  if (typeof value === 'object' && value !== null) {
    return value; // Already an object, return as is
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
};

// Common validation schemas
const commonSchemas = {
  objectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('Invalid ID format'),
  phone: Joi.string().regex(/^[+]?[1-9][\d]{7,14}$/).message('Invalid phone number format'),
  email: Joi.string().email().message('Invalid email format'),
  password: Joi.string().min(6).max(128).message('Password must be between 6 and 128 characters'),
  location: Joi.alternatives().try(
    Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
      address: Joi.string().max(200).optional()
    }),
    Joi.string().custom(parseJsonOrObject, 'parse location json')
  ),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

// User validation schemas
const userValidation = {
  register: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required'
    }),
    email: commonSchemas.email.required(),
    phone: commonSchemas.phone.required(),
    password: commonSchemas.password.required(),
    role: Joi.string().valid('customer', 'mechanic', 'admin').default('customer'),
    location: commonSchemas.location.optional(),
    vehicles: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('car', 'motorcycle', 'truck', 'bus', 'other').required(),
        model: Joi.string().min(1).max(50).required(),
        plate: Joi.string().min(1).max(20).required()
      })
    ).optional()
  }),

  login: Joi.object({
    email: Joi.string().required().messages({
      'any.required': 'Email or phone is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    phone: commonSchemas.phone.optional(),
    location: commonSchemas.location.optional(),
    vehicles: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('car', 'motorcycle', 'truck', 'bus', 'other').required(),
        model: Joi.string().min(1).max(50).required(),
        plate: Joi.string().min(1).max(20).required()
      })
    ).optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password.required()
  }),

  forgotPassword: Joi.object({
    email: commonSchemas.email.required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: commonSchemas.password.required()
  })
};

// OTP validation schemas
const otpValidation = {
  send: Joi.object({
    identifier: Joi.string().required().messages({
      'any.required': 'Phone or email is required'
    }),
    type: Joi.string().valid('phone', 'email').required(),
    purpose: Joi.string().valid('registration', 'login', 'password_reset', 'phone_verification', 'email_verification').required()
  }),

  verify: Joi.object({
    identifier: Joi.string().required(),
    code: Joi.string().length(6).required().messages({
      'string.length': 'OTP must be 6 digits',
      'any.required': 'OTP code is required'
    }),
    purpose: Joi.string().valid('registration', 'login', 'password_reset', 'phone_verification', 'email_verification').required()
  })
};

// Service Request validation schemas
const serviceRequestValidation = {
  create: Joi.object({
    issueType: Joi.string().valid(
      'flat_tire', 'battery_dead', 'engine_trouble', 'fuel_empty',
      'key_locked', 'accident', 'overheating', 'brake_failure',
      'transmission_issue', 'other'
    ).required(),
    description: Joi.string().min(10).max(1000).required().messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    vehicleInfo: Joi.object({
      type: Joi.string().valid('car', 'motorcycle', 'truck', 'bus', 'other').required(),
      model: Joi.string().min(1).max(50).required(),
      plate: Joi.string().min(1).max(20).required(),
      year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).optional()
    }).required(),
    location: commonSchemas.location.required(),
    images: Joi.array().items(Joi.string().uri()).max(5).optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'emergency').default('medium'),
    broadcastRadius: Joi.number().min(1).max(50).default(10)
  }),

  update: Joi.object({
    description: Joi.string().min(10).max(1000).optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'emergency').optional(),
    quotation: Joi.number().min(0).max(100000).optional()
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('assigned', 'enroute', 'in_progress', 'completed', 'cancelled').required(),
    note: Joi.string().max(500).optional(),
    quotation: Joi.number().min(0).max(100000).optional()
  }),

  assign: Joi.object({
    mechanicId: commonSchemas.objectId.required()
  }),

  cancel: Joi.object({
    reason: Joi.string().min(5).max(500).required()
  }),

  addNote: Joi.object({
    text: Joi.string().min(1).max(500).required()
  })
};

// Payment validation schemas
const paymentValidation = {
  create: Joi.object({
    requestId: commonSchemas.objectId.required(),
    amount: Joi.number().min(1).max(100000).required(),
    method: Joi.string().valid('UPI', 'Card', 'NetBanking', 'Wallet', 'Cash').required(),
    currency: Joi.string().valid('INR', 'USD').default('INR')
  }),

  verify: Joi.object({
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required()
  }),

  refund: Joi.object({
    paymentId: commonSchemas.objectId.required(),
    amount: Joi.number().min(1).optional(),
    reason: Joi.string().min(5).max(500).required()
  })
};

// Review validation schemas
const reviewValidation = {
  create: Joi.object({
    serviceRequestId: commonSchemas.objectId.required(),
    mechanicId: commonSchemas.objectId.required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(1000).optional(),
    serviceQuality: Joi.number().integer().min(1).max(5).optional(),
    timeliness: Joi.number().integer().min(1).max(5).optional(),
    professionalism: Joi.number().integer().min(1).max(5).optional(),
    wouldRecommend: Joi.boolean().default(true),
    tags: Joi.array().items(
      Joi.string().valid(
        'excellent_service', 'quick_response', 'professional', 'fair_pricing',
        'courteous', 'skilled', 'helpful', 'reliable', 'needs_improvement',
        'expensive', 'delayed', 'unprofessional'
      )
    ).optional(),
    isPublic: Joi.boolean().default(true)
  }),

  adminResponse: Joi.object({
    text: Joi.string().min(1).max(500).required()
  }),

  flag: Joi.object({
    reason: Joi.string().min(5).max(200).required()
  })
};

// Query validation schemas
const queryValidation = {
  serviceRequests: Joi.object({
    status: Joi.alternatives().try(
      Joi.string().valid('pending', 'assigned', 'enroute', 'in_progress', 'completed', 'cancelled'),
      Joi.array().items(Joi.string().valid('pending', 'assigned', 'enroute', 'in_progress', 'completed', 'cancelled'))
    ),
    issueType: Joi.string().valid(
      'flat_tire', 'battery_dead', 'engine_trouble', 'fuel_empty',
      'key_locked', 'accident', 'overheating', 'brake_failure',
      'transmission_issue', 'other'
    ),
    priority: Joi.string().valid('low', 'medium', 'high', 'emergency'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    search: Joi.string().max(100),
    searchFields: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ),
    sortBy: Joi.string().valid('createdAt', 'status', 'priority', 'quotation'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    ...commonSchemas.pagination
  }),

  nearbyMechanics: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(1).max(50).default(10),
    limit: Joi.number().integer().min(1).max(50).default(10)
  }),

  analytics: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    granularity: Joi.string().valid('day', 'week', 'month').default('day')
  })
};

// Admin validation schemas
const adminValidation = {
  createMechanic: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: commonSchemas.email.required(),
    phone: commonSchemas.phone.required(),
    password: commonSchemas.password.required(),
    location: commonSchemas.location.required()
  }),

  updateUser: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone.optional(),
    role: Joi.string().valid('customer', 'mechanic', 'admin').optional(),
    isActive: Joi.boolean().optional(),
    location: commonSchemas.location.optional()
  }),

  broadcastMessage: Joi.object({
    message: Joi.string().min(1).max(500).required(),
    type: Joi.string().valid('info', 'warning', 'urgent').default('info'),
    targetRole: Joi.string().valid('customer', 'mechanic', 'all').default('all'),
    location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
      radius: Joi.number().min(1).max(100).default(50)
    }).optional()
  })
};

// Mechanic verification validation schemas
const mechanicVerificationValidation = {
  submitVerification: Joi.object({
    shopName: Joi.string().min(2).max(100).required(),
    shopAddress: Joi.alternatives().try(
      Joi.object({
        street: Joi.string().min(5).max(200).required(),
        city: Joi.string().min(2).max(50).required(),
        state: Joi.string().min(2).max(50).required(),
        zipCode: Joi.string().min(3).max(10).required(),
        country: Joi.string().min(2).max(50).required()
      }),
      Joi.string().custom(parseJsonOrObject, 'parse shopAddress json')
    ).required(),
    location: commonSchemas.location.required(),
    gstNumber: Joi.string().max(15).optional(),
    documentType: Joi.string().valid('aadhar', 'pan', 'driving_license', 'shop_license', 'other').required()
  })
};

module.exports = {
  commonSchemas,
  userValidation,
  otpValidation,
  serviceRequestValidation,
  paymentValidation,
  reviewValidation,
  queryValidation,
  adminValidation,
  mechanicVerificationValidation
};
