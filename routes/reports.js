const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// @route   GET /api/reports/monthly
// @desc    Get monthly report data
// @access  Private
router.get('/monthly', async (req, res) => {
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

    // Get milk collections summary
    const [collectionsSummary] = await db.promise().query(
      `SELECT 
        mc.collector_id,
        mc_collector.name as collector_name,
        SUM(mc.morning_amount + mc.afternoon_amount) as total_amount,
        AVG(mc.price_per_liter) as avg_price,
        SUM((mc.morning_amount + mc.afternoon_amount) * mc.price_per_liter) as total_value,
        COUNT(*) as collection_days
       FROM milk_collections mc
       JOIN milk_collectors mc_collector ON mc.collector_id = mc_collector.id
       WHERE MONTH(mc.date) = ? AND YEAR(mc.date) = ?
       GROUP BY mc.collector_id, mc_collector.name`,
      [monthNum, yearNum]
    );

    // Get total collections
    const [totalCollections] = await db.promise().query(
      `SELECT 
        SUM(morning_amount + afternoon_amount) as total_amount,
        AVG(price_per_liter) as avg_price,
        SUM((morning_amount + afternoon_amount) * price_per_liter) as total_value,
        COUNT(*) as total_days
       FROM milk_collections 
       WHERE MONTH(date) = ? AND YEAR(date) = ?`,
      [monthNum, yearNum]
    );

    // Get attendance summary
    const [attendanceSummary] = await db.promise().query(
      `SELECT 
        ea.employee_id,
        e.name as employee_name,
        e.position as employee_position,
        e.salary as base_salary,
        SUM(CASE WHEN ea.status = 'hadir' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN ea.status = 'ijin' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN ea.status = 'sakit' THEN 1 ELSE 0 END) as sick_days,
        SUM(CASE WHEN ea.status = 'libur' THEN 1 ELSE 0 END) as holiday_days,
        COUNT(*) as total_days
       FROM employee_attendances ea
       JOIN employees e ON ea.employee_id = e.id
       WHERE MONTH(ea.date) = ? AND YEAR(ea.date) = ?
       GROUP BY ea.employee_id, e.name, e.position, e.salary`,
      [monthNum, yearNum]
    );

    // Get salary summary
    const [salarySummary] = await db.promise().query(
      `SELECT 
        es.employee_id,
        e.name as employee_name,
        e.position as employee_position,
        es.base_salary,
        es.present_days,
        es.absent_days,
        es.sick_days,
        es.holiday_days,
        es.total_working_days,
        es.salary_per_day,
        es.total_salary,
        es.deductions,
        es.bonuses,
        es.final_salary
       FROM employee_salaries es
       JOIN employees e ON es.employee_id = e.id
       WHERE es.month = ? AND es.year = ?`,
      [monthNum, yearNum]
    );

    // Get incomes
    const [incomes] = await db.promise().query(
      `SELECT 
        source,
        amount,
        date,
        description
       FROM incomes 
       WHERE MONTH(date) = ? AND YEAR(date) = ?
       ORDER BY date DESC`,
      [monthNum, yearNum]
    );

    // Get expenses
    const [expenses] = await db.promise().query(
      `SELECT 
        category,
        amount,
        date,
        description
       FROM expenses 
       WHERE MONTH(date) = ? AND YEAR(date) = ?
       ORDER BY date DESC`,
      [monthNum, yearNum]
    );

    // Get maintenances
    const [maintenances] = await db.promise().query(
      `SELECT 
        item_name,
        start_date,
        end_date,
        cost,
        description
       FROM maintenances 
       WHERE (MONTH(start_date) = ? AND YEAR(start_date) = ?) 
          OR (MONTH(end_date) = ? AND YEAR(end_date) = ?)
       ORDER BY start_date DESC`,
      [monthNum, yearNum, monthNum, yearNum]
    );

    // Get milk shipments per day
    const [shipments] = await db.promise().query(
      `SELECT 
        date,
        SUM(amount) as total_amount,
        destination,
        notes
       FROM milk_shipments 
       WHERE MONTH(date) = ? AND YEAR(date) = ?
       GROUP BY date, destination, notes
       ORDER BY date DESC`,
      [monthNum, yearNum]
    );

    // Calculate total shipments
    const totalShipment = shipments.reduce((sum, shipment) => sum + parseFloat(shipment.total_amount), 0);

    // Calculate totals
    const totalIncome = incomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
    const totalExpense = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const totalMaintenance = maintenances.reduce((sum, maintenance) => sum + parseFloat(maintenance.cost), 0);
    const totalSalary = salarySummary.reduce((sum, salary) => sum + parseFloat(salary.final_salary), 0);
    const totalMilkValue = totalCollections[0]?.total_value || 0;

    // Perbaikan perhitungan pendapatan bersih
    const netIncome = (totalIncome + totalMilkValue) - (totalExpense + totalMaintenance + totalSalary);

    res.json({
      success: true,
      data: {
        period: {
          month: monthNum,
          year: yearNum,
          monthName: new Date(yearNum, monthNum - 1).toLocaleDateString('id-ID', { month: 'long' })
        },
        milkCollections: {
          summary: collectionsSummary,
          total: totalCollections[0] || {
            total_amount: 0,
            avg_price: 0,
            total_value: 0,
            total_days: 0
          }
        },
        attendance: attendanceSummary,
        salaries: salarySummary,
        incomes: {
          items: incomes,
          total: totalIncome
        },
        expenses: {
          items: expenses,
          total: totalExpense
        },
        maintenances: {
          items: maintenances,
          total: totalMaintenance
        },
        shipments: {
          items: shipments,
          total: totalShipment
        },
        summary: {
          totalIncome: totalIncome,
          totalMilkValue: totalMilkValue,
          totalExpense: totalExpense,
          totalMaintenance: totalMaintenance,
          totalShipment: totalShipment,
          totalSalary: totalSalary,
          netIncome: netIncome
        }
      }
    });
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/available-months
// @desc    Get available months for reports
// @access  Private
router.get('/available-months', async (req, res) => {
  try {
    // Get months from milk collections
    const [collectionMonths] = await db.promise().query(
      `SELECT DISTINCT YEAR(date) as year, MONTH(date) as month
       FROM milk_collections 
       ORDER BY year DESC, month DESC`
    );

    // Get months from attendances
    const [attendanceMonths] = await db.promise().query(
      `SELECT DISTINCT YEAR(date) as year, MONTH(date) as month
       FROM employee_attendances 
       ORDER BY year DESC, month DESC`
    );

    // Get months from incomes
    const [incomeMonths] = await db.promise().query(
      `SELECT DISTINCT YEAR(date) as year, MONTH(date) as month
       FROM incomes 
       ORDER BY year DESC, month DESC`
    );

    // Get months from expenses
    const [expenseMonths] = await db.promise().query(
      `SELECT DISTINCT YEAR(date) as year, MONTH(date) as month
       FROM expenses 
       ORDER BY year DESC, month DESC`
    );

    // Combine all months and remove duplicates
    const allMonths = [
      ...collectionMonths,
      ...attendanceMonths,
      ...incomeMonths,
      ...expenseMonths
    ];

    const uniqueMonths = allMonths.filter((month, index, self) => 
      index === self.findIndex(m => m.year === month.year && m.month === month.month)
    );

    res.json({
      success: true,
      data: uniqueMonths
    });
  } catch (error) {
    console.error('Get available months error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
