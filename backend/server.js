// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Static files - SERVE LANGSUNG TANPA TOKEN DULU UNTUK TESTING
app.use('/uploads', (req, res, next) => {
    console.log('📁 Request untuk file:', req.url);
    
    // Cek apakah file benar-benar ada
    const filePath = path.join(__dirname, 'uploads', req.url);
    console.log('📁 Full path:', filePath);
    
    if (fs.existsSync(filePath)) {
        console.log('✅ File DITEMUKAN!');
        // Log info file
        const stats = fs.statSync(filePath);
        console.log('📁 Ukuran file:', stats.size, 'bytes');
        console.log('📁 Permission:', stats.mode.toString(8));
    } else {
        console.log('❌ File TIDAK DITEMUKAN!');
    }
    
    next();
}, express.static(path.join(__dirname, 'uploads')));

// Routes
const apiRoutes = require('./src/routes/api');
app.use('/api', apiRoutes);

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Backend API is running' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 BACKEND SERVER`);
    console.log(`=================================`);
    console.log(`Port: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Uploads: http://localhost:${PORT}/uploads`);
    console.log(`=================================`);
});