import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME ? process.env.CLOUDINARY_CLOUD_NAME.trim() : '';
const apiKey = process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY.trim() : '';
const apiSecret = process.env.CLOUDINARY_API_SECRET ? process.env.CLOUDINARY_API_SECRET.trim() : '';

const isConfigured = Boolean(
  cloudName && 
  apiKey && 
  apiSecret && 
  cloudName !== 'demo' && 
  apiKey !== '1234567890'
);

if (process.env.NODE_ENV === 'production' && !isConfigured) {
  console.error('❌ [FATAL CONFIG ERROR] CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be configured in environment for production mode.');
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

