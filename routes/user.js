const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

router.get('/', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('-password')
      .sort({ username: 1 });
    
    // Add relationship status to each user
    const usersWithStatus = users.map(user => {
      const userObj = user.toObject();
      userObj.isFriend = currentUser.friends.some(f => f.toString() === user._id.toString());
      userObj.requestSent = currentUser.sentRequests.some(r => r.toString() === user._id.toString());
      userObj.requestReceived = currentUser.friendRequests.some(r => r.from.toString() === user._id.toString());
      return userObj;
    });
    
    res.json(usersWithStatus);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/online', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const users = await User.find({ 
      _id: { $in: currentUser.friends },
      isOnline: true 
    }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
