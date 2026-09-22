import pool, { query } from "../utils/connectToDB.js";

import {
  createPharmacieQuery,
  createPharmacieTelephoneQuery,
  createPharmacieHoraireQuery,
  createServiceQuery,
  createPharmacieServiceQuery,
  getAllPharmaciesQuery,
  getPharmacieQuery,
  updatePharmacieQuery,
  deletePharmacieQuery,
  countPharmaciesQuery
} from "../utils/sqlQuery.js";

import { createError } from "../utils/error.js";

// FORMATAGE D'UNE PHARMACIE //
function formatPharmacie(pharmacie) {
  return {
    id: String(pharmacie.id),

    code: pharmacie.code,

    nom: pharmacie.nom,

    arrondissementId: pharmacie.arrondissement_id,

    quartier: pharmacie.quartier,

    repere: pharmacie.repere,

    telephones: pharmacie.telephones || [],

    latitude:
      pharmacie.latitude !== null && pharmacie.latitude !== undefined
        ? Number(pharmacie.latitude)
        : null,

    longitude:
      pharmacie.longitude !== null && pharmacie.longitude !== undefined
        ? Number(pharmacie.longitude)
        : null,

    garde24h: pharmacie.garde_24h,

    horaires: pharmacie.horaires || {},

    services: pharmacie.services || [],

    verifieeLe: pharmacie.verifiee_le,
  };
}

// GET : TOUTES LES PHARMACIES //
export async function getAllPharmacies(req, res, next) {
  try {
    // Page demandée
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    // Nombre de résultats par page
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );

    // Calcul de l'offset
    const offset = (page - 1) * limit;

    // Récupération des pharmacies
    const { rows } = await query(getAllPharmaciesQuery, [limit, offset]);

    // Nombre total de pharmacies
    const { rows: countRows } = await query(countPharmaciesQuery);

    const total = parseInt(countRows[0].total, 10);

    // Nombre total de pages
    const totalPages = Math.ceil(total / limit);

    // Formatage
    const pharmacies = rows.map(formatPharmacie);

    return res.status(200).json({
      data: pharmacies,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Erreur récupération pharmacies :", error);

    return next(createError(500, "Impossible de récupérer les pharmacies"));
  }
}

// GET : PHARMACIE PAR ID //
export async function getPharmacie(req, res, next) {
  try {
    const { id } = req.params;

    const { rows } = await query(getPharmacieQuery, [id]);

    if (!rows.length) {
      return next(createError(404, "Pharmacie non trouvée"));
    }

    return res.status(200).json(formatPharmacie(rows[0]));
  } catch (error) {
    console.error("Erreur récupération pharmacie :", error);

    return next(createError(500, "Impossible de récupérer la pharmacie"));
  }
}

// CREATE : PHARMACIE //
export async function createPharmacie(req, res, next) {
  const client = await pool.connect();

  try {
    const {
      code,
      nom,
      arrondissementId,
      quartier,
      repere,
      telephones,
      latitude,
      longitude,
      garde24h,
      horaires,
      services,
      verifieeLe,
    } = req.body;

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!code || !nom || !arrondissementId) {
      return res.status(400).json({
        error: "Le code, le nom et l'arrondissement sont obligatoires",
      });
    }

    // =====================================================
    // NORMALISATION
    // =====================================================

    const listeTelephones = Array.isArray(telephones) ? telephones : [];

    const listeServices = Array.isArray(services) ? services : [];

    const listeHoraires =
      horaires && typeof horaires === "object" && !Array.isArray(horaires)
        ? horaires
        : {};

    // =====================================================
    // VERIFICATION ARRONDISSEMENT
    // =====================================================

    const arrondissementResult = await client.query(
      `
          SELECT id
          FROM arrondissement
          WHERE id = $1
        `,
      [arrondissementId],
    );

    if (!arrondissementResult.rows.length) {
      return res.status(400).json({
        error: "L'arrondissement sélectionné n'existe pas",
      });
    }

    // =====================================================
    // DEBUT TRANSACTION
    // =====================================================

    await client.query("BEGIN");

    // =====================================================
    // CREATION PHARMACIE
    // =====================================================

    const pharmacieResult = await client.query(createPharmacieQuery, [
      code,
      nom,
      arrondissementId,
      quartier || null,
      repere || null,
      latitude !== undefined ? latitude : null,
      longitude !== undefined ? longitude : null,
      garde24h ?? false,
      verifieeLe || null,
    ]);

    const pharmacie = pharmacieResult.rows[0];

    const pharmacieId = pharmacie.id;

    // =====================================================
    // TELEPHONES
    // =====================================================

    for (const numero of listeTelephones) {
      if (!numero) {
        continue;
      }

      await client.query(createPharmacieTelephoneQuery, [pharmacieId, numero]);
    }

    // =====================================================
    // HORAIRES
    // =====================================================

    for (const [jour, horaire] of Object.entries(listeHoraires)) {
      // Jour fermé
      if (horaire === null) {
        await client.query(createPharmacieHoraireQuery, [
          pharmacieId,
          jour,
          false,
          null,
          null,
        ]);

        continue;
      }

      // Horaire invalide
      if (!Array.isArray(horaire) || horaire.length !== 2) {
        continue;
      }

      const [heureOuverture, heureFermeture] = horaire;

      if (!heureOuverture || !heureFermeture) {
        continue;
      }

      await client.query(createPharmacieHoraireQuery, [
        pharmacieId,
        jour,
        true,
        heureOuverture,
        heureFermeture,
      ]);
    }

    // =====================================================
    // SERVICES
    // =====================================================

    for (const nomService of listeServices) {
      if (!nomService) {
        continue;
      }

      const serviceResult = await client.query(createServiceQuery, [
        nomService,
      ]);

      const service = serviceResult.rows[0];

      await client.query(createPharmacieServiceQuery, [
        pharmacieId,
        service.id,
      ]);
    }

    // =====================================================
    // VALIDATION TRANSACTION
    // =====================================================

    await client.query("COMMIT");

    // =====================================================
    // RECUPERATION COMPLETE
    // =====================================================

    const result = await client.query(getPharmacieQuery, [pharmacieId]);

    return res.status(201).json(formatPharmacie(result.rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Erreur création pharmacie :", error);

    return next(createError(400, error.message));
  } finally {
    client.release();
  }
}

// UPDATE : PHARMACIE //
export async function updatePharmacie(req, res, next) {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const {
      code,
      nom,
      arrondissementId,
      quartier,
      repere,
      telephones,
      latitude,
      longitude,
      garde24h,
      horaires,
      services,
      verifieeLe,
    } = req.body;

    // =====================================================
    // VERIFICATION PHARMACIE
    // =====================================================

    const pharmacieExistante = await client.query(
      `
          SELECT id
          FROM pharmacie
          WHERE id = $1
        `,
      [id],
    );

    if (!pharmacieExistante.rows.length) {
      return next(createError(404, "Pharmacie non trouvée"));
    }

    // =====================================================
    // VERIFICATION ARRONDISSEMENT
    // =====================================================

    if (arrondissementId !== undefined && arrondissementId !== null) {
      const arrondissement = await client.query(
        `
            SELECT id
            FROM arrondissement
            WHERE id = $1
          `,
        [arrondissementId],
      );

      if (!arrondissement.rows.length) {
        return res.status(400).json({
          error: "L'arrondissement sélectionné n'existe pas",
        });
      }
    }

    // =====================================================
    // DEBUT TRANSACTION
    // =====================================================

    await client.query("BEGIN");

    // =====================================================
    // MODIFICATION PHARMACIE
    // =====================================================

    await client.query(updatePharmacieQuery, [
      code ?? null,
      nom ?? null,
      arrondissementId ?? null,
      quartier ?? null,
      repere ?? null,
      latitude ?? null,
      longitude ?? null,
      garde24h ?? null,
      verifieeLe ?? null,
      id,
    ]);

    // =====================================================
    // MODIFICATION TELEPHONES
    // =====================================================

    if (Array.isArray(telephones)) {
      await client.query(
        `
          DELETE FROM pharmacie_telephone
          WHERE pharmacie_id = $1
        `,
        [id],
      );

      for (const numero of telephones) {
        if (!numero) {
          continue;
        }

        await client.query(createPharmacieTelephoneQuery, [id, numero]);
      }
    }

    // =====================================================
    // MODIFICATION SERVICES
    // =====================================================

    if (Array.isArray(services)) {
      await client.query(
        `
          DELETE FROM pharmacie_service
          WHERE pharmacie_id = $1
        `,
        [id],
      );

      for (const nomService of services) {
        if (!nomService) {
          continue;
        }

        const serviceResult = await client.query(createServiceQuery, [
          nomService,
        ]);

        const service = serviceResult.rows[0];

        await client.query(createPharmacieServiceQuery, [id, service.id]);
      }
    }

    // =====================================================
    // MODIFICATION HORAIRES
    // =====================================================

    if (horaires && typeof horaires === "object" && !Array.isArray(horaires)) {
      await client.query(
        `
          DELETE FROM pharmacie_horaire
          WHERE pharmacie_id = $1
        `,
        [id],
      );

      for (const [jour, horaire] of Object.entries(horaires)) {
        // Jour fermé
        if (horaire === null) {
          await client.query(createPharmacieHoraireQuery, [
            id,
            jour,
            false,
            null,
            null,
          ]);

          continue;
        }

        if (!Array.isArray(horaire) || horaire.length !== 2) {
          continue;
        }

        const [heureOuverture, heureFermeture] = horaire;

        if (!heureOuverture || !heureFermeture) {
          continue;
        }

        await client.query(createPharmacieHoraireQuery, [
          id,
          jour,
          true,
          heureOuverture,
          heureFermeture,
        ]);
      }
    }

    // =====================================================
    // VALIDATION TRANSACTION
    // =====================================================

    await client.query("COMMIT");

    // =====================================================
    // RECUPERATION COMPLETE
    // =====================================================

    const result = await client.query(getPharmacieQuery, [id]);

    return res.status(200).json(formatPharmacie(result.rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Erreur modification pharmacie :", error);

    return next(createError(400, error.message));
  } finally {
    client.release();
  }
}

// DELETE : PHARMACIE //
export async function deletePharmacie(req, res, next) {
  try {
    const { id } = req.params;

    const result = await query(deletePharmacieQuery, [id]);

    if (!result.rowCount) {
      return next(createError(404, "Pharmacie non trouvée"));
    }

    return res.status(200).json({
      message: "Pharmacie supprimée avec succès",
    });
  } catch (error) {
    console.error("Erreur suppression pharmacie :", error);

    return next(createError(500, "Impossible de supprimer la pharmacie"));
  }
}
