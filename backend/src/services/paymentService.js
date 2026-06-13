const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const logger = require('../config/logger');
const notificationService = require('./notificationService');

class PaymentService {
  constructor() {
    // Use proper test credentials for development
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_CjxI6ZFqFKX7Xs';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_key_here';
    
    console.log('Initializing Razorpay with key ID:', keyId);
    
    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    this.processingFeeRate = 0.02; // 2% processing fee
    this.minProcessingFee = 5; // Minimum ₹5
    this.maxProcessingFee = 200; // Maximum ₹200
  }

  // Create Razorpay order (for internal use)
  async createOrder(orderData) {
    try {
      console.log('Creating Razorpay order with data:', {
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        receipt: orderData.receipt,
        notes: orderData.notes
      });

      const razorpayOrder = await this.razorpay.orders.create({
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        receipt: orderData.receipt,
        notes: orderData.notes || {},
        partial_payment: false,
        capture_method: 'automatic'
      });

      logger.info('Razorpay order created successfully:', {
        orderId: razorpayOrder.id,
        amount: orderData.amount,
        receipt: orderData.receipt
      });

      return razorpayOrder;
    } catch (error) {
      logger.error('Razorpay order creation failed:', {
        error: error.message,
        code: error.error?.code,
        description: error.error?.description,
        orderData
      });
      
      // For development, create a mock order if Razorpay fails
      if (process.env.NODE_ENV === 'development') {
        console.log('Creating mock order for development...');
        return {
          id: `order_test_${Date.now()}`,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          receipt: orderData.receipt,
          status: 'created'
        };
      }
      
      throw error;
    }
  }

  // Create payment intent for advanced payment flows
  async createPaymentIntent(paymentData) {
    try {
      const { amount, currency = 'INR', customerId, serviceRequestId } = paymentData;
      
      // Create Razorpay order
      const order = await this.createOrder({
        amount: amount * 100, // Convert to paise
        currency,
        receipt: `intent_${serviceRequestId}_${Date.now()}`,
        notes: {
          customerId,
          serviceRequestId,
          paymentType: 'intent'
        }
      });

      return {
        orderId: order.id,
        amount: amount,
        currency,
        status: 'created'
      };
    } catch (error) {
      logger.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Verify payment signature
  verifyPaymentSignature(orderId, paymentId, signature) {
    try {
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      logger.error('Error verifying payment signature:', error);
      return false;
    }
  }

  // Create payment order
  async createPaymentOrder(requestId, customerId, amount, method = 'UPI') {
    try {
      // Validate service request
      const serviceRequest = await ServiceRequest.findById(requestId)
        .populate('customerId mechanicId');

      if (!serviceRequest) {
        throw new Error('Service request not found');
      }

      if (serviceRequest.customerId._id.toString() !== customerId.toString()) {
        throw new Error('Unauthorized to create payment for this request');
      }

      if (!['in_progress', 'completed'].includes(serviceRequest.status)) {
        throw new Error('Payment can only be made for active or completed services');
      }

      // Check for existing successful payment
      const existingPayment = await Payment.findOne({
        requestId,
        status: 'success'
      });

      if (existingPayment) {
        throw new Error('Payment already completed for this request');
      }

      // Calculate processing fee
      const processingFee = this.calculateProcessingFee(amount);
      const totalAmount = amount + processingFee;

      // Create Razorpay order
      const razorpayOrder = await this.razorpay.orders.create({
        amount: totalAmount * 100, // Convert to paise
        currency: 'INR',
        receipt: `rg_${requestId}_${Date.now()}`,
        notes: {
          requestId: requestId.toString(),
          customerId: customerId.toString(),
          mechanicId: serviceRequest.mechanicId._id.toString(),
          serviceType: serviceRequest.issueType
        }
      });

      // Create payment record
      const payment = new Payment({
        requestId,
        customerId,
        mechanicId: serviceRequest.mechanicId._id,
        amount,
        processingFee,
        method,
        razorpayOrderId: razorpayOrder.id,
        status: 'pending'
      });

      await payment.save();

      logger.info('Payment order created:', {
        paymentId: payment._id,
        requestId,
        customerId,
        amount: totalAmount,
        razorpayOrderId: razorpayOrder.id
      });

      return {
        paymentId: payment._id,
        orderId: razorpayOrder.id,
        amount: totalAmount,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID,
        receipt: razorpayOrder.receipt,
        breakdown: {
          serviceAmount: amount,
          processingFee,
          totalAmount
        }
      };

    } catch (error) {
      logger.error('Payment order creation failed:', error);
      throw error;
    }
  }

  // Verify payment signature
  async verifyPayment(orderId, paymentId, signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const isValidSignature = expectedSignature === signature;

      if (!isValidSignature) {
        throw new Error('Invalid payment signature');
      }

      // Find payment by order ID
      const payment = await Payment.findOne({ razorpayOrderId: orderId })
        .populate('requestId customerId mechanicId');

      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Fetch payment details from Razorpay
      const razorpayPayment = await this.razorpay.payments.fetch(paymentId);

      // Update payment status
      await payment.updateStatus('success', {
        razorpayPaymentId: paymentId,
        transactionId: razorpayPayment.id,
        gatewayResponse: razorpayPayment
      });

      // Update service request if completed
      if (payment.requestId.status === 'completed') {
        // Mark as paid in service request (you might want to add this field)
        payment.requestId.isPaid = true;
        await payment.requestId.save();
      }

      // Send notifications
      await notificationService.notifyPaymentSuccess(
        payment.customerId,
        payment,
        payment.requestId
      );

      logger.info('Payment verified successfully:', {
        paymentId: payment._id,
        requestId: payment.requestId._id,
        amount: payment.amount,
        razorpayPaymentId: paymentId
      });

      return {
        success: true,
        paymentId: payment._id,
        amount: payment.amount,
        receipt: payment.receipt,
        status: 'success'
      };

    } catch (error) {
      logger.error('Payment verification failed:', error);
      
      // Update payment status to failed if payment exists
      try {
        const payment = await Payment.findOne({ razorpayOrderId: orderId });
        if (payment) {
          await payment.updateStatus('failed', {
            failureReason: error.message
          });
        }
      } catch (updateError) {
        logger.error('Failed to update payment status:', updateError);
      }

      throw error;
    }
  }

  // Handle payment webhook
  async handleWebhook(body, signature) {
    try {
      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET)
        .update(JSON.stringify(body))
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new Error('Invalid webhook signature');
      }

      const { event, payload } = body;
      const paymentEntity = payload.payment?.entity;

      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(paymentEntity);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(paymentEntity);
          break;
        case 'order.paid':
          await this.handleOrderPaid(payload.order?.entity);
          break;
        default:
          logger.info('Unhandled webhook event:', event);
      }

      return { success: true };

    } catch (error) {
      logger.error('Webhook handling failed:', error);
      throw error;
    }
  }

  // Process refund
  async processRefund(paymentId, refundAmount, reason) {
    try {
      const payment = await Payment.findById(paymentId)
        .populate('requestId customerId mechanicId');

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (!payment.canBeRefunded()) {
        throw new Error('Payment cannot be refunded');
      }

      const maxRefundAmount = payment.netAmount || payment.amount;
      const finalRefundAmount = refundAmount || maxRefundAmount;

      if (finalRefundAmount > maxRefundAmount) {
        throw new Error('Refund amount exceeds the maximum refundable amount');
      }

      // Create refund in Razorpay
      const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: finalRefundAmount * 100, // Convert to paise
        speed: 'normal',
        notes: {
          reason,
          requestId: payment.requestId._id.toString()
        }
      });

      // Update payment status
      await payment.updateStatus('refunded', {
        refundId: refund.id,
        refundAmount: finalRefundAmount,
        refundReason: reason
      });

      logger.info('Refund processed:', {
        paymentId,
        refundId: refund.id,
        amount: finalRefundAmount,
        reason
      });

      return {
        success: true,
        refundId: refund.id,
        amount: finalRefundAmount,
        status: refund.status
      };

    } catch (error) {
      logger.error('Refund processing failed:', error);
      throw error;
    }
  }

  // Get payment analytics
  async getPaymentAnalytics(startDate, endDate, filters = {}) {
    try {
      const matchStage = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      if (filters.status) {
        matchStage.status = filters.status;
      }

      if (filters.method) {
        matchStage.method = filters.method;
      }

      const analytics = await Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            totalProcessingFees: { $sum: '$processingFee' },
            averageAmount: { $avg: '$amount' },
            successfulPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
            },
            failedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            refundedAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$refundAmount', 0] }
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalPayments: 1,
            totalAmount: 1,
            totalProcessingFees: 1,
            averageAmount: { $round: ['$averageAmount', 2] },
            successfulPayments: 1,
            failedPayments: 1,
            refundedAmount: 1,
            successRate: {
              $round: [
                { $multiply: [{ $divide: ['$successfulPayments', '$totalPayments'] }, 100] },
                2
              ]
            },
            netRevenue: { $subtract: ['$totalAmount', '$refundedAmount'] }
          }
        }
      ]);

      // Get payment method breakdown
      const methodBreakdown = await Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$method',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get daily payment trends
      const dailyTrends = await Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        summary: analytics[0] || {},
        methodBreakdown,
        dailyTrends
      };

    } catch (error) {
      logger.error('Payment analytics failed:', error);
      throw error;
    }
  }

  // Private methods
  calculateProcessingFee(amount) {
    const fee = amount * this.processingFeeRate;
    return Math.min(this.maxProcessingFee, Math.max(this.minProcessingFee, Math.round(fee)));
  }

  async handlePaymentCaptured(payment) {
    try {
      const paymentRecord = await Payment.findOne({
        razorpayPaymentId: payment.id
      }).populate('requestId customerId');

      if (paymentRecord) {
        await paymentRecord.updateStatus('success', {
          transactionId: payment.id,
          gatewayResponse: payment
        });

        // Send success notification
        await notificationService.notifyPaymentSuccess(
          paymentRecord.customerId,
          paymentRecord,
          paymentRecord.requestId
        );
      }
    } catch (error) {
      logger.error('Error handling payment captured webhook:', error);
    }
  }

  async handlePaymentFailed(payment) {
    try {
      const paymentRecord = await Payment.findOne({
        razorpayPaymentId: payment.id
      });

      if (paymentRecord) {
        await paymentRecord.updateStatus('failed', {
          failureReason: payment.error_description || 'Payment failed',
          gatewayResponse: payment
        });
      }
    } catch (error) {
      logger.error('Error handling payment failed webhook:', error);
    }
  }

  async handleOrderPaid(order) {
    try {
      const payment = await Payment.findOne({
        razorpayOrderId: order.id
      });

      if (payment && payment.status === 'pending') {
        await payment.updateStatus('processing');
      }
    } catch (error) {
      logger.error('Error handling order paid webhook:', error);
    }
  }

  // Utility methods
  async getPaymentStatus(paymentId) {
    try {
      const payment = await Payment.findById(paymentId)
        .populate('requestId', 'issueType status')
        .populate('customerId', 'name email')
        .populate('mechanicId', 'name phone');

      if (!payment) {
        throw new Error('Payment not found');
      }

      return payment;
    } catch (error) {
      logger.error('Get payment status failed:', error);
      throw error;
    }
  }

  async getCustomerPayments(customerId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const payments = await Payment.find({ customerId })
        .populate('requestId', 'issueType vehicleInfo status')
        .populate('mechanicId', 'name rating')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Payment.countDocuments({ customerId });

      return {
        payments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      logger.error('Get customer payments failed:', error);
      throw error;
    }
  }

  async getMechanicEarnings(mechanicId, startDate, endDate) {
    try {
      const matchStage = {
        mechanicId,
        status: 'success',
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      const earnings = await Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$netAmount' },
            totalJobs: { $sum: 1 },
            averageJobValue: { $avg: '$netAmount' }
          }
        }
      ]);

      return earnings[0] || {
        totalEarnings: 0,
        totalJobs: 0,
        averageJobValue: 0
      };
    } catch (error) {
      logger.error('Get mechanic earnings failed:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
