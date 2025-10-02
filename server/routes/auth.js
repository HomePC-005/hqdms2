const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const emailService = require('../services/emailService');
const router = express.Router();

// JWT secret (in production, this should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Register endpoint
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, ic_number, password } = req.body;

    // Validate input
    if (!name || !ic_number || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, IC Number, and password are required'
      });
    }

    // Validate IC Number format (numbers only, no dashes or special characters)
    if (!/^\d+$/.test(ic_number)) {
      return res.status(400).json({
        success: false,
        message: 'IC Number must contain only numbers (no dashes or special characters)'
      });
    }

    // Check if user already exists
    const existingUserQuery = 'SELECT id FROM users WHERE ic_number = $1';
    const existingUserResult = await client.query(existingUserQuery, [ic_number]);
    
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this IC Number already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in database
    const insertUserQuery = `
      INSERT INTO users (name, ic_number, password) 
      VALUES ($1, $2, $3) 
      RETURNING id, name, ic_number, created_at
    `;
    const result = await client.query(insertUserQuery, [name, ic_number, hashedPassword]);
    const newUser = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        ic_number: newUser.ic_number,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const client = await pool.connect();
  try {
    const { ic_number, password } = req.body;

    // Validate input
    if (!ic_number || !password) {
      return res.status(400).json({
        success: false,
        message: 'IC Number and password are required'
      });
    }

    // Validate IC Number format (numbers only, no dashes or special characters)
    if (!/^\d+$/.test(ic_number)) {
      return res.status(400).json({
        success: false,
        message: 'IC Number must contain only numbers (no dashes or special characters)'
      });
    }

    // Find user in database
    const userQuery = 'SELECT id, name, ic_number, password, created_at FROM users WHERE ic_number = $1';
    const userResult = await client.query(userQuery, [ic_number]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid IC Number or password'
      });
    }

    const user = userResult.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid IC Number or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        ic_number: user.ic_number,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        ic_number: user.ic_number,
        createdAt: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// Verify token endpoint
router.get('/verify', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    // Get fresh user data from database
    const userQuery = 'SELECT id, name, ic_number, created_at FROM users WHERE id = $1';
    const userResult = await client.query(userQuery, [req.user.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        ic_number: user.ic_number,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res) => {
  const client = await pool.connect();
  try {
    const { ic_number } = req.body;

    // Validate input
    if (!ic_number) {
      return res.status(400).json({
        success: false,
        message: 'IC Number is required'
      });
    }

    // Validate IC Number format (numbers only, no dashes or special characters)
    if (!/^\d+$/.test(ic_number)) {
      return res.status(400).json({
        success: false,
        message: 'IC Number must contain only numbers (no dashes or special characters)'
      });
    }

    // Check if user exists
    const userQuery = 'SELECT id, name, ic_number FROM users WHERE ic_number = $1';
    const userResult = await client.query(userQuery, [ic_number]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this IC Number'
      });
    }

    const user = userResult.rows[0];

    // Reset password to IC Number (same as user ID)
    const hashedPassword = await bcrypt.hash(ic_number, 10);

    // Update user's password with IC Number
    const updatePasswordQuery = 'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await client.query(updatePasswordQuery, [hashedPassword, user.id]);

    res.json({
      success: true,
      message: 'Password has been reset! Your new password is the same as your IC Number.',
      user: {
        id: user.id,
        name: user.name,
        ic_number: user.ic_number
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// Change password endpoint
router.post('/change-password', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get current user password
    const userQuery = 'SELECT password FROM users WHERE id = $1';
    const userResult = await client.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const updatePasswordQuery = 'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await client.query(updatePasswordQuery, [hashedNewPassword, userId]);

    // Send password change confirmation email if email exists
    const userInfoQuery = 'SELECT name, email FROM users WHERE id = $1';
    const userInfoResult = await client.query(userInfoQuery, [userId]);
    if (userInfoResult.rows.length > 0) {
      const userInfo = userInfoResult.rows[0];
      if (userInfo.email) {
        await emailService.sendPasswordChangeConfirmation(userInfo.email, userInfo.name);
      }
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // In a real application, you might want to blacklist the token
  // For now, we'll just return success since JWT tokens are stateless
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;
