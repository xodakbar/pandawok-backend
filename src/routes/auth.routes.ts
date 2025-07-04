import { Router } from 'express';
import { loginUser } from '../controllers/auth.controller';

const router = Router();

router.post('/login', (req, res, next) => {
    loginUser(req, res).catch(next);
});

export default router;
