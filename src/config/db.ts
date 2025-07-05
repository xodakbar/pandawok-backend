import { Pool } from 'pg';
import dns from 'dns'; // No necesitamos dotenv si Railway inyecta las variables

// --- INICIO: Logs de depuración para variables de entorno ---
console.log('--- DEBUG: Variables de Entorno al inicio de db.ts (SIMPLIFICADO) ---');
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('process.env.RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT); // Esta variable la inyecta Railway
console.log('process.env.DATABASE_URL (RAW):', process.env.DATABASE_URL);
console.log('process.env.DB_USER (RAW):', process.env.DB_USER);
console.log('process.env.DB_HOST (RAW):', process.env.DB_HOST);
console.log('process.env.DB_NAME (RAW):', process.env.DB_NAME);
console.log('process.env.DB_PASSWORD (RAW):', process.env.DB_PASSWORD);
console.log('process.env.DB_PORT (RAW):', process.env.DB_PORT);
console.log('--- FIN: Logs de depuración ---');

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
  console.log('Usando variables individuales (DB_USER, DB_HOST, etc.) para la conexión como fallback.');
  console.log('Variables de entorno de la Base de Datos (para Railway) - Fallback:', {
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

// Crea una nueva instancia de Pool con la configuración determinada
const pool = new Pool(poolConfig);

// Intentar conexión inmediata para validar al iniciar la app
pool.connect()
  .then(client => {
    console.log('✅ Conexión exitosa a la base de datos PostgreSQL en Railway.');
    client.release(); // Libera el cliente de vuelta al pool
  })
  .catch(err => {
    console.error('❌ Error al conectar a la base de datos en Railway:', err);
    console.error('Detalles de la configuración del pool que causó el error:', poolConfig); // Para depuración
    process.exit(1); // Salir de la aplicación si la conexión a la DB falla
  });

// ¡¡¡Esta línea es la exportación por defecto del pool!!!
export default pool;
