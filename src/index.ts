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

app.use('/api/users', usersRoutes); // ✅ Aquí usas el Router, NO un handler

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});
