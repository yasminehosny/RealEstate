const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: String,
  email: String,
  password: String,
  phone: String,
  address: String,
  nationalID: String,
  image: String,
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }]
}, { timestamps: true }); // ✅ أضفنا دي هنا

const User = mongoose.model("User", userSchema);
module.exports = User;
