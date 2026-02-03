import express from "express";
import authMiddleware from '../middlewares/auth.middleware.js';

import {
    createGroup,
    getMyGroups,
    getGroupById
} from '../controllers/group.controller.js'

const router = express.Router();

// All goups routes are protected 

router.use(authMiddleware);


router.post('/', createGroup);
router.get('/my-groups', getMyGroups);
router.get('/:id', getGroupById);


export default router;