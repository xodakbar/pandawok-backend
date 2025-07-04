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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  // Cambia este console.log para que no diga localhost
  console.log(`Servidor listo y escuchando en el puerto ${PORT}`);
  // También puedes añadir un log para el entorno
  console.log(`Entorno: ${process.env.NODE_ENV}`);
});