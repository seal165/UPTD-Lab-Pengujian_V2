const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/database');

const authController = {
    // Login API
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            
            // Validasi input
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email dan password harus diisi'
                });
            }
            
            // Cari user di database
            const [users] = await db.query(
                'SELECT * FROM users WHERE email = ? AND role = ?',
                [email, 'admin']
            );
            
            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Email atau password salah'
                });
            }
            
            const user = users[0];
            
            // Verifikasi password
            const validPassword = await bcrypt.compare(password, user.password);
            
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Email atau password salah'
                });
            }
            
            // Cek status user
            if (user.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'Akun Anda tidak aktif. Silakan hubungi administrator.'
                });
            }
            
            // Generate JWT token
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );
            
            // Update last login
            await db.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id]
            );
            
            // Catat aktivitas login
            await db.query(
                'INSERT INTO activities (user_id, action, description) VALUES (?, ?, ?)',
                [user.id, 'login', 'Admin login ke sistem']
            );
            
            // Kirim response sukses
            res.json({
                success: true,
                message: 'Login berhasil',
                data: {
                    token: token,
                    user: {
                        id: user.id,
                        full_name: user.full_name,
                        email: user.email,
                        role: user.role
                    }
                }
            });
            
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan server'
            });
        }
    },
    
    // Verify token
    verifyToken: async (req, res) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token tidak ditemukan'
                });
            }
            
            // Verifikasi token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            
            // Cek apakah user masih ada di database (support semua role: admin, user, petugas)
            const [users] = await db.query(
                'SELECT id, full_name, email, role FROM users WHERE id = ?',
                [decoded.id]
            );
            
            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }
            
            res.json({
                success: true,
                data: {
                    user: users[0]
                }
            });
            
        } catch (error) {
            console.error('Token verification error:', error);
            res.status(401).json({
                success: false,
                message: 'Token tidak valid'
            });
        }
    },
    
    // Logout (optional - bisa di-handle di frontend dengan hapus token)
    logout: async (req, res) => {
        try {
            const userId = req.user.id;
            
            // Catat aktivitas logout
            await db.query(
                'INSERT INTO activities (user_id, action, description) VALUES (?, ?, ?)',
                [userId, 'logout', 'Admin logout dari sistem']
            );
            
            res.json({
                success: true,
                message: 'Logout berhasil',
                redirect: '/'
            });
            
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan server'
            });
        }
    },

    // Register API
    register: async (req, res) => {
        try {
            const { full_name, email, password, confirm_password } = req.body;
            
            // DEBUG: Log apa yang diterima
            console.log('📝 Register request body:', {
                full_name,
                email,
                password_length: password ? password.length : 0,
                confirm_password_length: confirm_password ? confirm_password.length : 0
            });
            console.log('📝 Full request body:', req.body);
            
            // Validasi input
            if (!full_name || !email || !password || !confirm_password) {
                return res.status(400).json({
                    success: false,
                    message: 'Semua field harus diisi'
                });
            }

            // Validasi password match
            if (password !== confirm_password) {
                return res.status(400).json({
                    success: false,
                    message: 'Password dan konfirmasi password tidak cocok'
                });
            }

            // Validasi panjang password
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password minimal harus 6 karakter'
                });
            }

            // Cek email sudah terdaftar
            const [existingUser] = await db.query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existingUser.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email sudah terdaftar'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user ke database dengan full_name
            const [result] = await db.query(
                'INSERT INTO users (full_name, email, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                [full_name, email, hashedPassword, 'user', 'active']
            );

            // Generate token
            const token = jwt.sign(
                {
                    id: result.insertId,
                    email: email,
                    full_name: full_name,
                    role: 'user'
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            // Catat aktivitas register
            await db.query(
                'INSERT INTO activities (user_id, action, description) VALUES (?, ?, ?)',
                [result.insertId, 'register', 'User baru mendaftar']
            );

            res.status(201).json({
                success: true,
                message: 'Registrasi berhasil',
                data: {
                    token: token,
                    user: {
                        id: result.insertId,
                        full_name: full_name,
                        email: email,
                        role: 'user'
                    }
                }
            });

        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan server'
            });
        }
    }
};

module.exports = authController;