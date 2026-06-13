const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { validate, schemas } = require('../middlewares/validationMiddleware');

// Apply authentication to all routes
router.use(authenticateToken);

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
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/', validate(schemas.review), reviewController.createReview);

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
router.get('/', reviewController.getReviews);

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
router.get('/:reviewId', reviewController.getReviewById);

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
router.patch('/:reviewId', validate(schemas.review), reviewController.updateReview);

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
router.get('/mechanic/:mechanicId/stats', reviewController.getMechanicReviewStats);

module.exports = router;
