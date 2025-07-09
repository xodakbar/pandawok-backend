import { Router } from 'express';
import * as reservasController from '../controllers/reservas.controller';

const router = Router();

router.get('/mesa/:mesaId', (req, res, next) => {
  reservasController.getReservaByMesa(req, res).catch(next);
});

router.get('/:id', (req, res, next) => {
  reservasController.getReservaById(req, res).catch(next);
});

router.get('/', (req, res, next) => {
  reservasController.getReservas(req, res).catch(next);
});

router.post('/', (req, res, next) => {
  reservasController.createReserva(req, res).catch(next);
});

export default router;
