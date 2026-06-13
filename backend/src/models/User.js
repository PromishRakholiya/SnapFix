const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const vehicleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Vehicle name cannot exceed 50 characters']
  },
  type: {
    type: String,
    required: true,
    enum: ['car', 'motorcycle', 'truck', 'bus', 'other']
  },
  make: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Make cannot exceed 50 characters']
  },
  model: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Model cannot exceed 50 characters']
  },
  year: {
    type: Number,
    required: true,
    min: [1900, 'Year must be at least 1900'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
  },
  plate: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    maxlength: [20, 'License plate cannot exceed 20 characters']
  },
  color: {
    type: String,
    trim: true,
    maxlength: [30, 'Color cannot exceed 30 characters']
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[+]?[1-9][\d]{7,14}$/, 'Please enter a valid phone number']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['customer', 'mechanic', 'admin'],
    default: 'customer'
  },
  location: {
    lat: {
      type: Number,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  vehicles: [vehicleSchema],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  walletBalance: {
    type: Number,
    default: 0,
    min: [0, 'Wallet balance cannot be negative']
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastLogin: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for geospatial queries
userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) {
    next();
  }
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Update rating method
userSchema.methods.updateRating = async function(newRating) {
  const totalRating = (this.rating * this.totalReviews) + newRating;
  this.totalReviews += 1;
  this.rating = totalRating / this.totalReviews;
  await this.save();
};

// Virtual for full name (if needed)
userSchema.virtual('displayName').get(function() {
  return this.name;
});

// Remove sensitive data from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpire;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
