// import 'dotenv/config';
// import pkg from 'pg'; // Importación recomendada para evitar problemas con tipos
// const { Pool } = pkg;

// const isProduction = process.env.NODE_ENV === "production";

// // Construimos la URL de conexión para local
// const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

// const pool = new Pool({
//     // En producción usamos la URL que nos da el hosting, en local la que armamos
//     connectionString: isProduction ? process.env.DATABASE_URL : connectionString,
//     // Esto es vital para que funcione en la nube (producción)
//     ssl: isProduction ? { rejectUnauthorized: false } : false
// });

// export { pool };

import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: {
    rejectUnauthorized: false // Esto permite la conexión segura con Neon
  }
});