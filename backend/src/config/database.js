const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
  try {
    // Connect to MongoDB using the URI from environment variables
    // Set serverSelectionTimeoutMS to 10 seconds and socketTimeoutMS to 15 seconds
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Timeout for server selection
      socketTimeoutMS: 15000, // Timeout for socket operations
      connectTimeoutMS: 10000, // Timeout for connection
    });

    logger.info("MongoDB connected successfully");
    return true;
  } catch (error) {
    logger.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

module.exports = {
  connectDB,
  mongoose,
};
