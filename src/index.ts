import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import usersRoutes from './routes/users.routes';
import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/client.routes';
import reservasRoutes from './routes/reservas.routes';
import waitingListRoutes from './routes/WaitingList.Routes';
import mesasRoutes from './routes/mesas.routes';
import salonRoutes from './routes/salones.routes';
import mesaBloqueosRoutes from './routes/mesaBloqueos.routes'; // <- Importa la nueva ruta

import './config/db'; // conexión a la base de datos

dotenv.config();

// Logging de variables de entorno (útil para debugging)
console.log('=== Variables de entorno al iniciar servidor ===');
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('===============================================');

const app = express();

// Lista blanca para CORS (dominios permitidos)
const allowedOrigins = [
  'http://localhost:5173',
  'https://pandawok.netlify.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Middleware para parsear JSON del body
app.use(express.json());

// Ruta raíz para comprobar estado de la API
app.get('/', (req, res) => {
  res.status(200).send('API está funcionando correctamente!');
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clientes', clientRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/waiting-list', waitingListRoutes);
app.use('/api/mesas', mesasRoutes);     // ✅ Incluye rutas de mesas (get y put)
app.use('/api/salones', salonRoutes);   // ✅ Incluye rutas de salones
app.use('/api/mesas/bloqueos', mesaBloqueosRoutes);// ✅ Nueva ruta para bloqueos de mesa

// Middleware de manejo de errores (opcional pero recomendado)
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error capturado:', err);
  res.status(err.status || 500).json({ mensaje: err.message || 'Error interno del servidor' });
});

// Arranque del servidor
const PORT = Number(process.env.PORT) || 8080;
if (isNaN(PORT)) {
  console.error('ERROR: La variable de entorno PORT no es un número válido.');
  process.exit(1);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor escuchando en puerto ${PORT}`);
  console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'desconocido'}`);
});
