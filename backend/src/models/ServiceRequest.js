const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: ['pending', 'offered', 'assigned', 'enroute', 'in_progress', 'completed', 'cancelled']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    maxlength: [500, 'Note cannot exceed 500 characters']
  },
  updatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
});

const serviceRequestSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required']
  },
  mechanicId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  },
  issueType: {
    type: String,
    required: [true, 'Issue type is required'],
    enum: [
      'flat_tire',
      'battery_dead',
      'engine_trouble',
      'fuel_empty',
      'key_locked',
      'accident',
      'overheating',
      'brake_failure',
      'transmission_issue',
      'other'
    ]
  },
  description: {
    type: String,
    required: [true, 'Issue description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  vehicleInfo: {
    type: {
      type: String,
      required: true,
      enum: ['car', 'motorcycle', 'truck', 'bus', 'other']
    },
    model: {
      type: String,
      required: true
    },
    plate: {
      type: String,
      required: true,
      uppercase: true
    },
    year: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear() + 1
    }
  },
  images: [{
    type: String, // Cloudinary URLs
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  }],
  location: {
    lat: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: -180,
      max: 180
    },
    address: {
      type: String,
      maxlength: [200, 'Address cannot exceed 200 characters']
    }
  },
  status: {
    type: String,
    enum: ['pending', 'offered', 'assigned', 'enroute', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  quotation: {
    type: Number,
    min: [0, 'Quotation cannot be negative'],
    max: [100000, 'Quotation seems too high']
  },
  estimatedDuration: {
    type: Number, // in minutes
    min: [5, 'Duration must be at least 5 minutes'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  actualDuration: {
    type: Number // in minutes
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  broadcastRadius: {
    type: Number,
    default: 25, // kilometers
    min: [1, 'Broadcast radius must be at least 1 km'],
    max: [50, 'Broadcast radius cannot exceed 50 km']
  },
  isDirectChat: {
    type: Boolean,
    default: false
  },
  basePrice: {
    type: Number,
    default: 0
  },
  userExpectedPrice: {
    type: Number,
    default: 0
  },
  mechanicOfferPrice: {
    type: Number,
    default: 0
  },
  isPriceConfirmed: {
    type: Boolean,
    default: false
  },
  acceptedAt: Date,
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: {
    type: String,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paidAt: Date,
  finalAmount: {
    type: Number,
    min: [0, 'Final amount cannot be negative']
  },
  reviewId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Review',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  history: [historySchema],
  notes: [{
    text: {
      type: String,
      required: true,
      maxlength: [500, 'Note cannot exceed 500 characters']
    },
    addedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
serviceRequestSchema.index({ customerId: 1, status: 1 });
serviceRequestSchema.index({ mechanicId: 1, status: 1 });
serviceRequestSchema.index({ status: 1, createdAt: -1 });
serviceRequestSchema.index({ reviewId: 1 });
serviceRequestSchema.index({ location: '2dsphere' });
serviceRequestSchema.index({ issueType: 1 });
serviceRequestSchema.index({ priority: 1, status: 1 });

// Virtual for duration calculation
serviceRequestSchema.virtual('actualDurationMinutes').get(function() {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt - this.startedAt) / (1000 * 60));
  }
  return null;
});

// Virtual for response time
serviceRequestSchema.virtual('responseTimeMinutes').get(function() {
  if (this.createdAt && this.acceptedAt) {
    return Math.round((this.acceptedAt - this.createdAt) / (1000 * 60));
  }
  return null;
});

// Update status with history tracking
serviceRequestSchema.methods.updateStatus = function(newStatus, updatedBy, note = '') {
  const previousStatus = this.status;
  this.status = newStatus;
  
  // Add to history
  this.history.push({
    status: newStatus,
    timestamp: new Date(),
    note,
    updatedBy
  });

  // Update relevant timestamps
  switch (newStatus) {
    case 'assigned':
      this.acceptedAt = new Date();
      break;
    case 'in_progress':
      this.startedAt = new Date();
      break;
    case 'completed':
      this.completedAt = new Date();
      if (this.startedAt) {
        this.actualDuration = Math.round((this.completedAt - this.startedAt) / (1000 * 60));
      }
      break;
    case 'cancelled':
      this.cancelledAt = new Date();
      break;
  }

  return this.save();
};

// Check if request can be cancelled
serviceRequestSchema.methods.canBeCancelled = function() {
  return ['pending', 'offered', 'assigned', 'enroute'].includes(this.status);
};

// Check if request can be reviewed
serviceRequestSchema.methods.canBeReviewed = function() {
  return this.status === 'completed' && this.mechanicId;
};

// Pre-save middleware to add initial history entry
serviceRequestSchema.pre('save', function(next) {
  if (this.isNew) {
    this.history.push({
      status: 'pending',
      timestamp: new Date(),
      note: 'Service request created'
    });
  }
  next();
});

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
