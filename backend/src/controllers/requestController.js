const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const { 
  sendSuccessResponse, 
  sendErrorResponse, 
  asyncHandler,
  getPaginationOptions,
  generatePaginationMeta,
  buildQueryFilter,
  buildSortOptions,
  calculateDistance,
  buildLocationQuery
} = require('../utils/response');
const aiQuotationService = require('../services/aiQuotationService');
const notificationService = require('../services/notificationService');
const uploadService = require('../services/uploadService');
const logger = require('../config/logger');
const { getBasePrice } = require('../utils/pricing');

/**
 * Upload images for service requests
 */
const uploadImages = asyncHandler(async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return sendErrorResponse(res, 400, 'No images provided');
    }

    // Images are already uploaded to Cloudinary by middleware
    // Extract URLs from the uploaded files
    const imageUrls = req.files.map(file => file.url);
    const imageDetails = req.files.map(file => ({
      url: file.url,
      publicId: file.public_id,
      originalName: file.originalname,
      size: file.size
    }));

    logger.info('Images uploaded successfully:', {
      userId: req.user.id,
      imageCount: imageUrls.length,
      images: imageDetails
    });

    return sendSuccessResponse(res, 200, 'Images uploaded successfully', {
      imageUrls,
      imageDetails,
      count: imageUrls.length
    });

  } catch (error) {
    logger.error('Error processing uploaded images:', error);
    return sendErrorResponse(res, 500, 'Failed to process uploaded images');
  }
});

/**
 * @swagger
 * /customer/requests:
 *   post:
 *     summary: Create a new service request
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - issueType
 *               - description
 *               - vehicleInfo
 *               - location
 *             properties:
 *               issueType:
 *                 type: string
 *                 enum: [flat_tire, battery_dead, engine_trouble, fuel_empty, key_locked, accident, overheating, brake_failure, transmission_issue, other]
 *               description:
 *                 type: string
 *               vehicleInfo:
 *                 type: object
 *               location:
 *                 type: object
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 */
const createServiceRequest = asyncHandler(async (req, res) => {
  const { issueType, description, vehicleInfo, location, priority = 'medium', broadcastRadius = 25, mechanicId, isDirectBooking, userExpectedPrice } = req.body;

  // Debug logging
  logger.info('Creating service request:', {
    issueType,
    description: description ? description.substring(0, 50) + '...' : 'null',
    vehicleInfo: typeof vehicleInfo,
    location: typeof location,
    priority,
    mechanicId,
    isDirectBooking,
    hasFiles: !!req.files,
    fileCount: req.files ? req.files.length : 0
  });

  // Validate required fields
  if (!issueType || !description || !vehicleInfo || !location || userExpectedPrice === undefined || userExpectedPrice === null) {
    return sendErrorResponse(res, 400, 'Missing required fields (including expected price)');
  }

  // Parse vehicleInfo and location if they're strings
  let parsedVehicleInfo, parsedLocation;
  try {
    parsedVehicleInfo = typeof vehicleInfo === 'string' ? JSON.parse(vehicleInfo) : vehicleInfo;
    parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
  } catch (error) {
    return sendErrorResponse(res, 400, 'Invalid JSON format for vehicleInfo or location');
  }

  // Handle image uploads
  let imageUrls = [];
  
  // 1. Get image URLs from request body (pre-uploaded)
  if (req.body.images && Array.isArray(req.body.images)) {
    imageUrls = [...req.body.images];
  }
  
  // 2. Get image URLs from request files (direct upload)
  if (req.files && req.files.length > 0) {
    try {
      const fileImageUrls = await uploadService.uploadServiceRequestImages(req.files, 'temp');
      imageUrls = [...imageUrls, ...fileImageUrls];
    } catch (error) {
      logger.error('Image upload failed:', error);
      // Continue without new images
    }
  }

  // Generate AI quotation
  let quotation = null;
  let estimatedDuration = null;
  try {
    const quotationResult = await aiQuotationService.generateQuotation({
      issueType,
      description,
      vehicleInfo: parsedVehicleInfo,
      location: parsedLocation,
      priority
    }, {
      timeOfDay: new Date(),
      weather: 'clear' // Could be enhanced with weather API
    });
    
    quotation = quotationResult.quotation;
    estimatedDuration = quotationResult.estimatedDuration;
  } catch (error) {
    logger.error('AI quotation failed:', error);
    // Continue with default values
  }

  // Create service request
  let serviceRequest;
  try {
    serviceRequest = new ServiceRequest({
      customerId: req.user._id,
      mechanicId: mechanicId || null, // Assign specific mechanic if provided
      issueType,
      description,
      vehicleInfo: parsedVehicleInfo,
      location: parsedLocation,
      images: imageUrls,
      priority,
      broadcastRadius,
      quotation,
      estimatedDuration,
      basePrice: getBasePrice(issueType),
      userExpectedPrice: Number(req.body.userExpectedPrice) || 0
    });

    logger.info('Service request object created:', {
      customerId: serviceRequest.customerId,
      mechanicId: serviceRequest.mechanicId,
      issueType: serviceRequest.issueType,
      hasVehicleInfo: !!serviceRequest.vehicleInfo,
      hasLocation: !!serviceRequest.location,
      imageCount: serviceRequest.images.length
    });

    await serviceRequest.save();
    logger.info('Service request saved successfully');
  } catch (error) {
    logger.error('Error creating service request:', error);
    return sendErrorResponse(res, 500, `Failed to create service request: ${error.message}`);
  }

  // Populate customer info for notifications
  await serviceRequest.populate('customerId', 'name email phone');

  // Initialize nearbyMechanics variable
  let nearbyMechanics = [];

  // Handle notifications based on booking type
  try {
    // Notify customer
    await notificationService.notifyRequestCreated(serviceRequest.customerId, serviceRequest);
    
    if (isDirectBooking && mechanicId) {
      // Direct booking - notify only the specific mechanic
      const mechanic = await User.findById(mechanicId);
      if (mechanic) {
        await notificationService.notifyDirectBooking(mechanic, serviceRequest);
        logger.info('Direct booking notification sent to mechanic:', {
          mechanicId,
          requestId: serviceRequest._id
        });
      }
    } else {
      // Broadcast booking - find and notify nearby mechanics within 25km
      nearbyMechanics = await User.find({
        role: 'mechanic',
        isActive: true,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parsedLocation.lng, parsedLocation.lat]
            },
            $maxDistance: broadcastRadius * 1000 // Convert km to meters
          }
        }
      }).limit(50); // Increased limit to accommodate more mechanics in 25km radius

      if (nearbyMechanics.length > 0) {
        await notificationService.broadcastToMechanics(serviceRequest, nearbyMechanics);
        
        // Real-time socket broadcast to available mechanics
        const io = req.app.get('io');
        const socketHandlers = req.app.get('socketHandlers');
        
        if (io && socketHandlers) {
          try {
            // Use the socket helper function to broadcast
            socketHandlers.broadcastServiceRequest(serviceRequest, nearbyMechanics);
            
            logger.info('Real-time broadcast sent to mechanics:', {
              requestId: serviceRequest._id,
              mechanicCount: nearbyMechanics.length,
              broadcastRadius: broadcastRadius
            });
          } catch (socketError) {
            logger.error('Socket broadcast failed:', socketError);
            // Fallback to direct emit
            const requestNamespace = io.of('/requests');
            requestNamespace.to('available_mechanics').emit('new-request-available', {
              requestId: serviceRequest._id,
              location: parsedLocation,
              issueType: serviceRequest.issueType,
              priority: serviceRequest.priority,
              estimatedCost: serviceRequest.quotation,
              estimatedDuration: serviceRequest.estimatedDuration,
              vehicleInfo: parsedVehicleInfo,
              description: serviceRequest.description,
              customerId: serviceRequest.customerId,
              broadcastRadius: broadcastRadius,
              timestamp: new Date()
            });
          }
        } else {
          logger.warn('Socket handlers not available for real-time broadcast');
        }
      } else {
        logger.warn('No mechanics found within broadcast radius:', {
          requestId: serviceRequest._id,
          broadcastRadius: broadcastRadius,
          location: parsedLocation
        });
      }
    }
  } catch (error) {
    logger.error('Notification sending failed:', error);
  }

  logger.info('Service request created:', {
    requestId: serviceRequest._id,
    customerId: req.user._id,
    issueType,
    location: parsedLocation,
    bookingType: isDirectBooking ? 'direct' : 'broadcast',
    mechanicId: mechanicId || null,
    broadcastRadius: broadcastRadius,
    nearbyMechanicsCount: nearbyMechanics ? nearbyMechanics.length : 0
  });

  sendSuccessResponse(res, 201, 'Service request created successfully', {
    request: serviceRequest,
    quotation: quotation ? {
      estimated: quotation,
      range: {
        min: Math.round(quotation * 0.8),
        max: Math.round(quotation * 1.2)
      },
      estimatedDuration
    } : null,
    bookingType: isDirectBooking ? 'direct' : 'broadcast'
  });
});

/**
 * @swagger
 * /customer/requests/my:
 *   get:
 *     summary: Get customer's service requests
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, enroute, in_progress, completed, cancelled]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 */
const getMyRequests = asyncHandler(async (req, res) => {
  console.log('getMyRequests: User ID:', req.user._id);
  console.log('getMyRequests: Query params:', req.query);
  
  const { page, limit, skip } = getPaginationOptions(req.query);
  const { status, issueType, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  // Build filter
  const filter = { customerId: req.user._id };
  
  if (status) {
    filter.status = Array.isArray(status) ? { $in: status } : status;
  }
  
  if (issueType) {
    filter.issueType = issueType;
  }
  
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  console.log('getMyRequests: Filter:', filter);

  // Build sort options
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query
  const requests = await ServiceRequest.find(filter)
    .populate('mechanicId', 'name phone rating')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  console.log('getMyRequests: Found requests:', requests.length);

  const total = await ServiceRequest.countDocuments(filter);
  console.log('getMyRequests: Total requests:', total);

  // Generate pagination meta
  const meta = generatePaginationMeta(page, limit, total);

  sendSuccessResponse(res, 200, 'Service requests retrieved successfully', {
    items: requests,
    totalPages: meta.pagination.totalPages,
    totalItems: meta.pagination.totalItems,
    currentPage: meta.pagination.currentPage,
    limit: meta.pagination.itemsPerPage
  });
});

/**
 * @swagger
 * /customer/requests/{id}:
 *   get:
 *     summary: Get service request details
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
const getRequestDetails = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.findById(req.params.id)
    .populate('customerId', 'name phone email')
    .populate('mechanicId', 'name phone email rating totalReviews location');

  if (!request) {
    return sendErrorResponse(res, 404, 'Service request not found');
  }

  // Check if user can access this request
  if (req.user.role === 'customer' && request.customerId._id.toString() !== req.user._id.toString()) {
    return sendErrorResponse(res, 403, 'Access denied');
  }

  if (req.user.role === 'mechanic' && 
      request.mechanicId && 
      request.mechanicId._id.toString() !== req.user._id.toString() && 
      request.status !== 'pending') {
    return sendErrorResponse(res, 403, 'Access denied');
  }

  // Calculate distance if mechanic is assigned
  let distance = null;
  if (request.mechanicId && request.mechanicId.location && request.location) {
    distance = calculateDistance(
      request.location.lat,
      request.location.lng,
      request.mechanicId.location.lat,
      request.mechanicId.location.lng
    );
  }

  sendSuccessResponse(res, 200, 'Service request details retrieved', {
    request,
    distance
  });
});

/**
 * @swagger
 * /customer/requests/{id}/cancel:
 *   post:
 *     summary: Cancel service request
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 */
const cancelRequest = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  if (!reason || reason.trim().length < 5) {
    return sendErrorResponse(res, 400, 'Cancellation reason is required (minimum 5 characters)');
  }

  const request = await ServiceRequest.findById(req.params.id)
    .populate('customerId mechanicId');

  if (!request) {
    return sendErrorResponse(res, 404, 'Service request not found');
  }

  // Check ownership
  if (request.customerId._id.toString() !== req.user._id.toString()) {
    return sendErrorResponse(res, 403, 'You can only cancel your own requests');
  }

  // Check if request can be cancelled
  if (!request.canBeCancelled()) {
    return sendErrorResponse(res, 400, 'Request cannot be cancelled at this stage');
  }

  // Update status
  request.cancellationReason = reason.trim();
  await request.updateStatus('cancelled', req.user._id, `Cancelled by customer: ${reason}`);

  // Notify mechanic if assigned
  if (request.mechanicId) {
    try {
      await notificationService.notifyStatusUpdate(request.mechanicId, request, 'cancelled');
    } catch (error) {
      logger.error('Mechanic notification failed:', error);
    }
  }

  logger.info('Service request cancelled:', {
    requestId: request._id,
    customerId: req.user._id,
    reason: reason.trim()
  });

  sendSuccessResponse(res, 200, 'Service request cancelled successfully', {
    request
  });
});

/**
 * @swagger
 * /customer/requests/{id}:
 *   delete:
 *     summary: Delete a service request (only if not assigned)
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
const deleteRequest = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.findById(req.params.id);

  if (!request) {
    return sendErrorResponse(res, 404, 'Service request not found');
  }

  // Check ownership
  if (request.customerId.toString() !== req.user._id.toString()) {
    return sendErrorResponse(res, 403, 'You can only delete your own requests');
  }

  // Check if request is assigned or in progress
  // Must be 'pending' AND have no mechanic assigned
  if (request.status !== 'pending' || request.mechanicId) {
    return sendErrorResponse(res, 400, 'Request cannot be deleted because it is already assigned or in progress. Try cancelling instead if possible.');
  }

  await ServiceRequest.findByIdAndDelete(req.params.id);

  logger.info('Service request deleted:', {
    requestId: request._id,
    customerId: req.user._id
  });

  sendSuccessResponse(res, 200, 'Service request deleted successfully');
});

/**
 * @swagger
 * /customer/requests/{id}/notes:
 *   post:
 *     summary: Add note to service request
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - text
 *             properties:
 *               text:
 *                 type: string
 */
const addNote = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return sendErrorResponse(res, 400, 'Note text is required');
  }

  const request = await ServiceRequest.findById(req.params.id);

  if (!request) {
    return sendErrorResponse(res, 404, 'Service request not found');
  }

  // Check if user can add notes
  const canAddNote = (
    (req.user.role === 'customer' && request.customerId.toString() === req.user._id.toString()) ||
    (req.user.role === 'mechanic' && request.mechanicId && request.mechanicId.toString() === req.user._id.toString()) ||
    req.user.role === 'admin'
  );

  if (!canAddNote) {
    return sendErrorResponse(res, 403, 'You cannot add notes to this request');
  }

  // Add note
  request.notes.push({
    text: text.trim(),
    addedBy: req.user._id
  });

  await request.save();

  // Populate the newly added note
  await request.populate('notes.addedBy', 'name role');

  logger.info('Note added to service request:', {
    requestId: request._id,
    addedBy: req.user._id,
    role: req.user.role
  });

  sendSuccessResponse(res, 201, 'Note added successfully', {
    note: request.notes[request.notes.length - 1]
  });
});

/**
 * @swagger
 * /mechanic/tasks:
 *   get:
 *     summary: Get mechanic's assigned tasks
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, enroute, in_progress, completed]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 */
const getMechanicTasks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const { status } = req.query;

  // Build filter for mechanic's tasks
  const filter = {
    $or: [
      { mechanicId: req.user._id }, // Assigned tasks (including direct bookings)
      { status: 'pending' } // Available tasks (if no status filter or pending included)
    ]
  };

  if (status) {
    if (status === 'pending') {
      // Show pending requests for acceptance (both broadcast and direct bookings)
      filter.$or = [{ status: 'pending' }];
    } else {
      // Only show assigned tasks with specific status
      filter.$or = [{ mechanicId: req.user._id, status }];
    }
  }

  // For pending requests, also filter by location if mechanic has location
  if (req.user.location && (!status || status === 'pending')) {
    // Add location-based filtering for pending broadcast requests
    const pendingFilter = {
      status: 'pending',
      $or: [
        {
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [req.user.location.lng, req.user.location.lat]
              },
              $maxDistance: 50000 // 50km radius
            }
          }
        }
      ]
    };

    if (status === 'pending') {
      filter.$or = [pendingFilter];
    } else if (!status) {
      filter.$or.push(pendingFilter);
    }
  }

  const requests = await ServiceRequest.find(filter)
    .populate('customerId', 'name phone')
    .sort({ createdAt: -1, priority: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ServiceRequest.countDocuments(filter);

  // Calculate distances for requests
  const requestsWithDistance = requests.map(request => {
    let distance = null;
    if (req.user.location && request.location) {
      distance = calculateDistance(
        req.user.location.lat,
        req.user.location.lng,
        request.location.lat,
        request.location.lng
      );
    }
    
    return {
      ...request.toObject(),
      distance
    };
  });

  const meta = generatePaginationMeta(page, limit, total);

  sendSuccessResponse(res, 200, 'Tasks retrieved successfully', {
    requests: requestsWithDistance,
    meta
  });
});

/**
 * @swagger
 * /mechanic/tasks/{id}/accept:
 *   post:
 *     summary: Accept a service request
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quotation:
 *                 type: number
 *               estimatedDuration:
 *                 type: number
 */
const acceptRequest = asyncHandler(async (req, res) => {
  const { quotation, estimatedDuration } = req.body;

  const request = await ServiceRequest.findById(req.params.id)
    .populate('customerId', 'name phone email');

  if (!request) {
    return sendErrorResponse(res, 404, 'Service request not found');
  }

  if (request.status !== 'pending') {
    return sendErrorResponse(res, 400, 'Request is no longer available for acceptance');
  }

  // Check if this is a direct booking request
  const isDirectBooking = request.mechanicId && request.mechanicId.toString() === req.user._id.toString();

  // For direct bookings, mechanic is already assigned, just need to accept
  if (isDirectBooking) {
    // Update quotation and mechanicOfferPrice
    if (quotation && quotation > 0) {
      request.quotation = quotation;
      request.mechanicOfferPrice = quotation;
    } else if (request.userExpectedPrice > 0) {
      request.quotation = request.userExpectedPrice;
      request.mechanicOfferPrice = request.userExpectedPrice;
    }
    
    // Update estimated duration if provided
    if (estimatedDuration && estimatedDuration > 0) {
      request.estimatedDuration = estimatedDuration;
    }

    await request.updateStatus('offered', req.user._id, 'Direct booking request accepted with an offer');

    // Notify customer
    try {
      await notificationService.notifyStatusUpdate(request.customerId, request, 'offered');
    } catch (error) {
      logger.error('Customer notification failed:', error);
    }

    logger.info('Direct booking request accepted:', {
      requestId: request._id,
      mechanicId: req.user._id,
      customerId: request.customerId._id
    });

    sendSuccessResponse(res, 200, 'Direct booking request accepted successfully', {
      request
    });
    return;
  }

  // For broadcast requests, check if mechanic has location set
  if (!req.user.location || !req.user.location.lat || !req.user.location.lng) {
    return sendErrorResponse(res, 400, 'Please update your location before accepting requests');
  }

  // Assign mechanic
  request.mechanicId = req.user._id;
  
  // Update quotation and mechanicOfferPrice
  if (quotation && quotation > 0) {
    request.quotation = quotation;
    request.mechanicOfferPrice = quotation;
  } else if (request.userExpectedPrice > 0) {
    // If no counter offer, default to user's expected price
    request.quotation = request.userExpectedPrice;
    request.mechanicOfferPrice = request.userExpectedPrice;
  }
  
  if (estimatedDuration && estimatedDuration > 0) {
    request.estimatedDuration = estimatedDuration;
  }

  await request.updateStatus('offered', req.user._id, 'Mechanic offered a quotation');

  // Notify customer
  try {
    await notificationService.notifyStatusUpdate(request.customerId, request, 'offered');
  } catch (error) {
    logger.error('Customer notification failed:', error);
  }

  logger.info('Service request accepted:', {
    requestId: request._id,
    mechanicId: req.user._id,
    customerId: request.customerId._id
  });

  sendSuccessResponse(res, 200, 'Service request accepted successfully', {
    request
  });
});

/**
 * @swagger
 * /mechanic/tasks/{id}/reject:
 *   post:
 *     summary: Reject a service request (for direct bookings)
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 */
const rejectRequest = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const request = await ServiceRequest.findById(req.params.id)
    .populate('customerId', 'name phone email');

  if (!request) {
    return sendErrorResponse(res, 404, 'Service request not found');
  }

  // Only allow rejection of direct booking requests that are pending
  if (request.status !== 'pending') {
    return sendErrorResponse(res, 400, 'Request is no longer available for rejection');
  }

  // Check if this is a direct booking request for this mechanic
  if (!request.mechanicId || request.mechanicId.toString() !== req.user._id.toString()) {
    return sendErrorResponse(res, 403, 'You can only reject direct booking requests assigned to you');
  }

  // Update request status to cancelled
  await request.updateStatus('cancelled', req.user._id, `Request rejected by mechanic: ${reason || 'No reason provided'}`);

  // Notify customer
  try {
    await notificationService.notifyRequestRejected(request.customerId, req.user, request, reason);
  } catch (error) {
    logger.error('Customer notification failed:', error);
  }

  logger.info('Direct booking request rejected:', {
    requestId: request._id,
    mechanicId: req.user._id,
    customerId: request.customerId._id,
    reason
  });

  sendSuccessResponse(res, 200, 'Request rejected successfully', {
    request
  });
});

/**
 * @swagger
 * /mechanic/tasks/{id}/status:
 *   patch:
 *     summary: Update service request status
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *                 enum: [enroute, in_progress, completed]
 *               note:
 *                 type: string
 *               quotation:
 *                 type: number
 */
const updateRequestStatus = asyncHandler(async (req, res) => {
  const { status, note, quotation } = req.body;

  const request = await ServiceRequest.findById(req.params.id)
    .populate('customerId', 'name phone email');

  if (!request) {
    return sendErrorResponse(res, 404, 'Service request not found');
  }

  // Check if mechanic is assigned to this request
  if (!request.mechanicId || request.mechanicId.toString() !== req.user._id.toString()) {
    return sendErrorResponse(res, 403, 'You can only update requests assigned to you');
  }

  // Validate status transition
  const currentStatus = request.status;
  const validTransitions = {
    'assigned': ['enroute', 'cancelled'],
    'enroute': ['in_progress', 'cancelled'],
    'in_progress': ['completed', 'cancelled']
  };

  if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
    return sendErrorResponse(res, 400, `Invalid status transition from ${currentStatus} to ${status}`);
  }

  // Update quotation if provided and status is appropriate
  if (quotation && quotation > 0 && ['enroute', 'in_progress'].includes(status)) {
    request.quotation = quotation;
  }

  // Update status
  await request.updateStatus(status, req.user._id, note || `Status updated to ${status}`);

  // Notify customer
  try {
    await notificationService.notifyStatusUpdate(request.customerId, request, status);
  } catch (error) {
    logger.error('Customer notification failed:', error);
  }

  logger.info('Service request status updated:', {
    requestId: request._id,
    mechanicId: req.user._id,
    oldStatus: currentStatus,
    newStatus: status
  });

  sendSuccessResponse(res, 200, 'Status updated successfully', {
    request
  });
});

/**
 * @customer
 * Confirm mechanic's offer and final assign
 */
const confirmRequestPrice = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.findById(req.params.id)
    .populate('customerId', 'name phone email')
    .populate('mechanicId', 'name phone rating');

  if (!request) {
    return sendErrorResponse(res, 404, 'Service request not found');
  }

  // Check ownership
  if (request.customerId._id.toString() !== req.user._id.toString()) {
    return sendErrorResponse(res, 403, 'Access denied');
  }

  if (request.status !== 'offered') {
    return sendErrorResponse(res, 400, 'Request price cannot be confirmed at this stage');
  }

  // Confirm price and assign
  request.status = 'assigned';
  request.isPriceConfirmed = true;
  request.finalAmount = request.mechanicOfferPrice; // Set the agreed price
  request.quotation = request.mechanicOfferPrice; // For legacy display consistency
  
  // Add timeline entry
  if (!request.history) request.history = [];
  request.history.push({
    status: 'assigned',
    timestamp: new Date(),
    description: `Customer confirmed price ${request.finalAmount} and final-assigned the mechanic.`,
    updatedBy: req.user._id
  });

  await request.save();

  // Notify mechanic
  try {
    await notificationService.notifyMechanicAssigned(request.mechanicId, req.user, request);
  } catch (error) {
    logger.error('Mechanic notification failed:', error);
  }

  logger.info('Service request price confirmed and assigned:', {
    requestId: request._id,
    customerId: req.user._id,
    mechanicId: request.mechanicId._id,
    price: request.finalAmount
  });

  sendSuccessResponse(res, 200, 'Mechanic assigned and price confirmed', {
    request
  });
});

module.exports = {
  uploadImages,
  createServiceRequest,
  getMyRequests,
  getRequestDetails,
  confirmRequestPrice,
  cancelRequest,
  addNote,
  getMechanicTasks,
  acceptRequest,
  rejectRequest,
  updateRequestStatus,
  deleteRequest
};
