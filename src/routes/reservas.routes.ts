import { Router } from 'express';
import { createReserva } from '../controllers/reservas.controller';

const router = Router();

// Forma correcta de asignar el controlador a la ruta
router.post('/', (req, res, next) => {
  createReserva(req, res).catch(next);
});

export default router;