import dns from 'dns'; // 1. ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();
dns.setDefaultResultOrder('ipv4first'); // 2. Y ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;