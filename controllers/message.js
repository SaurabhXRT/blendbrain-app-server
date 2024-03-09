const { Server } = require('socket.io');
const Message = require("../models/message"); 

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

module.exports = { initSocket };
