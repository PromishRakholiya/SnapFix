const mongoose = require('mongoose');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing';

// Mock logger to reduce noise during tests
jest.mock('../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock upload service to avoid actual Cloudinary calls during tests
jest.mock('../src/services/uploadService', () => ({
  uploadServiceRequestImages: jest.fn().mockResolvedValue(['http://example.com/image1.jpg']),
  uploadProfilePicture: jest.fn().mockResolvedValue('http://example.com/avatar.jpg'),
  deleteImage: jest.fn().mockResolvedValue(true)
}));

// Mock notification service
jest.mock('../src/services/notificationService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendSMS: jest.fn().mockResolvedValue(true),
  addToQueue: jest.fn().mockResolvedValue(true)
}));

// Global test setup
beforeAll(async () => {
  // Set up test database connection if needed
  if (mongoose.connection.readyState === 0) {
    const testDbUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
    if (testDbUri) {
      await mongoose.connect(testDbUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
  }
});

// Global test cleanup
afterAll(async () => {
  // Clean up database connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

// Set longer timeout for integration tests
jest.setTimeout(30000);
