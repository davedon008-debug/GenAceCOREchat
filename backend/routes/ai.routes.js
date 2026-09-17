import express from 'express';
import { handleAIQuery } from '../controllers/ai.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/query', handleAIQuery);

export default router;
