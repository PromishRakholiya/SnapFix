const User = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');
const Payment = require('../models/Payment');
const logger = require('../config/logger');
const mongoose = require('mongoose');

/**
 * Get nearby mechanics within specified distance
 */
const getNearbyMechanics = async (req, res) => {
  try {
    console.log('getNearbyMechanics called with query params:', req.query);
    
    const { 
      latitude, 
      longitude, 
      maxDistance = 25, 
      search, 
      rating, 
      sortBy = 'distance' 
    } = req.query;

    console.log('Extracted params:', { latitude, longitude, maxDistance, search, rating, sortBy });

    if (!latitude || !longitude) {
      console.log('Missing latitude or longitude:', { latitude, longitude });
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Build filter for mechanics
    const filter = { role: 'mechanic', isVerified: true, isActive: true };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialties: { $regex: search, $options: 'i' } }
      ];
    }

    if (rating) {
      filter.rating = { $gte: parseFloat(rating) };
    }

    // Get mechanics from database
    const mechanics = await User.find(filter).lean();
    
    console.log('Found mechanics:', mechanics.length);
    console.log('Filter used:', filter);

    // Calculate distances and filter by maxDistance
    const mechanicsWithDistance = mechanics
      .map(mechanic => {
        if (mechanic.location && mechanic.location.lat && mechanic.location.lng) {
          const distance = calculateDistance(
            parseFloat(latitude),
            parseFloat(longitude),
            mechanic.location.lat, // latitude
            mechanic.location.lng  // longitude
          );
          console.log(`Mechanic ${mechanic.name}: distance = ${distance}km`);
          return { ...mechanic, distance };
        }
        console.log(`Mechanic ${mechanic.name}: no location data`);
        return { ...mechanic, distance: null };
      })
      .filter(mechanic => mechanic.distance !== null && (maxDistance === 'all' || mechanic.distance <= parseFloat(maxDistance)))
      .sort((a, b) => {
        switch (sortBy) {
          case 'rating':
            return (b.rating || 0) - (a.rating || 0);
          case 'completedJobs':
            return (b.completedJobs || 0) - (a.completedJobs || 0);
          case 'name':
            return a.name.localeCompare(b.name);
          case 'distance':
          default:
            return a.distance - b.distance;
        }
      });

    // Add availability status based on current active requests
    const mechanicsWithAvailability = mechanicsWithDistance.map(mechanic => {
      const isAvailable = !mechanic.currentRequests || mechanic.currentRequests.length === 0;
      return {
        ...mechanic,
        isAvailable
      };
    });

    console.log('Final mechanics with availability:', mechanicsWithAvailability.length);

    logger.info('Nearby mechanics retrieved', {
      customerId: req.user?.id,
      latitude,
      longitude,
      maxDistance,
      count: mechanicsWithAvailability.length
    });

    res.json({
      success: true,
      message: 'Nearby mechanics retrieved successfully',
      data: {
        mechanics: mechanicsWithAvailability,
        total: mechanicsWithAvailability.length,
        userLocation: { latitude, longitude }
      }
    });

  } catch (error) {
    logger.error('Error fetching nearby mechanics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby mechanics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get mechanic details by ID
 */
const getMechanicDetails = async (req, res) => {
  try {
    const { mechanicId } = req.params;

    const mechanic = await User.findById(mechanicId).lean();

    if (!mechanic || mechanic.role !== 'mechanic') {
      return res.status(404).json({
        success: false,
        message: 'Mechanic not found'
      });
    }

    // Get reviews from completed service requests
    const completedRequests = await ServiceRequest.find({
      mechanicId,
      status: 'completed',
      rating: { $exists: true, $ne: null }
    })
    .populate('customerId', 'name')
    .sort({ completedAt: -1 })
    .limit(10)
    .lean();

    const reviews = completedRequests.map(request => ({
      customerName: request.customerId?.name || 'Anonymous',
      rating: request.rating,
      comment: request.review || 'No comment provided',
      createdAt: request.completedAt
    }));

    const mechanicWithReviews = {
      ...mechanic,
      reviews
    };

    logger.info('Mechanic details retrieved', {
      customerId: req.user?.id,
      mechanicId
    });

    res.json({
      success: true,
      message: 'Mechanic details retrieved successfully',
      data: mechanicWithReviews
    });

  } catch (error) {
    logger.error('Error fetching mechanic details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mechanic details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new service request
 */
const createServiceRequest = async (req, res) => {
  try {
    const {
      mechanicId,
      issueType,
      description,
      location,
      preferredTime,
      images
    } = req.body;

    const customerId = req.user.id;

    // Validate required fields
    if (!issueType || !description || !location) {
      return res.status(400).json({
        success: false,
        message: 'Issue type, description, and location are required'
      });
    }

    // Create service request
    const serviceRequest = new ServiceRequest({
      customerId,
      mechanicId,
      issueType,
      description,
      location,
      preferredTime,
      images,
      status: 'pending'
    });

    await serviceRequest.save();

    logger.info('Service request created', {
      customerId,
      mechanicId,
      requestId: serviceRequest._id
    });

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: serviceRequest
    });

  } catch (error) {
    logger.error('Error creating service request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create service request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get customer's service requests
 */
const getServiceRequests = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { customerId };
    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [requests, totalRequests] = await Promise.all([
      ServiceRequest.find(filter)
        .populate('mechanicId', 'name phone rating')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ServiceRequest.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalRequests / parseInt(limit));

    logger.info('Service requests retrieved', {
      customerId,
      count: requests.length
    });

    res.json({
      success: true,
      message: 'Service requests retrieved successfully',
      data: {
        items: requests,
        totalPages,
        totalItems: totalRequests,
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching service requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to calculate distance between two points
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

/**
 * Get customer's saved vehicles
 */
const getVehicles = async (req, res) => {
  try {
    const customerId = req.user.id;
    
    const customer = await User.findById(customerId).select('vehicles');
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    logger.info('Vehicles retrieved', {
      customerId,
      vehicleCount: customer.vehicles.length
    });

    res.json({
      success: true,
      message: 'Vehicles retrieved successfully',
      data: customer.vehicles
    });

  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add a new vehicle to customer's profile
 */
const addVehicle = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { name, type, make, model, year, plate, color, isDefault = false } = req.body;

    // Validate required fields
    if (!name || !type || !make || !model || !year || !plate) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, make, model, year, and plate are required'
      });
    }

    // Validate vehicle type
    const validTypes = ['car', 'motorcycle', 'truck', 'bus', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vehicle type'
      });
    }

    // Check if plate number already exists for this customer
    const existingVehicle = await User.findOne({
      _id: customerId,
      'vehicles.plate': plate.toUpperCase()
    });

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'A vehicle with this license plate already exists'
      });
    }

    const customer = await User.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      customer.vehicles.forEach(vehicle => {
        vehicle.isDefault = false;
      });
    }

    // Add new vehicle
    const newVehicle = {
      name,
      type,
      make,
      model,
      year: parseInt(year),
      plate: plate.toUpperCase(),
      color,
      isDefault
    };

    customer.vehicles.push(newVehicle);
    await customer.save();

    logger.info('Vehicle added', {
      customerId,
      vehicleId: newVehicle._id,
      plate: newVehicle.plate
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: newVehicle
    });

  } catch (error) {
    logger.error('Error adding vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add vehicle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a vehicle
 */
const updateVehicle = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { vehicleId } = req.params;
    const { name, type, make, model, year, plate, color, isDefault = false } = req.body;

    // Validate required fields
    if (!name || !type || !make || !model || !year || !plate) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, make, model, year, and plate are required'
      });
    }

    // Validate vehicle type
    const validTypes = ['car', 'motorcycle', 'truck', 'bus', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vehicle type'
      });
    }

    // Check if plate number already exists for another vehicle of this customer
    const existingVehicle = await User.findOne({
      _id: customerId,
      'vehicles.plate': plate.toUpperCase(),
      'vehicles._id': { $ne: vehicleId }
    });

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'A vehicle with this license plate already exists'
      });
    }

    const customer = await User.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Find the vehicle to update
    const vehicleIndex = customer.vehicles.findIndex(
      vehicle => vehicle._id.toString() === vehicleId
    );

    if (vehicleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      customer.vehicles.forEach(vehicle => {
        vehicle.isDefault = false;
      });
    }

    // Update the vehicle
    customer.vehicles[vehicleIndex] = {
      ...customer.vehicles[vehicleIndex],
      name,
      type,
      make,
      model,
      year: parseInt(year),
      plate: plate.toUpperCase(),
      color,
      isDefault
    };

    await customer.save();

    logger.info('Vehicle updated', {
      customerId,
      vehicleId,
      plate: customer.vehicles[vehicleIndex].plate
    });

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: customer.vehicles[vehicleIndex]
    });

  } catch (error) {
    logger.error('Error updating vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a vehicle
 */
const deleteVehicle = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { vehicleId } = req.params;

    const customer = await User.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Find the vehicle to delete
    const vehicleIndex = customer.vehicles.findIndex(
      vehicle => vehicle._id.toString() === vehicleId
    );

    if (vehicleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const deletedVehicle = customer.vehicles[vehicleIndex];
    customer.vehicles.splice(vehicleIndex, 1);
    await customer.save();

    logger.info('Vehicle deleted', {
      customerId,
      vehicleId,
      plate: deletedVehicle.plate
    });

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vehicle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Set a vehicle as default
 */
const setDefaultVehicle = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { vehicleId } = req.params;

    const customer = await User.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Find the vehicle to set as default
    const vehicleIndex = customer.vehicles.findIndex(
      vehicle => vehicle._id.toString() === vehicleId
    );

    if (vehicleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Unset all other defaults
    customer.vehicles.forEach(vehicle => {
      vehicle.isDefault = false;
    });

    // Set this vehicle as default
    customer.vehicles[vehicleIndex].isDefault = true;
    await customer.save();

    logger.info('Default vehicle set', {
      customerId,
      vehicleId,
      plate: customer.vehicles[vehicleIndex].plate
    });

    res.json({
      success: true,
      message: 'Default vehicle set successfully',
      data: customer.vehicles[vehicleIndex]
    });

  } catch (error) {
    logger.error('Error setting default vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default vehicle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getNearbyMechanics,
  getMechanicDetails,
  createServiceRequest,
  getServiceRequests,
  getVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  setDefaultVehicle
};



