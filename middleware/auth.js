const jwt = require('jsonwebtoken');
const db = require('../config/database');

const auth = async (req, res, next) => {
  try {
    console.log('Auth middleware called'); // Debug log
    
    const authHeader = req.header('Authorization');
    console.log('Authorization header:', authHeader); // Debug log
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No token provided'); // Debug log
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token received:', token); // Debug log

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    console.log('Token decoded:', decoded); // Debug log
    
    // Get user from database
    const [rows] = await db.promise().query(
      'SELECT id, username, fullname FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0) {
      console.log('User not found in database'); // Debug log
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. User not found.' 
      });
    }

    req.user = rows[0];
    console.log('User authenticated:', req.user); // Debug log
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

module.exports = auth;