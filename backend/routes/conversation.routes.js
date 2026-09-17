import express from 'express';
import { getConversations, getConversationById, createConversation, updatePrivacyMode, deleteConversation } from '../controllers/conversation.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getConversations);
router.get('/:conversationId', getConversationById);
router.post('/', createConversation);
router.patch('/:conversationId/privacy', updatePrivacyMode);
router.delete('/:conversationId', deleteConversation);

export default router;
