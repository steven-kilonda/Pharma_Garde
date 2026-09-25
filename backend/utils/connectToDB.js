import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

pg.types.setTypeParser(1082, (v) => v);

// Load fallback in-memory dataset from pharmaGarde.json
let inMemoryData = null;
function getInMemoryData() {
    if (!inMemoryData) {
        try {
            const dataFilePath = path.join(
                __dirname,
                '..',
                'data',
                'pharmaGarde.json',
            );
            if (fs.existsSync(dataFilePath)) {
                inMemoryData = JSON.parse(
                    fs.readFileSync(dataFilePath, 'utf8'),
                );
            } else {
                inMemoryData = {
                    meta: [],
                    arrondissements: [],
                    pharmacies: [],
                    gardes: [],
                    medicaments: [],
                    stocks: [],
                    faq: [],
                    numerosUrgence: [],
                    signalements: [],
                };
            }
        } catch (e) {
            console.warn('Failed to read pharmaGarde.json:', e);
            inMemoryData = {
                meta: [],
                arrondissements: [],
                pharmacies: [],
                gardes: [],
                medicaments: [],
                stocks: [],
                faq: [],
                numerosUrgence: [],
                signalements: [],
            };
        }
    }
    return inMemoryData;
}

// In-memory query simulator for when PostgreSQL is not configured
function executeMockQuery(text, params = []) {
    const data = getInMemoryData();
    const sql = (text || '').trim();
    const lowerSql = sql.toLowerCase();

    // DDL & Transaction commands (BEGIN, COMMIT, ROLLBACK, CREATE, ALTER, DROP, TRUNCATE, SELECT setval)
    if (
        lowerSql.startsWith('begin') ||
        lowerSql.startsWith('commit') ||
        lowerSql.startsWith('rollback') ||
        lowerSql.startsWith('create ') ||
        lowerSql.startsWith('alter ') ||
        lowerSql.startsWith('drop ') ||
        lowerSql.startsWith('truncate ') ||
        lowerSql.startsWith('select setval')
    ) {
        return { rows: [], rowCount: 0 };
    }

    // META
    if (lowerSql.includes('from meta')) {
        const metaList = data.meta || [];
        const rows = metaList.map((m) => ({
            id: m.id,
            titre: m.titre,
            semaine_du: m.semaineDu,
            semaine_au: m.semaineAu,
            source: m.source,
            maj_le: m.majLe,
            note: m.note,
        }));
        return { rows, rowCount: rows.length };
    }

    // ARRONDISSEMENTS
    if (lowerSql.includes('from arrondissement')) {
        const arrList = data.arrondissements || [];
        if (lowerSql.includes('where id = $1')) {
            const match = arrList.find(
                (a) => String(a.id) === String(params[0]),
            );
            const rows = match
                ? [
                      {
                          id: Number(match.id),
                          nom: match.nom,
                          numero: Number(match.numero),
                      },
                  ]
                : [];
            return { rows, rowCount: rows.length };
        }
        const rows = arrList.map((a) => ({
            id: Number(a.id),
            nom: a.nom,
            numero: Number(a.numero),
        }));
        return { rows, rowCount: rows.length };
    }

    if (lowerSql.startsWith('insert into arrondissement')) {
        const arrList = data.arrondissements || [];
        const newId =
            (arrList.length
                ? Math.max(...arrList.map((a) => Number(a.id) || 0))
                : 0) + 1;
        const newArr = {
            id: String(newId),
            nom: params[0],
            numero: params[1] !== undefined ? String(params[1]) : String(newId),
        };
        arrList.push(newArr);
        const row = {
            id: newId,
            nom: newArr.nom,
            numero: Number(newArr.numero),
        };
        return { rows: [row], rowCount: 1 };
    }

    if (lowerSql.startsWith('update arrondissement')) {
        const arrList = data.arrondissements || [];
        const id = params[2];
        const match = arrList.find((a) => String(a.id) === String(id));
        if (match) {
            if (params[0] !== null && params[0] !== undefined)
                match.nom = params[0];
            if (params[1] !== null && params[1] !== undefined)
                match.numero = params[1];
            const row = {
                id: Number(match.id),
                nom: match.nom,
                numero: Number(match.numero),
            };
            return { rows: [row], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
    }

    if (lowerSql.startsWith('delete from arrondissement')) {
        const arrList = data.arrondissements || [];
        const id = params[0];
        const idx = arrList.findIndex((a) => String(a.id) === String(id));
        if (idx !== -1) {
            const removed = arrList.splice(idx, 1)[0];
            return {
                rows: [
                    {
                        id: Number(removed.id),
                        nom: removed.nom,
                        numero: Number(removed.numero),
                    },
                ],
                rowCount: 1,
            };
        }
        return { rows: [], rowCount: 0 };
    }

    // PHARMACIES
    if (lowerSql.includes('from pharmacie')) {
        const pharmaList = data.pharmacies || [];

        const formatPharmaRow = (p) => ({
            id: p.id,
            code: p.code,
            nom: p.nom,
            arrondissement_id: p.arrondissementId,
            quartier: p.quartier,
            repere: p.repere,
            latitude: p.latitude !== undefined ? p.latitude : null,
            longitude: p.longitude !== undefined ? p.longitude : null,
            garde_24h: Boolean(p.garde24h),
            verifiee_le: p.verifieeLe || null,
            telephones: p.telephones || [],
            horaires: p.horaires || {},
            services: p.services || [],
        });

        if (
            lowerSql.includes('where p.id = $1') ||
            lowerSql.includes('where id = $1')
        ) {
            const match = pharmaList.find(
                (p) =>
                    String(p.id) === String(params[0]) ||
                    String(p.code) === String(params[0]),
            );
            const rows = match ? [formatPharmaRow(match)] : [];
            return { rows, rowCount: rows.length };
        }

        const rows = pharmaList.map(formatPharmaRow);
        return { rows, rowCount: rows.length };
    }

    if (lowerSql.startsWith('insert into pharmacie')) {
        const pharmaList = data.pharmacies || [];
        const newId =
            (pharmaList.length
                ? Math.max(...pharmaList.map((p) => Number(p.id) || 0))
                : 0) + 1;
        const newPharma = {
            id: String(newId),
            code: params[0],
            nom: params[1],
            arrondissementId: params[2],
            quartier: params[3],
            repere: params[4],
            latitude: params[5],
            longitude: params[6],
            garde24h: params[7],
            verifieeLe: params[8],
            telephones: [],
            horaires: {},
            services: [],
        };
        pharmaList.push(newPharma);
        return {
            rows: [
                {
                    id: newId,
                    code: newPharma.code,
                    nom: newPharma.nom,
                    arrondissement_id: newPharma.arrondissementId,
                    quartier: newPharma.quartier,
                    repere: newPharma.repere,
                    latitude: newPharma.latitude,
                    longitude: newPharma.longitude,
                    garde_24h: newPharma.garde24h,
                    verifiee_le: newPharma.verifieeLe,
                },
            ],
            rowCount: 1,
        };
    }

    // GARDES
    if (lowerSql.includes('from garde')) {
        const gardesList = data.gardes || [];
        const formatGarde = (g) => ({
            id: g.id,
            pharmacie_id: g.pharmacieId,
            debut: g.debut,
            fin: g.fin,
        });

        if (lowerSql.includes('debut <=') || lowerSql.includes('actives')) {
            const targetDate =
                params[0] || new Date().toISOString().slice(0, 10);
            let rows = gardesList
                .filter((g) => g.debut <= targetDate && g.fin >= targetDate)
                .map(formatGarde);

            // If no gardes matched the exact date, return all gardes as fallback so the UI remains useful
            if (rows.length === 0) {
                rows = gardesList.map(formatGarde);
            }
            return { rows, rowCount: rows.length };
        }

        const rows = gardesList.map(formatGarde);
        return { rows, rowCount: rows.length };
    }

    // MEDICAMENTS
    if (lowerSql.includes('from medicament')) {
        const medList = data.medicaments || [];
        if (lowerSql.includes('where id = $1')) {
            const match = medList.find(
                (m) => String(m.id) === String(params[0]),
            );
            const rows = match ? [match] : [];
            return { rows, rowCount: rows.length };
        }
        return { rows: medList, rowCount: medList.length };
    }

    // STOCKS
    if (lowerSql.includes('from stock')) {
        const stockList = data.stocks || [];
        const medList = data.medicaments || [];
        const medMap = new Map(medList.map((m) => [String(m.id), m]));

        const rows = [];
        for (const st of stockList) {
            const pId = String(st.pharmacieId);
            for (const mId of st.medicaments || []) {
                const med = medMap.get(String(mId));
                if (med) {
                    rows.push({
                        pharmacie_id: pId,
                        medicament_id: String(mId),
                        medicament_nom: med.nom,
                        categorie: med.categorie,
                        prix: med.prix,
                        ordonnance: med.ordonnance,
                        statut: 'disponible',
                    });
                }
            }
            for (const mId of st.rupture || []) {
                const med = medMap.get(String(mId));
                if (med) {
                    rows.push({
                        pharmacie_id: pId,
                        medicament_id: String(mId),
                        medicament_nom: med.nom,
                        categorie: med.categorie,
                        prix: med.prix,
                        ordonnance: med.ordonnance,
                        statut: 'rupture',
                    });
                }
            }
        }
        return { rows, rowCount: rows.length };
    }

    // NUMEROS D'URGENCE
    if (lowerSql.includes('from numero_urgence')) {
        const numList = data.numerosUrgence || [];
        const rows = numList.map((n) => ({
            id: Number(n.id),
            nom: n.label || n.nom,
            numero: n.numero,
            description: n.description,
        }));
        return { rows, rowCount: rows.length };
    }

    // FAQ
    if (lowerSql.includes('from faq')) {
        const faqList = data.faq || [];
        const rows = faqList.map((f, i) => ({
            id: Number(f.id || i + 1),
            question: f.question,
            reponse: f.reponse,
            categorie: f.categorie,
            ordre: f.ordre || i + 1,
        }));
        return { rows, rowCount: rows.length };
    }

    // SIGNALEMENTS
    if (lowerSql.startsWith('insert into signalement')) {
        data.signalements = data.signalements || [];
        const newId = data.signalements.length + 1;
        const newSig = {
            id: newId,
            pharmacie_id: params[0] || null,
            type: params[1],
            message: params[2],
            nom: params[3] || null,
            telephone: params[4] || null,
            date_creation: new Date().toISOString(),
        };
        data.signalements.push(newSig);
        return { rows: [newSig], rowCount: 1 };
    }

    // Default fallback for any other query
    return { rows: [], rowCount: 0 };
}

// Database client abstraction supporting both real PostgreSQL and in-memory mock
let realPool = null;
const hasPgConfig = Boolean(
    process.env.DATABASE_URL ||
    (process.env.PG_HOST && process.env.PG_USER && process.env.PG_DATABASE),
);

if (hasPgConfig) {
    try {
        const config = process.env.DATABASE_URL
            ? { connectionString: process.env.DATABASE_URL }
            : {
                  user: process.env.PG_USER,
                  host: process.env.PG_HOST,
                  database: process.env.PG_DATABASE,
                  password: process.env.PG_PASSWORD,
                  port: process.env.PG_PORT
                      ? Number(process.env.PG_PORT)
                      : 5432,
              };

        realPool = new pg.Pool(config);

        realPool.on('error', (err) => {
            console.warn(
                'PostgreSQL pool error — falling back to mock:',
                err.message,
            );
        });

        realPool
            .connect()
            .then((client) => {
                client.release();
                console.log('Connexion à la base de données réussie');
            })
            .catch((err) => {
                console.warn(
                    'Impossible de se connecter à PostgreSQL — mode in-memory activé :',
                    err.message,
                );
                realPool = null;
            });
    } catch (err) {
        console.warn(
            'Error initializing PostgreSQL — mode in-memory activé :',
            err.message,
        );
        realPool = null;
    }
} else {
    console.log(
        'PostgreSQL non configuré — chargement des données depuis backend/data/pharmaGarde.json',
    );
}

export const query = async (text, params) => {
    if (realPool) {
        try {
            return await realPool.query(text, params);
        } catch (err) {
            console.warn(
                'PostgreSQL query failed, attempting mock fallback:',
                err.message,
            );
            return executeMockQuery(text, params);
        }
    }
    return executeMockQuery(text, params);
};

const mockClient = {
    query: async (text, params) => executeMockQuery(text, params),
    release: () => {},
};

const db = {
    query: (text, params) => query(text, params),
    connect: async () => {
        if (realPool) {
            try {
                return await realPool.connect();
            } catch (err) {
                console.warn(
                    'Pool connect failed, using mock client:',
                    err.message,
                );
            }
        }
        return mockClient;
    },
    on: (event, handler) => {
        if (realPool) realPool.on(event, handler);
    },
    end: async () => {
        if (realPool) {
            try {
                await realPool.end();
            } catch (err) {
                console.warn(
                    'Erreur lors de la fermeture du pool:',
                    err.message,
                );
            }
        }
    },
};

export default db;
