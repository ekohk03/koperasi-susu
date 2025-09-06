const express = require('express');
const { body, validationResult } = require('express-validator');
const ExcelJS = require('exceljs');
const moment = require('moment');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// @route   GET /api/attendances
// @desc    Get all attendances with employee info
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, employee_id, status } = req.query;
    
    let query = `
      SELECT 
        ea.*,
        e.name as employee_name,
        e.position as employee_position,
        e.salary as employee_salary
      FROM employee_attendances ea
      JOIN employees e ON ea.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (start_date) {
      query += ' AND ea.date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND ea.date <= ?';
      params.push(end_date);
    }
    
    if (employee_id) {
      query += ' AND ea.employee_id = ?';
      params.push(employee_id);
    }
    
    if (status) {
      query += ' AND ea.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY ea.date DESC, e.name ASC';

    const [attendances] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: attendances
    });
  } catch (error) {
    console.error('Get attendances error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/attendances/salaries
// @desc    Get all salary records
// @access  Private
router.get('/salaries', async (req, res) => {
  try {
    const { month, year, employee_id } = req.query;
    
    let query = `
      SELECT 
        es.*,
        e.name as employee_name,
        e.position as employee_position
      FROM employee_salaries es
      JOIN employees e ON es.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (month) {
      query += ' AND es.month = ?';
      params.push(month);
    }
    
    if (year) {
      query += ' AND es.year = ?';
      params.push(year);
    }
    
    if (employee_id) {
      query += ' AND es.employee_id = ?';
      params.push(employee_id);
    }
    
    query += ' ORDER BY es.year DESC, es.month DESC, e.name ASC';

    const [salaries] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: salaries
    });
  } catch (error) {
    console.error('Get salaries error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/attendances/test-export
// @desc    Test export route
// @access  Private
router.get('/test-export', async (req, res) => {
  try {
    console.log('Test export route hit');
    res.json({ 
      success: true, 
      message: 'Export route is working',
      params: req.query 
    });
  } catch (error) {
    console.error('Test export error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/attendances/export/excel
// @desc    Export attendances to Excel
// @access  Private
router.get('/export/excel', async (req, res) => {
  try {
    console.log('Export Excel route hit with params:', req.query);
    const { start_date, end_date, employee_id, status } = req.query;
    
    let query = `
      SELECT 
        ea.date,
        e.name as employee_name,
        e.position as employee_position,
        ea.status,
        ea.notes
      FROM employee_attendances ea
      JOIN employees e ON ea.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (start_date) {
      query += ' AND ea.date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND ea.date <= ?';
      params.push(end_date);
    }
    
    if (employee_id) {
      query += ' AND ea.employee_id = ?';
      params.push(employee_id);
    }
    
    if (status) {
      query += ' AND ea.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY ea.date DESC, e.name ASC';

    const [attendances] = await db.promise().query(query, params);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Absensi Karyawan');

    // Add headers
    worksheet.columns = [
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'Nama Karyawan', key: 'employee_name', width: 25 },
      { header: 'Posisi', key: 'employee_position', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Catatan', key: 'notes', width: 30 }
    ];

    // Add data
    attendances.forEach(attendance => {
      worksheet.addRow({
        date: moment(attendance.date).format('DD/MM/YYYY'),
        employee_name: attendance.employee_name,
        employee_position: attendance.employee_position,
        status: attendance.status,
        notes: attendance.notes || ''
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };

    const filename = `absensi-karyawan-${moment().format('YYYYMMDD-HHmmss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Export attendances error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/attendances/:id
// @desc    Get single attendance
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const [attendances] = await db.promise().query(
      `SELECT 
        ea.*,
        e.name as employee_name,
        e.position as employee_position,
        e.salary as employee_salary
      FROM employee_attendances ea
      JOIN employees e ON ea.employee_id = e.id
      WHERE ea.id = ?`,
      [req.params.id]
    );

    if (attendances.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Attendance not found' 
      });
    }

    res.json({
      success: true,
      data: attendances[0]
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/attendances
// @desc    Create new attendance
// @access  Private
router.post('/', [
  body('employee_id').isInt().withMessage('Valid employee ID is required'),
  body('date').isDate().withMessage('Valid date is required'),
  body('status').isIn(['hadir', 'ijin', 'libur', 'sakit']).withMessage('Status must be hadir, ijin, libur, or sakit')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { employee_id, date, status, notes } = req.body;

    // Check if employee exists
    const [employee] = await db.promise().query(
      'SELECT id FROM employees WHERE id = ?',
      [employee_id]
    );

    if (employee.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    // Check if attendance already exists for this date and employee
    const [existingAttendance] = await db.promise().query(
      'SELECT id FROM employee_attendances WHERE employee_id = ? AND date = ?',
      [employee_id, date]
    );

    if (existingAttendance.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Attendance already exists for this date and employee' 
      });
    }

    const [result] = await db.promise().query(
      'INSERT INTO employee_attendances (employee_id, date, status, notes) VALUES (?, ?, ?, ?)',
      [employee_id, date, status, notes]
    );

    const [newAttendance] = await db.promise().query(
      `SELECT 
        ea.*,
        e.name as employee_name,
        e.position as employee_position,
        e.salary as employee_salary
      FROM employee_attendances ea
      JOIN employees e ON ea.employee_id = e.id
      WHERE ea.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Attendance created successfully',
      data: newAttendance[0]
    });
  } catch (error) {
    console.error('Create attendance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/attendances/:id
// @desc    Update attendance
// @access  Private
router.put('/:id', [
  body('employee_id').isInt().withMessage('Valid employee ID is required'),
  body('date').isDate().withMessage('Valid date is required'),
  body('status').isIn(['hadir', 'ijin', 'libur', 'sakit']).withMessage('Status must be hadir, ijin, libur, or sakit')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { employee_id, date, status, notes } = req.body;
    const attendanceId = req.params.id;

    // Check if attendance exists
    const [existingAttendance] = await db.promise().query(
      'SELECT id FROM employee_attendances WHERE id = ?',
      [attendanceId]
    );

    if (existingAttendance.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Attendance not found' 
      });
    }

    // Check if employee exists
    const [employee] = await db.promise().query(
      'SELECT id FROM employees WHERE id = ?',
      [employee_id]
    );

    if (employee.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    // Check if attendance already exists for this date and employee (excluding current attendance)
    const [duplicateAttendance] = await db.promise().query(
      'SELECT id FROM employee_attendances WHERE employee_id = ? AND date = ? AND id != ?',
      [employee_id, date, attendanceId]
    );

    if (duplicateAttendance.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Attendance already exists for this date and employee' 
      });
    }

    await db.promise().query(
      'UPDATE employee_attendances SET employee_id = ?, date = ?, status = ?, notes = ? WHERE id = ?',
      [employee_id, date, status, notes, attendanceId]
    );

    const [updatedAttendance] = await db.promise().query(
      `SELECT 
        ea.*,
        e.name as employee_name,
        e.position as employee_position,
        e.salary as employee_salary
      FROM employee_attendances ea
      JOIN employees e ON ea.employee_id = e.id
      WHERE ea.id = ?`,
      [attendanceId]
    );

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      data: updatedAttendance[0]
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/attendances/:id
// @desc    Delete attendance
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const attendanceId = req.params.id;

    // Check if attendance exists
    const [existingAttendance] = await db.promise().query(
      'SELECT id FROM employee_attendances WHERE id = ?',
      [attendanceId]
    );

    if (existingAttendance.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Attendance not found' 
      });
    }

    await db.promise().query(
      'DELETE FROM employee_attendances WHERE id = ?',
      [attendanceId]
    );

    res.json({
      success: true,
      message: 'Attendance deleted successfully'
    });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/attendances/employee/:employeeId
// @desc    Get attendances by employee
// @access  Private
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;
    const employeeId = req.params.employeeId;
    
    let query = `
      SELECT 
        ea.*,
        e.name as employee_name,
        e.position as employee_position,
        e.salary as employee_salary
      FROM employee_attendances ea
      JOIN employees e ON ea.employee_id = e.id
      WHERE ea.employee_id = ?
    `;
    
    const params = [employeeId];
    
    if (start_date) {
      query += ' AND ea.date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND ea.date <= ?';
      params.push(end_date);
    }
    
    if (status) {
      query += ' AND ea.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY ea.date DESC';

    const [attendances] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: attendances
    });
  } catch (error) {
    console.error('Get employee attendances error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/attendances/calculate-salary
// @desc    Calculate salary for employee for specific month
// @access  Private
router.post('/calculate-salary', [
  body('employee_id').isInt().withMessage('Valid employee ID is required'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month (1-12) is required'),
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('Valid year is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { employee_id, month, year, deductions = 0, bonuses = 0, notes = '' } = req.body;

    // Get employee info
    const [employees] = await db.promise().query(
      'SELECT * FROM employees WHERE id = ?',
      [employee_id]
    );

    if (employees.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    const employee = employees[0];

    // Get attendance data for the month
    const [attendances] = await db.promise().query(
      `SELECT status, COUNT(*) as count 
       FROM employee_attendances 
       WHERE employee_id = ? AND YEAR(date) = ? AND MONTH(date) = ?
       GROUP BY status`,
      [employee_id, year, month]
    );

    // Calculate attendance counts
    let presentDays = 0;
    let absentDays = 0;
    let sickDays = 0;
    let holidayDays = 0;

    attendances.forEach(att => {
      switch (att.status) {
        case 'hadir':
          presentDays = att.count;
          break;
        case 'ijin':
          absentDays = att.count;
          break;
        case 'sakit':
          sickDays = att.count;
          break;
        case 'libur':
          holidayDays = att.count;
          break;
      }
    });

    // Calculate total working days (present + sick days)
    const totalWorkingDays = presentDays + sickDays;

    // Calculate salary per day (base salary / 22 working days per month)
    const salaryPerDay = employee.salary / 22;

    // Calculate total salary
    const totalSalary = totalWorkingDays * salaryPerDay;

    // Calculate final salary
    const finalSalary = totalSalary - deductions + bonuses;

    // Check if salary record already exists
    const [existingSalary] = await db.promise().query(
      'SELECT id FROM employee_salaries WHERE employee_id = ? AND month = ? AND year = ?',
      [employee_id, month, year]
    );

    if (existingSalary.length > 0) {
      // Update existing record
      await db.promise().query(
        `UPDATE employee_salaries SET 
         base_salary = ?, present_days = ?, absent_days = ?, sick_days = ?, holiday_days = ?,
         total_working_days = ?, salary_per_day = ?, total_salary = ?, deductions = ?, 
         bonuses = ?, final_salary = ?, notes = ?
         WHERE employee_id = ? AND month = ? AND year = ?`,
        [employee.salary, presentDays, absentDays, sickDays, holidayDays,
         totalWorkingDays, salaryPerDay, totalSalary, deductions, bonuses,
         finalSalary, notes, employee_id, month, year]
      );
    } else {
      // Insert new record
      await db.promise().query(
        `INSERT INTO employee_salaries 
         (employee_id, month, year, base_salary, present_days, absent_days, sick_days, holiday_days,
          total_working_days, salary_per_day, total_salary, deductions, bonuses, final_salary, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [employee_id, month, year, employee.salary, presentDays, absentDays, sickDays, holidayDays,
         totalWorkingDays, salaryPerDay, totalSalary, deductions, bonuses, finalSalary, notes]
      );
    }

    // Get the calculated salary record
    const [salaryRecord] = await db.promise().query(
      `SELECT 
        es.*,
        e.name as employee_name,
        e.position as employee_position
       FROM employee_salaries es
       JOIN employees e ON es.employee_id = e.id
       WHERE es.employee_id = ? AND es.month = ? AND es.year = ?`,
      [employee_id, month, year]
    );

    res.json({
      success: true,
      message: 'Salary calculated successfully',
      data: salaryRecord[0]
    });
  } catch (error) {
    console.error('Calculate salary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/attendances/bulk/delete-by-month
// @desc    Delete all attendances for a specific month
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
      `SELECT COUNT(*) as count FROM employee_attendances 
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
      `DELETE FROM employee_attendances 
       WHERE YEAR(date) = ? AND MONTH(date) = ?`,
      [yearNum, monthNum]
    );

    res.json({
      success: true,
      message: `Successfully deleted ${recordCount} records for ${month}/${year}`,
      deletedCount: recordCount
    });
  } catch (error) {
    console.error('Delete attendances by month error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/attendances/stats/available-months
// @desc    Get available months with data for bulk delete
// @access  Private
router.get('/stats/available-months', async (req, res) => {
  try {
    const [months] = await db.promise().query(
      `SELECT 
        YEAR(date) as year,
        MONTH(date) as month,
        COUNT(*) as record_count,
        SUM(CASE WHEN status = 'hadir' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'ijin' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN status = 'libur' THEN 1 ELSE 0 END) as holiday_count,
        SUM(CASE WHEN status = 'sakit' THEN 1 ELSE 0 END) as sick_count
       FROM employee_attendances 
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

// @route   GET /api/attendances/stats/attendance-summary
// @desc    Get attendance summary with percentages
// @access  Private
router.get('/stats/attendance-summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    const [summary] = await db.promise().query(
      `SELECT 
        e.id as employee_id,
        e.name as employee_name,
        e.position as employee_position,
        COUNT(ea.id) as total_days,
        SUM(CASE WHEN ea.status = 'hadir' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN ea.status = 'ijin' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN ea.status = 'sakit' THEN 1 ELSE 0 END) as sick_days,
        SUM(CASE WHEN ea.status = 'libur' THEN 1 ELSE 0 END) as holiday_days,
        CASE 
          WHEN COUNT(ea.id) > 0 THEN ROUND((SUM(CASE WHEN ea.status = 'hadir' THEN 1 ELSE 0 END) / COUNT(ea.id)) * 100, 2)
          ELSE 0 
        END as present_percentage,
        CASE 
          WHEN COUNT(ea.id) > 0 THEN ROUND((SUM(CASE WHEN ea.status = 'ijin' THEN 1 ELSE 0 END) / COUNT(ea.id)) * 100, 2)
          ELSE 0 
        END as absent_percentage,
        CASE 
          WHEN COUNT(ea.id) > 0 THEN ROUND((SUM(CASE WHEN ea.status = 'sakit' THEN 1 ELSE 0 END) / COUNT(ea.id)) * 100, 2)
          ELSE 0 
        END as sick_percentage,
        CASE 
          WHEN COUNT(ea.id) > 0 THEN ROUND((SUM(CASE WHEN ea.status = 'libur' THEN 1 ELSE 0 END) / COUNT(ea.id)) * 100, 2)
          ELSE 0 
        END as holiday_percentage
       FROM employees e
       LEFT JOIN employee_attendances ea ON e.id = ea.employee_id 
         AND MONTH(ea.date) = ? AND YEAR(ea.date) = ?
       GROUP BY e.id, e.name, e.position
       ORDER BY e.name ASC`,
      [monthNum, yearNum]
    );

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/attendances/stats/attendance-overview
// @desc    Get overall attendance statistics for a month
// @access  Private
router.get('/stats/attendance-overview', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Get total working days in the month (excluding weekends)
    const [workingDaysResult] = await db.promise().query(
      `SELECT COUNT(*) as total_working_days
       FROM (
         SELECT DATE_ADD(?, INTERVAL seq DAY) as work_date
         FROM (
           SELECT 0 as seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION
           SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION
           SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
         ) as seq_table
       ) as dates
       WHERE MONTH(work_date) = ? AND YEAR(work_date) = ? AND DAYOFWEEK(work_date) NOT IN (1, 7)`,
      [`${yearNum}-${monthNum.toString().padStart(2, '0')}-01`, monthNum, yearNum]
    );

    const totalWorkingDays = workingDaysResult[0].total_working_days;

    // Get attendance statistics
    const [stats] = await db.promise().query(
      `SELECT 
        COUNT(DISTINCT ea.employee_id) as total_employees,
        SUM(CASE WHEN ea.status = 'hadir' THEN 1 ELSE 0 END) as total_present,
        SUM(CASE WHEN ea.status = 'ijin' THEN 1 ELSE 0 END) as total_absent,
        SUM(CASE WHEN ea.status = 'sakit' THEN 1 ELSE 0 END) as total_sick,
        SUM(CASE WHEN ea.status = 'libur' THEN 1 ELSE 0 END) as total_holiday,
        COUNT(ea.id) as total_records
       FROM employee_attendances ea
       WHERE MONTH(ea.date) = ? AND YEAR(ea.date) = ?`,
      [monthNum, yearNum]
    );

    const totalPresent = stats[0].total_present || 0;
    const totalRecords = stats[0].total_records || 0;
    const totalEmployees = stats[0].total_employees || 0;

    // Calculate attendance rate
    let attendanceRate = 0;
    if (totalRecords > 0) {
      attendanceRate = Math.round((totalPresent / totalRecords) * 100);
    }

    // Calculate expected attendance (assuming all employees should attend all working days)
    const expectedAttendance = totalEmployees * totalWorkingDays;
    let overallAttendanceRate = 0;
    if (expectedAttendance > 0) {
      overallAttendanceRate = Math.round((totalPresent / expectedAttendance) * 100);
    }

    res.json({
      success: true,
      data: {
        month: monthNum,
        year: yearNum,
        totalWorkingDays,
        totalEmployees,
        totalPresent,
        totalAbsent: stats[0].total_absent || 0,
        totalSick: stats[0].total_sick || 0,
        totalHoliday: stats[0].total_holiday || 0,
        totalRecords,
        attendanceRate,
        overallAttendanceRate,
        expectedAttendance
      }
    });
  } catch (error) {
    console.error('Get attendance overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;







