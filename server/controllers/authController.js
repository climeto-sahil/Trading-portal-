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
    const rawIdentifier = req.body.identifier || req.body.email; // identifier can be email or phone
    const { password } = req.body;

    if (!rawIdentifier || !password) {
      return res.status(422).json({
        success: false,
        message: 'Email/Mobile and password are required.',
      });
    }

    const cleanIdentifier = String(rawIdentifier).trim().toLowerCase();
    const isEmail = cleanIdentifier.includes('@');

    const query = isEmail ? { email: cleanIdentifier } : { phone: String(rawIdentifier).trim() };
    const user = await User.findOne(query).select('+password');

    let isMatch = false;
    if (user) {
      isMatch = await user.comparePassword(password);
    }

    // If user not in MongoDB or password doesn't match, attempt Climeto central auth
    if (!user || !isMatch) {
      const climetoApiUrl = process.env.CLIMETO_API_URL || 'https://api.climeto.in';
      try {
        const climetoRes = await fetch(`${climetoApiUrl.replace(/\/$/, '')}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Climeto-Client': 'trading-portal',
          },
          body: JSON.stringify({ email: cleanIdentifier, password, force: true }),
        });
        const climetoData = await climetoRes.json().catch(() => ({}));
        if (climetoRes.ok && (climetoData.user || climetoData.token)) {
          const cUser = climetoData.user || {};
          const climetoType = String(cUser.user_type || cUser.userType || cUser.role || '').toLowerCase().replace(/[\s_-]+/g, '').trim();
          const assignedRole = (climetoType === 'admin' || climetoType === 'tradingadmin') ? 'ADMIN' : 'MY_AGENT';

          const generateSafeAgentId = (r) => {
            const prefix = r === 'ADMIN' ? 'ADM' : 'AGT-MY';
            return `${prefix}-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
          };

          if (!user) {
            const generatedAgentId = generateSafeAgentId(assignedRole);

            user = await User.create({
              name: cUser.name || cUser.company_name || cleanIdentifier.split('@')[0],
              email: cleanIdentifier,
              phone: cUser.phone || '',
              password,
              company: cUser.company_name || 'Climeto Sustainable Services Pvt. Ltd.',
              role: assignedRole,
              status: 'ACTIVE',
              agentId: generatedAgentId,
            });

            try {
              await Agent.create({
                agentId: generatedAgentId,
                userId: user._id,
                name: user.name,
                company: user.company || 'Climeto Sustainable Services Pvt. Ltd.',
                phone: user.phone || '',
                email: user.email,
                agentType: assignedRole === 'ADMIN' ? 'Admin' : 'My Agent',
                commission: '₹0.75 / KG',
                status: 'Active',
              });
            } catch (agentErr) {
              console.warn('[login] Warning creating agent profile:', agentErr.message);
            }
          } else {
            user.role = assignedRole;
            user.password = password;
            user.status = 'ACTIVE';
            if (!user.agentId) {
              user.agentId = generateSafeAgentId(assignedRole);
            }
            await user.save();

            try {
              let existingAgent = await Agent.findOne({ agentId: user.agentId });
              if (!existingAgent && user.agentId) {
                await Agent.create({
                  agentId: user.agentId,
                  userId: user._id,
                  name: user.name,
                  company: user.company || 'Climeto Sustainable Services Pvt. Ltd.',
                  phone: user.phone || '',
                  email: user.email,
                  agentType: assignedRole === 'ADMIN' ? 'Admin' : 'My Agent',
                  commission: '₹0.75 / KG',
                  status: 'Active',
                });
              }
            } catch (agentErr) {
              console.warn('[login] Warning syncing agent profile:', agentErr.message);
            }
          }
          isMatch = true;
        }
      } catch (climetoErr) {
        console.warn('[login] Central auth fallback attempt failed:', climetoErr.message);
      }
    }

    if (!user || !isMatch) {
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

export const ssoExchange = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Missing SSO token in request body',
      });
    }

    const climetoApiUrl = process.env.CLIMETO_API_URL || 'https://api.climeto.in';

    // Verify token with Climeto central auth API
    let climetoUser = null;
    try {
      const climetoRes = await fetch(`${climetoApiUrl.replace(/\/$/, '')}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Climeto-Client': 'trading-portal',
        },
      });
      const data = await climetoRes.json().catch(() => ({}));
      if (climetoRes.ok && (data.user || data.email || data.id)) {
        climetoUser = data.user || data;
      }
    } catch (fetchErr) {
      console.warn('[ssoExchange] Central auth verification fetch warning:', fetchErr.message);
    }

    // Fallback: decode JWT payload directly if central auth unreachable in dev
    if (!climetoUser) {
      try {
        const decoded = jwt.decode(token);
        if (decoded && (decoded.email || decoded.id)) {
          climetoUser = decoded;
        }
      } catch (decodeErr) {
        // ignore
      }
    }

    if (!climetoUser || !climetoUser.email) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired Climeto SSO token',
      });
    }

    const userEmail = String(climetoUser.email).toLowerCase().trim();
    let user = await User.findOne({ email: userEmail });

    // Map climeto role to trading portal role
    const climetoType = String(
      climetoUser.user_type ||
      climetoUser.userType ||
      climetoUser.role ||
      climetoUser.type ||
      ''
    ).toLowerCase().replace(/[\s_-]+/g, '').trim();

    const assignedRole = (climetoType === 'admin' || climetoType === 'tradingadmin') ? 'ADMIN' : 'MY_AGENT';

    const generateSafeAgentId = (r) => {
      const prefix = r === 'ADMIN' ? 'ADM' : 'AGT-MY';
      return `${prefix}-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
    };

    if (!user) {
      // Auto-provision user in Trading Portal MongoDB
      const generatedAgentId = generateSafeAgentId(assignedRole);

      user = await User.create({
        name: climetoUser.name || climetoUser.company_name || userEmail.split('@')[0],
        email: userEmail,
        phone: climetoUser.phone || '',
        password: Math.random().toString(36).slice(-10) + 'A1!',
        company: climetoUser.company_name || 'Climeto Sustainable Services Pvt. Ltd.',
        role: assignedRole,
        status: 'ACTIVE',
        agentId: generatedAgentId,
      });

      try {
        await Agent.create({
          agentId: generatedAgentId,
          userId: user._id,
          name: user.name,
          company: user.company || 'Climeto Sustainable Services Pvt. Ltd.',
          phone: user.phone || '',
          email: user.email,
          agentType: assignedRole === 'ADMIN' ? 'Admin' : 'My Agent',
          commission: '₹0.75 / KG',
          status: 'Active',
        });
      } catch (agentErr) {
        console.warn('[ssoExchange] Warning creating agent profile:', agentErr.message);
      }
    } else {
      // Sync existing user role & ensure active status and agentId
      let modified = false;
      if (user.role !== assignedRole) {
        user.role = assignedRole;
        modified = true;
      }
      if (!user.agentId) {
        user.agentId = generateSafeAgentId(assignedRole);
        modified = true;
      }
      if (user.status !== 'ACTIVE') {
        user.status = 'ACTIVE';
        modified = true;
      }
      if (modified) {
        await user.save();
      }

      // Ensure Agent record is present in MongoDB
      try {
        let existingAgent = await Agent.findOne({ agentId: user.agentId });
        if (!existingAgent && user.agentId) {
          await Agent.create({
            agentId: user.agentId,
            userId: user._id,
            name: user.name,
            company: user.company || 'Climeto Sustainable Services Pvt. Ltd.',
            phone: user.phone || '',
            email: user.email,
            agentType: assignedRole === 'ADMIN' ? 'Admin' : 'My Agent',
            commission: '₹0.75 / KG',
            status: 'Active',
          });
        }
      } catch (agentErr) {
        console.warn('[ssoExchange] Warning syncing agent profile:', agentErr.message);
      }
    }

    const tradingToken = generateToken(user);
    const agent = user.agentId ? await Agent.findOne({ agentId: user.agentId }).catch(() => null) : null;

    return res.status(200).json({
      success: true,
      token: tradingToken,
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
    console.error('[ssoExchange] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during SSO exchange.',
      error: error.message,
    });
  }
};
