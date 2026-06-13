const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.ObjectId,
    ref: 'ServiceRequest',
    required: [true, 'Service request ID is required']
  },
  customerId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required']
  },
  mechanicId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Mechanic ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [1, 'Amount must be at least ₹1'],
    max: [100000, 'Amount cannot exceed ₹1,00,000']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD']
  },
  method: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['UPI', 'Card', 'NetBanking', 'Wallet', 'Cash']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'refunded'],
    default: 'pending'
  },
  razorpayOrderId: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpayPaymentId: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpaySignature: String,
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  failureReason: {
    type: String,
    maxlength: [500, 'Failure reason cannot exceed 500 characters']
  },
  refundId: {
    type: String,
    unique: true,
    sparse: true
  },
  refundAmount: {
    type: Number,
    min: [0, 'Refund amount cannot be negative']
  },
  refundReason: {
    type: String,
    maxlength: [500, 'Refund reason cannot exceed 500 characters']
  },
  processingFee: {
    type: Number,
    default: 0,
    min: [0, 'Processing fee cannot be negative']
  },
  netAmount: {
    type: Number // Amount after deducting processing fee
  },
  paidAt: Date,
  refundedAt: Date,
  receipt: {
    type: String,
    unique: true,
    sparse: true
  },
  notes: {
    type: Map,
    of: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
paymentSchema.index({ requestId: 1 });
paymentSchema.index({ customerId: 1, status: 1 });
paymentSchema.index({ mechanicId: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ transactionId: 1 });

// Virtual for final amount after processing fee
paymentSchema.virtual('finalAmount').get(function() {
  return this.amount - (this.processingFee || 0);
});

// Calculate net amount before saving
paymentSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('processingFee')) {
    this.netAmount = this.amount - (this.processingFee || 0);
  }
  next();
});

// Generate unique receipt number
paymentSchema.pre('save', function(next) {
  if (this.isNew && !this.receipt) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.receipt = `RG${date}${random}`;
  }
  next();
});

// Update payment status method
paymentSchema.methods.updateStatus = function(status, additionalData = {}) {
  this.status = status;
  
  switch (status) {
    case 'success':
      this.paidAt = new Date();
      if (additionalData.razorpayPaymentId) {
        this.razorpayPaymentId = additionalData.razorpayPaymentId;
      }
      if (additionalData.transactionId) {
        this.transactionId = additionalData.transactionId;
      }
      break;
    case 'failed':
      if (additionalData.failureReason) {
        this.failureReason = additionalData.failureReason;
      }
      break;
    case 'refunded':
      this.refundedAt = new Date();
      if (additionalData.refundId) {
        this.refundId = additionalData.refundId;
      }
      if (additionalData.refundAmount) {
        this.refundAmount = additionalData.refundAmount;
      }
      if (additionalData.refundReason) {
        this.refundReason = additionalData.refundReason;
      }
      break;
  }

  if (additionalData.gatewayResponse) {
    this.gatewayResponse = additionalData.gatewayResponse;
  }

  return this.save();
};

// Check if payment can be refunded
paymentSchema.methods.canBeRefunded = function() {
  return this.status === 'success' && !this.refundId && this.paidAt;
};

// Calculate refund amount
paymentSchema.methods.calculateRefundAmount = function(percentage = 100) {
  if (!this.canBeRefunded()) {
    throw new Error('Payment cannot be refunded');
  }
  
  const maxRefund = this.netAmount || this.amount;
  return Math.round((maxRefund * percentage) / 100);
};

module.exports = mongoose.model('Payment', paymentSchema);
