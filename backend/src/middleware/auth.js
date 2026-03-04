const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/database');

const authMiddleware = (req, res, next) => {
    // LOG SEMUA HEADER UNTUK DEBUG
    console.log('========== AUTH MIDDLEWARE ==========');
    console.log('Headers:', req.headers);
    console.log('Authorization header:', req.headers['authorization']);
    console.log('Query token:', req.query.token); // TAMBAHKAN INI UNTUK DEBUG
    
    // Bisa dari header Authorization, dari cookie, atau dari query parameter
    const token = req.headers['authorization']?.split(' ')[1] || 
                  req.cookies?.admin_token || 
                  req.cookies?.token ||
                  req.query.token; // TAMBAHKAN INI - ambil token dari URL
    
    console.log('Token extracted:', token ? token.substring(0, 20) + '...' : 'TIDAK ADA');
    
    if (!token) {
        console.log('❌ Token tidak ditemukan!');
        return res.status(401).json({
            success: false,
            message: 'Token tidak ditemukan'
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rahasia banget');
        console.log('✅ Token valid untuk user:', decoded.id);
        req.user = decoded;
        req.userId = decoded.id;
        req.userRole = decoded.role || 'admin';
        next();
    } catch (error) {
        console.error('❌ Token verification error:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token tidak valid'
            });
        }
        
        return res.status(401).json({
            success: false,
            message: 'Terjadi kesalahan verifikasi token'
        });
    }
};

// Fungsi register (bukan middleware)
authMiddleware.register = async (req, res) => {
    console.log('➡️ [API] Register attempt:', { 
        ...req.body, 
        password: '[HIDDEN]', 
        confirm_password: '[HIDDEN]' 
    });
    
    const { 
        email, 
        password, 
        confirm_password,
        full_name,
        nama_instansi,
        alamat,
        nomor_telepon
    } = req.body;
    
    // Validasi input
    if (!email || !password || !full_name || !nama_instansi || !alamat || !nomor_telepon) {
        return res.status(400).json({
            success: false,
            message: 'Semua field wajib diisi!'
        });
    }
    
    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Format email tidak valid!'
        });
    }
    
    // Validasi password
    if (password !== confirm_password) {
        return res.status(400).json({
            success: false,
            message: 'Password dan konfirmasi password tidak cocok!'
        });
    }
    
    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password minimal 6 karakter!'
        });
    }
    
    // Validasi nomor telepon
    const phoneRegex = /^[0-9]{10,15}$/;
    const cleanPhone = nomor_telepon.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({
            success: false,
            message: 'Nomor telepon harus 10-15 digit angka!'
        });
    }
    
    try {
        // Cek apakah email sudah terdaftar
        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email sudah terdaftar! Silakan gunakan email lain.'
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user baru
        const [result] = await db.query(
            `INSERT INTO users (
                email, 
                password, 
                full_name, 
                nama_instansi, 
                alamat, 
                nomor_telepon,
                role,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'pelanggan', NOW())`,
            [email, hashedPassword, full_name, nama_instansi, alamat, nomor_telepon]
        );
        
        console.log('✅ User registered successfully:', {
            id: result.insertId,
            email: email
        });
        
        // Catat aktivitas register
        try {
            await db.query(
                `INSERT INTO activities (user_id, activity_name, ip_address, user_agent, created_at) 
                 VALUES (?, 'register', ?, ?, NOW())`,
                [result.insertId, req.ip || req.connection.remoteAddress, req.headers['user-agent'] || '-']
            );
        } catch (activityError) {
            console.log('Activity log error:', activityError.message);
        }
        
        res.json({
            success: true,
            message: 'Registrasi berhasil! Silakan login.',
            data: { id: result.insertId, email }
        });
        
    } catch (error) {
        console.error('❌ Register error:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Email sudah terdaftar!'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server. Silakan coba lagi nanti.'
        });
    }
};

// Fungsi login
authMiddleware.login = async (req, res) => {
    console.log('➡️ [API] Login attempt:', { email: req.body.email });
    
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email dan password wajib diisi!'
        });
    }
    
    try {
        const db = require('../config/database');
        const bcrypt = require('bcrypt');
        
        const [users] = await db.query(
            'SELECT id, email, password, full_name, role FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah!'
            });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah!'
            });
        }
        
        // Buat token JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'rahasia banget',
            { expiresIn: '7d' }
        );
        
        // KIRIM RESPONSE DENGAN FORMAT YANG SEDERHANA
        res.json({
            success: true,
            message: 'Login berhasil',
            data: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                token: token
            }
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Middleware untuk cek role admin
authMiddleware.verifyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya untuk admin.'
        });
    }
    
    next();
};

// Middleware optional (tanpa error)
authMiddleware.optional = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1] || 
                  req.cookies?.admin_token || 
                  req.cookies?.token ||
                  req.query.token; // TAMBAHKAN JUGA DI SINI
    
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rahasia banget');
            req.user = decoded;
            req.userId = decoded.id;
        } catch (error) {
            // Abaikan error
        }
    }
    
    next();
};

module.exports = authMiddleware;