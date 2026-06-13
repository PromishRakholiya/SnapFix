const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/authMiddleware');
const { validate, schemas } = require('../middlewares/validationMiddleware');
const { paymentLimiter } = require('../middlewares/rateLimitMiddleware');

// Public webhook route (no authentication required)
/**
 * @swagger
 * /api/payments/webhook/razorpay:
 *   post:
 *     summary: Handle Razorpay webhook events
 *     tags: [Payments]
 *     description: Webhook endpoint for Razorpay payment notifications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Razorpay webhook payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 *       500:
 *         description: Webhook processing failed
 */
router.post('/webhook/razorpay', paymentController.handleRazorpayWebhook);

// Test endpoint to check payment system
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Payment system is working',
    data: {
      razorpayConfigured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      timestamp: new Date().toISOString()
    }
  });
});

// Apply authentication to remaining routes
router.use(authenticateToken);

// Payment creation (customers only)
/**
 * @swagger
 * /api/payments/create-order:
 *   post:
 *     summary: Create a payment order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentRequest'
 *     responses:
 *       201:
 *         description: Payment order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/create-order',
  authorize(['customer']),
  paymentLimiter,
  validate(schemas.payment),
  paymentController.createPaymentOrder
);

/**
 * @swagger
 * /api/payments/create-post-completion-order:
 *   post:
 *     summary: Create payment order after work completion
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceRequestId
 *             properties:
 *               serviceRequestId:
 *                 type: string
 *                 description: ID of the completed service request
 *     responses:
 *       201:
 *         description: Payment order created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/create-post-completion-order',
  authorize(['customer']),
  paymentLimiter,
  validate(schemas.postCompletionPayment),
  paymentController.createPostCompletionPaymentOrder
);

/**
 * @swagger
 * /api/payments/verify:
 *   post:
 *     summary: Verify payment after successful transaction
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *               - razorpayPaymentId
 *               - razorpayOrderId
 *               - razorpaySignature
 *             properties:
 *               paymentId:
 *                 type: string
 *                 description: Our internal payment ID
 *               razorpayPaymentId:
 *                 type: string
 *                 description: Razorpay payment ID
 *               razorpayOrderId:
 *                 type: string
 *                 description: Razorpay order ID
 *               razorpaySignature:
 *                 type: string
 *                 description: Razorpay signature for verification
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/verify',
  authorize(['customer']),
  paymentController.verifyPayment
);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get payment history for the authenticated user
 *     tags: [Payments]
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
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, success, failed, refunded]
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 */
router.get('/history',
  authorize(['customer', 'mechanic', 'admin']),
  paymentController.getPaymentHistory
);

/**
 * @swagger
 * /api/payments/methods:
 *   get:
 *     summary: Get available payment methods
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
 */
router.get('/methods',
  authorize(['customer']),
  paymentController.getPaymentMethods
);

/**
 * @swagger
 * /api/payments/create-intent:
 *   post:
 *     summary: Create payment intent for advanced payment flows
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceRequestId
 *               - amount
 *             properties:
 *               serviceRequestId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: INR
 *     responses:
 *       201:
 *         description: Payment intent created successfully
 */
router.post('/create-intent',
  authorize(['customer']),
  paymentLimiter,
  paymentController.createPaymentIntent
);

/**
 * @swagger
 * /api/payments/confirm:
 *   post:
 *     summary: Confirm payment after successful transaction
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *               - razorpayPaymentId
 *               - razorpayOrderId
 *               - razorpaySignature
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 */
router.post('/confirm',
  authorize(['customer']),
  paymentController.confirmPayment
);

/**
 * @swagger
 * /api/payments/demo:
 *   post:
 *     summary: Process demo payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/demo',
  authorize(['customer']),
  paymentController.processDemoPayment
);

/**
 * @swagger
 * /api/payments/analytics:
 *   get:
 *     summary: Get payment analytics
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Payment analytics retrieved successfully
 */
router.get('/analytics',
  authorize(['admin']),
  paymentController.getPaymentAnalytics
);

/**
 * @swagger
 * /api/payments/{paymentId}:
 *   get:
 *     summary: Get payment details by ID
 *     tags: [Payments]
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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:paymentId',
  authorize(['customer', 'mechanic', 'admin']),
  paymentController.getPaymentDetails
);

module.exports = router;
