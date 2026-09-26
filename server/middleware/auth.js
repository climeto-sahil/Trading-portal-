import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const authenticateUser = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing. Please log in.',
      });
    }

    const secret = process.env.JWT_SECRET || 'trading_portal_jwt_secret_dev_key_2026';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    // Enforce status checks (Requirement 5 & 12)
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

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.',
    });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user?.role || 'Guest'}' is not authorized to access this resource.`,
      });
    }
    next();
  };
};
