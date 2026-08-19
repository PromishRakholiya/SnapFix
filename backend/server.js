require("dotenv").config();

const http = require("http");
const socketIo = require("socket.io");
const app = require("./app");
const { connectDB } = require("./src/config/database");
const logger = require("./src/config/logger");
const { gracefulShutdown } = require("./src/middlewares/errorMiddleware");

// Socket.IO imports
const requestSocket = require("./src/socket/requestSocket");
const bcrypt = require("bcryptjs");
const User = require("./src/models/User");

// Super admin defaults
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@snapfix.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123!";
const ADMIN_NAME = process.env.ADMIN_NAME || "Super Admin";
const ADMIN_PHONE = process.env.ADMIN_PHONE || "+911234567890";

// Environment validation
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) {
  logger.error("Missing required environment variable: MONGODB_URI or MONGO_URI");
  process.exit(1);
}

const requiredEnvVars = ["JWT_SECRET", "JWT_REFRESH_SECRET"];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName],
);

if (missingEnvVars.length > 0) {
  logger.error("Missing required environment variables:", missingEnvVars);
  process.exit(1);
}

// Create HTTP server
const server = http.createServer(app);

// Better startup error reporting
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error(
      `Port ${process.env.PORT || 5000} is already in use. Please stop the process using it or change PORT in .env.`,
    );
  } else {
    logger.error("Server startup error:", err);
  }
  process.exit(1);
});

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize Socket handlers
const socketHandlers = requestSocket(io);

// Make io and socket handlers available to other modules
app.set("io", io);
app.set("socketHandlers", socketHandlers);

// Database connection with retry logic
const MAX_RETRIES = 5;
let retryCount = 0;

async function connectWithRetry() {
  try {
    await connectDB();
    await ensureSuperAdmin();
    startServer();
  } catch (error) {
    retryCount++;
    if (retryCount < MAX_RETRIES) {
      const delayMs = Math.min(1000 * Math.pow(2, retryCount - 1), 30000); // Exponential backoff, max 30s
      logger.warn(
        `Database connection failed. Retry ${retryCount}/${MAX_RETRIES} in ${delayMs}ms...`,
      );
      setTimeout(connectWithRetry, delayMs);
    } else {
      logger.error(
        "Failed to connect to database after maximum retries. Please check your MongoDB connection string and network connectivity.",
      );
      logger.error("MongoDB URI:", process.env.MONGODB_URI);
      process.exit(1);
    }
  }
}

async function ensureSuperAdmin() {
  try {
    const existing = await User.findOne({ email: ADMIN_EMAIL }).select(
      "+passwordHash",
    );
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    if (existing) {
      const update = {};
      const passwordMatches = await existing.comparePassword(ADMIN_PASSWORD);

      if (!passwordMatches) {
        update.passwordHash = hashedPassword;
      }
      if (!existing.isVerified) {
        update.isVerified = true;
      }
      if (!existing.isActive) {
        update.isActive = true;
      }
      if (existing.role !== "admin") {
        update.role = "admin";
      }

      if (Object.keys(update).length > 0) {
        await User.updateOne({ _id: existing._id }, { $set: update });
      }

      logger.info(
        `Super admin account is ready: ${ADMIN_EMAIL} (password: ${ADMIN_PASSWORD})`,
      );
    } else {
      await User.collection.insertOne({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        phone: ADMIN_PHONE,
        passwordHash: hashedPassword,
        role: "admin",
        isVerified: true,
        isActive: true,
        walletBalance: 0,
        rating: 0,
        totalReviews: 0,
        vehicles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      logger.info(
        `Created default super admin: ${ADMIN_EMAIL} (password: ${ADMIN_PASSWORD})`,
      );
    }
  } catch (error) {
    logger.error("Failed to ensure super admin account:", error);
    throw error;
  }
}

function startServer() {
  const PORT = process.env.PORT || 4000;

  server.listen(PORT, () => {
    logger.info(`🚀 SnapFix API Server running on port ${PORT}`);
    logger.info(
      `📚 API Documentation available at http://localhost:${PORT}/api-docs`,
    );
    logger.info(`🏥 Health check available at http://localhost:${PORT}/health`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);

    // Log available endpoints
    logger.info("Available endpoints:");
    logger.info("  Authentication: /api/auth");
    logger.info("  Customer APIs: /api/customer");
    logger.info("  Mechanic APIs: /api/mechanic");
    logger.info("  Admin APIs: /api/admin");
    logger.info("  Payment APIs: /api/payments");

    // Log Socket.IO status
    logger.info("🔌 Socket.IO server initialized");
    logger.info(
      "  Real-time features: Service requests, Location tracking, Status updates",
    );
  });

  // Socket.IO connection handling
  io.on("connection", (socket) => {
    logger.debug("Client connected:", socket.id);

    socket.on("disconnect", (reason) => {
      logger.debug("Client disconnected:", {
        socketId: socket.id,
        reason,
      });
    });

    socket.on("error", (error) => {
      logger.error("Socket error:", {
        socketId: socket.id,
        error: error.message,
      });
    });
  });

  // Schedule cleanup tasks
  setInterval(
    async () => {
      try {
        // Clean up expired OTPs
        const OTP = require("./src/models/OTP");
        const cleanedOTPs = await OTP.cleanup();
        if (cleanedOTPs > 0) {
          logger.info(`Cleaned up ${cleanedOTPs} expired OTPs`);
        }

        // Clean up old upload files
        const uploadService = require("./src/services/uploadService");
        const cleanedFiles = await uploadService.cleanupTempFiles();
        if (cleanedFiles > 0) {
          logger.info(`Cleaned up ${cleanedFiles} temporary files`);
        }

        // Clean up old export files
        const csvExportService = require("./src/utils/csvExport");
        const cleanedExports = await csvExportService.cleanupOldExports();
        if (cleanedExports > 0) {
          logger.info(`Cleaned up ${cleanedExports} old export files`);
        }
      } catch (error) {
        logger.error("Cleanup task failed:", error);
      }
    },
    60 * 60 * 1000,
  ); // Run every hour

  // Setup graceful shutdown handlers
  gracefulShutdown(server, io);
}

// Start connection attempt
connectWithRetry();

// Export server for testing
module.exports = server;
