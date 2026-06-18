const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const OTP = require("../models/OTP");
const {
  sendSuccessResponse,
  sendErrorResponse,
  asyncHandler,
  formatPhoneNumber,
  isValidEmail,
  isValidPhone,
} = require("../utils/response");
const {
  generateToken,
  generateRefreshToken,
  authRateLimit,
  otpRateLimit,
  loginRateLimit,
} = require("../middlewares/authMiddleware");
const notificationService = require("../services/notificationService");
const emailService = require("../services/emailService");
const otpService = require("../services/otpService");
const logger = require("../config/logger");

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               phone:
 *                 type: string
 *                 example: +919876543210
 *               password:
 *                 type: string
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [customer, mechanic, admin]
 *                 example: customer
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    role = "customer",
    location,
    vehicles,
  } = req.body;

  // Validate input
  if (!name || !email || !phone || !password) {
    return sendErrorResponse(res, 400, "All fields are required");
  }

  if (!isValidEmail(email)) {
    return sendErrorResponse(res, 400, "Invalid email format");
  }

  if (!isValidPhone(phone)) {
    return sendErrorResponse(res, 400, "Invalid phone number format");
  }

  if (password.length < 6) {
    return sendErrorResponse(
      res,
      400,
      "Password must be at least 6 characters",
    );
  }

  // Format phone number
  const formattedPhone = formatPhoneNumber(phone);

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { phone: formattedPhone }],
  });

  if (existingUser) {
    // Delete unverified user
    if (!existingUser.isVerified) {
      await User.findByIdAndDelete(existingUser._id);
    } else {
      return sendErrorResponse(
        res,
        409,
        "User with this email or phone already exists"
      );
    }
  }

  // Create user
  const userData = {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: formattedPhone,
    passwordHash: password,
    role,
    ...(location && { location }),
    ...(vehicles && { vehicles }),
  };

  const user = new User(userData);
  await user.save();

  // Send OTP for email verification
  try {
    await otpService.createAndSendEmailOTP(
      user.email,
      "email_verification",
      user.name,
    );
    logger.info("Registration OTP sent successfully:", {
      userId: user._id,
      email: user.email,
    });
  } catch (error) {
    logger.error("Failed to send registration OTP:", error);
    // Don't fail registration if OTP sending fails
  }

  // Send welcome notification
  try {
    await notificationService.sendEmail({
      to: user.email,
      subject: "Welcome to SnapFix",
      template: "welcome",
      data: { name: user.name },
    });
  } catch (error) {
    logger.error("Welcome email failed:", error);
  }

  logger.info("User registered successfully:", {
    userId: user._id,
    email: user.email,
    role: user.role,
  });

  sendSuccessResponse(
    res,
    201,
    "User registered successfully. Please check your email for verification OTP.",
    {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
      requiresOTP: true,
      message:
        "Please verify your email with the OTP sent to complete registration",
    },
  );
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login with OTP verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: password123
 */
const login = [
  loginRateLimit, // Use more lenient rate limiter for login
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendErrorResponse(res, 400, "Email and password are required");
    }

    // Find user (email or phone)
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone: formatPhoneNumber(email) },
      ],
    }).select("+passwordHash");

    if (!user) {
      return sendErrorResponse(res, 401, "Invalid credentials");
    }

    // Check if user is active
    if (!user.isActive) {
      return sendErrorResponse(
        res,
        401,
        "Account is deactivated. Please contact support.",
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return sendErrorResponse(res, 401, "Invalid credentials");
    }

    // Check if user is verified
    if (!user.isVerified) {
      // Send OTP only for unverified users
      try {
        await otpService.createAndSendEmailOTP(
          user.email,
          "email_verification",
          user.name,
        );

        logger.info("Login OTP sent to unverified user:", {
          userId: user._id,
          email: user.email,
          ip: req.ip,
        });

        return sendSuccessResponse(
          res,
          200,
          "Account not verified. OTP sent to your email for verification.",
          {
            requiresOTP: true,
            email: user.email,
            isVerified: false,
            message: "Please verify your email with the OTP to complete login",
          },
        );
      } catch (error) {
        logger.error("Failed to send verification OTP:", error);
        return sendErrorResponse(res, 500, "Failed to send verification OTP");
      }
    }

    // For verified users, login directly
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info("Verified user logged in successfully:", {
      userId: user._id,
      email: user.email,
      role: user.role,
      ip: req.ip,
    });

    sendSuccessResponse(res, 200, "Login successful", {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        avatar: user.avatar,
        location: user.location,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
      requiresOTP: false,
      isVerified: true,
    });
  }),
];

/**
 * @swagger
 * /auth/verify-login-otp:
 *   post:
 *     summary: Complete login with OTP verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               otp:
 *                 type: string
 *                 example: 123456
 */
const verifyLoginOTP = [
  loginRateLimit, // Use more lenient rate limiter for OTP verification
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return sendErrorResponse(res, 400, "Email and OTP are required");
    }

    try {
      // Verify OTP
      const otpResult = await otpService.verifyOTP(
        email,
        otp,
        "email_verification",
      );

      if (!otpResult.success) {
        return sendErrorResponse(res, 400, otpResult.message);
      }

      // Find user
      const user = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { phone: formatPhoneNumber(email) },
        ],
      });

      if (!user) {
        return sendErrorResponse(res, 401, "User not found");
      }

      // Check if user is active
      if (!user.isActive) {
        return sendErrorResponse(
          res,
          401,
          "Account is deactivated. Please contact support.",
        );
      }

      // Generate tokens
      const accessToken = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      // Mark user as verified and update last login
      user.isVerified = true;
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      logger.info("User logged in successfully after OTP verification:", {
        userId: user._id,
        email: user.email,
        role: user.role,
        ip: req.ip,
      });

      sendSuccessResponse(res, 200, "Login successful", {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          location: user.location,
          rating: user.rating,
          lastLogin: user.lastLogin,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error("Login OTP verification failed:", error);
      return sendErrorResponse(res, 500, "OTP verification failed");
    }
  }),
];

/**
 * @swagger
 * /auth/resend-login-otp:
 *   post:
 *     summary: Resend login OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 */
const resendLoginOTP = [
  loginRateLimit, // Use more lenient rate limiter for resending OTP
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return sendErrorResponse(res, 400, "Email is required");
    }

    // Find user
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone: formatPhoneNumber(email) },
      ],
    });

    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    // Check if user is active
    if (!user.isActive) {
      return sendErrorResponse(
        res,
        401,
        "Account is deactivated. Please contact support.",
      );
    }

    try {
      // Generate and send new OTP
      await otpService.resendOTP(user.email, "email_verification", user.name);

      logger.info("Login OTP resent successfully:", {
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });

      sendSuccessResponse(res, 200, "OTP resent successfully", {
        email: user.email,
        message: "Please check your email for the new OTP",
      });
    } catch (error) {
      logger.error("Failed to resend login OTP:", error);
      return sendErrorResponse(res, 500, "Failed to resend OTP");
    }
  }),
];

/**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     summary: Send OTP for verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - type
 *               - purpose
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: john@example.com
 *               type:
 *                 type: string
 *                 enum: [phone, email]
 *                 example: email
 *               purpose:
 *                 type: string
 *                 enum: [registration, login, password_reset, phone_verification, email_verification]
 *                 example: email_verification
 */
const sendOTP = [
  otpRateLimit,
  asyncHandler(async (req, res) => {
    const { identifier, type, purpose } = req.body;

    if (!identifier || !type || !purpose) {
      return sendErrorResponse(
        res,
        400,
        "Identifier, type, and purpose are required",
      );
    }

    // Validate identifier format
    if (type === "email" && !isValidEmail(identifier)) {
      return sendErrorResponse(res, 400, "Invalid email format");
    }

    if (type === "phone" && !isValidPhone(identifier)) {
      return sendErrorResponse(res, 400, "Invalid phone number format");
    }

    // Check if OTP can be resent
    const canResend = await OTP.canResendOTP(identifier, type, purpose);
    if (!canResend.canResend) {
      return sendErrorResponse(res, 429, canResend.message);
    }

    // Generate and save OTP
    const { code, expiresAt } = await OTP.createOTP(identifier, type, purpose);

    // Send OTP
    const result = await notificationService.sendOTP(identifier, code, type);

    if (!result.success) {
      logger.error("OTP sending failed:", result);
      return sendErrorResponse(res, 500, "Failed to send OTP");
    }

    logger.info("OTP sent successfully:", {
      identifier,
      type,
      purpose,
      expiresAt,
    });

    sendSuccessResponse(res, 200, "OTP sent successfully", {
      expiresAt,
      nextResendAt: new Date(Date.now() + 60000), // 1 minute cooldown
    });
  }),
];

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - code
 *               - purpose
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: john@example.com
 *               code:
 *                 type: string
 *                 example: 123456
 *               purpose:
 *                 type: string
 *                 example: email_verification
 */
const verifyOTP = [
  otpRateLimit,
  asyncHandler(async (req, res) => {
    const { identifier, code, purpose } = req.body;

    if (!identifier || !code || !purpose) {
      return sendErrorResponse(
        res,
        400,
        "Identifier, code, and purpose are required",
      );
    }

    // Verify OTP
    const result = await OTP.verifyOTP(identifier, code, purpose);

    if (!result.success) {
      return sendErrorResponse(res, 400, result.message);
    }

    // Update user verification status if applicable
    if (purpose === "email_verification" || purpose === "phone_verification") {
      const user = await User.findOne({
        $or: [{ email: identifier }, { phone: identifier }],
      });

      if (user) {
        user.isVerified = true;
        await user.save({ validateBeforeSave: false });
      }
    }

    logger.info("OTP verified successfully:", {
      identifier,
      purpose,
    });

    sendSuccessResponse(res, 200, "OTP verified successfully", {
      verified: true,
      purpose,
    });
  }),
];

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 */
const forgotPassword = [
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return sendErrorResponse(res, 400, "Email is required");
    }

    if (!isValidEmail(email)) {
      return sendErrorResponse(res, 400, "Invalid email format");
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists - security best practice
      return sendSuccessResponse(
        res,
        200,
        "If the email exists, a reset link has been sent",
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send reset email
    try {
      await notificationService.sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        template: "password-reset",
        data: {
          name: user.name,
          resetUrl,
          expiresIn: "30 minutes",
        },
        priority: "high",
      });

      logger.info("Password reset email sent:", {
        userId: user._id,
        email: user.email,
        resetUrl,
      });

      sendSuccessResponse(res, 200, "Password reset link sent to your email");
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      logger.error("Password reset email failed:", error);
      return sendErrorResponse(res, 500, "Failed to send reset email");
    }
  }),
];

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: abc123...
 *               newPassword:
 *                 type: string
 *                 example: newPassword123
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return sendErrorResponse(res, 400, "Token and new password are required");
  }

  if (newPassword.length < 6) {
    return sendErrorResponse(
      res,
      400,
      "Password must be at least 6 characters",
    );
  }

  // Hash the token and find user
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: resetTokenHash,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return sendErrorResponse(res, 400, "Invalid or expired reset token");
  }

  // Update password
  user.passwordHash = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.passwordChangedAt = new Date();
  await user.save();

  // Generate new tokens
  const accessToken = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  logger.info("Password reset successfully:", {
    userId: user._id,
    email: user.email,
  });

  sendSuccessResponse(res, 200, "Password reset successful", {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  });
});

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendErrorResponse(res, 400, "Refresh token is required");
  }

  // This is handled by middleware
  sendSuccessResponse(res, 200, "Token refreshed successfully", {
    accessToken: req.newToken,
    refreshToken: refreshToken, // Return the same refresh token
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change password (authenticated)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return sendErrorResponse(
      res,
      400,
      "Current and new passwords are required",
    );
  }

  if (newPassword.length < 6) {
    return sendErrorResponse(
      res,
      400,
      "New password must be at least 6 characters",
    );
  }

  // Get user with password
  const user = await User.findById(req.user._id).select("+passwordHash");

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return sendErrorResponse(res, 400, "Current password is incorrect");
  }

  // Update password
  user.passwordHash = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  logger.info("Password changed successfully:", {
    userId: user._id,
    email: user.email,
  });

  sendSuccessResponse(res, 200, "Password changed successfully");
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
const logout = asyncHandler(async (req, res) => {
  // In a production app, you might want to blacklist the token
  // For this hackathon version, we'll just return success

  logger.info("User logged out:", {
    userId: req.user._id,
    email: req.user.email,
  });

  sendSuccessResponse(res, 200, "Logged out successfully");
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("vehicles")
    .select("-passwordHash -resetPasswordToken -resetPasswordExpire");

  sendSuccessResponse(res, 200, "User profile retrieved", { user });
});

module.exports = {
  register,
  login,
  verifyLoginOTP,
  resendLoginOTP,
  sendOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
  refreshToken,
  changePassword,
  logout,
  getCurrentUser,
};
