import { Router } from 'express';
import { googleAuthInit, googleCallback } from '../controllers/google.controller';

const router = Router();

router.get('/init', googleAuthInit);
router.get('/callback', googleCallback);

export default router;
