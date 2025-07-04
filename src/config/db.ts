import { Pool } from 'pg';
import dotenv from 'dotenv';
import dns from 'dns'; // Mantén esta línea

dotenv.config();
dns.setDefaultResultOrder('ipv4first'); // Mantén esta línea

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // <-- CAMBIO CLAVE AQUÍ
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;