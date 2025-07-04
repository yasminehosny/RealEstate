// models/category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true }, // رابط الصورة
    category_id: { type: String, required: true } // معرف الكاتيجوري
});

module.exports = mongoose.model('Category', categorySchema);
