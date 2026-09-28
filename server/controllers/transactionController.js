import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { Agent } from '../models/Agent.js';
import { Deal } from '../models/Deal.js';
import { CounterParty } from '../models/CounterParty.js';

import { calculateTransactionTotal } from '../utils/calculations.js';
export const getTransactions = async (req, res) => {
  try {
    const { role, agentId } = req.user;
    const { dealId, category, type } = req.query;
    let query = {};

    if (dealId) query.dealId = dealId;
    if (category) query.category = category;
    if (type) query.type = type;

    if (role === 'ADMIN') {
      // Admin sees all matching query
    } else if (role === 'MY_AGENT') {
      const agent = await Agent.findOne({ agentId });
      if (agent) {
        query.myAgentId = agent._id;
      }
    } else if (role === 'COUNTER_AGENT') {
      const agent = await Agent.findOne({ agentId });
      if (agent) {
        query.counterPartyAgentId = agent._id;
      } else {
        return res.status(200).json({ success: true, transactions: [] });
      }
    }

    const transactions = await Transaction.find(query)
      .populate('counterPartyId')
      .populate('counterPartyAgentId')
      .populate('myAgentId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving transactions.',
      error: error.message,
    });
  }
};

export const createTransaction = async (req, res) => {
  try {
    const {
      dealId,
      type,
      category,
      quantity,
      ratePerKg,
      notes,
      status,
    } = req.body;
    let { counterPartyId, counterPartyAgentId, myAgentId } = req.body;

    if (!dealId || !type || !category || !quantity || !ratePerKg) {
      return res.status(422).json({
        success: false,
        message: 'Deal ID, type, category, quantity, and rate per KG are required.',
      });
    }

    const q = Number(quantity);
    const r = parseFloat(ratePerKg);
    const unit = req.body.unit || req.body.quantityUnit || 'MT';
    const materialType = req.body.materialType || 'Recycling';
    const totalAmount = calculateTransactionTotal(q, unit, r).totalAmount;

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

    const count = await Transaction.countDocuments();
    const txId = `tx_${Date.now()}_${count + 1}`;

    const newTx = await Transaction.create({
      txId,
      dealId,
      type,
      category,
      materialType,
      counterPartyId,
      counterPartyAgentId,
      myAgentId,
      quantity: q,
      unit,
      ratePerKg: r,
      totalAmount,
      notes: notes || '',
      status: status || 'Confirmed',
      createdBy: req.user._id,
    });

    const populated = await Transaction.findById(newTx._id)
      .populate('counterPartyId')
      .populate('counterPartyAgentId')
      .populate('myAgentId');

    return res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully.',
      transaction: populated,
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating transaction.',
      error: error.message,
    });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const tx = await Transaction.findOne({ $or: [{ _id: id }, { txId: id }] });

    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // Role check
    if (req.user.role === 'MY_AGENT') {
      const agent = await Agent.findOne({ agentId: req.user.agentId });
      if (agent && tx.myAgentId?.toString() !== agent._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only edit transactions assigned to you.' });
      }
    } else if (req.user.role === 'COUNTER_AGENT') {
      return res.status(403).json({ success: false, message: 'Counter Agents are not permitted to edit transactions.' });
    }

    const q = req.body.quantity !== undefined ? Number(req.body.quantity) : tx.quantity;
    const r = req.body.ratePerKg !== undefined ? Number(req.body.ratePerKg) : tx.ratePerKg;
    const totalAmount = calculateTransactionTotal(q, req.body.unit || req.body.quantityUnit || tx.unit || 'MT', r).totalAmount;

    const updateData = {
      ...req.body,
      quantity: q,
      ratePerKg: r,
      totalAmount,
    };
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

    await Transaction.findByIdAndUpdate(tx._id, updateData, { new: true });

    const updated = await Transaction.findById(tx._id)
      .populate('counterPartyId')
      .populate('counterPartyAgentId')
      .populate('myAgentId');

    return res.status(200).json({
      success: true,
      message: 'Transaction updated successfully.',
      transaction: updated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error updating transaction.' });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const tx = await Transaction.findOne({ $or: [{ _id: id }, { txId: id }] });

    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only administrators can delete transactions.' });
    }

    await Transaction.findByIdAndDelete(tx._id);

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error deleting transaction.' });
  }
};
