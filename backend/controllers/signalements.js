import { query } from '../utils/connectToDB.js';
import {
    createSignalementQuery,
    getAllPharmaciesQuery,
} from '../utils/sqlQuery.js';
import { createError } from '../utils/error.js';

const TYPES = [
    'hors_ligne',
    'infos_erronees',
    'erreur_prix',
    'officine_absente',
    'autre',
];
const clean = (v) => (typeof v === 'string' ? v.trim().slice(0, 2000) : '');

// POST /api/signalements — formulaire public
export async function createSignalement(req, res, next) {
    try {
        const { type, message, nom, telephone, pharmacieId } = req.body ?? {};

        if (!TYPES.includes(type)) {
            return next(createError(400, 'Type de signalement invalide'));
        }
        const msg = clean(message);
        if (msg.length < 10) {
            return next(
                createError(
                    400,
                    'Décrivez le problème en quelques mots (10 caractères minimum)',
                ),
            );
        }
        const tel = clean(telephone);
        if (tel && !/^[+0-9 ()\-.]{6,20}$/.test(tel)) {
            return next(createError(400, 'Numéro de téléphone invalide'));
        }
        const nomPropre = clean(nom) || null;
        if (nomPropre && nomPropre.length > 255) {
            return next(createError(400, 'Nom trop long'));
        }
        const pid = pharmacieId ? String(pharmacieId) : null;

        const { rows } = await query(createSignalementQuery, [
            pid,
            type,
            msg,
            nomPropre,
            tel || null,
        ]);
        return res.status(201).json({
            message: 'Signalement reçu — merci, il sera traité rapidement.',
            signalement: rows[0],
        });
    } catch (error) {
        if (error.code === '23503') {
            return next(
                createError(400, "La pharmacie mentionnée n'existe pas"),
            );
        }
        console.error('Erreur création signalement :', error);
        return next(
            createError(500, "Impossible d'enregistrer le signalement"),
        );
    }
}
