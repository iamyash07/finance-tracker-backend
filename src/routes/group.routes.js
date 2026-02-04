import express from "express";
import authMiddleware from '../middlewares/auth.middleware.js';

import {
    createGroup,
    getMyGroups,
    getGroupById,
    addMember,
    removeMember,
    leaveGroup,
    deleteGroup,
} from '../controllers/group.controller.js'

const router = express.Router();

// All goups routes are protected 

router.use(authMiddleware);


router.post('/', createGroup);
router.get('/my-groups', getMyGroups);
router.get('/:id', getGroupById);

// New member management routes
router.post('/:groupId/members', addMember);
router.delete('/:groupId/members/:memberId', removeMember);
router.post('/:groupId/leave', leaveGroup);
router.delete('/:groupId', deleteGroup);


export default router;