const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// Seed notifications helper
const seedUserNotifications = async (userId) => {
  const count = await Notification.countDocuments({ userId });
  if (count > 0) return;

  const seeds = [
    {
      userId,
      title: 'Weather Update',
      message: 'Heavy rain expected in Pune district over the next 2 days. Ensure proper drainage in your fields.',
      category: 'Weather Alerts',
    },
    {
      userId,
      title: 'Market Price Increase',
      message: 'Tomato prices at Gultekdi APMC have increased to ₹18.50/kg. Good time to harvest and sell.',
      category: 'Market Price Changes',
    },
    {
      userId,
      title: 'New Seed Subsidy Scheme',
      message: 'Government announced 50% subsidy on high-yielding Wheat seed distribution. Check eligibility now.',
      category: 'Government Schemes',
    },
    {
      userId,
      title: 'Pest Advisory Alert',
      message: 'Mealybug infestations reported in nearby cotton fields. Monitor crops daily and apply organic neem spray.',
      category: 'AI/System Notifications',
    }
  ];

  await Notification.insertMany(seeds);
};

// @route   GET api/notifications
// @desc    Get user notifications (user-specific + global announcements)
router.get('/', protect, async (req, res) => {
  try {
    // Seed initial notifications for user if empty
    await seedUserNotifications(req.user._id);

    const notifications = await Notification.find({
      $or: [
        { userId: req.user._id },
        { userId: null } // Global notifications
      ]
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error retrieving notifications.' });
  }
});

// @route   GET api/notifications/unread-count
// @desc    Get unread notifications count
router.get('/unread-count', protect, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      $or: [
        { userId: req.user._id },
        { userId: null }
      ],
      read: false
    });
    res.json({ count: unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Error counting unread notifications.' });
  }
});

// @route   PUT api/notifications/:id/read
// @desc    Mark single notification as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    // Verify ownership if not global
    if (notification.userId && notification.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized.' });
    }

    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification status.' });
  }
});

// @route   PUT api/notifications/mark-all-read
// @desc    Mark all user notifications as read
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        $or: [
          { userId: req.user._id },
          { userId: null }
        ],
        read: false
      },
      { $set: { read: true } }
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications status.' });
  }
});

// @route   DELETE api/notifications/:id
// @desc    Delete single notification
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    // Verify ownership
    if (notification.userId && notification.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized.' });
    }

    await notification.deleteOne();
    res.json({ message: 'Notification deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification.' });
  }
});

// @route   POST api/notifications
// @desc    Create a new notification for user
router.post('/', protect, async (req, res) => {
  try {
    const { title, message, category } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required.' });
    }

    const notification = await Notification.create({
      userId: req.user._id,
      title,
      message,
      category: category || 'General Alert',
      read: false
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Server error creating notification.' });
  }
});

// @route   DELETE api/notifications
// @desc    Clear all user notifications
router.delete('/', protect, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.json({ message: 'Notification history cleared successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing notification history.' });
  }
});

module.exports = router;
