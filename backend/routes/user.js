const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET api/user/me
// @desc    Get current user profile
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// @route   PUT api/user/profile
// @desc    Update user profile details
router.put('/profile', protect, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      location,
      preferredLanguage,
      crops,
      farmingExperience,
      landArea,
      profileImage,
      notificationPreferences
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Update basic info
    if (name) user.name = name;
    
    // Check duplicates if updating email
    if (email && email.toLowerCase() !== user.email?.toLowerCase()) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ message: 'Account with this email already exists.' });
      }
      user.email = email.toLowerCase();
    }

    // Check duplicates if updating phone
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone !== user.phone) {
        const phoneExists = await User.findOne({ phone: cleanPhone });
        if (phoneExists) {
          return res.status(400).json({ message: 'Account with this phone number already exists.' });
        }
        user.phone = cleanPhone;
      }
    }

    // Update locations
    if (location) {
      user.location = {
        lat: location.lat !== undefined ? parseFloat(location.lat) : user.location?.lat,
        lng: location.lng !== undefined ? parseFloat(location.lng) : user.location?.lng,
        address: location.address !== undefined ? location.address : user.location?.address,
        state: location.state !== undefined ? location.state : user.location?.state,
        district: location.district !== undefined ? location.district : user.location?.district,
      };
    }

    // Update settings and arrays
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;
    if (crops && Array.isArray(crops)) user.crops = crops;
    if (farmingExperience !== undefined) user.farmingExperience = parseInt(farmingExperience) || 0;
    if (landArea !== undefined) user.landArea = parseFloat(landArea) || 0;
    if (profileImage !== undefined) user.profileImage = profileImage;
    
    if (notificationPreferences) {
      user.notificationPreferences = {
        weather: notificationPreferences.weather !== undefined ? !!notificationPreferences.weather : user.notificationPreferences.weather,
        market: notificationPreferences.market !== undefined ? !!notificationPreferences.market : user.notificationPreferences.market,
        schemes: notificationPreferences.schemes !== undefined ? !!notificationPreferences.schemes : user.notificationPreferences.schemes,
        schedule: notificationPreferences.schedule !== undefined ? !!notificationPreferences.schedule : user.notificationPreferences.schedule,
      };
    }

    await user.save();
    
    // Return updated user (excluding password)
    const updatedUser = await User.findById(user._id).select('-password');
    res.json(updatedUser);

  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error updating user profile.' });
  }
});

module.exports = router;
