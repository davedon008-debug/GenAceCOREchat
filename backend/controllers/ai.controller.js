import { processAIQuery } from '../services/ai.service.js';
import Conversation from '../models/Conversation.js';
import Space from '../models/Space.js';

export const handleAIQuery = async (req, res) => {
  try {
    const { action, conversationId, spaceId, queryText } = req.body;

    if (!conversationId && !spaceId) {
      return res.status(400).json({ success: false, message: 'Must specify conversationId or spaceId' });
    }

    // Security Check: Verify requesting persona is a member of the room
    if (conversationId) {
      const conv = await Conversation.findOne({ _id: conversationId, participants: req.personaId });
      if (!conv) {
        return res.status(403).json({ success: false, message: 'Access denied to this conversation context' });
      }
    }

    if (spaceId) {
      const space = await Space.findOne({ _id: spaceId, 'members.personaId': req.personaId });
      if (!space) {
        return res.status(403).json({ success: false, message: 'Access denied to this Space context' });
      }
    }

    const result = await processAIQuery({
      action: action || 'CATCH_UP',
      conversationId,
      spaceId,
      queryText,
      personaId: req.personaId
    });

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'AI processing failed', error: error.message });
  }
};
