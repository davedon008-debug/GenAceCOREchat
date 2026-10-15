import express from 'express';
import {
  createGame,
  getGame,
  getActiveGameForConversation,
  acceptGame,
  declineGame,
  selectNumber,
  actionTurn,
  cancelGame
} from '../controllers/secretLovers.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/create', createGame);
router.get('/conversation/:conversationId', getActiveGameForConversation);
router.get('/:gameId', getGame);
router.post('/:gameId/accept', acceptGame);
router.post('/:gameId/decline', declineGame);
router.post('/:gameId/select-number', selectNumber);
router.post('/:gameId/action-turn', actionTurn);
router.post('/:gameId/cancel', cancelGame);

export default router;
