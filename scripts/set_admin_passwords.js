const mongoose = require('../backend/node_modules/mongoose');
const bcrypt = require('../backend/node_modules/bcryptjs');

mongoose.connect('mongodb://127.0.0.1:27017/donchat').then(async () => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);

  const res = await mongoose.connection.db.collection('users').updateMany(
    { email: { $in: ['testalex@gmail.com', 'admin@donchat.com', 'davedon008@gmail.com'] } },
    { $set: { role: 'admin', password: hashedPassword } }
  );

  console.log('✓ Updated admin accounts in database. Modified count:', res.modifiedCount);
  process.exit(0);
});
