const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { normalizeUser } = require('../lib/normalize');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, monthlyBudget: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = normalizeUser(user);
    next();
  } catch {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
