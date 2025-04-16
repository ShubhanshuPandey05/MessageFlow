const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  sessionPath: { type: String }
});

const User = mongoose.model('User', userSchema);
module.exports = User;