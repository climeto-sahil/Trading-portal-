import express from 'express';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transactionController.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/', getTransactions);
router.post('/', authorizeRoles('ADMIN', 'MY_AGENT'), createTransaction);
router.put('/:id', authorizeRoles('ADMIN', 'MY_AGENT'), updateTransaction);
router.delete('/:id', authorizeRoles('ADMIN'), deleteTransaction);

export default router;
