const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Konfigurasi storage untuk upload file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'public/uploads/';
        if (file.fieldname === 'surat_permohonan') {
            uploadPath += 'surat';
        } else if (file.fieldname === 'scan_ktp') {
            uploadPath += 'ktp';
        } else if (file.fieldname === 'payment_proof') {
            uploadPath += 'payment';
        } else {
            uploadPath += 'others';
        }
        
        const fs = require('fs');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const sanitizedName = file.fieldname.replace(/[^a-z0-9]/gi, '_');
        cb(null, sanitizedName + '-' + uniqueSuffix + ext);
    }
});

// Filter file yang diizinkan
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('File harus berupa gambar (JPG/PNG/GIF) atau PDF'));
    }
};

// Inisialisasi upload middleware
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024,
        files: 2
    },
    fileFilter: fileFilter
});

// ==================== HALAMAN PUBLIK ====================
router.get('/', pageController.getLandingPage || pageController.getHomePage);
router.get('/services', pageController.getServicesPage);
router.get('/estimasi', pageController.getEstimasiPage);
router.get('/profile', pageController.getPublicProfile || ((req, res) => res.render('profile')));
router.get('/tentang', pageController.getPublicProfile || ((req, res) => res.render('tentang')));
router.get('/kontak', pageController.getPublicProfile || ((req, res) => res.render('kontak')));
router.get('/faq', (req, res) => {
    res.render('faq', { 
        title: 'FAQ - UPTD Laboratorium',
        active: 'faq' 
    });
});

// ==================== AUTH ====================
router.get('/login', authMiddleware.redirectIfAuthenticated, pageController.getLoginPage);
router.post('/login', pageController.postLogin);
router.get('/register', authMiddleware.redirectIfAuthenticated, pageController.getRegisterPage);
router.post('/register', pageController.postRegister);
router.get('/logout', pageController.logout);

// ==================== HALAMAN ADMIN ====================
router.get('/admin/login', (req, res) => {
    res.render('admin/login', { 
        title: 'Admin Login',
        error: null,
        layout: false 
    });
});

// PASTIKAN INI ADA
router.get('/admin/dashboard', authMiddleware.verifyPageAccess, pageController.adminDashboard);

// ==================== HALAMAN ADMIN ====================
router.get('/admin/submissions', authMiddleware.verifyPageAccess, pageController.adminSubmissions);
router.get('/admin/submissions/:id', authMiddleware.verifyPageAccess, pageController.adminDetailSubmission);

// TAMBAHKAN INI - ROUTE SKRD
router.get('/admin/skrd', authMiddleware.verifyPageAccess, pageController.adminSKRD);
router.get('/admin/skrd/:id', authMiddleware.verifyPageAccess, pageController.adminDetailSKRD);

// ==================== HALAMAN ADMIN ====================
router.get('/admin/kuisioner', authMiddleware.verifyPageAccess, pageController.adminKuisioner);

// ==================== HALAMAN ADMIN USERS ====================
// TAMBAHKAN INI - ROUTE USERS
router.get('/admin/users', authMiddleware.verifyPageAccess, pageController.adminUsers);
router.get('/admin/users/:id', authMiddleware.verifyPageAccess, pageController.adminUserDetail);

// ==================== HALAMAN SETTINGS ====================
router.get('/admin/settings', authMiddleware.verifyPageAccess, pageController.adminSettings);

// ==================== HALAMAN USER (PEMOHON) ====================
// Dashboard
router.get('/user/dashboard', authMiddleware.verifyUserAccess, pageController.userDashboard);

// Form pengajuan baru
router.get('/user/submission', authMiddleware.verifyUserAccess, pageController.userSubmission);
router.post('/user/submission', 
    authMiddleware.verifyUserAccess,
    upload.fields([
        { name: 'surat_permohonan', maxCount: 1 },
        { name: 'scan_ktp', maxCount: 1 }
    ]), 
    pageController.postSubmission
);

// History (daftar pengajuan)
router.get('/user/history', authMiddleware.verifyUserAccess, pageController.userHistory);

// History Detail (detail satu pengajuan)
router.get('/user/history/:id', authMiddleware.verifyUserAccess, pageController.userHistoryDetail);

// Transaction (daftar transaksi)
router.get('/user/transaction', authMiddleware.verifyUserAccess, pageController.userTransaction);

// Transaction Detail
router.get('/user/transaction/:id', authMiddleware.verifyUserAccess, pageController.userTransactionDetail);

// Upload payment proof
router.post('/user/transaction/:id/upload', 
    authMiddleware.verifyUserAccess,
    upload.single('payment_proof'),
    pageController.uploadPaymentProof
);

// Profile
router.get('/user/profile', authMiddleware.verifyUserAccess, pageController.userProfile);
router.post('/user/profile', authMiddleware.verifyUserAccess, pageController.updateProfile);

// ==================== HALAMAN KHUSUS (PUBLIC) ====================
router.get('/kuisioner/:submissionId', (req, res) => {
    res.render('public/kuisioner', {
        title: 'Kuesioner Kepuasan - UPTD Laboratorium',
        submissionId: req.params.submissionId
    });
});

router.get('/track/:no_urut', async (req, res) => {
    try {
        const { no_urut } = req.params;
        res.render('public/track', {
            title: 'Lacak Pengajuan - UPTD Laboratorium',
            no_urut: no_urut
        });
    } catch (error) {
        res.status(500).send('Error');
    }
});

// ==================== AUTH POST ====================
router.post('/auth/register', async (req, res) => {
    try {
        const axios = require('axios');
        const API_URL = process.env.API_URL || 'http://localhost:5000/api';
        
        const { email, password, confirm_password, full_name, nama_instansi, alamat, nomor_telepon } = req.body;
        
        if (password !== confirm_password) {
            return res.render('register', {
                title: 'Daftar Akun - UPTD Lab',
                error: 'Password dan konfirmasi password tidak cocok!',
                formData: req.body,
                user: null
            });
        }
        
        const response = await axios.post(`${API_URL}/auth/register`, {
            email, password, confirm_password, full_name, nama_instansi, alamat, nomor_telepon
        });
        
        if (response.data.success) {
            res.redirect('/login?registered=true');
        } else {
            res.render('register', {
                title: 'Daftar Akun - UPTD Lab',
                error: response.data.message,
                formData: req.body,
                user: null
            });
        }
    } catch (error) {
        res.render('register', {
            title: 'Daftar Akun - UPTD Lab',
            error: error.response?.data?.message || 'Gagal terhubung ke server',
            formData: req.body,
            user: null
        });
    }
});

router.post('/auth/login', async (req, res) => {
    try {
        const axios = require('axios');
        const API_URL = process.env.API_URL || 'http://localhost:5000/api';
        
        const { email, password } = req.body;
        
        console.log('📝 Login attempt:', { email });
        
        const response = await axios.post(`${API_URL}/auth/login`, { email, password });
        
        console.log('📦 API Response:', response.data);
        
        if (response.data.success) {
            const userData = response.data.data.user || response.data.data;
            const token = response.data.data.token || response.data.data;

            return req.session.regenerate((regenerateError) => {
                if (regenerateError) {
                    console.error('❌ Failed to regenerate login session:', regenerateError);
                    return res.json({ success: false, message: 'Gagal membuat sesi login baru' });
                }

                req.session.token = token;
                req.session.user = {
                    id: userData.id,
                    email: userData.email,
                    full_name: userData.full_name || userData.name,
                    nama_instansi: userData.nama_instansi || null,
                    role: userData.role || 'pelanggan',
                    avatar: userData.avatar || null
                };

                return req.session.save((sessionError) => {
                    if (sessionError) {
                        console.error('❌ Failed to save login session:', sessionError);
                        return res.json({ success: false, message: 'Gagal menyimpan sesi login' });
                    }

                    return res.json({
                        success: true,
                        data: {
                            id: userData.id,
                            email: userData.email,
                            full_name: userData.full_name || userData.name,
                            nama_instansi: userData.nama_instansi || null,
                            role: userData.role || 'pelanggan',
                            avatar: userData.avatar || null,
                            token: token
                        },
                        redirect: (userData.role === 'admin' || userData.role === 'petugas')
                            ? '/admin/dashboard'
                            : '/user/dashboard'
                    });
                });
            });
        } else {
            console.log('❌ Login failed:', response.data.message);
            res.json({
                success: false,
                message: response.data.message || 'Email atau password salah'
            });
        }
    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.json({
            success: false,
            message: error.response?.data?.message || 'Terjadi kesalahan saat login'
        });
    }
});

// Route untuk submission (form) - handle POST
router.post('/user/submission', authMiddleware.verifyUserAccess, pageController.postSubmission);

module.exports = router;