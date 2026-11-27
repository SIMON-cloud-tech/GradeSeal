// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true, // bcrypt hash, never plain text
  },
  role: {
    type: String,
    enum: ['ceo', 'qa', 'operator', 'buyer'],
    default: 'operator',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);