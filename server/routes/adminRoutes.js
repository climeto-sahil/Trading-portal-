import express from 'express';
import {
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
} from '../controllers/adminController.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateUser);
router.use(authorizeRoles('ADMIN'));

router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

export default router;
