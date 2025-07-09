import { Router } from 'express';
import {
  getWaitingList,
  createWaitingEntry,
  updateWaitingEntry,
  deleteWaitingEntry,
} from '../controllers/waitingList.controller';

const router = Router();

router.get('/', (req, res, next) => {
  getWaitingList(req, res).catch(next);
});

router.post('/', (req, res, next) => {
  createWaitingEntry(req, res).catch(next);
});

router.put('/:id', (req, res, next) => {
  updateWaitingEntry(req, res).catch(next);
});

router.delete('/:id', (req, res, next) => {
  deleteWaitingEntry(req, res).catch(next);
});

export default router;
