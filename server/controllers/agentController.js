import { Agent } from '../models/Agent.js';
import { Deal } from '../models/Deal.js';
import { Transaction } from '../models/Transaction.js';

export const getAgents = async (req, res) => {
  try {
    const { role, agentId } = req.user;
    let agents = [];

    if (role === 'ADMIN') {
      agents = await Agent.find().sort({ createdAt: -1 });
    } else if (role === 'MY_AGENT') {
      // My Agent can see themselves + Counter Agents associated with their deals
      const myAgentDoc = await Agent.findOne({ agentId });
      if (myAgentDoc) {
        const assignedDeals = await Deal.find({ myAgentId: myAgentDoc._id });
        const counterAgentIds = assignedDeals.map(d => d.counterPartyAgentId);
        agents = await Agent.find({
          $or: [{ _id: myAgentDoc._id }, { _id: { $in: counterAgentIds } }],
        });
      } else {
        agents = await Agent.find({ agentType: 'My Agent' });
      }
    } else if (role === 'COUNTER_AGENT') {
      // Counter Agent can see themselves + My Agent associated with their deals
      const counterAgentDoc = await Agent.findOne({ agentId });
      if (counterAgentDoc) {
        const assignedDeals = await Deal.find({ counterPartyAgentId: counterAgentDoc._id });
        const myAgentIds = assignedDeals.map(d => d.myAgentId);
        agents = await Agent.find({
          $or: [{ _id: counterAgentDoc._id }, { _id: { $in: myAgentIds } }],
        });

        // Mask internal commission metrics for My Agent when viewed by Counter Agent (Req 18 & 30)
        agents = agents.map(a => {
          const doc = a.toObject();
          if (doc.agentType === 'My Agent') {
            doc.commission = 'Confidential';
            doc.totalPurchaseValue = undefined;
            doc.totalSaleValue = undefined;
          }
          return doc;
        });
      } else {
        agents = [];
      }
    }

    return res.status(200).json({
      success: true,
      agents,
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving agents.',
      error: error.message,
    });
  }
};

export const getAgentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;

    const agent = await Agent.findOne({ $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { agentId: id }] });
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found.' });
    }

    const agentData = agent.toObject();

    // Requirement 18 & 30: Data masking for Counter Agent
    if (role === 'COUNTER_AGENT' && agentData.agentType === 'My Agent') {
      agentData.commission = 'Confidential';
      agentData.totalPurchaseValue = undefined;
      agentData.totalSaleValue = undefined;
    }

    return res.status(200).json({
      success: true,
      agent: agentData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving agent profile.',
    });
  }
};

export const updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.agentId; // Don't allow changing core ID
    delete updateData.email; // Cannot update email per user request
    
    const updated = await Agent.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Agent not found.' });
    }
    return res.status(200).json({ success: true, agent: updated });
  } catch (error) {
    console.error('Error updating agent:', error);
    return res.status(500).json({ success: false, message: 'Server error updating agent.' });
  }
};
