import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { protect } from '../middleware/auth.middleware.js';
import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/heic', 'image/heif',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp', 'video/x-m4v',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/aac', 'audio/3gpp', 'audio/amr',
  'application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'text/html', 'application/json',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/octet-stream'
];

const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  if (
    ALLOWED_MIME_TYPES.includes(mime) ||
    mime.startsWith('image/') ||
    mime.startsWith('audio/') ||
    mime.startsWith('video/') ||
    mime.startsWith('application/') ||
    mime.startsWith('text/')
  ) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname || '') || '';
    if (!ext && file.mimetype) {
      if (file.mimetype.startsWith('video/')) ext = '.mp4';
      else if (file.mimetype.startsWith('image/')) ext = '.jpg';
      else if (file.mimetype.startsWith('audio/')) ext = '.mp3';
      else if (file.mimetype === 'application/pdf') ext = '.pdf';
    }
    if (!ext) ext = '.bin';
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 250 * 1024 * 1024 } // 250MB limit
});

// Protected Upload Endpoint
router.post('/', protect, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Multer upload middleware error:', err);
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      let savedFilename = '';
      let savedSize = 0;

      if (req.file) {
        savedFilename = req.file.filename;
        savedSize = req.file.size;
      } else if (req.body && req.body.fileData) {
        const { fileData, fileName } = req.body;
        let base64Data = fileData;
        let extension = 'bin';

        if (fileData.startsWith('data:')) {
          const matches = fileData.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mime = matches[1];
            base64Data = matches[2];
            const mimeParts = mime.split('/');
            if (mimeParts[1]) {
              extension = mimeParts[1].split('+')[0];
            }
          }
        }

        if (fileName && fileName.includes('.')) {
          const ext = fileName.split('.').pop();
          if (ext && ext.length < 5) {
            extension = ext;
          }
        }

        savedFilename = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${extension}`;
        const filePath = path.join(uploadsDir, savedFilename);

        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > 250 * 1024 * 1024) {
          return res.status(400).json({ success: false, message: 'Base64 file size exceeds the 250MB limit' });
        }
        fs.writeFileSync(filePath, buffer);
        savedSize = buffer.length;
      } else {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      const fileUrl = `/uploads/${savedFilename}`;
      let finalUrl = fileUrl;
      let publicId = null;

      // Upload to Cloudinary if configured
      if (isCloudinaryConfigured) {
        try {
          const localFilePath = path.join(uploadsDir, savedFilename);
          const cloudRes = await cloudinary.uploader.upload(localFilePath, {
            folder: 'donchat_uploads',
            resource_type: 'auto'
          });
          if (cloudRes && cloudRes.secure_url) {
            finalUrl = cloudRes.secure_url;
            publicId = cloudRes.public_id;
            if (fs.existsSync(localFilePath)) {
              fs.unlinkSync(localFilePath);
            }
          }
        } catch (cErr) {
          console.warn('[Upload] Cloudinary upload fallback to local storage:', cErr.message);
        }
      }

      res.status(201).json({
        success: true,
        url: finalUrl,
        fileUrl: finalUrl,
        fullUrl: finalUrl,
        publicId: publicId || undefined,
        fileName: savedFilename,
        size: savedSize
      });
    } catch (error) {
      console.error('Upload processing error:', error);
      res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
    }
  });
});

export default router;
