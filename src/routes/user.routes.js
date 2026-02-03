import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { getCurrentUser, updateCurrentUser } from '../controllers/user.controller.js';

const router = express.Router();

router.use(authMiddleware);


router.route('/me')
    .get(getCurrentUser)
    .patch(updateCurrentUser)

    export default router;