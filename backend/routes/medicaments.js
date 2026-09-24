import express from 'express';
import {
    getAllMedicaments,
    getMedicament,
} from '../controllers/medicaments.js';
const router = express.Router();
router.get('/', getAllMedicaments);
router.get('/:id', getMedicament);
export default router;
