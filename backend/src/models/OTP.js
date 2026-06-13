const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: [true, 'Phone or email identifier is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['phone', 'email'],
    required: [true, 'OTP type is required']
  },
  code: {
    type: String,
    required: [true, 'OTP code is required'],
    length: [6, 'OTP must be 6 digits']
  },
  purpose: {
    type: String,
    enum: ['registration', 'login', 'password_reset', 'phone_verification', 'email_verification'],
    required: [true, 'OTP purpose is required']
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: [3, 'Maximum 3 verification attempts allowed']
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  verifiedAt: Date,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Index for efficient queries
otpSchema.index({ identifier: 1, type: 1, isUsed: 1 });
otpSchema.index({ code: 1, isUsed: 1 });
otpSchema.index({ expiresAt: 1 });

// Generate OTP code
otpSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create OTP with expiration
otpSchema.statics.createOTP = async function(identifier, type, purpose, expirationMinutes = 10) {
  // Invalidate any existing OTPs for this identifier and purpose
  await this.updateMany(
    { identifier, type, purpose, isUsed: false },
    { isUsed: true }
  );

  const code = this.generateOTP();
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

  const otp = new this({
    identifier,
    type,
    code,
    purpose,
    expiresAt
  });

  await otp.save();
  return { code, expiresAt };
};

// Verify OTP
otpSchema.statics.verifyOTP = async function(identifier, code, purpose) {
  const otp = await this.findOne({
    identifier,
    code,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });

  if (!otp) {
    // Increment attempts for existing OTP
    await this.updateOne(
      {
        identifier,
        purpose,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      },
      { $inc: { attempts: 1 } }
    );
    return { success: false, message: 'Invalid or expired OTP' };
  }

  // Check attempt limit
  if (otp.attempts >= 3) {
    otp.isUsed = true;
    await otp.save();
    return { success: false, message: 'Maximum verification attempts exceeded' };
  }

  // Mark as used and verified
  otp.isUsed = true;
  otp.verifiedAt = new Date();
  await otp.save();

  return { success: true, message: 'OTP verified successfully', otp };
};

// Check if OTP can be resent
otpSchema.statics.canResendOTP = async function(identifier, type, purpose) {
  const lastOTP = await this.findOne({
    identifier,
    type,
    purpose
  }).sort({ createdAt: -1 });

  if (!lastOTP) {
    return { canResend: true };
  }

  const timeSinceLastSent = Date.now() - lastOTP.sentAt.getTime();
  const cooldownPeriod = 60 * 1000; // 1 minute

  if (timeSinceLastSent < cooldownPeriod) {
    const remainingTime = Math.ceil((cooldownPeriod - timeSinceLastSent) / 1000);
    return {
      canResend: false,
      message: `Please wait ${remainingTime} seconds before requesting a new OTP`
    };
  }

  return { canResend: true };
};

// Clean up expired and used OTPs (called by a cron job)
otpSchema.statics.cleanup = async function() {
  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isUsed: true, createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Used OTPs older than 24 hours
    ]
  });

  return result.deletedCount;
};

// Method to check if OTP is expired
otpSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to check if OTP is valid for verification
otpSchema.methods.isValidForVerification = function() {
  return !this.isUsed && !this.isExpired() && this.attempts < 3;
};

// Pre-save middleware to set sentAt timestamp
otpSchema.pre('save', function(next) {
  if (this.isNew) {
    this.sentAt = new Date();
  }
  next();
});

module.exports = mongoose.model('OTP', otpSchema);
