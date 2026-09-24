import { query } from '../utils/connectToDB.js';
import { getAllFaqQuery } from '../utils/sqlQuery.js';
import { createError } from '../utils/error.js';

// GET /api/faq
export async function getAllFaq(req, res, next) {
    try {
        const { rows } = await query(getAllFaqQuery);
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Erreur récupération FAQ :', error);
        return next(createError(500, 'Impossible de récupérer la FAQ'));
    }
}
