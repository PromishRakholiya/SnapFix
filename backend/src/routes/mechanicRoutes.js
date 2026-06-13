const express = require("express");
const router = express.Router();
const mechanicController = require("../controllers/mechanicController");
const requestController = require("../controllers/requestController");
const userController = require("../controllers/userController");
const reviewController = require("../controllers/reviewController");
const paymentController = require("../controllers/paymentController");
const mechanicVerificationController = require("../controllers/mechanicVerificationController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/authMiddleware");
const { validate, schemas } = require("../middlewares/validationMiddleware");
const { apiLimiter } = require("../middlewares/rateLimitMiddleware");
const uploadMiddleware = require("../middlewares/uploadMiddleware");

// Apply authentication to all routes
router.use(authenticateToken);
router.use(authorize(["mechanic"]));

// Verification Routes
/**
 * @swagger
 * /api/mechanic/verification:
 *   post:
 *     summary: Submit mechanic verification request
 *     tags: [Mechanic - Verification]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/verification",
  uploadMiddleware.fields(
    [
      { name: "shopImage", maxCount: 1 },
      { name: "documentImage", maxCount: 1 },
    ],
    { folder: "snapfix/mechanic-verification" },
  ),
  validate(schemas.submitVerification),
  mechanicVerificationController.submitVerification,
);

/**
 * @swagger
 * /api/mechanic/verification:
 *   get:
 *     summary: Get mechanic's verification status
 *     tags: [Mechanic - Verification]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/verification",
  mechanicVerificationController.getVerificationStatus,
);

/**
 * @swagger
 * /api/mechanic/verification:
 *   put:
 *     summary: Update mechanic verification request
 *     tags: [Mechanic - Verification]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/verification",
  uploadMiddleware.fields(
    [
      { name: "shopImage", maxCount: 1 },
      { name: "documentImage", maxCount: 1 },
    ],
    { folder: "snapfix/mechanic-verification" },
  ),
  validate(schemas.updateVerification),
  mechanicVerificationController.updateVerification,
);

// Profile Routes

/**
 * @swagger
 * /api/mechanic/profile:
 *   get:
 *     summary: Get mechanic profile with statistics
 *     tags: [Mechanic - Profile]
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
 *                   $ref: '#/components/schemas/MechanicProfile'
 */
router.get("/profile", mechanicController.getProfile);

/**
 * @swagger
 * /api/mechanic/stats:
 *   get:
 *     summary: Get mechanic statistics and earnings summary
 *     tags: [Mechanic - Statistics]
 *     security:
 *       - bearerAuth: []
 */
router.get("/stats", mechanicController.getMechanicStats);

/**
 * @swagger
 * /api/mechanic/earnings/summary:
 *   get:
 *     summary: Get mechanic earnings summary for a specific period
 *     tags: [Mechanic - Earnings]
 *     security:
 *       - bearerAuth: []
 */
router.get("/earnings/summary", mechanicController.getEarningsSummary);

/**
 * @swagger
 * /api/mechanic/earnings/detailed:
 *   get:
 *     summary: Get detailed mechanic earnings for a specific period
 *     tags: [Mechanic - Earnings]
 *     security:
 *       - bearerAuth: []
 */
router.get("/earnings/detailed", mechanicController.getDetailedEarnings);

/**
 * @swagger
 * /api/mechanic/earnings/chart:
 *   get:
 *     summary: Get chart data for mechanic earnings
 *     tags: [Mechanic - Earnings]
 *     security:
 *       - bearerAuth: []
 */
router.get("/earnings/chart", mechanicController.getEarningsChart);

/**
 * @swagger
 * /api/mechanic/earnings/export:
 *   get:
 *     summary: Export mechanic earnings data
 *     tags: [Mechanic - Earnings]
 *     security:
 *       - bearerAuth: []
 */
router.get("/earnings/export", mechanicController.exportEarnings);

/**
 * @swagger
 * /api/mechanic/wallet/redeem:
 *   post:
 *     summary: Redeem wallet balance Let mechanic redeem wallet funds
 *     tags: [Mechanic - Wallet]
 *     security:
 *       - bearerAuth: []
 */
router.post("/wallet/redeem", mechanicController.redeemWallet);

/**
 * @swagger
 * /api/mechanic/service-areas:
 *   get:
 *     summary: Get mechanic service areas
 *     tags: [Mechanic - Service Areas]
 *     security:
 *       - bearerAuth: []
 */
router.get("/service-areas", mechanicController.getServiceAreas);

/**
 * @swagger
 * /api/mechanic/service-areas:
 *   post:
 *     summary: Add new service area for mechanic
 *     tags: [Mechanic - Service Areas]
 *     security:
 *       - bearerAuth: []
 */
router.post("/service-areas", mechanicController.addServiceArea);

/**
 * @swagger
 * /api/mechanic/service-areas/{areaId}:
 *   delete:
 *     summary: Remove service area for mechanic
 *     tags: [Mechanic - Service Areas]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/service-areas/:areaId", mechanicController.removeServiceArea);

/**
 * @swagger
 * /api/mechanic/availability:
 *   patch:
 *     summary: Update mechanic availability
 *     tags: [Mechanic - Profile]
 *     security:
 *       - bearerAuth: []
 */
router.patch("/availability", mechanicController.updateAvailability);

/**
 * @swagger
 * /api/mechanic/profile:
 *   patch:
 *     summary: Update mechanic profile
 *     tags: [Mechanic - Profile]
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
 *               specializations:
 *                 type: array
 *                 items:
 *                   type: string
 *               experience:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 50
 *               location:
 *                 $ref: '#/components/schemas/Location'
 *               workingHours:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                   end:
 *                     type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.patch("/profile", mechanicController.updateProfile);

/**
 * @swagger
 * /api/mechanic/avatar:
 *   post:
 *     summary: Upload mechanic avatar
 *     tags: [Mechanic - Profile]
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
router.post(
  "/avatar",
  uploadMiddleware.single("avatar"),
  userController.uploadAvatar,
);

/**
 * @swagger
 * /api/mechanic/change-password:
 *   patch:
 *     summary: Change mechanic password
 *     tags: [Mechanic - Profile]
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
router.patch("/change-password", userController.changePassword);

// Availability Routes

/**
 * @swagger
 * /api/mechanic/availability:
 *   patch:
 *     summary: Update availability status
 *     tags: [Mechanic - Availability]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isAvailable
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *               location:
 *                 $ref: '#/components/schemas/Location'
 *     responses:
 *       200:
 *         description: Availability updated successfully
 */
router.patch("/availability", mechanicController.updateAvailability);

// Service Request Routes

/**
 * @swagger
 * /api/mechanic/requests:
 *   get:
 *     summary: Get assigned service requests
 *     tags: [Mechanic - Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, completed, cancelled]
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
 *         description: Service requests retrieved successfully
 */
router.get("/requests", mechanicController.getAssignedRequests);

/**
 * @swagger
 * /api/mechanic/requests/{requestId}/accept:
 *   patch:
 *     summary: Accept a service request
 *     tags: [Mechanic - Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
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
 *               - estimatedArrival
 *             properties:
 *               estimatedArrival:
 *                 type: integer
 *                 minimum: 5
 *                 maximum: 180
 *                 description: Estimated arrival time in minutes
 *               quotation:
 *                 type: number
 *                 minimum: 0
 *                 description: Service quotation amount
 *     responses:
 *       200:
 *         description: Request accepted successfully
 */
router.patch("/requests/:requestId/accept", mechanicController.acceptRequest);

/**
 * @swagger
 * /api/mechanic/requests/{requestId}/reject:
 *   post:
 *     summary: Reject a service request (for direct bookings)
 *     tags: [Mechanic - Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Request rejected successfully
 */
router.post("/requests/:requestId/reject", requestController.rejectRequest);

/**
 * @swagger
 * /api/mechanic/requests/{requestId}/start:
 *   patch:
 *     summary: Start working on a service request
 *     tags: [Mechanic - Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               arrivalLocation:
 *                 $ref: '#/components/schemas/Location'
 *               workStartNotes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Work started successfully
 */
router.patch("/requests/:requestId/start", mechanicController.startWork);

/**
 * @swagger
 * /api/mechanic/requests/{requestId}/complete:
 *   patch:
 *     summary: Complete a service request
 *     tags: [Mechanic - Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
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
 *               - workSummary
 *               - finalAmount
 *             properties:
 *               workSummary:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *               finalAmount:
 *                 type: number
 *                 minimum: 0
 *               partsUsed:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     cost:
 *                       type: number
 *               recommendations:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Service completed successfully
 */
router.patch(
  "/requests/:requestId/complete",
  mechanicController.completeRequest,
);

/**
 * @swagger
 * /api/mechanic/requests/{requestId}/status:
 *   patch:
 *     summary: Update request status
 *     tags: [Mechanic - Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [assigned, enroute, in_progress, completed, cancelled]
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch(
  "/requests/:requestId/status",
  validate(schemas.updateRequestStatus),
  mechanicController.updateRequestStatus,
);

// Earnings Routes

/**
 * @swagger
 * /api/mechanic/earnings:
 *   get:
 *     summary: Get earnings summary
 *     tags: [Mechanic - Earnings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Earnings retrieved successfully
 */
router.get("/earnings", mechanicController.getEarnings);

/**
 * @swagger
 * /api/mechanic/wallet/redeem:
 *   post:
 *     summary: Redeem wallet balance
 *     tags: [Mechanic - Earnings]
 *     security:
 *       - bearerAuth: []
 */
router.post("/wallet/redeem", mechanicController.redeemWallet);

// Payment Routes

/**
 * @swagger
 * /api/mechanic/payments/history:
 *   get:
 *     summary: Get payment history for mechanic
 *     tags: [Mechanic - Payments]
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
router.get("/payments/history", paymentController.getPaymentHistory);

/**
 * @swagger
 * /api/mechanic/payments/{paymentId}:
 *   get:
 *     summary: Get payment details
 *     tags: [Mechanic - Payments]
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
router.get("/payments/:paymentId", paymentController.getPaymentDetails);

// Review Routes

/**
 * @swagger
 * /api/mechanic/reviews:
 *   get:
 *     summary: Get reviews for the mechanic
 *     tags: [Mechanic - Reviews]
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
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 */
router.get("/reviews", reviewController.getReviews);

/**
 * @swagger
 * /api/mechanic/reviews/{reviewId}:
 *   get:
 *     summary: Get specific review details
 *     tags: [Mechanic - Reviews]
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
router.get("/reviews/:reviewId", reviewController.getReviewById);

// Activity Routes

/**
 * @swagger
 * /api/mechanic/activity:
 *   get:
 *     summary: Get mechanic activity history
 *     tags: [Mechanic - Activity]
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
router.get("/activity", userController.getUserActivity);

module.exports = router;
