// ============================================================
// META
// ============================================================

// CREATE TABLE
export const createMetaTableQuery = `
  CREATE TABLE IF NOT EXISTS meta(
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    semaine_du DATE NOT NULL,
    semaine_au DATE NOT NULL,
    source TEXT,
    maj_le DATE,
    note TEXT
  )
`;

// INSERT
export const createMetaQuery = `
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
  RETURNING *
`;

// SELECT ALL
export const getAllMetaQuery = `
  SELECT
    id,
    titre,
    semaine_du,
    semaine_au,
    source,
    maj_le,
    note
  FROM meta
  ORDER BY semaine_du DESC
`;

// SELECT BY ID
export const getMetaQuery = `
  SELECT
    id,
    titre,
    semaine_du,
    semaine_au,
    source,
    maj_le,
    note
  FROM meta
  WHERE id = $1
`;

// UPDATE
export const updateMetaQuery = `
  UPDATE meta
  SET
    titre = COALESCE($1, titre),
    semaine_du = COALESCE($2, semaine_du),
    semaine_au = COALESCE($3, semaine_au),
    source = COALESCE($4, source),
    maj_le = COALESCE($5, maj_le),
    note = COALESCE($6, note)
  WHERE id = $7
  RETURNING *
`;

// DELETE
export const deleteMetaQuery = `
  DELETE FROM meta
  WHERE id = $1
  RETURNING *
`;


// ============================================================
// ARRONDISSEMENT
// ============================================================

// CREATE TABLE
export const createArrondissementTableQuery = `
  CREATE TABLE IF NOT EXISTS arrondissement(
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    numero SMALLINT NULL
  )
`;

// INSERT
export const createArrondissementQuery = `
  INSERT INTO arrondissement(
    id,
    nom,
    numero
  )
  VALUES($1,$2,$3)
  RETURNING *
`;

// SELECT ALL
export const getAllArrondissementsQuery = `
  SELECT
    id,
    nom,
    numero
  FROM arrondissement
  ORDER BY numero ASC NULLS LAST, nom ASC
`;

// SELECT BY ID
export const getArrondissementQuery = `
  SELECT
    id,
    nom,
    numero
  FROM arrondissement
  WHERE id = $1
`;

// UPDATE
export const updateArrondissementQuery = `
  UPDATE arrondissement
  SET
    nom = COALESCE($1, nom),
    numero = COALESCE($2, numero)
  WHERE id = $3
  RETURNING *
`;

// DELETE
export const deleteArrondissementQuery = `
  DELETE FROM arrondissement
  WHERE id = $1
  RETURNING *
`;


// ============================================================
// PHARMACIE
// ============================================================

// CREATE TABLE
export const createPharmacieTableQuery = `
  CREATE TABLE IF NOT EXISTS pharmacie(
    id SERIAL PRIMARY KEY,

    code VARCHAR(50) NOT NULL UNIQUE,

    nom VARCHAR(255) NOT NULL,

    arrondissement_id INTEGER NOT NULL,

    quartier VARCHAR(255),

    repere VARCHAR(255),

    latitude DECIMAL(10,7),

    longitude DECIMAL(10,7),

    garde_24h BOOLEAN NOT NULL DEFAULT FALSE,

    verifiee_le DATE,

    CONSTRAINT fk_pharmacie_arrondissement
      FOREIGN KEY(arrondissement_id)
      REFERENCES arrondissement(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
  )
`;

// INSERT
export const createPharmacieQuery = `
  INSERT INTO pharmacie(
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
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
  RETURNING *
`;

// SELECT ALL
export const getAllPharmaciesQuery = `
  SELECT
    p.id,
    p.code,
    p.nom,
    p.arrondissement_id,
    p.quartier,
    p.repere,
    p.latitude,
    p.longitude,
    p.garde_24h,
    p.verifiee_le,

    COALESCE(
      (
        SELECT json_agg(
          pt.numero
          ORDER BY pt.id
        )
        FROM pharmacie_telephone pt
        WHERE pt.pharmacie_id = p.id
      ),
      '[]'::json
    ) AS telephones,

    COALESCE(
      (
        SELECT json_object_agg(
          ph.jour,
          CASE
            WHEN ph.ouvert = TRUE THEN
              json_build_array(
                TO_CHAR(ph.heure_ouverture,'HH24:MI'),
                TO_CHAR(ph.heure_fermeture,'HH24:MI')
              )
            ELSE NULL
          END
        )
        FROM pharmacie_horaire ph
        WHERE ph.pharmacie_id = p.id
      ),
      '{}'::json
    ) AS horaires,

    COALESCE(
      (
        SELECT json_agg(
          s.nom
          ORDER BY s.nom
        )
        FROM pharmacie_service ps
        INNER JOIN service s
          ON s.id = ps.service_id
        WHERE ps.pharmacie_id = p.id
      ),
      '[]'::json
    ) AS services

  FROM pharmacie p

  ORDER BY p.nom ASC
`;

// SELECT BY ID
export const getPharmacieQuery = `
  SELECT
    p.id,
    p.code,
    p.nom,
    p.arrondissement_id,
    p.quartier,
    p.repere,
    p.latitude,
    p.longitude,
    p.garde_24h,
    p.verifiee_le,

    COALESCE(
      (
        SELECT json_agg(
          pt.numero
          ORDER BY pt.id
        )
        FROM pharmacie_telephone pt
        WHERE pt.pharmacie_id = p.id
      ),
      '[]'::json
    ) AS telephones,

    COALESCE(
      (
        SELECT json_object_agg(
          ph.jour,
          CASE
            WHEN ph.ouvert = TRUE THEN
              json_build_array(
                TO_CHAR(ph.heure_ouverture,'HH24:MI'),
                TO_CHAR(ph.heure_fermeture,'HH24:MI')
              )
            ELSE NULL
          END
        )
        FROM pharmacie_horaire ph
        WHERE ph.pharmacie_id = p.id
      ),
      '{}'::json
    ) AS horaires,

    COALESCE(
      (
        SELECT json_agg(
          s.nom
          ORDER BY s.nom
        )
        FROM pharmacie_service ps
        INNER JOIN service s
          ON s.id = ps.service_id
        WHERE ps.pharmacie_id = p.id
      ),
      '[]'::json
    ) AS services

  FROM pharmacie p

  WHERE p.id = $1
`;

// UPDATE
export const updatePharmacieQuery = `
  UPDATE pharmacie
  SET
    code = COALESCE($1, code),
    nom = COALESCE($2, nom),
    arrondissement_id = COALESCE($3, arrondissement_id),
    quartier = COALESCE($4, quartier),
    repere = COALESCE($5, repere),
    latitude = COALESCE($6, latitude),
    longitude = COALESCE($7, longitude),
    garde_24h = COALESCE($8, garde_24h),
    verifiee_le = COALESCE($9, verifiee_le)
  WHERE id = $10
  RETURNING *
`;

// DELETE
export const deletePharmacieQuery = `
  DELETE FROM pharmacie
  WHERE id = $1
  RETURNING *
`;


// ============================================================
// TELEPHONE PHARMACIE
// ============================================================

// CREATE TABLE
export const createPharmacieTelephoneTableQuery = `
  CREATE TABLE IF NOT EXISTS pharmacie_telephone(
    id SERIAL PRIMARY KEY,

    pharmacie_id INTEGER NOT NULL,

    numero VARCHAR(30) NOT NULL,

    CONSTRAINT fk_telephone_pharmacie
      FOREIGN KEY(pharmacie_id)
      REFERENCES pharmacie(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
  )
`;

// INSERT
export const createPharmacieTelephoneQuery = `
  INSERT INTO pharmacie_telephone(
    pharmacie_id,
    numero
  )
  VALUES($1,$2)
  RETURNING *
`;

// SELECT ALL
export const getAllPharmacieTelephonesQuery = `
  SELECT
    id,
    pharmacie_id,
    numero
  FROM pharmacie_telephone
  ORDER BY pharmacie_id ASC, id ASC
`;

// SELECT BY ID
export const getPharmacieTelephoneQuery = `
  SELECT
    id,
    pharmacie_id,
    numero
  FROM pharmacie_telephone
  WHERE id = $1
`;

// SELECT BY PHARMACIE
export const getTelephonesByPharmacieQuery = `
  SELECT
    id,
    pharmacie_id,
    numero
  FROM pharmacie_telephone
  WHERE pharmacie_id = $1
  ORDER BY id ASC
`;

// UPDATE
export const updatePharmacieTelephoneQuery = `
  UPDATE pharmacie_telephone
  SET
    pharmacie_id = COALESCE($1, pharmacie_id),
    numero = COALESCE($2, numero)
  WHERE id = $3
  RETURNING *
`;

// DELETE
export const deletePharmacieTelephoneQuery = `
  DELETE FROM pharmacie_telephone
  WHERE id = $1
  RETURNING *
`;


// ============================================================
// SERVICE
// ============================================================

// CREATE TABLE
export const createServiceTableQuery = `
  CREATE TABLE IF NOT EXISTS service(
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL UNIQUE
  )
`;

// INSERT
export const createServiceQuery = `
  INSERT INTO service(
    nom
  )
  VALUES($1)
  ON CONFLICT(nom)
  DO UPDATE SET
    nom = EXCLUDED.nom
  RETURNING *
`;

// SELECT ALL
export const getAllServicesQuery = `
  SELECT
    id,
    nom
  FROM service
  ORDER BY nom ASC
`;

// SELECT BY ID
export const getServiceQuery = `
  SELECT
    id,
    nom
  FROM service
  WHERE id = $1
`;

// UPDATE
export const updateServiceQuery = `
  UPDATE service
  SET
    nom = COALESCE($1, nom)
  WHERE id = $2
  RETURNING *
`;

// DELETE
export const deleteServiceQuery = `
  DELETE FROM service
  WHERE id = $1
  RETURNING *
`;


// ============================================================
// PHARMACIE / SERVICE
// ============================================================

// CREATE TABLE
export const createPharmacieServiceTableQuery = `
  CREATE TABLE IF NOT EXISTS pharmacie_service(
    pharmacie_id INTEGER NOT NULL,

    service_id INTEGER NOT NULL,

    PRIMARY KEY(
      pharmacie_id,
      service_id
    ),

    CONSTRAINT fk_pharmacie_service_pharmacie
      FOREIGN KEY(pharmacie_id)
      REFERENCES pharmacie(id)
      ON DELETE CASCADE,

    CONSTRAINT fk_pharmacie_service_service
      FOREIGN KEY(service_id)
      REFERENCES service(id)
      ON DELETE CASCADE
  )
`;

// INSERT
export const createPharmacieServiceQuery = `
  INSERT INTO pharmacie_service(
    pharmacie_id,
    service_id
  )
  VALUES($1,$2)
  ON CONFLICT DO NOTHING
  RETURNING *
`;

// SELECT ALL
export const getAllPharmacieServicesQuery = `
  SELECT
    pharmacie_id,
    service_id
  FROM pharmacie_service
  ORDER BY pharmacie_id ASC, service_id ASC
`;

// SELECT RELATION
export const getPharmacieServiceQuery = `
  SELECT
    pharmacie_id,
    service_id
  FROM pharmacie_service
  WHERE pharmacie_id = $1
    AND service_id = $2
`;

// SELECT SERVICES D'UNE PHARMACIE
export const getServicesByPharmacieQuery = `
  SELECT
    s.id,
    s.nom
  FROM pharmacie_service ps
  INNER JOIN service s
    ON s.id = ps.service_id
  WHERE ps.pharmacie_id = $1
  ORDER BY s.nom ASC
`;

// SELECT PHARMACIES D'UN SERVICE
export const getPharmaciesByServiceQuery = `
  SELECT
    p.id,
    p.code,
    p.nom
  FROM pharmacie_service ps
  INNER JOIN pharmacie p
    ON p.id = ps.pharmacie_id
  WHERE ps.service_id = $1
  ORDER BY p.nom ASC
`;

// DELETE RELATION
export const deletePharmacieServiceQuery = `
  DELETE FROM pharmacie_service
  WHERE pharmacie_id = $1
    AND service_id = $2
  RETURNING *
`;


// ============================================================
// HORAIRE PHARMACIE
// ============================================================

// CREATE TABLE
export const createPharmacieHoraireTableQuery = `
  CREATE TABLE IF NOT EXISTS pharmacie_horaire(
    id SERIAL PRIMARY KEY,

    pharmacie_id INTEGER NOT NULL,

    jour VARCHAR(10) NOT NULL,

    ouvert BOOLEAN NOT NULL DEFAULT TRUE,

    heure_ouverture TIME NULL,

    heure_fermeture TIME NULL,

    CONSTRAINT fk_horaire_pharmacie
      FOREIGN KEY(pharmacie_id)
      REFERENCES pharmacie(id)
      ON DELETE CASCADE,

    CONSTRAINT unique_pharmacie_jour
      UNIQUE(
        pharmacie_id,
        jour
      ),

    CONSTRAINT check_horaire
      CHECK(
        (
          ouvert = TRUE
          AND heure_ouverture IS NOT NULL
          AND heure_fermeture IS NOT NULL
        )
        OR
        (
          ouvert = FALSE
          AND heure_ouverture IS NULL
          AND heure_fermeture IS NULL
        )
      )
  )
`;

// INSERT
export const createPharmacieHoraireQuery = `
  INSERT INTO pharmacie_horaire(
    pharmacie_id,
    jour,
    ouvert,
    heure_ouverture,
    heure_fermeture
  )
  VALUES($1,$2,$3,$4,$5)
  RETURNING *
`;

// SELECT ALL
export const getAllPharmacieHorairesQuery = `
  SELECT
    id,
    pharmacie_id,
    jour,
    ouvert,
    heure_ouverture,
    heure_fermeture
  FROM pharmacie_horaire
  ORDER BY pharmacie_id ASC, id ASC
`;

// SELECT BY ID
export const getPharmacieHoraireQuery = `
  SELECT
    id,
    pharmacie_id,
    jour,
    ouvert,
    heure_ouverture,
    heure_fermeture
  FROM pharmacie_horaire
  WHERE id = $1
`;

// SELECT BY PHARMACIE
export const getHorairesByPharmacieQuery = `
  SELECT
    id,
    pharmacie_id,
    jour,
    ouvert,
    heure_ouverture,
    heure_fermeture
  FROM pharmacie_horaire
  WHERE pharmacie_id = $1
  ORDER BY id ASC
`;

// UPDATE
export const updatePharmacieHoraireQuery = `
  UPDATE pharmacie_horaire
  SET
    jour = COALESCE($1, jour),
    ouvert = COALESCE($2, ouvert),
    heure_ouverture = $3,
    heure_fermeture = $4
  WHERE id = $5
  RETURNING *
`;

// DELETE
export const deletePharmacieHoraireQuery = `
  DELETE FROM pharmacie_horaire
  WHERE id = $1
  RETURNING *
`;


// ============================================================
// GARDE
// ============================================================

// CREATE TABLE
export const createGardeTableQuery = `
  CREATE TABLE IF NOT EXISTS garde(
    id SERIAL PRIMARY KEY,

    pharmacie_id INTEGER NOT NULL,

    debut DATE NOT NULL,

    fin DATE NOT NULL,

    CONSTRAINT fk_garde_pharmacie
      FOREIGN KEY(pharmacie_id)
      REFERENCES pharmacie(id)
      ON DELETE CASCADE,

    CONSTRAINT unique_garde_pharmacie_periode
      UNIQUE(
        pharmacie_id,
        debut,
        fin
      ),

    CONSTRAINT check_garde_periode
      CHECK(fin >= debut)
  )
`;

// INSERT
export const createGardeQuery = `
  INSERT INTO garde(
    id,
    pharmacie_id,
    debut,
    fin
  )
  VALUES($1,$2,$3,$4)
  ON CONFLICT(
    pharmacie_id,
    debut,
    fin
  )
  DO NOTHING
  RETURNING *
`;

// SELECT ALL
export const getAllGardesQuery = `
  SELECT
    g.id,
    g.pharmacie_id,
    g.debut,
    g.fin,

    p.code AS pharmacie_code,
    p.nom AS pharmacie_nom

  FROM garde g

  INNER JOIN pharmacie p
    ON p.id = g.pharmacie_id

  ORDER BY
    g.debut DESC,
    p.nom ASC
`;

// SELECT BY ID
export const getGardeQuery = `
  SELECT
    id,
    pharmacie_id,
    debut,
    fin
  FROM garde
  WHERE id = $1
`;

// SELECT BY PHARMACIE
export const getGardesByPharmacieQuery = `
  SELECT
    id,
    pharmacie_id,
    debut,
    fin
  FROM garde
  WHERE pharmacie_id = $1
  ORDER BY debut DESC
`;

// SELECT ACTIVE
export const getGardesActivesQuery = `
  SELECT
    g.id,
    g.pharmacie_id,
    g.debut,
    g.fin,

    p.code,
    p.nom,
    p.arrondissement_id,
    p.quartier,
    p.repere,
    p.latitude,
    p.longitude,
    p.garde_24h,
    p.verifiee_le

  FROM garde g

  INNER JOIN pharmacie p
    ON p.id = g.pharmacie_id

  WHERE $1::date BETWEEN g.debut AND g.fin

  ORDER BY p.nom ASC
`;

// UPDATE
export const updateGardeQuery = `
  UPDATE garde
  SET
    pharmacie_id = COALESCE($1, pharmacie_id),
    debut = COALESCE($2, debut),
    fin = COALESCE($3, fin)
  WHERE id = $4
  RETURNING *
`;

// DELETE
export const deleteGardeQuery = `
  DELETE FROM garde
  WHERE id = $1
  RETURNING *
`;


// ============================================================
// MEDICAMENT
// ============================================================

// CREATE TABLE
export const createMedicamentTableQuery = `
  CREATE TABLE IF NOT EXISTS medicament(
    id SERIAL PRIMARY KEY,

    nom VARCHAR(255) NOT NULL,

    categorie VARCHAR(255) NOT NULL,

    prix NUMERIC(12,2) NOT NULL,

    ordonnance BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT check_medicament_prix
      CHECK(prix >= 0)
  )
`;

// INSERT
export const createMedicamentQuery = `
  INSERT INTO medicament(
    id,
    nom,
    categorie,
    prix,
    ordonnance
  )
  VALUES($1,$2,$3,$4,$5)
  RETURNING *
`;

// SELECT ALL
export const getAllMedicamentsQuery = `
  SELECT
    id,
    nom,
    categorie,
    prix,
    ordonnance
  FROM medicament
  ORDER BY nom ASC
`;

// SELECT BY ID
export const getMedicamentQuery = `
  SELECT
    id,
    nom,
    categorie,
    prix,
    ordonnance
  FROM medicament
  WHERE id = $1
`;

// SELECT BY CATEGORIE
export const getMedicamentsByCategorieQuery = `
  SELECT
    id,
    nom,
    categorie,
    prix,
    ordonnance
  FROM medicament
  WHERE categorie = $1
  ORDER BY nom ASC
`;

// UPDATE
export const updateMedicamentQuery = `
  UPDATE medicament
  SET
    nom = COALESCE($1, nom),
    categorie = COALESCE($2, categorie),
    prix = COALESCE($3, prix),
    ordonnance = COALESCE($4, ordonnance)
  WHERE id = $5
  RETURNING *
`;

// DELETE
export const deleteMedicamentQuery = `
  DELETE FROM medicament
  WHERE id = $1
  RETURNING *
`;


// ============================================================
// STOCK
// ============================================================

// CREATE TABLE
export const createStockTableQuery = `
  CREATE TABLE IF NOT EXISTS stock(
    id SERIAL PRIMARY KEY,

    pharmacie_id INTEGER NOT NULL UNIQUE,

    CONSTRAINT fk_stock_pharmacie
      FOREIGN KEY(pharmacie_id)
      REFERENCES pharmacie(id)
      ON DELETE CASCADE
  )
`;

// INSERT
export const createStockQuery = `
  INSERT INTO stock(
    id,
    pharmacie_id
  )
  VALUES($1,$2)
  ON CONFLICT(pharmacie_id)
  DO UPDATE SET
    pharmacie_id = EXCLUDED.pharmacie_id
  RETURNING *
`;

// SELECT ALL
export const getAllStocksQuery = `
  SELECT
    st.id,
    st.pharmacie_id,
    p.code AS pharmacie_code,
    p.nom AS pharmacie_nom
  FROM stock st
  INNER JOIN pharmacie p
    ON p.id = st.pharmacie_id
  ORDER BY p.nom ASC
`;

// SELECT BY ID
export const getStockQuery = `
  SELECT
    st.id,
    st.pharmacie_id,
    p.code AS pharmacie_code,
    p.nom AS pharmacie_nom
  FROM stock st
  INNER JOIN pharmacie p
    ON p.id = st.pharmacie_id
  WHERE st.id = $1
`;

// SELECT BY PHARMACIE
export const getStockByPharmacieQuery = `
  SELECT
    st.id AS stock_id,
    st.pharmacie_id,

    sm.medicament_id,

    m.nom AS medicament_nom,
    m.categorie,
    m.prix,
    m.ordonnance,

    sm.statut

  FROM stock st

  INNER JOIN stock_medicament sm
    ON sm.stock_id = st.id

  INNER JOIN medicament m
    ON m.id = sm.medicament_id

  WHERE st.pharmacie_id = $1

  ORDER BY m.nom ASC
`;

// UPDATE
export const updateStockQuery = `
  UPDATE stock
  SET
    pharmacie_id = COALESCE($1, pharmacie_id)
  WHERE id = $2
  RETURNING *
`;

// DELETE
export const deleteStockQuery = `
  DELETE FROM stock
  WHERE id = $1
  RETURNING *
`;


// ============================================================
// STOCK / MEDICAMENT
// ============================================================

// CREATE TABLE
export const createStockMedicamentTableQuery = `
  CREATE TABLE IF NOT EXISTS stock_medicament(
    stock_id INTEGER NOT NULL,

    medicament_id INTEGER NOT NULL,

    statut VARCHAR(20) NOT NULL DEFAULT 'disponible',

    PRIMARY KEY(
      stock_id,
      medicament_id
    ),

    CONSTRAINT fk_stock_medicament_stock
      FOREIGN KEY(stock_id)
      REFERENCES stock(id)
      ON DELETE CASCADE,

    CONSTRAINT fk_stock_medicament_medicament
      FOREIGN KEY(medicament_id)
      REFERENCES medicament(id)
      ON DELETE CASCADE,

    CONSTRAINT check_stock_medicament_statut
      CHECK(
        statut IN(
          'disponible',
          'rupture'
        )
      )
  )
`;

// INSERT
export const createStockMedicamentQuery = `
  INSERT INTO stock_medicament(
    stock_id,
    medicament_id,
    statut
  )
  VALUES($1,$2,$3)
  ON CONFLICT(
    stock_id,
    medicament_id
  )
  DO UPDATE SET
    statut = EXCLUDED.statut
  RETURNING *
`;

// SELECT ALL
export const getAllStockMedicamentsQuery = `
  SELECT
    sm.stock_id,
    sm.medicament_id,
    m.nom AS medicament_nom,
    m.categorie,
    m.prix,
    m.ordonnance,
    sm.statut
  FROM stock_medicament sm
  INNER JOIN medicament m
    ON m.id = sm.medicament_id
  ORDER BY sm.stock_id ASC, m.nom ASC
`;

// SELECT RELATION
export const getStockMedicamentQuery = `
  SELECT
    sm.stock_id,
    sm.medicament_id,
    m.nom AS medicament_nom,
    m.categorie,
    m.prix,
    m.ordonnance,
    sm.statut
  FROM stock_medicament sm
  INNER JOIN medicament m
    ON m.id = sm.medicament_id
  WHERE sm.stock_id = $1
    AND sm.medicament_id = $2
`;

// SELECT MEDICAMENTS D'UN STOCK
export const getMedicamentsByStockQuery = `
  SELECT
    m.id,
    m.nom,
    m.categorie,
    m.prix,
    m.ordonnance,
    sm.statut
  FROM stock_medicament sm
  INNER JOIN medicament m
    ON m.id = sm.medicament_id
  WHERE sm.stock_id = $1
  ORDER BY m.nom ASC
`;

// UPDATE
export const updateStockMedicamentQuery = `
  UPDATE stock_medicament
  SET
    statut = $1
  WHERE stock_id = $2
    AND medicament_id = $3
  RETURNING *
`;

// DELETE
export const deleteStockMedicamentQuery = `
  DELETE FROM stock_medicament
  WHERE stock_id = $1
    AND medicament_id = $2
  RETURNING *
`;


// ============================================================
// FAQ
// ============================================================

// CREATE TABLE
export const createFaqTableQuery = `
  CREATE TABLE IF NOT EXISTS faq(
    id SERIAL PRIMARY KEY,

    categorie VARCHAR(255) NOT NULL,

    question TEXT NOT NULL,

    reponse TEXT NOT NULL
  )
`;

// INSERT
export const createFaqQuery = `
  INSERT INTO faq(
    id,
    categorie,
    question,
    reponse
  )
  VALUES($1,$2,$3,$4)
  RETURNING *
`;

// SELECT ALL
export const getAllFaqQuery = `
  SELECT
    id,
    categorie,
    question,
    reponse
  FROM faq
  ORDER BY categorie ASC, id ASC
`;

// SELECT BY ID
export const getFaqQuery = `
  SELECT
    id,
    categorie,
    question,
    reponse
  FROM faq
  WHERE id = $1
`;

// SELECT BY CATEGORIE
export const getFaqByCategorieQuery = `
  SELECT
    id,
    categorie,
    question,
    reponse
  FROM faq
  WHERE categorie = $1
  ORDER BY id ASC
`;

// UPDATE
export const updateFaqQuery = `
  UPDATE faq
  SET
    categorie = COALESCE($1, categorie),
    question = COALESCE($2, question),
    reponse = COALESCE($3, reponse)
  WHERE id = $4
  RETURNING *
`;

// DELETE
export const deleteFaqQuery = `
  DELETE FROM faq
  WHERE id = $1
  RETURNING *
`;


// ============================================================
// NUMERO D'URGENCE
// ============================================================

// CREATE TABLE
export const createNumeroUrgenceTableQuery = `
  CREATE TABLE IF NOT EXISTS numero_urgence(
    id SERIAL PRIMARY KEY,

    nom VARCHAR(255) NOT NULL,

    numero VARCHAR(30) NOT NULL,

    description TEXT
  )
`;

// INSERT
export const createNumeroUrgenceQuery = `
  INSERT INTO numero_urgence(
    id,
    nom,
    numero,
    description
  )
  VALUES($1,$2,$3,$4)
  RETURNING *
`;

// SELECT ALL
export const getAllNumerosUrgenceQuery = `
  SELECT
    id,
    nom,
    numero,
    description
  FROM numero_urgence
  ORDER BY id ASC
`;

// SELECT BY ID
export const getNumeroUrgenceQuery = `
  SELECT
    id,
    nom,
    numero,
    description
  FROM numero_urgence
  WHERE id = $1
`;

// UPDATE
export const updateNumeroUrgenceQuery = `
  UPDATE numero_urgence
  SET
    nom = COALESCE($1, nom),
    numero = COALESCE($2, numero),
    description = COALESCE($3, description)
  WHERE id = $4
  RETURNING *
`;

// DELETE
export const deleteNumeroUrgenceQuery = `
  DELETE FROM numero_urgence
  WHERE id = $1
  RETURNING *
`;


// ============================================================
// SIGNALEMENT
// ============================================================

// CREATE TABLE
export const createSignalementTableQuery = `
  CREATE TABLE IF NOT EXISTS signalement(
    id SERIAL PRIMARY KEY,

    pharmacie_id INTEGER NULL,

    type VARCHAR(100) NOT NULL,

    message TEXT NOT NULL,

    nom VARCHAR(255),

    telephone VARCHAR(30),

    statut VARCHAR(30) NOT NULL DEFAULT 'nouveau',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NULL,

    CONSTRAINT fk_signalement_pharmacie
      FOREIGN KEY(pharmacie_id)
      REFERENCES pharmacie(id)
      ON DELETE SET NULL,

    CONSTRAINT check_signalement_statut
      CHECK(
        statut IN(
          'nouveau',
          'en_cours',
          'traite',
          'rejete'
        )
      )
  )
`;

// INSERT
export const createSignalementQuery = `
  INSERT INTO signalement(
    pharmacie_id,
    type,
    message,
    nom,
    telephone
  )
  VALUES($1,$2,$3,$4,$5)
  RETURNING *
`;

// SELECT ALL
export const getAllSignalementsQuery = `
  SELECT
    s.id,
    s.pharmacie_id,
    s.type,
    s.message,
    s.nom,
    s.telephone,
    s.statut,
    s.created_at,
    s.updated_at,

    p.nom AS pharmacie_nom,
    p.code AS pharmacie_code

  FROM signalement s

  LEFT JOIN pharmacie p
    ON p.id = s.pharmacie_id

  ORDER BY s.created_at DESC
`;

// SELECT BY ID
export const getSignalementQuery = `
  SELECT
    s.id,
    s.pharmacie_id,
    s.type,
    s.message,
    s.nom,
    s.telephone,
    s.statut,
    s.created_at,
    s.updated_at,

    p.nom AS pharmacie_nom,
    p.code AS pharmacie_code

  FROM signalement s

  LEFT JOIN pharmacie p
    ON p.id = s.pharmacie_id

  WHERE s.id = $1
`;

// SELECT BY STATUT
export const getSignalementsByStatutQuery = `
  SELECT
    s.id,
    s.pharmacie_id,
    s.type,
    s.message,
    s.nom,
    s.telephone,
    s.statut,
    s.created_at,
    s.updated_at,

    p.nom AS pharmacie_nom,
    p.code AS pharmacie_code

  FROM signalement s

  LEFT JOIN pharmacie p
    ON p.id = s.pharmacie_id

  WHERE s.statut = $1

  ORDER BY s.created_at DESC
`;

// UPDATE
export const updateSignalementQuery = `
  UPDATE signalement
  SET
    pharmacie_id = COALESCE($1, pharmacie_id),
    type = COALESCE($2, type),
    message = COALESCE($3, message),
    nom = COALESCE($4, nom),
    telephone = COALESCE($5, telephone),
    statut = COALESCE($6, statut),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $7
  RETURNING *
`;

// UPDATE STATUT UNIQUEMENT
export const updateSignalementStatutQuery = `
  UPDATE signalement
  SET
    statut = $1,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $2
  RETURNING *
`;

// DELETE
export const deleteSignalementQuery = `
  DELETE FROM signalement
  WHERE id = $1
  RETURNING *
`;


// ============================================================
// INDEX
// ============================================================

export const createPharmacieArrondissementIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_pharmacie_arrondissement
  ON pharmacie(arrondissement_id)
`;

export const createPharmacieNomIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_pharmacie_nom
  ON pharmacie(nom)
`;

export const createPharmacieQuartierIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_pharmacie_quartier
  ON pharmacie(quartier)
`;

export const createGardePeriodeIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_garde_periode
  ON garde(debut, fin)
`;

export const createGardePharmacieIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_garde_pharmacie
  ON garde(pharmacie_id)
`;

export const createMedicamentCategorieIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_medicament_categorie
  ON medicament(categorie)
`;

export const createStockMedicamentMedicamentIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_stock_medicament_medicament
  ON stock_medicament(medicament_id)
`;

export const createFaqCategorieIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_faq_categorie
  ON faq(categorie)
`;

export const createSignalementStatutIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_signalement_statut
  ON signalement(statut)
`;