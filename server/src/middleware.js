const jwt = require('jsonwebtoken');
const { User } = require('./models');

exports.auth = async (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Please sign in.' });
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id);
    if (!user) return res.status(401).json({ error: 'Account not found. Please sign in again.' });
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
};

exports.admin = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Temple admin access only.' });
