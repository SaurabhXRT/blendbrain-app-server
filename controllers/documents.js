const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const User = require("../models/user");
const File = require("../models/upload");
const app = express();
const streamifier = require('streamifier');

const cors = require('cors');
app.use(cors());

// const multer = require("multer");
// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// const jsonFilePath = path.join(__dirname, 'key.json');
// const googleDriveKey = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

// const { google } = require('googleapis');
// const drive = google.drive('v3');

// const driveClient = async (auth) => {
//   try {
//     const authClient = await auth.getClient();
//     google.options({ auth: authClient });
//     return drive;
//   } catch (error) {
//     console.error('Error authenticating Google Drive client:', error);
//     throw error;
//   }
// };

router.use(authMiddleware);

router.post('/upload', async (req, res) => {
  const { subjectName, file } = req.body;
  const userId = req.userId;

  try {
    const fileModel = new File({
      subjectname: subjectName,
      pdf: file,
      uploadedBy: userId,
    });

    const savedFile = await fileModel.save();
    await User.findByIdAndUpdate(userId, { $push: { files: savedFile._id } });

    res.json({ success: true, fileModel: savedFile });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false });
  }
});

router.get('/documents', async (req, res) => {
  const userId = req.userId;

  try {
    const userWithFiles = await User.findById(userId).populate('files');
    
    if (!userWithFiles) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, documents: userWithFiles.files });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false });
  }
});

// Add a new route in your server
router.post('/document/incrementViews', async (req, res) => {
  const { documentId } = req.body;
  
  try {
    const document = await File.findByIdAndUpdate(documentId, { $inc: { views: 1 } });
    
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    res.json({ success: true, document });
  } catch (error) {
    console.error('Error incrementing views:', error);
    res.status(500).json({ success: false });
  }
});
module.exports = router;
