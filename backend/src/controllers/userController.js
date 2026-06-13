const User = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const logger = require('../config/logger');
const uploadService = require('../services/uploadService');
const bcrypt = require('bcryptjs');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         role:
 *           type: string
 *           enum: [customer, mechanic, admin]
 *         location:
 *           $ref: '#/components/schemas/Location'
 *         vehicles:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Vehicle'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         lastActive:
 *           type: string
 *           format: date-time
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         phone:
 *           type: string
 *           pattern: '^[+]?[\d\s\-\(\)]{10,15}$'
 *         location:
 *           $ref: '#/components/schemas/Location'
 *         vehicles:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Vehicle'
 */

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .select('-password -refreshTokens')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get additional statistics based on user role
    let additionalData = {};

    if (user.role === 'customer') {
      // Get customer statistics
      const [requestStats, paymentStats] = await Promise.all([
        ServiceRequest.aggregate([
          { $match: { customer: user._id } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),
        Payment.aggregate([
          { $match: { customer: user._id, status: 'success' } },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: '$amount' },
              totalTransactions: { $sum: 1 }
            }
          }
        ])
      ]);

      const requestsByStatus = requestStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      additionalData = {
        statistics: {
          totalRequests: Object.values(requestsByStatus).reduce((sum, count) => sum + count, 0),
          activeRequests: (requestsByStatus.pending || 0) + (requestsByStatus.active || 0),
          completedRequests: requestsByStatus.completed || 0,
          totalSpent: paymentStats[0]?.totalSpent || 0,
          totalTransactions: paymentStats[0]?.totalTransactions || 0
        }
      };
    } else if (user.role === 'mechanic') {
      // Get mechanic statistics
      const [requestStats, paymentStats, reviewStats] = await Promise.all([
        ServiceRequest.aggregate([
          { $match: { mechanicId: user._id } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),
        Payment.aggregate([
          {
            $lookup: {
              from: 'servicerequests',
              localField: 'serviceRequest',
              foreignField: '_id',
              as: 'request'
            }
          },
          {
            $match: {
              'request.mechanicId': user._id,
              status: 'success'
            }
          },
          {
            $group: {
              _id: null,
              totalEarnings: { $sum: '$amount' },
              totalTransactions: { $sum: 1 }
            }
          }
        ]),
        Review.aggregate([
          { $match: { mechanic: user._id } },
          {
            $group: {
              _id: null,
              totalReviews: { $sum: 1 },
              averageRating: { $avg: '$rating' }
            }
          }
        ])
      ]);

      const requestsByStatus = requestStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      additionalData = {
        statistics: {
          totalJobs: Object.values(requestsByStatus).reduce((sum, count) => sum + count, 0),
          activeJobs: (requestsByStatus.pending || 0) + (requestsByStatus.active || 0),
          completedJobs: requestsByStatus.completed || 0,
          totalEarnings: paymentStats[0]?.totalEarnings || 0,
          totalReviews: reviewStats[0]?.totalReviews || 0,
          averageRating: reviewStats[0]?.averageRating || 0
        }
      };
    }

    logger.info('User profile retrieved', {
      userId,
      userRole: user.role
    });

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        ...user,
        ...additionalData
      }
    });

  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/user/profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated
    delete updateData.email;
    delete updateData.role;
    delete updateData.password;
    delete updateData.rating;
    delete updateData.isActive;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info('User profile updated', {
      userId,
      updatedFields: Object.keys(updateData)
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });

  } catch (error) {
    logger.error('Error updating user profile:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/user/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (max 5MB, jpg/jpeg/png)
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar file provided'
      });
    }

    // Avatar is already uploaded to Cloudinary by middleware
    const avatarUrl = req.file.url;

    // Update user with new avatar URL
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $set: {
          avatar: avatarUrl,
          updatedAt: new Date()
        }
      },
      { new: true }
    ).select('-password -refreshTokens');

    logger.info('User avatar uploaded', {
      userId,
      avatarUrl,
      publicId: req.file.public_id
    });

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar: avatarUrl,
        user: updatedUser
      }
    });

  } catch (error) {
    logger.error('Error uploading avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/user/change-password:
 *   patch:
 *     summary: Change user password
 *     tags: [User]
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
 *                 minLength: 6
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$'
 *                 description: Must contain at least one uppercase letter, one lowercase letter, and one number
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is different
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and invalidate all refresh tokens
    await User.findByIdAndUpdate(userId, {
      $set: {
        password: hashedNewPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date()
      },
      $unset: {
        refreshTokens: 1
      }
    });

    logger.info('User password changed', {
      userId,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again with your new password.'
    });

  } catch (error) {
    logger.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/user/activity:
 *   get:
 *     summary: Get user activity history
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [service_request, payment, review]
 *     responses:
 *       200:
 *         description: Activity history retrieved successfully
 */
const getUserActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build activity queries based on user role
    const activities = [];

    // Service requests
    if (!type || type === 'service_request') {
      let serviceRequestQuery = {};
      
      if (req.user.role === 'customer') {
        serviceRequestQuery.customer = userId;
      } else if (req.user.role === 'mechanic') {
        serviceRequestQuery.mechanicId = userId;
      }

      if (Object.keys(serviceRequestQuery).length > 0) {
        const serviceRequests = await ServiceRequest.find(serviceRequestQuery)
          .populate('customer', 'name')
          .populate('mechanicId', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean();

        serviceRequests.forEach(request => {
          activities.push({
            type: 'service_request',
            id: request._id,
            title: `Service Request - ${request.issueType}`,
            description: `Status: ${request.status}`,
            status: request.status,
            timestamp: request.createdAt,
            data: request
          });
        });
      }
    }

    // Payments
    if (!type || type === 'payment') {
      let paymentQuery = {};
      
      if (req.user.role === 'customer') {
        paymentQuery.customer = userId;
      } else if (req.user.role === 'mechanic') {
        const mechanicRequests = await ServiceRequest.find({ mechanicId: userId }).select('_id');
        paymentQuery.serviceRequest = { $in: mechanicRequests.map(req => req._id) };
      }

      if (Object.keys(paymentQuery).length > 0) {
        const payments = await Payment.find(paymentQuery)
          .populate('customer', 'name')
          .populate('serviceRequest', 'issueType')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean();

        payments.forEach(payment => {
          activities.push({
            type: 'payment',
            id: payment._id,
            title: `Payment - ₹${payment.amount}`,
            description: `Status: ${payment.status}`,
            status: payment.status,
            timestamp: payment.createdAt,
            data: payment
          });
        });
      }
    }

    // Reviews
    if (!type || type === 'review') {
      let reviewQuery = {};
      
      if (req.user.role === 'customer') {
        reviewQuery.customer = userId;
      } else if (req.user.role === 'mechanic') {
        reviewQuery.mechanic = userId;
      }

      if (Object.keys(reviewQuery).length > 0) {
        const reviews = await Review.find(reviewQuery)
          .populate('customer', 'name')
          .populate('mechanic', 'name')
          .populate('serviceRequest', 'issueType')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean();

        reviews.forEach(review => {
          activities.push({
            type: 'review',
            id: review._id,
            title: `Review - ${review.rating} stars`,
            description: review.comment.substring(0, 100) + (review.comment.length > 100 ? '...' : ''),
            status: 'completed',
            timestamp: review.createdAt,
            data: review
          });
        });
      }
    }

    // Sort activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination to combined results
    const paginatedActivities = activities.slice(0, parseInt(limit));

    logger.info('User activity retrieved', {
      userId,
      userRole: req.user.role,
      totalActivities: activities.length,
      type: type || 'all'
    });

    res.json({
      success: true,
      message: 'Activity history retrieved successfully',
      data: {
        activities: paginatedActivities,
        pagination: {
          currentPage: parseInt(page),
          totalActivities: activities.length,
          hasNext: activities.length > parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/user/delete-account:
 *   delete:
 *     summary: Delete user account (soft delete)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - reason
 *             properties:
 *               password:
 *                 type: string
 *                 description: Current password for verification
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: Reason for account deletion
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, reason } = req.body;

    // Get user with password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

      const activeRequests = await ServiceRequest.countDocuments({
      $or: [
        { customer: userId, status: { $in: ['pending', 'active'] } },
        { mechanicId: userId, status: { $in: ['pending', 'active'] } }
      ]
    });

    if (activeRequests > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete account with active service requests. Please complete or cancel them first.'
      });
    }

    // Soft delete - deactivate account
    await User.findByIdAndUpdate(userId, {
      $set: {
        isActive: false,
        deletedAt: new Date(),
        deletionReason: reason,
        updatedAt: new Date()
      },
      $unset: {
        refreshTokens: 1
      }
    });

    // If mechanic, cancel any pending assignments
    if (user.role === 'mechanic') {
      await ServiceRequest.updateMany(
        {
          mechanicId: userId,
          status: 'pending'
        },
        {
          status: 'cancelled',
          cancellationReason: 'Mechanic account deleted',
          cancelledAt: new Date()
        }
      );
    }

    logger.info('User account deleted', {
      userId,
      userRole: user.role,
      reason,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Account deleted successfully. We\'re sorry to see you go!'
    });

  } catch (error) {
    logger.error('Error deleting user account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Vehicle Management Methods

/**
 * Add a new vehicle to user's profile
 */
const addVehicle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { make, model, year, licensePlate, color, vehicleType, type, plate } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Use the correct field names based on the schema
    const vehiclePlate = plate || licensePlate;
    const vehicleTypeField = type || vehicleType || 'car';

    // Check if license plate already exists
    const existingVehicle = user.vehicles.find(v => v.plate === vehiclePlate);
    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle with this license plate already exists'
      });
    }

    const newVehicle = {
      type: vehicleTypeField,
      model: model || `${make} ${model}`.trim(),
      plate: vehiclePlate
    };

    user.vehicles.push(newVehicle);
    await user.save();

    const addedVehicle = user.vehicles[user.vehicles.length - 1];

    logger.info('Vehicle added successfully', {
      userId,
      vehicleId: addedVehicle._id,
      plate: vehiclePlate
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: addedVehicle
    });

  } catch (error) {
    logger.error('Error adding vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add vehicle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user's vehicles
 */
const getVehicles = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('vehicles');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Vehicles retrieved successfully',
      data: user.vehicles
    });

  } catch (error) {
    logger.error('Error getting vehicles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vehicles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a vehicle
 */
const updateVehicle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicleId } = req.params;
    const updates = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const vehicle = user.vehicles.id(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Update vehicle fields
    Object.keys(updates).forEach(key => {
      if (['make', 'model', 'year', 'licensePlate', 'color', 'vehicleType'].includes(key)) {
        vehicle[key] = updates[key];
      }
    });

    await user.save();

    logger.info('Vehicle updated successfully', {
      userId,
      vehicleId,
      updates: Object.keys(updates)
    });

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle
    });

  } catch (error) {
    logger.error('Error updating vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a vehicle
 */
const deleteVehicle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicleId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const vehicle = user.vehicles.id(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check if vehicle is used in any active service requests
    const activeRequests = await ServiceRequest.countDocuments({
      customer: userId,
      vehicleId: vehicleId,
      status: { $in: ['pending', 'accepted', 'en_route', 'in_progress'] }
    });

    if (activeRequests > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete vehicle with active service requests'
      });
    }

    user.vehicles.pull(vehicleId);
    await user.save();

    logger.info('Vehicle deleted successfully', {
      userId,
      vehicleId
    });

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vehicle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  getUserActivity,
  deleteAccount,
  addVehicle,
  getVehicles,
  updateVehicle,
  deleteVehicle
};
