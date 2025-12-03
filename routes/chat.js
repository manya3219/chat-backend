const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');

router.post('/', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    
    let chat = await Chat.findOne({
      isGroupChat: false,
      users: { $all: [req.user._id, userId] }
    }).populate('users', '-password').populate('latestMessage');
    
    if (chat) {
      return res.json(chat);
    }
    
    chat = await Chat.create({
      chatName: 'sender',
      isGroupChat: false,
      users: [req.user._id, userId]
    });
    
    const fullChat = await Chat.findById(chat._id).populate('users', '-password');
    res.status(201).json(fullChat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({ users: req.user._id })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });
    
    res.json(chats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/group', auth, async (req, res) => {
  try {
    const { name, users } = req.body;
    
    if (users.length < 2) {
      return res.status(400).json({ error: 'Group must have at least 2 users' });
    }
    
    users.push(req.user._id);
    
    const groupChat = await Chat.create({
      chatName: name,
      users,
      isGroupChat: true,
      groupAdmin: req.user._id
    });
    
    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate('users', '-password')
      .populate('groupAdmin', '-password');
    
    res.status(201).json(fullGroupChat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
