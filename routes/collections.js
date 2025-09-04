const express = require('express');
const { body, validationResult } = require('express-validator');
const ExcelJS = require('exceljs');
const moment = require('moment');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);



// @route   GET /api/collections
// @desc    Get all milk collections with collector info
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, collector_id } = req.query;
    
    let query = `
      SELECT 
        mc.*,
        mcl.name as collector_name,
        mcl.phone as collector_phone,
        (mc.morning_amount + mc.afternoon_amount) as total_amount,
        ((mc.morning_amount + mc.afternoon_amount) * mc.price_per_liter) as total_income
      FROM milk_collections mc
      JOIN milk_collectors mcl ON mc.collector_id = mcl.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (start_date) {
      query += ' AND mc.date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND mc.date <= ?';
      params.push(end_date);
    }
    
    if (collector_id) {
      query += ' AND mc.collector_id = ?';
      params.push(collector_id);
    }
    
    query += ' ORDER BY mc.date DESC, mc.id DESC';

    const [collections] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: collections
    });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/collections/:id
// @desc    Get single milk collection
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const [collections] = await db.promise().query(
      `SELECT 
        mc.*,
        mcl.name as collector_name,
        mcl.phone as collector_phone,
        (mc.morning_amount + mc.afternoon_amount) as total_amount,
        ((mc.morning_amount + mc.afternoon_amount) * mc.price_per_liter) as total_income
      FROM milk_collections mc
      JOIN milk_collectors mcl ON mc.collector_id = mcl.id
      WHERE mc.id = ?`,
      [req.params.id]
    );

    if (collections.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Collection not found' 
      });
    }

    res.json({
      success: true,
      data: collections[0]
    });
  } catch (error) {
    console.error('Get collection error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/collections
// @desc    Create new milk collection
// @access  Private
router.post('/', [
  body('collector_id').isInt().withMessage('Valid collector ID is required'),
  body('morning_amount').optional().isFloat({ min: 0 }).withMessage('Morning amount must be a positive number'),
  body('afternoon_amount').optional().isFloat({ min: 0 }).withMessage('Afternoon amount must be a positive number'),
  body('price_per_liter').isFloat({ min: 0 }).withMessage('Price per liter must be a positive number'),
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

    const { collector_id, date } = req.body;
    const morning_amount = req.body.morning_amount !== undefined ? Number(req.body.morning_amount) : 0;
    const afternoon_amount = req.body.afternoon_amount !== undefined ? Number(req.body.afternoon_amount) : 0;
    let price_per_liter = req.body.price_per_liter !== undefined ? Number(req.body.price_per_liter) : undefined;

    if ((morning_amount <= 0) && (afternoon_amount <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Either morning_amount or afternoon_amount must be greater than 0'
      });
    }

    // Check if collector exists
    const [collector] = await db.promise().query(
      'SELECT id FROM milk_collectors WHERE id = ?',
      [collector_id]
    );

    if (collector.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Collector not found' 
      });
    }

    // Check if collection already exists for this date and collector with same time period
    // Allow multiple collections per day per collector (morning and afternoon)
    const [existingCollections] = await db.promise().query(
      'SELECT id, morning_amount, afternoon_amount FROM milk_collections WHERE collector_id = ? AND date = ?',
      [collector_id, date]
    );

    // Check if we're trying to add morning data when morning already exists
    if (morning_amount > 0 && existingCollections.some(c => c.morning_amount > 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Morning collection already exists for this date and collector. Please edit the existing record instead.' 
      });
    }

    // Check if we're trying to add afternoon data when afternoon already exists
    if (afternoon_amount > 0 && existingCollections.some(c => c.afternoon_amount > 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Afternoon collection already exists for this date and collector. Please edit the existing record instead.' 
      });
    }



    const [result] = await db.promise().query(
      'INSERT INTO milk_collections (collector_id, morning_amount, afternoon_amount, price_per_liter, date) VALUES (?, ?, ?, ?, ?)',
      [collector_id, morning_amount, afternoon_amount, price_per_liter, date]
    );

    const [newCollection] = await db.promise().query(
      `SELECT 
        mc.*,
        mcl.name as collector_name,
        mcl.phone as collector_phone,
        (mc.morning_amount + mc.afternoon_amount) as total_amount,
        ((mc.morning_amount + mc.afternoon_amount) * mc.price_per_liter) as total_income
      FROM milk_collections mc
      JOIN milk_collectors mcl ON mc.collector_id = mcl.id
      WHERE mc.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Collection created successfully',
      data: newCollection[0]
    });
  } catch (error) {
    console.error('Create collection error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/collections/:id
// @desc    Update milk collection
// @access  Private
router.put('/:id', [
  body('collector_id').isInt().withMessage('Valid collector ID is required'),
  body('morning_amount').optional().isFloat({ min: 0 }).withMessage('Morning amount must be a positive number'),
  body('afternoon_amount').optional().isFloat({ min: 0 }).withMessage('Afternoon amount must be a positive number'),
  body('price_per_liter').isFloat({ min: 0 }).withMessage('Price per liter must be a positive number'),
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

    const { collector_id, date } = req.body;
    const morning_amount = req.body.morning_amount !== undefined ? Number(req.body.morning_amount) : 0;
    const afternoon_amount = req.body.afternoon_amount !== undefined ? Number(req.body.afternoon_amount) : 0;
    let price_per_liter = req.body.price_per_liter !== undefined ? Number(req.body.price_per_liter) : undefined;

    if ((morning_amount <= 0) && (afternoon_amount <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Either morning_amount or afternoon_amount must be greater than 0'
      });
    }
    const collectionId = req.params.id;

    // Check if collection exists
    const [existingCollection] = await db.promise().query(
      'SELECT id FROM milk_collections WHERE id = ?',
      [collectionId]
    );

    if (existingCollection.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Collection not found' 
      });
    }

    // Check if collector exists
    const [collector] = await db.promise().query(
      'SELECT id FROM milk_collectors WHERE id = ?',
      [collector_id]
    );

    if (collector.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Collector not found' 
      });
    }

    // Check if another collection exists for this date and collector with same time period (excluding current collection)
    const [duplicateCollections] = await db.promise().query(
      'SELECT id, morning_amount, afternoon_amount FROM milk_collections WHERE collector_id = ? AND date = ? AND id != ?',
      [collector_id, date, collectionId]
    );

    // Check if we're trying to update morning data when morning already exists in another collection
    if (morning_amount > 0 && duplicateCollections.some(c => c.morning_amount > 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Morning collection already exists for this date and collector in another record. Please choose a different date or collector.' 
      });
    }

    // Check if we're trying to update afternoon data when afternoon already exists in another collection
    if (afternoon_amount > 0 && duplicateCollections.some(c => c.afternoon_amount > 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Afternoon collection already exists for this date and collector in another record. Please choose a different date or collector.' 
      });
    }



    await db.promise().query(
      'UPDATE milk_collections SET collector_id = ?, morning_amount = ?, afternoon_amount = ?, price_per_liter = ?, date = ? WHERE id = ?',
      [collector_id, morning_amount, afternoon_amount, price_per_liter, date, collectionId]
    );

    const [updatedCollection] = await db.promise().query(
      `SELECT 
        mc.*,
        mcl.name as collector_name,
        mcl.phone as collector_phone,
        (mc.morning_amount + mc.afternoon_amount) as total_amount,
        ((mc.morning_amount + mc.afternoon_amount) * mc.price_per_liter) as total_income
      FROM milk_collections mc
      JOIN milk_collectors mcl ON mc.collector_id = mcl.id
      WHERE mc.id = ?`,
      [collectionId]
    );

    res.json({
      success: true,
      message: 'Collection updated successfully',
      data: updatedCollection[0]
    });
  } catch (error) {
    console.error('Update collection error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/collections/:id
// @desc    Delete milk collection
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const collectionId = req.params.id;

    // Check if collection exists
    const [existingCollection] = await db.promise().query(
      'SELECT id FROM milk_collections WHERE id = ?',
      [collectionId]
    );

    if (existingCollection.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Collection not found' 
      });
    }

    await db.promise().query(
      'DELETE FROM milk_collections WHERE id = ?',
      [collectionId]
    );

    res.json({
      success: true,
      message: 'Collection deleted successfully'
    });
  } catch (error) {
    console.error('Delete collection error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/collections/bulk/delete-by-month
// @desc    Delete all milk collections for a specific month
// @access  Private
router.delete('/bulk/delete-by-month', async (req, res) => {
  try {
    const { year, month } = req.body;
    
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required'
      });
    }

    // Validate year and month
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (yearNum < 2020 || yearNum > 2030 || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year or month'
      });
    }

    // Get count of records to be deleted
    const [countResult] = await db.promise().query(
      `SELECT COUNT(*) as count FROM milk_collections 
       WHERE YEAR(date) = ? AND MONTH(date) = ?`,
      [yearNum, monthNum]
    );

    const recordCount = countResult[0].count;

    if (recordCount === 0) {
      return res.status(404).json({
        success: false,
        message: `No data found for ${month}/${year}`
      });
    }

    // Delete all records for the specified month
    await db.promise().query(
      `DELETE FROM milk_collections 
       WHERE YEAR(date) = ? AND MONTH(date) = ?`,
      [yearNum, monthNum]
    );

    res.json({
      success: true,
      message: `Successfully deleted ${recordCount} records for ${month}/${year}`,
      deletedCount: recordCount
    });
  } catch (error) {
    console.error('Delete collections by month error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/collections/stats/available-months
// @desc    Get available months with data for bulk delete
// @access  Private
router.get('/stats/available-months', async (req, res) => {
  try {
    const [months] = await db.promise().query(
      `SELECT 
        YEAR(date) as year,
        MONTH(date) as month,
        COUNT(*) as record_count,
        SUM(morning_amount + afternoon_amount) as total_liters,
        SUM((morning_amount + afternoon_amount) * price_per_liter) as total_income
       FROM milk_collections 
       GROUP BY YEAR(date), MONTH(date) 
       ORDER BY year DESC, month DESC`
    );

    res.json({
      success: true,
      data: months
    });
  } catch (error) {
    console.error('Get available months error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/collections/export/excel
// @desc    Export collections to Excel
// @access  Private
router.get('/export/excel', async (req, res) => {
  try {
    const { start_date, end_date, collector_id } = req.query;
    
    let query = `
      SELECT 
        mc.date,
        mcl.name as collector_name,
        mcl.phone as collector_phone,
        mc.morning_amount,
        mc.afternoon_amount,
        (mc.morning_amount + mc.afternoon_amount) as total_amount,
        mc.price_per_liter,
        ((mc.morning_amount + mc.afternoon_amount) * mc.price_per_liter) as total_income
      FROM milk_collections mc
      JOIN milk_collectors mcl ON mc.collector_id = mcl.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (start_date) {
      query += ' AND mc.date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND mc.date <= ?';
      params.push(end_date);
    }
    
    if (collector_id) {
      query += ' AND mc.collector_id = ?';
      params.push(collector_id);
    }
    
    query += ' ORDER BY mc.date DESC, mcl.name ASC';

    const [collections] = await db.promise().query(query, params);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Koleksi Susu');

    // Add headers
    worksheet.columns = [
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'Nama Pengepul', key: 'collector_name', width: 25 },
      { header: 'Telepon', key: 'collector_phone', width: 15 },
      { header: 'Jumlah Pagi (L)', key: 'morning_amount', width: 18 },
      { header: 'Jumlah Sore (L)', key: 'afternoon_amount', width: 18 },
      { header: 'Total (L)', key: 'total_amount', width: 15 },
      { header: 'Harga/Liter', key: 'price_per_liter', width: 15 },
      { header: 'Total Pendapatan', key: 'total_income', width: 20 }
    ];

    // Add data
    collections.forEach(collection => {
      worksheet.addRow({
        date: moment(collection.date).format('DD/MM/YYYY'),
        collector_name: collection.collector_name,
        collector_phone: collection.collector_phone,
        morning_amount: collection.morning_amount,
        afternoon_amount: collection.afternoon_amount,
        total_amount: collection.total_amount,
        price_per_liter: collection.price_per_liter,
        total_income: collection.total_income
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };

    const filename = `koleksi-susu-${moment().format('YYYYMMDD-HHmmss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Export collections error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
