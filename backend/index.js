import express from "express";
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import cors from 'cors';
import dotenv from "dotenv";
import pharmacieRoute from './routes/pharmacies.js';
import arrondissementRoute from './routes/arrondissements.js';
import { initializeDatabase } from './utils/database.js';
dotenv.config();


/* =========================================================
   APPLICATION EXPRESS
========================================================= */

const app = express();

/* =========================================================
   PORT
========================================================= */

const PORT = process.env.PORT || 3000;


/* =========================================================
   CORS
========================================================= */

const corsOptions = {
  origin: "*"
};

app.use(
  cors(corsOptions)
);


/* =========================================================
   MIDDLEWARE JSON
========================================================= */

app.use(
  express.json()
);


/* =========================================================
   ROUTES
========================================================= */

app.use(
  "/api/pharmacies",
  pharmacieRoute
);

app.use(
  "/api/arrondissements",
  arrondissementRoute
);


app.use("/api/pharmacies", pharmacieRoute);
app.use("/api/arrondissements", arrondissementRoute);

/* FRONTEND STATIQUE */
app.use(express.static(path.join(__dirname, "..", "frontend")));

/* ROUTE 404 — ne rien mettre de statique après cette ligne */

/* =========================================================
   ROUTE 404
========================================================= */

app.use(
  function(req, res) {

    res.status(404).json({
      error: "Not Found!"
    });

  }
);


/* =========================================================
   GESTION DES ERREURS
========================================================= */

app.use(
  (err, req, res, next) => {

    const statusCode =
      err.statusCode || 500;

    const message =
      err.message || "Erreur serveur";

    return res.status(
      statusCode
    ).json({
      error: message
    });

  }
);


/* =========================================================
   DEMARRAGE DE L'APPLICATION
========================================================= */

async function startServer() {

  try {

    /*
     * Création/vérification des tables
     */
    await initializeDatabase();


    /*
     * Démarrage du serveur
     */
    app.listen(
      PORT,
      () => {

        console.log(
          `Listening on port ${PORT}`
        );

      }
    );

  } catch (error) {

    console.error(
      "Impossible de démarrer le serveur :",
      error.message
    );

    process.exit(1);
  }
}


startServer();