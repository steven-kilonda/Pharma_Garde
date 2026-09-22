import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import pool from "../utils/connectToDB.js";
import { initializeDatabase } from "../utils/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fichierJson = path.join(
  __dirname,
  "../data/pharmaGarde.json"
);

/*
|--------------------------------------------------------------------------
| Utilitaires
|--------------------------------------------------------------------------
*/

function convertirEntier(valeur, nomChamp, contexte) {
  const nombre = Number(valeur);

  if (!Number.isInteger(nombre)) {
    throw new Error(
      `[${contexte}] Le champ "${nomChamp}" doit être un entier. Valeur reçue : ${JSON.stringify(valeur)}`
    );
  }

  return nombre;
}

function convertirNombre(valeur, nomChamp, contexte) {
  const nombre = Number(valeur);

  if (!Number.isFinite(nombre)) {
    throw new Error(
      `[${contexte}] Le champ "${nomChamp}" doit être un nombre. Valeur reçue : ${JSON.stringify(valeur)}`
    );
  }

  return nombre;
}

function verifierChaine(valeur, nomChamp, contexte) {
  if (
    valeur === undefined ||
    valeur === null ||
    String(valeur).trim() === ""
  ) {
    throw new Error(
      `[${contexte}] Le champ "${nomChamp}" est obligatoire.`
    );
  }

  return String(valeur).trim();
}

function verifierTableau(valeur, nomChamp) {
  if (!Array.isArray(valeur)) {
    throw new Error(
      `Le champ "${nomChamp}" doit être un tableau.`
    );
  }

  return valeur;
}

/*
|--------------------------------------------------------------------------
| Lecture du JSON
|--------------------------------------------------------------------------
*/

async function chargerDonnees() {
  console.log("Lecture du fichier JSON...");

  try {
    const contenu = await fs.readFile(
      fichierJson,
      "utf-8"
    );

    const donnees = JSON.parse(contenu);

    if (!donnees || typeof donnees !== "object") {
      throw new Error(
        "Le contenu du fichier JSON est invalide."
      );
    }

    console.log(
      `Fichier JSON chargé : ${fichierJson}`
    );

    return donnees;
  } catch (error) {
    console.error(
      "Impossible de charger pharmaGarde.json :",
      error
    );

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| Validation générale
|--------------------------------------------------------------------------
*/

function validerStructureGenerale(data) {
  const champs = [
    "arrondissements",
    "pharmacies",
    "gardes",
    "medicaments",
    "stocks",
    "faq",
    "numerosUrgence",
    "signalements"
  ];

  for (const champ of champs) {
    if (!Array.isArray(data[champ])) {
      throw new Error(
        `Le champ "${champ}" est absent ou n'est pas un tableau.`
      );
    }
  }
}

/*
|--------------------------------------------------------------------------
| META
|--------------------------------------------------------------------------
*/

async function seedMeta(client, data) {
  console.log("\n[1/14] Insertion de meta...");

  if (!data.meta) {
    throw new Error(
      'Le champ "meta" est absent du JSON.'
    );
  }

  /*
   * On accepte :
   *
   * "meta": {
   *   "id": "1",
   *   ...
   * }
   *
   * ou :
   *
   * "meta": [
   *   {
   *     "id": "1",
   *     ...
   *   }
   * ]
   */
  const meta = Array.isArray(data.meta)
    ? data.meta[0]
    : data.meta;

  if (!meta || typeof meta !== "object") {
    throw new Error(
      'La structure "meta" est invalide.'
    );
  }

  console.log("Meta détectée :", meta);

  const id = convertirEntier(
    meta.id,
    "id",
    "meta"
  );

  const titre = verifierChaine(
    meta.titre,
    "titre",
    "meta"
  );

  const semaineDu = verifierChaine(
    meta.semaineDu,
    "semaineDu",
    "meta"
  );

  const semaineAu = verifierChaine(
    meta.semaineAu,
    "semaineAu",
    "meta"
  );

  await client.query(
    `
      INSERT INTO meta(
        id,
        titre,
        semaine_du,
        semaine_au,
        source,
        maj_le,
        note
      )
      VALUES($1,$2,$3,$4,$5,$6,$7)
    `,
    [
      id,
      titre,
      semaineDu,
      semaineAu,
      meta.source ?? null,
      meta.majLe ?? null,
      meta.note ?? null
    ]
  );

  console.log(
    `Meta #${id} insérée.`
  );
}

/*
|--------------------------------------------------------------------------
| ARRONDISSEMENTS
|--------------------------------------------------------------------------
*/

async function seedArrondissements(client, data) {
  console.log(
    "\n[2/14] Insertion des arrondissements..."
  );

  const arrondissements =
    verifierTableau(
      data.arrondissements,
      "arrondissements"
    );

  for (const arrondissement of arrondissements) {
    const contexte =
      `arrondissement #${arrondissement.id ?? "inconnu"}`;

    const id = convertirEntier(
      arrondissement.id,
      "id",
      contexte
    );

    const numero = convertirEntier(
      arrondissement.numero,
      "numero",
      contexte
    );

    const nom = verifierChaine(
      arrondissement.nom,
      "nom",
      contexte
    );

    await client.query(
      `
        INSERT INTO arrondissement(
          id,
          nom,
          numero
        )
        VALUES($1,$2,$3)
      `,
      [
        id,
        nom,
        numero
      ]
    );
  }

  console.log(
    `${arrondissements.length} arrondissement(s) inséré(s).`
  );
}

/*
|--------------------------------------------------------------------------
| SERVICES
|--------------------------------------------------------------------------
*/

async function obtenirOuCreerService(
  client,
  nomService
) {
  const nom = String(nomService).trim();

  const result = await client.query(
    `
      INSERT INTO service(nom)
      VALUES($1)
      ON CONFLICT(nom)
      DO UPDATE SET nom = EXCLUDED.nom
      RETURNING id
    `,
    [nom]
  );

  return result.rows[0].id;
}

async function seedServices(client, data) {
  console.log(
    "\n[3/14] Insertion des services..."
  );

  const services = new Set();

  for (const pharmacie of data.pharmacies) {
    if (!Array.isArray(pharmacie.services)) {
      throw new Error(
        `[pharmacie #${pharmacie.id}] Le champ "services" doit être un tableau.`
      );
    }

    for (const service of pharmacie.services) {
      const nom = verifierChaine(
        service,
        "service",
        `pharmacie #${pharmacie.id}`
      );

      services.add(nom);
    }
  }

  for (const nomService of services) {
    await obtenirOuCreerService(
      client,
      nomService
    );
  }

  console.log(
    `${services.size} service(s) inséré(s).`
  );
}

/*
|--------------------------------------------------------------------------
| MÉDICAMENTS
|--------------------------------------------------------------------------
*/

async function seedMedicaments(client, data) {
  console.log(
    "\n[4/14] Insertion des médicaments..."
  );

  const medicaments =
    verifierTableau(
      data.medicaments,
      "medicaments"
    );

  for (const medicament of medicaments) {
    const contexte =
      `medicament #${medicament.id ?? "inconnu"}`;

    const id = convertirEntier(
      medicament.id,
      "id",
      contexte
    );

    const nom = verifierChaine(
      medicament.nom,
      "nom",
      contexte
    );

    const categorie = verifierChaine(
      medicament.categorie,
      "categorie",
      contexte
    );

    const prix = convertirNombre(
      medicament.prix,
      "prix",
      contexte
    );

    const ordonnance =
      Boolean(medicament.ordonnance);

    await client.query(
      `
        INSERT INTO medicament(
          id,
          nom,
          categorie,
          prix,
          ordonnance
        )
        VALUES($1,$2,$3,$4,$5)
      `,
      [
        id,
        nom,
        categorie,
        prix,
        ordonnance
      ]
    );
  }

  console.log(
    `${medicaments.length} médicament(s) inséré(s).`
  );
}

/*
|--------------------------------------------------------------------------
| PHARMACIES
|--------------------------------------------------------------------------
*/

async function seedPharmacies(client, data) {
  console.log(
    "\n[5/14] Insertion des pharmacies..."
  );

  const pharmacies =
    verifierTableau(
      data.pharmacies,
      "pharmacies"
    );

  for (const pharmacie of pharmacies) {
    const contexte =
      `pharmacie #${pharmacie.id ?? "inconnu"}`;

    const id = convertirEntier(
      pharmacie.id,
      "id",
      contexte
    );

    const code = verifierChaine(
      pharmacie.code,
      "code",
      contexte
    );

    const nom = verifierChaine(
      pharmacie.nom,
      "nom",
      contexte
    );

    const arrondissementId =
      convertirEntier(
        pharmacie.arrondissementId,
        "arrondissementId",
        contexte
      );

    const latitude =
      pharmacie.latitude === null ||
      pharmacie.latitude === undefined
        ? null
        : convertirNombre(
            pharmacie.latitude,
            "latitude",
            contexte
          );

    const longitude =
      pharmacie.longitude === null ||
      pharmacie.longitude === undefined
        ? null
        : convertirNombre(
            pharmacie.longitude,
            "longitude",
            contexte
          );

    await client.query(
      `
        INSERT INTO pharmacie(
          id,
          code,
          nom,
          arrondissement_id,
          quartier,
          repere,
          latitude,
          longitude,
          garde_24h,
          verifiee_le
        )
        VALUES(
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
        )
      `,
      [
        id,
        code,
        nom,
        arrondissementId,
        pharmacie.quartier ?? null,
        pharmacie.repere ?? null,
        latitude,
        longitude,
        Boolean(pharmacie.garde24h),
        pharmacie.verifieeLe ?? null
      ]
    );
  }

  console.log(
    `${pharmacies.length} pharmacie(s) insérée(s).`
  );
}

/*
|--------------------------------------------------------------------------
| TÉLÉPHONES
|--------------------------------------------------------------------------
*/

async function seedTelephones(client, data) {
  console.log(
    "\n[6/14] Insertion des téléphones..."
  );

  let total = 0;

  for (const pharmacie of data.pharmacies) {
    const contexte =
      `pharmacie #${pharmacie.id}`;

    if (!Array.isArray(pharmacie.telephones)) {
      throw new Error(
        `[${contexte}] Le champ "telephones" doit être un tableau.`
      );
    }

    for (const numero of pharmacie.telephones) {
      const telephone = verifierChaine(
        numero,
        "numero",
        contexte
      );

      await client.query(
        `
          INSERT INTO pharmacie_telephone(
            pharmacie_id,
            numero
          )
          VALUES($1,$2)
        `,
        [
          Number(pharmacie.id),
          telephone
        ]
      );

      total++;
    }
  }

  console.log(
    `${total} téléphone(s) inséré(s).`
  );
}

/*
|--------------------------------------------------------------------------
| HORAIRES
|--------------------------------------------------------------------------
*/

const correspondanceJours = {
  lun: "lun",
  mar: "mar",
  mer: "mer",
  jeu: "jeu",
  ven: "ven",
  sam: "sam",
  dim: "dim"
};

async function seedHoraires(client, data) {
  console.log(
    "\n[7/14] Insertion des horaires..."
  );

  let total = 0;

  for (const pharmacie of data.pharmacies) {
    const contexte =
      `pharmacie #${pharmacie.id}`;

    if (
      !pharmacie.horaires ||
      typeof pharmacie.horaires !== "object"
    ) {
      throw new Error(
        `[${contexte}] Le champ "horaires" est obligatoire et doit être un objet.`
      );
    }

    for (const jour of Object.keys(
      correspondanceJours
    )) {
      const horaire =
        pharmacie.horaires[jour];

      /*
       * null = pharmacie fermée ce jour
       */
      if (horaire === null) {
        await client.query(
          `
            INSERT INTO pharmacie_horaire(
              pharmacie_id,
              jour,
              ouvert,
              heure_ouverture,
              heure_fermeture
            )
            VALUES($1,$2,$3,$4,$5)
          `,
          [
            Number(pharmacie.id),
            jour,
            false,
            null,
            null
          ]
        );

        total++;

        continue;
      }

      if (
        !Array.isArray(horaire) ||
        horaire.length !== 2
      ) {
        throw new Error(
          `[${contexte}][${jour}] L'horaire doit être null ou un tableau [heureOuverture, heureFermeture]. Valeur reçue : ${JSON.stringify(horaire)}`
        );
      }

      const heureOuverture =
        verifierChaine(
          horaire[0],
          "heure_ouverture",
          `${contexte} ${jour}`
        );

      const heureFermeture =
        verifierChaine(
          horaire[1],
          "heure_fermeture",
          `${contexte} ${jour}`
        );

      await client.query(
        `
          INSERT INTO pharmacie_horaire(
            pharmacie_id,
            jour,
            ouvert,
            heure_ouverture,
            heure_fermeture
          )
          VALUES($1,$2,$3,$4,$5)
        `,
        [
          Number(pharmacie.id),
          jour,
          true,
          heureOuverture,
          heureFermeture
        ]
      );

      total++;
    }
  }

  console.log(
    `${total} horaire(s) inséré(s).`
  );
}

/*
|--------------------------------------------------------------------------
| PHARMACIE - SERVICES
|--------------------------------------------------------------------------
*/

async function seedPharmacieServices(
  client,
  data
) {
  console.log(
    "\n[8/14] Insertion des relations pharmacie-service..."
  );

  let total = 0;

  for (const pharmacie of data.pharmacies) {
    for (const nomService of pharmacie.services) {
      const serviceId =
        await obtenirOuCreerService(
          client,
          nomService
        );

      await client.query(
        `
          INSERT INTO pharmacie_service(
            pharmacie_id,
            service_id
          )
          VALUES($1,$2)
          ON CONFLICT DO NOTHING
        `,
        [
          Number(pharmacie.id),
          serviceId
        ]
      );

      total++;
    }
  }

  console.log(
    `${total} relation(s) pharmacie-service insérée(s).`
  );
}

/*
|--------------------------------------------------------------------------
| GARDES
|--------------------------------------------------------------------------
*/

async function seedGardes(client, data) {
  console.log(
    "\n[9/14] Insertion des gardes..."
  );

  const gardes =
    verifierTableau(
      data.gardes,
      "gardes"
    );

  for (const garde of gardes) {
    const contexte =
      `garde #${garde.id ?? "inconnu"}`;

    const id = convertirEntier(
      garde.id,
      "id",
      contexte
    );

    const pharmacieId =
      convertirEntier(
        garde.pharmacieId,
        "pharmacieId",
        contexte
      );

    const debut = verifierChaine(
      garde.debut,
      "debut",
      contexte
    );

    const fin = verifierChaine(
      garde.fin,
      "fin",
      contexte
    );

    await client.query(
      `
        INSERT INTO garde(
          id,
          pharmacie_id,
          debut,
          fin
        )
        VALUES($1,$2,$3,$4)
      `,
      [
        id,
        pharmacieId,
        debut,
        fin
      ]
    );
  }

  console.log(
    `${gardes.length} garde(s) insérée(s).`
  );
}

/*
|--------------------------------------------------------------------------
| STOCKS
|--------------------------------------------------------------------------
*/

async function seedStocks(client, data) {
  console.log(
    "\n[10/14] Insertion des stocks..."
  );

  const stocks =
    verifierTableau(
      data.stocks,
      "stocks"
    );

  for (const stock of stocks) {
    const contexte =
      `stock #${stock.id ?? "inconnu"}`;

    const id = convertirEntier(
      stock.id,
      "id",
      contexte
    );

    const pharmacieId =
      convertirEntier(
        stock.pharmacieId,
        "pharmacieId",
        contexte
    );

    if (!Array.isArray(stock.medicaments)) {
      throw new Error(
        `[${contexte}] Le champ "medicaments" doit être un tableau.`
      );
    }

    if (!Array.isArray(stock.rupture)) {
      throw new Error(
        `[${contexte}] Le champ "rupture" doit être un tableau.`
      );
    }

    await client.query(
      `
        INSERT INTO stock(
          id,
          pharmacie_id
        )
        VALUES($1,$2)
      `,
      [
        id,
        pharmacieId
      ]
    );
  }

  console.log(
    `${stocks.length} stock(s) inséré(s).`
  );
}

/*
|--------------------------------------------------------------------------
| STOCK - MÉDICAMENTS
|--------------------------------------------------------------------------
*/

async function seedStockMedicaments(
  client,
  data
) {
  console.log(
    "\n[11/14] Insertion des médicaments dans les stocks..."
  );

  let total = 0;

  for (const stock of data.stocks) {
    const stockId =
      convertirEntier(
        stock.id,
        "id",
        `stock`
      );

    /*
     * Dans ton JSON réel :
     *
     * medicaments = disponibles
     * rupture     = ruptures
     */

    for (const medicamentId of stock.medicaments) {
      const idMedicament =
        convertirEntier(
          medicamentId,
          "medicamentId",
          `stock #${stockId}`
        );

      await client.query(
        `
          INSERT INTO stock_medicament(
            stock_id,
            medicament_id,
            statut
          )
          VALUES($1,$2,$3)
          ON CONFLICT(stock_id,medicament_id)
          DO UPDATE SET statut = EXCLUDED.statut
        `,
        [
          stockId,
          idMedicament,
          "disponible"
        ]
      );

      total++;
    }

    for (const medicamentId of stock.rupture) {
      const idMedicament =
        convertirEntier(
          medicamentId,
          "medicamentId",
          `stock #${stockId} rupture`
        );

      await client.query(
        `
          INSERT INTO stock_medicament(
            stock_id,
            medicament_id,
            statut
          )
          VALUES($1,$2,$3)
          ON CONFLICT(stock_id,medicament_id)
          DO UPDATE SET statut = EXCLUDED.statut
        `,
        [
          stockId,
          idMedicament,
          "rupture"
        ]
      );

      total++;
    }
  }

  console.log(
    `${total} relation(s) stock-médicament insérée(s).`
  );
}

/*
|--------------------------------------------------------------------------
| FAQ
|--------------------------------------------------------------------------
*/

async function seedFaq(client, data) {
  console.log(
    "\n[12/14] Insertion des FAQ..."
  );

  const faq =
    verifierTableau(
      data.faq,
      "faq"
    );

  for (const element of faq) {
    const contexte =
      `FAQ #${element.id ?? "inconnue"}`;

    const id = convertirEntier(
      element.id,
      "id",
      contexte
    );

    const categorie =
      verifierChaine(
        element.categorie,
        "categorie",
        contexte
      );

    const question =
      verifierChaine(
        element.question,
        "question",
        contexte
      );

    const reponse =
      verifierChaine(
        element.reponse,
        "reponse",
        contexte
      );

    await client.query(
      `
        INSERT INTO faq(
          id,
          categorie,
          question,
          reponse
        )
        VALUES($1,$2,$3,$4)
      `,
      [
        id,
        categorie,
        question,
        reponse
      ]
    );
  }

  console.log(
    `${faq.length} FAQ insérée(s).`
  );
}

/*
|--------------------------------------------------------------------------
| NUMÉROS D'URGENCE
|--------------------------------------------------------------------------
*/

async function seedNumerosUrgence(
  client,
  data
) {
  console.log(
    "\n[13/14] Insertion des numéros d'urgence..."
  );

  const numeros =
    verifierTableau(
      data.numerosUrgence,
      "numerosUrgence"
    );

  for (const urgence of numeros) {
    const contexte =
      `urgence #${urgence.id ?? "inconnue"}`;

    const id = convertirEntier(
      urgence.id,
      "id",
      contexte
    );

    /*
     * Ton JSON utilise "label".
     *
     * La base utilise "nom".
     */
    const nom = verifierChaine(
      urgence.label,
      "label",
      contexte
    );

    const numero = verifierChaine(
      urgence.numero,
      "numero",
      contexte
    );

    await client.query(
      `
        INSERT INTO numero_urgence(
          id,
          nom,
          numero,
          description
        )
        VALUES($1,$2,$3,$4)
      `,
      [
        id,
        nom,
        numero,
        urgence.description ?? null
      ]
    );
  }

  console.log(
    `${numeros.length} numéro(s) d'urgence inséré(s).`
  );
}

/*
|--------------------------------------------------------------------------
| SIGNALEMENTS
|--------------------------------------------------------------------------
*/

async function seedSignalements(
  client,
  data
) {
  console.log(
    "\n[14/14] Insertion des signalements..."
  );

  const signalements =
    verifierTableau(
      data.signalements,
      "signalements"
    );

  if (signalements.length === 0) {
    console.log(
      "Aucun signalement à insérer."
    );

    return;
  }

  let total = 0;

  for (const signalement of signalements) {
    const contexte =
      `signalement #${signalement.id ?? "nouveau"}`;

    const pharmacieId =
      signalement.pharmacieId === null ||
      signalement.pharmacieId === undefined ||
      signalement.pharmacieId === ""
        ? null
        : convertirEntier(
            signalement.pharmacieId,
            "pharmacieId",
            contexte
          );

    const type = verifierChaine(
      signalement.type,
      "type",
      contexte
    );

    const message = verifierChaine(
      signalement.message,
      "message",
      contexte
    );

    await client.query(
      `
        INSERT INTO signalement(
          pharmacie_id,
          type,
          message,
          nom,
          telephone,
          statut,
          created_at,
          updated_at
        )
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        pharmacieId,
        type,
        message,
        signalement.nom ?? null,
        signalement.telephone ?? null,
        signalement.statut ?? "nouveau",
        signalement.createdAt
          ? new Date(signalement.createdAt)
          : new Date(),
        signalement.updatedAt
          ? new Date(signalement.updatedAt)
          : null
      ]
    );

    total++;
  }

  console.log(
    `${total} signalement(s) inséré(s).`
  );
}

/*
|--------------------------------------------------------------------------
| SÉQUENCES
|--------------------------------------------------------------------------
*/

async function reinitialiserSequences(client) {
  console.log(
    "\nRéinitialisation des séquences PostgreSQL..."
  );

  const tables = [
    "meta",
    "arrondissement",
    "pharmacie",
    "pharmacie_telephone",
    "service",
    "pharmacie_horaire",
    "garde",
    "medicament",
    "stock",
    "faq",
    "numero_urgence",
    "signalement"
  ];

  for (const table of tables) {
    const result = await client.query(
      `SELECT COALESCE(MAX(id), 0) AS maximum FROM ${table}`
    );

    const maximum =
      Number(result.rows[0].maximum);

    const sequenceResult =
      await client.query(
        `
          SELECT pg_get_serial_sequence(
            $1,
            'id'
          ) AS sequence
        `,
        [table]
      );

    const sequence =
      sequenceResult.rows[0].sequence;

    if (!sequence) {
      continue;
    }

    if (maximum === 0) {
      await client.query(
        `SELECT setval($1, 1, false)`,
        [sequence]
      );
    } else {
      await client.query(
        `SELECT setval($1, $2, true)`,
        [
          sequence,
          maximum
        ]
      );
    }
  }

  console.log(
    "Séquences réinitialisées."
  );
}

/*
|--------------------------------------------------------------------------
| VÉRIFICATION FINALE
|--------------------------------------------------------------------------
*/

async function afficherResume(client) {
  console.log(
    "\n========================================"
  );
  console.log(
    "        RÉSUMÉ DU SEED"
  );
  console.log(
    "========================================"
  );

  const tables = [
    "meta",
    "arrondissement",
    "pharmacie",
    "pharmacie_telephone",
    "service",
    "pharmacie_service",
    "pharmacie_horaire",
    "garde",
    "medicament",
    "stock",
    "stock_medicament",
    "faq",
    "numero_urgence",
    "signalement"
  ];

  for (const table of tables) {
    const result = await client.query(
      `SELECT COUNT(*)::INTEGER AS total FROM ${table}`
    );

    console.log(
      `${table.padEnd(25, " ")} : ${result.rows[0].total}`
    );
  }

  console.log(
    "========================================"
  );
}

/*
|--------------------------------------------------------------------------
| NETTOYAGE
|--------------------------------------------------------------------------
*/

async function nettoyerBase(client) {
  console.log(
    "\nNettoyage de la base..."
  );

  await client.query(`
    TRUNCATE TABLE
      signalement,
      numero_urgence,
      faq,
      stock_medicament,
      stock,
      medicament,
      garde,
      pharmacie_horaire,
      pharmacie_service,
      service,
      pharmacie_telephone,
      pharmacie,
      arrondissement,
      meta
    RESTART IDENTITY CASCADE
  `);

  console.log(
    "Base nettoyée."
  );
}

/*
|--------------------------------------------------------------------------
| SEED PRINCIPAL
|--------------------------------------------------------------------------
*/

async function seed() {
  let client = null;

  try {
    console.log(
      "========================================"
    );

    console.log(
      "     SEED PHARMAGARDE POINTE-NOIRE"
    );

    console.log(
      "========================================"
    );

    /*
     * Création des tables si nécessaire.
     */
    await initializeDatabase();

    /*
     * Lecture du JSON.
     */
    const data =
      await chargerDonnees();

    /*
     * Validation de la structure générale.
     */
    validerStructureGenerale(data);

    /*
     * Connexion dédiée à la transaction.
     */
    client =
      await pool.connect();

    /*
     * Transaction.
     */
    await client.query("BEGIN");

    /*
     * Nettoyage.
     */
    await nettoyerBase(client);

    /*
     * Ordre d'insertion.
     */
    await seedMeta(
      client,
      data
    );

    await seedArrondissements(
      client,
      data
    );

    await seedServices(
      client,
      data
    );

    await seedMedicaments(
      client,
      data
    );

    await seedPharmacies(
      client,
      data
    );

    await seedTelephones(
      client,
      data
    );

    await seedHoraires(
      client,
      data
    );

    await seedPharmacieServices(
      client,
      data
    );

    await seedGardes(
      client,
      data
    );

    await seedStocks(
      client,
      data
    );

    await seedStockMedicaments(
      client,
      data
    );

    await seedFaq(
      client,
      data
    );

    await seedNumerosUrgence(
      client,
      data
    );

    await seedSignalements(
      client,
      data
    );

    /*
     * Mise à jour des séquences.
     */
    await reinitialiserSequences(
      client
    );

    /*
     * Vérification.
     */
    await afficherResume(
      client
    );

    /*
     * Validation.
     */
    await client.query("COMMIT");

    console.log(
      "\n========================================"
    );

    console.log(
      "       SEED TERMINÉ AVEC SUCCÈS"
    );

    console.log(
      "========================================\n"
    );
  } catch (error) {
    /*
     * Annulation complète de la transaction.
     */
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Erreur lors du ROLLBACK :",
          rollbackError
        );
      }
    }

    console.error(
      "\n========================================"
    );

    console.error(
      "             ÉCHEC DU SEED"
    );

    console.error(
      "========================================"
    );

    console.error(
      error.message
    );

    if (error.code) {
      console.error(
        `Code PostgreSQL : ${error.code}`
      );
    }

    if (error.detail) {
      console.error(
        `Détail : ${error.detail}`
      );
    }

    console.error(
      "========================================\n"
    );

    process.exitCode = 1;
  } finally {
    if (client) {
      client.release();
    }

    await pool.end();
  }
}

/*
|--------------------------------------------------------------------------
| Exécution
|--------------------------------------------------------------------------
*/

seed();