import pg from "pg";
pg.types.setTypeParser(1082, (v) => v);
import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = [
  "PG_USER",
  "PG_HOST",
  "PG_DATABASE",
  "PG_PORT",
  "PG_PASSWORD"
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.log(`Variable d'environnement manquante : ${varName}`);
    process.exit(1);
  }
});

const db = new pg.Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT
});

db.connect()
  .then((client) => {
    client.release();
    console.log("Connexion à la base de données réussie");
  })
  .catch((err) => {
    console.log(
      "Impossible de se connecter à la base de données",
      err
    );

    process.exit(1);
  });

db.on("error", (err) => {
  console.log("Erreur de base de données :", err);
});

export const query = (text, params) => {
  return db.query(text, params);
};

export default db;