const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// @route   GET /api/collectors
// @desc    Get all milk collectors
// @access  Private
router.get('/', async (req, res) => {
  try {
    const [collectors] = await db.promise().query(
      'SELECT * FROM milk_collectors ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: collectors
    });
  } catch (error) {
    console.error('Get collectors error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/collectors/:id
// @desc    Get single milk collector
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const collectorId = req.params.id;
    // Ambil data collector
    const [collectors] = await db.promise().query(
      'SELECT * FROM milk_collectors WHERE id = ?',
      [collectorId]
    );

    if (collectors.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Collector not found' 
      });
    }

    const collector = collectors[0];

    // Ambil collections 10 hari terakhir
    const [collections] = await db.promise().query(
      `SELECT date, morning_amount, afternoon_amount, 
        (morning_amount + afternoon_amount) AS total_amount, 
        price_per_liter, 
        ((morning_amount + afternoon_amount) * price_per_liter) AS total_income
      FROM milk_collections
      WHERE collector_id = ?
      ORDER BY date DESC
      LIMIT 10`,
      [collectorId]
    );

    // Hitung summary
    let summary = {
      total_amount: 0,
      total_income: 0,
      average_amount: 0,
      days_count: 0
    };
    if (collections.length > 0) {
      summary.days_count = collections.length;
      summary.total_amount = collections.reduce((sum, c) => sum + parseFloat(c.total_amount), 0);
      summary.total_income = collections.reduce((sum, c) => sum + parseFloat(c.total_income), 0);
      summary.average_amount = summary.total_amount / summary.days_count;
    }

    res.json({
      success: true,
      data: {
        ...collector,
        summary,
        collections
      }
    });
  } catch (error) {
    console.error('Get collector error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/collectors
// @desc    Create new milk collector
// @access  Private
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('address').optional().isLength({ max: 255 }).withMessage('Address too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, phone, address } = req.body;

    const [result] = await db.promise().query(
      'INSERT INTO milk_collectors (name, phone, address) VALUES (?, ?, ?)',
      [name, phone, address]
    );

    const [newCollector] = await db.promise().query(
      'SELECT * FROM milk_collectors WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Collector created successfully',
      data: newCollector[0]
    });
  } catch (error) {
    console.error('Create collector error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/collectors/:id
// @desc    Update milk collector
// @access  Private
router.put('/:id', [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('address').optional().isLength({ max: 255 }).withMessage('Address too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, phone, address } = req.body;
    const collectorId = req.params.id;

    // Check if collector exists
    const [existingCollector] = await db.promise().query(
      'SELECT id FROM milk_collectors WHERE id = ?',
      [collectorId]
    );

    if (existingCollector.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Collector not found' 
      });
    }

    await db.promise().query(
      'UPDATE milk_collectors SET name = ?, phone = ?, address = ? WHERE id = ?',
      [name, phone, address, collectorId]
    );

    const [updatedCollector] = await db.promise().query(
      'SELECT * FROM milk_collectors WHERE id = ?',
      [collectorId]
    );

    res.json({
      success: true,
      message: 'Collector updated successfully',
      data: updatedCollector[0]
    });
  } catch (error) {
    console.error('Update collector error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/collectors/:id
// @desc    Delete milk collector
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const collectorId = req.params.id;

    // Check if collector exists
    const [existingCollector] = await db.promise().query(
      'SELECT id FROM milk_collectors WHERE id = ?',
      [collectorId]
    );

    if (existingCollector.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Collector not found' 
      });
    }

    // Check if collector has collections
    const [collections] = await db.promise().query(
      'SELECT id FROM milk_collections WHERE collector_id = ?',
      [collectorId]
    );

    if (collections.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete collector with existing collection records' 
      });
    }

    await db.promise().query(
      'DELETE FROM milk_collectors WHERE id = ?',
      [collectorId]
    );

    res.json({
      success: true,
      message: 'Collector deleted successfully'
    });
  } catch (error) {
    console.error('Delete collector error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/collectors/stats/summary
// @desc    Get collector statistics summary
// @access  Private
router.get('/stats/summary', async (req, res) => {
  try {
    const [summary] = await db.promise().query(
      `SELECT 
        COUNT(*) as total_collectors,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as collectors_with_phone,
        COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END) as collectors_with_address
      FROM milk_collectors`
    );

    res.json({
      success: true,
      data: summary[0]
    });
  } catch (error) {
    console.error('Get collector summary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;