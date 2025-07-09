import { Router } from 'express';
import { createReservaWalkIn } from '../controllers/Walkin.controller';

const router = Router();

router.post('/', (req, res, next) => {
  createReservaWalkIn(req, res).catch(next);
});

export default router;
