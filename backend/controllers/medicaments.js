import { query } from '../utils/connectToDB.js';
import {
    getAllMedicamentsQuery,
    getMedicamentQuery,
} from '../utils/sqlQuery.js';
import { createError } from '../utils/error.js';

// GET /api/medicaments
export async function getAllMedicaments(req, res, next) {
    try {
        const { rows } = await query(getAllMedicamentsQuery);
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Erreur récupération médicaments :', error);
        return next(
            createError(500, 'Impossible de récupérer les médicaments'),
        );
    }
}

// GET /api/medicaments/:id
export async function getMedicament(req, res, next) {
    try {
        const { rows } = await query(getMedicamentQuery, [req.params.id]);
        if (!rows.length)
            return next(createError(404, 'Médicament non trouvé'));
        return res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Erreur récupération médicament :', error);
        return next(createError(500, 'Impossible de récupérer le médicament'));
    }
}
