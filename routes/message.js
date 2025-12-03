const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

router.post('/', auth, async (req, res) => {
  try {
    const { content, chatId } = req.body;
    
    const message = await Message.create({
      sender: req.user._id,
      content,
      chat: chatId,
      readBy: [] // Initialize empty readBy array
    });
    
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });
    
    const fullMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar')
      .populate('readBy.user', 'username')
      .populate({
        path: 'chat',
        populate: {
          path: 'users',
          select: 'username email avatar'
        }
      });
    
    res.status(201).json(fullMessage);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:chatId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ 
      chat: req.params.chatId,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    })
      .populate('sender', 'username avatar')
      .populate('readBy.user', 'username')
      .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark messages as read
router.put('/read/:chatId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      chat: req.params.chatId,
      sender: { $ne: req.user._id }
    });

    for (let message of messages) {
      // Initialize readBy if it doesn't exist
      if (!message.readBy) {
        message.readBy = [];
      }
      
      // Check if user already read this message
      const alreadyRead = message.readBy.some(
        r => r.user && r.user.toString() === req.user._id.toString()
      );
      
      if (!alreadyRead) {
        message.readBy.push({
          user: req.user._id,
          readAt: new Date()
        });
        await message.save();
      }
    }

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(200).json({ message: 'OK' }); // Don't fail, just continue
  }
});

// Clear chat (delete all messages for user)
router.delete('/clear/:chatId', auth, async (req, res) => {
  try {
    await Message.updateMany(
      { chat: req.params.chatId },
      { isDeleted: true }
    );
    
    res.json({ message: 'Chat cleared successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
