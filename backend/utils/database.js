import { query } from "./connectToDB.js";

import {
  // Meta
  createMetaTableQuery,

  // Arrondissements
  createArrondissementTableQuery,

  // Pharmacies
  createPharmacieTableQuery,
  createPharmacieTelephoneTableQuery,
  createServiceTableQuery,
  createPharmacieServiceTableQuery,
  createPharmacieHoraireTableQuery,

  // Gardes
  createGardeTableQuery,

  // Médicaments et stocks
  createMedicamentTableQuery,
  createStockTableQuery,
  createStockMedicamentTableQuery,

  // FAQ
  createFaqTableQuery,

  // Numéros d'urgence
  createNumeroUrgenceTableQuery,

  // Signalements
  createSignalementTableQuery,

  // Index
  createPharmacieArrondissementIndexQuery,
  createPharmacieNomIndexQuery,
  createPharmacieQuartierIndexQuery,
  createGardePeriodeIndexQuery,
  createGardePharmacieIndexQuery,
  createMedicamentCategorieIndexQuery,
  createStockMedicamentMedicamentIndexQuery,
  createFaqCategorieIndexQuery,
  createSignalementStatutIndexQuery
} from "./sqlQuery.js";


export async function initializeDatabase() {
  try {
    console.log("Initialisation de la base de données...");

    // =====================================================
    // 1. META
    // =====================================================

    await query(createMetaTableQuery);
    console.log("Table meta vérifiée");


    // =====================================================
    // 2. ARRONDISSEMENT
    // =====================================================

    await query(createArrondissementTableQuery);
    console.log("Table arrondissement vérifiée");


    // =====================================================
    // 3. PHARMACIE
    // =====================================================

    await query(createPharmacieTableQuery);
    console.log("Table pharmacie vérifiée");


    // =====================================================
    // 4. TELEPHONES
    // =====================================================

    await query(createPharmacieTelephoneTableQuery);
    console.log("Table pharmacie_telephone vérifiée");


    // =====================================================
    // 5. SERVICES
    // =====================================================

    await query(createServiceTableQuery);
    console.log("Table service vérifiée");


    // =====================================================
    // 6. RELATION PHARMACIE / SERVICE
    // =====================================================

    await query(createPharmacieServiceTableQuery);
    console.log("Table pharmacie_service vérifiée");


    // =====================================================
    // 7. HORAIRES
    // =====================================================

    await query(createPharmacieHoraireTableQuery);
    console.log("Table pharmacie_horaire vérifiée");


    // =====================================================
    // 8. GARDES
    // =====================================================

    await query(createGardeTableQuery);
    console.log("Table garde vérifiée");


    // =====================================================
    // 9. MEDICAMENTS
    // =====================================================

    await query(createMedicamentTableQuery);
    console.log("Table medicament vérifiée");


    // =====================================================
    // 10. STOCK
    // =====================================================

    await query(createStockTableQuery);
    console.log("Table stock vérifiée");


    // =====================================================
    // 11. STOCK / MEDICAMENT
    // =====================================================

    await query(createStockMedicamentTableQuery);
    console.log("Table stock_medicament vérifiée");


    // =====================================================
    // 12. FAQ
    // =====================================================

    await query(createFaqTableQuery);
    console.log("Table faq vérifiée");


    // =====================================================
    // 13. NUMEROS D'URGENCE
    // =====================================================

    await query(createNumeroUrgenceTableQuery);
    console.log("Table numero_urgence vérifiée");


    // =====================================================
    // 14. SIGNALEMENTS
    // =====================================================

    await query(createSignalementTableQuery);
    console.log("Table signalement vérifiée");


    // =====================================================
    // 15. INDEX
    // =====================================================

    await query(createPharmacieArrondissementIndexQuery);

    await query(createPharmacieNomIndexQuery);

    await query(createPharmacieQuartierIndexQuery);

    await query(createGardePeriodeIndexQuery);

    await query(createGardePharmacieIndexQuery);

    await query(createMedicamentCategorieIndexQuery);

    await query(createStockMedicamentMedicamentIndexQuery);

    await query(createFaqCategorieIndexQuery);

    await query(createSignalementStatutIndexQuery);

    console.log("Index vérifiés");


    // =====================================================
    // FIN
    // =====================================================

    console.log("Base de données initialisée avec succès");

  } catch (error) {
    console.error(
      "Erreur lors de l'initialisation de la base de données :",
      error
    );

    throw error;
  }
}
