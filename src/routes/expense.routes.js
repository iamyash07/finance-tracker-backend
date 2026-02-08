import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js'
import { uploadAvatar } from '../middlewares/multer.middlewares.js';
import {
    createExpense,
    getGroupExpenses,
    updateExpense,
    deleteExpense,
    getGroupBalances,
    getDashboardTotals
} from '../controllers/expense.controller.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', uploadAvatar, createExpense);
router.get('/group/:groupId', getGroupExpenses);
router.patch('/:expenseId', uploadAvatar, updateExpense);
router.delete('/:expenseId', deleteExpense);
router.get('/balances/:groupId', getGroupBalances);
router.get('/dashboard', getDashboardTotals);

export default router;