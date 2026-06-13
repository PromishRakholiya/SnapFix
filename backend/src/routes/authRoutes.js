const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate, schemas } = require('../middlewares/validationMiddleware');
const { authLimiter, passwordResetLimiter } = require('../middlewares/rateLimitMiddleware');

// Register route
router.post('/register', 
  authLimiter,
  validate(schemas.register),
  authController.register
);

// Login route
router.post('/login',
  authLimiter,
  validate(schemas.login),
  authController.login
);

// Verify login OTP route
router.post('/verify-login-otp',
  authLimiter,
  validate(schemas.verifyLoginOTP),
  authController.verifyLoginOTP
);

// Resend login OTP route
router.post('/resend-login-otp',
  authLimiter,
  validate(schemas.resendLoginOTP),
  authController.resendLoginOTP
);

// Verify OTP route
router.post('/verify-otp',
  authLimiter,
  validate(schemas.verifyOTP),
  authController.verifyOTP
);

// Forgot password route
router.post('/forgot-password',
  passwordResetLimiter,
  validate(schemas.forgotPassword),
  authController.forgotPassword
);

// Reset password route
router.post('/reset-password',
  passwordResetLimiter,
  validate(schemas.resetPassword),
  authController.resetPassword
);

// Refresh token route
router.post('/refresh-token',
  authLimiter,
  validate(schemas.refreshToken),
  authController.refreshToken
);

module.exports = router;
