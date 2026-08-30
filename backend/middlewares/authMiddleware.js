const jwt = require('jsonwebtoken');
const { setContextUser } = require('./requestContextMiddleware');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = {
                id: decoded.id,
                role: decoded.role,
                vendor_id: decoded.vendor_id,
                email: decoded.email || null
            };

            // Register user in active AsyncLocalStorage context
            setContextUser(req.user);

            return next();
        } catch (error) {
            logger.warn('JWT verification failed', { error });
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Middleware to check if user is admin
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        logger.warn('Unauthorized admin access attempt', { userId: req.user?.id, role: req.user?.role });
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, adminOnly };
