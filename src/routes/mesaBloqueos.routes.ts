import { Router } from 'express';
import { 
  crearBloqueoMesa, 
  obtenerBloqueosPorSalonYFecha,
  obtenerBloqueosPorMesaYFecha,
  desbloquearBloqueoMesa
} from '../controllers/mesaBloqueos.controller';

const router = Router();

router.post('/', (req, res, next) => {
  crearBloqueoMesa(req, res, next).catch(next);
});

router.get('/salon/:salonId', (req, res, next) => {
  obtenerBloqueosPorSalonYFecha(req, res, next).catch(next);
});

router.get('/mesa/:mesaId', (req, res, next) => {
  obtenerBloqueosPorMesaYFecha(req, res, next).catch(next);
});

// CORREGIDO: La ruta debe ser solo '/:id/desbloquear' porque ya está bajo '/api/mesas/bloqueos'
router.put('/:id/desbloquear', (req, res, next) => {
  desbloquearBloqueoMesa(req, res, next).catch(next);
});

export default router;
