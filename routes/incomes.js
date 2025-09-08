const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');
const ExcelJS = require('exceljs');
const moment = require('moment');
const upload = require('../middleware/upload');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// @route   GET /api/incomes
// @desc    Get all incomes
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, source } = req.query;
    
    let query = 'SELECT * FROM incomes WHERE 1=1';
    const params = [];
    
    if (start_date) {
      query += ' AND date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND date <= ?';
      params.push(end_date);
    }
    
    if (source) {
      query += ' AND source LIKE ?';
      params.push(`%${source}%`);
    }
    
    query += ' ORDER BY date DESC, created_at DESC';

    const [incomes] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: incomes
    });
  } catch (error) {
    console.error('Get incomes error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/incomes/:id
// @desc    Get single income
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const [incomes] = await db.promise().query(
      'SELECT * FROM incomes WHERE id = ?',
      [req.params.id]
    );

    if (incomes.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Income not found' 
      });
    }

    res.json({
      success: true,
      data: incomes[0]
    });
  } catch (error) {
    console.error('Get income error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/incomes
// @desc    Create new income
// @access  Private
router.post('/', upload.single('proof_image'), [
  body('source').notEmpty().withMessage('Source is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('date').isISO8601().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { source, amount, date, description } = req.body;
    const proof_image = req.file ? req.file.filename : null;

    const [result] = await db.promise().query(
      'INSERT INTO incomes (source, amount, date, description, proof_image) VALUES (?, ?, ?, ?, ?)',
      [source, amount, date, description, proof_image]
    );

    const [newIncome] = await db.promise().query(
      'SELECT * FROM incomes WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Income created successfully',
      data: newIncome[0]
    });
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/incomes/:id
// @desc    Update income
// @access  Private
router.put('/:id', upload.single('proof_image'), [
  body('source').notEmpty().withMessage('Source is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { source, amount, description } = req.body;
    const proof_image = req.file ? req.file.filename : null;
    const incomeId = req.params.id;

    // Check if income exists
    const [existingIncome] = await db.promise().query(
      'SELECT id, proof_image FROM incomes WHERE id = ?',
      [incomeId]
    );

    if (existingIncome.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Income not found' 
      });
    }

    // If no new file uploaded, keep the existing proof_image
    const finalProofImage = proof_image || existingIncome[0].proof_image;

    await db.promise().query(
      'UPDATE incomes SET source = ?, amount = ?, description = ?, proof_image = ? WHERE id = ?',
      [source, amount, description, finalProofImage, incomeId]
    );

    const [updatedIncome] = await db.promise().query(
      'SELECT * FROM incomes WHERE id = ?',
      [incomeId]
    );

    res.json({
      success: true,
      message: 'Income updated successfully',
      data: updatedIncome[0]
    });
  } catch (error) {
    console.error('Update income error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/incomes/:id
// @desc    Delete income
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const incomeId = req.params.id;

    // Check if income exists
    const [existingIncome] = await db.promise().query(
      'SELECT id FROM incomes WHERE id = ?',
      [incomeId]
    );

    if (existingIncome.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Income not found' 
      });
    }

    await db.promise().query(
      'DELETE FROM incomes WHERE id = ?',
      [incomeId]
    );

    res.json({
      success: true,
      message: 'Income deleted successfully'
    });
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/incomes/summary/monthly
// @desc    Get monthly income summary
// @access  Private
router.get('/summary/monthly', async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const [monthlyIncomes] = await db.promise().query(
      `SELECT 
        MONTH(date) as month,
        YEAR(date) as year,
        SUM(amount) as total_amount,
        COUNT(*) as total_transactions
      FROM incomes 
      WHERE YEAR(date) = ?
      GROUP BY MONTH(date), YEAR(date)
      ORDER BY month ASC`,
      [currentYear]
    );

    res.json({
      success: true,
      data: monthlyIncomes
    });
  } catch (error) {
    console.error('Get monthly income summary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/incomes/summary/source
// @desc    Get income summary by source
// @access  Private
router.get('/summary/source', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        source,
        SUM(amount) as total_amount,
        COUNT(*) as total_transactions,
        AVG(amount) as average_amount
      FROM incomes 
      WHERE 1=1
    `;
    
    const params = [];
    
    if (start_date) {
      query += ' AND date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND date <= ?';
      params.push(end_date);
    }
    
    query += ' GROUP BY source ORDER BY total_amount DESC';

    const [sourceIncomes] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: sourceIncomes
    });
  } catch (error) {
    console.error('Get source income summary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/incomes/export/excel
// @desc    Export incomes to Excel
// @access  Private
router.get('/export/excel', async (req, res) => {
  try {
    const { start_date, end_date, source } = req.query;

    let query = `
      SELECT date, source, amount, description
      FROM incomes WHERE 1=1
    `;
    const params = [];
    if (start_date) { query += ' AND date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND date <= ?'; params.push(end_date); }
    if (source) { query += ' AND source LIKE ?'; params.push(`%${source}%`); }
    query += ' ORDER BY date DESC';

    const [rows] = await db.promise().query(query, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Pemasukan');
    sheet.columns = [
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'Sumber', key: 'source', width: 30 },
      { header: 'Jumlah', key: 'amount', width: 20 },
      { header: 'Keterangan', key: 'description', width: 40 }
    ];
    rows.forEach(r => sheet.addRow({
      date: moment(r.date).format('DD/MM/YYYY'),
      source: r.source,
      amount: r.amount,
      description: r.description || ''
    }));
    sheet.getRow(1).font = { bold: true };

    const filename = `pemasukan-${moment().format('YYYYMMDD-HHmmss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Export incomes error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
