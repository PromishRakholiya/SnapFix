const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs").promises;
const path = require("path");
const logger = require("../config/logger");
const { AppError } = require("../utils/response");

class UploadService {
  constructor() {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Ensure uploads directory exists
    this.initializeLocalStorage();

    // File size limits
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB
    this.maxFiles = 5;

    // Allowed file types
    this.allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    this.allowedDocTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
  }

  // Initialize local storage directory
  async initializeLocalStorage() {
    try {
      const uploadsDir = path.join(process.cwd(), "uploads");
      const subdirs = ["images", "documents", "temp"];

      // Create main uploads directory
      try {
        await fs.access(uploadsDir);
      } catch {
        await fs.mkdir(uploadsDir);
      }

      // Create subdirectories
      for (const subdir of subdirs) {
        const subdirPath = path.join(uploadsDir, subdir);
        try {
          await fs.access(subdirPath);
        } catch {
          await fs.mkdir(subdirPath);
        }
      }

      logger.info("Upload directories initialized");
    } catch (error) {
      logger.error("Failed to initialize upload directories:", error);
    }
  }

  // Configure multer for file uploads
  getMulterConfig(destination = "temp", fileFilter = null) {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), "uploads", destination));
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + "-" + uniqueSuffix + extension);
      },
    });

    return multer({
      storage,
      limits: {
        fileSize: this.maxFileSize,
        files: this.maxFiles,
      },
      fileFilter: fileFilter || this.defaultFileFilter.bind(this),
    });
  }

  // Default file filter
  defaultFileFilter(req, file, cb) {
    const allowedTypes = [...this.allowedImageTypes, ...this.allowedDocTypes];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`File type ${file.mimetype} not allowed`, 400), false);
    }
  }

  // Image-only file filter
  imageFileFilter(req, file, cb) {
    if (this.allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError("Only image files are allowed", 400), false);
    }
  }

  // Upload single image to Cloudinary
  async uploadImageToCloudinary(filePath, options = {}) {
    try {
      const {
        folder = "snapfix",
        transformation = { quality: "auto", fetch_format: "auto" },
        tags = [],
      } = options;

      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        transformation,
        tags,
        resource_type: "image",
      });

      // Delete local file after successful upload
      await this.deleteLocalFile(filePath);

      logger.info("Image uploaded to Cloudinary:", {
        publicId: result.public_id,
        url: result.secure_url,
        size: result.bytes,
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      };
    } catch (error) {
      logger.error("Cloudinary upload failed:", error);

      // Try to delete local file even if upload failed
      try {
        await this.deleteLocalFile(filePath);
      } catch (deleteError) {
        logger.error(
          "Failed to delete local file after upload error:",
          deleteError,
        );
      }

      throw new AppError("Failed to upload image", 500);
    }
  }

  // Upload multiple images
  async uploadMultipleImages(files, options = {}) {
    try {
      const uploadPromises = files.map((file) =>
        this.uploadImageToCloudinary(file.path, {
          ...options,
          tags: [...(options.tags || []), "batch_upload"],
        }),
      );

      const results = await Promise.allSettled(uploadPromises);

      const successful = [];
      const failed = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successful.push({
            originalName: files[index].originalname,
            ...result.value,
          });
        } else {
          failed.push({
            originalName: files[index].originalname,
            error: result.reason.message,
          });
        }
      });

      logger.info("Batch upload completed:", {
        successful: successful.length,
        failed: failed.length,
      });

      return { successful, failed };
    } catch (error) {
      logger.error("Batch upload failed:", error);
      throw new AppError("Failed to upload images", 500);
    }
  }

  // Upload service request images
  async uploadServiceRequestImages(files, requestId) {
    try {
      const options = {
        folder: `snapfix/service-requests/${requestId}`,
        tags: ["service_request", requestId.toString()],
        transformation: {
          quality: "auto",
          fetch_format: "auto",
          width: 1200,
          height: 900,
          crop: "limit",
        },
      };

      const result = await this.uploadMultipleImages(files, options);

      if (result.failed.length > 0) {
        logger.warn("Some images failed to upload:", result.failed);
      }

      return result.successful.map((img) => img.url);
    } catch (error) {
      logger.error("Service request image upload failed:", error);
      throw error;
    }
  }

  // Upload profile picture
  async uploadProfilePicture(file, userId) {
    try {
      const options = {
        folder: `snapfix/profiles/${userId}`,
        tags: ["profile_picture", userId.toString()],
        transformation: {
          quality: "auto",
          fetch_format: "auto",
          width: 400,
          height: 400,
          crop: "fill",
          gravity: "face",
        },
      };

      const result = await this.uploadImageToCloudinary(file.path, options);

      logger.info("Profile picture uploaded:", {
        userId,
        url: result.url,
      });

      return result.url;
    } catch (error) {
      logger.error("Profile picture upload failed:", error);
      throw error;
    }
  }

  // Delete image from Cloudinary
  async deleteImageFromCloudinary(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);

      logger.info("Image deleted from Cloudinary:", {
        publicId,
        result: result.result,
      });

      return result.result === "ok";
    } catch (error) {
      logger.error("Failed to delete image from Cloudinary:", error);
      return false;
    }
  }

  // Delete multiple images
  async deleteMultipleImages(publicIds) {
    try {
      const deletePromises = publicIds.map((publicId) =>
        this.deleteImageFromCloudinary(publicId),
      );

      const results = await Promise.allSettled(deletePromises);

      const successful = results.filter(
        (r) => r.status === "fulfilled" && r.value,
      ).length;
      const failed = results.length - successful;

      logger.info("Batch delete completed:", {
        successful,
        failed,
        total: publicIds.length,
      });

      return { successful, failed };
    } catch (error) {
      logger.error("Batch delete failed:", error);
      throw error;
    }
  }

  // Store file locally (fallback)
  async storeFileLocally(file, subfolder = "images") {
    try {
      const uploadsDir = path.join(process.cwd(), "uploads", subfolder);
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const extension = path.extname(file.originalname);
      const filename = file.fieldname + "-" + uniqueSuffix + extension;
      const filepath = path.join(uploadsDir, filename);

      await fs.writeFile(filepath, file.buffer);

      const baseUrl =
        process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      const fileUrl = `${baseUrl}/uploads/${subfolder}/${filename}`;

      logger.info("File stored locally:", {
        filename,
        path: filepath,
        url: fileUrl,
      });

      return {
        url: fileUrl,
        path: filepath,
        filename,
        size: file.size,
      };
    } catch (error) {
      logger.error("Local file storage failed:", error);
      throw new AppError("Failed to store file", 500);
    }
  }

  // Delete local file
  async deleteLocalFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.debug("Local file deleted:", filePath);
    } catch (error) {
      logger.error("Failed to delete local file:", error);
    }
  }

  // Clean up old temporary files
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) {
    // 24 hours
    try {
      const tempDir = path.join(process.cwd(), "uploads", "temp");
      const files = await fs.readdir(tempDir);

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (Date.now() - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info(`Cleaned up ${deletedCount} temporary files`);
      return deletedCount;
    } catch (error) {
      logger.error("Temp file cleanup failed:", error);
      return 0;
    }
  }

  // Get file information
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const extension = path.extname(filePath).toLowerCase();

      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension,
        isImage: this.allowedImageTypes.some((type) =>
          type.includes(extension.substring(1)),
        ),
      };
    } catch (error) {
      logger.error("Failed to get file info:", error);
      return null;
    }
  }

  // Validate image dimensions
  async validateImageDimensions(
    filePath,
    minWidth = 100,
    minHeight = 100,
    maxWidth = 4000,
    maxHeight = 4000,
  ) {
    try {
      // Use sharp or similar library in production
      // For hackathon, we'll use basic validation
      const fileInfo = await this.getFileInfo(filePath);

      if (!fileInfo || !fileInfo.isImage) {
        throw new AppError("Invalid image file", 400);
      }

      // Basic size validation
      if (fileInfo.size > this.maxFileSize) {
        throw new AppError("Image file too large", 400);
      }

      return true;
    } catch (error) {
      logger.error("Image validation failed:", error);
      throw error;
    }
  }

  // Resize image (placeholder for production implementation)
  async resizeImage(filePath, options = {}) {
    // In production, use sharp or similar library
    // For hackathon, return original path
    logger.info(
      "Image resize requested (not implemented in hackathon version):",
      {
        filePath,
        options,
      },
    );

    return filePath;
  }

  // Generate thumbnail
  async generateThumbnail(filePath, width = 200, height = 200) {
    // In production, use sharp or similar library
    // For hackathon, return original URL
    logger.info(
      "Thumbnail generation requested (not implemented in hackathon version):",
      {
        filePath,
        width,
        height,
      },
    );

    return filePath;
  }

  // Get upload statistics
  async getUploadStats(startDate, endDate) {
    try {
      // This would query a database in production
      // For hackathon, return mock data
      return {
        totalUploads: 150,
        totalSize: 52428800, // 50MB
        imageUploads: 140,
        documentUploads: 10,
        failedUploads: 5,
        averageFileSize: 349525, // ~340KB
        peakUploadHour: 14, // 2 PM
        topFileTypes: [
          { type: "image/jpeg", count: 85 },
          { type: "image/png", count: 55 },
          { type: "application/pdf", count: 10 },
        ],
      };
    } catch (error) {
      logger.error("Failed to get upload stats:", error);
      throw error;
    }
  }
}

module.exports = new UploadService();
