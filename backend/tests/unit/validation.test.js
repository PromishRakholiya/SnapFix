const { validate, schemas } = require('../../src/middlewares/validationMiddleware');

describe('Validation Middleware', () => {
  describe('User Registration Schema', () => {
    test('should validate correct registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+11234567890',
        password: 'Password123!',
        role: 'customer'
      };

      const { error } = schemas.register.validate(validData);
      expect(error).toBeUndefined();
    });

    test('should reject invalid email', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        phone: '+11234567890',
        password: 'Password123!',
        role: 'customer'
      };

      const { error } = schemas.register.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('email');
    });

    test('should reject weak password', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+11234567890',
        password: 'weak',
        role: 'customer'
      };

      const { error } = schemas.register.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('password');
    });

    test('should reject invalid role', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+11234567890',
        password: 'Password123!',
        role: 'invalid'
      };

      const { error } = schemas.register.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('role');
    });
  });

  describe('Service Request Schema', () => {
    test('should validate correct service request data', () => {
      const validData = {
        issueType: 'engine_trouble',
        description: 'Car broke down',
        vehicleInfo: {
          type: 'car',
          model: 'Toyota Camry',
          year: 2020,
          plate: 'ABC123'
        },
        location: {
          lat: 40.7128,
          lng: -74.0060,
          address: 'New York, NY'
        },
        priority: 'high'
      };

      const { error } = schemas.serviceRequest.validate(validData);
      expect(error).toBeUndefined();
    });

    test('should reject invalid issue type', () => {
      const invalidData = {
        issueType: 'invalid_issue',
        description: 'Car broke down',
        vehicleInfo: {
          type: 'car',
          model: 'Toyota Camry',
          plate: 'ABC123'
        },
        location: {
          lat: 40.7128,
          lng: -74.0060,
          address: 'New York, NY'
        }
      };

      const { error } = schemas.serviceRequest.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('issueType');
    });

    test('should reject invalid coordinates', () => {
      const invalidData = {
        issueType: 'engine_trouble',
        description: 'Car broke down',
        vehicleInfo: {
          type: 'car',
          model: 'Toyota Camry',
          plate: 'ABC123'
        },
        location: {
          lat: 200, // Invalid latitude
          lng: -74.0060,
          address: 'New York, NY'
        }
      };

      const { error } = schemas.serviceRequest.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('lat');
    });
  });

  describe('Login Schema', () => {
    test('should validate correct login data', () => {
      const validData = {
        email: 'user@example.com',
        password: 'password123'
      };

      const { error } = schemas.login.validate(validData);
      expect(error).toBeUndefined();
    });

    test('should reject missing password', () => {
      const invalidData = {
        email: 'user@example.com'
      };

      const { error } = schemas.login.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('password');
    });
  });

  describe('Payment Schema', () => {
    test('should validate correct payment data', () => {
      const validData = {
        serviceRequestId: '60f7b1b9e1b3c45a1c8b4567',
        amount: 100.50,
        paymentMethod: 'card'
      };

      const { error } = schemas.payment.validate(validData);
      expect(error).toBeUndefined();
    });

    test('should reject invalid payment method', () => {
      const invalidData = {
        serviceRequestId: '60f7b1b9e1b3c45a1c8b4567',
        amount: 100.50,
        paymentMethod: 'invalid'
      };

      const { error } = schemas.payment.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('paymentMethod');
    });

    test('should reject negative amount', () => {
      const invalidData = {
        serviceRequestId: '60f7b1b9e1b3c45a1c8b4567',
        amount: -50,
        paymentMethod: 'card'
      };

      const { error } = schemas.payment.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('amount');
    });
  });
});
