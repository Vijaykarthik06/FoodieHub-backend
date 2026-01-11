// backend/routes/profile.js
const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile'); // Your database model

// Get user profile by email
router.get('/:email', async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ email: req.params.email });
    if (profile) {
      res.json(profile);
    } else {
      // Create empty profile if not exists
      const newProfile = new UserProfile({ email: req.params.email });
      await newProfile.save();
      res.json(newProfile);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/:email', async (req, res) => {
  try {
    const profile = await UserProfile.findOneAndUpdate(
      { email: req.params.email },
      { $set: req.body },
      { new: true, upsert: true } // Create if doesn't exist
    );
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;