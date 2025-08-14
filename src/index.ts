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
import estadisticasRoutes from './routes/estadisticas.routes';
import mesaBloqueosRoutes from './routes/mesaBloqueos.routes';
import horarioRoutes from './routes/horario.routes';
import tagsRoutes from './routes/tags.routes';  // <-- Importa rutas de tags

import './config/db'; // conexión a la base de datos

dotenv.config();

console.log('=== Variables de entorno al iniciar servidor ===');
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('===============================================');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'pandawok-reserve.netlify.app',
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

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('API está funcionando correctamente!');
});

// Rutas existentes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/horarios', horarioRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/waiting-list', waitingListRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/salones', salonRoutes);
app.use('/api/mesas/bloqueos', mesaBloqueosRoutes);

// Nueva ruta para tags
app.use('/api/tags', tagsRoutes);

app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error capturado:', err);
  res.status(err.status || 500).json({ mensaje: err.message || 'Error interno del servidor' });
});

const PORT = Number(process.env.PORT) || 8080;
if (isNaN(PORT)) {
  console.error('ERROR: La variable de entorno PORT no es un número válido.');
  process.exit(1);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor escuchando en puerto ${PORT}`);
  console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'desconocido'}`);
});
