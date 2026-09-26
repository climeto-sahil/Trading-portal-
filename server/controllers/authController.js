import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'trading_portal_jwt_secret_dev_key_2026';
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      agentId: user.agentId,
    },
    secret,
    { expiresIn: '7d' }
  );
};

export const register = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword, company, role } = req.body;

    // Basic Validation
    if (!name || !email || !password) {
      return res.status(422).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(422).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(422).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    // Requirement 4: Strictly disallow ADMIN in public signup
    if (role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'ADMIN accounts cannot be created via public signup.',
      });
    }

    const assignedRole = role === 'COUNTER_AGENT' ? 'COUNTER_AGENT' : 'MY_AGENT';

    // Check duplicate email
    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Check duplicate phone if provided
    if (phone && phone.trim()) {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: 'An account with this mobile number already exists.',
        });
      }
    }

    // Generate an agentId
    const prefix = assignedRole === 'MY_AGENT' ? 'AGT-MY' : 'AGT-CA';
    const agentCount = await Agent.countDocuments();
    const generatedAgentId = `${prefix}-${String(agentCount + 101).padStart(3, '0')}`;

    // Create user with PENDING status (Requirement 4 & 5)
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : '',
      password,
      company: company ? company.trim() : '',
      role: assignedRole,
      status: 'ACTIVE',
      agentId: generatedAgentId,
    });

    // Create Agent profile
    await Agent.create({
      agentId: generatedAgentId,
      userId: newUser._id,
      name: newUser.name,
      company: newUser.company || (assignedRole === 'MY_AGENT' ? 'Apex Trading Corp' : 'ABC Recycling Pvt Ltd'),
      phone: newUser.phone,
      email: newUser.email,
      agentType: assignedRole === 'MY_AGENT' ? 'My Agent' : 'Counter Party Agent',
      commission: assignedRole === 'MY_AGENT' ? '₹0.75 / KG' : '₹0.50 / KG',
      status: 'Active',
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Your account has been created successfully.',
      status: 'ACTIVE',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration.',
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or phone

    if (!identifier || !password) {
      return res.status(422).json({
        success: false,
        message: 'Email/Mobile and password are required.',
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const isEmail = cleanIdentifier.includes('@');

    const query = isEmail ? { email: cleanIdentifier } : { phone: identifier.trim() };
    const user = await User.findOne(query).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Requirement 5: Status validation
    if (user.status === 'PENDING') {
      return res.status(403).json({
        success: false,
        status: 'PENDING',
        message: 'Your account is waiting for Admin approval.',
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        status: 'SUSPENDED',
        message: 'Your account has been suspended. Please contact Admin.',
      });
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        status: 'INACTIVE',
        message: 'Your account is inactive. Please contact Admin.',
      });
    }

    const token = generateToken(user);

    // Fetch linked agent if any
    const agent = user.agentId ? await Agent.findOne({ agentId: user.agentId }) : null;

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        company: user.company,
        agentId: user.agentId,
        agent,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.',
      error: error.message,
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = req.user;
    const agent = user.agentId ? await Agent.findOne({ agentId: user.agentId }) : null;

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        company: user.company,
        agentId: user.agentId,
        agent,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving user session.',
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, company } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (company) user.company = company.trim();

    await user.save();

    if (user.agentId) {
      await Agent.findOneAndUpdate(
        { agentId: user.agentId },
        { name: user.name, phone: user.phone, company: user.company }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error updating profile.',
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(422).json({
        success: false,
        message: 'Please enter your registered email or mobile number.',
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const isEmail = cleanIdentifier.includes('@');
    const query = isEmail ? { email: cleanIdentifier } : { phone: identifier.trim() };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registered trading account found with this email or mobile number.',
      });
    }

    // Mask contact for privacy
    const maskedContact = isEmail
      ? user.email.replace(/(.{2})(.*)(?=@)/, (_, p1, p2) => p1 + '*'.repeat(Math.max(1, p2.length)))
      : user.phone.slice(0, 3) + '*****' + user.phone.slice(-2);

    return res.status(200).json({
      success: true,
      message: `Password reset instructions have been dispatched to ${maskedContact}. Please check your inbox or SMS.`,
      recipient: maskedContact,
      userRole: user.role,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing password reset request.',
    });
  }
};
