import { query } from '../utils/connectToDB.js';
import { createError } from '../utils/error.js';

// GET /api/stocks — lignes de stock enrichies, avec pharmacieId
export async function getAllStocks(req, res, next) {
    try {
        const { rows } = await query(`
            SELECT st.pharmacie_id, sm.medicament_id,
                   m.nom AS medicament_nom, m.categorie, m.prix, m.ordonnance,
                   sm.statut
            FROM stock st
            INNER JOIN stock_medicament sm ON sm.stock_id = st.id
            INNER JOIN medicament m ON m.id = sm.medicament_id
            ORDER BY st.pharmacie_id ASC, m.nom ASC
        `);
        return res.status(200).json(
            rows.map((r) => ({
                pharmacieId: String(r.pharmacie_id),
                medicamentId: String(r.medicament_id),
                nom: r.medicament_nom,
                categorie: r.categorie,
                prix: r.prix,
                ordonnance: r.ordonnance,
                statut: r.statut,
            })),
        );
    } catch (error) {
        console.error('Erreur récupération stocks :', error);
        return next(createError(500, 'Impossible de récupérer les stocks'));
    }
}
