require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const OTP = mongoose.model('OTP', new mongoose.Schema({}, { strict: false }));

  console.log('\n--- VERIFIED USERS ---');
  const users = await User.find({}, 'name email role isVerified isActive');
  users.forEach(u => {
    console.log(`- ${u.get('name')} | ${u.get('email')} | Role: ${u.get('role')} | Verified: ${u.get('isVerified')} | Active: ${u.get('isActive')}`);
  });

  console.log('\n--- ACTIVE OTPs ---');
  const otps = await OTP.find({ isUsed: false }).sort({ createdAt: -1 }).limit(5);
  otps.forEach(o => {
    console.log(`- Email: ${o.get('email')} | Code: ${o.get('code')} | Purpose: ${o.get('purpose')} | Created: ${o.get('createdAt')}`);
  });

  await mongoose.disconnect();
  console.log('\nDisconnected.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
