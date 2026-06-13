const asyncHandler = require("../utils/response").asyncHandler;
const sendSuccessResponse = require("../utils/response").sendSuccessResponse;
const sendErrorResponse = require("../utils/response").sendErrorResponse;
const MechanicVerification = require("../models/MechanicVerification");
const User = require("../models/User");
const uploadService = require("../services/uploadService");
const notificationService = require("../services/notificationService");
const logger = require("../config/logger");

/**
 * @swagger
 * /api/mechanic/verification:
 *   post:
 *     summary: Submit mechanic verification request
 *     tags: [Mechanic - Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - shopName
 *               - shopAddress
 *               - shopImage
 *               - documentImage
 *               - documentType
 *             properties:
 *               shopName:
 *                 type: string
 *               shopAddress:
 *                 type: object
 *               gstNumber:
 *                 type: string
 *               shopImage:
 *                 type: string
 *                 format: binary
 *               documentImage:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *                 enum: [aadhar, pan, driving_license, shop_license, other]
 */
const submitVerification = asyncHandler(async (req, res) => {
  console.log("Submit verification request received");
  console.log("Request body:", req.body);
  console.log("Request files:", req.files);
  console.log("Location data:", req.body.location);

  const { shopName, shopAddress, location, gstNumber, documentType } = req.body;

  // Check if mechanic already has a verification request
  const existingVerification = await MechanicVerification.findOne({
    mechanicId: req.user._id,
  });

  if (existingVerification) {
    // If verification is already approved or rejected, don't allow updates
    if (existingVerification.status !== "pending") {
      return sendErrorResponse(
        res,
        400,
        "Verification request has already been reviewed and cannot be updated",
      );
    }

    // If verification is pending, update the existing request
    console.log("Updating existing verification request");

    // Parse shop address and location if they're strings
    let parsedShopAddress, parsedLocation;
    try {
      parsedShopAddress =
        typeof shopAddress === "string" ? JSON.parse(shopAddress) : shopAddress;
      parsedLocation =
        typeof location === "string" ? JSON.parse(location) : location;
    } catch (error) {
      return sendErrorResponse(
        res,
        400,
        "Invalid shop address or location format",
      );
    }

    // Handle image uploads
    let shopImageUrl, documentImageUrl;

    try {
      console.log("Processing uploaded files...");

      if (req.files && req.files.shopImage && req.files.shopImage[0]) {
        console.log("Shop image found:", req.files.shopImage[0]);
        shopImageUrl = req.files.shopImage[0].url;
        console.log("Shop image URL:", shopImageUrl);
      } else {
        shopImageUrl = existingVerification.shopImage;
      }

      if (req.files && req.files.documentImage && req.files.documentImage[0]) {
        console.log("Document image found:", req.files.documentImage[0]);
        documentImageUrl = req.files.documentImage[0].url;
        console.log("Document image URL:", documentImageUrl);
      } else {
        documentImageUrl = existingVerification.documentImage;
      }
    } catch (error) {
      logger.error("Image upload failed:", error);
      return sendErrorResponse(res, 500, "Failed to upload images");
    }

    // Update existing verification
    existingVerification.shopName = shopName;
    existingVerification.shopAddress = parsedShopAddress;
    existingVerification.location = parsedLocation;
    existingVerification.gstNumber = gstNumber || undefined;
    existingVerification.shopImage = shopImageUrl;
    existingVerification.documentImage = documentImageUrl;
    existingVerification.documentType = documentType;
    existingVerification.updatedAt = new Date();

    await existingVerification.save();
    await existingVerification.populate("mechanicId", "name email phone");

    logger.info("Mechanic verification updated:", {
      mechanicId: req.user._id,
      verificationId: existingVerification._id,
    });

    sendSuccessResponse(res, 200, "Verification request updated successfully", {
      verification: existingVerification,
    });
    return;
  }

  // Validate required fields
  if (!shopName || !shopAddress || !location || !documentType) {
    return sendErrorResponse(
      res,
      400,
      "Missing required fields: shopName, shopAddress, location, and documentType are required",
    );
  }

  // Parse shop address and location if they're strings
  let parsedShopAddress, parsedLocation;
  try {
    parsedShopAddress =
      typeof shopAddress === "string" ? JSON.parse(shopAddress) : shopAddress;
    parsedLocation =
      typeof location === "string" ? JSON.parse(location) : location;
  } catch (error) {
    return sendErrorResponse(
      res,
      400,
      "Invalid shop address or location format",
    );
  }

  // Handle image uploads
  let shopImageUrl, documentImageUrl;

  try {
    console.log("Processing uploaded files...");

    if (req.files && req.files.shopImage && req.files.shopImage[0]) {
      console.log("Shop image found:", req.files.shopImage[0]);
      shopImageUrl = req.files.shopImage[0].url;
      console.log("Shop image URL:", shopImageUrl);
    } else {
      console.log("Shop image missing. Files:", req.files);
      return sendErrorResponse(res, 400, "Shop image is required");
    }

    if (req.files && req.files.documentImage && req.files.documentImage[0]) {
      console.log("Document image found:", req.files.documentImage[0]);
      documentImageUrl = req.files.documentImage[0].url;
      console.log("Document image URL:", documentImageUrl);
    } else {
      console.log("Document image missing. Files:", req.files);
      return sendErrorResponse(res, 400, "Document image is required");
    }
  } catch (error) {
    logger.error("Image upload failed:", error);
    return sendErrorResponse(res, 500, "Failed to upload images");
  }

  // Create verification request
  const verification = new MechanicVerification({
    mechanicId: req.user._id,
    shopName,
    shopAddress: parsedShopAddress,
    location: parsedLocation,
    gstNumber: gstNumber || undefined,
    shopImage: shopImageUrl,
    documentImage: documentImageUrl,
    documentType,
  });

  await verification.save();

  // Populate mechanic info
  await verification.populate("mechanicId", "name email phone");

  // Notify admin about new verification request
  try {
    await notificationService.notifyAdminNewVerification(verification);
  } catch (error) {
    logger.error("Failed to notify admin:", error);
  }

  logger.info("Mechanic verification submitted:", {
    mechanicId: req.user._id,
    verificationId: verification._id,
  });

  sendSuccessResponse(res, 201, "Verification request submitted successfully", {
    verification,
  });
});

/**
 * @swagger
 * /api/mechanic/verification:
 *   get:
 *     summary: Get mechanic's verification status
 *     tags: [Mechanic - Verification]
 *     security:
 *       - bearerAuth: []
 */
const getVerificationStatus = asyncHandler(async (req, res) => {
  const verification = await MechanicVerification.getByMechanicId(req.user._id);

  if (!verification) {
    return sendSuccessResponse(res, 200, "No verification request found", {
      verification: null,
    });
  }

  sendSuccessResponse(res, 200, "Verification status retrieved", {
    verification,
  });
});

/**
 * @swagger
 * /api/mechanic/verification:
 *   put:
 *     summary: Update mechanic verification request
 *     tags: [Mechanic - Verification]
 *     security:
 *       - bearerAuth: []
 */
const updateVerification = asyncHandler(async (req, res) => {
  const verification = await MechanicVerification.findOne({
    mechanicId: req.user._id,
  });

  if (!verification) {
    return sendErrorResponse(res, 404, "Verification request not found");
  }

  if (verification.status !== "pending") {
    return sendErrorResponse(
      res,
      400,
      "Cannot update verification that is not pending",
    );
  }

  const { shopName, shopAddress, gstNumber, documentType } = req.body;

  // Update fields if provided
  if (shopName) verification.shopName = shopName;
  if (shopAddress) {
    try {
      verification.shopAddress =
        typeof shopAddress === "string" ? JSON.parse(shopAddress) : shopAddress;
    } catch (error) {
      return sendErrorResponse(res, 400, "Invalid shop address format");
    }
  }
  if (gstNumber !== undefined) verification.gstNumber = gstNumber || undefined;
  if (documentType) verification.documentType = documentType;

  // Handle image updates if provided
  if (req.files) {
    try {
      if (req.files.shopImage && req.files.shopImage[0]) {
        verification.shopImage = req.files.shopImage[0].url;
      }
      if (req.files.documentImage && req.files.documentImage[0]) {
        verification.documentImage = req.files.documentImage[0].url;
      }
    } catch (error) {
      logger.error("Image upload failed:", error);
      return sendErrorResponse(res, 500, "Failed to upload images");
    }
  }

  await verification.save();
  await verification.populate("mechanicId", "name email phone");

  logger.info("Mechanic verification updated:", {
    mechanicId: req.user._id,
    verificationId: verification._id,
  });

  sendSuccessResponse(res, 200, "Verification request updated successfully", {
    verification,
  });
});

/**
 * @swagger
 * /api/admin/verifications:
 *   get:
 *     summary: Get all mechanic verification requests (Admin)
 *     tags: [Admin - Verifications]
 *     security:
 *       - bearerAuth: []
 */
const getAllVerifications = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [verifications, total] = await Promise.all([
    MechanicVerification.find(filter)
      .populate("mechanicId", "name email phone")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    MechanicVerification.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / parseInt(limit));

  sendSuccessResponse(res, 200, "Verifications retrieved successfully", {
    verifications,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalItems: total,
      itemsPerPage: parseInt(limit),
    },
  });
});

/**
 * @swagger
 * /api/admin/verifications/{verificationId}/review:
 *   post:
 *     summary: Review mechanic verification request (Admin)
 *     tags: [Admin - Verifications]
 *     security:
 *       - bearerAuth: []
 */
const reviewVerification = asyncHandler(async (req, res) => {
  console.log("Review verification request received:", {
    verificationId: req.params.verificationId,
    body: req.body,
  });

  const { verificationId } = req.params;
  const { status, notes, rejectionReason } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return sendErrorResponse(
      res,
      400,
      'Invalid status. Must be "approved" or "rejected"',
    );
  }

  const verification = await MechanicVerification.findById(
    verificationId,
  ).populate("mechanicId", "name email phone");

  if (!verification) {
    return sendErrorResponse(res, 404, "Verification request not found");
  }

  if (verification.status !== "pending") {
    return sendErrorResponse(
      res,
      400,
      "Verification has already been reviewed",
    );
  }

  // Update verification status
  verification.status = status;
  verification.reviewedBy = req.user._id;
  verification.reviewedAt = new Date();
  verification.adminNotes = notes || undefined;
  verification.rejectionReason =
    status === "rejected" ? rejectionReason : undefined;

  await verification.save();

  // If approved, update mechanic's verification status and location
  if (status === "approved") {
    const updateData = {
      isVerified: true,
      verificationStatus: "verified",
    };

    // Add location if available in verification
    if (verification.location) {
      updateData.location = verification.location;
    }
    await User.findByIdAndUpdate(verification.mechanicId._id, updateData);
  }

  // Notify mechanic about the decision
  try {
    if (status === "approved") {
      await notificationService.notifyMechanicVerificationApproved(
        verification.mechanicId,
      );
    } else {
      await notificationService.notifyMechanicVerificationRejected(
        verification.mechanicId,
        rejectionReason,
      );
    }
  } catch (error) {
    logger.error("Failed to notify mechanic:", error);
  }

  logger.info("Mechanic verification reviewed:", {
    verificationId,
    status,
    reviewedBy: req.user._id,
    mechanicId: verification.mechanicId._id,
  });

  sendSuccessResponse(res, 200, `Verification ${status} successfully`, {
    verification,
  });
});

module.exports = {
  submitVerification,
  getVerificationStatus,
  updateVerification,
  getAllVerifications,
  reviewVerification,
};
