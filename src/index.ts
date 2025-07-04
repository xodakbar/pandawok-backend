import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRoutes from './routes/users.routes';
import authRoutes from './routes/auth.routes';

dotenv.config();

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
