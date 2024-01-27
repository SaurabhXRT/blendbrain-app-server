const express = require("express");
const mongoose = require("mongoose");
const app = express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const User = require('./models/user');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
const db = async () => {
    const uri =
        "mongodb+srv://saurabhkumar:rVKACHYbuzYy7VMs@cluster0.n4zogin.mongodb.net/brainbulbreactnative?retryWrites=true&w=majority";
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
app.get("/", (req,res) => {
    res.send("server is working");
});


const authRoutes = require('./controllers/auth');
app.use('/auth', authRoutes);
const port = 3000;
app.listen(port, () => {
    console.log(`app is running at port number ${port}`);
});
