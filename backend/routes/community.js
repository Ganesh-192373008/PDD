const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const CommunityMessage = require('../models/CommunityMessage');

// @route   GET api/community
// @desc    Get latest 50 community messages
router.get('/', protect, async (req, res) => {
  try {
    const messages = await CommunityMessage.find()
      .sort({ createdAt: -1 })
      .limit(50);
    // Return in chronological order (oldest to newest) for chat layout
    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching community messages:', error);
    res.status(500).json({ message: 'Server error retrieving messages.' });
  }
});

// @route   POST api/community
// @desc    Post a new community message
router.post('/', protect, async (req, res) => {
  try {
    const { content, category, imageUrl } = req.body;
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Message content cannot be empty.' });
    }

    const newMessage = new CommunityMessage({
      userId: req.user._id,
      userName: req.user.name || 'Anonymous Farmer',
      userLocation: req.user.location?.address || 'Global',
      content: content.trim(),
      category: category || 'General',
      imageUrl: imageUrl || ''
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error sending community message:', error);
    res.status(500).json({ message: 'Server error sending message.' });
  }
});

// @route   PUT api/community/:id
// @desc    Edit a community message
router.put('/:id', protect, async (req, res) => {
  try {
    const post = await CommunityMessage.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to edit this post.' });
    }

    const { content, category, imageUrl } = req.body;
    post.content = content !== undefined ? content.trim() : post.content;
    post.category = category !== undefined ? category : post.category;
    post.imageUrl = imageUrl !== undefined ? imageUrl : post.imageUrl;

    await post.save();
    res.json(post);
  } catch (error) {
    console.error('Error updating community message:', error);
    res.status(500).json({ message: 'Server error updating message.' });
  }
});

// @route   DELETE api/community/:id
// @desc    Delete a community message
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await CommunityMessage.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this post.' });
    }

    await post.deleteOne();
    res.json({ message: 'Post deleted successfully.' });
  } catch (error) {
    console.error('Error deleting community message:', error);
    res.status(500).json({ message: 'Server error deleting message.' });
  }
});

// @route   POST api/community/:id/like
// @desc    Toggle like on a community message
router.post('/:id/like', protect, async (req, res) => {
  try {
    const message = await CommunityMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    const likeIndex = message.likes.indexOf(req.user._id);
    if (likeIndex > -1) {
      // User already liked it, remove the like
      message.likes.splice(likeIndex, 1);
    } else {
      // Add the like
      message.likes.push(req.user._id);
    }

    await message.save();
    res.json(message);
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ message: 'Server error processing like.' });
  }
});

// @route   POST api/community/:id/reply
// @desc    Reply to a community message
router.post('/:id/reply', protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Reply content cannot be empty.' });
    }

    const message = await CommunityMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    message.replies.push({
      userId: req.user._id,
      userName: req.user.name || 'Anonymous Farmer',
      userLocation: req.user.location?.address || 'Global',
      content: content.trim()
    });

    await message.save();
    res.status(201).json(message);
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ message: 'Server error adding reply.' });
  }
});

// @route   POST api/community/:id/share
// @desc    Increment share counter on a community message
router.post('/:id/share', protect, async (req, res) => {
  try {
    const message = await CommunityMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    message.shares = (message.shares || 0) + 1;
    await message.save();
    res.json(message);
  } catch (error) {
    console.error('Error incrementing share count:', error);
    res.status(500).json({ message: 'Server error sharing post.' });
  }
});

const mongoose = require('mongoose');

// Seed community posts if the collection is empty, matching user's exact mockup screenshots
const seedCommunityIfEmpty = async () => {
  try {
    const count = await CommunityMessage.countDocuments();
    if (count === 0) {
      const mockUserIds = Array.from({ length: 100 }, () => new mongoose.Types.ObjectId());
      
      const seedData = [
        {
          userId: new mongoose.Types.ObjectId(),
          userName: 'Lakshmi Reddy',
          userLocation: 'Telangana',
          content: 'Sharing my experience with drip irrigation. Water usage reduced by 40% and crop quality improved. Highly recommended! 💧',
          likes: mockUserIds.slice(0, 92),
          shares: 5,
          replies: [
            {
              userId: new mongoose.Types.ObjectId(),
              userName: 'Anil Kumar',
              userLocation: 'Andhra Pradesh',
              content: 'Wow, that is amazing Lakshmi! Which drip system are you using?',
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000)
            }
          ],
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          userId: new mongoose.Types.ObjectId(),
          userName: 'Kumar Singh',
          userLocation: 'Punjab',
          content: 'Great news! Cotton prices up 15% this week in our region. Good time to sell! 📈',
          likes: mockUserIds.slice(0, 67),
          shares: 2,
          replies: [
            {
              userId: new mongoose.Types.ObjectId(),
              userName: 'Gurpreet Singh',
              userLocation: 'Punjab',
              content: 'Indeed, prices are very favorable at the Bathinda market today.',
              createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000)
            }
          ],
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          userId: new mongoose.Types.ObjectId(),
          userName: 'Sunita Devi',
          userLocation: 'Gujarat',
          content: 'Any tips for organic pest control on chili crops? Looking for chemical-free solutions. 🌶️',
          likes: mockUserIds.slice(0, 28),
          shares: 1,
          replies: [
            {
              userId: new mongoose.Types.ObjectId(),
              userName: 'Ramesh Patil',
              userLocation: 'Maharashtra',
              content: 'Try spraying neem oil mixed with mild liquid soap. It works wonders for whiteflies.',
              createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000 + 15 * 60 * 1000)
            },
            {
              userId: new mongoose.Types.ObjectId(),
              userName: 'Amit Patel',
              userLocation: 'Gujarat',
              content: 'Also try yellow sticky traps, they help monitor and reduce the pest population.',
              createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000 + 45 * 60 * 1000)
            }
          ],
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
        },
        {
          userId: new mongoose.Types.ObjectId(),
          userName: 'Ramesh Patil',
          userLocation: 'Maharashtra',
          content: 'Successfully treated late blight on my tomato farm using the recommendations from AgroAssist AI. Yield improved by 30%! 🍅',
          likes: [],
          shares: 0,
          replies: [],
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        }
      ];

      await CommunityMessage.insertMany(seedData);
      console.log('Community Forum seed posts initialized successfully.');
    }
  } catch (err) {
    console.error('Error seeding community messages:', err);
  }
};

seedCommunityIfEmpty();

module.exports = router;
