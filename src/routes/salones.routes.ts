import { Router } from 'express';
import { getSalones } from '../controllers/salones.controller';

const router = Router();

router.get('/', (req, res, next) => {
  getSalones(req, res).catch(next);
});

export default router;
