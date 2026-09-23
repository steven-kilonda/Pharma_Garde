import express from 'express';
import { getAllGardes, getGardesActives } from '../controllers/gardes.js';

const router = express.Router();
router.get('/', getAllGardes);
router.get('/actives', getGardesActives);
export default router;
