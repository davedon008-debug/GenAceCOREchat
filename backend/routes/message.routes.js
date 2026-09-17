import express from 'express';
import { getMessages, sendMessage, toggleReaction, burnMessage, deleteMessage, markAsRead } from '../controllers/message.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/conversation/:conversationId', getMessages);
router.get('/space/:spaceId', getMessages);
router.post('/', sendMessage);
router.post('/read', markAsRead);
router.post('/:messageId/reaction', toggleReaction);
router.post('/:messageId/burn', burnMessage);
router.delete('/:messageId', deleteMessage);

export default router;
