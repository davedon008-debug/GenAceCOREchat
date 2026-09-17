import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Persona from '../models/Persona.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'donchat_secure_default_secret_key_2026';

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.userId = decoded.userId;
    req.personaId = decoded.personaId;

    const userExists = await User.exists({ _id: decoded.userId });
    if (!userExists) {
      return res.status(401).json({ success: false, message: 'Account no longer exists or was terminated' });
    }

    if (!req.personaId && req.userId) {
      const userPersona = await Persona.findOne({ userId: req.userId, isDefault: true }) || await Persona.findOne({ userId: req.userId });
      if (userPersona) {
        req.personaId = userPersona._id;
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token verification failed', error: error.message });
  }
};

export const adminOnly = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Only the single master admin account can access the Admin Panel.'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Admin verification failed', error: error.message });
  }
};
