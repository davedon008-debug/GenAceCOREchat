import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    let mongoUri = process.env.MONGODB_URI;
    
    if (isProduction && !mongoUri) {
      console.error('❌ [FATAL CONFIG ERROR] MONGODB_URI must be set in environment variables for production mode!');
      throw new Error('MONGODB_URI missing in production environment');
    }

    if (!mongoUri && !isProduction) {
      mongoUri = 'mongodb://127.0.0.1:27017/donchat';
      console.log('[MongoDB] Using local development fallback database URI');
    }

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};
