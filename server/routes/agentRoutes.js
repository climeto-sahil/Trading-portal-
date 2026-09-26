import express from 'express';
import { getAgents, getAgentById, updateAgent } from '../controllers/agentController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/', getAgents);
router.get('/:id', getAgentById);
router.put('/:id', updateAgent);

export default router;
