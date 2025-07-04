const mongoose=require('mongoose')
const Admin = require("./models/Admin"); // ← ضيفيه في أول الملف

async function createAdmin() {
  try {
    await mongoose.connect('mongodb://localhost:27017/realState');
    console.log('✅ Connected to MongoDB');

    const existingAdmin = await Admin.findOne({ email: 'admin@gmail.com' });
    if (existingAdmin) {
      console.log('⚠️ Admin already exists.');
    } else {
      const newAdmin = new Admin({
        name: 'Super Admin',
        email: 'admin@gmail.com',
        password: 'Admin123!' // ← هتتشفر تلقائيًا
      });

      await newAdmin.save();
      console.log('✅ Admin created successfully.');
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

module.exports=createAdmin