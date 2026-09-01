import express from 'express';
import requireAuth from '../../shared/middleware/requireAuth.js';
import {
  getCanvasNotes,
  createCanvasNote,
  updateCanvasNote,
  deleteCanvasNote,
} from './canvas.controller.js';

const router = express.Router();

// All canvas note endpoints require authentication
router.get('/canvas/notes', requireAuth, getCanvasNotes);
router.post('/canvas/notes', requireAuth, createCanvasNote);
router.put('/canvas/notes/:id', requireAuth, updateCanvasNote);
router.delete('/canvas/notes/:id', requireAuth, deleteCanvasNote);

export default router;
