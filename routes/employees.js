const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// @route   GET /api/employees
// @desc    Get all employees
// @access  Private
router.get('/', async (req, res) => {
  try {
    const [employees] = await db.promise().query(
      'SELECT * FROM employees ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/employees/:id/detail
// @desc    Get employee detail with 1 month attendance report
// @access  Private
router.get('/:id/detail', async (req, res) => {
  try {
    const employeeId = req.params.id;

    // Get employee information
    const [employees] = await db.promise().query(
      'SELECT * FROM employees WHERE id = ?',
      [employeeId]
    );

    if (employees.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    // Get attendances for last 1 month
    const [attendances] = await db.promise().query(
      `SELECT 
        ea.date,
        ea.status,
        ea.notes
      FROM employee_attendances ea
      WHERE ea.employee_id = ?
      AND ea.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
      ORDER BY ea.date DESC`,
      [employeeId]
    );

    console.log('Employee ID:', employeeId);
    console.log('Attendances found:', attendances.length);

    // Calculate summary statistics
    const totalDays = attendances.length;
    const presentDays = attendances.filter(item => item.status === 'hadir').length;
    const absentDays = attendances.filter(item => item.status === 'ijin').length;
    const holidayDays = attendances.filter(item => item.status === 'libur').length;
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    res.json({
      success: true,
      data: {
        employee: employees[0],
        attendances: attendances,
        summary: {
          total_days: totalDays,
          present_days: presentDays,
          absent_days: absentDays,
          holiday_days: holidayDays,
          attendance_rate: attendanceRate
        }
      }
    });
  } catch (error) {
    console.error('Get employee detail error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/employees/:id
// @desc    Get single employee
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const [employees] = await db.promise().query(
      'SELECT * FROM employees WHERE id = ?',
      [req.params.id]
    );

    if (employees.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    res.json({
      success: true,
      data: employees[0]
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/employees
// @desc    Create new employee
// @access  Private
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('salary').isFloat({ min: 0 }).withMessage('Salary must be a positive number'),
  body('join_date').notEmpty().withMessage('Join date is required'),
  body('phone').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, position, salary, join_date, phone, address } = req.body;

    const [result] = await db.promise().query(
      'INSERT INTO employees (name, position, salary, join_date, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      [name, position, salary, join_date, phone, address]
    );

    const [newEmployee] = await db.promise().query(
      'SELECT * FROM employees WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: newEmployee[0]
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private
router.put('/:id', [
  body('name').notEmpty().withMessage('Name is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('salary').isFloat({ min: 0 }).withMessage('Salary must be a positive number'),
  body('join_date').notEmpty().withMessage('Join date is required'),
  body('phone').optional()
], async (req, res) => {
  try {
    console.log('PUT /api/employees/:id - Request body:', req.body);
    console.log('PUT /api/employees/:id - Employee ID:', req.params.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, position, salary, join_date, phone, address } = req.body;
    const employeeId = req.params.id;
    console.log('Extracted data:', { name, position, salary, join_date, phone, address });

    // Check if employee exists
    const [existingEmployee] = await db.promise().query(
      'SELECT id FROM employees WHERE id = ?',
      [employeeId]
    );

    if (existingEmployee.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    console.log('Executing UPDATE query with params:', [name, position, salary, join_date, phone, address, employeeId]);
    await db.promise().query(
      'UPDATE employees SET name = ?, position = ?, salary = ?, join_date = ?, phone = ?, address = ? WHERE id = ?',
      [name, position, salary, join_date, phone, address, employeeId]
    );
    console.log('UPDATE query executed successfully');

    const [updatedEmployee] = await db.promise().query(
      'SELECT * FROM employees WHERE id = ?',
      [employeeId]
    );

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee[0]
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/employees/:id
// @desc    Delete employee
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const employeeId = req.params.id;

    // Check if employee exists
    const [existingEmployee] = await db.promise().query(
      'SELECT id FROM employees WHERE id = ?',
      [employeeId]
    );

    if (existingEmployee.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    // Check if employee has attendances
    const [attendances] = await db.promise().query(
      'SELECT id FROM employee_attendances WHERE employee_id = ?',
      [employeeId]
    );

    if (attendances.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete employee with existing attendance records' 
      });
    }

    await db.promise().query(
      'DELETE FROM employees WHERE id = ?',
      [employeeId]
    );

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;







