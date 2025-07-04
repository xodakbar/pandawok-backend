import { Pool } from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();
dns.setDefaultResultOrder('ipv4first');

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

// Intentar conexión inmediata
pool.connect()
  .then(client => {
    console.log('✅ Conexión exitosa a la base de datos PostgreSQL (Supabase)');
    client.release();
  })
  .catch(err => {
    console.error('❌ Error al conectar a la base de datos:', err);
    process.exit(1); // Detener la app si la conexión falla
  });

export default pool;
