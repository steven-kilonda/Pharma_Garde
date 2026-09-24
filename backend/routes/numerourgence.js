import express from 'express';
import { getAllNumerosUrgence } from '../controllers/numerourgence.js';

const router = express.Router();

router.get('/', getAllNumerosUrgence);

export default router;
