import express from 'express';
import { getPersonas, createPersona, switchPersona, searchPersonas, checkUsernameAvailability, getAllContacts, updatePersona, blockPersona, unblockPersona, getBlockedPersonas, addContact, removeContact, registerPushToken, getVapidKey } from '../controllers/persona.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/check-username', checkUsernameAvailability);

router.use(protect);

router.get('/vapid-key', getVapidKey);
router.post('/push-token', registerPushToken);
router.get('/', getPersonas);
router.get('/all', getAllContacts);
router.get('/blocked', getBlockedPersonas);

// Contacts Endpoints
router.post('/contacts/add/:targetPersonaId?', addContact);
router.post('/contacts/add', addContact);
router.delete('/contacts/remove/:targetPersonaId?', removeContact);
router.post('/contacts/remove/:targetPersonaId?', removeContact);
router.post('/contacts/remove', removeContact);
router.post('/contacts/delete', removeContact);
router.delete('/contacts/delete/:targetPersonaId?', removeContact);

// Blocking Endpoints
router.post('/block/:targetPersonaId?', blockPersona);
router.post('/block', blockPersona);
router.delete('/block/:targetPersonaId?', unblockPersona);
router.post('/unblock/:targetPersonaId?', unblockPersona);
router.post('/unblock', unblockPersona);
router.post('/', createPersona);
router.post('/switch', switchPersona);
router.get('/search', searchPersonas);
router.patch('/:personaId', updatePersona);

export default router;
