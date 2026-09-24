import express from 'express';
import { getAllStocks } from '../controllers/stocks.js';
const router = express.Router();
router.get('/', getAllStocks);
export default router;
