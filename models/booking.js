//booking model
const mongoose = require('mongoose');

// تعريف الـ Schema الخاص بالحجز
const bookingSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // تحديد الـ User الذي قام بالحجز
    required: true
  },
  propertyID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property', // تحديد العقار الذي تم الحجز له
    required: true
  },
  datetime: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// إنشاء الموديل باستخدام الـ Schema
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;  // تصدير الموديل
