import express from 'express';
import {
  getDeals,
  getDealById,
  createDeal,
  updateDeal,
  updateDealStatus,
  deleteDeal,
} from '../controllers/dealController.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/', getDeals);
router.get('/:id', getDealById);
router.post('/', authorizeRoles('ADMIN', 'MY_AGENT'), createDeal);
router.put('/:id', authorizeRoles('ADMIN', 'MY_AGENT'), updateDeal);
router.put('/:id/status', authorizeRoles('ADMIN', 'MY_AGENT'), updateDealStatus);
router.delete('/:id', authorizeRoles('ADMIN'), deleteDeal);

export default router;
