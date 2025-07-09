import { Router } from 'express';
import * as reservasController from '../controllers/reservas.controller';

const router = Router();

// Obtener reservas por mesa y fecha
router.get('/mesa/:mesaId', (req, res, next) => {
  reservasController.getReservaByMesa(req, res).catch(next);
});

// Obtener reserva por ID
router.get('/:id', (req, res, next) => {
  reservasController.getReservaById(req, res).catch(next);
});

// Obtener todas las reservas
router.get('/', (req, res, next) => {
  reservasController.getReservas(req, res).catch(next);
});

// Crear reserva normal (con cliente)
router.post('/', (req, res, next) => {
  reservasController.createReserva(req, res).catch(next);
});

router.put('/:id', (req, res, next) => {
  reservasController.updateReserva(req, res).catch(next);
});

// Crear reserva tipo walk-in (sin cliente)
router.post('/walk-in', (req, res, next) => {
  reservasController.createReservaWalkIn(req, res).catch(next);
});

export default router;
