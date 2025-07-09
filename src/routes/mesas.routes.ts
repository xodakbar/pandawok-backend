import { Router } from 'express';
import {
  getMesasPorSalon,
  actualizarPosicionMesa,
  agregarMesa,
  eliminarMesa
} from '../controllers/mesas.controller';

const router = Router();

// Obtener todas las mesas activas de un salón
router.get('/salon/:id/mesas', getMesasPorSalon);

// Actualizar posición de una mesa
router.put('/:id/posicion', actualizarPosicionMesa);

// Agregar una nueva mesa
router.post('/', agregarMesa);

// Eliminar una mesa por id
router.delete('/:id', eliminarMesa);

export default router;
