import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || 'genace_core').trim();
const apiKey = (process.env.CLOUDINARY_API_KEY || '327321576889753').trim();
const apiSecret = (process.env.CLOUDINARY_API_SECRET || '0zpPqo40VdU1R3jaWAGZ6LNsKEA').trim();

const isConfigured = Boolean(
  cloudName && 
  apiKey && 
  apiSecret
);

if (process.env.NODE_ENV === 'production' && !isConfigured) {
  console.log('ℹ️ [STORAGE NOTICE] Cloudinary credentials not set in production. App fallback: using local /uploads filesystem storage.');
}

if (isConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
} else {
  cloudinary.config({});
}

export { isConfigured as isCloudinaryConfigured };
export default cloudinary;

