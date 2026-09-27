import SecretLoversGame from '../models/SecretLoversGame.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Persona from '../models/Persona.js';
import { getIO } from '../config/socket.js';

/**
 * Sanitize game object for client output so unrevealed questions stay secret server-side!
 */
const sanitizeGameState = (game, requesterPersonaId) => {
  if (!game) return null;
  const gameObj = game.toObject ? game.toObject({ virtuals: true }) : { ...game };
  const pIdStr = String(requesterPersonaId);
  const isParticipant = String(gameObj.creatorPersonaId._id || gameObj.creatorPersonaId) === pIdStr ||
                        String(gameObj.partnerPersonaId._id || gameObj.partnerPersonaId) === pIdStr;

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
        isRevealed: true
      };
    } else {
      return {
        number: q.number,
        text: '??? (Secret Content Hidden)',
        category: q.category || 'General',
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
    const { conversationId, questions, partnerPersonaId } = req.body;

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
      selectedNumbers: [],
      completedNumbers: [],
      skippedNumbers: [],
      currentTurnPersonaId: creatorPersonaId,
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

// Accept game invitation
export const acceptGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const personaId = req.personaId;

    const game = await SecretLoversGame.findById(gameId);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game session not found.' });
    }

    if (String(game.partnerPersonaId) !== String(personaId) && String(game.creatorPersonaId) !== String(personaId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }

    game.status = 'active';
    game.startedAt = new Date();
    await game.save();

    await game.populate('creatorPersonaId', 'displayName username avatar');
    await game.populate('partnerPersonaId', 'displayName username avatar');

    const io = getIO();
    if (io) {
      const sanitized = sanitizeGameState(game, game.creatorPersonaId._id);
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

    if (String(game.partnerPersonaId) !== String(personaId) && String(game.creatorPersonaId) !== String(personaId)) {
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

    if (String(game.currentTurnPersonaId) !== String(personaId)) {
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
      revealedById: personaId,
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
    return res.status(500).json({ success: false, message: 'Server error selecting tile.' });
  }
};

// Complete or skip the current revealed turn challenge
export const actionTurn = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { action } = req.body; // 'done' | 'skip'
    const personaId = req.personaId;

    const game = await SecretLoversGame.findById(gameId);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game session not found.' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Game is not active.' });
    }

    if (String(game.currentTurnPersonaId) !== String(personaId)) {
      return res.status(403).json({ success: false, message: "It is not your turn!" });
    }

    const tileNum = game.currentRevealedTile?.number;
    if (!tileNum) {
      return res.status(400).json({ success: false, message: 'No tile is currently selected.' });
    }

    if (action === 'done') {
      if (!game.completedNumbers.includes(tileNum)) game.completedNumbers.push(tileNum);
      game.currentRevealedTile.status = 'completed';
    } else {
      if (!game.skippedNumbers.includes(tileNum)) game.skippedNumbers.push(tileNum);
      game.currentRevealedTile.status = 'skipped';
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
      // Switch turn to opponent persona
      const nextTurnId = String(game.currentTurnPersonaId) === String(game.creatorPersonaId)
        ? game.partnerPersonaId
        : game.creatorPersonaId;

      game.currentTurnPersonaId = nextTurnId;
      game.currentRevealedTile = { number: null, text: '', category: '', revealedById: null, status: 'pending' };
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
