const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
//const User = require('../models/user');
//const Post = require('../models/userpost');
const File = require("../models/upload");
const app = express();
const streamifier = require('streamifier');

const cors = require('cors');
app.use(cors());

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

const jsonFilePath = path.join(__dirname, 'key.json');

// Read the JSON file
const googleDriveKey = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

//const googleDriveKeyPath = process.env.GOOGLE_DRIVE_KEY_PATH;
const { google } = require('googleapis');
const drive = google.drive('v3');
const auth = new google.auth.GoogleAuth({
  keyFile: googleDriveKey,
  scopes: ['https://www.googleapis.com/auth/drive'],
});


const driveClient = async () => {
  const authClient = await auth.getClient();
  google.options({ auth: authClient });
  return drive;
};

router.use(authMiddleware);
router.post('/upload', upload.single('file'), async (req, res) => {
  const { subjectName } = req.body;
  const { originalname, mimetype, buffer } = req.file;
  console.log(req.file);
  const userId = req.userId;
  try {
    const fileMetadata = {
      name: originalname,
    };

    const media = {
      mimeType: mimetype,
      body: streamifier.createReadStream(buffer),
    };

    const driveInstance = await driveClient();

    const response = await driveInstance.files.create({
      resource: fileMetadata,
      media,
      fields: 'webViewLink, id',
    });

    const fileId = response.data.id;
    console.log(fileId);

    await driveInstance.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Save the data to MongoDB according to your schema
    // Replace the following lines with your MongoDB schema and model logic
    const fileModel = new File({
      subjectname: subjectName,
      filename: originalname,
      pdf: fileId, // Store fileId or any other reference as needed
      uploadedBy: userId, // Assuming you have user authentication
    });

    await fileModel.save();

    res.json({ success: true, fileModel });
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
