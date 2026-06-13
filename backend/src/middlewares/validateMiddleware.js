const Joi = require('joi');
const { sendErrorResponse } = require('../utils/response');

// Generic validation middleware
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return sendErrorResponse(res, 400, 'Validation failed', {
        errors: errorMessages,
        details: error.details
      });
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
};

// Validate request body
const validateBody = (schema) => validate(schema, 'body');

// Validate query parameters
const validateQuery = (schema) => validate(schema, 'query');

// Validate route parameters
const validateParams = (schema) => validate(schema, 'params');

// Combined validation for multiple sources
const validateRequest = (schemas) => {
  return (req, res, next) => {
    const errors = [];

    // Validate each specified source
    Object.keys(schemas).forEach(source => {
      if (req[source]) {
        const { error, value } = schemas[source].validate(req[source], {
          abortEarly: false,
          allowUnknown: source === 'query', // Allow unknown query params
          stripUnknown: true
        });

        if (error) {
          error.details.forEach(detail => {
            errors.push({
              source,
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            });
          });
        } else {
          req[source] = value;
        }
      }
    });

    if (errors.length > 0) {
      return sendErrorResponse(res, 400, 'Validation failed', { errors });
    }

    next();
  };
};

// Validate file uploads
const validateFileUpload = (options = {}) => {
  const {
    required = false,
    maxFiles = 5,
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    fieldName = 'images'
  } = options;

  return (req, res, next) => {
    const files = req.files;

    // Check if files are required
    if (required && (!files || files.length === 0)) {
      return sendErrorResponse(res, 400, `${fieldName} is required`);
    }

    // If no files and not required, continue
    if (!files || files.length === 0) {
      return next();
    }

    // Validate file count
    if (files.length > maxFiles) {
      return sendErrorResponse(res, 400, `Maximum ${maxFiles} files allowed`);
    }

    // Validate each file
    const errors = [];
    files.forEach((file, index) => {
      // Check file size
      if (file.size > maxSize) {
        errors.push(`File ${index + 1}: Size exceeds ${maxSize / (1024 * 1024)}MB limit`);
      }

      // Check mime type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        errors.push(`File ${index + 1}: Invalid file type. Allowed: ${allowedMimeTypes.join(', ')}`);
      }

      // Check if file is actually an image (additional security)
      if (file.mimetype.startsWith('image/')) {
        const validImageSignatures = {
          'image/jpeg': ['ff', 'd8'],
          'image/png': ['89', '50', '4e', '47'],
          'image/gif': ['47', '49', '46'],
          'image/webp': ['52', '49', '46', '46']
        };

        const buffer = file.buffer;
        if (buffer && buffer.length >= 4) {
          const signature = Array.from(buffer.slice(0, 4))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
          
          const expectedSignatures = validImageSignatures[file.mimetype];
          if (expectedSignatures) {
            const isValid = expectedSignatures.some(sig => 
              signature.toLowerCase().startsWith(sig.toLowerCase())
            );
            
            if (!isValid) {
              errors.push(`File ${index + 1}: Invalid file signature for ${file.mimetype}`);
            }
          }
        }
      }
    });

    if (errors.length > 0) {
      return sendErrorResponse(res, 400, 'File validation failed', { errors });
    }

    next();
  };
};

// Validate geolocation
const validateLocation = (req, res, next) => {
  const { lat, lng } = req.body.location || req.query;

  if (lat !== undefined || lng !== undefined) {
    const locationSchema = Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required()
    });

    const { error } = locationSchema.validate({ lat: parseFloat(lat), lng: parseFloat(lng) });
    
    if (error) {
      return sendErrorResponse(res, 400, 'Invalid location coordinates', {
        details: error.details
      });
    }

    // Update the location in request
    if (req.body.location) {
      req.body.location.lat = parseFloat(lat);
      req.body.location.lng = parseFloat(lng);
    }
  }

  next();
};

// Validate ObjectId parameters
const validateObjectId = (paramNames = ['id']) => {
  const paramArray = Array.isArray(paramNames) ? paramNames : [paramNames];
  
  return (req, res, next) => {
    const errors = [];
    
    paramArray.forEach(paramName => {
      const id = req.params[paramName];
      if (id && !/^[0-9a-fA-F]{24}$/.test(id)) {
        errors.push(`Invalid ${paramName}: must be a valid ObjectId`);
      }
    });

    if (errors.length > 0) {
      return sendErrorResponse(res, 400, 'Invalid parameters', { errors });
    }

    next();
  };
};

// Sanitize input to prevent NoSQL injection
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          // Remove any keys that start with $ or contain .
          if (key.startsWith('$') || key.includes('.')) {
            delete obj[key];
          } else {
            sanitize(obj[key]);
          }
        } else if (typeof obj[key] === 'string') {
          // Basic HTML/XSS sanitization
          obj[key] = obj[key].replace(/[<>]/g, '');
        }
      }
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
};

// Custom validation functions
const customValidators = {
  // Validate Indian phone number
  indianPhone: (value, helpers) => {
    const phoneRegex = /^(\+91|91|0)?[6-9]\d{9}$/;
    if (!phoneRegex.test(value.replace(/\s|-/g, ''))) {
      return helpers.error('any.invalid');
    }
    return value;
  },

  // Validate strong password
  strongPassword: (value, helpers) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasNonalphas = /\W/.test(value);

    if (value.length < minLength) {
      return helpers.error('password.minLength', { minLength });
    }
    if (!hasUpperCase) {
      return helpers.error('password.uppercase');
    }
    if (!hasLowerCase) {
      return helpers.error('password.lowercase');
    }
    if (!hasNumbers) {
      return helpers.error('password.number');
    }
    if (!hasNonalphas) {
      return helpers.error('password.special');
    }

    return value;
  },

  // Validate vehicle plate number (Indian format)
  vehiclePlate: (value, helpers) => {
    const plateRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/;
    const cleanPlate = value.replace(/\s|-/g, '').toUpperCase();
    
    if (!plateRegex.test(cleanPlate)) {
      return helpers.error('any.invalid');
    }
    
    return cleanPlate;
  }
};

// Add custom validators to Joi
Joi.extend((joi) => ({
  type: 'string',
  base: joi.string(),
  messages: {
    'password.minLength': 'Password must be at least {{#minLength}} characters long',
    'password.uppercase': 'Password must contain at least one uppercase letter',
    'password.lowercase': 'Password must contain at least one lowercase letter',
    'password.number': 'Password must contain at least one number',
    'password.special': 'Password must contain at least one special character'
  },
  rules: {
    indianPhone: {
      validate: customValidators.indianPhone
    },
    strongPassword: {
      validate: customValidators.strongPassword
    },
    vehiclePlate: {
      validate: customValidators.vehiclePlate
    }
  }
}));

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateRequest,
  validateFileUpload,
  validateLocation,
  validateObjectId,
  sanitizeInput,
  customValidators
};
