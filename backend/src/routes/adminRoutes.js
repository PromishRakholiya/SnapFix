const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const reviewController = require('../controllers/reviewController');
const paymentController = require('../controllers/paymentController');
const mechanicVerificationController = require('../controllers/mechanicVerificationController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/authMiddleware');
const { validate, schemas } = require('../middlewares/validationMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const { apiLimiter } = require('../middlewares/rateLimitMiddleware');

// Apply authentication to all routes
router.use(authenticateToken);
router.use(authorize(['admin']));

// Dashboard Routes

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin - Dashboard]
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
router.get('/dashboard', adminController.getDashboardStats);

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     summary: Get advanced analytics and insights
 *     tags: [Admin - Analytics]
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
router.get('/analytics', adminController.getAnalytics);

/**
 * @swagger
 * /api/admin/users/{userId}/verify:
 *   put:
 *     summary: Verify a user account
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User verified successfully
 */
router.put('/users/:userId/verify', adminController.verifyUser);

/**
 * @swagger
 * /api/admin/users/bulk-action:
 *   post:
 *     summary: Perform bulk actions on users
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               action:
 *                 type: string
 *                 enum: [activate, deactivate, verify, delete]
 *     responses:
 *       200:
 *         description: Bulk action completed successfully
 */
router.post('/users/bulk-action', adminController.bulkUserActions);

/**
 * @swagger
 * /api/admin/system/health:
 *   get:
 *     summary: Get system health and monitoring data
 *     tags: [Admin - System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health data retrieved successfully
 */
router.get('/system/health', adminController.getSystemHealth);

// User Management Routes

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with pagination and filtering
 *     tags: [Admin - User Management]
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
 */
router.get('/users', adminController.getUsers);

// Test endpoint to check users
router.get('/users/test', async (req, res) => {
  try {
    const User = require('../models/User');
    const totalUsers = await User.countDocuments();
    const sampleUsers = await User.find().limit(10).select('name email role isActive isVerified createdAt').lean();
    
    // Count by role
    const customers = await User.countDocuments({ role: 'customer' });
    const mechanics = await User.countDocuments({ role: 'mechanic' });
    const admins = await User.countDocuments({ role: 'admin' });
    
    res.json({
      success: true,
      message: 'Test endpoint working',
      data: {
        totalUsers,
        customers,
        mechanics,
        admins,
        sampleUsers
      }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{userId}/status:
 *   patch:
 *     summary: Update user status (activate/deactivate)
 *     tags: [Admin - User Management]
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
 */
router.patch('/users/:userId/status',
  adminController.updateUserStatus
);

// Service Request Management Routes

/**
 * @swagger
 * /api/admin/service-requests:
 *   get:
 *     summary: Get all service requests with advanced filtering
 *     tags: [Admin - Service Requests]
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
router.get('/service-requests', adminController.getServiceRequests);

// Payment Management Routes

/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: Get payment records with filtering
 *     tags: [Admin - Payments]
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
router.get('/payments', adminController.getPayments);

/**
 * @swagger
 * /api/admin/payments/{paymentId}:
 *   get:
 *     summary: Get payment details (admin access)
 *     tags: [Admin - Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 */
router.get('/payments/:paymentId', paymentController.getPaymentDetails);

// Review Management Routes

/**
 * @swagger
 * /api/admin/reviews:
 *   get:
 *     summary: Get all reviews with filtering
 *     tags: [Admin - Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mechanicId
 *         schema:
 *           type: string
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
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
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 */
router.get('/reviews', reviewController.getReviews);

/**
 * @swagger
 * /api/admin/reviews/{reviewId}:
 *   get:
 *     summary: Get specific review details
 *     tags: [Admin - Reviews]
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
 *         description: Review details retrieved successfully
 */
router.get('/reviews/:reviewId', reviewController.getReviewById);

/**
 * @swagger
 * /api/admin/reviews/{reviewId}:
 *   delete:
 *     summary: Delete a review (admin only)
 *     tags: [Admin - Reviews]
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
 */
router.delete('/reviews/:reviewId', reviewController.deleteReview);

/**
 * @swagger
 * /api/admin/reviews/mechanic/{mechanicId}/stats:
 *   get:
 *     summary: Get detailed review statistics for a mechanic
 *     tags: [Admin - Reviews]
 *     parameters:
 *       - in: path
 *         name: mechanicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mechanic review statistics retrieved successfully
 */
router.get('/reviews/mechanic/:mechanicId/stats', reviewController.getMechanicReviewStats);

// Admin Profile Routes

/**
 * @swagger
 * /api/admin/profile:
 *   get:
 *     summary: Get admin profile
 *     tags: [Admin - Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 */
router.get('/profile', userController.getProfile);

/**
 * @swagger
 * /api/admin/profile:
 *   patch:
 *     summary: Update admin profile
 *     tags: [Admin - Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.patch('/profile', userController.updateProfile);

/**
 * @swagger
 * /api/admin/avatar:
 *   post:
 *     summary: Upload admin avatar
 *     tags: [Admin - Profile]
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
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 */
router.post('/avatar',
  uploadMiddleware.single('avatar'),
  userController.uploadAvatar
);

/**
 * @swagger
 * /api/admin/change-password:
 *   patch:
 *     summary: Change admin password
 *     tags: [Admin - Profile]
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
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.patch('/change-password',
  validate(schemas.changePassword),
  userController.changePassword
);

/**
 * @swagger
 * /api/admin/activity:
 *   get:
 *     summary: Get admin activity history
 *     tags: [Admin - Activity]
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
 *     responses:
 *       200:
 *         description: Activity history retrieved successfully
 */
router.get('/activity', userController.getUserActivity);

// Mechanic Verification Management Routes
/**
 * @swagger
 * /api/admin/verifications:
 *   get:
 *     summary: Get all mechanic verification requests
 *     tags: [Admin - Verifications]
 *     security:
 *       - bearerAuth: []
 */
router.get('/verifications',
  mechanicVerificationController.getAllVerifications
);

/**
 * @swagger
 * /api/admin/verifications/{verificationId}/review:
 *   post:
 *     summary: Review mechanic verification request
 *     tags: [Admin - Verifications]
 *     security:
 *       - bearerAuth: []
 */
router.post('/verifications/:verificationId/review',
  validate(schemas.reviewVerification),
  mechanicVerificationController.reviewVerification
);

module.exports = router;
