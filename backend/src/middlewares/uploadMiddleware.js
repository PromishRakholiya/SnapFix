const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const logger = require("../config/logger");

// Configure memory storage for Cloudinary upload
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type: allow images and PDF documents
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image and PDF files are allowed"), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5, // Maximum 5 files
  },
  fileFilter: fileFilter,
});

// Function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    // Check if Cloudinary is configured
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.CLOUDINARY_CLOUD_NAME === "demo"
    ) {
      // Fallback: Return a mock URL for development
      const mockResult = {
        public_id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        secure_url: `https://via.placeholder.com/400x300.png?text=Demo+Image`,
        url: `https://via.placeholder.com/400x300.png?text=Demo+Image`,
        width: 400,
        height: 300,
        format: "png",
        resource_type: "image",
      };

      logger.warn("Cloudinary not configured, using demo URL:", {
        public_id: mockResult.public_id,
        secure_url: mockResult.secure_url,
      });

      resolve(mockResult);
      return;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: options.resource_type || "image",
        folder: options.folder || "snapfix",
        public_id: options.public_id,
        transformation: options.transformation,
      },
      (error, result) => {
        if (error) {
          logger.error("Cloudinary upload error:", error);
          reject(error);
        } else {
          logger.info("Image uploaded to Cloudinary:", {
            public_id: result.public_id,
            secure_url: result.secure_url,
          });
          resolve(result);
        }
      },
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// Middleware to upload files to Cloudinary after multer processing
const uploadToCloudinaryMiddleware = (options = {}) => {
  return async (req, res, next) => {
    try {
      if (req.file) {
        // Single file upload
        const resourceType =
          req.file.mimetype === "application/pdf" ? "raw" : "image";
        const result = await uploadToCloudinary(req.file.buffer, {
          resource_type: resourceType,
          folder: options.folder || "snapfix",
          public_id: options.generatePublicId
            ? options.generatePublicId(req.file)
            : undefined,
        });

        req.file.cloudinary = result;
        req.file.url = result.secure_url;
        req.file.public_id = result.public_id;
      }

      if (req.files) {
        // Multiple files upload
        const files = Array.isArray(req.files)
          ? req.files
          : Object.values(req.files).flat();

        await Promise.all(
          files.map(async (file) => {
            const resourceType =
              file.mimetype === "application/pdf" ? "raw" : "image";
            const result = await uploadToCloudinary(file.buffer, {
              resource_type: resourceType,
              folder: options.folder || "snapfix",
              public_id: options.generatePublicId
                ? options.generatePublicId(file)
                : undefined,
            });

            file.cloudinary = result;
            file.url = result.secure_url;
            file.public_id = result.public_id;
          })
        );
      }

      next();
    } catch (error) {
      logger.error("Error uploading to Cloudinary:", error);
      return res.status(500).json({
        success: false,
        message: "Error uploading files to cloud storage",
      });
    }
  };
};

// Middleware for handling upload errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum size is 5MB.",
      });
    } else if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum 5 files allowed.",
      });
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected field name for file upload.",
      });
    }
  }

  if (err.message === "Only image files are allowed") {
    return res.status(400).json({
      success: false,
      message: "Only image files are allowed.",
    });
  }

  logger.error("Upload error:", err);
  return res.status(500).json({
    success: false,
    message: "Error uploading file",
  });
};

// Export different upload configurations
module.exports = {
  single: (fieldName, options = {}) => [
    upload.single(fieldName),
    uploadToCloudinaryMiddleware(options),
    handleUploadError,
  ],
  multiple: (fieldName, maxCount = 5, options = {}) => [
    upload.array(fieldName, maxCount),
    uploadToCloudinaryMiddleware(options),
    handleUploadError,
  ],
  fields: (fields, options = {}) => [
    upload.fields(fields),
    uploadToCloudinaryMiddleware(options),
    handleUploadError,
  ],
  profilePicture: [
    upload.single("profilePicture"),
    uploadToCloudinaryMiddleware({ folder: "snapfix/profiles" }),
    handleUploadError,
  ],
  vehicleImages: [
    upload.array("images", 5),
    uploadToCloudinaryMiddleware({ folder: "snapfix/vehicles" }),
    handleUploadError,
  ],
  serviceImages: [
    upload.array("images", 10),
    uploadToCloudinaryMiddleware({ folder: "snapfix/services" }),
    handleUploadError,
  ],
  uploadToCloudinary,
  uploadToCloudinaryMiddleware,
};
