import { CounterParty } from '../models/CounterParty.js';
import { Deal } from '../models/Deal.js';
import { Agent } from '../models/Agent.js';

export const getCounterParties = async (req, res) => {
  try {
    const { role, agentId } = req.user;
    let counterparties = [];

    if (role === 'ADMIN') {
      counterparties = await CounterParty.find().sort({ name: 1 });
    } else if (role === 'MY_AGENT') {
      const myAgent = await Agent.findOne({ agentId });
      if (myAgent) {
        const assignedDeals = await Deal.find({ myAgentId: myAgent._id });
        const cpIds = assignedDeals.map(d => d.counterPartyId);
        counterparties = await CounterParty.find({ _id: { $in: cpIds } });
      } else {
        counterparties = await CounterParty.find();
      }
    } else if (role === 'COUNTER_AGENT') {
      const counterAgent = await Agent.findOne({ agentId });
      if (counterAgent) {
        const assignedDeals = await Deal.find({ counterPartyAgentId: counterAgent._id });
        const cpIds = assignedDeals.map(d => d.counterPartyId);
        counterparties = await CounterParty.find({ _id: { $in: cpIds } });
      } else {
        counterparties = [];
      }
    }

    return res.status(200).json({
      success: true,
      counterparties,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving counterparties.',
    });
  }
};

export const getCounterPartyById = async (req, res) => {
  try {
    const { id } = req.params;
    const cp = await CounterParty.findById(id);
    if (!cp) {
      return res.status(404).json({ success: false, message: 'Counter Party not found.' });
    }
    return res.status(200).json({ success: true, counterParty: cp });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const updateCounterParty = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.agentId; // Core ID
    delete updateData.email; // Non-editable per request
    
    const updated = await CounterParty.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Counter Party not found.' });
    }
    return res.status(200).json({ success: true, counterParty: updated });
  } catch (error) {
    console.error('Error updating counterparty:', error);
    return res.status(500).json({ success: false, message: 'Server error updating counterparty.' });
  }
};
