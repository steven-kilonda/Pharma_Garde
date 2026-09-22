import { query } from "../utils/connectToDB.js";

import {
  createArrondissementQuery,
  getAllArrondissementsQuery,
  getArrondissementQuery,
  updateArrondissementQuery,
  deleteArrondissementQuery
} from "../utils/sqlQuery.js";

import { createError } from "../utils/error.js";

//
// GET ALL
// GET /api/arrondissements
export async function getAllArrondissements(req, res, next) {
  try {
    const { rows } = await query(getAllArrondissementsQuery);

    return res.status(200).json(rows);

  } catch (error) {
    console.error(
      "Erreur lors de la récupération des arrondissements :",
      error
    );

    return next(
      createError(
        500,
        "Impossible de récupérer les arrondissements"
      )
    );
  }
}

//
// CREATE
// POST /api/arrondissements
export async function createArrondissement(req, res, next) {
  try {
    const { nom, numero } = req.body;

    // Vérification du nom
    if (!nom || !nom.trim()) {
      return next(
        createError(
          400,
          "Le nom de l'arrondissement est obligatoire"
        )
      );
    }

    // Vérification du numéro
    if (
      numero === undefined ||
      numero === null ||
      numero === ""
    ) {
      return next(
        createError(
          400,
          "Le numéro de l'arrondissement est obligatoire"
        )
      );
    }

    const numeroArrondissement = Number(numero);

    if (!Number.isInteger(numeroArrondissement)) {
      return next(
        createError(
          400,
          "Le numéro de l'arrondissement doit être un entier"
        )
      );
    }

    /*
     * createArrondissementQuery attend :
     *
     * $1 = id
     * $2 = nom
     * $3 = numero
     *
     * On utilise DEFAULT pour laisser PostgreSQL générer
     * automatiquement l'identifiant SERIAL.
     */

    const { rows } = await query(
      `
        INSERT INTO arrondissement(
          nom,
          numero
        )
        VALUES($1,$2)
        RETURNING *
      `,
      [
        nom.trim(),
        numeroArrondissement
      ]
    );

    return res.status(201).json(rows[0]);

  } catch (error) {
    console.error(
      "Erreur lors de la création de l'arrondissement :",
      error
    );

    return next(
      createError(
        400,
        error.message
      )
    );
  }
}

//
// GET BY ID
// GET /api/arrondissements/:id
export async function getArrondissement(req, res, next) {
  try {
    const { id } = req.params;

    const arrondissementId = Number(id);

    if (!Number.isInteger(arrondissementId)) {
      return next(
        createError(
          400,
          "L'identifiant de l'arrondissement est invalide"
        )
      );
    }

    const { rows } = await query(
      getArrondissementQuery,
      [arrondissementId]
    );

    if (rows.length === 0) {
      return next(
        createError(
          404,
          "Arrondissement non trouvé"
        )
      );
    }

    return res.status(200).json(rows[0]);

  } catch (error) {
    console.error(
      "Erreur lors de la récupération de l'arrondissement :",
      error
    );

    return next(
      createError(
        500,
        "Impossible de récupérer l'arrondissement"
      )
    );
  }
}


//
// UPDATE
// PUT /api/arrondissements/:id
export async function updateArrondissement(req, res, next) {
  try {
    const { id } = req.params;
    const { nom, numero } = req.body;

    const arrondissementId = Number(id);

    if (!Number.isInteger(arrondissementId)) {
      return next(
        createError(
          400,
          "L'identifiant de l'arrondissement est invalide"
        )
      );
    }

    // Vérification du nom si fourni
    if (
      nom !== undefined &&
      nom !== null &&
      !String(nom).trim()
    ) {
      return next(
        createError(
          400,
          "Le nom de l'arrondissement ne peut pas être vide"
        )
      );
    }

    // Vérification du numéro si fourni
    let numeroArrondissement = numero;

    if (
      numero !== undefined &&
      numero !== null &&
      numero !== ""
    ) {
      numeroArrondissement = Number(numero);

      if (!Number.isInteger(numeroArrondissement)) {
        return next(
          createError(
            400,
            "Le numéro de l'arrondissement doit être un entier"
          )
        );
      }
    } else {
      numeroArrondissement = null;
    }

    const result = await query(
      updateArrondissementQuery,
      [
        nom !== undefined && nom !== null
          ? String(nom).trim()
          : null,

        numeroArrondissement,

        arrondissementId
      ]
    );

    if (result.rowCount === 0) {
      return next(
        createError(
          404,
          "Arrondissement non trouvé"
        )
      );
    }

    return res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error(
      "Erreur lors de la modification de l'arrondissement :",
      error
    );

    return next(
      createError(
        400,
        error.message
      )
    );
  }
}


//
// DELETE
// DELETE /api/arrondissements/:id
export async function deleteArrondissement(req, res, next) {
  try {
    const { id } = req.params;

    const arrondissementId = Number(id);

    if (!Number.isInteger(arrondissementId)) {
      return next(
        createError(
          400,
          "L'identifiant de l'arrondissement est invalide"
        )
      );
    }

    const result = await query(
      deleteArrondissementQuery,
      [arrondissementId]
    );

    if (result.rowCount === 0) {
      return next(
        createError(
          404,
          "Arrondissement non trouvé"
        )
      );
    }

    return res.status(200).json({
      message: "Arrondissement supprimé avec succès",
      arrondissement: result.rows[0]
    });

  } catch (error) {
    console.error(
      "Erreur lors de la suppression de l'arrondissement :",
      error
    );

    /*
     * Si l'arrondissement possède encore des pharmacies,
     * PostgreSQL peut refuser la suppression à cause de :
     *
     * ON DELETE RESTRICT
     *
     * On retourne donc une erreur explicite.
     */

    if (error.code === "23503") {
      return next(
        createError(
          409,
          "Impossible de supprimer cet arrondissement car des pharmacies y sont encore rattachées"
        )
      );
    }

    return next(
      createError(
        400,
        error.message
      )
    );
  }
}