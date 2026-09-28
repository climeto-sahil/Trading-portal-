import mongoose from 'mongoose';
import { Deal } from '../models/Deal.js';
import { Transaction } from '../models/Transaction.js';
import { Agent } from '../models/Agent.js';
import { CounterParty } from '../models/CounterParty.js';

export const getDeals = async (req, res) => {
  try {
    const { role, agentId, _id: userId } = req.user;
    let query = {};

    if (role === 'ADMIN') {
      query = {}; // Admin sees all
    } else if (role === 'MY_AGENT') {
      const agent = await Agent.findOne({ agentId });
      if (agent) {
        query = { $or: [{ myAgentId: agent._id }, { createdBy: userId }] };
      } else {
        query = { createdBy: userId };
      }
    } else if (role === 'COUNTER_AGENT') {
      const agent = await Agent.findOne({ agentId });
      if (agent) {
        query = { counterPartyAgentId: agent._id };
      } else {
        return res.status(200).json({ success: true, deals: [] });
      }
    }

    const deals = await Deal.find(query)
      .populate('counterPartyId')
      .populate('counterPartyAgentId')
      .populate('myAgentId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      deals,
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving deals.',
      error: error.message,
    });
  }
};

export const getDealById = async (req, res) => {
  try {
    const { id } = req.params;
    const deal = await Deal.findOne({ $or: [{ _id: id }, { dealId: id }] })
      .populate('counterPartyId')
      .populate('counterPartyAgentId')
      .populate('myAgentId');

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found.',
      });
    }

    // Role-based access check
    const { role, agentId } = req.user;
    if (role === 'MY_AGENT') {
      const agent = await Agent.findOne({ agentId });
      if (agent && deal.myAgentId?._id?.toString() !== agent._id.toString() && deal.createdBy?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to access this deal.",
        });
      }
    } else if (role === 'COUNTER_AGENT') {
      const agent = await Agent.findOne({ agentId });
      if (agent && deal.counterPartyAgentId?._id?.toString() !== agent._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to access this deal.",
        });
      }
    }

    return res.status(200).json({
      success: true,
      deal,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving deal details.',
    });
  }
};

export const createDeal = async (req, res) => {
  try {
    let { counterPartyId, counterPartyAgentId, myAgentId, status, notes, categories } = req.body;

    if (!counterPartyId || !counterPartyAgentId || !myAgentId) {
      return res.status(400).json({ success: false, message: 'Counter Party, Counter Party Agent, and My Agent are required.' });
    }

    // Auto-create if they are raw strings instead of IDs
    if (counterPartyId && (!mongoose.isValidObjectId(counterPartyId) || !(await CounterParty.findById(counterPartyId)))) {
      const newCp = await CounterParty.create({ name: counterPartyId, agentId: `CP-${Date.now()}`, city: 'N/A' });
      counterPartyId = newCp._id;
    }
    if (counterPartyAgentId && (!mongoose.isValidObjectId(counterPartyAgentId) || !(await Agent.findById(counterPartyAgentId)))) {
      const newA = await Agent.create({ name: counterPartyAgentId, agentId: `AGT-${Date.now()}`, agentType: 'Counter Party Agent', status: 'Active' });
      counterPartyAgentId = newA._id;
    }
    if (myAgentId && (!mongoose.isValidObjectId(myAgentId) || !(await Agent.findById(myAgentId)))) {
      const newA = await Agent.create({ name: myAgentId, agentId: `AGT-${Date.now()}`, agentType: 'My Agent', status: 'Active' });
      myAgentId = newA._id;
    }

    const allDeals = await Deal.find({});
    const allTxs = await Transaction.find({});
    let maxNum = 124;
    for (const d of allDeals) {
      const m = String(d.dealId || '').match(/DEAL-(\d+)/i);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    // Include orphan tx dealIds so we never reuse an ID that still has leftover transactions
    for (const t of allTxs) {
      const m = String(t.dealId || '').match(/DEAL-(\d+)/i);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    const dealId = `DEAL-${String(maxNum + 1).padStart(6, '0')}`;

    const newDeal = await Deal.create({
      dealId,
      counterPartyId,
      counterPartyAgentId,
      myAgentId,
      status: status || 'Enquiry',
      notes: notes || '',
      categories: categories || [],
      createdBy: req.user._id,
      date: new Date(),
    });

    const populated = await Deal.findById(newDeal._id)
      .populate('counterPartyId')
      .populate('counterPartyAgentId')
      .populate('myAgentId');

    return res.status(201).json({
      success: true,
      message: 'Deal created successfully.',
      deal: populated,
    });
  } catch (error) {
    console.error('Error creating deal:', error);
    try { import('fs').then(fs => fs.writeFileSync('deal_error_log.txt', String(error.stack || error.message))); } catch(e) {}
    return res.status(500).json({
      success: false,
      message: 'Server error creating deal.',
      error: error.message,
    });
  }
};

export const updateDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const deal = await Deal.findById(id);

    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found.' });
    }

    // Role check: Only ADMIN or assigned MY_AGENT can update deal
    if (req.user.role === 'MY_AGENT') {
      const agent = await Agent.findOne({ agentId: req.user.agentId });
      if (agent && deal.myAgentId?.toString() !== agent._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only edit deals assigned to you.' });
      }
    } else if (req.user.role === 'COUNTER_AGENT') {
      return res.status(403).json({ success: false, message: 'Counter Agents are not permitted to edit deals.' });
    }

    const updateData = { ...req.body };
    delete updateData._id;

    // Auto-create if they are raw strings instead of IDs
    if (updateData.counterPartyId && (!mongoose.isValidObjectId(updateData.counterPartyId) || !(await CounterParty.findById(updateData.counterPartyId)))) {
      const newCp = await CounterParty.create({ name: updateData.counterPartyId, agentId: `CP-${Date.now()}`, city: 'N/A' });
      updateData.counterPartyId = newCp._id;
    }
    if (updateData.counterPartyAgentId && (!mongoose.isValidObjectId(updateData.counterPartyAgentId) || !(await Agent.findById(updateData.counterPartyAgentId)))) {
      const newA = await Agent.create({ name: updateData.counterPartyAgentId, agentId: `AGT-${Date.now()}`, agentType: 'Counter Party Agent', status: 'Active' });
      updateData.counterPartyAgentId = newA._id;
    }
    if (updateData.myAgentId && (!mongoose.isValidObjectId(updateData.myAgentId) || !(await Agent.findById(updateData.myAgentId)))) {
      const newA = await Agent.create({ name: updateData.myAgentId, agentId: `AGT-${Date.now()}`, agentType: 'My Agent', status: 'Active' });
      updateData.myAgentId = newA._id;
    }

    await Deal.findByIdAndUpdate(id, updateData, { new: true });
    
    const updated = await Deal.findById(id)
      .populate('counterPartyId')
      .populate('counterPartyAgentId')
      .populate('myAgentId');

    return res.status(200).json({
      success: true,
      message: 'Deal updated successfully.',
      deal: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating deal.' });
  }
};

export const updateDealStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found.' });
    }

    // Requirement 22: Only authorized roles can change deal status
    if (req.user.role === 'COUNTER_AGENT') {
      return res.status(403).json({ success: false, message: 'Counter Agents cannot modify deal status.' });
    }

    deal.status = status;
    if (status === 'Confirmed') {
      deal.confirmationDate = new Date();
    }
    await deal.save();

    const populated = await Deal.findById(id)
      .populate('counterPartyId')
      .populate('counterPartyAgentId')
      .populate('myAgentId');

    return res.status(200).json({
      success: true,
      message: `Deal status updated to ${status}.`,
      deal: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating deal status.' });
  }
};

export const deleteDeal = async (req, res) => {
  try {
    const { id } = req.params;
    // Only Admin can delete deals
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only administrators can delete deals.' });
    }

    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found.' });
    }

    await Transaction.deleteMany({ dealId: deal.dealId });
    await Deal.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Deal and all related transactions deleted.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error deleting deal.' });
  }
};

export const addDealCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, materialType } = req.body;

    if (!category) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }

    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found.' });
    }

    const existingCats = deal.categories || [];
    const alreadyHas = existingCats.some(c => c.name === category && c.type === (materialType || 'Recycling'));
    if (!alreadyHas) {
      deal.categories = [...existingCats, { name: category, type: materialType || 'Recycling' }];
      await deal.save();
    }

    return res.status(200).json({ success: true, deal });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating deal categories.' });
  }
};

