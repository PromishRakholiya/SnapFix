const crypto = require('crypto');
const OTP = require('../models/OTP');
const emailService = require('./emailService');
const logger = require('../config/logger');

class OTPService {
  constructor() {
    this.OTP_LENGTH = 6;
    this.OTP_EXPIRY_MINUTES = 10;
    this.MAX_ATTEMPTS = 3;
  }

  // Generate a 6-digit OTP
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Create and send OTP for email verification
  async createAndSendEmailOTP(email, purpose = 'email_verification', userName = 'User') {
    try {
      // Check if there's an existing valid OTP
      await this.invalidateExistingOTPs(email, 'email', purpose);

      // Generate new OTP
      const otpCode = this.generateOTP();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Save OTP to database
      const otp = new OTP({
        identifier: email,
        type: 'email',
        code: otpCode,
        purpose: purpose,
        expiresAt: expiresAt,
        isUsed: false,
        attempts: 0
      });

      await otp.save();

      // Send OTP via email
      await emailService.sendOTPEmail(email, otpCode, userName);

      logger.info('OTP created and sent successfully', {
        email,
        purpose,
        otpId: otp._id,
        expiresAt
      });

      return {
        success: true,
        message: 'OTP sent to your email address',
        otpId: otp._id,
        expiresAt: expiresAt,
        expiresInMinutes: this.OTP_EXPIRY_MINUTES
      };
    } catch (error) {
      logger.error('Failed to create and send OTP:', {
        email,
        purpose,
        error: error.message
      });
      
      throw new Error('Failed to send OTP. Please try again.');
    }
  }

  // Verify OTP
  async verifyOTP(identifier, otpCode, purpose = 'email_verification', ipAddress = null, userAgent = null) {
    try {
      // Find the OTP
      const otp = await OTP.findOne({
        identifier: identifier,
        code: otpCode,
        purpose: purpose,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      if (!otp) {
        // Try to find if there's an expired or used OTP
        const expiredOtp = await OTP.findOne({
          identifier: identifier,
          code: otpCode,
          purpose: purpose
        }).sort({ createdAt: -1 });

        if (expiredOtp) {
          if (expiredOtp.isUsed) {
            throw new Error('OTP has already been used');
          }
          if (expiredOtp.expiresAt <= new Date()) {
            throw new Error('OTP has expired. Please request a new one');
          }
        }
        
        throw new Error('Invalid OTP code');
      }

      // Check attempts
      if (otp.attempts >= this.MAX_ATTEMPTS) {
        throw new Error('Maximum verification attempts exceeded. Please request a new OTP');
      }

      // Update OTP as used
      otp.isUsed = true;
      otp.verifiedAt = new Date();
      otp.ipAddress = ipAddress;
      otp.userAgent = userAgent;
      await otp.save();

      logger.info('OTP verified successfully', {
        identifier,
        purpose,
        otpId: otp._id,
        verifiedAt: otp.verifiedAt
      });

      return {
        success: true,
        message: 'OTP verified successfully',
        verifiedAt: otp.verifiedAt
      };
    } catch (error) {
      // Increment attempts for failed verification
      const otp = await OTP.findOne({
        identifier: identifier,
        code: otpCode,
        purpose: purpose,
        isUsed: false
      }).sort({ createdAt: -1 });

      if (otp && otp.attempts < this.MAX_ATTEMPTS) {
        otp.attempts += 1;
        await otp.save();
      }

      logger.error('OTP verification failed:', {
        identifier,
        purpose,
        error: error.message,
        attempts: otp ? otp.attempts : 0
      });

      throw error;
    }
  }

  // Resend OTP
  async resendOTP(identifier, purpose = 'email_verification', userName = 'User') {
    try {
      // Check if user can request another OTP (rate limiting)
      const recentOTP = await OTP.findOne({
        identifier: identifier,
        purpose: purpose,
        sentAt: { $gt: new Date(Date.now() - 1 * 60 * 1000) } // 1 minute cooldown
      }).sort({ createdAt: -1 });

      if (recentOTP) {
        throw new Error('Please wait before requesting another OTP');
      }

      // Create and send new OTP
      return await this.createAndSendEmailOTP(identifier, purpose, userName);
    } catch (error) {
      logger.error('Failed to resend OTP:', {
        identifier,
        purpose,
        error: error.message
      });
      
      throw error;
    }
  }

  // Invalidate existing OTPs for the same identifier and purpose
  async invalidateExistingOTPs(identifier, type, purpose) {
    try {
      await OTP.updateMany(
        {
          identifier: identifier,
          type: type,
          purpose: purpose,
          isUsed: false
        },
        {
          isUsed: true,
          verifiedAt: new Date()
        }
      );

      logger.info('Existing OTPs invalidated', {
        identifier,
        type,
        purpose
      });
    } catch (error) {
      logger.error('Failed to invalidate existing OTPs:', error);
    }
  }

  // Clean up expired OTPs (can be called periodically)
  async cleanupExpiredOTPs() {
    try {
      const result = await OTP.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      logger.info('Expired OTPs cleaned up', {
        deletedCount: result.deletedCount
      });

      return result.deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired OTPs:', error);
      return 0;
    }
  }

  // Get OTP statistics for monitoring
  async getOTPStats(identifier) {
    try {
      const stats = await OTP.aggregate([
        {
          $match: {
            identifier: identifier,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
          }
        },
        {
          $group: {
            _id: '$purpose',
            total: { $sum: 1 },
            verified: { $sum: { $cond: ['$isUsed', 1, 0] } },
            expired: { 
              $sum: { 
                $cond: [
                  { $and: [{ $lt: ['$expiresAt', new Date()] }, { $eq: ['$isUsed', false] }] }, 
                  1, 
                  0
                ] 
              } 
            }
          }
        }
      ]);

      return stats;
    } catch (error) {
      logger.error('Failed to get OTP stats:', error);
      return [];
    }
  }
}

module.exports = new OTPService();
