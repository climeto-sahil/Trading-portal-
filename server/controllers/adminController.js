import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving users.',
    });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(status)) {
      return res.status(422).json({
        success: false,
        message: 'Invalid status. Must be PENDING, ACTIVE, SUSPENDED, or INACTIVE.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.status = status;
    await user.save();

    // Also update linked agent status if present
    if (user.agentId) {
      await Agent.findOneAndUpdate(
        { agentId: user.agentId },
        { status: status === 'ACTIVE' ? 'Active' : status === 'SUSPENDED' ? 'Suspended' : 'Inactive' }
      );
    }

    return res.status(200).json({
      success: true,
      message: `User status changed to ${status}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating user status.' });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['ADMIN', 'MY_AGENT', 'COUNTER_AGENT'].includes(role)) {
      return res.status(422).json({
        success: false,
        message: 'Invalid role. Must be ADMIN, MY_AGENT, or COUNTER_AGENT.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.role = role;
    await user.save();

    if (user.agentId) {
      await Agent.findOneAndUpdate(
        { agentId: user.agentId },
        { agentType: role === 'MY_AGENT' ? 'My Agent' : role === 'COUNTER_AGENT' ? 'Counter Party Agent' : 'Admin' }
      );
    }

    return res.status(200).json({
      success: true,
      message: `User role updated to ${role}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating user role.' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    if (user.agentId) {
      await Agent.findOneAndDelete({ agentId: user.agentId });
    }
    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'User account removed.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error deleting user.' });
  }
};
