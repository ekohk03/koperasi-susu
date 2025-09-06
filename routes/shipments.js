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

// PUT update shipment
router.put(
  '/:id',
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
      const { id } = req.params;
      const { date, amount, destination, notes } = req.body;

      // Check if shipment exists
      const [existingShipment] = await db.promise().query(
        'SELECT id FROM milk_shipments WHERE id = ?',
        [id]
      );

      if (existingShipment.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Pengiriman tidak ditemukan' 
        });
      }

      await db.promise().query(
        'UPDATE milk_shipments SET date = ?, amount = ?, destination = ?, notes = ? WHERE id = ?',
        [date, amount, destination, notes || null, id]
      );

      res.json({ success: true, message: 'Pengiriman berhasil diupdate' });
    } catch (err) {
      console.error('Update shipment error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE shipment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if shipment exists
    const [existingShipment] = await db.promise().query(
      'SELECT id FROM milk_shipments WHERE id = ?',
      [id]
    );

    if (existingShipment.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pengiriman tidak ditemukan' 
      });
    }

    await db.promise().query('DELETE FROM milk_shipments WHERE id = ?', [id]);

    res.json({ success: true, message: 'Pengiriman berhasil dihapus' });
  } catch (err) {
    console.error('Delete shipment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;



