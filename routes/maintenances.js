const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const ExcelJS = require('exceljs');
const moment = require('moment');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// @route   GET /api/maintenances
// @desc    Get all maintenances
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, item_name } = req.query;
    
    let query = 'SELECT * FROM maintenances WHERE 1=1';
    const params = [];
    
    if (start_date) {
      query += ' AND start_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND end_date <= ?';
      params.push(end_date);
    }
    
    if (item_name) {
      query += ' AND item_name LIKE ?';
      params.push(`%${item_name}%`);
    }
    
    query += ' ORDER BY start_date DESC, created_at DESC';

    const [maintenances] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: maintenances
    });
  } catch (error) {
    console.error('Get maintenances error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/maintenances/:id
// @desc    Get single maintenance
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const [maintenances] = await db.promise().query(
      'SELECT * FROM maintenances WHERE id = ?',
      [req.params.id]
    );

    if (maintenances.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Maintenance not found' 
      });
    }

    res.json({
      success: true,
      data: maintenances[0]
    });
  } catch (error) {
    console.error('Get maintenance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/maintenances
// @desc    Create new maintenance
// @access  Private
router.post('/', upload.single('photo'), [
  body('item_name').notEmpty().withMessage('Item name is required'),
  body('start_date').isDate().withMessage('Valid start date is required'),
  body('end_date').isDate().withMessage('Valid end date is required'),
  body('cost').isFloat({ min: 0 }).withMessage('Cost must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { item_name, start_date, end_date, cost, description } = req.body;
    const photo_path = req.file ? req.file.filename : null;

    // Validate date range
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date cannot be after end date' 
      });
    }

    const [result] = await db.promise().query(
      'INSERT INTO maintenances (item_name, start_date, end_date, cost, description, photo_path) VALUES (?, ?, ?, ?, ?, ?)',
      [item_name, start_date, end_date, cost, description, photo_path]
    );

    const [newMaintenance] = await db.promise().query(
      'SELECT * FROM maintenances WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Maintenance created successfully',
      data: newMaintenance[0]
    });
  } catch (error) {
    console.error('Create maintenance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/maintenances/:id
// @desc    Update maintenance
// @access  Private
router.put('/:id', upload.single('photo'), [
  body('item_name').notEmpty().withMessage('Item name is required'),
  body('start_date').isDate().withMessage('Valid start date is required'),
  body('end_date').isDate().withMessage('Valid end date is required'),
  body('cost').isFloat({ min: 0 }).withMessage('Cost must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { item_name, start_date, end_date, cost, description } = req.body;
    const maintenanceId = req.params.id;
    const photo_path = req.file ? req.file.filename : null;

    // Check if maintenance exists
    const [existingMaintenance] = await db.promise().query(
      'SELECT id, photo_path FROM maintenances WHERE id = ?',
      [maintenanceId]
    );

    if (existingMaintenance.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Maintenance not found' 
      });
    }

    // Validate date range
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date cannot be after end date' 
      });
    }

    // If new photo uploaded, use new photo_path, otherwise keep existing
    const finalPhotoPath = photo_path || existingMaintenance[0].photo_path;

    await db.promise().query(
      'UPDATE maintenances SET item_name = ?, start_date = ?, end_date = ?, cost = ?, description = ?, photo_path = ? WHERE id = ?',
      [item_name, start_date, end_date, cost, description, finalPhotoPath, maintenanceId]
    );

    const [updatedMaintenance] = await db.promise().query(
      'SELECT * FROM maintenances WHERE id = ?',
      [maintenanceId]
    );

    res.json({
      success: true,
      message: 'Maintenance updated successfully',
      data: updatedMaintenance[0]
    });
  } catch (error) {
    console.error('Update maintenance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/maintenances/:id
// @desc    Delete maintenance
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const maintenanceId = req.params.id;

    // Check if maintenance exists
    const [existingMaintenance] = await db.promise().query(
      'SELECT id, photo_path FROM maintenances WHERE id = ?',
      [maintenanceId]
    );

    if (existingMaintenance.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Maintenance not found' 
      });
    }

    // Delete photo file if exists
    if (existingMaintenance[0].photo_path) {
      const fs = require('fs');
      const path = require('path');
      const photoPath = path.join(__dirname, '../uploads', existingMaintenance[0].photo_path);
      
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    await db.promise().query(
      'DELETE FROM maintenances WHERE id = ?',
      [maintenanceId]
    );

    res.json({
      success: true,
      message: 'Maintenance deleted successfully'
    });
  } catch (error) {
    console.error('Delete maintenance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/maintenances/summary/cost
// @desc    Get maintenance cost summary
// @access  Private
router.get('/summary/cost', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        SUM(cost) as total_cost,
        COUNT(*) as total_maintenances,
        AVG(cost) as average_cost,
        MIN(cost) as min_cost,
        MAX(cost) as max_cost
      FROM maintenances 
      WHERE 1=1
    `;
    
    const params = [];
    
    if (start_date) {
      query += ' AND start_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND end_date <= ?';
      params.push(end_date);
    }

    const [costSummary] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: costSummary[0]
    });
  } catch (error) {
    console.error('Get maintenance cost summary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/maintenances/summary/monthly
// @desc    Get monthly maintenance summary
// @access  Private
router.get('/summary/monthly', async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const [monthlyMaintenances] = await db.promise().query(
      `SELECT 
        MONTH(start_date) as month,
        YEAR(start_date) as year,
        SUM(cost) as total_cost,
        COUNT(*) as total_maintenances
      FROM maintenances 
      WHERE YEAR(start_date) = ?
      GROUP BY MONTH(start_date), YEAR(start_date)
      ORDER BY month ASC`,
      [currentYear]
    );

    res.json({
      success: true,
      data: monthlyMaintenances
    });
  } catch (error) {
    console.error('Get monthly maintenance summary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/maintenances/export/excel
// @desc    Export maintenances to Excel
// @access  Private
router.get('/export/excel', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `SELECT item_name, start_date, end_date, cost, description FROM maintenances WHERE 1=1`;
    const params = [];
    if (start_date) { query += ' AND start_date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND end_date <= ?'; params.push(end_date); }
    query += ' ORDER BY start_date DESC';
    const [rows] = await db.promise().query(query, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Pemeliharaan');
    sheet.columns = [
      { header: 'Peralatan', key: 'item_name', width: 25 },
      { header: 'Mulai', key: 'start_date', width: 15 },
      { header: 'Selesai', key: 'end_date', width: 15 },
      { header: 'Biaya', key: 'cost', width: 20 },
      { header: 'Keterangan', key: 'description', width: 40 }
    ];
    rows.forEach(r => sheet.addRow({
      item_name: r.item_name,
      start_date: moment(r.start_date).format('DD/MM/YYYY'),
      end_date: moment(r.end_date).format('DD/MM/YYYY'),
      cost: r.cost,
      description: r.description || ''
    }));
    sheet.getRow(1).font = { bold: true };

    const filename = `pemeliharaan-${moment().format('YYYYMMDD-HHmmss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Export maintenances error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
