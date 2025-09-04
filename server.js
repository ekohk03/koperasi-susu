const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Sesuaikan dengan port frontend Anda
  credentials: true
}));
// Jangan pasang body parser di sini!
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
const db = require('./config/database');

// Test database connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Database connected successfully');
  connection.release();
});

// Routes yang menerima upload file (pakai multer) DULUAN
app.use('/api/incomes', require('./routes/incomes'));
app.use('/api/maintenances', require('./routes/maintenances'));
// Baru pasang body parser untuk route lain
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Routes lain
app.use('/api/auth', require('./routes/auth'));
app.use('/api/collectors', require('./routes/collectors'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/attendances', require('./routes/attendances'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/shipments', require('./routes/shipments'));

app.use('/api/reports', require('./routes/reports'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});