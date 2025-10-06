import { Router } from 'express';
import {
  getMesasPorSalon,
  actualizarPosicionMesa,
  actualizarMesa,
  agregarMesa,
  eliminarMesa
} from '../controllers/mesas.controller';

const router = Router();

// Obtener todas las mesas activas de un salón
router.get('/salon/:salon_id/mesas', getMesasPorSalon);
// Actualizar posición de una mesa
router.put('/:id/posicion', actualizarPosicionMesa);
// Actualizar una mesa completa
router.put('/:id', actualizarMesa);

// Agregar una nueva mesa
router.post('/', agregarMesa);

// Eliminar una mesa por id
router.delete('/:id', eliminarMesa);

export default router;
