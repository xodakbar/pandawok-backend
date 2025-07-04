import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRoutes from './routes/users.routes';
import authRoutes from './routes/auth.routes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  res.status(200).send('API está funcionando correctamente!');
});
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// ************************************************************
// CAMBIO AQUI: SOLO USA process.env.PORT
// ************************************************************
const PORT = parseInt(process.env.PORT as string, 10); // Aseguramos que sea string antes de parseInt
// OJO: Si process.env.PORT no existe, esto podría fallar. Pero Railway siempre lo provee.

if (isNaN(PORT)) {
    console.error('ERROR: La variable de entorno PORT no es un número válido.');
    // Puedes salir del proceso si es crítico
    process.exit(1); 
}

app.listen(PORT, '0.0.0.0', () => { 
  console.log(`Servidor listo y escuchando en el puerto ${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV}`);
});