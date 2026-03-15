const db = require('../config/database');

const pageController = {
    // ==================== HALAMAN PUBLIK ====================

    // Halaman Utama / Landing Page
    getLandingPage: async (req, res) => {
        console.log('➡️ Mengakses halaman utama');
        
        const parameters = {
            accredited: [
                "Kadar Air", 
                "Analisa Saringan", 
                "Kuat Tekan Kubus", 
                "Kuat Tekan Cylinder", 
                "Abrasi/Kekerasan Batuan", 
                "Berat Jenis Agregat Kasar", 
                "Berat Jenis Agregat Halus",
                "Kepadatan Laboratorium", 
                "Extraction", 
                "Kuat Tarik Besi",
                "Uji Kuat Tekan Paving Block", 
                "Kuat Tekan Inti Beton Hasil Pemboran",
                "Kuat Lentur Beton", 
                "Sand Cone Tanah"
            ],
            nonAccredited: [
                "Penelitian Sondir/Bor Tangan", 
                "Core Drill Aspal Beton", 
                "CBR Lapangan", 
                "Dynamic Cone Penetrometer (DCP)", 
                "Hammer Test", 
                "Core Drill Beton", 
                "Berat Isi",
                "CBR Laboratorium", 
                "Atterberg", 
                "Pemadatan Standart dan Modified",
                "Mix Design Beton", 
                "Kuat Tekan Mortar", 
                "Mix Design Agregat",
                "Kuat Lentur Besi", 
                "Mix Design Hotmix", 
                "Marshall Test"
            ]
        };
        
        const prices = [
            { item: "Sondir (Max 20m)", price: "800.000", unit: "Per Titik" },
            { item: "Sand Cone", price: "100.000", unit: "Per Titik" },
            { item: "CBR Lapangan", price: "250.000", unit: "Per Titik" },
            { item: "Kuat Tekan Beton", price: "60.000", unit: "Per Sampel" }
        ];
        
        const bestSeller = [
            { name: "Kuat Tekan Beton", orders: 245, icon: "🏗️" },
            { name: "Uji Sondir", orders: 189, icon: "🔨" },
            { name: "Marshall Test", orders: 156, icon: "🛣️" },
            { name: "Sand Cone", orders: 134, icon: "⛰️" },
            { name: "Uji Tarik Besi", orders: 112, icon: "⚙️" }
        ];
        
        res.render('index', { 
            title: 'Beranda - UPTD Pengujian Bahan Kontruksi Bangunan & Informasi Kontruksi',
            active: 'home',
            params: parameters,
            prices: prices,
            bestSeller: bestSeller,
            user: req.session.user || null
        });
    },

    // Alias untuk getLandingPage
    getHomePage: async (req, res) => {
        return pageController.getLandingPage(req, res);
    },

    // Halaman Profil Publik
    getPublicProfile: async (req, res) => {
        console.log('➡️ Mengakses profil publik');
        res.render('profile', { 
            title: 'Profil & Lokasi',
            active: 'profile',
            user: req.session.user || null
        });
    },

    // Halaman Daftar Layanan & Tarif
    getServicesPage: async (req, res) => {
        console.log('➡️ Mengakses halaman layanan');
        try {
            const axios = require('axios');
            const API_URL = process.env.API_URL || 'http://localhost:5000/api';
            
            const response = await axios.get(`${API_URL}/services`, { timeout: 10000 });
            
            let services = [];
            if (response.data && response.data.success) {
                services = response.data.data || [];
            }
            
            res.render('services', { 
                title: 'Pelayanan & Tarif - UPTD Lab',
                active: 'services',
                services: services,
                user: req.session.user || null,
                currentUrl: req.originalUrl
            });
            
        } catch (error) {
            console.error('❌ Error loading services page:', error.message);
            
            // Data dummy untuk fallback
            const dummyServices = [
                {
                    typeName: "PENGUJIAN BAHAN",
                    categories: [
                        {
                            categoryName: "Agregat",
                            items: [
                                {
                                    service_name: "Pengujian Keausan Agregat",
                                    sample: "20 Kilogram",
                                    duration: "14",
                                    price: 90000,
                                    method: "SNI 2417:2008",
                                    unit: "Kg",
                                    type: "lab",
                                    accredited: true
                                }
                            ]
                        }
                    ]
                }
            ];
            
            res.render('services', { 
                title: 'Pelayanan & Tarif - UPTD Lab',
                active: 'services',
                services: dummyServices,
                user: req.session.user || null,
                currentUrl: req.originalUrl,
                error: 'Menggunakan data contoh (backend tidak terhubung)'
            });
        }
    },

    // Halaman Estimasi
    getEstimasiPage: async (req, res) => {
        console.log('➡️ Mengakses halaman estimasi');
        try {
            const db = require('../config/database');
            
            const [services] = await db.query(`
                SELECT 
                    s.id,
                    s.service_name,
                    s.min_sample,
                    s.duration_days as duration,
                    s.price,
                    s.method,
                    tc.id as category_id,
                    tc.category_name,
                    tt.id as type_id,
                    tt.type_name
                FROM services s
                JOIN test_categories tc ON s.category_id = tc.id
                JOIN test_types tt ON tc.test_type_id = tt.id
                ORDER BY tt.type_name, tc.category_name, s.service_name
            `);

            // Kelompokkan berdasarkan tipe dan kategori
            const servicesByType = {};
            
            services.forEach(service => {
                if (!servicesByType[service.type_name]) {
                    servicesByType[service.type_name] = {
                        typeName: service.type_name,
                        categories: {}
                    };
                }
                
                if (!servicesByType[service.type_name].categories[service.category_name]) {
                    servicesByType[service.type_name].categories[service.category_name] = {
                        categoryName: service.category_name,
                        items: []
                    };
                }
                
                let itemType = 'lab';
                const fieldKeywords = ['lapangan', 'core drill', 'sondir', 'hammer'];
                const serviceNameLower = service.service_name.toLowerCase();
                
                if (fieldKeywords.some(keyword => serviceNameLower.includes(keyword))) {
                    itemType = 'field';
                }
                
                let unit = 'Sampel';
                if (service.min_sample) {
                    if (service.min_sample.toLowerCase().includes('kilogram')) unit = 'Kg';
                    else if (service.min_sample.toLowerCase().includes('buah')) unit = 'Buah';
                    else if (service.min_sample.toLowerCase().includes('titik')) unit = 'Titik';
                }
                
                servicesByType[service.type_name].categories[service.category_name].items.push({
                    id: service.id,
                    service_name: service.service_name,
                    name: service.service_name,
                    sample: service.min_sample || '1 sampel',
                    duration: service.duration || '7',
                    price: parseFloat(service.price) || 0,
                    method: service.method || '-',
                    unit: unit,
                    type: itemType,
                    accredited: service.method && service.method.includes('SNI')
                });
            });

            const formattedServices = Object.values(servicesByType).map(type => ({
                typeName: type.typeName,
                categories: Object.values(type.categories)
            }));

            res.render('estimasi', {
                services: formattedServices,
                modeSibukActive: false,
                jadwalSibuk: [],
                holidays: [],
                title: 'Estimasi Biaya Pengujian - UPTD Lab',
                active: 'estimasi',
                user: req.session.user || null,
                currentUrl: req.originalUrl
            });
            
        } catch (error) {
            console.error('❌ ERROR LOADING ESTIMASI PAGE:', error);
            
            res.render('estimasi', {
                services: [],
                modeSibukActive: false,
                jadwalSibuk: [],
                holidays: [],
                title: 'Estimasi Biaya Pengujian - UPTD Lab',
                active: 'estimasi',
                user: req.session.user || null,
                currentUrl: req.originalUrl
            });
        }
    },

    // ==================== AUTH ====================
    getLoginPage: (req, res) => {
        console.log('➡️ Mengakses halaman login');
        
        if (req.session && req.session.user) {
            if (req.session.user.role === 'admin' || req.session.user.role === 'petugas') {
                return res.redirect('/admin/dashboard');
            } else {
                return res.redirect('/user/dashboard');
            }
        }
        
        res.render('login', {
            title: 'Login - UPTD Lab',
            error: null,
            success: null,
            formData: {},
            user: null
        });
    },

    postLogin: async (req, res) => {
        console.log('➡️ Form login submitted:', { email: req.body.email });
        
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.json({
                success: false,
                message: 'Email dan password wajib diisi!'
            });
        }
        
        try {
            const axios = require('axios');
            const API_URL = process.env.API_URL || 'http://localhost:5000/api';
            
            const response = await axios.post(`${API_URL}/auth/login`, { email, password });
            
            console.log('✅ Login response:', response.data);
            
            if (response.data.success && response.data.data) {
                const userData = response.data.data;
                const userObj = userData.user || userData;
                
                // Simpan di session
                req.session.user = {
                    id: userObj.id,
                    email: userObj.email,
                    full_name: userObj.full_name,
                    role: userObj.role
                };
                req.session.token = userData.token;
                
                // Save session
                req.session.save((err) => {
                    if (err) {
                        console.error('❌ Session save error:', err);
                    }
                    console.log('✅ Session saved:', req.session.user);
                });
                
                // 🔴 KIRIM RESPONSE SAMA SEPERTI DI ATAS
                res.json({
                    success: true,
                    data: {
                        id: userObj.id,
                        email: userObj.email,
                        full_name: userObj.full_name,
                        role: userObj.role,
                        token: userData.token
                    },
                    redirect: userObj.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'
                });
            } else {
                res.json({
                    success: false,
                    message: response.data.message || 'Login gagal'
                });
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            res.json({
                success: false,
                message: error.response?.data?.message || 'Terjadi kesalahan'
            });
        }
    },

    getRegisterPage: (req, res) => {
        console.log('➡️ Mengakses halaman register');
        
        if (req.session && req.session.user) {
            if (req.session.user.role === 'admin' || req.session.user.role === 'petugas') {
                return res.redirect('/admin/dashboard');
            } else {
                return res.redirect('/user/dashboard');
            }
        }
        
        res.render('register', { 
            title: 'Daftar Akun - UPTD Lab',
            error: null,
            success: null,
            formData: {},
            user: null
        });
    },

    postRegister: async (req, res) => {
        console.log('➡️ Form register submitted');
        
        const axios = require('axios');
        const API_URL = process.env.API_URL || 'http://localhost:5000/api';
        
        try {
            if (req.body.password !== req.body.confirm_password) {
                return res.render('register', {
                    title: 'Daftar Akun - UPTD Lab',
                    error: 'Password dan konfirmasi password tidak cocok!',
                    formData: req.body,
                    user: null
                });
            }
            
            const response = await axios.post(`${API_URL}/auth/register`, req.body);
            
            if (response.data.success) {
                res.render('login', {
                    title: 'Login - UPTD Lab',
                    error: null,
                    success: 'Registrasi berhasil! Silakan login.',
                    formData: {},
                    user: null
                });
            } else {
                res.render('register', {
                    title: 'Daftar Akun - UPTD Lab',
                    error: response.data.message || 'Registrasi gagal',
                    formData: req.body,
                    user: null
                });
            }
        } catch (error) {
            res.render('register', {
                title: 'Daftar Akun - UPTD Lab',
                error: error.response?.data?.message || 'Terjadi kesalahan server',
                formData: req.body,
                user: null
            });
        }
    },

    logout: (req, res) => {
        console.log('➡️ Logout user:', req.session?.user?.email);
        req.session.destroy((err) => {
            if (err) console.error('❌ Logout error:', err);
            res.redirect('/login');
        });
    },

    // ==================== HALAMAN USER ====================
    userDashboard: async (req, res) => {
        console.log('➡️ userDashboard untuk user ID:', req.session?.user?.id);
        
        try {
            const token = req.session?.token;
            const userId = req.session?.user?.id;
            
            if (!token || !userId) {
                return res.redirect('/login');
            }

            const axios = require('axios');
            const API_URL = process.env.API_URL || 'http://localhost:5000/api';
            
            const response = await axios.get(`${API_URL}/user/dashboard`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            let dashboardData = {
                totalSubmissions: 0,
                pendingPayment: 0,
                completedTests: 0,
                totalSpending: 0,
                materialTestingCount: 0,
                siteReviewCount: 0,
                paidInvoices: 0,
                duePayments: 0,
                recentSubmissions: [],
                recentTransactions: [],
                weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
                submissionsChange: 0
            };

            if (response.data.success && response.data.data) {
                const apiData = response.data.data;
                dashboardData = {
                    totalSubmissions: apiData.totalSubmissions || 0,
                    pendingPayment: apiData.pendingPayment || 0,
                    completedTests: apiData.completedTests || 0,
                    totalSpending: apiData.totalSpending || 0,
                    materialTestingCount: apiData.materialTestingCount || 0,
                    siteReviewCount: apiData.siteReviewCount || 0,
                    paidInvoices: apiData.paidInvoices || 0,
                    duePayments: apiData.duePayments || 0,
                    recentSubmissions: (apiData.recentSubmissions || []).map(sub => ({
                        appId: sub.no_permohonan || sub.id,
                        projectName: sub.nama_proyek || 'Pengujian',
                        status: sub.status || 'Pending',
                        dateSubmitted: sub.created_at,
                        serviceType: `${sub.totalSamples || 0} sampel`
                    })),
                    recentTransactions: (apiData.recentTransactions || []),
                    weeklyActivity: apiData.weeklyActivity || [0,0,0,0,0,0,0],
                    submissionsChange: apiData.submissionsChange || 0
                };
            }

            res.render('user/dashboard', { 
                title: 'Dashboard - UPTD Lab',
                pageTitle: 'Dashboard',
                active: 'dashboard',
                user: req.session.user,
                dashboardData: dashboardData
            });
            
        } catch (error) {
            console.error('❌ Error loading user dashboard:', error.message);
            
            const fallbackData = {
                totalSubmissions: 0,
                pendingPayment: 0,
                completedTests: 0,
                totalSpending: 0,
                materialTestingCount: 0,
                siteReviewCount: 0,
                paidInvoices: 0,
                duePayments: 0,
                recentSubmissions: [],
                recentTransactions: [],
                weeklyActivity: [0,0,0,0,0,0,0],
                submissionsChange: 0
            };
            
            res.render('user/dashboard', { 
                title: 'Dashboard - UPTD Lab',
                pageTitle: 'Dashboard',
                active: 'dashboard',
                user: req.session.user,
                dashboardData: fallbackData,
                error: 'Gagal memuat data dashboard'
            });
        }
    },

    userProfile: async (req, res) => {
        console.log('➡️ userProfile');
        res.render('user/profile', { 
            title: 'Profil Saya', 
            pageTitle: 'Profil Saya',
            active: 'profile',
            user: req.session?.user
        });
    },

    userHistory: async (req, res) => {
        console.log('➡️ userHistory');
        
        try {
            const token = req.session?.token;
            const userId = req.session?.user?.id;
            
            if (!token || !userId) {
                return res.redirect('/login');
            }

            const axios = require('axios');
            const API_URL = process.env.API_URL || 'http://localhost:5000/api';
            
            console.log('📡 Fetching history from:', `${API_URL}/user/history`);
            
            const response = await axios.get(`${API_URL}/user/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            let submissions = [];
            if (response.data.success) {
                submissions = response.data.data || [];
                console.log(`✅ Loaded ${submissions.length} submissions from history`);
            }

            res.render('user/history', { 
                title: 'Riwayat Pengajuan - UPTD Lab',
                pageTitle: 'History Submission',
                currentPage: 'history',
                user: req.session.user,
                submissions: submissions,
                success: req.query.success === 'true',
                message: req.query.message || ''
            });
            
        } catch (error) {
            console.error('❌ Error loading user history:', error.message);
            
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            
            res.render('user/history', { 
                title: 'Riwayat Pengajuan - UPTD Lab',
                pageTitle: 'History Submission',
                currentPage: 'history',
                user: req.session.user,
                submissions: [],
                success: false,
                message: ''
            });
        }
    },

    userHistoryDetail: async (req, res) => {
        console.log('➡️ userHistoryDetail', req.params.id);
        
        try {
            const token = req.session?.token;
            const submissionId = req.params.id;
            
            if (!token) return res.redirect('/login');
            
            if (!submissionId || isNaN(submissionId)) {
                return res.redirect('/user/history');
            }

            // Render halaman dengan data yang diperlukan
            res.render('user/history-detail', { 
                title: 'Detail Pengajuan - UPTD Lab',
                pageTitle: 'Detail Pengajuan',
                currentPage: 'history',
                user: req.session.user,
                notificationCount: 0,
                id: submissionId,
                token: token // Kirim token ke view
            });
            
        } catch (error) {
            console.error('❌ Error loading history detail:', error);
            res.redirect('/user/history');
        }
    },

    // ==================== USER SUBMISSION PAGE ====================
    userSubmission: async (req, res) => {
        try {
            const userId = req.session?.user?.id || req.user?.id;
            
            if (!userId) {
                return res.redirect('/login');
            }
            
            // 🔥 AMBIL DATA USER DARI DATABASE
            const [users] = await db.query(
                'SELECT full_name as name, nama_instansi as company, email FROM users WHERE id = ?',
                [userId]
            );
            
            // 🔥 AMBIL DATA SERVICES
            const [services] = await db.query(`
                SELECT 
                    tt.id as type_id,
                    tt.type_name as typeName,
                    tc.id as category_id,
                    tc.category_name as categoryName,
                    s.id as service_id,
                    s.service_name as name,
                    s.min_sample as sample,
                    s.duration_days as duration,
                    s.price,
                    s.method
                FROM test_types tt
                JOIN test_categories tc ON tt.id = tc.test_type_id
                JOIN services s ON tc.id = s.category_id
                ORDER BY tt.id, tc.id, s.id
            `);
            
            // 🔥 AMBIL DATA MODE SIBUK
            let busyMode = { active: false, activePeriods: [] };
            
            try {
                // Cek status mode sibuk
                const [settings] = await db.query(
                    'SELECT setting_value FROM settings WHERE setting_key = "busy_mode_active"'
                );
                const active = settings.length > 0 ? settings[0].setting_value === '1' : false;
                
                if (active) {
                    // Ambil periode aktif
                    const [periods] = await db.query(
                        `SELECT 
                            id, 
                            keterangan, 
                            DATE_FORMAT(tanggal_mulai, '%Y-%m-%d') as tanggal_mulai,
                            DATE_FORMAT(tanggal_selesai, '%Y-%m-%d') as tanggal_selesai
                        FROM jadwal_sibuk 
                        WHERE tanggal_selesai >= CURDATE()
                        ORDER BY tanggal_mulai ASC`
                    );
                    
                    busyMode = {
                        active: true,
                        activePeriods: periods
                    };
                }
            } catch (error) {
                console.log('Error loading busy mode:', error.message);
            }
            
            // ✅ PANGGIL FUNGSI groupServices YANG SUDAH DITAMBAHKAN
            const groupedServices = groupServices(services);
            
            res.render('user/submission', {
                title: 'Form Pengajuan Pengujian',
                currentPage: 'submission',
                user: users[0] || { name: '', company: '', email: '' },
                services: groupedServices,
                busyMode: busyMode,
                formData: {},
                error: null,
                token: req.csrfToken ? req.csrfToken() : ''
            });
            
        } catch (error) {
            console.error('Error rendering submission page:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    postSubmission: async (req, res) => {
        console.log('➡️ postSubmission');
        console.log('📦 req.body:', req.body);
        console.log('📦 req.files:', req.files);
        
        try {
            const token = req.session?.token;
            const userId = req.session?.user?.id;
            
            if (!token || !userId) {
                console.log('❌ Token atau userId tidak ditemukan');
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized - Silakan login kembali'
                });
            }

            const axios = require('axios');
            const FormData = require('form-data');
            const API_URL = process.env.API_URL || 'http://localhost:5000/api';
            
            // Buat FormData baru
            const formData = new FormData();
            
            // Append semua field dari req.body - GUNAKAN Object.keys()
            Object.keys(req.body).forEach(key => {
                const value = req.body[key];
                
                // Handle array (checkbox)
                if (Array.isArray(value)) {
                    // Untuk array, kita bisa gabungkan dengan koma atau kirim satu per satu
                    formData.append(key, value.join(','));
                } else {
                    formData.append(key, value || '');
                }
            });
            
            // Append files jika ada
            if (req.files) {
                if (req.files['surat_permohonan']) {
                    const file = req.files['surat_permohonan'][0];
                    formData.append('surat_permohonan', file.buffer, {
                        filename: file.originalname,
                        contentType: file.mimetype
                    });
                    console.log('📁 Surat file appended:', file.originalname);
                }
                if (req.files['scan_ktp']) {
                    const file = req.files['scan_ktp'][0];
                    formData.append('scan_ktp', file.buffer, {
                        filename: file.originalname,
                        contentType: file.mimetype
                    });
                    console.log('📁 KTP file appended:', file.originalname);
                }
            }
            
            console.log('📡 Sending to backend:', `${API_URL}/user/submission`);
            
            // Dapatkan headers dari formData
            const headers = formData.getHeaders();
            
            const response = await axios.post(`${API_URL}/user/submission`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    ...headers
                }
            });
            
            console.log('✅ Response from backend:', response.data);
            
            if (response.data.success) {
                res.json({
                    success: true,
                    message: 'Pengajuan berhasil dikirim',
                    data: response.data.data
                });
            } else {
                res.json({
                    success: false,
                    message: response.data.message || 'Gagal mengirim pengajuan'
                });
            }
            
        } catch (error) {
            console.error('❌ Error posting submission:');
            console.error('❌ Error message:', error.message);
            
            if (error.response) {
                console.error('❌ Response status:', error.response.status);
                console.error('❌ Response data:', error.response.data);
            }
            
            if (error.code === 'ECONNREFUSED') {
                return res.json({
                    success: false,
                    message: 'Tidak dapat terhubung ke server backend. Pastikan backend berjalan di port 5000.'
                });
            }
            
            res.json({
                success: false,
                message: error.response?.data?.message || 'Gagal mengirim pengajuan'
            });
        }
    },

    userTransaction: async (req, res) => {
        console.log('➡️ userTransaction');
        
        try {
            const token = req.session?.token;
            const userId = req.session?.user?.id;
            
            if (!token || !userId) {
                return res.redirect('/login');
            }

            const axios = require('axios');
            const API_URL = process.env.API_URL || 'http://localhost:5000/api';
            
            console.log('📡 Fetching transactions from:', `${API_URL}/user/transactions`);
            
            const response = await axios.get(`${API_URL}/user/transactions`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            let transactions = [];
            if (response.data.success) {
                transactions = response.data.data || [];
                console.log(`✅ Loaded ${transactions.length} transactions`);
            } else {
                console.log('⚠️ API response not success:', response.data);
            }

            res.render('user/transaction', { 
                title: 'Transaksi Saya - UPTD Lab',
                pageTitle: 'Transaction List',
                currentPage: 'transaction',
                user: req.session.user,
                notificationCount: 0,
                transactions: transactions
            });
            
        } catch (error) {
            console.error('❌ Error loading user transaction:', error.message);
            
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            
            res.render('user/transaction', { 
                title: 'Transaksi Saya - UPTD Lab',
                pageTitle: 'Transaction List',
                currentPage: 'transaction',
                user: req.session.user,
                notificationCount: 0,
                transactions: []
            });
        }
    },

    userTransactionDetail: async (req, res) => {
        console.log('➡️ userTransactionDetail', req.params.id);
        
        try {
            const token = req.session?.token;
            const transactionId = req.params.id;
            
            if (!token) return res.redirect('/login');

            const axios = require('axios');
            const API_URL = process.env.API_URL || 'http://localhost:5000/api';
            
            const response = await axios.get(`${API_URL}/user/transactions/${transactionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            let transaction = null;
            if (response.data.success) {
                transaction = response.data.data;
            }

            res.render('user/transaction-detail', { 
                title: 'Detail Transaksi - UPTD Lab',
                pageTitle: 'Detail Transaksi',
                active: 'transaction',
                user: req.session.user,
                id: transactionId,
                transaction: transaction
            });
            
        } catch (error) {
            console.error('❌ Error loading transaction detail:', error.message);
            res.render('user/transaction-detail', { 
                title: 'Detail Transaksi - UPTD Lab',
                pageTitle: 'Detail Transaksi',
                active: 'transaction',
                user: req.session.user,
                id: req.params.id,
                transaction: null
            });
        }
    },

    // ==================== UPLOAD PAYMENT PROOF ====================
    uploadPaymentProof: async (req, res) => {
        console.log('➡️ uploadPaymentProof', req.params.id);
        
        try {
            const token = req.session?.token;
            const transactionId = req.params.id;
            const { notes } = req.body;
            const file = req.file; // Dari multer
            
            if (!token) return res.redirect('/login');
            
            if (!file) {
                return res.redirect(`/user/transactions/${transactionId}?error=` + 
                    encodeURIComponent('File bukti pembayaran wajib diupload'));
            }

            const axios = require('axios');
            const API_URL = process.env.API_URL || 'http://localhost:5000/api';
            
            const formData = new FormData();
            formData.append('payment_proof', file.buffer, file.originalname);
            formData.append('notes', notes || '');
            
            const response = await axios.post(
                `${API_URL}/user/transactions/${transactionId}/upload`, 
                formData,
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            
            if (response.data.success) {
                res.redirect(`/user/transactions/${transactionId}?success=true&message=Upload+berhasil`);
            } else {
                res.redirect(`/user/transactions/${transactionId}?error=` + 
                    encodeURIComponent(response.data.message));
            }
            
        } catch (error) {
            console.error('❌ Error uploading payment proof:', error.message);
            res.redirect(`/user/transactions/${req.params.id}?error=` + 
                encodeURIComponent('Gagal upload bukti pembayaran'));
        }
    },

    // ==================== UPDATE PROFILE ====================
    updateProfile: async (req, res) => {
        console.log('➡️ updateProfile', req.body);
        
        try {
            const token = req.session?.token;
            const userId = req.session?.user?.id;
            
            if (!token || !userId) return res.redirect('/login');

            const axios = require('axios');
            const API_URL = process.env.API_URL || 'http://localhost:5000/api';
            
            const response = await axios.put(`${API_URL}/users/${userId}`, req.body, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data.success) {
                // Update session user
                req.session.user = {
                    ...req.session.user,
                    ...req.body
                };
                res.redirect('/user/profile?success=true&message=Profil+berhasil+diupdate');
            } else {
                res.redirect('/user/profile?error=' + encodeURIComponent(response.data.message));
            }
            
        } catch (error) {
            console.error('❌ Error updating profile:', error.message);
            res.redirect('/user/profile?error=' + encodeURIComponent('Gagal update profil'));
        }
    },

    // ==================== HALAMAN ADMIN ====================
    adminLogin: (req, res) => {
        if (req.session?.user) {
            return res.redirect('/admin/dashboard');
        }
        res.render('admin/login', { title: 'Admin Login' });
    },

    adminDashboard: async (req, res) => {
        console.log('➡️ Admin Dashboard dipanggil');
        console.log('👤 User:', req.session.user);
        
        try {
            const token = req.session?.token;
            
            if (!token) {
                return res.redirect('/admin/login');
            }

            const axios = require('axios');
            const API_URL = process.env.API_URL || 'http://localhost:5000/api';
            
            // Panggil API untuk ambil data dashboard
            const response = await axios.get(`${API_URL}/admin/dashboard/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            let dashboardData = {
                stats: {
                    income: 'Rp 0',
                    pending: 0,
                    completed: 0,
                    awaitingPayment: 0
                },
                activities: [],
                submissions: [],
                chartLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
                chartValues: [0, 0, 0, 0, 0, 0]
            };

            if (response.data && response.data.success) {
                dashboardData = response.data.data || dashboardData;
                console.log('✅ Data dashboard dari database:', dashboardData);
            }

            res.render('admin/dashboard', { 
                title: 'Dashboard Admin - UPTD Lab',
                page: 'dashboard',
                currentPage: 'dashboard',
                user: req.session.user,
                data: dashboardData,
                error: null
            });
            
        } catch (error) {
            console.error('❌ Error loading admin dashboard:', error.message);
            
            // Data dummy sementara jika API error
            const dummyData = {
                stats: {
                    income: 'Rp 125.000.000',
                    pending: 12,
                    completed: 45,
                    awaitingPayment: 8
                },
                activities: [
                    {
                        company: 'PT. Konstruksi Maju',
                        description: 'Mengajukan permohonan baru',
                        time: '5 menit lalu',
                        status: 'Menunggu Verifikasi',
                        color: 'warning',
                        icon: 'file-alt',
                        badgeColor: 'warning'
                    }
                ],
                submissions: [
                    {
                        id: 'SUB001',
                        company: 'PT. Konstruksi Maju',
                        type: 'Pengujian Beton',
                        date: new Date().toLocaleDateString('id-ID'),
                        status: 'Menunggu Verifikasi'
                    }
                ],
                chartLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
                chartValues: [15000000, 25000000, 18000000, 32000000, 28000000, 35000000]
            };
            
            res.render('admin/dashboard', { 
                title: 'Dashboard Admin - UPTD Lab',
                page: 'dashboard',
                currentPage: 'dashboard',
                user: req.session.user,
                data: dummyData,
                error: 'Gagal memuat data dari server'
            });
        }
    },

    adminSubmissions: async (req, res) => {
        try {
            console.log('➡️ Admin Submissions');
            
            const token = req.session?.token;
            const page = req.query.page || 1;
            const status = req.query.status || '';
            const search = req.query.search || '';
            
            if (!token) return res.redirect('/admin/login');

            const axios = require('axios');
            const API_URL = process.env.API_URL || 'http://localhost:5000/api';
            
            const response = await axios.get(`${API_URL}/submissions`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { page, status, search, limit: 10 }
            });

            const data = response.data.success ? response.data.data : { submissions: [], total: 0, totalPages: 0 };

            res.render('admin/submissions', { 
                title: 'Manajemen Pengajuan', 
                page: 'submissions',
                user: req.session.user,
                submissions: data.submissions || [],
                pagination: {
                    page: parseInt(page),
                    totalPages: data.totalPages || 0,
                    total: data.total || 0
                },
                filters: { status, search }
            });
        } catch (error) {
            console.error('❌ Error loading admin submissions:', error);
            
            if (error.response?.status === 401) {
                return res.redirect('/admin/login');
            }
            
            res.render('admin/submissions', { 
                title: 'Manajemen Pengajuan', 
                page: 'submissions',
                user: req.session.user,
                submissions: [],
                pagination: { page: 1, totalPages: 0, total: 0 },
                filters: {}
            });
        }
    },

    // ==================== ADMIN DETAIL SUBMISSION ====================
    adminDetailSubmission: (req, res) => {
        console.log('➡️ Admin Detail Submission, ID:', req.params.id);
        
        res.render('admin/detail-submission', { 
            title: 'Detail Pengajuan', 
            page: 'submissions', 
            currentPage: 'submissions',
            submissionId: req.params.id,
            user: req.session?.user 
        });
    },

    // ==================== ADMIN SKRD ====================
    adminSKRD: (req, res) => {
        console.log('➡️ Admin SKRD dipanggil');
        
        res.render('admin/skrd', { 
            title: 'Manajemen SKRD - UPTD Lab',
            page: 'skrd',
            currentPage: 'skrd',
            user: req.session?.user 
        });
    },

    adminDetailSKRD: (req, res) => {
        console.log('➡️ Admin SKRD Detail, ID:', req.params.id);
        
        res.render('admin/detail-skrd', { 
            title: 'Detail SKRD - UPTD Lab',
            page: 'skrd',
            currentPage: 'skrd',
            user: req.session?.user,
            id: req.params.id 
        });
    },

    adminReports: (req, res) => {
        res.render('admin/reports', { 
            title: 'Laporan & Statistik', 
            page: 'reports',
            user: req.session?.user 
        });
    },

    // ==================== ADMIN USERS ====================
    adminUsers: (req, res) => {
        res.render('admin/users', { 
            title: 'Data Pemohon', 
            page: 'users',
            user: req.session?.user || req.user 
        });
    },

    adminUserDetail: (req, res) => {
        res.render('admin/detail-user', { 
            title: 'Detail Pemohon', 
            page: 'users', 
            userId: req.params.id,
            user: req.session?.user || req.user 
        });
    },

    // ==================== ADMIN SETTINGS ====================
    adminSettings: (req, res) => {
        res.render('admin/settings', { 
            title: 'Pengaturan Sistem', 
            page: 'settings',
            user: req.session?.user || req.user 
        });
    },

    // Method lainnya (sudah ada)
    adminLogout: (req, res) => {
        req.session.destroy();
        res.redirect('/admin/login');
    },

    adminActivityLogs: (req, res) => {
        res.render('admin/activities/index', { 
            title: 'Log Aktivitas', 
            page: 'activities',
            user: req.session?.user,
            activities: [],
            pagination: { page: 1, totalPages: 0, total: 0 }
        });
    },

    adminBackup: (req, res) => {
        res.render('admin/backup/index', { 
            title: 'Backup Database', 
            page: 'backup',
            user: req.session?.user,
            backups: []
        });
    },

    adminBusyMode: (req, res) => {
        res.render('admin/busy-mode/index', { 
            title: 'Mode Sibuk', 
            page: 'busy-mode',
            user: req.session?.user,
            busyMode: { active: false, periods: [] }
        });
    },

    // ==================== ADMIN KUISIONER ====================
    adminKuisioner: (req, res) => {
        console.log('➡️ Admin Kuisioner dipanggil');
        console.log('👤 User:', req.session?.user);
        
        res.render('admin/kuisioner', {
            title: 'Manajemen Kuisioner - UPTD Lab',
            page: 'kuisioner',
            currentPage: 'kuisioner',
            user: req.session?.user
        });
    },

    adminKuisionerDetail: (req, res) => {
        res.render('admin/kuisioner/detail', { 
            title: 'Detail Kuesioner', 
            page: 'kuisioner',
            user: req.session?.user,
            kuisioner: null
        });
    },

    adminQuestions: (req, res) => {
        res.render('admin/kuisioner/questions', { 
            title: 'Pertanyaan Kuesioner', 
            page: 'kuisioner',
            user: req.session?.user,
            questions: []
        });
    }
};

// Helper function untuk mengelompokkan services
function groupServices(services) {
    const grouped = [];
    const typeMap = new Map();
    
    services.forEach(item => {
        // Cek apakah tipe sudah ada
        if (!typeMap.has(item.type_id)) {
            typeMap.set(item.type_id, {
                typeId: item.type_id,
                typeName: item.typeName,
                categories: []
            });
            grouped.push(typeMap.get(item.type_id));
        }
        
        const currentType = typeMap.get(item.type_id);
        
        // Cek apakah kategori sudah ada di tipe ini
        let category = currentType.categories.find(c => c.categoryId === item.category_id);
        if (!category) {
            category = {
                categoryId: item.category_id,
                categoryName: item.categoryName,
                items: []
            };
            currentType.categories.push(category);
        }
        
        // Tambahkan item ke kategori
        category.items.push({
            id: item.service_id,
            name: item.name,
            sample: item.sample,
            duration: item.duration,
            price: item.price,
            method: item.method
        });
    });
    
    return grouped;
}

module.exports = pageController;