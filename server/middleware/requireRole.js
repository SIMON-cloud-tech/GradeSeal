// middleware/requireRole.js
const User = require('../models/User');

/**
 * Restrict a route to specific roles.
 * Must be used AFTER authMiddleware (which populates req.user.id).
 *
 * @param {...string} allowedRoles - e.g. requireRole('ceo') or requireRole('ceo', 'qa')
 */
module.exports = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // authMiddleware guarantees req.user.id exists
      const user = await User.findById(req.user.id).select('role status');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ message: 'Account is suspended' });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          message: `Forbidden. Requires role: ${allowedRoles.join(' or ')}` 
        });
      }

      // Attach current role to req for downstream use
      req.user.role = user.role;
      next();
    } catch (err) {
      next(err);
    }
  };
};