const { sendErrorResponse } = require('../utils/response');

// Check if user has required role(s)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendErrorResponse(res, 401, 'Access denied. Authentication required.');
    }

    if (!roles.includes(req.user.role)) {
      return sendErrorResponse(
        res,
        403,
        `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
      );
    }

    next();
  };
};

// Admin only access
const adminOnly = authorize('admin');

// Mechanic or Admin access
const mechanicOrAdmin = authorize('mechanic', 'admin');

// Customer or Admin access
const customerOrAdmin = authorize('customer', 'admin');

// Check if user can perform action on service request
const canAccessServiceRequest = (req, res, next) => {
  const { serviceRequest } = req;
  const { user } = req;

  if (!serviceRequest) {
    return sendErrorResponse(res, 404, 'Service request not found.');
  }

  // Admin can access all
  if (user.role === 'admin') {
    return next();
  }

  // Customer can access their own requests
  if (user.role === 'customer' && serviceRequest.customerId.toString() === user._id.toString()) {
    return next();
  }

  // Mechanic can access assigned requests
  if (user.role === 'mechanic') {
    // Can access if assigned to them
    if (serviceRequest.mechanicId && serviceRequest.mechanicId.toString() === user._id.toString()) {
      return next();
    }
    
    // Can access pending requests for broadcast acceptance
    if (serviceRequest.status === 'pending') {
      return next();
    }
  }

  return sendErrorResponse(res, 403, 'Access denied. You cannot access this service request.');
};

// Check if user can update service request status
const canUpdateRequestStatus = (req, res, next) => {
  const { serviceRequest } = req;
  const { user } = req;
  const { status } = req.body;

  if (!serviceRequest) {
    return sendErrorResponse(res, 404, 'Service request not found.');
  }

  // Admin can update any status
  if (user.role === 'admin') {
    return next();
  }

  // Customer can only cancel their own requests
  if (user.role === 'customer') {
    if (serviceRequest.customerId.toString() !== user._id.toString()) {
      return sendErrorResponse(res, 403, 'You can only update your own requests.');
    }
    
    if (status !== 'cancelled') {
      return sendErrorResponse(res, 403, 'Customers can only cancel service requests.');
    }
    
    if (!serviceRequest.canBeCancelled()) {
      return sendErrorResponse(res, 400, 'Request cannot be cancelled at this stage.');
    }
    
    return next();
  }

  // Mechanic can update if assigned to them
  if (user.role === 'mechanic') {
    // Must be assigned to the mechanic
    if (!serviceRequest.mechanicId || serviceRequest.mechanicId.toString() !== user._id.toString()) {
      return sendErrorResponse(res, 403, 'You can only update requests assigned to you.');
    }

    // Check valid status transitions for mechanics
    const currentStatus = serviceRequest.status;
    const validTransitions = {
      'assigned': ['enroute', 'cancelled'],
      'enroute': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled']
    };

    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
      return sendErrorResponse(
        res,
        400,
        `Invalid status transition from ${currentStatus} to ${status}.`
      );
    }

    return next();
  }

  return sendErrorResponse(res, 403, 'Access denied.');
};

// Check if user can accept service request
const canAcceptRequest = (req, res, next) => {
  const { serviceRequest } = req;
  const { user } = req;

  if (!serviceRequest) {
    return sendErrorResponse(res, 404, 'Service request not found.');
  }

  // Only mechanics can accept requests
  if (user.role !== 'mechanic') {
    return sendErrorResponse(res, 403, 'Only mechanics can accept service requests.');
  }

  // Request must be pending
  if (serviceRequest.status !== 'pending') {
    return sendErrorResponse(res, 400, 'Request is no longer available for acceptance.');
  }

  // Mechanic must be active
  if (!user.isActive) {
    return sendErrorResponse(res, 403, 'Your account is not active.');
  }

  // Check if mechanic has location set
  if (!user.location || !user.location.lat || !user.location.lng) {
    return sendErrorResponse(res, 400, 'Please update your location before accepting requests.');
  }

  next();
};

// Check if user can create review
const canCreateReview = (req, res, next) => {
  const { serviceRequest } = req;
  const { user } = req;

  if (!serviceRequest) {
    return sendErrorResponse(res, 404, 'Service request not found.');
  }

  // Only customers can create reviews
  if (user.role !== 'customer') {
    return sendErrorResponse(res, 403, 'Only customers can create reviews.');
  }

  // Must be the customer who made the request
  if (serviceRequest.customerId.toString() !== user._id.toString()) {
    return sendErrorResponse(res, 403, 'You can only review your own service requests.');
  }

  // Request must be completed
  if (!serviceRequest.canBeReviewed()) {
    return sendErrorResponse(res, 400, 'You can only review completed service requests.');
  }

  next();
};

// Check if user can initiate payment
const canInitiatePayment = (req, res, next) => {
  const { serviceRequest } = req;
  const { user } = req;

  if (!serviceRequest) {
    return sendErrorResponse(res, 404, 'Service request not found.');
  }

  // Only customers can initiate payments
  if (user.role !== 'customer') {
    return sendErrorResponse(res, 403, 'Only customers can initiate payments.');
  }

  // Must be the customer who made the request
  if (serviceRequest.customerId.toString() !== user._id.toString()) {
    return sendErrorResponse(res, 403, 'You can only pay for your own service requests.');
  }

  // Request should have a quotation
  if (!serviceRequest.quotation || serviceRequest.quotation <= 0) {
    return sendErrorResponse(res, 400, 'Service request must have a valid quotation before payment.');
  }

  // Request should be in progress or completed
  if (!['in_progress', 'completed'].includes(serviceRequest.status)) {
    return sendErrorResponse(res, 400, 'Payment can only be made for active or completed services.');
  }

  next();
};

// Check resource ownership dynamically
const checkResourceOwnership = (resourceType, ownerField = 'userId') => {
  return (req, res, next) => {
    const resource = req[resourceType];
    const { user } = req;

    if (!resource) {
      return sendErrorResponse(res, 404, `${resourceType} not found.`);
    }

    // Admin has access to everything
    if (user.role === 'admin') {
      return next();
    }

    // Check ownership
    const ownerId = resource[ownerField];
    if (!ownerId || ownerId.toString() !== user._id.toString()) {
      return sendErrorResponse(res, 403, 'Access denied. You can only access your own resources.');
    }

    next();
  };
};

// Feature flags and permissions
const hasPermission = (permission) => {
  return (req, res, next) => {
    const { user } = req;
    
    // Define role permissions
    const permissions = {
      admin: [
        'manage_users',
        'manage_requests',
        'view_analytics',
        'export_reports',
        'manage_payments',
        'broadcast_messages',
        'manage_reviews'
      ],
      mechanic: [
        'accept_requests',
        'update_request_status',
        'upload_images',
        'view_own_analytics'
      ],
      customer: [
        'create_requests',
        'cancel_own_requests',
        'make_payments',
        'create_reviews',
        'view_own_data'
      ]
    };

    const userPermissions = permissions[user.role] || [];
    
    if (!userPermissions.includes(permission)) {
      return sendErrorResponse(
        res,
        403,
        `Access denied. Required permission: ${permission}`
      );
    }

    next();
  };
};

module.exports = {
  authorize,
  adminOnly,
  mechanicOrAdmin,
  customerOrAdmin,
  canAccessServiceRequest,
  canUpdateRequestStatus,
  canAcceptRequest,
  canCreateReview,
  canInitiatePayment,
  checkResourceOwnership,
  hasPermission
};
