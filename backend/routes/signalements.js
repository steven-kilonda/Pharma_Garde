import express from 'express';
import { createSignalement } from '../controllers/signalements.js';

const router = express.Router();

router.post('/', createSignalement);

export default router;
