import { Router } from 'express';
import * as reservasController from '../controllers/reservas.controller';

const router = Router();

// Obtener reservas por mesa y fecha

router.get('/byDate', (req, res, next) => {
  reservasController.getReservasByDate(req, res).catch(next);
});

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

// Actualizar reserva
router.put('/:id', (req, res, next) => {
  reservasController.updateReserva(req, res).catch(next);
});

// Crear reserva tipo walk-in (sin cliente)
router.post('/walk-in', (req, res, next) => {
  reservasController.createReservaWalkIn(req, res).catch(next);
});

// Marcar reserva como sentada
router.post('/:id/sentar', (req, res, next) => {
  reservasController.sentarReserva(req, res).catch(next);
});

// Eliminar reserva
router.delete('/:id', (req, res, next) => {
  reservasController.deleteReserva(req, res).catch(next);
});

// Historial de cliente
router.get('/cliente/:clienteId/historial', (req, res, next) => {
  reservasController.getHistorialReservasPorCliente(req, res).catch(next);
});

// Actualizar estado de reserva (admin)
router.post('/:id/estado', (req, res, next) => {
  reservasController.actualizarEstadoReserva(req, res).catch(next);
});

// ✅ Acción de confirmación/cancelación por token (cliente)
router.get('/accion/:token', (req, res, next) => {
  reservasController.accionReserva(req, res).catch(next);
});

export default router;
