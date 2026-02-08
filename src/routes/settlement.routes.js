 import express from 'express';
 import authMiddleware from '../middlewares/auth.middleware.js';   
 import {
    createSettlement,
  getGroupSettlements,
  getSettlementById,
  deleteSettlement,
 } from '../controllers/settlement.controller.js';

 const router = express.Router();


 router.use(authMiddleware);

 router.post('/', createSettlement);

 router.get('/group/:groupId', getGroupSettlements);

 router.get('/:settlementId', getSettlementById);

 router.delete('/:settlementId', deleteSettlement);

 export default router ;