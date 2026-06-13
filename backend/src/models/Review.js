const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
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
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comment: {
    type: String,
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    trim: true
  },
  serviceQuality: {
    type: Number,
    min: [1, 'Service quality rating must be at least 1'],
    max: [5, 'Service quality rating cannot exceed 5']
  },
  timeliness: {
    type: Number,
    min: [1, 'Timeliness rating must be at least 1'],
    max: [5, 'Timeliness rating cannot exceed 5']
  },
  professionalism: {
    type: Number,
    min: [1, 'Professionalism rating must be at least 1'],
    max: [5, 'Professionalism rating cannot exceed 5']
  },
  wouldRecommend: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    enum: [
      'excellent_service',
      'quick_response',
      'professional',
      'fair_pricing',
      'courteous',
      'skilled',
      'helpful',
      'reliable',
      'needs_improvement',
      'expensive',
      'delayed',
      'unprofessional'
    ]
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  adminResponse: {
    text: {
      type: String,
      maxlength: [500, 'Admin response cannot exceed 500 characters']
    },
    respondedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    respondedAt: {
      type: Date
    }
  },
  flagged: {
    type: Boolean,
    default: false
  },
  flagReason: {
    type: String,
    maxlength: [200, 'Flag reason cannot exceed 200 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure one review per request
reviewSchema.index({ requestId: 1 }, { unique: true });
reviewSchema.index({ customerId: 1, createdAt: -1 });
reviewSchema.index({ mechanicId: 1, rating: -1 });
reviewSchema.index({ rating: -1, isPublic: 1 });
reviewSchema.index({ isVerified: 1, isPublic: 1 });

// Virtual for overall satisfaction
reviewSchema.virtual('overallSatisfaction').get(function() {
  if (this.serviceQuality && this.timeliness && this.professionalism) {
    return Math.round((this.serviceQuality + this.timeliness + this.professionalism) / 3 * 10) / 10;
  }
  return this.rating;
});

// Calculate average detailed ratings
reviewSchema.pre('save', function(next) {
  if (this.serviceQuality && this.timeliness && this.professionalism) {
    const average = (this.serviceQuality + this.timeliness + this.professionalism) / 3;
    // If detailed ratings are provided, use their average as the main rating
    this.rating = Math.round(average * 10) / 10;
  }
  next();
});

// Static method to get mechanic's average rating
reviewSchema.statics.getMechanicStats = async function(mechanicId) {
  const stats = await this.aggregate([
    {
      $match: {
        mechanicId: mongoose.Types.ObjectId(mechanicId),
        isPublic: true
      }
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        averageServiceQuality: { $avg: '$serviceQuality' },
        averageTimeliness: { $avg: '$timeliness' },
        averageProfessionalism: { $avg: '$professionalism' },
        recommendationRate: { 
          $avg: { 
            $cond: [{ $eq: ['$wouldRecommend', true] }, 1, 0] 
          } 
        },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalReviews: 1,
        averageRating: { $round: ['$averageRating', 1] },
        averageServiceQuality: { $round: ['$averageServiceQuality', 1] },
        averageTimeliness: { $round: ['$averageTimeliness', 1] },
        averageProfessionalism: { $round: ['$averageProfessionalism', 1] },
        recommendationRate: { $round: [{ $multiply: ['$recommendationRate', 100] }, 1] },
        ratingDistribution: 1
      }
    }
  ]);

  if (stats.length > 0) {
    const result = stats[0];
    
    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    result.ratingDistribution.forEach(rating => {
      const roundedRating = Math.round(rating);
      distribution[roundedRating] = (distribution[roundedRating] || 0) + 1;
    });
    
    result.ratingDistribution = distribution;
    return result;
  }

  return {
    totalReviews: 0,
    averageRating: 0,
    averageServiceQuality: 0,
    averageTimeliness: 0,
    averageProfessionalism: 0,
    recommendationRate: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  };
};

// Static method to get recent reviews
reviewSchema.statics.getRecentReviews = async function(mechanicId, limit = 10) {
  return await this.find({
    mechanicId,
    isPublic: true
  })
  .populate('customerId', 'name')
  .populate('requestId', 'issueType vehicleInfo')
  .sort({ createdAt: -1 })
  .limit(limit)
  .select('-__v');
};

// Method to flag review
reviewSchema.methods.flagReview = function(reason, flaggedBy) {
  this.flagged = true;
  this.flagReason = reason;
  this.flaggedBy = flaggedBy;
  return this.save();
};

// Method to add admin response
reviewSchema.methods.addAdminResponse = function(text, respondedBy) {
  this.adminResponse = {
    text,
    respondedBy,
    respondedAt: new Date()
  };
  return this.save();
};

module.exports = mongoose.model('Review', reviewSchema);
