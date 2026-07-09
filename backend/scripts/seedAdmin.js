// scripts/seedAdmin.js
// Run once: node scripts/seedAdmin.js
// Creates the first admin account in the database.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose  = require('mongoose');
const AdminUser = require('../models/AdminUser');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const existing = await AdminUser.findOne({ username: 'superadmin' });
  if (existing) {
    console.log('Admin "superadmin" already exists. Exiting.');
    process.exit(0);
  }

  const passwordHash = await AdminUser.hashPassword('Admin@1234');

  await AdminUser.create({
    username:     'superadmin',
    email:        process.env.ADMIN_EMAIL || 'admin@printmixbox.io',
    passwordHash,
    role:         'superadmin',
  });

  console.log('✅  Admin account created:');
  console.log('    Username : superadmin');
  console.log('    Password : Admin@1234');
  console.log('    → Change this password immediately after first login!');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });