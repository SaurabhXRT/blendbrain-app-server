// app.js
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const socketIo = require("socket.io");
const Message = require("../models/Message");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

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
      console.error("Error saving message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
