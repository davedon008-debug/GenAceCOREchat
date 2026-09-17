import express from 'express';
import { 
  registerUser, loginUser, demoLogin, changePassword, requestPasswordReset, checkResetStatus,
  setChatPasscode, verifyChatPasscode, getPasscodeStatus, toggleLockConversation, toggleChatLock
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/demo', demoLogin);
router.post('/request-password-reset', requestPasswordReset);
router.post('/check-reset-status', checkResetStatus);
router.patch('/change-password', protect, changePassword);

// Chat Lock & Passcode Routes
router.get('/passcode-status', protect, getPasscodeStatus);
router.post('/chat-passcode', protect, setChatPasscode);
router.post('/verify-passcode', protect, verifyChatPasscode);
router.post('/toggle-lock-chat', protect, toggleLockConversation);
router.post('/toggle-chat-lock', protect, toggleChatLock);

export default router;
