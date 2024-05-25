const express = require("express");
const mongoose = require("mongoose");
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const app = express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const User = require('./models/user');
const Message = require("./models/message"); 
const server = createServer(app);
const io = new Server(server);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
const db = async () => {
    const uri = process.env.MONGODB_URI;
    try {
        mongoose.set("strictQuery", false);
        mongoose.connect(uri);
        const db = mongoose.connection;
        db.on("error", console.error.bind(console, "connection error:"));
        db.once("open", () => {
            console.log("Connected to MongoDB...");
        });
    } catch (error) {
        console.log(error);
    }
}
db();

io.on('connection', (socket) => {
  console.log('a user connected');
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

app.get("/", (req,res) => {
    res.send("server is working");
});
const chatRoutes = require('./controllers/message');
app.use('/chat', chatRoutes);

const userRoutes = require('./controllers/user');
app.use('/user', userRoutes);

const authRoutes = require('./controllers/auth');
app.use('/auth', authRoutes);

const otheruserRoutes = require('./controllers/otheruser');
app.use('/otheruser', otheruserRoutes);

const documentRoutes = require('./controllers/documents');
app.use('/document', documentRoutes);

const port = 3000;
app.listen(port, () => {
    console.log(`app is running at port number ${port}`);
});
