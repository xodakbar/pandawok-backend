import { Pool } from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();
dns.setDefaultResultOrder('ipv4first');

console.log('Variables de entorno de la Base de Datos (para Railway):', {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  // Para conexiones internas en Railway, SSL generalmente no requiere rejectUnauthorized: false
  // Si tu backend se conecta desde fuera de Railway, podrías necesitar una configuración SSL específica aquí.
  // ssl: {
  //   rejectUnauthorized: false,
  // },
});

// Intentar conexión inmediata para validar al iniciar la app
pool.connect()
  .then(client => {
    console.log('✅ Conexión exitosa a la base de datos PostgreSQL en Railway.');
    client.release();
  })
  .catch(err => {
    console.error('❌ Error al conectar a la base de datos en Railway:', err);
    process.exit(1); // Salir de la aplicación si la conexión a la DB falla
  });

export default pool;
