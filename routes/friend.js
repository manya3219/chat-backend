const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Send friend request
router.post('/request/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot send request to yourself' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already friends
    if (req.user.friends.includes(userId)) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Check if request already sent
    if (req.user.sentRequests.includes(userId)) {
      return res.status(400).json({ error: 'Request already sent' });
    }

    // Check if already received request from this user
    const existingRequest = targetUser.friendRequests.find(
      req => req.from.toString() === req.user._id.toString()
    );
    if (existingRequest) {
      return res.status(400).json({ error: 'Request already sent' });
    }

    // Add to sent requests
    req.user.sentRequests.push(userId);
    await req.user.save();

    // Add to target user's friend requests
    targetUser.friendRequests.push({ from: req.user._id });
    await targetUser.save();

    res.json({ message: 'Friend request sent' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Accept friend request
router.post('/accept/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the request
    const requestIndex = req.user.friendRequests.findIndex(
      req => req.from.toString() === userId
    );

    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Remove from friend requests
    req.user.friendRequests.splice(requestIndex, 1);
    
    // Add to friends
    req.user.friends.push(userId);
    await req.user.save();

    // Update sender's data
    const sender = await User.findById(userId);
    sender.sentRequests = sender.sentRequests.filter(
      id => id.toString() !== req.user._id.toString()
    );
    sender.friends.push(req.user._id);
    await sender.save();

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Reject friend request
router.post('/reject/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const requestIndex = req.user.friendRequests.findIndex(
      req => req.from.toString() === userId
    );

    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    req.user.friendRequests.splice(requestIndex, 1);
    await req.user.save();

    // Remove from sender's sent requests
    const sender = await User.findById(userId);
    sender.sentRequests = sender.sentRequests.filter(
      id => id.toString() !== req.user._id.toString()
    );
    await sender.save();

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get friend requests
router.get('/requests', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friendRequests.from', 'username email avatar isOnline');
    
    res.json(user.friendRequests);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get friends list
router.get('/list', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'username email avatar isOnline lastSeen');
    
    res.json(user.friends);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
