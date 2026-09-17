import express from 'express';
import {
  getAdminStats,
  getAllUsers,
  updateUserPassword,
  updateUserRole,
  deleteUser,
  purgeAllUsers,
  getAllSpacesAdmin,
  deleteSpaceAdmin,
  getPasswordResetRequests,
  resolvePasswordResetRequest
} from '../controllers/admin.controller.js';
import { protect, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protect all admin routes with authentication AND master admin role verification
router.use(protect, adminOnly);

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.put('/users/:userId/password', updateUserPassword);
router.put('/users/:userId/role', updateUserRole);
router.delete('/users/all/purge', purgeAllUsers);
router.delete('/users/:userId', deleteUser);

router.get('/password-resets', getPasswordResetRequests);
router.put('/password-resets/:requestId/resolve', resolvePasswordResetRequest);

router.get('/spaces', getAllSpacesAdmin);
router.delete('/spaces/:spaceId', deleteSpaceAdmin);

export default router;
