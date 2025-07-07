import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRoutes from './routes/users.routes';
import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/client.routes'; // Importa correctamente la ruta clients

dotenv.config();

console.log('=== Variables de entorno al iniciar servidor ===');
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('===============================================');

const app = express();

// Lista blanca para CORS (frontends permitidos)
const allowedOrigins = [
  'http://localhost:5173',
  'https://pandawok.netlify.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // Permite solicitudes sin origin (como Postman) o si está en la lista blanca
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Middleware para parsear JSON en el body
app.use(express.json());

// Ruta base para testear que la API funciona
app.get('/', (req, res) => {
  res.status(200).send('API está funcionando correctamente!');
});

// Rutas con prefijos
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientRoutes); // Clientes con prefijo /api/clients

// Validar puerto y arrancar servidor
const PORT = Number(process.env.PORT) || 8080;
if (isNaN(PORT)) {
  console.error('ERROR: La variable de entorno PORT no es un número válido.');
  process.exit(1);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor listo y escuchando en el puerto ${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'desconocido'}`);
});
