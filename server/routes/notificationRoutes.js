import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import {
  listNotifications,
  getNotification,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/', listNotifications);
router.post('/read-all', markAllNotificationsRead);
router.get('/:id', getNotification);
router.post('/:id/read', markNotificationRead);

export default router;
