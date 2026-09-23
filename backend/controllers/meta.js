import { query } from '../utils/connectToDB.js';
import { getAllMetaQuery } from '../utils/sqlQuery.js';
import { createError } from '../utils/error.js';

const formatMeta = (m) => ({
    id: m.id,
    titre: m.titre,
    semaineDu: m.semaine_du,
    semaineAu: m.semaine_au,
    source: m.source,
    majLe: m.maj_le,
    note: m.note,
});

// GET /api/meta — le planning le plus récent
export async function getMeta(req, res, next) {
    try {
        const { rows } = await query(getAllMetaQuery);
        if (!rows.length) {
            return next(createError(404, 'Aucun planning publié'));
        }
        return res.status(200).json(formatMeta(rows[0]));
    } catch (error) {
        console.error('Erreur récupération meta :', error);
        return next(createError(500, 'Impossible de récupérer le planning'));
    }
}
