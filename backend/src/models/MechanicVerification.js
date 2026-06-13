const mongoose = require('mongoose');

const mechanicVerificationSchema = new mongoose.Schema({
  mechanicId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Mechanic ID is required'],
    unique: true
  },
  shopName: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true,
    maxlength: [100, 'Shop name cannot exceed 100 characters']
  },
  shopAddress: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters']
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters']
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true,
      maxlength: [10, 'ZIP code cannot exceed 10 characters']
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      maxlength: [50, 'Country cannot exceed 50 characters']
    }
  },
  gstNumber: {
    type: String,
    trim: true,
    maxlength: [15, 'GST number cannot exceed 15 characters'],
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: 'Invalid GST number format'
    }
  },
  location: {
    lat: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    lng: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  shopImage: {
    type: String,
    required: [true, 'Shop image is required'],
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Invalid shop image URL format'
    }
  },
  documentImage: {
    type: String,
    required: [true, 'Document image is required'],
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(v);
      },
      message: 'Invalid document image URL format'
    }
  },
  documentType: {
    type: String,
    required: [true, 'Document type is required'],
    enum: ['aadhar', 'pan', 'driving_license', 'shop_license', 'other']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    maxlength: [500, 'Admin notes cannot exceed 500 characters'],
    trim: true
  },
  reviewedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
mechanicVerificationSchema.index({ mechanicId: 1 });
mechanicVerificationSchema.index({ status: 1 });
mechanicVerificationSchema.index({ createdAt: -1 });

// Pre-save middleware to validate GST number if provided
mechanicVerificationSchema.pre('save', function(next) {
  if (this.gstNumber && this.gstNumber.trim() === '') {
    this.gstNumber = undefined;
  }
  next();
});

// Method to check if verification is pending
mechanicVerificationSchema.methods.isPending = function() {
  return this.status === 'pending';
};

// Method to check if verification is approved
mechanicVerificationSchema.methods.isApproved = function() {
  return this.status === 'approved';
};

// Method to check if verification is rejected
mechanicVerificationSchema.methods.isRejected = function() {
  return this.status === 'rejected';
};

// Static method to get pending verifications
mechanicVerificationSchema.statics.getPendingVerifications = function() {
  return this.find({ status: 'pending' })
    .populate('mechanicId', 'name email phone')
    .sort({ createdAt: 1 });
};

// Static method to get verification by mechanic ID
mechanicVerificationSchema.statics.getByMechanicId = function(mechanicId) {
  return this.findOne({ mechanicId })
    .populate('mechanicId', 'name email phone')
    .populate('reviewedBy', 'name email');
};

module.exports = mongoose.model('MechanicVerification', mechanicVerificationSchema);
