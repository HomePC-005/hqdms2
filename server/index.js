const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const drugRoutes = require('./routes/drugs');
const patientRoutes = require('./routes/patients');
const enrollmentRoutes = require('./routes/enrollments');
const departmentRoutes = require('./routes/departments');
const reportRoutes = require('./routes/reports');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/drugs', drugRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/reports', reportRoutes);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'HQDMS Server is running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access the API at: http://localhost:${PORT}/api`);
  console.log(`Access from other devices: http://[YOUR_IP]:${PORT}/api`);
  console.log('Make sure to replace [YOUR_IP] with your actual IP address');
});
