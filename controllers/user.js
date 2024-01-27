const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const cloudinary = require("cloudinary").v2;
const User = require('../models/user');
const Post = require('../models/userpost');
const app = express();
const cors = require('cors');
app.use(cors());

cloudinary.config({
  cloud_name: "dar4ws6v6",
  api_key: "131471632671278",
  api_secret: "d0UW2ogmMnEEMcNVcDpzG33HKkY",
});

const multer = require('multer');

const storage = multer.diskStorage({});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb('invalid image file!', false);
  }
};
const uploads = multer({ storage, fileFilter });



router.use(authMiddleware);

router.get('/fetch-user', async (req, res) => {
  try {
    const userId = req.userId; 
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      mobileNumber: user.mobileNumber, 
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/posts',uploads.single('image'), async (req, res) => {
  try {
    const text = req.body.text;
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const createdBy = userId;
    let image;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      image = result.secure_url;
    }

    const post = new Post({
      text,
      image,
      createdBy 
    });
    await post.save();
    await user.posts.push(post._id);
    await user.save();

    res.json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get("/posts", async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found.");
    }
    const connectedUsers = user.connections;
    const feedPosts = await Post.find({ createdBy: { $in: connectedUsers } })
      .sort({ createdAt: -1 })
      .populate("createdBy");

    const userPosts = await Post.find({  createdBy: user._id })
      .sort({ createdAt: -1 })
      .populate("createdBy");
    const combinedFeed = [...feedPosts, ...userPosts].map((post) => ({
      ...post.toObject(),
    }));
    combinedFeed.sort((a, b) => b.createdAt - a.createdAt);
    res.json(combinedFeed);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});


module.exports = router;
