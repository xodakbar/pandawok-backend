import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRoutes from './routes/users.routes';
import authRoutes from './routes/auth.routes';

dotenv.config();

// Mostrar variables de entorno relevantes al iniciar (solo para debug)
console.log('=== Variables de entorno al iniciar servidor ===');
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('===============================================');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.get('/', (req, res) => {
  res.status(200).send('API está funcionando correctamente!');
});
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// Obtener el puerto desde variable de entorno o usar fallback (Railway siempre provee PORT)
const PORT = parseInt(process.env.PORT || '8080', 10);

// Validación del puerto
if (isNaN(PORT)) {
  console.error('ERROR: La variable de entorno PORT no es un número válido.');
  process.exit(1);
}

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor listo y escuchando en el puerto ${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'desconocido'}`);
});
