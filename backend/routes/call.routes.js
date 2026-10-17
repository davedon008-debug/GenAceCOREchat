import express from 'express';
import { rejectRingingCall, getPendingCallForPersona } from '../config/socket.js';

const router = express.Router();

/**
 * POST /api/calls/reject
 * Dismiss/decline a ringing call (can be called by Service Worker in background)
 */
router.post('/reject', (req, res) => {
  try {
    const { callId, reason, responderPersonaId } = req.body || {};
    if (!callId) {
      return res.status(400).json({ success: false, message: 'callId is required' });
    }

    const declined = rejectRingingCall(callId, reason || 'declined', responderPersonaId);
    console.log(`[Call Route] Reject call ${callId}: result=${declined}`);
    return res.json({ success: true, declined });
  } catch (err) {
    console.error('[Call Route] Error rejecting call:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/calls/pending
 * Check if there is an active ringing call waiting for this persona
 */
router.get('/pending', (req, res) => {
  try {
    const personaId = req.query.personaId || req.user?.activePersonaId;
    if (!personaId) {
      return res.status(400).json({ success: false, message: 'personaId is required' });
    }

    const pendingCall = getPendingCallForPersona(personaId);
    return res.json({ success: true, pendingCall });
  } catch (err) {
    console.error('[Call Route] Error checking pending call:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
