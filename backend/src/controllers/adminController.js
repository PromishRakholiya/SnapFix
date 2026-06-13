const User = require('../models/User');
const Payment = require('../models/Payment');
const ServiceRequest = require('../models/ServiceRequest');
const Review = require('../models/Review');
const logger = require('../config/logger');
const { csvExportService } = require('../utils/csvExport');
const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminStats:
 *       type: object
 *       properties:
 *         totalUsers:
 *           type: object
 *           properties:
 *             total: { type: number }
 *             customers: { type: number }
 *             mechanics: { type: number }
 *             admins: { type: number }
 *         serviceRequests:
 *           type: object
 *           properties:
 *             total: { type: number }
 *             pending: { type: number }
 *             active: { type: number }
 *             completed: { type: number }
 *             cancelled: { type: number }
 *         payments:
 *           type: object
 *           properties:
 *             totalAmount: { type: number }
 *             totalTransactions: { type: number }
 *             recentTransactions: { type: array }
 *         reviews:
 *           type: object
 *           properties:
 *             totalReviews: { type: number }
 *             averageRating: { type: number }
 *         topMechanics:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id: { type: string }
 *               name: { type: string }
 *               email: { type: string }
 *               rating: { type: number }
 *               completedJobs: { type: number }
 *     UserManagement:
 *       type: object
 *       properties:
 *         users:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
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
 *                   $ref: '#/components/schemas/AdminStats'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
const getDashboardStats = async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Parallel aggregation queries for better performance
    const [
      userStats,
      requestStats,
      paymentStats,
      reviewStats,
      topMechanics
    ] = await Promise.all([
      // User statistics
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]).catch(() => []),
      
      // Service request statistics
      ServiceRequest.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).catch(() => []),
      
      // Payment statistics
      Payment.aggregate([
        { $match: { status: 'success' } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $ifNull: ['$amount', 0] } },
            totalTransactions: { $sum: 1 }
          }
        }
      ]).catch(() => [{ _id: null, totalAmount: 0, totalTransactions: 0 }]),
      
      // Review statistics
      Review.aggregate([
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: { $ifNull: ['$rating', 0] } }
          }
        }
      ]).catch(() => [{ _id: null, totalReviews: 0, averageRating: 0 }]),
      
      // Top mechanics
      User.aggregate([
        { $match: { role: 'mechanic', isActive: true } },
        {
          $lookup: {
            from: 'servicerequests',
            localField: '_id',
            foreignField: 'mechanicId',
            as: 'requests'
          }
        },
        {
          $addFields: {
            completedJobs: {
              $size: {
                $filter: {
                  input: '$requests',
                  cond: { $eq: ['$$this.status', 'completed'] }
                }
              }
            },
            totalJobs: { $size: '$requests' }
          }
        },
        {
          $sort: { 
            rating: -1, 
            completedJobs: -1 
          }
        },
        {
          $limit: 10
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            rating: { $ifNull: ['$rating', 0] },
            completedJobs: 1,
            totalJobs: 1,
            phone: 1,
            location: 1
          }
        }
      ]).catch(() => [])
    ]);

    // Process user statistics
    const userStatsByRole = userStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    const totalUsers = {
      total: Object.values(userStatsByRole).reduce((sum, count) => sum + count, 0),
      customers: userStatsByRole.customer || 0,
      mechanics: userStatsByRole.mechanic || 0,
      admins: userStatsByRole.admin || 0
    };

    // Process request statistics
    const requestStatsByStatus = requestStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    const serviceRequests = {
      total: Object.values(requestStatsByStatus).reduce((sum, count) => sum + count, 0),
      pending: requestStatsByStatus.pending || 0,
      active: requestStatsByStatus.active || 0,
      completed: requestStatsByStatus.completed || 0,
      cancelled: requestStatsByStatus.cancelled || 0
    };

    // Recent transactions
    const recentTransactions = await Payment.find()
      .populate('customerId', 'name email')
      .populate('requestId', 'issueType')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('amount status razorpayPaymentId createdAt')
      .lean()
      .catch(() => []);

    const payments = {
      totalAmount: paymentStats[0]?.totalAmount || 0,
      totalTransactions: paymentStats[0]?.totalTransactions || 0,
      recentTransactions
    };

    const reviews = {
      totalReviews: reviewStats[0]?.totalReviews || 0,
      averageRating: reviewStats[0]?.averageRating || 0
    };

    const processingTime = Date.now() - startTime;

    logger.info('Dashboard statistics retrieved', {
      userId: req.user.id,
      processingTime: `${processingTime}ms`
    });

    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        totalUsers,
        serviceRequests,
        payments,
        reviews,
        topMechanics,
        lastUpdated: new Date().toISOString(),
        processingTime: `${processingTime}ms`
      }
    });

  } catch (error) {
    logger.error('Error fetching dashboard statistics:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with pagination and filtering
 *     tags: [Admin]
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
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, mechanic, admin]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, email, createdAt, rating]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                   $ref: '#/components/schemas/UserManagement'
 */
const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (role && role !== '') filter.role = role;
    if (isActive !== undefined && isActive !== '') filter.isActive = isActive === 'true';
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('Admin getUsers - Filter:', filter);
    console.log('Admin getUsers - Sort:', sort);
    console.log('Admin getUsers - Skip:', skip, 'Limit:', parseInt(limit));
    
    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select('-passwordHash -refreshTokens')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter)
    ]);

    console.log('Admin getUsers - Found users:', users.length);
    console.log('Admin getUsers - Total users:', totalUsers);

    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    logger.info('Users retrieved by admin', {
      adminId: req.user.id,
      filters: filter,
      pagination: { page, limit, totalUsers, totalPages },
      usersFound: users.length
    });

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalUsers,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching users:', error);
    console.error('Error in getUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/admin/users/{userId}/status:
 *   patch:
 *     summary: Update user status (activate/deactivate)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (userId === req.user.id && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    // Prevent deactivating other admins
    if (user.role === 'admin' && !isActive && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot deactivate other admin accounts'
      });
    }

    const previousStatus = user.isActive;
    user.isActive = isActive;
    
    // Log the status change
    if (!user.statusHistory) user.statusHistory = [];
    user.statusHistory.push({
      status: isActive ? 'activated' : 'deactivated',
      reason: reason || 'No reason provided',
      changedBy: req.user.id,
      changedAt: new Date()
    });

    await user.save();

    // If deactivating a mechanic, cancel their active requests
    if (!isActive && user.role === 'mechanic') {
      await ServiceRequest.updateMany(
        {
          mechanicId: userId,
          status: { $in: ['pending', 'active'] }
        },
        {
          status: 'cancelled',
          cancellationReason: 'Mechanic account deactivated',
          cancelledBy: req.user.id,
          cancelledAt: new Date()
        }
      );
    }

    logger.info('User status updated by admin', {
      adminId: req.user.id,
      targetUserId: userId,
      previousStatus,
      newStatus: isActive,
      reason
    });

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        userId,
        isActive,
        previousStatus
      }
    });

  } catch (error) {
    logger.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/admin/service-requests:
 *   get:
 *     summary: Get all service requests with advanced filtering
 *     tags: [Admin]
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
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, completed, cancelled]
 *       - in: query
 *         name: issueType
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: export
 *         schema:
 *           type: string
 *           enum: [csv]
 *     responses:
 *       200:
 *         description: Service requests retrieved successfully
 */
const getServiceRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      issueType,
      dateFrom,
      dateTo,
      export: exportFormat
    } = req.query;

    // Build filter
    const filter = {};
    
    if (status) filter.status = status;
    if (issueType) filter.issueType = { $regex: issueType, $options: 'i' };
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Handle export
    if (exportFormat === 'csv') {
      const requests = await ServiceRequest.find(filter)
        .populate('customerId', 'name email phone')
        .populate('mechanicId', 'name email phone')
        .lean();

      const csvData = await csvExportService.exportServiceRequests(requests);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=service-requests-${Date.now()}.csv`);
      return res.send(csvData);
    }

    // Regular pagination query
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [requests, totalRequests] = await Promise.all([
      ServiceRequest.find(filter)
        .populate('customerId', 'name email phone')
        .populate('mechanicId', 'name email phone rating')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ServiceRequest.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalRequests / parseInt(limit));

    logger.info('Service requests retrieved by admin', {
      adminId: req.user.id,
      filters: filter,
      pagination: { page, limit, totalRequests, totalPages }
    });

    res.json({
      success: true,
      message: 'Service requests retrieved successfully',
      data: {
        requests,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRequests,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching service requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: Get payment records with filtering
 *     tags: [Admin]
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
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, success, failed, refunded]
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: export
 *         schema:
 *           type: string
 *           enum: [csv]
 *     responses:
 *       200:
 *         description: Payment records retrieved successfully
 */
const getPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      dateFrom,
      dateTo,
      export: exportFormat
    } = req.query;

    // Build filter
    const filter = {};
    
    if (status) filter.status = status;
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Handle export
    if (exportFormat === 'csv') {
      const payments = await Payment.find(filter)
        .populate('customerId', 'name email phone')
        .populate('serviceRequest', 'issueType status')
        .lean();

      const csvData = await csvExportService.exportPayments(payments);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=payments-${Date.now()}.csv`);
      return res.send(csvData);
    }

    // Regular pagination query
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [payments, totalPayments] = await Promise.all([
      Payment.find(filter)
        .populate('customerId', 'name email phone')
        .populate('serviceRequest', 'issueType status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Payment.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalPayments / parseInt(limit));

    // Calculate summary statistics
    const summaryStats = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] }
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    logger.info('Payment records retrieved by admin', {
      adminId: req.user.id,
      filters: filter,
      pagination: { page, limit, totalPayments, totalPages }
    });

    res.json({
      success: true,
      message: 'Payment records retrieved successfully',
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalPayments,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        },
        summary: summaryStats[0] || { totalAmount: 0, successfulPayments: 0, failedPayments: 0 }
      }
    });

  } catch (error) {
    logger.error('Error fetching payment records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment records',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     summary: Get advanced analytics and insights
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 */
const getAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const periodMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    
    const days = periodMap[period] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    // Get summary statistics
    const currentStats = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate } }),
      ServiceRequest.countDocuments({ createdAt: { $gte: startDate } }),
      Payment.aggregate([
        { $match: { status: 'success', createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      ServiceRequest.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        { $group: { _id: null, avgTime: { $avg: { $subtract: ['$completedAt', '$createdAt'] } } } }
      ])
    ]);

    const previousStats = await Promise.all([
      User.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate } }),
      ServiceRequest.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate } }),
      Payment.aggregate([
        { $match: { status: 'success', createdAt: { $gte: previousStartDate, $lt: startDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      ServiceRequest.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: previousStartDate, $lt: startDate } } },
        { $group: { _id: null, avgTime: { $avg: { $subtract: ['$completedAt', '$createdAt'] } } } }
      ])
    ]);

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const summary = {
      totalRevenue: currentStats[2][0]?.total || 0,
      totalUsers: currentStats[0],
      totalRequests: currentStats[1],
      avgResponseTime: Math.round((currentStats[3][0]?.avgTime || 0) / (1000 * 60)), // Convert to minutes
      revenueGrowth: calculateGrowth(currentStats[2][0]?.total || 0, previousStats[2][0]?.total || 0),
      userGrowth: calculateGrowth(currentStats[0], previousStats[0]),
      requestGrowth: calculateGrowth(currentStats[1], previousStats[1]),
      responseTimeChange: calculateGrowth(
        Math.round((currentStats[3][0]?.avgTime || 0) / (1000 * 60)),
        Math.round((previousStats[3][0]?.avgTime || 0) / (1000 * 60))
      )
    };

    // User growth data (daily for the period)
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Revenue data (daily for the period)
    const revenueData = await Payment.aggregate([
      { $match: { status: 'success', createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Request trends (daily for the period)
    const requestTrends = await ServiceRequest.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Top performing mechanics
    const topMechanics = await ServiceRequest.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startDate } } },
      {
        $lookup: {
          from: 'users',
          localField: 'mechanicId',
          foreignField: '_id',
          as: 'mechanic'
        }
      },
      { $unwind: '$mechanic' },
      {
        $group: {
          _id: '$mechanicId',
          name: { $first: '$mechanic.name' },
          completedRequests: { $sum: 1 },
          totalEarnings: { $sum: '$quotation' },
          rating: { $avg: '$rating' }
        }
      },
      { $sort: { totalEarnings: -1 } },
      { $limit: 10 }
    ]);

    // Popular services
    const popularServices = await ServiceRequest.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$issueType',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$quotation' }
        }
      },
      {
        $addFields: {
          percentage: {
            $cond: [
              { $eq: [currentStats[1], 0] },
              0,
              { $multiply: [{ $divide: ['$count', currentStats[1]] }, 100] }
            ]
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    logger.info('Analytics data retrieved by admin', {
      adminId: req.user.id,
      period,
      startDate
    });

    res.json({
      success: true,
      message: 'Analytics data retrieved successfully',
      data: {
        summary,
        userGrowth,
        revenueData,
        requestTrends,
        topMechanics,
        popularServices
      }
    });

  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify a user account
 */
const verifyUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isVerified = true;
    await user.save({ validateBeforeSave: false });

    logger.info('User verified by admin:', {
      adminId: req.user.id,
      userId,
      userEmail: user.email
    });

    res.json({
      success: true,
      message: 'User verified successfully',
      data: { user }
    });

  } catch (error) {
    logger.error('Error verifying user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Bulk actions on users
 */
const bulkUserActions = async (req, res) => {
  try {
    const { userIds, action } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    if (!['activate', 'deactivate', 'verify', 'delete'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Allowed: activate, deactivate, verify, delete'
      });
    }

    let updateQuery = {};
    let result;

    switch (action) {
      case 'activate':
        updateQuery = { isActive: true };
        break;
      case 'deactivate':
        updateQuery = { isActive: false };
        break;
      case 'verify':
        updateQuery = { isVerified: true };
        break;
      case 'delete':
        result = await User.deleteMany({ 
          _id: { $in: userIds },
          role: { $ne: 'admin' } // Prevent deleting admin users
        });
        break;
    }

    if (action !== 'delete') {
      result = await User.updateMany(
        { 
          _id: { $in: userIds },
          role: { $ne: 'admin' } // Prevent updating admin users
        },
        { $set: updateQuery }
      );
    }

    logger.info('Bulk user action performed:', {
      adminId: req.user.id,
      action,
      affectedUsers: result.modifiedCount || result.deletedCount,
      userIds
    });

    res.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      data: {
        action,
        affectedUsers: result.modifiedCount || result.deletedCount,
        totalRequested: userIds.length
      }
    });

  } catch (error) {
    logger.error('Error performing bulk action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get system health and monitoring data
 */
const getSystemHealth = async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Database health check
    const User = require('../models/User');
    const ServiceRequest = require('../models/ServiceRequest');
    
    const dbHealth = await Promise.all([
      User.countDocuments().catch(() => 0),
      ServiceRequest.countDocuments().catch(() => 0)
    ]);

    const systemHealth = {
      server: {
        uptime: Math.floor(uptime),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        },
        nodeVersion: process.version,
        platform: process.platform
      },
      database: {
        connected: dbHealth[0] >= 0 && dbHealth[1] >= 0,
        users: dbHealth[0],
        requests: dbHealth[1]
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'System health retrieved successfully',
      data: systemHealth
    });

  } catch (error) {
    logger.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system health',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  updateUserStatus,
  verifyUser,
  bulkUserActions,
  getServiceRequests,
  getPayments,
  getAnalytics,
  getSystemHealth
};
