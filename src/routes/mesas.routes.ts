import { Router } from 'express';
import { getMesasPorSalon, actualizarPosicionMesa } from '../controllers/mesas.controller';

const router = Router();

// Obtener todas las mesas activas de un salón
router.get('/salon/:id/mesas', getMesasPorSalon);

// Actualizar posición de una mesa
router.put('/:id/posicion', actualizarPosicionMesa);

export default router;
