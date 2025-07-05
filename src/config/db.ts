import { Pool } from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env en desarrollo local
dotenv.config();

// Mostrar la variable para verificar que esté llegando bien (puedes quitar luego)
console.log('DATABASE_URL en backend:', process.env.DATABASE_URL);

// Configuración del pool usando DATABASE_URL y SSL para Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Probar conexión al iniciar
pool.connect()
  .then(client => {
    console.log('✅ Conectado a la base de datos PostgreSQL correctamente.');
    client.release();
  })
  .catch(err => {
    console.error('❌ Error al conectar a la base de datos:', err);
    process.exit(1);  // Opcional: salir si no se conecta
  });

export default pool;
