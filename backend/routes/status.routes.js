import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  createStatus,
  getStatusFeed,
  viewStatus,
  deleteStatus,
  replyToStatus,
  getStatusPrivacy,
  updateStatusPrivacy,
  toggleMuteStatusAuthor
} from '../controllers/status.controller.js';

const router = express.Router();

// All status operations require authentication
router.use(protect);

router.post('/', createStatus);
router.get('/feed', getStatusFeed);
router.post('/reply', replyToStatus);
router.get('/privacy', getStatusPrivacy);
router.patch('/privacy', updateStatusPrivacy);
router.post('/mute/:targetPersonaId', toggleMuteStatusAuthor);
router.post('/:id/view', viewStatus);
router.delete('/:id', deleteStatus);

export default router;
