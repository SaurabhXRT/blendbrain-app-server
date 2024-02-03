const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const File = require("../models/upload");
const app = express();
const streamifier = require('streamifier');

const cors = require('cors');
app.use(cors());

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

const jsonFilePath = path.join(__dirname, 'key.json');
const googleDriveKey = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

const { google } = require('googleapis');
const drive = google.drive('v3');

const driveClient = async (auth) => {
  try {
    const authClient = await auth.getClient();
    google.options({ auth: authClient });
    return drive;
  } catch (error) {
    console.error('Error authenticating Google Drive client:', error);
    throw error;
  }
};

router.use(authMiddleware);

router.post('/upload', upload.single('file'), async (req, res) => {
  const { subjectName } = req.body;
  const { originalname, mimetype, buffer } = req.file;
  const userId = req.userId;

  try {
    const fileMetadata = {
      name: originalname,
    };

    const media = {
      mimeType: mimetype,
      body: streamifier.createReadStream(buffer),
    };

    const driveInstance = await driveClient(auth); // Pass auth as an argument

    const response = await driveInstance.files.create({
      resource: fileMetadata,
      media,
      fields: 'webViewLink, id',
    });

    const fileId = response.data.id;

    await driveInstance.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    const fileModel = new File({
      subjectname: subjectName,
      filename: originalname,
      pdf: fileId,
      uploadedBy: userId,
    });

    await fileModel.save();

    res.json({ success: true, fileModel });
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
