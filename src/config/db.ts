import { Pool } from 'pg';
import dotenv from 'dotenv';
import dns from 'dns'; // ¡Importante para el manejo de DNS/IPv4!

dotenv.config(); // Carga las variables del .env para desarrollo local
dns.setDefaultResultOrder('ipv4first'); // Prefiere IPv4 para la conexión, puede ayudar con errores ENETUNREACH/ECONNREFUSED

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'), // '5432' es el valor por defecto si DB_PORT no está definido
  ssl: {
    rejectUnauthorized: false, // Necesario para conexiones SSL con Supabase en Render
  },
});

export default pool; // Exporta el pool como la exportación por defecto