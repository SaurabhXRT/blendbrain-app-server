const { Server } = require('socket.io');
const Message = require("../models/message"); 
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const app = express();
const cors = require('cors');
app.use(cors());
router.use(authMiddleware);

router.post('/sendMessage', async (req, res) => {
  try {
    const { sender, receiver, text } = req.body;
    const message = new Message({
            sender: sender,
            receiver: receiver,
            content: text
        });
    await message.save();

   res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error posting message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


router.get('/messages/:otheruserId', async (req, res) => {
    try {
        const userId = req.userId;
        const otheruserId = req.params.otheruserId;
        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: otheruserId },
                { sender: otheruserId, receiver: userId }
            ]
        });
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Example endpoint to fetch latest message for each connection's user
router.get('/fetch-latest-messages', async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    //const connections = await UserConnection.find({ user: user._id });
    const connectedUsers = user.connections;
    const latestMessages = [];
    for (const connection of connectedUsers) {
      const latestMessage = await Message.findOne({ 
        $or: [
          { sender: user._id, receiver: connection._id },
          { sender: connection._id, receiver: user._id }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(1);

      latestMessages.push({ 
        userId: connection._id, 
        latestMessage: latestMessage ? latestMessage.content : null,
        timeAgo: latestMessage ? calculateTimeAgo(latestMessage.createdAt) : null
      });
    }

    res.send(latestMessages);
  } catch (error) {
    console.error('Error fetching latest messages:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});



const initSocket = (server) => {
  const io = new Server(server);
  io.on("connection", (socket) => {
    console.log("User connected");

    socket.on("sendMessage", async ({ sender, receiver, text }) => {
      try {
        const message = new Message({
          sender: sender,
          receiver: receiver,
          content: text
        });
        await message.save();
        io.to(receiver).emit("message", message);
      } catch (error) {
        console.error("Error saving message:", error.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};

module.exports = router;
