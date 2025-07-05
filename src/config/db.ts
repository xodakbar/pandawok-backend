import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(client => {
    console.log('✅ Conectado a la DB correctamente.');
    client.release();
  })
  .catch(err => {
    console.error('❌ Error al conectar a la DB:', err);
    process.exit(1);
  });

export default pool;
