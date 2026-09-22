/* seed/seed.js — charge backend/data/pharmaGarde.json dans PostgreSQL. Réexécutable. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool, { query } from '../utils/connectToDB.js';
import { initializeDatabase } from '../utils/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const realigner = (table) =>
    query(
        `SELECT setval(pg_get_serial_sequence('${table}','id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`,
    );

async function main() {
    await initializeDatabase();
    
    const data = JSON.parse(
        await readFile(
            path.join(__dirname, '..', 'data', 'pharmaGarde.json'),
            'utf8',
        ),
    );

    console.log('Nettoyage des tables...');
    await query(`TRUNCATE TABLE
    meta, arrondissement, pharmacie, pharmacie_telephone, pharmacie_horaire,
    service, pharmacie_service, garde, medicament, stock, stock_medicament,
    faq, numero_urgence, signalement
    RESTART IDENTITY CASCADE`);

    const m = data.meta[0];
    await query(
        `INSERT INTO meta(titre, semaine_du, semaine_au, source, maj_le, note) VALUES($1,$2,$3,$4,$5,$6)`,
        [m.titre, m.semaineDu, m.semaineAu, m.source, m.majLe, m.note],
    );

    for (const a of data.arrondissements)
        await query(
            `INSERT INTO arrondissement(id, nom, numero) VALUES($1,$2,$3)`,
            [a.id, a.nom, a.numero],
        );
    await realigner('arrondissement');
    console.log('meta + arrondissements OK');

    for (const p of data.pharmacies) {
        await query(
            `INSERT INTO pharmacie(id, code, nom, arrondissement_id, quartier, repere, latitude, longitude, garde_24h, verifiee_le)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
                p.id,
                p.code,
                p.nom,
                p.arrondissementId,
                p.quartier ?? null,
                p.repere ?? null,
                p.latitude ?? null,
                p.longitude ?? null,
                p.garde24h ?? false,
                p.verifieeLe ?? null,
            ],
        );
        for (const tel of p.telephones ?? [])
            await query(
                `INSERT INTO pharmacie_telephone(pharmacie_id, numero) VALUES($1,$2)`,
                [p.id, tel],
            );
        for (const [jour, h] of Object.entries(p.horaires ?? {})) {
            if (h === null)
                await query(
                    `INSERT INTO pharmacie_horaire(pharmacie_id, jour, ouvert) VALUES($1,$2,FALSE)`,
                    [p.id, jour],
                );
            else
                await query(
                    `INSERT INTO pharmacie_horaire(pharmacie_id, jour, ouvert, heure_ouverture, heure_fermeture) VALUES($1,$2,TRUE,$3,$4)`,
                    [p.id, jour, h[0], h[1]],
                );
        }
        for (const nom of p.services ?? []) {
            const { rows } = await query(
                `INSERT INTO service(nom) VALUES($1) ON CONFLICT(nom) DO UPDATE SET nom = EXCLUDED.nom RETURNING id`,
                [nom],
            );
            await query(
                `INSERT INTO pharmacie_service(pharmacie_id, service_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
                [p.id, rows[0].id],
            );
        }
    }
    await realigner('pharmacie');
    console.log('pharmacies OK');

    for (const g of data.gardes)
        await query(
            `INSERT INTO garde(pharmacie_id, debut, fin) VALUES($1,$2,$3)`,
            [g.pharmacieId, g.debut, g.fin],
        );
    console.log('gardes OK');

    for (const med of data.medicaments)
        await query(
            `INSERT INTO medicament(id, nom, categorie, prix, ordonnance) VALUES($1,$2,$3,$4,$5)`,
            [med.id, med.nom, med.categorie, med.prix, med.ordonnance],
        );
    await realigner('medicament');
    console.log('medicaments OK');

    for (const s of data.stocks) {
        const { rows } = await query(
            `INSERT INTO stock(pharmacie_id) VALUES($1) RETURNING id`,
            [s.pharmacieId],
        );
        for (const id of s.medicaments ?? [])
            await query(
                `INSERT INTO stock_medicament(stock_id, medicament_id, statut) VALUES($1,$2,'disponible')`,
                [rows[0].id, id],
            );
        for (const id of s.rupture ?? [])
            await query(
                `INSERT INTO stock_medicament(stock_id, medicament_id, statut) VALUES($1,$2,'rupture')`,
                [rows[0].id, id],
            );
    }
    console.log('stocks OK');

    for (const f of data.faq)
        await query(
            `INSERT INTO faq(categorie, question, reponse) VALUES($1,$2,$3)`,
            [f.categorie, f.question, f.reponse],
        );
    for (const n of data.numerosUrgence)
        await query(
            `INSERT INTO numero_urgence(nom, numero, description) VALUES($1,$2,$3)`,
            [n.label, n.numero, n.description],
        );
    console.log('faq + urgences OK — seed terminé.');
}

main()
    .catch((e) => {
        console.error('Échec du seed :', e.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
