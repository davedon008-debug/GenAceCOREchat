import SecretLoversGame from '../models/SecretLoversGame.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Persona from '../models/Persona.js';
import { getIO } from '../config/socket.js';

/**
 * Helper to safely extract ID string from primitive or populated Object
 */
const getIDString = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);

  let target = val;
  if (typeof target === 'object' && target !== null) {
    if (target._id && target._id !== target) {
      target = target._id;
    } else if (target.id && target.id !== target) {
      target = target.id;
    } else if (target.personaId && target.personaId !== target) {
      target = target.personaId;
    }
  }

  if (typeof target === 'string') return target.trim();
  if (typeof target === 'number') return String(target);
  if (target && typeof target.toString === 'function') {
    const str = target.toString();
    if (str && str !== '[object Object]') return str;
  }
  return '';
};

/**
 * Sanitize game object for client output so unrevealed questions stay secret server-side!
 */
const sanitizeGameState = (game, requesterPersonaId) => {
  if (!game) return null;
  const gameObj = game.toObject ? game.toObject({ virtuals: true }) : { ...game };
  const pIdStr = getIDString(requesterPersonaId);
  const creatorStr = getIDString(gameObj.creatorPersonaId);
  const partnerStr = getIDString(gameObj.partnerPersonaId);
  const isParticipant = creatorStr === pIdStr || partnerStr === pIdStr;

  if (!isParticipant) return null;

  const isCompleted = gameObj.status === 'completed';
  const selectedSet = new Set(gameObj.selectedNumbers || []);

  // Filter questions: hide text for unrevealed tiles unless game is over
  gameObj.questions = (gameObj.questions || []).map(q => {
    const isSelected = selectedSet.has(q.number);
    if (isSelected || isCompleted) {
      return {
        number: q.number,
        text: q.text,
        category: q.category || 'General',
        createdById: q.createdById,
        answerText: q.answerText || '',
        answerMediaUrl: q.answerMediaUrl || '',
        answerMediaType: q.answerMediaType || '',
        status: q.status || (gameObj.completedNumbers?.includes(q.number) ? 'completed' : gameObj.skippedNumbers?.includes(q.number) ? 'skipped' : 'unrevealed'),
        isRevealed: true
      };
    } else {
      return {
        number: q.number,
        text: '??? (Secret Content Hidden)',
        category: q.category || 'General',
        createdById: q.createdById,
        answerText: '',
        answerMediaUrl: '',
        answerMediaType: '',
        status: 'unrevealed',
        isRevealed: false
      };
    }
  });

  return gameObj;
};

// Create a new Secret Lovers game with custom user questions
export const createGame = async (req, res) => {
  try {
    const creatorPersonaId = req.personaId;
    const { conversationId, questions, partnerPersonaId, creatorSkipOwnQuestions = true } = req.body;

    if (!conversationId || !partnerPersonaId || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid payload. Conversation, partner, and questions required.' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const isMember = conversation.participants.some(p => String(p) === String(creatorPersonaId));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this conversation.' });
    }

    // Format & sanitize user-created questions
    const formattedQuestions = questions.map((q, idx) => ({
      number: idx + 1,
      text: String(q.text || '').trim() || `Secret Challenge #${idx + 1}`,
      category: String(q.category || 'Romantic').trim(),
      createdById: creatorPersonaId
    }));

    const game = await SecretLoversGame.create({
      conversationId,
      creatorPersonaId,
      partnerPersonaId,
      questions: formattedQuestions,
      creatorSkipOwnQuestions: creatorSkipOwnQuestions !== false,
      selectedNumbers: [],
      completedNumbers: [],
      skippedNumbers: [],
      currentTurnPersonaId: partnerPersonaId,
      status: 'invited'
    });

    const creatorPersona = await Persona.findById(creatorPersonaId).select('displayName username avatar');

    // Create an interactive invitation message in the conversation
    const inviteMessage = await Message.create({
      conversationId,
      senderPersonaId: creatorPersonaId,
      content: `❤️ ${creatorPersona?.displayName || 'Partner'} invited you to play Secret Lovers! (${formattedQuestions.length} secrets)`,
      contentType: 'secret_lovers_invite',
      gameId: game._id,
      status: 'sent'
    });

    await inviteMessage.populate('senderPersonaId', 'displayName username avatar');

    const io = getIO();
    if (io) {
      const msgObj = inviteMessage.toObject({ virtuals: true });
      io.to(String(conversationId)).emit('message:new', msgObj);
      io.to(`persona:${partnerPersonaId}`).emit('message:new', msgObj);
      io.to(`persona:${partnerPersonaId}`).emit('secret_lovers:invited', {
        gameId: game._id,
        conversationId,
        creatorPersona
      });
    }

    const sanitizedGame = sanitizeGameState(game, creatorPersonaId);
    return res.status(201).json({ success: true, game: sanitizedGame, inviteMessage });
  } catch (err) {
    console.error('Error creating Secret Lovers game:', err);
    return res.status(500).json({ success: false, message: 'Server error creating game session.' });
  }
};

// Get current game state
export const getGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const personaId = req.personaId;

    const game = await SecretLoversGame.findById(gameId)
      .populate('creatorPersonaId', 'displayName username avatar')
      .populate('partnerPersonaId', 'displayName username avatar');

    if (!game) {
      return res.status(404).json({ success: false, message: 'Game session not found.' });
    }

    const sanitized = sanitizeGameState(game, personaId);
    if (!sanitized) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this game.' });
    }

    return res.json({ success: true, game: sanitized });
  } catch (err) {
    console.error('Error fetching game state:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching game.' });
  }
};

// Get active or invited game for a conversation
export const getActiveGameForConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const personaId = req.personaId;

    const game = await SecretLoversGame.findOne({
      conversationId,
      status: { $in: ['invited', 'active'] }
    })
      .sort({ createdAt: -1 })
      .populate('creatorPersonaId', 'displayName username avatar')
      .populate('partnerPersonaId', 'displayName username avatar');

    if (!game) {
      return res.json({ success: true, game: null });
    }

    const sanitized = sanitizeGameState(game, personaId);
    return res.json({ success: true, game: sanitized });
  } catch (err) {
    console.error('Error fetching active conversation game:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching active game.' });
  }
};

// Accept game invitation
export const acceptGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const personaId = req.personaId;

    const game = await SecretLoversGame.findById(gameId);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game session not found.' });
    }

    const partnerIdStr = getIDString(game.partnerPersonaId);
    const creatorIdStr = getIDString(game.creatorPersonaId);
    const requesterIdStr = getIDString(personaId);

    if (requesterIdStr !== partnerIdStr && requesterIdStr !== creatorIdStr) {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }

    if (game.status === 'invited') {
      game.status = 'active';
      game.startedAt = new Date();
      game.currentTurnPersonaId = getIDString(game.partnerPersonaId);
      await game.save();
    }

    await game.populate('creatorPersonaId', 'displayName username avatar');
    await game.populate('partnerPersonaId', 'displayName username avatar');

    const io = getIO();
    if (io) {
      const sanitized = sanitizeGameState(game, game.creatorPersonaId._id || game.creatorPersonaId);
      io.to(String(game.conversationId)).emit('secret_lovers:updated', { game: sanitized });
    }

    return res.json({ success: true, game: sanitizeGameState(game, personaId) });
  } catch (err) {
    console.error('Error accepting game:', err);
    return res.status(500).json({ success: false, message: 'Server error accepting game.' });
  }
};

// Decline game invitation
export const declineGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const personaId = req.personaId;

    const game = await SecretLoversGame.findById(gameId);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game session not found.' });
    }

    const partnerIdStr = getIDString(game.partnerPersonaId);
    const creatorIdStr = getIDString(game.creatorPersonaId);
    const requesterIdStr = getIDString(personaId);

    if (requesterIdStr !== partnerIdStr && requesterIdStr !== creatorIdStr) {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }

    game.status = 'declined';
    await game.save();

    const io = getIO();
    if (io) {
      io.to(String(game.conversationId)).emit('secret_lovers:updated', { gameId: game._id, status: 'declined' });
    }

    return res.json({ success: true, gameId: game._id, status: 'declined' });
  } catch (err) {
    console.error('Error declining game:', err);
    return res.status(500).json({ success: false, message: 'Server error declining game.' });
  }
};

// Select a tile number on current player's turn
export const selectNumber = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { number } = req.body;
    const personaId = req.personaId;

    const game = await SecretLoversGame.findById(gameId);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game session not found.' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Game is not active.' });
    }

    const currentTurnStr = getIDString(game.currentTurnPersonaId);
    const requesterIdStr = getIDString(personaId);
    if (currentTurnStr !== requesterIdStr) {
      return res.status(403).json({ success: false, message: "It is not your turn!" });
    }

    const tileNum = Number(number);
    if (game.selectedNumbers.includes(tileNum)) {
      return res.status(400).json({ success: false, message: 'Tile number has already been chosen.' });
    }

    const questionItem = game.questions.find(q => q.number === tileNum);
    if (!questionItem) {
      return res.status(404).json({ success: false, message: 'Invalid tile number.' });
    }

    game.selectedNumbers.push(tileNum);
    game.currentRevealedTile = {
      number: tileNum,
      text: questionItem.text,
      category: questionItem.category || 'General',
      createdById: getIDString(questionItem.createdById || game.creatorPersonaId) || null,
      revealedById: getIDString(personaId) || null,
      status: 'pending'
    };

    await game.save();
    await game.populate('creatorPersonaId', 'displayName username avatar');
    await game.populate('partnerPersonaId', 'displayName username avatar');

    const io = getIO();
    if (io) {
      const sanitized = sanitizeGameState(game, personaId);
      io.to(String(game.conversationId)).emit('secret_lovers:updated', { game: sanitized });
    }

    return res.json({ success: true, game: sanitizeGameState(game, personaId) });
  } catch (err) {
    console.error('Error selecting tile number:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error selecting tile.' });
  }
};

// Complete or skip the current revealed turn challenge
export const actionTurn = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { action, answerText, answerMediaUrl, answerMediaType } = req.body; // 'done' | 'skip' | 'pass'
    const personaId = req.personaId;

    const game = await SecretLoversGame.findById(gameId);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game session not found.' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Game is not active.' });
    }

    const currentTurnStr = getIDString(game.currentTurnPersonaId);
    const requesterIdStr = getIDString(personaId);
    if (currentTurnStr !== requesterIdStr) {
      return res.status(403).json({ success: false, message: "It is not your turn!" });
    }

    const tileNum = game.currentRevealedTile?.number;
    if (!tileNum) {
      return res.status(400).json({ success: false, message: 'No tile is currently selected.' });
    }

    const answerStr = String(answerText || '').trim();
    const mediaUrlStr = String(answerMediaUrl || '').trim();
    const mediaTypeStr = String(answerMediaType || '').trim();

    game.currentRevealedTile.answerText = answerStr;
    game.currentRevealedTile.answerMediaUrl = mediaUrlStr;
    game.currentRevealedTile.answerMediaType = mediaTypeStr;

    // Find question item in questions array and record answer & status
    const qIndex = game.questions.findIndex(q => q.number === tileNum);

    if (action === 'done') {
      if (!game.completedNumbers.includes(tileNum)) game.completedNumbers.push(tileNum);
      game.currentRevealedTile.status = 'completed';
      if (qIndex !== -1) {
        game.questions[qIndex].status = 'completed';
        if (answerStr) game.questions[qIndex].answerText = answerStr;
        if (mediaUrlStr) game.questions[qIndex].answerMediaUrl = mediaUrlStr;
        if (mediaTypeStr) game.questions[qIndex].answerMediaType = mediaTypeStr;
      }
    } else if (action === 'pass') {
      if (!game.completedNumbers.includes(tileNum)) game.completedNumbers.push(tileNum);
      game.currentRevealedTile.status = 'passed';
      if (qIndex !== -1) {
        game.questions[qIndex].status = 'passed';
        if (answerStr) game.questions[qIndex].answerText = answerStr;
        if (mediaUrlStr) game.questions[qIndex].answerMediaUrl = mediaUrlStr;
        if (mediaTypeStr) game.questions[qIndex].answerMediaType = mediaTypeStr;
      }
    } else {
      if (!game.skippedNumbers.includes(tileNum)) game.skippedNumbers.push(tileNum);
      game.currentRevealedTile.status = 'skipped';
      if (qIndex !== -1) {
        game.questions[qIndex].status = 'skipped';
      }
    }

    // Check if all questions have been attempted
    const totalQuestions = game.questions.length;
    const attemptedCount = game.selectedNumbers.length;

    if (attemptedCount >= totalQuestions) {
      game.status = 'completed';
      game.completedAt = new Date();

      // Post summary message to conversation
      const summaryMsg = await Message.create({
        conversationId: game.conversationId,
        senderPersonaId: personaId,
        content: `🎉 Secret Lovers Game Completed! ${game.completedNumbers.length} completed, ${game.skippedNumbers.length} skipped out of ${totalQuestions} secrets!`,
        contentType: 'secret_lovers_summary',
        gameId: game._id,
        status: 'sent'
      });
      await summaryMsg.populate('senderPersonaId', 'displayName username avatar');

      const io = getIO();
      if (io) {
        const msgObj = summaryMsg.toObject({ virtuals: true });
        io.to(String(game.conversationId)).emit('message:new', msgObj);
      }
    } else {
      // Determine turn for next question:
      // If creatorSkipOwnQuestions is enabled (or creator wrote the secrets for partner to answer),
      // keep turn on partner so partner answers all questions while creator spectates live!
      if (game.creatorSkipOwnQuestions !== false) {
        game.currentTurnPersonaId = getIDString(game.partnerPersonaId);
      } else {
        const nextTurnId = getIDString(game.currentTurnPersonaId) === getIDString(game.creatorPersonaId)
          ? getIDString(game.partnerPersonaId)
          : getIDString(game.creatorPersonaId);
        game.currentTurnPersonaId = nextTurnId;
      }

      game.currentRevealedTile = {
        number: null,
        text: '',
        category: '',
        createdById: null,
        revealedById: null,
        answerText: '',
        status: 'pending'
      };
    }

    await game.save();
    await game.populate('creatorPersonaId', 'displayName username avatar');
    await game.populate('partnerPersonaId', 'displayName username avatar');

    const io = getIO();
    if (io) {
      const sanitized = sanitizeGameState(game, personaId);
      io.to(String(game.conversationId)).emit('secret_lovers:updated', { game: sanitized });
    }

    return res.json({ success: true, game: sanitizeGameState(game, personaId) });
  } catch (err) {
    console.error('Error actioning turn:', err);
    return res.status(500).json({ success: false, message: 'Server error updating turn action.' });
  }
};

// Cancel active game
export const cancelGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const personaId = req.personaId;

    const game = await SecretLoversGame.findById(gameId);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game session not found.' });
    }

    game.status = 'cancelled';
    await game.save();

    const io = getIO();
    if (io) {
      io.to(String(game.conversationId)).emit('secret_lovers:updated', { gameId: game._id, status: 'cancelled' });
    }

    return res.json({ success: true, gameId: game._id, status: 'cancelled' });
  } catch (err) {
    console.error('Error cancelling game:', err);
    return res.status(500).json({ success: false, message: 'Server error cancelling game.' });
  }
};
