const socketIo = require("socket.io");
const Message = require("../models/message"); 

let io;

// Initialize WebSocket server
const initSocket = (server) => {
  io = socketIo(server);
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
};

module.exports = { initSocket };
