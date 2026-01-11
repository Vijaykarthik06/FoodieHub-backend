// backend/models/UserProfile.js
const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: String,
  phone: String,
  address: String,
  city: String,
  zipCode: String,
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    specialOffers: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserProfile', userProfileSchema);