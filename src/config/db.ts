import { Pool } from 'pg';
import dns from 'dns';
import dotenv from 'dotenv';

// Cargar variables de entorno en desarrollo local
dotenv.config();

// Priorizar uso de IPv4 para evitar problemas con DNS en algunos entornos
dns.setDefaultResultOrder('ipv4first');

console.log('--- DEBUG: Variables de Entorno al inicio de db.ts ---');
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('process.env.RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('process.env.DATABASE_URL:', process.env.DATABASE_URL);
console.log('process.env.DB_USER:', process.env.DB_USER);
console.log('process.env.DB_HOST:', process.env.DB_HOST);
console.log('process.env.DB_NAME:', process.env.DB_NAME);
console.log('process.env.DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('process.env.DB_PORT:', process.env.DB_PORT);
console.log('--- FIN: Logs de depuración ---');

let poolConfig;

if (process.env.DATABASE_URL) {
  console.log('Usando DATABASE_URL para la conexión a la base de datos.');
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  };
} else {
  console.log('Usando variables individuales para la conexión a la base de datos.');
  poolConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    ssl: {
      rejectUnauthorized: false,
    },
  };
}

const pool = new Pool(poolConfig);

pool.connect()
  .then(client => {
    console.log('✅ Conexión exitosa a la base de datos PostgreSQL.');
    client.release();
  })
  .catch(err => {
    console.error('❌ Error al conectar a la base de datos:', err);
    console.error('Configuración utilizada:', poolConfig);
    process.exit(1);
  });

export default pool;
