import express from 'express';
import { getCounterParties, getCounterPartyById, updateCounterParty } from '../controllers/counterPartyController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/', getCounterParties);
router.get('/:id', getCounterPartyById);
router.put('/:id', updateCounterParty);

export default router;
