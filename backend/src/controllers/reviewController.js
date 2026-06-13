const Review = require('../models/Review');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const logger = require('../config/logger');
const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     ReviewRequest:
 *       type: object
 *       required:
 *         - serviceRequestId
 *         - mechanicId
 *         - rating
 *         - comment
 *       properties:
 *         serviceRequestId:
 *           type: string
 *           description: ID of the completed service request
 *         mechanicId:
 *           type: string
 *           description: ID of the mechanic being reviewed
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Rating from 1 to 5 stars
 *         comment:
 *           type: string
 *           minLength: 10
 *           maxLength: 500
 *           description: Review comment
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Optional tags for the review
 *     ReviewResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         customer:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             name: { type: string }
 *         mechanic:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             name: { type: string }
 *         serviceRequest:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             issueType: { type: string }
 *         rating:
 *           type: number
 *         comment:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a review for a completed service
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewRequest'
 *     responses:
 *       201:
 *         description: Review created successfully
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
 *                   $ref: '#/components/schemas/ReviewResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const createReview = async (req, res) => {
  try {
    const { serviceRequestId, mechanicId, rating, comment, tags } = req.body;
    const customerId = req.user.id;

    // Validate service request
    const serviceRequest = await ServiceRequest.findOne({
      _id: serviceRequestId,
      customerId: customerId,
      mechanicId: mechanicId,
      status: 'completed'
    });

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found or not eligible for review'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      requestId: serviceRequestId,
      customerId: customerId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Review already exists for this service request'
      });
    }

    // Validate mechanic exists
    const mechanic = await User.findOne({
      _id: mechanicId,
      role: 'mechanic',
      isActive: true
    });

    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: 'Mechanic not found'
      });
    }

    // Create review
    const review = new Review({
      customerId: customerId,
      mechanicId: mechanicId,
      requestId: serviceRequestId,
      rating,
      comment,
      tags: tags || [],
      createdAt: new Date()
    });

    await review.save();

    // Update mechanic's average rating
    await updateMechanicRating(mechanicId);

    // Update service request with review
    await ServiceRequest.findByIdAndUpdate(serviceRequestId, {
      reviewId: review._id,
      reviewedAt: new Date()
    });

    // Populate the review for response
    const populatedReview = await Review.findById(review._id)
      .populate('customerId', 'name email')
      .populate('mechanicId', 'name email')
      .populate('requestId', 'issueType completedAt')
      .lean();

    // Real-time notification to mechanic
    const io = req.app.get('io');
    if (io) {
      io.to(`mechanic_${mechanicId}`).emit('newReview', {
        reviewId: review._id,
        customerName: req.user.name,
        rating,
        comment: comment.substring(0, 100) + (comment.length > 100 ? '...' : ''),
        serviceType: serviceRequest.issueType,
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Review created', {
      reviewId: review._id,
      customerId,
      mechanicId,
      serviceRequestId,
      rating
    });

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: populatedReview
    });

  } catch (error) {
    logger.error('Error creating review:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Get reviews with filtering and pagination
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mechanicId
 *         schema:
 *           type: string
 *         description: Filter by mechanic ID
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Filter by customer ID (admin only)
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by rating
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
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, rating]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 */
const getReviews = async (req, res) => {
  try {
    const {
      mechanicId,
      customerId,
      rating,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (mechanicId) filter.mechanicId = mechanicId;
    
    // Only allow customer filtering for admins or the customer themselves
    if (customerId) {
      if (req.user.role === 'admin' || req.user.id === customerId) {
        filter.customerId = customerId;
      } else {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    
    // If regular customer, only show their reviews
    if (req.user.role === 'customer' && !customerId) {
      filter.customerId = req.user.id;
    }
    
    // If mechanic, only show reviews for them
    if (req.user.role === 'mechanic') {
      filter.mechanicId = req.user.id;
    }
    
    if (rating) filter.rating = parseInt(rating);

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, totalReviews] = await Promise.all([
      Review.find(filter)
        .populate('customerId', 'name email')
        .populate('mechanicId', 'name email')
        .populate('requestId', 'issueType completedAt')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Review.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalReviews / parseInt(limit));

    // Calculate review statistics
    const stats = await Review.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    // Calculate rating distribution
    let ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (stats[0]?.ratingDistribution) {
      stats[0].ratingDistribution.forEach(rating => {
        ratingDistribution[rating]++;
      });
    }

    logger.info('Reviews retrieved', {
      userId: req.user.id,
      userRole: req.user.role,
      filters: filter,
      totalReviews
    });

    res.json({
      success: true,
      message: 'Reviews retrieved successfully',
      data: {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalReviews,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        },
        statistics: {
          totalReviews: stats[0]?.totalReviews || 0,
          averageRating: stats[0]?.averageRating || 0,
          ratingDistribution
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   get:
 *     summary: Get a specific review by ID
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID'
      });
    }

    // Build filter based on user role
    const filter = { _id: reviewId };
    
    if (req.user.role === 'customer') {
      filter.customerId = userId;
    } else if (req.user.role === 'mechanic') {
      filter.mechanicId = userId;
    }
    // Admin can view any review

    const review = await Review.findOne(filter)
      .populate('customerId', 'name email phone')
      .populate('mechanicId', 'name email phone')
      .populate({
        path: 'requestId',
        select: 'issueType completedAt location finalAmount',
        populate: {
          path: 'mechanicId',
          select: 'name email'
        }
      })
      .lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or access denied'
      });
    }

    logger.info('Review retrieved by ID', {
      reviewId,
      userId,
      userRole: req.user.role
    });

    res.json({
      success: true,
      message: 'Review retrieved successfully',
      data: review
    });

  } catch (error) {
    logger.error('Error fetching review by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   patch:
 *     summary: Update a review (customer only, within 24 hours)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment, tags } = req.body;
    const customerId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID'
      });
    }

    const review = await Review.findOne({
      _id: reviewId,
      customerId: customerId
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or access denied'
      });
    }

    // Check if review is within 24 hours of creation
    const hoursSinceCreation = (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return res.status(403).json({
        success: false,
        message: 'Reviews can only be edited within 24 hours of creation'
      });
    }

    // Store old rating for mechanic rating recalculation
    const oldRating = review.rating;

    // Update review
    const updateData = {};
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;
    if (tags !== undefined) updateData.tags = tags;
    updateData.updatedAt = new Date();

    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('customerId', 'name email')
      .populate('mechanicId', 'name email')
      .populate('requestId', 'issueType completedAt');

    // Recalculate mechanic rating if rating changed
    if (rating !== undefined && rating !== oldRating) {
      await updateMechanicRating(review.mechanicId);
    }

    // Real-time notification to mechanic if rating or comment changed
    if (rating !== oldRating || comment !== review.comment) {
      const io = req.app.get('io');
      if (io) {
        io.to(`mechanic_${review.mechanic}`).emit('reviewUpdated', {
          reviewId,
          customerName: req.user.name,
          oldRating,
          newRating: rating || oldRating,
          timestamp: new Date().toISOString()
        });
      }
    }

    logger.info('Review updated', {
      reviewId,
      customerId,
      oldRating,
      newRating: rating,
      updatedFields: Object.keys(updateData)
    });

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview
    });

  } catch (error) {
    logger.error('Error updating review:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   delete:
 *     summary: Delete a review (admin only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can delete reviews'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID'
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Store mechanic ID for rating recalculation
    const mechanicId = review.mechanicId;

    // Delete review
    await Review.findByIdAndDelete(reviewId);

    // Recalculate mechanic rating
    await updateMechanicRating(mechanicId);

    // Update service request to remove review reference
    await ServiceRequest.findByIdAndUpdate(review.requestId, {
      $unset: { reviewId: 1, reviewedAt: 1 }
    });

    logger.info('Review deleted by admin', {
      reviewId,
      adminId: req.user.id,
      mechanicId,
      customerId: review.customer
    });

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/reviews/mechanic/{mechanicId}/stats:
 *   get:
 *     summary: Get detailed review statistics for a mechanic
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: mechanicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mechanic review statistics retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const getMechanicReviewStats = async (req, res) => {
  try {
    const { mechanicId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mechanic ID'
      });
    }

    // Verify mechanic exists
    const mechanic = await User.findOne({
      _id: mechanicId,
      role: 'mechanic'
    }).select('name email rating');

    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: 'Mechanic not found'
      });
    }

    // Get detailed statistics
    const stats = await Review.aggregate([
      { $match: { mechanic: new mongoose.Types.ObjectId(mechanicId) } },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                totalReviews: { $sum: 1 },
                averageRating: { $avg: '$rating' },
                totalRatings: { $sum: '$rating' }
              }
            }
          ],
          ratingDistribution: [
            {
              $group: {
                _id: '$rating',
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ],
          monthlyTrend: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                averageRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
          ],
          recentReviews: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: 'users',
                localField: 'customer',
                foreignField: '_id',
                as: 'customerInfo'
              }
            },
            {
              $project: {
                rating: 1,
                comment: 1,
                createdAt: 1,
                customerName: { $arrayElemAt: ['$customerInfo.name', 0] }
              }
            }
          ]
        }
      }
    ]);

    const result = stats[0];
    const overallStats = result.overall[0] || {
      totalReviews: 0,
      averageRating: 0,
      totalRatings: 0
    };

    // Format rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    result.ratingDistribution.forEach(item => {
      ratingDistribution[item._id] = item.count;
    });

    logger.info('Mechanic review statistics retrieved', {
      mechanicId,
      totalReviews: overallStats.totalReviews,
      averageRating: overallStats.averageRating
    });

    res.json({
      success: true,
      message: 'Mechanic review statistics retrieved successfully',
      data: {
        mechanic: {
          id: mechanic._id,
          name: mechanic.name,
          email: mechanic.email,
          currentRating: mechanic.rating
        },
        statistics: {
          totalReviews: overallStats.totalReviews,
          averageRating: overallStats.averageRating,
          ratingDistribution,
          monthlyTrend: result.monthlyTrend,
          recentReviews: result.recentReviews
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching mechanic review statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to update mechanic's average rating
const updateMechanicRating = async (mechanicId) => {
  try {
    const stats = await Review.aggregate([
      { $match: { mechanicId: new mongoose.Types.ObjectId(mechanicId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const newRating = stats[0]?.averageRating || 0;
    const totalReviews = stats[0]?.totalReviews || 0;

    await User.findByIdAndUpdate(mechanicId, {
      rating: Math.round(newRating * 10) / 10, // Round to 1 decimal place
      totalReviews
    });

    logger.debug('Mechanic rating updated', {
      mechanicId,
      newRating,
      totalReviews
    });

  } catch (error) {
    logger.error('Error updating mechanic rating:', error);
  }
};

module.exports = {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getMechanicReviewStats
};
