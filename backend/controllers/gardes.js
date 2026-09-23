import { query } from '../utils/connectToDB.js';
import { getAllGardesQuery, getGardesActivesQuery } from '../utils/sqlQuery.js';
import { createError } from '../utils/error.js';

const formatGarde = (g) => ({
    id: String(g.id),
    pharmacieId: String(g.pharmacie_id),
    debut: g.debut,
    fin: g.fin,
});

// GET /api/gardes — toutes les périodes de garde
export async function getAllGardes(req, res, next) {
    try {
        const { rows } = await query(getAllGardesQuery);
        return res.status(200).json(rows.map(formatGarde));
    } catch (error) {
        console.error('Erreur récupération gardes :', error);
        return next(createError(500, 'Impossible de récupérer les gardes'));
    }
}

// GET /api/gardes/actives?date=2026-09-16 — en garde à une date donnée (défaut : aujourd'hui)
export async function getGardesActives(req, res, next) {
    try {
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return next(
                createError(
                    400,
                    'Le paramètre date doit être au format AAAA-MM-JJ',
                ),
            );
        }
        const { rows } = await query(getGardesActivesQuery, [date]);
        return res.status(200).json(rows.map(formatGarde));
    } catch (error) {
        console.error('Erreur récupération gardes actives :', error);
        return next(
            createError(500, 'Impossible de récupérer les gardes actives'),
        );
    }
}
