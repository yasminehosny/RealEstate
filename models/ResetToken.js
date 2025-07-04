//ResetToken.js
const mongoose = require("mongoose");

const resetTokenSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

module.exports = mongoose.model("ResetToken", resetTokenSchema);