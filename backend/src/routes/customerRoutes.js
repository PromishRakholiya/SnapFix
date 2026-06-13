const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const requestController = require('../controllers/requestController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { validate, schemas } = require('../middlewares/validationMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');

// Mechanic discovery routes (public - no authentication required)
router.get('/mechanics/nearby', customerController.getNearbyMechanics);

// Apply authentication to other customer routes
router.use(authenticateToken);
router.get('/mechanics/:mechanicId', customerController.getMechanicDetails);

// Service request routes
router.post('/service-requests', validate(schemas.createServiceRequest), requestController.createServiceRequest);
router.get('/service-requests', customerController.getServiceRequests);

// Request management routes (using requestController)
router.get('/requests', requestController.getMyRequests);
router.get('/requests/:id', requestController.getRequestDetails);
router.patch('/requests/:id/cancel', requestController.cancelRequest);
router.patch('/requests/:id/confirm-price', requestController.confirmRequestPrice);
router.delete('/requests/:id', requestController.deleteRequest);

// Upload routes
router.post('/upload/images', uploadMiddleware.serviceImages, requestController.uploadImages);

// Vehicle management routes
router.get('/vehicles', customerController.getVehicles);
router.post('/vehicles', validate(schemas.addVehicle), customerController.addVehicle);
router.put('/vehicles/:vehicleId', validate(schemas.updateVehicle), customerController.updateVehicle);
router.delete('/vehicles/:vehicleId', customerController.deleteVehicle);
router.patch('/vehicles/:vehicleId/default', customerController.setDefaultVehicle);

module.exports = router;
