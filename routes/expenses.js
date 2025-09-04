const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');
const ExcelJS = require('exceljs');
const moment = require('moment');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// @route   GET /api/expenses
// @desc    Get all expenses
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, category } = req.query;
    
    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];
    
    if (start_date) {
      query += ' AND date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND date <= ?';
      params.push(end_date);
    }
    
    if (category) {
      query += ' AND category LIKE ?';
      params.push(`%${category}%`);
    }
    
    query += ' ORDER BY date DESC, created_at DESC';

    const [expenses] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/expenses/:id
// @desc    Get single expense
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const [expenses] = await db.promise().query(
      'SELECT * FROM expenses WHERE id = ?',
      [req.params.id]
    );

    if (expenses.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }

    res.json({
      success: true,
      data: expenses[0]
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/expenses
// @desc    Create new expense
// @access  Private
router.post('/', [
  body('category').notEmpty().withMessage('Category is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('date').isDate().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { category, amount, date, description } = req.body;

    const [result] = await db.promise().query(
      'INSERT INTO expenses (category, amount, date, description) VALUES (?, ?, ?, ?)',
      [category, amount, date, description]
    );

    const [newExpense] = await db.promise().query(
      'SELECT * FROM expenses WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: newExpense[0]
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update expense
// @access  Private
router.put('/:id', [
  body('category').notEmpty().withMessage('Category is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('date').isDate().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { category, amount, date, description } = req.body;
    const expenseId = req.params.id;

    // Check if expense exists
    const [existingExpense] = await db.promise().query(
      'SELECT id FROM expenses WHERE id = ?',
      [expenseId]
    );

    if (existingExpense.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }

    await db.promise().query(
      'UPDATE expenses SET category = ?, amount = ?, date = ?, description = ? WHERE id = ?',
      [category, amount, date, description, expenseId]
    );

    const [updatedExpense] = await db.promise().query(
      'SELECT * FROM expenses WHERE id = ?',
      [expenseId]
    );

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: updatedExpense[0]
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const expenseId = req.params.id;

    // Check if expense exists
    const [existingExpense] = await db.promise().query(
      'SELECT id FROM expenses WHERE id = ?',
      [expenseId]
    );

    if (existingExpense.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }

    await db.promise().query(
      'DELETE FROM expenses WHERE id = ?',
      [expenseId]
    );

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/expenses/summary/category
// @desc    Get expense summary by category
// @access  Private
router.get('/summary/category', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        category,
        SUM(amount) as total_amount,
        COUNT(*) as total_transactions,
        AVG(amount) as average_amount
      FROM expenses 
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
    
    query += ' GROUP BY category ORDER BY total_amount DESC';

    const [categoryExpenses] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: categoryExpenses
    });
  } catch (error) {
    console.error('Get category expense summary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/expenses/summary/monthly
// @desc    Get monthly expense summary
// @access  Private
router.get('/summary/monthly', async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const [monthlyExpenses] = await db.promise().query(
      `SELECT 
        MONTH(date) as month,
        YEAR(date) as year,
        SUM(amount) as total_amount,
        COUNT(*) as total_transactions
      FROM expenses 
      WHERE YEAR(date) = ?
      GROUP BY MONTH(date), YEAR(date)
      ORDER BY month ASC`,
      [currentYear]
    );

    res.json({
      success: true,
      data: monthlyExpenses
    });
  } catch (error) {
    console.error('Get monthly expense summary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Export Excel as buffer
router.get('/export/excel', async (req, res) => {
  try {
    const { start_date, end_date, category } = req.query;
    let query = `SELECT date, category, amount, description FROM expenses WHERE 1=1`;
    const params = [];
    if (start_date) { query += ' AND date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND date <= ?'; params.push(end_date); }
    if (category) { query += ' AND category LIKE ?'; params.push(`%${category}%`); }
    query += ' ORDER BY date DESC';
    const [rows] = await db.promise().query(query, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Pengeluaran');
    sheet.columns = [
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'Kategori', key: 'category', width: 25 },
      { header: 'Jumlah', key: 'amount', width: 20 },
      { header: 'Keterangan', key: 'description', width: 40 }
    ];
    rows.forEach(r => sheet.addRow({
      date: moment(r.date).format('DD/MM/YYYY'),
      category: r.category,
      amount: r.amount,
      description: r.description || ''
    }));
    sheet.getRow(1).font = { bold: true };

    const filename = `pengeluaran-${moment().format('YYYYMMDD-HHmmss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Export expenses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
