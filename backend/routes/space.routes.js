import express from 'express';
import {
  createOrUpgradeSpace,
  inviteMembersToSpace,
  removeMemberFromSpace,
  getSpaces,
  getPublicSpaces,
  joinPublicSpace,
  getSpaceDetails,
  createTask,
  updateTaskStatus,
  createPoll,
  votePoll,
  updateSpacePrivacyMode
} from '../controllers/space.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/', createOrUpgradeSpace);
router.get('/public', getPublicSpaces);
router.get('/', getSpaces);
router.post('/:spaceId/invite', inviteMembersToSpace);
router.delete('/:spaceId/members/:personaId', removeMemberFromSpace);
router.post('/:spaceId/join', joinPublicSpace);
router.get('/:spaceId', getSpaceDetails);
router.patch('/:spaceId/privacy', updateSpacePrivacyMode);
router.post('/:spaceId/tasks', createTask);
router.patch('/tasks/:taskId', updateTaskStatus);
router.post('/:spaceId/polls', createPoll);
router.post('/polls/:pollId/vote', votePoll);

export default router;
