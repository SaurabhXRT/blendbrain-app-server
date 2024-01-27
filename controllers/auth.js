// controllers/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const app = express();
const bodyParser = require("body-parser")
app.use(bodyParser.urlencoded({ extended: true }));
const SecretKey = "2809a95eedde5863d8e8e3bea5205cd62d290b10a3769afee677b8754a4d05b7";

router.post("/login", async (req, res) => {
    const  mobileNumber  = req.body.mobileNumber;

    try {
        const existinguser = await User.findOne({ mobileNumber });
        if (!existinguser) {
            const user = new User(mobileNumber);
            await user.save();
            const token = jwt.sign({ id: user._id }, SecretKey, { expiresIn: '7d' });
            res.json({ token });
        } else {
            existinguser.mobileNumber = mobileNumber;
            await  existinguser.save();
            const token = jwt.sign({ id:  existinguser._id }, SecretKey, { expiresIn: '7d' });
            res.json({ token });
        }
    
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;

