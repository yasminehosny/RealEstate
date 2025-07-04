//property model
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const propertySchema = new Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // عشان نقدر نعمل populate لو حبينا
    required: true
  },
  category_name: String,
  address: String,
  price: Number,
  status: String,
  images: [String],
  area: Number,
  number_of_rooms: Number,
  number_of_bathroom: Number,
  description: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 90 //  3 شهور بالثواني
  }
});

const Property = mongoose.model("Property", propertySchema);

module.exports = Property;
