const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("Neither MONGODB_URI nor MONGO_URI environment variable is defined");
    }

    // Connect to MongoDB using the URI from environment variables
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000, // 30s timeout for server selection on cloud hosts
      socketTimeoutMS: 45000, // Timeout for socket operations
      connectTimeoutMS: 30000, // Timeout for initial connection
    });

    logger.info("MongoDB connected successfully");
    return true;
  } catch (error) {
    logger.error("MongoDB connection failed: " + error.message, error);
    throw error;
  }
};

module.exports = {
  connectDB,
  mongoose,
};
