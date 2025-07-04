import { Pool } from 'pg';
import dotenv from 'dotenv';
import dns from 'dns'; // Mantén esta línea si la tienes para Render

dotenv.config();
dns.setDefaultResultOrder('ipv4first'); // Mantén esta línea si la tienes para Render

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