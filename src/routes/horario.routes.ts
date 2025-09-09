import { Router } from 'express';
import * as horariosController from '../controllers/horarios.controller';

const router = Router();

router.get('/horarios-disponibles', (req, res, next) => {
  horariosController.getHorariosDisponibles(req, res).catch(next);
});

router.put('/:id', (req, res, next) => {
  horariosController.updateHorario(req,res).catch(next)
  // TODO: implement the update logic or call the appropriate controller method
});


export default router;
