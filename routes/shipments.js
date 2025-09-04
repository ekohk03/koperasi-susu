const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET all shipments
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT * FROM milk_shipments ORDER BY date DESC, id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create shipment
router.post(
  '/',
  [
    body('date').isDate().withMessage('Tanggal wajib diisi'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Jumlah susu wajib diisi dan harus lebih dari 0'),
    body('destination').notEmpty().withMessage('Tujuan wajib diisi'),
    body('notes').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const { date, amount, destination, notes } = req.body;
      await db.promise().query(
        'INSERT INTO milk_shipments (date, amount, destination, notes) VALUES (?, ?, ?, ?)',
        [date, amount, destination, notes || null]
      );
      res.json({ success: true, message: 'Pengiriman berhasil ditambahkan' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;



