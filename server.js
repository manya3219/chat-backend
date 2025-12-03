require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/user'));
app.use('/api/chats', require('./routes/chat'));
app.use('/api/messages', require('./routes/message'));
app.use('/api/friends', require('./routes/friend'));

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('setup', async (userId) => {
    socket.userId = userId;
    socket.join(userId);
    onlineUsers.set(userId, socket.id);
    
    await User.findByIdAndUpdate(userId, { isOnline: true });
    io.emit('user-online', userId);
  });
  
  socket.on('friend-request-sent', (data) => {
    socket.to(data.to).emit('friend-request-received', data);
  });
  
  socket.on('friend-request-accepted', (data) => {
    socket.to(data.to).emit('friend-request-accepted-notification', data);
  });
  
  socket.on('join-chat', (room) => {
    socket.join(room);
  });
  
  socket.on('typing', (room) => {
    socket.to(room).emit('typing', room);
  });
  
  socket.on('stop-typing', (room) => {
    socket.to(room).emit('stop-typing', room);
  });
  
  socket.on('messages-read', (data) => {
    console.log('📖 Messages marked as read:', data);
    socket.to(data.chatId).emit('messages-read-update', {
      chatId: data.chatId,
      userId: data.userId
    });
  });
  
  socket.on('new-message', (message) => {
    console.log('📨 Server received new message:', {
      sender: message.sender?.username,
      content: message.content,
      chatId: message.chat?._id
    });
    
    const chat = message.chat;
    
    if (!chat || !chat.users) {
      console.log('❌ Chat or users not found in message');
      return;
    }
    
    console.log('👥 Broadcasting to users:', chat.users.map(u => u.username || u._id));
    
    // Emit to all users in the chat except sender
    chat.users.forEach(user => {
      if (user._id === message.sender._id) return;
      
      console.log('📤 Emitting to user:', user._id);
      socket.to(user._id).emit('message-received', message);
    });
    
    // Also broadcast to update chat list for all participants
    chat.users.forEach(user => {
      socket.to(user._id).emit('chat-updated', message.chat);
    });
  });
  
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      await User.findByIdAndUpdate(socket.userId, { 
        isOnline: false,
        lastSeen: new Date()
      });
      io.emit('user-offline', socket.userId);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
