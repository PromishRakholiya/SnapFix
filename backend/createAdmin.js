/**
 * Super Admin Seed Script
 * Creates/resets the super admin account: admin@snapfix.com
 * Default Password: Admin123!
 * Run: node createAdmin.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@snapfix.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123!";
const ADMIN_NAME = process.env.ADMIN_NAME || "Super Admin";
const ADMIN_PHONE = process.env.ADMIN_PHONE || "+911234567890";

async function main() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB:", mongoose.connection.host);

  // Require the User model AFTER connecting
  const User = require("./src/models/User");

  // Check if admin already exists
  const existing = await User.findOne({ email: ADMIN_EMAIL });

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

  if (existing) {
    console.log(
      "♻️  Admin user already exists — updating password & marking verified...",
    );
    existing.passwordHash = hashedPassword;
    existing.isVerified = true;
    existing.isActive = true;
    existing.role = "admin";
    // Bypass the pre-save hash hook (password already hashed)
    await existing.save({ validateBeforeSave: false });
    // The pre-save hook will re-hash — so we need to update directly
    await User.updateOne(
      { email: ADMIN_EMAIL },
      {
        $set: {
          passwordHash: hashedPassword,
          isVerified: true,
          isActive: true,
          role: "admin",
        },
      },
    );
    console.log("✅ Admin updated successfully!");
  } else {
    console.log("🆕 Creating new super admin user...");
    // Insert directly to bypass double-hashing from the pre-save hook
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
    console.log("✅ Super admin created successfully!");
  }

  console.log("\n📋 Credentials:");
  console.log("   Email   :", ADMIN_EMAIL);
  console.log("   Password:", ADMIN_PASSWORD);
  console.log("   Role    : admin");
  console.log("   Verified: true");

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected. Done!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
