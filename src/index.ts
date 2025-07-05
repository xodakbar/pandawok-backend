import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRoutes from './routes/users.routes';
import authRoutes from './routes/auth.routes';

dotenv.config();

console.log('=== Variables de entorno al iniciar servidor ===');
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('===============================================');

const app = express();

// Middleware CORS configurado para permitir solo tu frontend en Netlify
app.use(cors({
  origin: 'https://pandawok.netlify.app', // aquí pon la URL real de Netlify, por ejemplo "https://pandawok-netify.netlify.app"
  credentials: true, // si usas cookies o autenticación que lo requiera
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('API está funcionando correctamente!');
});
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

const PORT = parseInt(process.env.PORT || '8080', 10);
if (isNaN(PORT)) {
  console.error('ERROR: La variable de entorno PORT no es un número válido.');
  process.exit(1);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor listo y escuchando en el puerto ${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'desconocido'}`);
});
