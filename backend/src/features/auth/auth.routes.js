import express from 'express';
import requireAuth from '../../shared/middleware/requireAuth.js';
import { getMeController, deleteDataController, deleteAccountController } from './auth.controller.js';

const router = express.Router();

// GET /api/auth/me
router.get('/me', requireAuth, getMeController);

// DELETE /api/auth/data
router.delete('/data', requireAuth, deleteDataController);

// DELETE /api/auth/account
router.delete('/account', requireAuth, deleteAccountController);

export default router;
