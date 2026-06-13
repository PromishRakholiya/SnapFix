const Payment = require("../models/Payment");
const ServiceRequest = require("../models/ServiceRequest");
const User = require("../models/User");
const logger = require("../config/logger");
const paymentService = require("../services/paymentService");
const notificationService = require("../services/notificationService");
const crypto = require("crypto");

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentRequest:
 *       type: object
 *       required:
 *         - serviceRequestId
 *         - amount
 *       properties:
 *         serviceRequestId:
 *           type: string
 *           description: ID of the service request
 *         amount:
 *           type: number
 *           minimum: 1
 *           description: Payment amount in INR
 *         currency:
 *           type: string
 *           default: INR
 *           enum: [INR]
 *     PaymentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             paymentId:
 *               type: string
 *             orderId:
 *               type: string
 *             amount:
 *               type: number
 *             currency:
 *               type: string
 *             razorpayOrderId:
 *               type: string
 *             razorpayKey:
 *               type: string
 */

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
const createPaymentOrder = async (req, res) => {
  try {
    const { serviceRequestId, amount, currency = "INR" } = req.body;
    const customerId = req.user.id;

    // Validate service request
    const serviceRequest = await ServiceRequest.findOne({
      _id: serviceRequestId,
      customerId: customerId,
      status: "completed",
    }).populate("mechanicId", "name email");

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: "Service request not found or not eligible for payment",
      });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      serviceRequest: serviceRequestId,
      status: { $in: ["success", "pending"] },
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment already exists for this service request",
        data: {
          paymentId: existingPayment._id,
          status: existingPayment.status,
        },
      });
    }

    // Validate amount against service request
    if (amount !== serviceRequest.finalAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment amount does not match service amount",
        expected: serviceRequest.finalAmount,
        provided: amount,
      });
    }

    // Create Razorpay order
    const razorpayOrder = await paymentService.createOrder({
      amount: amount * 100, // Convert to paise
      currency,
      receipt: `order_${serviceRequestId}_${Date.now()}`,
      notes: {
        serviceRequestId,
        customerId,
        mechanicId: serviceRequest.mechanicId._id.toString(),
      },
    });

    // Create payment record
    const payment = new Payment({
      customerId: customerId,
      requestId: serviceRequestId,
      mechanicId: serviceRequest.mechanicId._id,
      amount,
      currency,
      razorpayOrderId: razorpayOrder.id,
      status: "pending",
      createdAt: new Date(),
    });

    await payment.save();

    logger.info("Payment order created", {
      paymentId: payment._id,
      customerId,
      serviceRequestId,
      amount,
      razorpayOrderId: razorpayOrder.id,
    });

    res.status(201).json({
      success: true,
      message: "Payment order created successfully",
      data: {
        paymentId: payment._id,
        orderId: razorpayOrder.id,
        amount,
        currency,
        razorpayOrderId: razorpayOrder.id,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        serviceRequest: {
          id: serviceRequest._id,
          issueType: serviceRequest.issueType,
          mechanic: serviceRequest.mechanicId.name,
        },
      },
    });
  } catch (error) {
    logger.error("Error creating payment order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

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
const verifyPayment = async (req, res) => {
  try {
    const { paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature } =
      req.body;
    const customerId = req.user.id;

    // Find payment record
    const payment = await Payment.findOne({
      _id: paymentId,
      customerId: customerId,
      razorpayOrderId,
      status: "pending",
    }).populate({
      path: "requestId",
      populate: {
        path: "mechanicId",
        select: "name email phone",
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found or already processed",
      });
    }

    // Verify signature
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      // Update payment status to failed
      payment.status = "failed";
      payment.failureReason = "Invalid signature";
      payment.updatedAt = new Date();
      await payment.save();

      logger.warn("Payment signature verification failed", {
        paymentId,
        razorpayPaymentId,
        customerId,
      });

      return res.status(400).json({
        success: false,
        message: "Payment verification failed - invalid signature",
      });
    }

    // Verify payment with Razorpay
    try {
      const razorpayPayment =
        await paymentService.getPayment(razorpayPaymentId);

      if (razorpayPayment.status !== "captured") {
        throw new Error(
          `Payment not captured. Status: ${razorpayPayment.status}`,
        );
      }

      // Update payment record
      payment.status = "success";
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      payment.paidAt = new Date();
      payment.updatedAt = new Date();
      payment.gatewayResponse = razorpayPayment;

      await payment.save();

      // Update service request payment status
      await ServiceRequest.findByIdAndUpdate(payment.requestId._id, {
        paymentStatus: "paid",
        paidAt: new Date(),
      });

      // Update mechanic wallet balance
      await User.findByIdAndUpdate(payment.mechanicId, {
        $inc: { walletBalance: payment.amount },
      });

      // Send notifications
      try {
        // Notify customer
        await notificationService.sendEmail(
          req.user.email,
          "Payment Successful - SnapFix",
          "payment-success",
          {
            customerName: req.user.name,
            amount: payment.amount,
            serviceType: payment.requestId.issueType,
            paymentId: razorpayPaymentId,
            mechanicName: payment.requestId.mechanicId.name,
          },
        );

        // Notify mechanic
        await notificationService.sendEmail(
          payment.requestId.mechanicId.email,
          "Payment Received - SnapFix",
          "payment-received",
          {
            mechanicName: payment.requestId.mechanicId.name,
            amount: payment.amount,
            customerName: req.user.name,
            serviceType: payment.requestId.issueType,
          },
        );
      } catch (notificationError) {
        logger.warn("Failed to send payment notifications:", notificationError);
      }

      // Real-time updates
      const io = req.app.get("io");
      if (io) {
        // Notify customer
        io.to(`customer_${customerId}`).emit("paymentSuccess", {
          paymentId,
          razorpayPaymentId,
          amount: payment.amount,
          timestamp: new Date().toISOString(),
        });

        // Notify mechanic
        io.to(`mechanic_${payment.requestId.mechanicId._id}`).emit(
          "paymentReceived",
          {
            paymentId,
            amount: payment.amount,
            customerName: req.user.name,
            timestamp: new Date().toISOString(),
          },
        );

        // Admin dashboard update
        io.emit("paymentCompleted", {
          paymentId,
          amount: payment.amount,
          serviceRequestId: payment.requestId._id,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info("Payment verified successfully", {
        paymentId,
        razorpayPaymentId,
        customerId,
        amount: payment.amount,
        serviceRequestId: payment.requestId._id,
      });

      res.json({
        success: true,
        message: "Payment verified successfully",
        data: {
          paymentId,
          razorpayPaymentId,
          amount: payment.amount,
          status: "success",
          paidAt: payment.paidAt,
          serviceRequest: {
            id: payment.requestId._id,
            issueType: payment.requestId.issueType,
          },
        },
      });
    } catch (razorpayError) {
      // Update payment status to failed
      payment.status = "failed";
      payment.failureReason = razorpayError.message;
      payment.updatedAt = new Date();
      await payment.save();

      logger.error("Razorpay payment verification failed:", {
        error: razorpayError.message,
        paymentId,
        razorpayPaymentId,
      });

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
        error: razorpayError.message,
      });
    }
  } catch (error) {
    logger.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

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
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    // Build filter based on user role
    const filter = {};

    if (req.user.role === "customer") {
      filter.customerId = userId;
    } else if (req.user.role === "mechanic") {
      // Get payments for service requests assigned to this mechanic
      const mechanicRequests = await ServiceRequest.find({
        mechanicId: userId,
      }).select("_id");
      filter.requestId = { $in: mechanicRequests.map((req) => req._id) };
    }

    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, totalPayments] = await Promise.all([
      Payment.find(filter)
        .populate("customerId", "name email")
        .populate({
          path: "requestId",
          select: "issueType completedAt location",
          populate: {
            path: "mechanicId",
            select: "name email",
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Payment.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalPayments / parseInt(limit));

    // Calculate summary statistics
    const summary = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: { $cond: [{ $eq: ["$status", "success"] }, "$amount", 0] },
          },
          totalTransactions: {
            $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] },
          },
          failedTransactions: {
            $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
          },
        },
      },
    ]);

    logger.info("Payment history retrieved", {
      userId,
      userRole: req.user.role,
      totalPayments,
      status: status || "all",
    });

    res.json({
      success: true,
      message: "Payment history retrieved successfully",
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalPayments,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1,
        },
        summary: summary[0] || {
          totalAmount: 0,
          totalTransactions: 0,
          pendingAmount: 0,
          failedTransactions: 0,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching payment history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

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
const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    // Build filter based on user role
    const filter = { _id: paymentId };

    if (req.user.role === "customer") {
      filter.customerId = userId;
    } else if (req.user.role === "mechanic") {
      // Verify this payment belongs to a service request assigned to this mechanic
      const mechanicRequests = await ServiceRequest.find({
        mechanicId: userId,
      }).select("_id");
      filter.requestId = { $in: mechanicRequests.map((req) => req._id) };
    }
    // Admin can view all payments

    const payment = await Payment.findOne(filter)
      .populate("customerId", "name email phone")
      .populate({
        path: "requestId",
        populate: {
          path: "mechanicId",
          select: "name email phone",
        },
      })
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found or access denied",
      });
    }

    logger.info("Payment details retrieved", {
      paymentId,
      userId,
      userRole: req.user.role,
    });

    res.json({
      success: true,
      message: "Payment details retrieved successfully",
      data: payment,
    });
  } catch (error) {
    logger.error("Error fetching payment details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @swagger
 * /api/payments/webhook/razorpay:
 *   post:
 *     summary: Handle Razorpay webhook events
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook
 */
const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      logger.warn("Invalid Razorpay webhook signature");
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const event = req.body;

    logger.info("Razorpay webhook received", {
      event: event.event,
      paymentId: event.payload?.payment?.entity?.id,
    });

    switch (event.event) {
      case "payment.captured":
        await handlePaymentCaptured(event.payload.payment.entity);
        break;

      case "payment.failed":
        await handlePaymentFailed(event.payload.payment.entity);
        break;

      case "order.paid":
        await handleOrderPaid(event.payload.order.entity);
        break;

      default:
        logger.info("Unhandled webhook event:", event.event);
    }

    res.json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    logger.error("Error processing Razorpay webhook:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process webhook",
    });
  }
};

// Helper function to handle payment captured event
const handlePaymentCaptured = async (paymentEntity) => {
  try {
    const payment = await Payment.findOne({
      razorpayOrderId: paymentEntity.order_id,
    }).populate("customer serviceRequest");

    if (payment && payment.status === "pending") {
      payment.status = "success";
      payment.razorpayPaymentId = paymentEntity.id;
      payment.paidAt = new Date();
      payment.gatewayResponse = paymentEntity;
      await payment.save();

      logger.info("Payment status updated via webhook", {
        paymentId: payment._id,
        razorpayPaymentId: paymentEntity.id,
      });

      // Update mechanic wallet balance
      await User.findByIdAndUpdate(payment.mechanicId, {
        $inc: { walletBalance: payment.amount },
      });
    }
  } catch (error) {
    logger.error("Error handling payment captured webhook:", error);
  }
};

// Helper function to handle payment failed event
const handlePaymentFailed = async (paymentEntity) => {
  try {
    const payment = await Payment.findOne({
      razorpayOrderId: paymentEntity.order_id,
    });

    if (payment && payment.status === "pending") {
      payment.status = "failed";
      payment.failureReason =
        paymentEntity.error_description || "Payment failed";
      payment.gatewayResponse = paymentEntity;
      await payment.save();

      logger.info("Payment marked as failed via webhook", {
        paymentId: payment._id,
        reason: payment.failureReason,
      });
    }
  } catch (error) {
    logger.error("Error handling payment failed webhook:", error);
  }
};

// Helper function to handle order paid event
const handleOrderPaid = async (orderEntity) => {
  try {
    const payment = await Payment.findOne({
      razorpayOrderId: orderEntity.id,
    });

    if (payment) {
      logger.info("Order paid webhook received", {
        paymentId: payment._id,
        orderId: orderEntity.id,
      });
    }
  } catch (error) {
    logger.error("Error handling order paid webhook:", error);
  }
};

/**
 * Create payment order after work completion
 */
const createPostCompletionPaymentOrder = async (req, res) => {
  try {
    const { serviceRequestId } = req.body;
    const customerId = req.user.id;

    console.log("Creating post-completion payment order:", {
      serviceRequestId,
      customerId,
      body: req.body,
    });

    // Validate service request
    const serviceRequest = await ServiceRequest.findOne({
      _id: serviceRequestId,
      customerId: customerId,
      status: "completed",
    }).populate("mechanicId", "name email phone");

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: "Service request not found or not completed",
      });
    }

    // Check if mechanic is assigned
    if (!serviceRequest.mechanicId) {
      return res.status(400).json({
        success: false,
        message: "No mechanic assigned to this service request",
      });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      requestId: serviceRequestId,
      status: { $in: ["success", "pending"] },
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment already exists for this service request",
        data: {
          paymentId: existingPayment._id,
          status: existingPayment.status,
        },
      });
    }

    // Get the final amount (quotation or negotiated amount)
    const finalAmount =
      serviceRequest.quotation || serviceRequest.finalAmount || 500; // Default amount for testing

    console.log("Payment amount calculation:", {
      quotation: serviceRequest.quotation,
      finalAmount: serviceRequest.finalAmount,
      selectedAmount: finalAmount,
      serviceRequestId,
      customerId,
    });

    if (!finalAmount || finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "No amount specified for payment. Please contact the mechanic for pricing.",
        debug: {
          quotation: serviceRequest.quotation,
          finalAmount: serviceRequest.finalAmount,
        },
      });
    }

    // Create Razorpay order (with fallback for testing)
    let razorpayOrder;
    try {
      console.log("Attempting to create Razorpay order...");
      razorpayOrder = await paymentService.createOrder({
        amount: finalAmount * 100, // Convert to paise
        currency: "INR",
        receipt: `order_${serviceRequestId}_${Date.now()}`,
        notes: {
          serviceRequestId,
          customerId,
          mechanicId: serviceRequest.mechanicId._id.toString(),
          serviceType: serviceRequest.issueType,
        },
      });
      console.log("Razorpay order created successfully:", razorpayOrder.id);
    } catch (error) {
      console.log("Razorpay error, creating test order:", error.message);
      // Create test order for development
      razorpayOrder = {
        id: `order_test_${Date.now()}`,
        amount: finalAmount * 100,
        currency: "INR",
        receipt: `order_${serviceRequestId}_${Date.now()}`,
      };
      console.log("Test order created:", razorpayOrder.id);
    }

    // Create payment record
    const payment = new Payment({
      customerId: customerId,
      requestId: serviceRequestId,
      mechanicId: serviceRequest.mechanicId._id,
      amount: finalAmount,
      currency: "INR",
      razorpayOrderId: razorpayOrder.id,
      status: "pending",
      method: "Card", // Using 'Card' as per Payment model enum
      receipt: `order_${serviceRequestId}_${Date.now()}`,
    });

    try {
      await payment.save();
      console.log("Payment record saved successfully:", payment._id);
    } catch (saveError) {
      console.error("Error saving payment record:", saveError);
      throw new Error("Failed to save payment record");
    }

    logger.info("Post-completion payment order created", {
      paymentId: payment._id,
      customerId,
      serviceRequestId,
      amount: finalAmount,
      razorpayOrderId: razorpayOrder.id,
    });

    res.status(201).json({
      success: true,
      message: "Payment order created successfully",
      data: {
        paymentId: payment._id,
        orderId: razorpayOrder.id,
        amount: finalAmount,
        currency: "INR",
        razorpayOrderId: razorpayOrder.id,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        serviceRequest: {
          id: serviceRequest._id,
          issueType: serviceRequest.issueType,
          mechanic: serviceRequest.mechanicId.name,
          description: serviceRequest.description,
          completedAt: serviceRequest.completedAt,
        },
      },
    });
  } catch (error) {
    logger.error("Error creating post-completion payment order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get available payment methods
 */
const getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: "card",
        name: "Credit/Debit Card",
        description: "Pay with Visa, MasterCard, RuPay",
        icon: "credit-card",
        enabled: true,
      },
      {
        id: "upi",
        name: "UPI",
        description: "Pay with any UPI app",
        icon: "mobile",
        enabled: true,
      },
      {
        id: "netbanking",
        name: "Net Banking",
        description: "Pay with your bank account",
        icon: "bank",
        enabled: true,
      },
      {
        id: "wallet",
        name: "Digital Wallet",
        description: "Pay with Paytm, PhonePe, etc.",
        icon: "wallet",
        enabled: true,
      },
    ];

    res.json({
      success: true,
      message: "Payment methods retrieved successfully",
      data: paymentMethods,
    });
  } catch (error) {
    logger.error("Error fetching payment methods:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment methods",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Create payment intent for advanced payment flows
 */
const createPaymentIntent = async (req, res) => {
  try {
    const { serviceRequestId, amount, currency = "INR" } = req.body;
    const customerId = req.user.id;

    // Validate service request
    const serviceRequest = await ServiceRequest.findOne({
      _id: serviceRequestId,
      customerId: customerId,
    });

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: "Service request not found",
      });
    }

    // Create payment intent
    const paymentIntent = await paymentService.createPaymentIntent({
      amount,
      currency,
      customerId,
      serviceRequestId,
    });

    res.status(201).json({
      success: true,
      message: "Payment intent created successfully",
      data: paymentIntent,
    });
  } catch (error) {
    logger.error("Error creating payment intent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment intent",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Confirm payment after successful transaction
 */
const confirmPayment = async (req, res) => {
  try {
    const { paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature } =
      req.body;
    const customerId = req.user.id;

    // Verify signature
    const isValidSignature = paymentService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { _id: paymentId, customerId },
      {
        status: "success",
        razorpayPaymentId,
        razorpaySignature,
        paidAt: new Date(),
      },
      { new: true },
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      message: "Payment confirmed successfully",
      data: payment,
    });
  } catch (error) {
    logger.error("Error confirming payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to confirm payment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get payment analytics (admin only)
 */
const getPaymentAnalytics = async (req, res) => {
  try {
    const { period = "month" } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get payment statistics
    const [totalPayments, successfulPayments, totalAmount] = await Promise.all([
      Payment.countDocuments({ createdAt: { $gte: startDate } }),
      Payment.countDocuments({
        status: "success",
        createdAt: { $gte: startDate },
      }),
      Payment.aggregate([
        {
          $match: {
            status: "success",
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const analytics = {
      period,
      totalPayments,
      successfulPayments,
      failedPayments: totalPayments - successfulPayments,
      successRate:
        totalPayments > 0
          ? ((successfulPayments / totalPayments) * 100).toFixed(2)
          : 0,
      totalAmount: totalAmount[0]?.total || 0,
    };

    res.json({
      success: true,
      message: "Payment analytics retrieved successfully",
      data: analytics,
    });
  } catch (error) {
    logger.error("Error fetching payment analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment analytics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Process Demo Payment (without Razorpay integration)
 */
const processDemoPayment = async (req, res) => {
  try {
    const { serviceRequestId, amount, paymentMethod = "card" } = req.body;
    const customerId = req.user.id;

    // Fetch the service request
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);

    if (!serviceRequest) {
      return res
        .status(404)
        .json({ success: false, message: "Service request not found" });
    }

    // Ensure only the customer can pay
    if (serviceRequest.customerId.toString() !== customerId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to pay for this request",
      });
    }

    // Check if already paid
    if (serviceRequest.paymentStatus === "paid") {
      return res
        .status(400)
        .json({ success: false, message: "Service request is already paid" });
    }

    // Create a demo payment record with correct fields based on schema
    const paymentAmount = Number(
      amount || serviceRequest.quotation || serviceRequest.finalAmount,
    );

    // Map 'card' to 'Card' to match schema enum ['UPI', 'Card', 'NetBanking', 'Wallet', 'Cash']
    let mappedMethod = "Card";
    if (paymentMethod && typeof paymentMethod === "string") {
      const lowerMethod = paymentMethod.toLowerCase();
      if (lowerMethod === "upi") mappedMethod = "UPI";
      else if (lowerMethod === "card") mappedMethod = "Card";
      else if (lowerMethod === "netbanking") mappedMethod = "NetBanking";
      else if (lowerMethod === "wallet") mappedMethod = "Wallet";
      else if (lowerMethod === "cash") mappedMethod = "Cash";
    }

    const payment = new Payment({
      customerId,
      mechanicId: serviceRequest.mechanicId,
      requestId: serviceRequestId,
      amount: paymentAmount,
      currency: "INR",
      status: "success",
      method: mappedMethod,
      transactionId: `DEMO_${Date.now()}`,
      paidAt: new Date(),
    });

    logger.info("Saving demo payment:", JSON.stringify(payment));
    await payment.save();

    // Update service request
    serviceRequest.paymentStatus = "paid";
    serviceRequest.paidAt = new Date();
    await serviceRequest.save();

    // Update mechanic wallet balance
    if (serviceRequest.mechanicId) {
      await User.findByIdAndUpdate(serviceRequest.mechanicId, {
        $inc: { walletBalance: paymentAmount },
      });
    }

    return res.json({
      success: true,
      message: "Demo payment processed successfully",
      data: {
        paymentId: payment._id,
        amount: payment.amount,
        status: "success",
      },
    });
  } catch (error) {
    logger.error("Error processing demo payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process demo payment",
      error: error.message,
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
  getPaymentDetails,
  handleRazorpayWebhook,
  createPostCompletionPaymentOrder,
  getPaymentMethods,
  createPaymentIntent,
  confirmPayment,
  getPaymentAnalytics,
  processDemoPayment,
};
