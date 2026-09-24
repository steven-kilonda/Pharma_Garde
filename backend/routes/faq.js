import express from 'express';
import { getAllFaq } from '../controllers/faq.js';

const router = express.Router();
router.get('/', getAllFaq);
export default router;
