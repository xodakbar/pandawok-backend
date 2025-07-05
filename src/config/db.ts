import { Pool } from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

// Solo carga dotenv.config() si no estamos en un entorno de producción como Railway
// donde las variables ya son inyectadas. Esto evita posibles conflictos.
if (process.env.NODE_ENV !== 'production' || !process.env.RAILWAY_ENVIRONMENT) {
  dotenv.config();
}

dns.setDefaultResultOrder('ipv4first');

let poolConfig: any;

// Priorizar DATABASE_URL si está disponible (es la forma preferida en Railway)
if (process.env.DATABASE_URL) {
  console.log('Usando DATABASE_URL para la conexión a la base de datos.');
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      // Generalmente no es necesario rechazar certificados para conexiones internas en Railway
      // Si tu backend se conecta desde fuera de Railway, podrías necesitar una configuración SSL específica.
      rejectUnauthorized: false // Puede ser necesario si la DB tiene un certificado autofirmado o no reconocido
    },
  };
} else {
  // Fallback a variables individuales si DATABASE_URL no está definida
  console.log('Usando variables individuales (DB_USER, DB_HOST, etc.) para la conexión.');
  console.log('Variables de entorno de la Base de Datos (para Railway):', {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  poolConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    ssl: {
      rejectUnauthorized: false, // Mantener esto si es absolutamente necesario para tu setup
    },
  };
}

const pool = new Pool(poolConfig);

// Intentar conexión inmediata para validar al iniciar la app
pool.connect()
  .then(client => {
    console.log('✅ Conexión exitosa a la base de datos PostgreSQL en Railway.');
    client.release();
  })
  .catch(err => {
    console.error('❌ Error al conectar a la base de datos en Railway:', err);
    // console.error('Detalles de la configuración del pool:', poolConfig); // Descomentar para depuración
    process.exit(1); // Salir de la aplicación si la conexión a la DB falla
  });

export default pool;