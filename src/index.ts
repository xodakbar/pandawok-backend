import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRoutes from './routes/users.routes';
import authRoutes from './routes/auth.routes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// ************************************************************
// CAMBIO AQUI: Convertir process.env.PORT a un número
// ************************************************************
const PORT = parseInt(process.env.PORT || '5000', 10); // Convierte a número. '5000' es el fallback string.

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor listo y escuchando en el puerto ${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV}`);
});