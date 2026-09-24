import { query } from '../utils/connectToDB.js';
import { getAllNumerosUrgenceQuery } from '../utils/sqlQuery.js';
import { createError } from '../utils/error.js';

// GET /api/numerourgence
export async function getAllNumerosUrgence(req, res, next) {
    try {
        const { rows } = await query(getAllNumerosUrgenceQuery);
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Erreur récupération numéros urgence :', error);
        return next(
            createError(500, "Impossible de récupérer les numéros d'urgence"),
        );
    }
}
