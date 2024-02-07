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
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/fetch-non-connected-user', async (req, res) => {
  try {
    const userId = req.userId; 
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
     const connectedUsers = user.connections;
     const excludedUserIds = connectedUsers.concat(
      user._id,
      user.pendingConnections,
      user.sentConnections
    );

     const nonConnectedUsers = await User.find({
      _id: {
        $nin: excludedUserIds,
      }
    }).sort({ createdAt: -1 });
    console.log(nonConnectedUsers);
    res.json(nonConnectedUsers);
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

router.get("/profile/posts", async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found.");
    }
  
    const Posts = await Post.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .populate("createdBy");
    res.json(Posts);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

router.post('/comment/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.userId;
    const { text } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = {
      text,
      createdBy: userId,
    };

    post.comments.push(comment);
    await post.save();

    res.json({ message: 'Comment added successfully' });
  } catch (error) {
    console.error('Error commenting on post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/like/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const alreadyLikedIndex = post.likes.findIndex((id) => id.equals(userId));

    if (alreadyLikedIndex !== -1) {
      post.likes.splice(alreadyLikedIndex, 1);
    } else {
      post.likes.push(userId);
    }

    await post.save();

    res.json({ message: 'Post like updated successfully' });
  } catch (error) {
    console.error('Error updating post like:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// router.get('/comments/:postId', async (req, res) => {
//   try {
//     const postId = req.params.postId;

//     const post = await Post.findById(postId).populate({
//       path: 'comments.createdBy',
//       select: 'username profileImage',
//     });

//     if (!post) {
//       return res.status(404).json({ error: 'Post not found' });
//     }

//     const comments = post.comments.map((comment) => ({
//       text: comment.text,
//       createdBy: {
//         username: comment.createdBy.username,
//         profileImage: comment.createdBy.profileImage,
//       },
//       createdAt: comment.createdAt,
//     }));

//     res.json(comments);
//   } catch (error) {
//     console.error('Error fetching comments:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

router.get('/comments/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;

    const post = await Post.findById(postId).populate({
      path: 'comments.createdBy',
      select: 'username profileImage',
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    post.comments.sort((a, b) => b.createdAt - a.createdAt);
    const comments = post.comments.map((comment) => ({
      text: comment.text,
      createdBy: {
        username: comment.createdBy.username,
        profileImage: comment.createdBy.profileImage,
      },
      createdAt: comment.createdAt,
    }));

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post("/connect/:userId", async (req, res) => {
  try {
    const userId = req.userId;
    const currentUser = await User.findById(userId);
    const userIdToConnect = req.params.userId; 
    const userToConnect = await User.findById(userIdToConnect);
    if (!userToConnect) {
      return res.status(404).json({ message: "User not found." });
    }
    if (currentUser.connections.includes(userIdToConnect)) {
      return res.json({ message: "Already connected." });
    }
    if (currentUser.pendingConnections.includes(userToConnect._id)) {
      return res.json({ message: "Already in pending connection." });
    }
    if (currentUser.sentConnections.includes(userToConnect._id)) {
      return res.json({ message: " you have already sent the connection request." });
    }
    currentUser.sentConnections.push(userIdToConnect);
    await currentUser.save();
    userToConnect.pendingConnections.push(currentUser._id);
    await userToConnect.save();
    res.json({ message: "Connection request sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error connecting to the user." });
  }
});

router.put('/updateprofile',uploads.single('profileImage'), async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const existingusername = await User.findOne({ username: req.body.username });
    if(existingusername){
      res.json({existingusername});
      return;
    }
    console.log(user);
    user.name = req.body.name || user.name;
    user.username = req.body.username || user.username;
    user.year = req.body.year || user.year;
    user.branch = req.body.branch || user.branch;
    user.college = req.body.college || user.college;
    //user.studyingIn = req.body.studyingIn || user.studyingIn;
    user.bio = req.body.bio || user.bio;
    //user.profileImage = req.body.profileImage || user.profileImage;
    let profileimage;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      profileimage = result.secure_url;
    }
     //  //console.log(req.file);
     //  const result = await cloudinary.uploader.upload(req.file.path);
     //  console.log("result");
     //  user.profileImage = result.secure_url || user.profileImage;
     // // fs.unlinkSync(req.file.path);
    user.profileImage = profileimage || user.profileImage;
    user.isVerified = true;
    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Error creating user profile', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/posts/:postId', async (req, res) => {
  const { postId } = req.params;
  const userId = req.userId; 
  try {
    const post = await Post.findById(postId);
    await post.deleteOne();
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/fetch-user-connections', async (req, res) => {
  try {
    const userId = req.userId; 
    const userProfile = await User.findById(userId)
      .populate("connections");
    if (!userProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    const connectedUserIds = userProfile.connections;
    const connectedUsers = await User.find({ _id: { $in: connectedUserIds } });
    res.json(connectedUsers);
  } catch (error) {
    console.error('Error fetching con nections:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/fetch-user-pendingconnections', async (req, res) => {
  try {
    const userId = req.userId; 
    const userProfile = await User.findById(userId)
      .populate("pendingConnections");
    if (!userProfile) {
      return res.status(404).json({ error: 'User not found' });
    }
    const pendingConnectionUsersIds = userProfile.pendingConnections;
    const pendingConnectionUsers = await User.find({ _id: { $in: pendingConnectionUsersIds }});
    res.json(pendingConnectionUsers);
  } catch (error) {
    console.error('Error fetching con nections:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/accept-conection-request/:usertoacceptId', async (req, res) => {
  try {
    const userId = req.userId; 
    const currentUser  = await User.findById(userId);
    const userIdToAccept = req.params.usertoacceptId;
    const userToAccept = await User.findById(userIdToAccept);
     if (!userToAccept) {
      return res.status(404).json({ message: "User to accept not found." });
    }
    if (!currentUser.pendingConnections.includes(userToAccept._id)) {
      return res.status(400).json({ message: "Connection request not found." });
    }
    currentUser.connections.push(userToAccept._id);
    userToAccept.connections.push(currentUser._id);
    currentUser.pendingConnections = currentUser.pendingConnections.filter(
      (id) => id.toString() !== userToAccept._id.toString()
    );
    userToAccept.sentConnections =  userToAccept.sentConnections.filter(
      (id) => id.toString() !== currentUser._id.toString()
    );
    await currentUser.save();
    await userToAccept.save();
    res.json({ message: "Connection accepted." });
  } catch (error) {
    console.error('Error accepting request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;
