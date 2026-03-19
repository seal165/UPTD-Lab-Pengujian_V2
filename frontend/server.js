const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// Import routes
const mainRoutes = require('./src/routes/mainRoutes');

// Middleware - URUTAN PENTING!
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration - HARUS SEBELUM ROUTES
app.use(session({
    secret: process.env.SESSION_SECRET || 'uptd-lab-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    unset: 'destroy',
    cookie: { 
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    },
    name: 'uptd.sid'
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Make user data available to all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.currentUrl = req.originalUrl;
    next();
});

// Routes - PASTIKAN ROUTES DIPASANG
app.use('/', mainRoutes);

// 404 handler
app.use((req, res) => {
    res.redirect('/');
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);
    req.session.error = 'Terjadi kesalahan server. Silakan coba lagi.';
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('=================================');
    console.log('🚀 FRONTEND SERVER RUNNING');
    console.log('=================================');
    console.log(`Port: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Login Admin: http://localhost:${PORT}/admin/login`);
    console.log(`Login User: http://localhost:${PORT}/login`);
    console.log('=================================');
});