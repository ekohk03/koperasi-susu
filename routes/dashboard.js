const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview statistics
// @access  Private
router.get('/overview', async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get total collectors
    const [collectorsCount] = await db.promise().query(
      'SELECT COUNT(*) as total FROM milk_collectors'
    );

    // Get total employees
    const [employeesCount] = await db.promise().query(
      'SELECT COUNT(*) as total FROM employees'
    );

    // Get today's collections
    const [todayCollections] = await db.promise().query(
      `SELECT 
        COUNT(*) as total_collections,
        COALESCE(SUM(morning_amount + afternoon_amount), 0) as total_milk,
        COALESCE(SUM((morning_amount + afternoon_amount) * price_per_liter), 0) as total_income
      FROM milk_collections 
      WHERE date = CURDATE()`
    );

    // Get this month's collections
    const [monthlyCollections] = await db.promise().query(
      `SELECT 
        COUNT(*) as total_collections,
        COALESCE(SUM(morning_amount + afternoon_amount), 0) as total_milk,
        COALESCE(SUM((morning_amount + afternoon_amount) * price_per_liter), 0) as total_income
      FROM milk_collections 
      WHERE MONTH(date) = ? AND YEAR(date) = ?`,
      [currentMonth, currentYear]
    );

    // Get today's attendances
    const [todayAttendances] = await db.promise().query(
      `SELECT 
        COUNT(*) as total_attendance,
        COALESCE(SUM(CASE WHEN status = 'hadir' THEN 1 ELSE 0 END), 0) as present,
        COALESCE(SUM(CASE WHEN status = 'ijin' THEN 1 ELSE 0 END), 0) as 'leave',
        COALESCE(SUM(CASE WHEN status = 'libur' THEN 1 ELSE 0 END), 0) as holiday
      FROM employee_attendances 
      WHERE date = CURDATE()`
    );

    // Get this month's income
    const [monthlyIncome] = await db.promise().query(
      `SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_amount
      FROM incomes 
      WHERE MONTH(date) = ? AND YEAR(date) = ?`,
      [currentMonth, currentYear]
    );

    // Get this month's expenses
    const [monthlyExpenses] = await db.promise().query(
      `SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_amount
      FROM expenses 
      WHERE MONTH(date) = ? AND YEAR(date) = ?`,
      [currentMonth, currentYear]
    );

    // Get this month's maintenance costs
    const [monthlyMaintenance] = await db.promise().query(
      `SELECT 
        COUNT(*) as total_maintenances,
        COALESCE(SUM(cost), 0) as total_cost
      FROM maintenances 
      WHERE MONTH(start_date) = ? AND YEAR(start_date) = ?`,
      [currentMonth, currentYear]
    );

    res.json({
      success: true,
      data: {
        collectors: collectorsCount[0].total,
        employees: employeesCount[0].total,
        today: {
          collections: todayCollections[0],
          attendances: todayAttendances[0]
        },
        monthly: {
          collections: monthlyCollections[0],
          income: monthlyIncome[0],
          expenses: monthlyExpenses[0],
          maintenance: monthlyMaintenance[0]
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/dashboard/recent-collections
// @desc    Get recent milk collections
// @access  Private
router.get('/recent-collections', async (req, res) => {
  try {
    const [recentCollections] = await db.promise().query(
      `SELECT 
        mc.*,
        mcl.name as collector_name,
        (mc.morning_amount + mc.afternoon_amount) as total_amount,
        ((mc.morning_amount + mc.afternoon_amount) * mc.price_per_liter) as total_income
      FROM milk_collections mc
      JOIN milk_collectors mcl ON mc.collector_id = mcl.id
      ORDER BY mc.date DESC, mc.id DESC
      LIMIT 10`
    );

    res.json({
      success: true,
      data: recentCollections
    });
  } catch (error) {
    console.error('Get recent collections error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/dashboard/recent-attendances
// @desc    Get recent employee attendances
// @access  Private
router.get('/recent-attendances', async (req, res) => {
  try {
    const [recentAttendances] = await db.promise().query(
      `SELECT 
        ea.*,
        e.name as employee_name,
        e.position as employee_position
      FROM employee_attendances ea
      JOIN employees e ON ea.employee_id = e.id
      ORDER BY ea.date DESC, e.name ASC
      LIMIT 10`
    );

    res.json({
      success: true,
      data: recentAttendances
    });
  } catch (error) {
    console.error('Get recent attendances error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/dashboard/recent-incomes
// @desc    Get recent incomes
// @access  Private
router.get('/recent-incomes', async (req, res) => {
  try {
    const [recentIncomes] = await db.promise().query(
      `SELECT * FROM incomes 
      ORDER BY date DESC, created_at DESC
      LIMIT 10`
    );

    res.json({
      success: true,
      data: recentIncomes
    });
  } catch (error) {
    console.error('Get recent incomes error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/dashboard/recent-expenses
// @desc    Get recent expenses
// @access  Private
router.get('/recent-expenses', async (req, res) => {
  try {
    const [recentExpenses] = await db.promise().query(
      `SELECT * FROM expenses 
      ORDER BY date DESC, created_at DESC
      LIMIT 10`
    );

    res.json({
      success: true,
      data: recentExpenses
    });
  } catch (error) {
    console.error('Get recent expenses error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/dashboard/recent-maintenances
// @desc    Get recent maintenances
// @access  Private
router.get('/recent-maintenances', async (req, res) => {
  try {
    const [recentMaintenances] = await db.promise().query(
      `SELECT * FROM maintenances 
      ORDER BY start_date DESC, created_at DESC
      LIMIT 10`
    );

    res.json({
      success: true,
      data: recentMaintenances
    });
  } catch (error) {
    console.error('Get recent maintenances error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/dashboard/charts/collections-weekly
// @desc    Get weekly collections data for charts
// @access  Private
router.get('/charts/collections-weekly', async (req, res) => {
  try {
    const [weeklyCollections] = await db.promise().query(
      `SELECT 
        DATE(date) as date,
        SUM(morning_amount + afternoon_amount) as total_milk,
        SUM((morning_amount + afternoon_amount) * price_per_liter) as total_income,
        COUNT(*) as total_collections
      FROM milk_collections 
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(date)
      ORDER BY date ASC`
    );

    res.json({
      success: true,
      data: weeklyCollections
    });
  } catch (error) {
    console.error('Get weekly collections chart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/dashboard/charts/collections-monthly
// @desc    Get monthly collections data for charts
// @access  Private
router.get('/charts/collections-monthly', async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const [monthlyCollections] = await db.promise().query(
      `SELECT 
        MONTH(date) as month,
        SUM(morning_amount + afternoon_amount) as total_milk,
        SUM((morning_amount + afternoon_amount) * price_per_liter) as total_income,
        COUNT(*) as total_collections
      FROM milk_collections 
      WHERE YEAR(date) = ?
      GROUP BY MONTH(date)
      ORDER BY month ASC`,
      [currentYear]
    );

    res.json({
      success: true,
      data: monthlyCollections
    });
  } catch (error) {
    console.error('Get monthly collections chart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/dashboard/charts/financial-monthly
// @desc    Get monthly financial data for charts
// @access  Private
router.get('/charts/financial-monthly', async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    // Get monthly income
    const [monthlyIncome] = await db.promise().query(
      `SELECT 
        MONTH(date) as month,
        COALESCE(SUM(amount), 0) as total_income
      FROM incomes 
      WHERE YEAR(date) = ?
      GROUP BY MONTH(date)
      ORDER BY month ASC`,
      [currentYear]
    );

    // Get monthly expenses
    const [monthlyExpenses] = await db.promise().query(
      `SELECT 
        MONTH(date) as month,
        COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses 
      WHERE YEAR(date) = ?
      GROUP BY MONTH(date)
      ORDER BY month ASC`,
      [currentYear]
    );

    // Get monthly maintenance costs
    const [monthlyMaintenance] = await db.promise().query(
      `SELECT 
        MONTH(start_date) as month,
        COALESCE(SUM(cost), 0) as total_maintenance
      FROM maintenances 
      WHERE YEAR(start_date) = ?
      GROUP BY MONTH(start_date)
      ORDER BY month ASC`,
      [currentYear]
    );

    // Combine data
    const financialData = [];
    for (let month = 1; month <= 12; month++) {
      const income = monthlyIncome.find(item => item.month === month)?.total_income || 0;
      const expenses = monthlyExpenses.find(item => item.month === month)?.total_expenses || 0;
      const maintenance = monthlyMaintenance.find(item => item.month === month)?.total_maintenance || 0;
      
      financialData.push({
        month,
        income,
        expenses,
        maintenance,
        profit: income - expenses - maintenance
      });
    }

    res.json({
      success: true,
      data: financialData
    });
  } catch (error) {
    console.error('Get monthly financial chart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/dashboard/charts/attendance-status
// @desc    Get attendance status distribution
// @access  Private
router.get('/charts/attendance-status', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM employee_attendances 
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
    
    query += ' GROUP BY status';

    const [attendanceStatus] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: attendanceStatus
    });
  } catch (error) {
    console.error('Get attendance status chart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/dashboard/recent-shipments
// @desc    Get recent milk shipments
// @access  Private
router.get('/recent-shipments', async (req, res) => {
  try {
    const [recentShipments] = await db.promise().query(
      `SELECT * FROM milk_shipments
      ORDER BY date DESC, id DESC
      LIMIT 5`
    );

    res.json({
      success: true,
      data: recentShipments
    });
  } catch (error) {
    console.error('Get recent shipments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
