import { Router } from 'express';
import * as horariosController from '../controllers/horarios.controller';

const router = Router();

router.get('/horarios-disponibles', (req, res, next) => {
  horariosController.getHorariosDisponibles(req, res).catch(next);
});

export default router;
