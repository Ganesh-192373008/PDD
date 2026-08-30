const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ScanHistory = require('../models/ScanHistory');
const WaterSchedule = require('../models/WaterSchedule');
const FertilizerSchedule = require('../models/FertilizerSchedule');
const CommunityMessage = require('../models/CommunityMessage');

// @route   GET api/history
// @desc    Get user's complete action/scan history
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch scans
    const scans = await ScanHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    // Fetch other activities
    const waterSchedules = await WaterSchedule.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    const fertilizerSchedules = await FertilizerSchedule.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    const communityPosts = await CommunityMessage.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    // Build Activity Log list
    const activities = [];

    waterSchedules.forEach(item => {
      activities.push({
        type: 'water',
        title: 'Created Irrigation Schedule',
        description: `Set up a water plan for ${item.crop || 'Crop'} (${item.irrigationType || 'Drip'}).`,
        createdAt: item.createdAt || item.updatedAt
      });
    });

    fertilizerSchedules.forEach(item => {
      activities.push({
        type: 'fertilizer',
        title: 'Created Fertilizer Calendar',
        description: `Set up a fertilizer cycle for ${item.crop || 'Crop'} (${item.fertilizerType || 'Organic'}).`,
        createdAt: item.createdAt || item.updatedAt
      });
    });

    communityPosts.forEach(item => {
      activities.push({
        type: 'community',
        title: 'Posted to Farmer Forum',
        description: `Shared a community topic: "${item.content && item.content.length > 60 ? item.content.substring(0, 60) + '...' : item.content}"`,
        createdAt: item.createdAt
      });
    });

    // Sort activities by newest first
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      scans,
      activities: activities.slice(0, 50) // limit to top 50 activities
    });

  } catch (error) {
    console.error('Error fetching complete history:', error);
    res.status(500).json({ message: 'Server error retrieving activity logs.' });
  }
});

// @route   GET api/history/scans/:id
// @desc    Get a specific scan from history
router.get('/scans/:id', protect, async (req, res) => {
  try {
    const scan = await ScanHistory.findById(req.params.id);
    if (!scan) {
      return res.status(404).json({ message: 'Scan record not found.' });
    }
    if (scan.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to view this record.' });
    }
    res.json(scan);
  } catch (error) {
    console.error('Error fetching scan details:', error);
    res.status(500).json({ message: 'Server error retrieving scan details.' });
  }
});

// @route   DELETE api/history/scans/:id
// @desc    Delete a specific scan from history
router.delete('/scans/:id', protect, async (req, res) => {
  try {
    const scan = await ScanHistory.findById(req.params.id);
    if (!scan) {
      return res.status(404).json({ message: 'Scan record not found.' });
    }
    if (scan.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this record.' });
    }
    await scan.deleteOne();
    res.json({ message: 'Scan deleted from history.' });
  } catch (error) {
    console.error('Error deleting scan history:', error);
    res.status(500).json({ message: 'Server error deleting scan record.' });
  }
});

module.exports = router;
