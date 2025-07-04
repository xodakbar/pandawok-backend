import { Router } from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/users.controller';

const router = Router();

router.get('/', (req, res, next) => {
  getUsers(req, res).catch(next);
});

router.post('/', (req, res, next) => {
  createUser(req, res).catch(next);
});

router.put('/:id', (req, res, next) => {
  updateUser(req, res).catch(next);
});

router.delete('/:id', (req, res, next) => {
  deleteUser(req, res).catch(next);
});

export default router;
