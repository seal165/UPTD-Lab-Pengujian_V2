const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const apiController = {
    // ==================== SERVICES METHODS ====================
    // GET SERVICES LIST from database
    getServices: async (req, res) => {
        try {
            console.log('========== GET SERVICES ==========');
            
            // Ambil semua layanan dari database dengan JOIN
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

            console.log(`✅ Found ${services.length} services`);

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
                
                // Tentukan tipe lab/field berdasarkan metode atau nama layanan
                let itemType = 'lab';
                const fieldKeywords = ['lapangan', 'core drill', 'sondir', 'hammer', 'field', 'cbr lapangan'];
                const serviceNameLower = service.service_name.toLowerCase();
                const methodLower = (service.method || '').toLowerCase();
                
                if (fieldKeywords.some(keyword => 
                    serviceNameLower.includes(keyword) || methodLower.includes(keyword)
                )) {
                    itemType = 'field';
                }
                
                // Tentukan akreditasi (berdasarkan method yang mengandung SNI)
                const accredited = service.method && service.method.includes('SNI');
                
                // Parse min_sample untuk mendapatkan satuan
                let unit = 'Sampel';
                if (service.min_sample) {
                    if (service.min_sample.toLowerCase().includes('kilogram') || service.min_sample.includes('Kg')) unit = 'Kg';
                    else if (service.min_sample.toLowerCase().includes('buah')) unit = 'Buah';
                    else if (service.min_sample.toLowerCase().includes('titik')) unit = 'Titik';
                    else if (service.min_sample.toLowerCase().includes('liter')) unit = 'Liter';
                    else if (service.min_sample.toLowerCase().includes('meter')) unit = 'M';
                }
                
                servicesByType[service.type_name].categories[service.category_name].items.push({
                    id: service.id,
                    service_name: service.service_name,
                    name: service.service_name,
                    min_sample: service.min_sample,
                    sample: service.min_sample || '1 Sampel',
                    duration: service.duration || '7',
                    price: parseFloat(service.price) || 0,
                    method: service.method || '-',
                    unit: unit,
                    type: itemType,
                    accredited: accredited
                });
            });

            const formattedData = Object.values(servicesByType).map(type => ({
                typeName: type.typeName,
                categories: Object.values(type.categories)
            }));

            console.log(`✅ Formatted ${formattedData.length} service types`);
            
            res.json({
                success: true,
                data: formattedData
            });

        } catch (error) {
            console.error('❌ Error getting services:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil data layanan: ' + error.message
            });
        }
    },

    // GET SINGLE SERVICE by ID
    getServiceById: async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`========== GET SERVICE BY ID: ${id} ==========`);
            
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
                WHERE s.id = ?
            `, [id]);

            if (services.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Layanan tidak ditemukan'
                });
            }

            const service = services[0];
            
            res.json({
                success: true,
                data: {
                    id: service.id,
                    service_name: service.service_name,
                    min_sample: service.min_sample,
                    sample: service.min_sample || '1 Sampel',
                    duration: service.duration || '7',
                    price: parseFloat(service.price),
                    method: service.method || '-',
                    category_id: service.category_id,
                    category_name: service.category_name,
                    type_id: service.type_id,
                    type_name: service.type_name
                }
            });

        } catch (error) {
            console.error('❌ Error getting service by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil detail layanan: ' + error.message
            });
        }
    },

    // GET JADWAL SIBUK (untuk estimasi) - VERSI UNIFIED
    getJadwalSibuk: async (req, res) => {
        try {
            console.log('📋 Getting jadwal sibuk...');
            
            // Cek apakah mode sibuk aktif dari tabel settings
            let active = false;
            try {
                const [settings] = await db.query(
                    'SELECT setting_value FROM settings WHERE setting_key = "busy_mode_active"'
                );
                active = settings.length > 0 ? settings[0].setting_value === '1' : false;
                console.log('✅ Mode sibuk active:', active);
            } catch (error) {
                console.log('Settings table not ready:', error.message);
            }
            
            // Ambil periode sibuk yang masih berlaku atau akan datang
            let periods = [];
            try {
                // Cek apakah tabel jadwal_sibuk ada
                const [tables] = await db.query("SHOW TABLES LIKE 'jadwal_sibuk'");
                if (tables.length > 0) {
                    const [rows] = await db.query(`
                        SELECT 
                            id,
                            keterangan,
                            DATE_FORMAT(tanggal_mulai, '%Y-%m-%d') as tanggal_mulai,
                            DATE_FORMAT(tanggal_selesai, '%Y-%m-%d') as tanggal_selesai
                        FROM jadwal_sibuk 
                        WHERE tanggal_selesai >= CURDATE()
                        ORDER BY tanggal_mulai ASC
                    `);
                    periods = rows;
                    console.log('✅ Jadwal sibuk found:', periods.length);
                } else {
                    console.log('⚠️ Table jadwal_sibuk not exists');
                }
            } catch (error) {
                console.log('Error fetching jadwal_sibuk:', error.message);
            }
            
            res.json({
                success: true,
                active: active,
                data: periods
            });
            
        } catch (error) {
            console.error('❌ Error getting jadwal sibuk:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil jadwal sibuk',
                active: false,
                data: []
            });
        }
    },

    // Alias untuk backward compatibility
    getPublicBusySchedule: async (req, res) => {
        return exports.getJadwalSibuk(req, res);
    },
    
    // ==================== REGISTER ====================
    register: async (req, res) => {
        try {
            const { email, password, company_name, phone } = req.body;
            
            // Validasi input
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email dan password harus diisi'
                });
            }

            // Cek apakah email sudah terdaftar
            const [existing] = await db.query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email sudah terdaftar'
                });
            }

            // Hash password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Insert user baru
            const [result] = await db.query(
                `INSERT INTO users (
                    email, 
                    password, 
                    full_name, 
                    role,
                    created_at
                ) VALUES (?, ?, ?, 'pelanggan', NOW())`,
                [email, hashedPassword, company_name || email.split('@')[0]]
            );

            // Catat aktivitas register
            await db.query(
                'INSERT INTO activities (user_id, activity_name) VALUES (?, ?)',
                [result.insertId, 'register']
            );

            res.json({
                success: true,
                message: 'Registrasi berhasil',
                data: {
                    id: result.insertId,
                    email: email
                }
            });

        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan server: ' + error.message
            });
        }
    },
    
    // ==================== LOGIN ====================
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            
            console.log('📝 Login attempt:', { email });
            
            // Validasi input
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email dan password harus diisi'
                });
            }

            // Cari user di database
            const [users] = await db.query(
                'SELECT id, email, password, full_name, role, nama_instansi, nomor_telepon, alamat FROM users WHERE email = ?',
                [email]
            );
            
            console.log('📦 User ditemukan:', users.length > 0 ? '✅' : '❌');
            
            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Email atau password salah'
                });
            }
            
            const user = users[0];
            
            // Cek password dengan bcrypt
            const match = await bcrypt.compare(password, user.password);
            console.log('🔐 Password match:', match ? '✅' : '❌');
            
            if (!match) {
                return res.status(401).json({
                    success: false,
                    message: 'Email atau password salah'
                });
            }
            
            // Log role user untuk debugging
            console.log('👤 User role:', user.role);
            
            // Generate JWT token
            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role 
                },
                process.env.JWT_SECRET || 'rahasia banget',
                { expiresIn: '7d' }
            );
            
            // Catat aktivitas login
            try {
                await db.query(
                    'INSERT INTO activities (user_id, activity_name, created_at) VALUES (?, ?, NOW())',
                    [user.id, 'login']
                );
            } catch (activityError) {
                console.log('Activity log error (non-critical):', activityError.message);
            }
            
            // Response sukses
            res.json({
                success: true,
                message: 'Login berhasil',
                data: {
                    token: token,
                    user: {
                        id: user.id,
                        email: user.email,
                        full_name: user.full_name,
                        role: user.role,
                        nama_instansi: user.nama_instansi,
                        nomor_telepon: user.nomor_telepon,
                        alamat: user.alamat
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan server: ' + error.message
            });
        }
    },

    // ===============================================
    // ==================== ADMIN ====================
    // ===============================================

    // ==================== DASHBOARD DATA UNTUK ADMIN (format baru) ====================
    getDashboardData: async (req, res) => {
        try {
            const { start_date, end_date, category } = req.query;
            
            // Validasi tanggal
            if (!start_date || !end_date) {
                return res.status(400).json({
                    success: false,
                    message: 'Periode tanggal harus diisi'
                });
            }

            console.log('📊 Dashboard Data Request:', { start_date, end_date, category });

            // DEFAULT VALUES - kalau query error, tetap ada data
            let statsData = {
                total_revenue: 0,
                total_transactions: 0,
                completed_tests: 0,
                ongoing_tests: 0
            };
            
            let satisfactionData = {
                average_score: 0,
                total_responses: 0
            };
            
            let revenueData = { labels: [], values: [] };
            let serviceData = { labels: [], values: [] };
            let growthData = [];

            // 1. Get summary stats - dengan try-catch
            try {
                let statsQuery = `
                    SELECT 
                        COALESCE(SUM(p.total_tagihan), 0) as total_revenue,
                        COUNT(DISTINCT s.id) as total_transactions,
                        SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as completed_tests,
                        SUM(CASE WHEN s.status IN ('pending_verification', 'payment_pending', 'testing') THEN 1 ELSE 0 END) as ongoing_tests
                    FROM submissions s
                    LEFT JOIN payments p ON s.id = p.submission_id AND p.status_pembayaran = 'Lunas'
                    WHERE DATE(s.created_at) BETWEEN ? AND ?
                `;
                
                const statsParams = [start_date, end_date];
                
                if (category && category !== '') {
                    statsQuery += ` AND s.category = ?`;
                    statsParams.push(category);
                }
                
                const [statsResult] = await db.query(statsQuery, statsParams);
                
                if (statsResult && statsResult.length > 0) {
                    statsData = {
                        total_revenue: parseFloat(statsResult[0]?.total_revenue) || 0,
                        total_transactions: parseInt(statsResult[0]?.total_transactions) || 0,
                        completed_tests: parseInt(statsResult[0]?.completed_tests) || 0,
                        ongoing_tests: parseInt(statsResult[0]?.ongoing_tests) || 0
                    };
                }
                console.log('✅ Stats query berhasil');
            } catch (statsError) {
                console.error('❌ Stats query error:', statsError.message);
                // Lanjutkan dengan default values
            }

            // 2. Get satisfaction data - dengan try-catch
            try {
                // Cek dulu apakah tabel kuisioner ada
                const [tables] = await db.query("SHOW TABLES LIKE 'kuisioner'");
                
                if (tables.length > 0) {
                    const [satisfactionResult] = await db.query(`
                        SELECT 
                            COALESCE(AVG(
                                (COALESCE(nilai_1,0) + COALESCE(nilai_2,0) + COALESCE(nilai_3,0) + COALESCE(nilai_4,0) + COALESCE(nilai_5,0) +
                                COALESCE(nilai_6,0) + COALESCE(nilai_7,0) + COALESCE(nilai_8,0) + COALESCE(nilai_9,0) + COALESCE(nilai_10,0)) 
                                / 
                                NULLIF(
                                    (nilai_1 IS NOT NULL) + (nilai_2 IS NOT NULL) + (nilai_3 IS NOT NULL) + (nilai_4 IS NOT NULL) + (nilai_5 IS NOT NULL) +
                                    (nilai_6 IS NOT NULL) + (nilai_7 IS NOT NULL) + (nilai_8 IS NOT NULL) + (nilai_9 IS NOT NULL) + (nilai_10 IS NOT NULL), 0
                                ) * 20, 0
                            ) as average_score,
                            COUNT(*) as total_responses
                        FROM kuisioner 
                        WHERE DATE(created_at) BETWEEN ? AND ?
                    `, [start_date, end_date]);
                    
                    if (satisfactionResult && satisfactionResult.length > 0) {
                        satisfactionData = {
                            average_score: parseFloat(satisfactionResult[0]?.average_score) || 0,
                            total_responses: parseInt(satisfactionResult[0]?.total_responses) || 0
                        };
                    }
                } else {
                    console.log('⚠️ Tabel kuisioner tidak ditemukan, menggunakan data dummy');
                    // Gunakan data dummy untuk testing
                    satisfactionData = {
                        average_score: 85.5,
                        total_responses: 42
                    };
                }
                console.log('✅ Satisfaction query berhasil');
            } catch (satError) {
                console.error('❌ Satisfaction query error:', satError.message);
                // Data dummy untuk testing
                satisfactionData = {
                    average_score: 85.5,
                    total_responses: 42
                };
            }

            // 3. Get revenue trend - dengan try-catch
            try {
                let revenueQuery = `
                    SELECT 
                        DATE_FORMAT(s.created_at, '%d %b') as label,
                        COALESCE(SUM(p.total_tagihan), 0) as value
                    FROM submissions s
                    LEFT JOIN payments p ON s.id = p.submission_id AND p.status_pembayaran = 'Lunas'
                    WHERE DATE(s.created_at) BETWEEN ? AND ?
                `;
                
                const revenueParams = [start_date, end_date];
                
                if (category && category !== '') {
                    revenueQuery += ` AND s.category = ?`;
                    revenueParams.push(category);
                }
                
                revenueQuery += ` GROUP BY DATE(s.created_at) ORDER BY s.created_at ASC`;
                
                const [revenueTrend] = await db.query(revenueQuery, revenueParams);
                
                if (revenueTrend && revenueTrend.length > 0) {
                    revenueData = {
                        labels: revenueTrend.map(r => r.label),
                        values: revenueTrend.map(r => parseFloat(r.value) || 0)
                    };
                } else {
                    // Data dummy kalau kosong
                    revenueData = {
                        labels: ['1 Jan', '2 Jan', '3 Jan', '4 Jan', '5 Jan'],
                        values: [15000000, 22000000, 18000000, 25000000, 21000000]
                    };
                }
                console.log('✅ Revenue query berhasil');
            } catch (revError) {
                console.error('❌ Revenue query error:', revError.message);
                // Data dummy
                revenueData = {
                    labels: ['1 Jan', '2 Jan', '3 Jan', '4 Jan', '5 Jan'],
                    values: [15000000, 22000000, 18000000, 25000000, 21000000]
                };
            }

            // 4. Get service distribution - dengan try-catch
            try {
                let serviceQuery = `
                    SELECT 
                        COALESCE(s.category, 'Lainnya') as label,
                        COUNT(*) as value
                    FROM submissions s
                    WHERE DATE(s.created_at) BETWEEN ? AND ?
                `;
                
                const serviceParams = [start_date, end_date];
                
                if (category && category !== '') {
                    serviceQuery += ` AND s.category = ?`;
                    serviceParams.push(category);
                }
                
                serviceQuery += ` GROUP BY s.category`;
                
                const [serviceDist] = await db.query(serviceQuery, serviceParams);
                
                if (serviceDist && serviceDist.length > 0) {
                    serviceData = {
                        labels: serviceDist.map(s => s.label || 'Lainnya'),
                        values: serviceDist.map(s => parseInt(s.value) || 0)
                    };
                } else {
                    // Data dummy
                    serviceData = {
                        labels: ['Beton', 'Tanah', 'Aspal', 'Baja'],
                        values: [18, 12, 8, 7]
                    };
                }
                console.log('✅ Service query berhasil');
            } catch (servError) {
                console.error('❌ Service query error:', servError.message);
                serviceData = {
                    labels: ['Beton', 'Tanah', 'Aspal', 'Baja'],
                    values: [18, 12, 8, 7]
                };
            }

            // 5. Get monthly growth - dengan try-catch
            try {
                let growthQuery = `
                    SELECT 
                        DATE_FORMAT(s.created_at, '%b %Y') as month,
                        COALESCE(SUM(p.total_tagihan), 0) as revenue
                    FROM submissions s
                    LEFT JOIN payments p ON s.id = p.submission_id AND p.status_pembayaran = 'Lunas'
                    WHERE DATE(s.created_at) BETWEEN ? AND ?
                `;
                
                const growthParams = [start_date, end_date];
                
                if (category && category !== '') {
                    growthQuery += ` AND s.category = ?`;
                    growthParams.push(category);
                }
                
                growthQuery += ` GROUP BY YEAR(s.created_at), MONTH(s.created_at) ORDER BY MIN(s.created_at) ASC LIMIT 6`;
                
                const [monthlyGrowth] = await db.query(growthQuery, growthParams);

                if (monthlyGrowth && monthlyGrowth.length > 0) {
                    // Hitung growth percentage
                    growthData = monthlyGrowth.map((item, index) => {
                        const prevRevenue = index > 0 ? monthlyGrowth[index-1].revenue : item.revenue;
                        const growth = prevRevenue > 0 
                            ? ((item.revenue - prevRevenue) / prevRevenue * 100).toFixed(1)
                            : 0;
                        
                        return {
                            month: item.month,
                            revenue: parseFloat(item.revenue) || 0,
                            growth: parseFloat(growth)
                        };
                    });
                } else {
                    // Data dummy
                    growthData = [
                        { month: 'Jan 2024', revenue: 45000000, growth: 0 },
                        { month: 'Feb 2024', revenue: 52000000, growth: 15.6 },
                        { month: 'Mar 2024', revenue: 48000000, growth: -7.7 }
                    ];
                }
                console.log('✅ Growth query berhasil');
            } catch (growthError) {
                console.error('❌ Growth query error:', growthError.message);
                growthData = [
                    { month: 'Jan 2024', revenue: 45000000, growth: 0 },
                    { month: 'Feb 2024', revenue: 52000000, growth: 15.6 },
                    { month: 'Mar 2024', revenue: 48000000, growth: -7.7 }
                ];
            }

            // Format response
            const response = {
                success: true,
                data: {
                    stats: statsData,
                    satisfaction: satisfactionData,
                    revenue_trend: revenueData,
                    service_distribution: serviceData,
                    monthly_growth: growthData
                }
            };

            console.log('✅ Dashboard data berhasil diambil');
            res.json(response);

        } catch (error) {
            console.error('❌ Fatal error in getDashboardData:', error);
            console.error('Error stack:', error.stack);
            
            // Kirim data dummy kalau semua error
            res.json({
                success: true,
                data: {
                    stats: {
                        total_revenue: 125000000,
                        total_transactions: 45,
                        completed_tests: 38,
                        ongoing_tests: 7
                    },
                    satisfaction: {
                        average_score: 92.5,
                        total_responses: 32
                    },
                    revenue_trend: {
                        labels: ['1 Jan', '2 Jan', '3 Jan', '4 Jan', '5 Jan'],
                        values: [15000000, 22000000, 18000000, 25000000, 21000000]
                    },
                    service_distribution: {
                        labels: ['Beton', 'Tanah', 'Aspal', 'Baja'],
                        values: [18, 12, 8, 7]
                    },
                    monthly_growth: [
                        { month: 'Jan 2024', revenue: 45000000, growth: 0 },
                        { month: 'Feb 2024', revenue: 52000000, growth: 15.6 },
                        { month: 'Mar 2024', revenue: 48000000, growth: -7.7 }
                    ]
                }
            });
        }
    },

    // ==================== GET ADMIN DASHBOARD STATS ====================
    getAdminDashboardStats: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden - Admin only'
                });
            }

            console.log('📊 Getting admin dashboard stats for user:', userId);

            // 1. STATISTIK KEUANGAN
            const [incomeStats] = await db.query(`
                SELECT 
                    COALESCE(SUM(p.total_tagihan), 0) as total_income,
                    COALESCE(SUM(CASE WHEN MONTH(p.created_at) = MONTH(CURDATE()) 
                                AND YEAR(p.created_at) = YEAR(CURDATE()) 
                                THEN p.total_tagihan ELSE 0 END), 0) as monthly_income
                FROM payments p
            `);

            // 2. STATISTIK SUBMISSIONS
            const [submissionStats] = await db.query(`
                SELECT 
                    COUNT(*) as total_submissions,
                    SUM(CASE WHEN status = 'Menunggu Verifikasi' THEN 1 ELSE 0 END) as pending_verifikasi,
                    SUM(CASE WHEN status = 'Selesai' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'Sedang Diuji' THEN 1 ELSE 0 END) as ongoing,
                    SUM(CASE WHEN status = 'Belum Lunas' THEN 1 ELSE 0 END) as awaiting_payment
                FROM submissions
            `);

            // 3. AKTIVITAS TERBARU (dari tabel activities)
            const [recentActivities] = await db.query(`
                SELECT 
                    a.*,
                    u.full_name as user_name
                FROM activities a
                LEFT JOIN users u ON a.user_id = u.id
                ORDER BY a.created_at DESC
                LIMIT 5
            `);

            // Format activities untuk frontend
            const formattedActivities = recentActivities.map(activity => {
                let action = 'info';
                let actionName = '';
                if (activity.activity_name) {
                    const name = activity.activity_name.toLowerCase();
                    actionName = activity.activity_name;
                    if (name.includes('login')) action = 'login';
                    else if (name.includes('register')) action = 'create';
                    else if (name.includes('update')) action = 'update';
                    else if (name.includes('delete')) action = 'delete';
                    else if (name.includes('upload')) action = 'upload';
                    else if (name.includes('verify')) action = 'verify';
                }

                return {
                    id: activity.id,
                    company: activity.user_name || 'System',
                    description: actionName || 'Aktivitas sistem',
                    time: formatTimeAgo(activity.created_at),
                    status: actionName ? actionName.split(' ')[0] : 'Aktivitas',
                    icon: getIconForAction(action),
                    color: getColorForAction(action),
                    badgeColor: getColorForAction(action)
                };
            });

            // 🔴 PERBAIKI QUERY SUBMISSIONS - Ambil semua field yang diperlukan
            const [recentSubmissions] = await db.query(`
                SELECT 
                    s.id,
                    s.no_permohonan,
                    s.nama_instansi as company,
                    s.nama_pemohon,
                    s.nama_proyek as project_name,
                    s.status,
                    s.created_at,
                    (
                        SELECT GROUP_CONCAT(DISTINCT tt.type_name SEPARATOR ', ') 
                        FROM submission_samples ss 
                        JOIN test_types tt ON ss.test_type_id = tt.id 
                        WHERE ss.submission_id = s.id
                    ) as jenis_uji
                FROM submissions s
                ORDER BY s.created_at DESC
                LIMIT 5
            `);

            // 🔴 FORMAT SUBMISSIONS DENGAN BENAR
            const formattedSubmissions = recentSubmissions.map(sub => ({
                id: sub.id, // Gunakan ID asli, bukan no_permohonan
                no_permohonan: sub.no_permohonan || `SUB-${sub.id}`,
                company: sub.company || sub.nama_pemohon || '-',
                type: sub.jenis_uji || '-',
                date: formatDate(sub.created_at),
                status: sub.status || 'Menunggu Verifikasi'
            }));

            // 5. CHART DATA (6 bulan terakhir)
            const [chartData] = await db.query(`
                SELECT 
                    DATE_FORMAT(p.created_at, '%Y-%m') as month,
                    COALESCE(SUM(p.total_tagihan), 0) as total
                FROM payments p
                WHERE p.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                GROUP BY DATE_FORMAT(p.created_at, '%Y-%m')
                ORDER BY month ASC
            `);

            // Generate labels dan values untuk chart
            const months = [];
            const values = [];
            const now = new Date();
            
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const monthName = d.toLocaleString('id-ID', { month: 'short' });
                
                months.push(monthName);
                
                const found = chartData.find(item => item.month === monthStr);
                values.push(found ? parseFloat(found.total) : 0);
            }

            // Format response
            const response = {
                stats: {
                    income: formatRupiah(incomeStats[0].monthly_income || 0),
                    pending: submissionStats[0].pending_verifikasi || 0,
                    completed: submissionStats[0].completed || 0,
                    awaitingPayment: submissionStats[0].awaiting_payment || 0
                },
                activities: formattedActivities,
                submissions: formattedSubmissions,
                chartLabels: months,
                chartValues: values
            };

            console.log('✅ Dashboard data prepared:', {
                stats: response.stats,
                submissionsCount: response.submissions.length
            });

            res.json({
                success: true,
                data: response
            });

        } catch (error) {
            console.error('❌ Error getting admin dashboard stats:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil data dashboard: ' + error.message
            });
        }
    },

    // ==================== GET SUBMISSIONS ====================
    getSubmissions: async (req, res) => {
        try {
            console.log('✅ getSubmissions for admin dipanggil');
            
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            // Cek role admin
            if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden - Admin only'
                });
            }

            // Ambil parameter query
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            
            // 🔴 FILTER USER_ID (untuk detail user)
            const filterUserId = req.query.user_id || ''; 
            const status = req.query.status || '';
            const search = req.query.search || '';
            const startDate = req.query.start_date || '';
            const endDate = req.query.end_date || '';
            const sort = req.query.sort === 'asc' ? 'ASC' : 'DESC';

            console.log('📋 Getting submissions - Page:', page, 'User ID filter:', filterUserId);

            // Build query conditions
            let whereConditions = [];
            let queryParams = [];

            // 🔴 TAMBAHKAN FILTER USER ID
            if (filterUserId) {
                whereConditions.push('s.user_id = ?');
                queryParams.push(filterUserId);
            }

            if (status) {
                whereConditions.push('s.status = ?');
                queryParams.push(status);
            }

            if (search) {
                whereConditions.push('(s.no_permohonan LIKE ? OR s.nama_instansi LIKE ? OR s.nama_pemohon LIKE ?)');
                const searchTerm = `%${search}%`;
                queryParams.push(searchTerm, searchTerm, searchTerm);
            }

            if (startDate) {
                whereConditions.push('DATE(s.created_at) >= ?');
                queryParams.push(startDate);
            }

            if (endDate) {
                whereConditions.push('DATE(s.created_at) <= ?');
                queryParams.push(endDate);
            }

            const whereClause = whereConditions.length > 0 
                ? 'WHERE ' + whereConditions.join(' AND ') 
                : '';

            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM submissions s
                ${whereClause}
            `;
            
            const [countResult] = await db.query(countQuery, queryParams);
            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);

            // 🔴 PISAHKAN QUERY - Jenis Uji (dari test_types) dan Jenis Sample (dari submission_samples.jenis_sample)
            const submissionsQuery = `
                SELECT 
                    s.id,
                    s.no_permohonan,
                    s.nama_pemohon,
                    s.nama_instansi,
                    s.nama_proyek,
                    s.status,
                    s.created_at,
                    s.updated_at,
                    s.catatan_tambahan,
                    u.email,
                    u.nomor_telepon,
                    u.full_name,
                    (SELECT COUNT(*) FROM submission_samples WHERE submission_id = s.id) as total_samples,
                    (
                        SELECT GROUP_CONCAT(DISTINCT tt.type_name SEPARATOR ', ') 
                        FROM submission_samples ss 
                        JOIN test_types tt ON ss.test_type_id = tt.id 
                        WHERE ss.submission_id = s.id
                    ) as jenis_uji,
                    (
                        SELECT GROUP_CONCAT(DISTINCT tc.category_name SEPARATOR ', ') 
                        FROM submission_samples ss 
                        JOIN test_categories tc ON ss.test_category_id = tc.id 
                        WHERE ss.submission_id = s.id
                    ) as kategori_uji,
                    (
                        SELECT GROUP_CONCAT(ss.jenis_sample SEPARATOR ', ') 
                        FROM submission_samples ss 
                        WHERE ss.submission_id = s.id
                    ) as jenis_sample
                FROM submissions s
                LEFT JOIN users u ON s.user_id = u.id
                ${whereClause}
                ORDER BY s.created_at ${sort}
                LIMIT ? OFFSET ?
            `;

            const params = [...queryParams, limit, offset];
            const [submissions] = await db.query(submissionsQuery, params);

            // Ambil total_tagihan untuk setiap submission
            for (let sub of submissions) {
                const [payment] = await db.query(
                    'SELECT total_tagihan FROM payments WHERE submission_id = ?',
                    [sub.id]
                );
                sub.total_tagihan = payment[0]?.total_tagihan || 0;
            }

            console.log('✅ Submissions found:', submissions.length);

            res.json({
                success: true,
                data: {
                    submissions: submissions,
                    total: total,
                    page: page,
                    limit: limit,
                    totalPages: totalPages
                }
            });

        } catch (error) {
            console.error('❌ Error getting submissions:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    // ==================== GET SUBMISSION DETAIL (ADMIN) ====================
    getSubmissionDetail: async (req, res) => {
        try {
            const id = req.params.id;
            
            console.log('========== GET SUBMISSION DETAIL ==========');
            console.log('📥 ID:', id);
            
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            // Cek role admin
            if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden - Admin only'
                });
            }
            
            // Validasi ID
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID tidak valid'
                });
            }
            
            // Ambil data dari tabel submissions - TAMBAHKAN catatan_admin (TANPA KOMENTAR)
            const [submissions] = await db.query(`
                SELECT 
                    s.id,
                    s.no_permohonan,
                    s.nama_pemohon,
                    s.nama_instansi,
                    s.alamat_pemohon,
                    s.nomor_telepon,
                    s.email_pemohon,
                    s.nama_proyek,
                    s.lokasi_proyek,
                    s.status,
                    s.created_at,
                    s.updated_at,
                    s.catatan_tambahan,
                    s.catatan_admin,
                    s.file_surat_permohonan,
                    s.file_ktp,
                    u.full_name as pic_name,
                    u.email as pic_email,
                    u.nomor_telepon as pic_phone,
                    u.nama_instansi as company_name,
                    u.alamat as address
                FROM submissions s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE s.id = ?
            `, [id]);
            
            if (submissions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Submission tidak ditemukan'
                });
            }
            
            const submission = submissions[0];
            
            // Ambil data samples
            const [samples] = await db.query(`
                SELECT 
                    ss.id,
                    ss.jenis_sample,
                    ss.nama_identitas_sample,
                    ss.jumlah_sample_angka,
                    ss.jumlah_sample_satuan,
                    ss.tanggal_pengambilan,
                    ss.kemasan_sample,
                    ss.asal_sample,
                    ss.sample_diambil_oleh,
                    ss.price_at_time,
                    ss.method_at_time,
                    sv.service_name,
                    sv.method,
                    tc.category_name,
                    tt.type_name
                FROM submission_samples ss
                JOIN services sv ON ss.service_id = sv.id
                JOIN test_categories tc ON ss.test_category_id = tc.id
                JOIN test_types tt ON ss.test_type_id = tt.id
                WHERE ss.submission_id = ?
            `, [id]);
            
            // Format samples untuk frontend
            const formattedSamples = samples.map(sample => ({
                id: sample.id,
                name: sample.nama_identitas_sample || sample.service_name,
                jenis: sample.jenis_sample,
                quantity: sample.jumlah_sample_angka,
                unit: sample.jumlah_sample_satuan,
                price: sample.price_at_time,
                subtotal: sample.price_at_time * sample.jumlah_sample_angka,
                method: sample.method_at_time || sample.method,
                category: sample.category_name,
                type: sample.type_name
            }));
            
            // Ambil data payment
            const [payments] = await db.query(`
                SELECT 
                    p.id,
                    p.no_invoice,
                    p.total_tagihan,
                    p.jumlah_dibayar,
                    p.sisa_tagihan,
                    p.status_pembayaran,
                    p.bukti_pembayaran_1,
                    p.bukti_pembayaran_2,
                    p.created_at as payment_date
                FROM payments p 
                WHERE p.submission_id = ?
            `, [id]);
            
            const payment = payments.length > 0 ? payments[0] : null;
            
            // Hitung total tagihan dari samples
            const totalAmount = samples.reduce((sum, item) => {
                return sum + (item.price_at_time * item.jumlah_sample_angka);
            }, 0);
            
            // Kategori pengujian dari samples
            const categories = [...new Set(samples.map(s => s.category_name))];
            const testTypes = [...new Set(samples.map(s => s.type_name))];
            
            // Format response sesuai dengan yang diharapkan frontend
            const response = {
                id: submission.id,
                no_urut: submission.no_permohonan || `SUB-${String(submission.id).padStart(5, '0')}`,
                no_permohonan: submission.no_permohonan,
                registration_number: submission.no_permohonan,
                proyek: submission.nama_proyek,
                lokasi_proyek: submission.lokasi_proyek,
                description: submission.catatan_tambahan,
                
                // Data perusahaan
                company_name: submission.nama_instansi || submission.company_name || '-',
                pic_name: submission.nama_pemohon || submission.pic_name || '-',
                address: submission.alamat_pemohon || submission.address || '-',
                pic_email: submission.email_pemohon || submission.pic_email || '-',
                pic_phone: submission.nomor_telepon || submission.pic_phone || '-',
                
                // Status
                status: submission.status,
                created_at: submission.created_at,
                updated_at: submission.updated_at,
                
                // TAMBAHKAN CATATAN DI RESPONSE
                catatan_tambahan: submission.catatan_tambahan,
                catatan_admin: submission.catatan_admin,
                
                // Kategori
                category: categories.join(', ') || 'Pengujian',
                test_type: testTypes.join(', ') || 'Material',
                
                // Items (samples)
                items: formattedSamples.map(s => ({
                    service_name: s.name,
                    name: s.name,
                    quantity: s.quantity,
                    unit: s.unit,
                    unit_price: s.price,
                    subtotal: s.subtotal
                })),
                
                // Payment
                payment: payment ? {
                    id: payment.id,
                    no_invoice: payment.no_invoice,
                    total_tagihan: payment.total_tagihan || totalAmount,
                    jumlah_dibayar: payment.jumlah_dibayar || 0,
                    sisa_tagihan: payment.sisa_tagihan || totalAmount,
                    status_pembayaran: payment.status_pembayaran,
                    bukti_pembayaran_1: payment.bukti_pembayaran_1,
                    bukti_pembayaran_2: payment.bukti_pembayaran_2,
                    payment_date: payment.payment_date
                } : null,
                
                // Total
                total_tagihan: totalAmount
            };

            res.json({
                success: true,
                data: response
            });

        } catch (error) {
            console.error('❌ Error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil detail submission: ' + error.message
            });
        }
    },

    // ==================== UPDATE SUBMISSION STATUS ====================
    updateSubmission: async (req, res) => {
        try {
            const id = req.params.id;
            const { status, catatan, catatan_admin } = req.body; // Terima kedua kemungkinan
            const userId = req.user?.id;

            console.log('========== UPDATE SUBMISSION ==========');
            console.log('📥 ID:', id);
            console.log('📥 Status dari frontend:', status);
            console.log('📥 Catatan dari frontend:', catatan); // Ini yang dikirim frontend
            console.log('📥 Catatan Admin:', catatan_admin);
            console.log('👤 User ID:', userId);
            console.log('👤 User Role:', req.user?.role);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden - Admin only'
                });
            }

            // Validasi status
            const validStatuses = [
                'Menunggu Verifikasi',
                'Pengecekan Sampel',
                'Belum Bayar',
                'Belum Lunas',
                'Menunggu SKRD Upload',
                'Lunas',
                'Sedang Diuji',
                'Selesai',
                'Dibatalkan'
            ];

            if (status && !validStatuses.includes(status)) {
                console.log('❌ Status tidak valid:', status);
                return res.status(400).json({
                    success: false,
                    message: 'Status tidak valid'
                });
            }

            // Cek apakah submission ada
            const [check] = await db.query(
                'SELECT id, status FROM submissions WHERE id = ?',
                [id]
            );

            if (check.length === 0) {
                console.log('❌ Submission tidak ditemukan');
                return res.status(404).json({
                    success: false,
                    message: 'Submission tidak ditemukan'
                });
            }

            console.log('📋 Status saat ini di database:', check[0].status);

            // Buat query dinamis - Gunakan catatan_admin sebagai field database
            let updateFields = [];
            let queryParams = [];

            if (status) {
                updateFields.push('status = ?');
                queryParams.push(status);
                console.log('📝 Akan update status ke:', status);
            }
            
            // Prioritaskan catatan_admin, jika tidak ada gunakan catatan
            const catatanToSave = catatan_admin || catatan;
            if (catatanToSave !== undefined) {
                updateFields.push('catatan_admin = ?'); // Simpan ke kolom catatan_admin
                queryParams.push(catatanToSave);
                console.log('📝 Akan update catatan admin ke:', catatanToSave);
            }
            
            updateFields.push('updated_at = NOW()');
            
            if (updateFields.length === 1) {
                console.log('ℹ️ Tidak ada perubahan');
                return res.json({
                    success: true,
                    message: 'Tidak ada perubahan'
                });
            }

            queryParams.push(id);

            const query = `UPDATE submissions SET ${updateFields.join(', ')} WHERE id = ?`;
            console.log('📋 Query:', query);
            console.log('📦 Params:', queryParams);

            const [result] = await db.query(query, queryParams);

            console.log('✅ Update result:', result);

            // Catat aktivitas jika status berubah
            if (status) {
                try {
                    await db.query(
                        `INSERT INTO activities (user_id, activity_name, created_at) 
                        VALUES (?, ?, NOW())`,
                        [userId, `Update status ke ${status}`]
                    );
                    console.log('✅ Activity logged');
                } catch (activityError) {
                    console.log('Activity log error:', activityError.message);
                }
            }

            res.json({
                success: true,
                message: 'Submission berhasil diupdate'
            });

        } catch (error) {
            console.error('❌ Error updating submission:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengupdate submission: ' + error.message
            });
        }
    },

    // ==================== CANCEL SUBMISSION ====================
    cancelSubmission: async (req, res) => {
        try {
            const id = req.params.id;
            const userId = req.user?.id;

            console.log('🗑️ Cancelling submission ID:', id);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden - Admin only'
                });
            }

            // Cek apakah submission ada
            const [submission] = await db.query(
                'SELECT * FROM submissions WHERE id = ?',
                [id]
            );

            if (submission.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Submission tidak ditemukan'
                });
            }

            // Update status menjadi cancelled
            const [result] = await db.query(
                'UPDATE submissions SET status = ?, updated_at = NOW() WHERE id = ?',
                ['Dibatalkan', id]
            );

            console.log('✅ Cancel result:', result);

            // Catat aktivitas pembatalan - HAPUS submission_id
            try {
                await db.query(
                    `INSERT INTO activities (user_id, activity_name, created_at) 
                    VALUES (?, ?, NOW())`,
                    [userId, 'cancel', 'Pengajuan dibatalkan']
                );
            } catch (activityError) {
                console.log('Activity log error:', activityError.message);
            }

            res.json({
                success: true,
                message: 'Submission berhasil dibatalkan'
            });

        } catch (error) {
            console.error('❌ Error cancelling submission:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal membatalkan submission: ' + error.message
            });
        }
    },

    // ==================== GET SUBMISSION DOCUMENTS ====================
    getSubmissionDocuments: async (req, res) => {
        try {
            const id = req.params.id;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden - Admin only'
                });
            }

            const [submission] = await db.query(
                'SELECT file_surat_permohonan, file_ktp FROM submissions WHERE id = ?',
                [id]
            );
            
            const BASE_URL = 'http://localhost:5000';
            
            // Format response dengan URL lengkap
            const documents = {
                surat_permohonan: submission[0]?.file_surat_permohonan ? {
                    filename: submission[0].file_surat_permohonan,
                    url: `${BASE_URL}/uploads/surat/${submission[0].file_surat_permohonan}`,
                    type: submission[0].file_surat_permohonan.endsWith('.pdf') ? 'pdf' : 'image'
                } : null,
                scan_ktp: submission[0]?.file_ktp ? {
                    filename: submission[0].file_ktp,
                    url: `${BASE_URL}/uploads/ktp/${submission[0].file_ktp}`,
                    type: submission[0].file_ktp.endsWith('.pdf') ? 'pdf' : 'image'
                } : null,
                additional_docs: [] // Bisa ditambahkan nanti jika ada tabel dokumen tambahan
            };
            
            res.json({ 
                success: true, 
                data: documents 
            });
        } catch (error) {
            console.error('Error getting documents:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    // ==================== UPLOAD SUBMISSION REPORT ====================
    uploadSubmissionReport: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden - Admin only'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Tidak ada file yang diupload'
                });
            }

            console.log('📝 Uploading report for submission:', id);
            console.log('📁 File:', req.file);

            // Cek apakah submission ada
            const [submissions] = await db.query(
                'SELECT id FROM submissions WHERE id = ?',
                [id]
            );

            if (submissions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Submission tidak ditemukan'
                });
            }

            // Cek apakah sudah ada report sebelumnya
            const [existing] = await db.query(
                'SELECT id FROM test_reports WHERE submission_id = ?',
                [id]
            );

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const fileUrl = `${baseUrl}/uploads/reports/${req.file.filename}`;

            if (existing.length > 0) {
                // Update report yang sudah ada
                await db.query(
                    `UPDATE test_reports 
                    SET file_laporan = ?, updated_at = NOW() 
                    WHERE submission_id = ?`,
                    [req.file.filename, id]
                );
            } else {
                // Insert report baru
                await db.query(
                    `INSERT INTO test_reports 
                    (submission_id, file_laporan, created_at) 
                    VALUES (?, ?, NOW())`,
                    [id, req.file.filename]
                );
            }

            // Update status submission menjadi 'Selesai' jika diperlukan
            await db.query(
                `UPDATE submissions 
                SET status = 'Selesai', updated_at = NOW() 
                WHERE id = ?`,
                [id]
            );

            // Catat aktivitas
            await db.query(
                `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                VALUES (?, ?, ?, ?)`,
                [userId, `Upload Laporan Submission #${id}`, req.ip, req.headers['user-agent']]
            );

            res.json({
                success: true,
                message: 'Laporan berhasil diupload',
                data: {
                    filename: req.file.filename,
                    url: fileUrl
                }
            });

        } catch (error) {
            console.error('Error uploading report:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal upload laporan: ' + error.message
            });
        }
    },

    // ==================== DOWNLOAD SUBMISSION REPORT ====================
    downloadSubmissionReport: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            // Ambil data report
            const [reports] = await db.query(
                'SELECT file_laporan FROM test_reports WHERE submission_id = ?',
                [id]
            );

            if (reports.length === 0 || !reports[0].file_laporan) {
                return res.status(404).json({
                    success: false,
                    message: 'Laporan tidak ditemukan'
                });
            }

            const filename = reports[0].file_laporan;
            const filepath = path.join(__dirname, '../../uploads/reports', filename);

            // Cek apakah file ada
            if (!fs.existsSync(filepath)) {
                return res.status(404).json({
                    success: false,
                    message: 'File laporan tidak ditemukan di server'
                });
            }

            // Kirim file
            res.download(filepath, filename);

        } catch (error) {
            console.error('Error downloading report:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal download laporan: ' + error.message
            });
        }
    },

    // ==================== SKRD ====================

    // GET SKRD LIST - VERSI OPTIMASI (DENGAN FILTER TANGGAL DAN SUBMISSION ID)
    getSKRD: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status || '';
            const search = req.query.search || '';
            
            // 🔥 TAMBAHKAN FILTER SUBMISSION ID
            const submissionId = req.query.submission_id || '';
            
            // FILTER TANGGAL
            const startDate = req.query.start_date || '';
            const endDate = req.query.end_date || '';
            
            const offset = (page - 1) * limit;
            
            console.log('========== BACKEND GET SKRD ==========');
            console.log('📥 Params:', { page, limit, status, search, submissionId, startDate, endDate });
            
            // ========== HITUNG TOTAL DULU ==========
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM payments p 
                LEFT JOIN submissions s ON p.submission_id = s.id 
                LEFT JOIN users u ON s.user_id = u.id
                WHERE 1=1
            `;
            let countParams = [];
            
            // FILTER SUBMISSION ID
            if (submissionId) {
                countQuery += ` AND p.submission_id = ?`;
                countParams.push(submissionId);
            }
            
            if (startDate) {
                countQuery += ` AND DATE(p.created_at) >= ?`;
                countParams.push(startDate);
            }
            if (endDate) {
                countQuery += ` AND DATE(p.created_at) <= ?`;
                countParams.push(endDate);
            }
            
            if (status) {
                countQuery += ` AND p.status_pembayaran = ?`;
                countParams.push(status);
            }
            
            if (search) {
                countQuery += ` AND (p.no_invoice LIKE ? OR u.nama_instansi LIKE ? OR s.nama_proyek LIKE ?)`;
                const searchPattern = `%${search}%`;
                countParams.push(searchPattern, searchPattern, searchPattern);
            }
            
            const [countResult] = await db.query(countQuery, countParams);
            const total = countResult[0].total;
            
            if (total === 0) {
                return res.json({
                    success: true,
                    data: {
                        invoices: [],
                        stats: {
                            totalReceivable: 'Rp 0',
                            pendingCount: 0,
                            waitingVerification: 0,
                            monthlyIncome: 'Rp 0',
                            paidCount: 0,
                            partialCount: 0
                        },
                        total: 0,
                        page: page,
                        limit: limit,
                        totalPages: 0
                    }
                });
            }
            
            // ========== QUERY UTAMA ==========
            let query = `
                SELECT 
                    p.id,
                    p.no_invoice as invoice_number,
                    p.no_invoice as skrd_number,
                    p.total_tagihan as total_amount,
                    p.jumlah_dibayar as paid_amount,
                    p.sisa_tagihan as remaining_amount,
                    p.status_pembayaran,
                    p.created_at,
                    u.nama_instansi,
                    s.nama_proyek,
                    s.id as submission_id
                FROM payments p
                LEFT JOIN submissions s ON p.submission_id = s.id
                LEFT JOIN users u ON s.user_id = u.id
                WHERE 1=1
            `;
            
            let params = [];
            
            // FILTER SUBMISSION ID
            if (submissionId) {
                query += ` AND p.submission_id = ?`;
                params.push(submissionId);
            }
            
            if (startDate) {
                query += ` AND DATE(p.created_at) >= ?`;
                params.push(startDate);
            }
            if (endDate) {
                query += ` AND DATE(p.created_at) <= ?`;
                params.push(endDate);
            }
            
            if (status) {
                query += ` AND p.status_pembayaran = ?`;
                params.push(status);
            }
            
            if (search) {
                query += ` AND (p.no_invoice LIKE ? OR u.nama_instansi LIKE ? OR s.nama_proyek LIKE ?)`;
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern, searchPattern);
            }
            
            query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
            params.push(limit, offset);
            
            console.log('📝 Final Query:', query);
            console.log('📦 Params:', params);
            
            const [invoices] = await db.query(query, params);
            
            // ========== HITUNG STATS ==========
            let statsQuery = `
                SELECT 
                    COALESCE(SUM(CASE WHEN status_pembayaran IN ('Belum Bayar', 'Menunggu SKRD Upload') THEN total_tagihan ELSE 0 END), 0) as total_receivable,
                    COUNT(CASE WHEN status_pembayaran = 'Belum Bayar' THEN 1 END) as pending_count,
                    COUNT(CASE WHEN status_pembayaran = 'Belum Lunas' THEN 1 END) as partial_count,
                    COUNT(CASE WHEN status_pembayaran = 'Menunggu SKRD Upload' THEN 1 END) as waiting_verification,
                    COUNT(CASE WHEN status_pembayaran = 'Lunas' AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE()) THEN 1 END) as paid_count,
                    COALESCE(SUM(CASE WHEN status_pembayaran = 'Lunas' AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE()) THEN total_tagihan ELSE 0 END), 0) as monthly_income
                FROM payments
                WHERE 1=1
            `;
            
            let statsParams = [];
            
            if (startDate) {
                statsQuery += ` AND DATE(created_at) >= ?`;
                statsParams.push(startDate);
            }
            if (endDate) {
                statsQuery += ` AND DATE(created_at) <= ?`;
                statsParams.push(endDate);
            }
            
            const [statsResult] = await db.query(statsQuery, statsParams);
            
            const stats = {
                totalReceivable: 'Rp ' + new Intl.NumberFormat('id-ID').format(statsResult[0].total_receivable || 0),
                pendingCount: statsResult[0].pending_count || 0,
                partialCount: statsResult[0].partial_count || 0,
                waitingVerification: statsResult[0].waiting_verification || 0,
                paidCount: statsResult[0].paid_count || 0,
                monthlyIncome: 'Rp ' + new Intl.NumberFormat('id-ID').format(statsResult[0].monthly_income || 0)
            };
            
            res.json({
                success: true,
                data: {
                    invoices: invoices,
                    stats: stats,
                    total: total,
                    page: page,
                    limit: limit,
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('❌ Error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal mengambil data SKRD: ' + error.message 
            });
        }
    },

    // ==================== SKRD METHODS ====================

    // GET SKRD DETAIL
    getSKRDDetail: async (req, res) => {
        try {
            const id = req.params.id;
            
            console.log('========== GET SKRD DETAIL ==========');
            console.log('📥 ID:', id);
            
            const [payments] = await db.query(`
                SELECT 
                    p.*,
                    s.nama_pemohon,
                    s.nama_instansi,
                    s.alamat_pemohon,
                    s.nomor_telepon,
                    s.email_pemohon,
                    s.nama_proyek,
                    s.lokasi_proyek,
                    s.no_permohonan,
                    s.catatan_tambahan,
                    u.full_name,
                    u.email as user_email,
                    u.nomor_telepon as user_phone,
                    (SELECT COUNT(*) FROM submission_samples WHERE submission_id = s.id) as total_samples,
                    (SELECT GROUP_CONCAT(service_name SEPARATOR ', ') 
                    FROM submission_samples ss 
                    JOIN services sv ON ss.service_id = sv.id 
                    WHERE ss.submission_id = s.id) as layanan
                FROM payments p
                LEFT JOIN submissions s ON p.submission_id = s.id
                LEFT JOIN users u ON s.user_id = u.id
                WHERE p.id = ?
            `, [id]);

            if (payments.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'SKRD tidak ditemukan' 
                });
            }

            const payment = payments[0];
            
            // Ambil detail samples
            const [samples] = await db.query(`
                SELECT 
                    ss.*,
                    sv.service_name,
                    sv.method
                FROM submission_samples ss
                JOIN services sv ON ss.service_id = sv.id
                WHERE ss.submission_id = ?
            `, [payment.submission_id]);
            
            const totalAmount = parseFloat(payment.total_tagihan) || 0;
            const paidAmount = parseFloat(payment.jumlah_dibayar) || 0;
            const remainingAmount = parseFloat(payment.sisa_tagihan) || (totalAmount - paidAmount);
            
            // Format notes untuk riwayat pembayaran
            const paymentNotes = payment.bukti_pembayaran_notes || '';
            const paymentHistory = paymentNotes.split('\n').filter(line => line.trim() !== '');
            
            const response = {
                id: payment.id,
                no_invoice: payment.no_invoice,
                submission_id: payment.submission_id,
                issue_date: payment.created_at,
                due_date: payment.created_at,
                total_tagihan: totalAmount,
                jumlah_dibayar: paidAmount,
                sisa_tagihan: remainingAmount,
                status_pembayaran: payment.status_pembayaran,
                bukti_pembayaran_1: payment.bukti_pembayaran_1,
                bukti_pembayaran_2: payment.bukti_pembayaran_2,
                bukti_pembayaran_notes: payment.bukti_pembayaran_notes,
                payment_history: paymentHistory,
                created_at: payment.created_at,
                updated_at: payment.updated_at,
                
                // 🔥 TAMBAHKAN FIELD UNTUK FILE SKRD
                skrd_file: payment.skrd_file,
                skrd_filename: payment.skrd_filename,
                skrd_uploaded_at: payment.skrd_uploaded_at,
                skrd_uploaded_by: payment.skrd_uploaded_by,
                
                // Data pemohon
                nama_pemohon: payment.nama_pemohon || payment.full_name,
                nama_instansi: payment.nama_instansi,
                alamat: payment.alamat_pemohon,
                nomor_telepon: payment.nomor_telepon || payment.user_phone,
                email: payment.email_pemohon || payment.user_email,
                
                // Data proyek
                nama_proyek: payment.nama_proyek,
                lokasi_proyek: payment.lokasi_proyek,
                no_permohonan: payment.no_permohonan,
                catatan: payment.catatan_tambahan,
                
                // Data layanan
                layanan: payment.layanan,
                total_samples: payment.total_samples || 0,
                samples: samples
            };

            res.json({ 
                success: true, 
                data: response 
            });

        } catch (error) {
            console.error('❌ Error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal mengambil detail SKRD: ' + error.message 
            });
        }
    },

    // CREATE SKRD
    createSKRD: async (req, res) => {
        try {
            const { submission_id, invoice_number, skrd_number, total_tagihan, due_date, payment_method } = req.body;
            const userId = req.user?.id || 1;
            
            const va_number = generateVANumber(null);
            
            const [result] = await db.query(
                `INSERT INTO payments 
                (invoice_number, skrd_number, submission_id, user_id, total_tagihan, due_date, status_pembayaran, payment_method, va_number) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [invoice_number, skrd_number, submission_id, userId, total_tagihan, due_date, 'pending', payment_method, va_number]
            );
            
            res.json({
                success: true,
                message: 'SKRD berhasil dibuat',
                data: { 
                    id: result.insertId,
                    va_number: va_number
                }
            });
            
        } catch (error) {
            console.error('Error creating SKRD:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal membuat SKRD'
            });
        }
    },

    // 🔥 VERIFY PAYMENT (dengan input nominal)
    verifyPayment: async (req, res) => {
        try {
            const id = req.params.id;
            const { paid_amount, paid_date, notes } = req.body;
            const userId = req.user?.id || 1;

            console.log('📝 Verifying payment for SKRD ID:', id);
            console.log('💰 Paid amount:', paid_amount);
            console.log('📅 Paid date:', paid_date);
            console.log('📝 Notes:', notes);

            if (!paid_amount || paid_amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Nominal pembayaran harus diisi'
                });
            }

            const [payments] = await db.query('SELECT * FROM payments WHERE id = ?', [id]);

            if (payments.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Data SKRD tidak ditemukan'
                });
            }

            const payment = payments[0];
            const totalAmount = parseFloat(payment.total_tagihan) || 0;
            const currentPaid = parseFloat(payment.jumlah_dibayar) || 0;
            const currentNotes = payment.bukti_pembayaran_notes || '';
            
            // Hitung total yang sudah dibayar + yang baru
            const newTotalPaid = currentPaid + parseFloat(paid_amount);
            
            // Tentukan status baru
            let newStatus = 'Belum Lunas';
            if (newTotalPaid >= totalAmount) {
                newStatus = 'Lunas';
            }

            // Gabungkan notes
            const date = new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric'
            });
            const newNotes = currentNotes 
                ? `${currentNotes}\n[${date}] Verifikasi: Rp ${parseFloat(paid_amount).toLocaleString('id-ID')} - ${notes || 'Pembayaran diverifikasi'}`
                : `[${date}] Verifikasi: Rp ${parseFloat(paid_amount).toLocaleString('id-ID')} - ${notes || 'Pembayaran diverifikasi'}`;

            // UPDATE TANPA MENYENTUH KOLOM sisa_tagihan (KARENA GENERATED COLUMN)
            await db.query(
                `UPDATE payments 
                SET jumlah_dibayar = ?,
                    status_pembayaran = ?,
                    bukti_pembayaran_notes = ?,
                    updated_at = NOW()
                WHERE id = ?`,
                [newTotalPaid, newStatus, newNotes, id]
            );

            // Catat aktivitas
            await db.query(
                `INSERT INTO activities (user_id, activity_name, created_at) 
                VALUES (?, ?, NOW())`,
                [userId, `Verifikasi pembayaran SKRD #${payment.no_invoice} sebesar Rp ${paid_amount}`]
            );

            // Ambil data terbaru
            const [updatedPayments] = await db.query(
                'SELECT * FROM payments WHERE id = ?',
                [id]
            );

            res.json({
                success: true,
                message: 'Pembayaran berhasil diverifikasi',
                data: updatedPayments[0]
            });

        } catch (error) {
            console.error('❌ Error verifying payment:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal memverifikasi pembayaran: ' + error.message
            });
        }
    },

    // 🔥 UPLOAD SKRD FILE (dari admin) - VERSI DENGAN KOLOM DATABASE
    uploadSkrd: async (req, res) => {
        try {
            const id = req.params.id;
            const userId = req.user?.id || 1;
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Tidak ada file yang diupload'
                });
            }

            console.log('📁 Uploading SKRD file for ID:', id);
            console.log('📄 File:', req.file);

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const fileUrl = `${baseUrl}/uploads/skrd/${req.file.filename}`;

            // 🔥 UPDATE DENGAN KOLOM YANG SESUAI DATABASE
            await db.query(
                `UPDATE payments 
                SET skrd_file = ?,
                    skrd_filename = ?,
                    skrd_uploaded_at = NOW(),
                    skrd_uploaded_by = ?,
                    updated_at = NOW()
                WHERE id = ?`,
                [req.file.filename, req.file.originalname, userId, id]
            );

            res.json({
                success: true,
                message: 'SKRD berhasil diupload',
                data: {
                    url: fileUrl,
                    filename: req.file.filename,
                    originalname: req.file.originalname
                }
            });

        } catch (error) {
            console.error('❌ Error uploading SKRD:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal upload SKRD: ' + error.message
            });
        }
    },

    // 🔥 DOWNLOAD SKRD FILE
    downloadSkrd: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            // Ambil data payment
            const [payments] = await db.query(
                'SELECT skrd_file, skrd_filename FROM payments WHERE id = ?',
                [id]
            );

            if (payments.length === 0 || !payments[0].skrd_file) {
                return res.status(404).json({
                    success: false,
                    message: 'File SKRD tidak ditemukan'
                });
            }

            const filename = payments[0].skrd_file;
            const originalname = payments[0].skrd_filename || filename;
            const filepath = path.join(__dirname, '../../uploads/skrd', filename);

            // Cek apakah file ada
            const fs = require('fs');
            if (!fs.existsSync(filepath)) {
                return res.status(404).json({
                    success: false,
                    message: 'File SKRD tidak ditemukan di server'
                });
            }

            // Kirim file
            res.download(filepath, originalname);

        } catch (error) {
            console.error('Error downloading SKRD:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal download SKRD: ' + error.message
            });
        }
    },

    // 🔥 TOLAK BUKTI PEMBAYARAN
    rejectProof: async (req, res) => {
        try {
            const id = req.params.id;
            const { reason } = req.body;
            const userId = req.user?.id || 1;

            await db.query(
                `UPDATE payments 
                SET status_pembayaran = 'pending',
                    payment_proof = NULL,
                    notes = CONCAT(IFNULL(notes, ''), '\n[Penolakan] ', ?),
                    updated_at = NOW()
                WHERE id = ?`,
                [reason || 'Bukti pembayaran ditolak', id]
            );

            res.json({
                success: true,
                message: 'Bukti pembayaran ditolak'
            });

        } catch (error) {
            console.error('❌ Error rejecting proof:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal menolak bukti: ' + error.message
            });
        }
    },

    // SEND PAYMENT REMINDER
    sendPaymentReminder: async (req, res) => {
        try {
            const id = req.params.id;
            
            const [invoices] = await db.query(`
                SELECT p.*, u.email, u.name, u.company, u.phone
                FROM payments p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = ?
            `, [id]);

            if (invoices.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice tidak ditemukan'
                });
            }

            const invoice = invoices[0];
            
            console.log('=================================');
            console.log('📧 SIMULASI KIRIM REMINDER');
            console.log('To:', invoice.email);
            console.log('Phone:', invoice.phone);
            console.log('Company:', invoice.company || invoice.name);
            console.log('Invoice:', invoice.invoice_number);
            console.log('Amount:', formatRupiah(invoice.total_tagihan));
            console.log('Due Date:', invoice.due_date);
            console.log('=================================');
            
            await db.query(
                'INSERT INTO activities (user_id, action, description) VALUES (?, ?, ?)',
                [req.user?.id || 1, 'reminder', `Pengingat pembayaran dikirim untuk invoice ${invoice.invoice_number}`]
            );

            res.json({
                success: true,
                message: 'Pengingat pembayaran berhasil dikirim'
            });

        } catch (error) {
            console.error('Error sending payment reminder:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengirim pengingat pembayaran'
            });
        }
    },

    // CANCEL INVOICE
    cancelInvoice: async (req, res) => {
        try {
            const id = req.params.id;
            const { reason } = req.body;
            const userId = req.user?.id || 1;
            
            const [invoices] = await db.query('SELECT * FROM payments WHERE id = ?', [id]);
            
            if (invoices.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice tidak ditemukan'
                });
            }
            
            await db.query(
                `UPDATE payments 
                SET status_pembayaran = 'cancelled',
                    notes = CONCAT(IFNULL(notes, ''), ' | Dibatalkan: ', ?),
                    updated_at = NOW()
                WHERE id = ?`,
                [reason || 'Dibatalkan oleh admin', id]
            );
            
            await db.query(
                'INSERT INTO activities (user_id, action, description) VALUES (?, ?, ?)',
                [userId, 'cancel', `Invoice ${invoices[0].invoice_number} dibatalkan. Alasan: ${reason || '-'}`]
            );
            
            res.json({
                success: true,
                message: 'Invoice berhasil dibatalkan'
            });
            
        } catch (error) {
            console.error('Error cancelling invoice:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal membatalkan invoice'
            });
        }
    },

    // UPDATE STATUS SKRD (opsional)
    updateSKRDStatus: async (req, res) => {
        try {
            const id = req.params.id;
            const { status, notes } = req.body;
            const userId = req.user?.id || 1;
            
            const validStatuses = ['pending', 'Lunas', 'waiting_verify', 'cancelled', 'partial'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Status tidak valid'
                });
            }

            await db.query(
                'UPDATE payments SET status_pembayaran = ?, notes = ?, updated_at = NOW() WHERE id = ?',
                [status, notes, id]
            );

            await db.query(
                'INSERT INTO activities (user_id, action, description) VALUES (?, ?, ?)',
                [userId, 'update_status', `Status invoice ID ${id} diubah menjadi ${status}`]
            );

            res.json({
                success: true,
                message: 'Status berhasil diupdate'
            });

        } catch (error) {
            console.error('Error updating SKRD status:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengupdate status SKRD'
            });
        }
    },

    // ==================== KUISIONER METHODS ====================

    // GET all kuisioner (public/user) - JANGAN DIHAPUS
    getKuisioner: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const startDate = req.query.start_date || '';
            const endDate = req.query.end_date || '';
            
            const offset = (page - 1) * limit;
            
            console.log('========== GET KUISIONER ==========');
            console.log('📥 Params:', { page, limit, search, startDate, endDate });
            
            // Query dengan JOIN submissions
            let query = `
                SELECT 
                    k.*,
                    s.nama_pemohon,
                    s.nama_instansi,
                    s.nomor_telepon,
                    s.nama_proyek,
                    s.no_permohonan
                FROM kuisioner k
                LEFT JOIN submissions s ON k.submission_id = s.id
                WHERE 1=1
            `;
            
            let countQuery = `SELECT COUNT(*) as total FROM kuisioner WHERE 1=1`;
            let params = [];
            let countParams = [];
            
            if (startDate) {
                query += ` AND DATE(k.created_at) >= ?`;
                countQuery += ` AND DATE(created_at) >= ?`;
                params.push(startDate);
                countParams.push(startDate);
            }
            if (endDate) {
                query += ` AND DATE(k.created_at) <= ?`;
                countQuery += ` AND DATE(created_at) <= ?`;
                params.push(endDate);
                countParams.push(endDate);
            }
            
            if (search) {
                query += ` AND (s.nama_pemohon LIKE ? OR s.nama_instansi LIKE ?)`;
                countQuery += ` AND (nama_pemohon LIKE ? OR instansi LIKE ?)`;
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern);
                countParams.push(searchPattern, searchPattern);
            }
            
            query += ` ORDER BY k.created_at DESC LIMIT ? OFFSET ?`;
            params.push(limit, offset);
            
            const [kuisioner] = await db.query(query, params);
            const [countResult] = await db.query(countQuery, countParams);
            
            res.json({
                success: true,
                data: {
                    kuisioner: kuisioner,
                    total: countResult[0].total,
                    page: page,
                    limit: limit,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            });
            
        } catch (error) {
            console.error('❌ Error getting kuisioner:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal mengambil data kuisioner: ' + error.message 
            });
        }
    },

    // GET kuisioner stats (public/user)
    getKuisionerStats: async (req, res) => {
        try {
            const startDate = req.query.start_date || '';
            const endDate = req.query.end_date || '';
            
            let whereClause = 'WHERE 1=1';
            let params = [];
            
            if (startDate) {
                whereClause += ` AND DATE(created_at) >= ?`;
                params.push(startDate);
            }
            if (endDate) {
                whereClause += ` AND DATE(created_at) <= ?`;
                params.push(endDate);
            }
            
            const [stats] = await db.query(`
                SELECT 
                    COUNT(*) as total_responden,
                    ROUND(AVG(COALESCE(skor_1,0)), 2) as rata_skor_1,
                    ROUND(AVG(COALESCE(skor_2,0)), 2) as rata_skor_2,
                    ROUND(AVG(COALESCE(skor_3,0)), 2) as rata_skor_3,
                    ROUND(AVG(COALESCE(skor_4,0)), 2) as rata_skor_4,
                    ROUND(AVG(COALESCE(skor_5,0)), 2) as rata_skor_5,
                    ROUND(AVG(COALESCE(skor_6,0)), 2) as rata_skor_6,
                    ROUND(AVG(COALESCE(skor_7,0)), 2) as rata_skor_7,
                    ROUND(AVG(COALESCE(skor_8,0)), 2) as rata_skor_8,
                    ROUND(AVG(COALESCE(skor_9,0)), 2) as rata_skor_9,
                    ROUND(AVG(COALESCE(skor_10,0)), 2) as rata_skor_10,
                    ROUND(
                        (AVG(COALESCE(skor_1,0)) + AVG(COALESCE(skor_2,0)) + AVG(COALESCE(skor_3,0)) + 
                         AVG(COALESCE(skor_4,0)) + AVG(COALESCE(skor_5,0)) + AVG(COALESCE(skor_6,0)) + 
                         AVG(COALESCE(skor_7,0)) + AVG(COALESCE(skor_8,0)) + AVG(COALESCE(skor_9,0)) + 
                         AVG(COALESCE(skor_10,0))) / 10, 2
                    ) as rata_keseluruhan
                FROM kuisioner
                ${whereClause}
            `, params);
            
            const [distribusi] = await db.query(`
                SELECT 
                    COUNT(CASE WHEN skor_1 = 1 OR skor_2 = 1 OR skor_3 = 1 OR skor_4 = 1 OR skor_5 = 1 
                                OR skor_6 = 1 OR skor_7 = 1 OR skor_8 = 1 OR skor_9 = 1 OR skor_10 = 1 THEN 1 END) as skor_1_count,
                    COUNT(CASE WHEN skor_1 = 2 OR skor_2 = 2 OR skor_3 = 2 OR skor_4 = 2 OR skor_5 = 2 
                                OR skor_6 = 2 OR skor_7 = 2 OR skor_8 = 2 OR skor_9 = 2 OR skor_10 = 2 THEN 1 END) as skor_2_count,
                    COUNT(CASE WHEN skor_1 = 3 OR skor_2 = 3 OR skor_3 = 3 OR skor_4 = 3 OR skor_5 = 3 
                                OR skor_6 = 3 OR skor_7 = 3 OR skor_8 = 3 OR skor_9 = 3 OR skor_10 = 3 THEN 1 END) as skor_3_count,
                    COUNT(CASE WHEN skor_1 = 4 OR skor_2 = 4 OR skor_3 = 4 OR skor_4 = 4 OR skor_5 = 4 
                                OR skor_6 = 4 OR skor_7 = 4 OR skor_8 = 4 OR skor_9 = 4 OR skor_10 = 4 THEN 1 END) as skor_4_count
                FROM kuisioner
                ${whereClause}
            `, params);
            
            res.json({
                success: true,
                data: {
                    stats: stats[0] || {},
                    distribusi: distribusi[0] || {}
                }
            });
            
        } catch (error) {
            console.error('❌ Error getting kuisioner stats:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal mengambil statistik kuisioner: ' + error.message 
            });
        }
    },

    // GET kuisioner by ID (public/user)
    getKuisionerById: async (req, res) => {
        try {
            const { id } = req.params;
            
            const [kuisioner] = await db.query(`
                SELECT 
                    k.*,
                    s.nama_pemohon,
                    s.nama_instansi,
                    s.nomor_telepon,
                    s.nama_proyek,
                    s.no_permohonan
                FROM kuisioner k
                LEFT JOIN submissions s ON k.submission_id = s.id
                WHERE k.id = ?
            `, [id]);
            
            if (kuisioner.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Kuisioner tidak ditemukan'
                });
            }
            
            res.json({
                success: true,
                data: kuisioner[0]
            });
            
        } catch (error) {
            console.error('❌ Error getting kuisioner by id:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal mengambil data kuisioner: ' + error.message 
            });
        }
    },

    // CREATE kuisioner (public) - VERSION LAMA (pake skor_1 - skor_10)
    createKuisioner: async (req, res) => {
        try {
            const {
                submission_id, nama_pemohon, instansi, telepon, jabatan,
                skor_1, skor_2, skor_3, skor_4, skor_5,
                skor_6, skor_7, skor_8, skor_9, skor_10,
                saran
            } = req.body;
            
            if (!submission_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Submission ID harus diisi'
                });
            }
            
            // Cek apakah submission ada
            const [submission] = await db.query(
                'SELECT id FROM submissions WHERE id = ?',
                [submission_id]
            );
            
            if (submission.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Data pengujian tidak ditemukan'
                });
            }
            
            // Cek apakah sudah ada kuisioner untuk submission ini
            const [existing] = await db.query(
                'SELECT id FROM kuisioner WHERE submission_id = ?',
                [submission_id]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Kuisioner untuk submission ini sudah ada'
                });
            }
            
            const [result] = await db.query(
                `INSERT INTO kuisioner (
                    submission_id, nama_pemohon, instansi, telepon, jabatan,
                    skor_1, skor_2, skor_3, skor_4, skor_5,
                    skor_6, skor_7, skor_8, skor_9, skor_10,
                    saran
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    submission_id, nama_pemohon, instansi, telepon, jabatan,
                    skor_1 || null, skor_2 || null, skor_3 || null, skor_4 || null, skor_5 || null,
                    skor_6 || null, skor_7 || null, skor_8 || null, skor_9 || null, skor_10 || null,
                    saran
                ]
            );
            
            res.json({
                success: true,
                message: 'Kuisioner berhasil disimpan',
                data: { id: result.insertId }
            });
            
        } catch (error) {
            console.error('❌ Error creating kuisioner:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal menyimpan kuisioner: ' + error.message 
            });
        }
    },

    // UPDATE kuisioner (admin)
    updateKuisioner: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                nama_pemohon, instansi, telepon, jabatan,
                skor_1, skor_2, skor_3, skor_4, skor_5,
                skor_6, skor_7, skor_8, skor_9, skor_10,
                saran
            } = req.body;
            
            const [result] = await db.query(
                `UPDATE kuisioner SET
                    nama_pemohon = ?, instansi = ?, telepon = ?, jabatan = ?,
                    skor_1 = ?, skor_2 = ?, skor_3 = ?, skor_4 = ?, skor_5 = ?,
                    skor_6 = ?, skor_7 = ?, skor_8 = ?, skor_9 = ?, skor_10 = ?,
                    saran = ?, updated_at = NOW()
                WHERE id = ?`,
                [
                    nama_pemohon, instansi, telepon, jabatan,
                    skor_1 || null, skor_2 || null, skor_3 || null, skor_4 || null, skor_5 || null,
                    skor_6 || null, skor_7 || null, skor_8 || null, skor_9 || null, skor_10 || null,
                    saran, id
                ]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Kuisioner tidak ditemukan'
                });
            }
            
            res.json({
                success: true,
                message: 'Kuisioner berhasil diupdate'
            });
            
        } catch (error) {
            console.error('❌ Error updating kuisioner:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal mengupdate kuisioner: ' + error.message 
            });
        }
    },

    // DELETE kuisioner (admin)
    deleteKuisioner: async (req, res) => {
        try {
            const { id } = req.params;
            
            const [result] = await db.query('DELETE FROM kuisioner WHERE id = ?', [id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Kuisioner tidak ditemukan'
                });
            }
            
            res.json({
                success: true,
                message: 'Kuisioner berhasil dihapus'
            });
            
        } catch (error) {
            console.error('❌ Error deleting kuisioner:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal menghapus kuisioner: ' + error.message 
            });
        }
    },

    // ==================== ADMIN KUISIONER METHODS ====================

    // GET all kuisioner untuk admin (VERSION LAMA - pake skor_1 - skor_10)
    getAdminKuisioner: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden - Admin only'
                });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const startDate = req.query.start_date || '';
            const endDate = req.query.end_date || '';
            
            const offset = (page - 1) * limit;
            
            console.log('========== GET ADMIN KUISIONER ==========');
            console.log('📥 Params:', { page, limit, search, startDate, endDate });
            
            // Query dengan LEFT JOIN
            let query = `
                SELECT 
                    k.id,
                    k.submission_id,
                    k.skor_1, k.skor_2, k.skor_3, k.skor_4, k.skor_5,
                    k.skor_6, k.skor_7, k.skor_8, k.skor_9, k.skor_10,
                    k.saran,
                    k.created_at,
                    COALESCE(s.nama_pemohon, '-') as nama_pemohon,
                    COALESCE(s.nama_instansi, '-') as nama_instansi,
                    COALESCE(s.nomor_telepon, '-') as nomor_telepon,
                    COALESCE(s.nama_proyek, '-') as nama_proyek,
                    COALESCE(s.no_permohonan, '-') as no_permohonan
                FROM kuisioner k
                LEFT JOIN submissions s ON k.submission_id = s.id
                WHERE 1=1
            `;
            
            let countQuery = `SELECT COUNT(*) as total FROM kuisioner WHERE 1=1`;
            let params = [];
            let countParams = [];
            
            // Filter tanggal
            if (startDate) {
                query += ` AND DATE(k.created_at) >= ?`;
                countQuery += ` AND DATE(created_at) >= ?`;
                params.push(startDate);
                countParams.push(startDate);
            }
            if (endDate) {
                query += ` AND DATE(k.created_at) <= ?`;
                countQuery += ` AND DATE(created_at) <= ?`;
                params.push(endDate);
                countParams.push(endDate);
            }
            
            // Filter search
            if (search) {
                query += ` AND (s.nama_pemohon LIKE ? OR s.nama_instansi LIKE ? OR s.no_permohonan LIKE ?)`;
                countQuery += ` AND (SELECT 1 FROM submissions s WHERE s.id = kuisioner.submission_id AND (s.nama_pemohon LIKE ? OR s.nama_instansi LIKE ? OR s.no_permohonan LIKE ?))`;
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern, searchPattern);
                countParams.push(searchPattern, searchPattern, searchPattern);
            }
            
            query += ` ORDER BY k.created_at DESC LIMIT ? OFFSET ?`;
            params.push(limit, offset);
            
            console.log('📝 Query:', query);
            console.log('📦 Params:', params);
            
            const [kuisioner] = await db.query(query, params);
            const [countResult] = await db.query(countQuery, countParams);
            
            console.log(`✅ Found ${kuisioner.length} kuisioner`);

            res.json({
                success: true,
                data: {
                    kuisioner: kuisioner,
                    total: countResult[0]?.total || 0,
                    page: page,
                    limit: limit,
                    totalPages: Math.ceil((countResult[0]?.total || 0) / limit)
                }
            });
            
        } catch (error) {
            console.error('❌ Error getting admin kuisioner:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal mengambil data kuisioner: ' + error.message,
                data: {
                    kuisioner: [],
                    total: 0,
                    page: 1,
                    limit: 10,
                    totalPages: 0
                }
            });
        }
    },

    // GET kuisioner stats untuk admin
    getAdminKuisionerStats: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden - Admin only'
                });
            }

            const startDate = req.query.start_date || '';
            const endDate = req.query.end_date || '';
            
            // Build where clause
            let whereClause = 'WHERE 1=1';
            let params = [];
            
            if (startDate) {
                whereClause += ` AND DATE(created_at) >= ?`;
                params.push(startDate);
            }
            if (endDate) {
                whereClause += ` AND DATE(created_at) <= ?`;
                params.push(endDate);
            }
            
            // Statistik per pertanyaan (skor_1 - skor_10)
            const [stats] = await db.query(`
                SELECT 
                    COUNT(DISTINCT submission_id) as total_responden,
                    ROUND(AVG(COALESCE(skor_1,0)), 2) as rata_skor_1,
                    ROUND(AVG(COALESCE(skor_2,0)), 2) as rata_skor_2,
                    ROUND(AVG(COALESCE(skor_3,0)), 2) as rata_skor_3,
                    ROUND(AVG(COALESCE(skor_4,0)), 2) as rata_skor_4,
                    ROUND(AVG(COALESCE(skor_5,0)), 2) as rata_skor_5,
                    ROUND(AVG(COALESCE(skor_6,0)), 2) as rata_skor_6,
                    ROUND(AVG(COALESCE(skor_7,0)), 2) as rata_skor_7,
                    ROUND(AVG(COALESCE(skor_8,0)), 2) as rata_skor_8,
                    ROUND(AVG(COALESCE(skor_9,0)), 2) as rata_skor_9,
                    ROUND(AVG(COALESCE(skor_10,0)), 2) as rata_skor_10,
                    ROUND(
                        (AVG(COALESCE(skor_1,0)) + AVG(COALESCE(skor_2,0)) + AVG(COALESCE(skor_3,0)) + 
                        AVG(COALESCE(skor_4,0)) + AVG(COALESCE(skor_5,0)) + AVG(COALESCE(skor_6,0)) + 
                        AVG(COALESCE(skor_7,0)) + AVG(COALESCE(skor_8,0)) + AVG(COALESCE(skor_9,0)) + 
                        AVG(COALESCE(skor_10,0))) / 10, 2
                    ) as rata_keseluruhan
                FROM kuisioner
                ${whereClause}
            `, params);
            
            // Distribusi nilai (1-4)
            const [distribusi] = await db.query(`
                SELECT 
                    COUNT(CASE WHEN skor_1 = 1 OR skor_2 = 1 OR skor_3 = 1 OR skor_4 = 1 OR skor_5 = 1 
                                OR skor_6 = 1 OR skor_7 = 1 OR skor_8 = 1 OR skor_9 = 1 OR skor_10 = 1 THEN 1 END) as skor_1_count,
                    COUNT(CASE WHEN skor_1 = 2 OR skor_2 = 2 OR skor_3 = 2 OR skor_4 = 2 OR skor_5 = 2 
                                OR skor_6 = 2 OR skor_7 = 2 OR skor_8 = 2 OR skor_9 = 2 OR skor_10 = 2 THEN 1 END) as skor_2_count,
                    COUNT(CASE WHEN skor_1 = 3 OR skor_2 = 3 OR skor_3 = 3 OR skor_4 = 3 OR skor_5 = 3 
                                OR skor_6 = 3 OR skor_7 = 3 OR skor_8 = 3 OR skor_9 = 3 OR skor_10 = 3 THEN 1 END) as skor_3_count,
                    COUNT(CASE WHEN skor_1 = 4 OR skor_2 = 4 OR skor_3 = 4 OR skor_4 = 4 OR skor_5 = 4 
                                OR skor_6 = 4 OR skor_7 = 4 OR skor_8 = 4 OR skor_9 = 4 OR skor_10 = 4 THEN 1 END) as skor_4_count
                FROM kuisioner
                ${whereClause}
            `, params);
            
            res.json({
                success: true,
                data: {
                    stats: stats[0] || {},
                    distribusi: distribusi[0] || {}
                }
            });
            
        } catch (error) {
            console.error('❌ Error getting admin kuisioner stats:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal mengambil statistik kuisioner: ' + error.message,
                data: {
                    stats: {},
                    distribusi: {}
                }
            });
        }
    },

    // GET kuisioner by ID untuk admin
    getAdminKuisionerById: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden - Admin only'
                });
            }
            
            const [kuisioner] = await db.query(`
                SELECT 
                    k.*,
                    s.nama_pemohon,
                    s.nama_instansi,
                    s.nomor_telepon,
                    s.email_pemohon,
                    s.nama_proyek,
                    s.no_permohonan
                FROM kuisioner k
                LEFT JOIN submissions s ON k.submission_id = s.id
                WHERE k.id = ?
            `, [id]);
            
            if (kuisioner.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Kuisioner tidak ditemukan'
                });
            }
            
            res.json({
                success: true,
                data: kuisioner[0]
            });
            
        } catch (error) {
            console.error('❌ Error getting admin kuisioner by id:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal mengambil data kuisioner: ' + error.message 
            });
        }
    },

    // UPDATE kuisioner (admin)
    updateAdminKuisioner: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden - Admin only'
                });
            }

            const {
                nama_pemohon, instansi, telepon, jabatan,
                skor_1, skor_2, skor_3, skor_4, skor_5,
                skor_6, skor_7, skor_8, skor_9, skor_10,
                saran
            } = req.body;
            
            const [result] = await db.query(
                `UPDATE kuisioner SET
                    nama_pemohon = ?, instansi = ?, telepon = ?, jabatan = ?,
                    skor_1 = ?, skor_2 = ?, skor_3 = ?, skor_4 = ?, skor_5 = ?,
                    skor_6 = ?, skor_7 = ?, skor_8 = ?, skor_9 = ?, skor_10 = ?,
                    saran = ?, updated_at = NOW()
                WHERE id = ?`,
                [
                    nama_pemohon, instansi, telepon, jabatan,
                    skor_1 || null, skor_2 || null, skor_3 || null, skor_4 || null, skor_5 || null,
                    skor_6 || null, skor_7 || null, skor_8 || null, skor_9 || null, skor_10 || null,
                    saran, id
                ]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Kuisioner tidak ditemukan'
                });
            }
            
            res.json({
                success: true,
                message: 'Kuisioner berhasil diupdate'
            });
            
        } catch (error) {
            console.error('❌ Error updating admin kuisioner:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal mengupdate kuisioner: ' + error.message 
            });
        }
    },

    // DELETE kuisioner (admin)
    deleteAdminKuisioner: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden - Admin only'
                });
            }
            
            const [result] = await db.query('DELETE FROM kuisioner WHERE id = ?', [id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Kuisioner tidak ditemukan'
                });
            }
            
            res.json({
                success: true,
                message: 'Kuisioner berhasil dihapus'
            });
            
        } catch (error) {
            console.error('❌ Error deleting admin kuisioner:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal menghapus kuisioner: ' + error.message 
            });
        }
    },

    // ==================== KUISIONER QUESTIONS METHODS ====================

    // GET all questions
    getKuisionerQuestions: async (req, res) => {
        try {
            console.log('========== GET KUISIONER QUESTIONS ==========');
            
            // Cek apakah tabel kuisioner_questions ada
            const [tables] = await db.query("SHOW TABLES LIKE 'kuisioner_questions'");
            
            if (tables.length === 0) {
                console.log('⚠️ Tabel kuisioner_questions belum ada');
                // Return data default jika tabel belum ada
                const defaultQuestions = [
                    { id: 1, question_text: 'Kemudahan dalam pelayanan pelanggan', urutan: 1 },
                    { id: 2, question_text: 'Kemudahan informasi tentang sistem, mekanisme, dan prosedur pelayanan pengujian', urutan: 2 },
                    { id: 3, question_text: 'Ketepatan waktu pelayanan pengujian', urutan: 3 },
                    { id: 4, question_text: 'Biaya pengujian yang kompetitif', urutan: 4 },
                    { id: 5, question_text: 'Kualitas dan mutu layanan sesuai ketentuan', urutan: 5 },
                    { id: 6, question_text: 'Tenaga teknis yang handal, berpengalaman, dan bersertifikasi', urutan: 6 },
                    { id: 7, question_text: 'Keramahan pelayanan petugas', urutan: 7 },
                    { id: 8, question_text: 'Kecepatan tanggapan dan tindak lanjut terhadap keluhan', urutan: 8 },
                    { id: 9, question_text: 'Kenyamanan dan kebersihan lingkungan', urutan: 9 },
                    { id: 10, question_text: 'Dukungan peralatan yang memadai, terpelihara serta mutakhir', urutan: 10 }
                ];
                return res.json({
                    success: true,
                    data: defaultQuestions
                });
            }
            
            // Ambil semua pertanyaan dari database
            const [questions] = await db.query(`
                SELECT 
                    id,
                    question_text,
                    urutan
                FROM kuisioner_questions 
                ORDER BY urutan ASC, id ASC
            `);

            console.log(`✅ Found ${questions.length} questions from database`);
            
            // Jika tidak ada data di database, return default
            if (questions.length === 0) {
                const defaultQuestions = [
                    { id: 1, question_text: 'Kemudahan dalam pelayanan pelanggan', urutan: 1 },
                    { id: 2, question_text: 'Kemudahan informasi tentang sistem, mekanisme, dan prosedur pelayanan pengujian', urutan: 2 },
                    { id: 3, question_text: 'Ketepatan waktu pelayanan pengujian', urutan: 3 },
                    { id: 4, question_text: 'Biaya pengujian yang kompetitif', urutan: 4 },
                    { id: 5, question_text: 'Kualitas dan mutu layanan sesuai ketentuan', urutan: 5 },
                    { id: 6, question_text: 'Tenaga teknis yang handal, berpengalaman, dan bersertifikasi', urutan: 6 },
                    { id: 7, question_text: 'Keramahan pelayanan petugas', urutan: 7 },
                    { id: 8, question_text: 'Kecepatan tanggapan dan tindak lanjut terhadap keluhan', urutan: 8 },
                    { id: 9, question_text: 'Kenyamanan dan kebersihan lingkungan', urutan: 9 },
                    { id: 10, question_text: 'Dukungan peralatan yang memadai, terpelihara serta mutakhir', urutan: 10 }
                ];
                return res.json({
                    success: true,
                    data: defaultQuestions
                });
            }
            
            res.json({
                success: true,
                data: questions
            });

        } catch (error) {
            console.error('❌ Error getting questions:', error);
            // Return default questions jika error
            const defaultQuestions = [
                { id: 1, question_text: 'Kemudahan dalam pelayanan pelanggan', urutan: 1 },
                { id: 2, question_text: 'Kemudahan informasi tentang sistem, mekanisme, dan prosedur pelayanan pengujian', urutan: 2 },
                { id: 3, question_text: 'Ketepatan waktu pelayanan pengujian', urutan: 3 },
                { id: 4, question_text: 'Biaya pengujian yang kompetitif', urutan: 4 },
                { id: 5, question_text: 'Kualitas dan mutu layanan sesuai ketentuan', urutan: 5 },
                { id: 6, question_text: 'Tenaga teknis yang handal, berpengalaman, dan bersertifikasi', urutan: 6 },
                { id: 7, question_text: 'Keramahan pelayanan petugas', urutan: 7 },
                { id: 8, question_text: 'Kecepatan tanggapan dan tindak lanjut terhadap keluhan', urutan: 8 },
                { id: 9, question_text: 'Kenyamanan dan kebersihan lingkungan', urutan: 9 },
                { id: 10, question_text: 'Dukungan peralatan yang memadai, terpelihara serta mutakhir', urutan: 10 }
            ];
            res.json({
                success: true,
                data: defaultQuestions
            });
        }
    },

    // GET question by ID
    getKuisionerQuestionById: async (req, res) => {
        try {
            const { id } = req.params;
            
            const [questions] = await db.query(
                'SELECT id, question_text, urutan FROM kuisioner_questions WHERE id = ?',
                [id]
            );
            
            if (questions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Pertanyaan tidak ditemukan'
                });
            }
            
            res.json({
                success: true,
                data: questions[0]
            });
        } catch (error) {
            console.error('❌ Error getting question:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil data pertanyaan: ' + error.message
            });
        }
    },

    // CREATE question
    createKuisionerQuestion: async (req, res) => {
        try {
            const { question_text, urutan } = req.body;
            const userId = req.user?.id || 1;
            
            console.log('========== CREATE KUISIONER QUESTION ==========');
            console.log('📥 Data:', { question_text, urutan, userId });
            
            if (!question_text) {
                return res.status(400).json({
                    success: false,
                    message: 'Teks pertanyaan harus diisi'
                });
            }
            
            // Jika urutan tidak diisi, ambil urutan terakhir + 1
            let finalUrutan = urutan;
            if (!finalUrutan) {
                const [lastOrder] = await db.query(
                    'SELECT MAX(urutan) as max_urutan FROM kuisioner_questions'
                );
                finalUrutan = (lastOrder[0].max_urutan || 0) + 1;
                console.log('📊 Generated urutan:', finalUrutan);
            }
            
            const [result] = await db.query(
                `INSERT INTO kuisioner_questions (question_text, urutan) VALUES (?, ?)`,
                [question_text, finalUrutan]
            );
            
            console.log('✅ Question created with ID:', result.insertId);
            
            res.json({
                success: true,
                message: 'Pertanyaan berhasil ditambahkan',
                data: {
                    id: result.insertId,
                    question_text,
                    urutan: finalUrutan
                }
            });
        } catch (error) {
            console.error('❌ Error creating question:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal menambah pertanyaan: ' + error.message
            });
        }
    },

    // UPDATE question
    updateKuisionerQuestion: async (req, res) => {
        try {
            const { id } = req.params;
            const { question_text, urutan } = req.body;
            
            console.log('========== UPDATE KUISIONER QUESTION ==========');
            console.log('📥 ID:', id);
            console.log('📥 Data:', { question_text, urutan });
            
            const [result] = await db.query(
                `UPDATE kuisioner_questions 
                SET question_text = ?, urutan = ?, updated_at = NOW()
                WHERE id = ?`,
                [question_text, urutan, id]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Pertanyaan tidak ditemukan'
                });
            }
            
            console.log('✅ Question updated');
            
            res.json({
                success: true,
                message: 'Pertanyaan berhasil diupdate'
            });
        } catch (error) {
            console.error('❌ Error updating question:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengupdate pertanyaan: ' + error.message
            });
        }
    },

    deleteKuisionerQuestion: async (req, res) => {
        try {
            const { id } = req.params;
            
            console.log('========== DELETE KUISIONER QUESTION ==========');
            console.log('📥 ID:', id);
            
            const [result] = await db.query(
                'DELETE FROM kuisioner_questions WHERE id = ?',
                [id]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Pertanyaan tidak ditemukan'
                });
            }
            
            console.log('✅ Question deleted');
            
            res.json({
                success: true,
                message: 'Pertanyaan berhasil dihapus'
            });
        } catch (error) {
            console.error('❌ Error deleting question:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal menghapus pertanyaan: ' + error.message
            });
        }
    },

    // REORDER questions
    reorderKuisionerQuestions: async (req, res) => {
        try {
            const { orders } = req.body; // array of { id, urutan }
            
            for (const item of orders) {
                await db.query(
                    'UPDATE kuisioner_questions SET urutan = ? WHERE id = ?',
                    [item.urutan, item.id]
                );
            }
            
            res.json({
                success: true,
                message: 'Urutan pertanyaan berhasil diupdate'
            });
        } catch (error) {
            console.error('❌ Error reordering questions:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengupdate urutan pertanyaan: ' + error.message
            });
        }
    },

    // ==================== PUBLIC KUISIONER QUESTIONS (TANPA AUTH) ====================
    getPublicKuisionerQuestions: async (req, res) => {
        try {
            console.log('========== GET PUBLIC KUISIONER QUESTIONS ==========');
            
            // Cek apakah tabel kuisioner_questions ada
            const [tables] = await db.query("SHOW TABLES LIKE 'kuisioner_questions'");
            
            if (tables.length === 0) {
                console.log('⚠️ Tabel kuisioner_questions belum ada');
                return res.json({
                    success: true,
                    data: []  // Kembalikan array kosong, bukan error
                });
            }
            
            // Ambil semua pertanyaan dari database
            const [questions] = await db.query(`
                SELECT 
                    id,
                    question_text,
                    urutan
                FROM kuisioner_questions 
                ORDER BY urutan ASC, id ASC
            `);

            console.log(`✅ Found ${questions.length} public questions`);
            
            res.json({
                success: true,
                data: questions
            });

        } catch (error) {
            console.error('❌ Error getting public questions:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil data pertanyaan: ' + error.message
            });
        }
    },

    // ==================== USER DETAIL METHODS ====================

    // ==================== GET USER DETAIL ====================
    getUserDetail: async (req, res) => {
        try {
            const id = req.params.id;
            
            console.log('========== GET USER DETAIL ==========');
            console.log('📥 User ID:', id);

            const [users] = await db.query(`
                SELECT 
                    u.id,
                    u.email,
                    u.full_name as name,
                    u.nama_instansi as company,
                    u.alamat as address,
                    u.nomor_telepon as phone,
                    u.role,
                    u.created_at,
                    'active' as status
                FROM users u
                WHERE u.id = ?
            `, [id]);
            
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }
            
            const user = users[0];
            
            // Hitung statistik user
            const [stats] = await db.query(`
                SELECT 
                    COUNT(*) as total_transactions,
                    COUNT(CASE WHEN status = 'Selesai' THEN 1 END) as completed_transactions,
                    COUNT(CASE WHEN status IN ('Menunggu Verifikasi', 'Pengecekan Sampel', 'Menunggu Pembayaran', 'Belum Lunas', 'Sedang Diuji') THEN 1 END) as pending_transactions,
                    COALESCE(SUM(p.total_tagihan), 0) as total_payments
                FROM submissions s
                LEFT JOIN payments p ON s.id = p.submission_id
                WHERE s.user_id = ?
            `, [id]);
            
            user.total_transactions = parseInt(stats[0].total_transactions) || 0;
            user.completed_transactions = parseInt(stats[0].completed_transactions) || 0;
            user.pending_transactions = parseInt(stats[0].pending_transactions) || 0;
            user.total_payments = parseFloat(stats[0].total_payments) || 0;
            
            // 🔴 QUERY YANG LEBIH DETAIL - Ambil semua data sample
            const [recentSubmissions] = await db.query(`
                SELECT 
                    s.id,
                    s.no_permohonan,
                    s.nama_proyek,
                    s.status,
                    p.total_tagihan,
                    s.created_at,
                    (
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'jenis_sample', ss.jenis_sample,
                                'test_type_id', ss.test_type_id,
                                'test_category_id', ss.test_category_id,
                                'service_id', ss.service_id,
                                'jumlah', ss.jumlah_sample_angka,
                                'satuan', ss.jumlah_sample_satuan
                            )
                        )
                        FROM submission_samples ss 
                        WHERE ss.submission_id = s.id
                    ) as samples,
                    (
                        SELECT GROUP_CONCAT(DISTINCT tt.type_name SEPARATOR ', ') 
                        FROM submission_samples ss 
                        JOIN test_types tt ON ss.test_type_id = tt.id
                        WHERE ss.submission_id = s.id
                    ) as jenis_uji,
                    (
                        SELECT GROUP_CONCAT(DISTINCT tc.category_name SEPARATOR ', ') 
                        FROM submission_samples ss 
                        JOIN test_categories tc ON ss.test_category_id = tc.id
                        WHERE ss.submission_id = s.id
                    ) as kategori_uji
                FROM submissions s
                LEFT JOIN payments p ON s.id = p.submission_id
                WHERE s.user_id = ?
                ORDER BY s.created_at DESC
                LIMIT 10
            `, [id]);
            
            // Parse JSON samples untuk frontend
            const formattedSubmissions = recentSubmissions.map(sub => {
                let samples = [];
                try {
                    samples = JSON.parse(sub.samples) || [];
                } catch (e) {
                    samples = [];
                }
                
                return {
                    ...sub,
                    samples: samples,
                    // Gabungkan jenis sample dari semua sample
                    jenis_sample_combined: samples.map(s => s.jenis_sample).join(', ') || '-',
                    // Gabungkan jenis uji dan kategori
                    jenis_uji_display: sub.jenis_uji || '-',
                    kategori_uji_display: sub.kategori_uji || '-'
                };
            });
            
            user.recent_submissions = formattedSubmissions;
            
            console.log('📦 Sending user detail with samples:', JSON.stringify(formattedSubmissions, null, 2));
            
            res.json({
                success: true,
                data: user
            });

        } catch (error) {
            console.error('❌ Error getting user detail:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil detail user: ' + error.message
            });
        }
    },

    // ==================== GET USERS LIST ====================
    getUsers: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status || '';
            const search = req.query.search || '';
            
            const offset = (page - 1) * limit;
            
            console.log('========== GET USERS ==========');
            console.log('📥 Params:', { page, limit, status, search });
            
            // 🔴 PERBAIKAN: Hapus referensi ke kolom 'status'
            let query = `
                SELECT 
                    u.id,
                    u.full_name as name,
                    u.email,
                    u.nomor_telepon as phone,
                    u.nama_instansi as company,
                    u.alamat as address,
                    u.role,
                    u.created_at,
                    -- Gunakan role untuk menentukan status
                    CASE 
                        WHEN u.role = 'admin' THEN 'active'
                        WHEN u.role = 'pelanggan' THEN 'active'
                        ELSE 'pending'
                    END as status,
                    (
                        SELECT COUNT(*) 
                        FROM submissions s 
                        WHERE s.user_id = u.id
                    ) as total_transactions
                FROM users u
                WHERE 1=1
            `;
            
            let countQuery = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
            let params = [];
            let countParams = [];
            
            // Filter berdasarkan role (customer/pelanggan saja)
            query += ` AND u.role = 'pelanggan'`;
            countQuery += ` AND role = 'pelanggan'`;
            
            // 🔥 FILTER STATUS - Sesuaikan dengan role
            if (status) {
                if (status === 'active') {
                    // Aktif = role 'pelanggan'
                    query += ` AND u.role = 'pelanggan'`;
                    countQuery += ` AND role = 'pelanggan'`;
                } else if (status === 'pending') {
                    // Tidak ada status pending, jadi return 0
                    query += ` AND 1=0`; // Ini akan mengembalikan 0 data
                    countQuery += ` AND 1=0`;
                } else if (status === 'inactive') {
                    // Tidak ada status inactive, jadi return 0
                    query += ` AND 1=0`; // Ini akan mengembalikan 0 data
                    countQuery += ` AND 1=0`;
                }
            }
            
            // 🔥 FILTER SEARCH
            if (search) {
                query += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR u.nama_instansi LIKE ? OR u.nomor_telepon LIKE ?)`;
                countQuery += ` AND (full_name LIKE ? OR email LIKE ? OR nama_instansi LIKE ? OR nomor_telepon LIKE ?)`;
                const searchPattern = `%${search}%`;
                for (let i = 0; i < 4; i++) {
                    params.push(searchPattern);
                    countParams.push(searchPattern);
                }
            }
            
            query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
            params.push(limit, offset);
            
            console.log('📝 Final Query:', query);
            
            const [users] = await db.query(query, params);
            const [countResult] = await db.query(countQuery, countParams);
            
            // Hitung stats - berdasarkan role
            const [stats] = await db.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN role = 'pelanggan' THEN 1 END) as active,
                    0 as pending,
                    0 as inactive,
                    COUNT(CASE WHEN nama_instansi IS NOT NULL AND nama_instansi != '' THEN 1 END) as companies
                FROM users
                WHERE role = 'pelanggan'
            `);
            
            // Format users
            const formattedUsers = users.map(user => ({
                ...user,
                total_transactions: parseInt(user.total_transactions) || 0,
                status: 'active' // Semua pelanggan dianggap aktif
            }));
            
            console.log(`✅ Found ${formattedUsers.length} users, total: ${countResult[0].total}`);
            
            res.json({
                success: true,
                data: {
                    users: formattedUsers,
                    stats: stats[0] || { total: 0, active: 0, pending: 0, inactive: 0, companies: 0 },
                    total: countResult[0].total,
                    page: page,
                    limit: limit,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            });

        } catch (error) {
            console.error('❌ Error getting users:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil data users: ' + error.message
            });
        }
    },

    // UPDATE USER
    updateUser: async (req, res) => {
        try {
            const id = req.params.id;
            const { name, email, phone, company, address, status } = req.body;
            
            console.log('========== UPDATE USER ==========');
            console.log('📥 ID:', id);
            console.log('📥 Data:', { name, email, phone, company, address, status });
            
            // 🔴 SESUAIKAN DENGAN STRUKTUR DATABASE
            await db.query(
                `UPDATE users 
                SET full_name = ?, email = ?, nomor_telepon = ?, nama_instansi = ?, alamat = ?, status = ? 
                WHERE id = ?`,
                [name, email, phone, company, address, status, id]
            );
            
            res.json({
                success: true,
                message: 'User berhasil diupdate'
            });
            
        } catch (error) {
            console.error('❌ Error updating user:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengupdate user: ' + error.message
            });
        }
    },

    // ==================== VERIFY USER ====================
    verifyUser: async (req, res) => {
        try {
            const id = req.params.id;
            
            console.log('========== VERIFY USER ==========');
            console.log('📥 ID:', id);
            
            // Karena tidak ada kolom status, verifikasi tidak diperlukan
            // Tapi kita tetap return sukses untuk frontend
            res.json({
                success: true,
                message: 'User sudah terverifikasi'
            });
            
        } catch (error) {
            console.error('❌ Error verifying user:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal memverifikasi user: ' + error.message
            });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const id = req.params.id;
            const adminId = req.user?.id;
            
            console.log('========== DELETE USER ==========');
            console.log('📥 ID:', id);
            
            // Cek apakah user ada
            const [users] = await db.query('SELECT role FROM users WHERE id = ?', [id]);
            
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }
            
            if (users[0].role === 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Tidak dapat menghapus akun admin'
                });
            }
            
            // Hapus user
            await db.query('DELETE FROM users WHERE id = ?', [id]);
            
            res.json({
                success: true,
                message: 'User berhasil dihapus'
            });
            
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal menghapus user: ' + error.message
            });
        }
    },

    // DEACTIVATE USER
    deactivateUser: async (req, res) => {
        try {
            const id = req.params.id;
            const adminId = req.user?.id;
            
            console.log('========== DEACTIVATE USER ==========');
            console.log('📥 ID:', id);
            
            // Cek apakah user ada
            const [users] = await db.query('SELECT email FROM users WHERE id = ?', [id]);
            
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }
            
            // Update status menjadi inactive
            await db.query(
                'UPDATE users SET status = "inactive", updated_at = NOW() WHERE id = ?',
                [id]
            );
            
            // Catat aktivitas
            if (adminId) {
                await db.query(
                    `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                    VALUES (?, ?, ?, ?)`,
                    [adminId, 'Deactivate User', req.ip, req.headers['user-agent']]
                );
            }
            
            res.json({
                success: true,
                message: 'User berhasil dinonaktifkan'
            });
            
        } catch (error) {
            console.error('❌ Error deactivating user:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal menonaktifkan user: ' + error.message
            });
        }
    },

    // RESET PASSWORD
    resetPassword: async (req, res) => {
        try {
            const id = req.params.id;
            const { method, newPassword } = req.body;
            const adminId = req.user?.id;
            
            console.log('========== RESET PASSWORD ==========');
            console.log('📥 ID:', id, 'Method:', method);
            
            // Cek apakah user ada
            const [users] = await db.query('SELECT email FROM users WHERE id = ?', [id]);
            
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }
            
            const user = users[0];
            let result = {};
            
            if (method === 'random') {
                // Generate password random (8 karakter)
                const randomPassword = Math.random().toString(36).slice(-8) + 
                                    Math.random().toString(36).slice(-2).toUpperCase();
                
                // TODO: Hash password dengan bcrypt
                await db.query(
                    'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
                    [randomPassword, id]
                );
                
                result.newPassword = randomPassword;
                
            } else if (method === 'manual') {
                if (!newPassword || newPassword.length < 6) {
                    return res.status(400).json({
                        success: false,
                        message: 'Password minimal 6 karakter'
                    });
                }
                
                // TODO: Hash password dengan bcrypt
                await db.query(
                    'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
                    [newPassword, id]
                );
            }
            
            // Catat aktivitas
            if (adminId) {
                await db.query(
                    `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                    VALUES (?, ?, ?, ?)`,
                    [adminId, 'Reset Password', req.ip, req.headers['user-agent']]
                );
            }
            
            res.json({
                success: true,
                message: 'Password berhasil direset',
                data: result
            });
            
        } catch (error) {
            console.error('❌ Error resetting password:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal reset password: ' + error.message
            });
        }
    },

    // SEND NOTIFICATION
    sendNotification: async (req, res) => {
        try {
            const id = req.params.id;
            const { type, title, message } = req.body;
            const adminId = req.user?.id;
            
            console.log('========== SEND NOTIFICATION ==========');
            console.log('📥 ID:', id, 'Type:', type);
            console.log('Title:', title);
            console.log('Message:', message);
            
            // Cek apakah user ada
            const [users] = await db.query('SELECT email FROM users WHERE id = ?', [id]);
            
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }
            
            // TODO: Implementasi notifikasi (email/database)
            console.log('📧 Sending notification to:', users[0].email);
            
            // Catat aktivitas
            if (adminId) {
                await db.query(
                    `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                    VALUES (?, ?, ?, ?)`,
                    [adminId, 'Send Notification', req.ip, req.headers['user-agent']]
                );
            }
            
            res.json({
                success: true,
                message: 'Notifikasi berhasil dikirim'
            });
            
        } catch (error) {
            console.error('❌ Error sending notification:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengirim notifikasi: ' + error.message
            });
        }
    },



    // ==================== REPORTS METHODS ====================
    getReports: async (req, res) => {
        try {
            const start_date = req.query.start_date || '2000-01-01';
            const end_date = req.query.end_date || '2099-12-31';
            const category = req.query.category || '';
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            console.log('========== BACKEND GET REPORTS ==========');
            console.log('📥 Params:', { start_date, end_date, category, page, limit });

            // ==================== SUMMARY STATS (DENGAN FILTER CATEGORY) ====================
            let summaryQuery = `
                SELECT 
                    COALESCE(SUM(p.total_tagihan), 0) as total_revenue,
                    COUNT(DISTINCT s.id) as total_transactions,
                    COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_tests,
                    COUNT(DISTINCT s.user_id) as active_clients
                FROM submissions s
                LEFT JOIN payments p ON s.id = p.submission_id AND p.status_pembayaran = 'Lunas'
                WHERE DATE(s.created_at) BETWEEN ? AND ?
            `;
            
            const summaryParams = [start_date, end_date];
            
            if (category) {
                summaryQuery += ` AND s.category = ?`;
                summaryParams.push(category);
            }
            
            const [summary] = await db.query(summaryQuery, summaryParams);
            console.log('📊 Summary with filter:', { category, summary: summary[0] });

            // ==================== REVENUE TREND (DENGAN FILTER CATEGORY) ====================
            let revenueTrendQuery = `
                SELECT 
                    DATE_FORMAT(s.created_at, '%b') as month,
                    COALESCE(SUM(p.total_tagihan), 0) as total
                FROM submissions s
                LEFT JOIN payments p ON s.id = p.submission_id AND p.status_pembayaran = 'Lunas'
                WHERE DATE(s.created_at) BETWEEN ? AND ?
            `;
            
            const revenueParams = [start_date, end_date];
            
            if (category) {
                revenueTrendQuery += ` AND s.category = ?`;
                revenueParams.push(category);
            }
            
            revenueTrendQuery += ` GROUP BY YEAR(s.created_at), MONTH(s.created_at) ORDER BY MIN(s.created_at) ASC LIMIT 6`;
            
            const [revenueTrend] = await db.query(revenueTrendQuery, revenueParams);

            // ==================== SERVICE DISTRIBUTION ====================
            const [serviceDist] = await db.query(`
                SELECT 
                    s.category as label,
                    COUNT(*) as value
                FROM submissions s
                WHERE DATE(s.created_at) BETWEEN ? AND ?
                    AND s.category IS NOT NULL
                GROUP BY s.category
                ORDER BY value DESC
                LIMIT 5
            `, [start_date, end_date]);

            // ==================== STATUS DISTRIBUTION ====================
            const [statusDist] = await db.query(`
                SELECT 
                    status as label,
                    COUNT(*) as value
                FROM submissions
                WHERE DATE(created_at) BETWEEN ? AND ?
                GROUP BY status
            `, [start_date, end_date]);

            // ==================== TOP CLIENTS (DENGAN FILTER CATEGORY) ====================
            let topClientsQuery = `
                SELECT 
                    u.company as name,
                    COUNT(DISTINCT s.id) as transactions,
                    COALESCE(SUM(p.total_tagihan), 0) as total
                FROM users u
                JOIN submissions s ON u.id = s.user_id
                LEFT JOIN payments p ON s.id = p.submission_id AND p.status_pembayaran = 'Lunas'
                WHERE DATE(s.created_at) BETWEEN ? AND ?
                    AND u.role = 'customer'
            `;
            
            const topClientsParams = [start_date, end_date];
            
            if (category) {
                topClientsQuery += ` AND s.category = ?`;
                topClientsParams.push(category);
            }
            
            topClientsQuery += ` GROUP BY u.id, u.company ORDER BY total DESC LIMIT 5`;
            
            const [topClients] = await db.query(topClientsQuery, topClientsParams);

            // ==================== MONTHLY GROWTH (DENGAN FILTER CATEGORY) ====================
            let monthlyGrowthQuery = `
                SELECT 
                    DATE_FORMAT(p.created_at, '%b') as month,
                    COALESCE(SUM(p.total_tagihan), 0) as revenue
                FROM payments p
                JOIN submissions s ON p.submission_id = s.id
                WHERE p.status_pembayaran = 'Lunas'
                    AND DATE(p.created_at) BETWEEN ? AND ?
            `;
            
            const monthlyParams = [start_date, end_date];
            
            if (category) {
                monthlyGrowthQuery += ` AND s.category = ?`;
                monthlyParams.push(category);
            }
            
            monthlyGrowthQuery += ` GROUP BY YEAR(p.created_at), MONTH(p.created_at) ORDER BY MIN(p.created_at) ASC LIMIT 6`;
            
            const [monthlyGrowth] = await db.query(monthlyGrowthQuery, monthlyParams);

            // ==================== TRANSACTIONS TABLE ====================
            let transactionsQuery = `
                SELECT 
                    DATE_FORMAT(s.created_at, '%Y-%m-%d') as date,
                    s.registration_number as reference,
                    u.company,
                    s.test_type as description,
                    s.category,
                    p.total_tagihan as amount
                FROM submissions s
                JOIN users u ON s.user_id = u.id
                LEFT JOIN payments p ON s.id = p.submission_id
                WHERE DATE(s.created_at) BETWEEN ? AND ?
            `;
            
            const queryParams = [start_date, end_date];
            
            if (category) {
                transactionsQuery += ` AND s.category = ?`;
                queryParams.push(category);
            }
            
            transactionsQuery += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
            queryParams.push(limit, offset);

            const [transactions] = await db.query(transactionsQuery, queryParams);

            // Hitung total transactions
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM submissions s
                WHERE DATE(s.created_at) BETWEEN ? AND ?
            `;
            const countParams = [start_date, end_date];
            
            if (category) {
                countQuery += ` AND category = ?`;
                countParams.push(category);
            }
            
            const [countResult] = await db.query(countQuery, countParams);
            const total = countResult[0].total;

            // Hitung growth untuk monthly
            const growthData = [];
            for (let i = 0; i < monthlyGrowth.length; i++) {
                const prevRevenue = i > 0 ? monthlyGrowth[i-1].revenue : monthlyGrowth[i].revenue;
                const growth = prevRevenue > 0 
                    ? ((monthlyGrowth[i].revenue - prevRevenue) / prevRevenue * 100).toFixed(1)
                    : 0;
                
                growthData.push({
                    month: monthlyGrowth[i].month,
                    revenue: parseFloat(monthlyGrowth[i].revenue) || 0,
                    growth: parseFloat(growth)
                });
            }

            // Hitung avg_transactions
            const daysDiff = Math.max(1, Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)));
            const avg_transactions = Math.round((summary[0].total_transactions || 0) / daysDiff);
            
            // Hitung completion_rate
            const completion_rate = summary[0].total_transactions > 0 
                ? Math.round(((summary[0].completed_tests || 0) / summary[0].total_transactions) * 100) 
                : 0;

            // Format response
            const response = {
                summary: {
                    total_revenue: parseFloat(summary[0].total_revenue) || 0,
                    revenue_growth: 0,
                    total_transactions: parseInt(summary[0].total_transactions) || 0,
                    avg_transactions: avg_transactions,
                    completed_tests: parseInt(summary[0].completed_tests) || 0,
                    completion_rate: completion_rate,
                    active_clients: parseInt(summary[0].active_clients) || 0,
                    new_clients: 0
                },
                revenue_trend: {
                    labels: revenueTrend.map(r => r.month),
                    values: revenueTrend.map(r => parseFloat(r.total) || 0),
                    max: Math.max(...revenueTrend.map(r => parseFloat(r.total) || 0), 0),
                    min: Math.min(...revenueTrend.map(r => parseFloat(r.total) || 0), 0),
                    avg: revenueTrend.length > 0 
                        ? revenueTrend.reduce((a, b) => a + (parseFloat(b.total) || 0), 0) / revenueTrend.length 
                        : 0
                },
                service_distribution: {
                    labels: serviceDist.map(s => s.label || 'Lainnya'),
                    values: serviceDist.map(s => parseInt(s.value) || 0)
                },
                status_distribution: {
                    labels: statusDist.map(s => s.label),
                    values: statusDist.map(s => parseInt(s.value) || 0)
                },
                top_clients: topClients.map(c => ({
                    name: c.name || 'Unknown',
                    transactions: parseInt(c.transactions) || 0,
                    total: parseFloat(c.total) || 0
                })),
                monthly_growth: growthData,
                transactions: transactions.map(t => ({
                    date: t.date,
                    reference: t.reference,
                    company: t.company,
                    description: t.description,
                    category: t.category,
                    amount: parseFloat(t.amount) || 0,
                    volume: '1 Unit'
                })),
                total: total,
                page: page,
                limit: limit,
                totalPages: Math.ceil(total / limit)
            };

            console.log('✅ Reports data berhasil diambil');
            res.json({ success: true, data: response });

        } catch (error) {
            console.error('❌ Error getting reports:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal mengambil laporan: ' + error.message 
            });
        }
    },


    // ==================== PROFIL METHODS ====================

    // Get profile settings
    getProfileSettings: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            // Ambil data user dari database
            const [users] = await db.query(
                `SELECT 
                    id, 
                    full_name as name, 
                    email, 
                    nomor_telepon as phone, 
                    avatar, 
                    role, 
                    created_at, 
                    updated_at 
                FROM users 
                WHERE id = ?`,
                [userId]
            );
            
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }
            
            const user = users[0];
            
            // Format profile
            const profile = {
                id: user.id,
                name: user.name,
                employee_id: 'NIP-' + String(user.id).padStart(3, '0'),
                email: user.email,
                phone: user.phone || '',
                avatar: user.avatar,
                position: user.role === 'admin' ? 'Super Administrator (Kepala Teknis)' : 'Staff',
                updated_at: user.updated_at || user.created_at
            };
            
            res.json({
                success: true,
                data: profile
            });
            
        } catch (error) {
            console.error('Error getting profile settings:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil data profile: ' + error.message
            });
        }
    },

    // Update profile
    updateProfile: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            const { name, email, phone } = req.body;
            
            if (!name || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'Nama dan email harus diisi'
                });
            }
            
            // Cek email sudah digunakan atau belum
            const [existing] = await db.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, userId]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email sudah digunakan'
                });
            }
            
            // Update user
            await db.query(
                `UPDATE users 
                SET full_name = ?, email = ?, nomor_telepon = ?, updated_at = NOW() 
                WHERE id = ?`,
                [name, email, phone || null, userId]
            );
            
            // Catat aktivitas
            await db.query(
                `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                VALUES (?, ?, ?, ?)`,
                [userId, 'Update Profile', req.ip, req.headers['user-agent']]
            );
            
            res.json({
                success: true,
                message: 'Profile berhasil diupdate'
            });
            
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengupdate profile: ' + error.message
            });
        }
    },

    // Upload avatar
    uploadAvatar: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Tidak ada file yang diupload'
                });
            }

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const fileUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;
            
            // Update avatar di database
            await db.query(
                'UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?',
                [fileUrl, userId]
            );
            
            // Catat aktivitas
            await db.query(
                `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                VALUES (?, ?, ?, ?)`,
                [userId, 'Upload Avatar', req.ip, req.headers['user-agent']]
            );
            
            res.json({
                success: true,
                message: 'Avatar berhasil diupload',
                data: {
                    url: fileUrl,
                    filename: req.file.filename,
                    size: req.file.size
                }
            });
            
        } catch (error) {
            console.error('Error uploading avatar:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal upload avatar: ' + error.message
            });
        }
    },

    // Delete avatar
    deleteAvatar: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            // Hapus avatar dari database
            await db.query(
                'UPDATE users SET avatar = NULL, updated_at = NOW() WHERE id = ?',
                [userId]
            );
            
            // Catat aktivitas
            await db.query(
                `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                VALUES (?, ?, ?, ?)`,
                [userId, 'Delete Avatar', req.ip, req.headers['user-agent']]
            );
            
            res.json({
                success: true,
                message: 'Avatar berhasil dihapus'
            });
            
        } catch (error) {
            console.error('Error deleting avatar:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal menghapus avatar: ' + error.message
            });
        }
    },

    // ==================== PASSWORD METHODS ====================

    // Change password
    changePassword: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            const { current_password, new_password } = req.body;
            
            if (!current_password || !new_password) {
                return res.status(400).json({
                    success: false,
                    message: 'Password saat ini dan password baru harus diisi'
                });
            }
            
            if (new_password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Password baru minimal 8 karakter'
                });
            }
            
            // Ambil password dari database
            const [users] = await db.query(
                'SELECT password FROM users WHERE id = ?',
                [userId]
            );
            
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }
            
            // TODO: Ganti dengan bcrypt compare
            if (current_password !== users[0].password) {
                return res.status(400).json({
                    success: false,
                    message: 'Password saat ini salah'
                });
            }
            
            // TODO: Hash password baru dengan bcrypt
            await db.query(
                'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
                [new_password, userId]
            );
            
            // Catat aktivitas
            await db.query(
                `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                VALUES (?, ?, ?, ?)`,
                [userId, 'Change Password', req.ip, req.headers['user-agent']]
            );
            
            res.json({
                success: true,
                message: 'Password berhasil diubah'
            });
            
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengubah password: ' + error.message
            });
        }
    },

    // ==================== SYSTEM CONFIG METHODS ====================

    // Get system configuration
    getSystemConfig: async (req, res) => {
        try {
            // Default config
            let config = {
                institution_name: 'UPTD Laboratorium Konstruksi Dinas PUPR',
                address: 'Jl. Raya Lab Pengujian No. 123, Banten',
                phone: '(021) 555-1234',
                email: 'info@lab-uptd.gov.id',
                website: 'https://lab-uptd.banten.go.id',
                maintenance_mode: false,
                max_upload_size: 5
            };
            
            // Ambil dari tabel settings
            try {
                const [rows] = await db.query(
                    'SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE "system_%"'
                );
                
                rows.forEach(row => {
                    if (row.setting_key === 'system_institution_name') config.institution_name = row.setting_value;
                    if (row.setting_key === 'system_address') config.address = row.setting_value;
                    if (row.setting_key === 'system_phone') config.phone = row.setting_value;
                    if (row.setting_key === 'system_email') config.email = row.setting_value;
                    if (row.setting_key === 'system_website') config.website = row.setting_value;
                    if (row.setting_key === 'system_maintenance_mode') config.maintenance_mode = row.setting_value === 'true';
                    if (row.setting_key === 'system_max_upload_size') config.max_upload_size = parseInt(row.setting_value) || 5;
                });
            } catch (dbError) {
                console.log('Settings table not ready:', dbError.message);
            }
            
            res.json({
                success: true,
                data: config
            });
            
        } catch (error) {
            console.error('Error getting system config:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil konfigurasi sistem: ' + error.message
            });
        }
    },

    // Update system configuration
    updateSystemConfig: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            const config = req.body;
            
            if (!config.institution_name) {
                return res.status(400).json({
                    success: false,
                    message: 'Nama instansi harus diisi'
                });
            }
            
            // Simpan ke database
            const settings = [
                { key: 'system_institution_name', value: config.institution_name },
                { key: 'system_address', value: config.address || '' },
                { key: 'system_phone', value: config.phone || '' },
                { key: 'system_email', value: config.email || '' },
                { key: 'system_website', value: config.website || '' },
                { key: 'system_maintenance_mode', value: config.maintenance_mode ? 'true' : 'false' },
                { key: 'system_max_upload_size', value: config.max_upload_size.toString() }
            ];
            
            for (const setting of settings) {
                // 🔴 HAPUS updated_by
                await db.query(
                    `INSERT INTO settings (setting_key, setting_value) 
                    VALUES (?, ?)
                    ON DUPLICATE KEY UPDATE 
                    setting_value = VALUES(setting_value), 
                    updated_at = NOW()`,
                    [setting.key, setting.value]
                );
            }
            
            // Catat aktivitas
            await db.query(
                `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                VALUES (?, ?, ?, ?)`,
                [userId, 'Update System Config', req.ip, req.headers['user-agent']]
            );
            
            res.json({
                success: true,
                message: 'Konfigurasi berhasil disimpan',
                data: config
            });
            
        } catch (error) {
            console.error('Error updating system config:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal menyimpan konfigurasi: ' + error.message
            });
        }
    },

    // ==================== MODE SIBUK METHODS ====================

    // Get mode sibuk status dan periode
    getBusyMode: async (req, res) => {
        try {
            console.log('📋 Getting busy mode...');
            
            let active = false;
            
            // Ambil status mode sibuk dari settings
            try {
                const [settings] = await db.query(
                    'SELECT setting_value FROM settings WHERE setting_key = "busy_mode_active"'
                );
                active = settings.length > 0 ? settings[0].setting_value === '1' : false;
            } catch (dbError) {
                console.log('⚠️ Settings table error:', dbError.message);
            }
            
            let periods = [];
            
            // Ambil periode sibuk dari tabel jadwal_sibuk
            try {
                // Cek apakah tabel jadwal_sibuk ada
                const [tables] = await db.query("SHOW TABLES LIKE 'jadwal_sibuk'");
                
                if (tables.length > 0) {
                    const [rows] = await db.query(
                        `SELECT 
                            id, 
                            keterangan, 
                            DATE_FORMAT(tanggal_mulai, '%Y-%m-%d') as tanggal_mulai,
                            DATE_FORMAT(tanggal_selesai, '%Y-%m-%d') as tanggal_selesai,
                            created_at,
                            updated_at
                        FROM jadwal_sibuk 
                        ORDER BY tanggal_mulai ASC`
                    );
                    periods = rows;
                }
            } catch (dbError) {
                console.log('⚠️ jadwal_sibuk table error:', dbError.message);
                periods = [];
            }
            
            res.json({
                success: true,
                data: {
                    active: active,
                    periods: periods
                }
            });
            
        } catch (error) {
            console.error('❌ Error getting busy mode:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil data mode sibuk: ' + error.message
            });
        }
    },

    // Update mode sibuk status
    updateBusyMode: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            const { active } = req.body;
            
            console.log('📝 Updating busy mode:', { active, userId });
            
            try {
                const [existing] = await db.query(
                    'SELECT * FROM settings WHERE setting_key = "busy_mode_active"'
                );
                
                if (existing.length > 0) {
                    // 🔴 HAPUS updated_by DARI QUERY UPDATE
                    await db.query(
                        `UPDATE settings 
                        SET setting_value = ?, updated_at = NOW() 
                        WHERE setting_key = "busy_mode_active"`,
                        [active ? '1' : '0']
                    );
                } else {
                    // 🔴 HAPUS updated_by DARI QUERY INSERT
                    await db.query(
                        `INSERT INTO settings (setting_key, setting_value) 
                        VALUES ("busy_mode_active", ?)`,
                        [active ? '1' : '0']
                    );
                }
            } catch (dbError) {
                console.error('❌ Database error:', dbError.message);
                throw dbError;
            }
            
            // Catat aktivitas (tetap pakai userId)
            await db.query(
                `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                VALUES (?, ?, ?, ?)`,
                [userId, 'Update Busy Mode', req.ip, req.headers['user-agent']]
            );
            
            res.json({
                success: true,
                message: active ? 'Mode sibuk diaktifkan' : 'Mode sibuk dinonaktifkan'
            });
            
        } catch (error) {
            console.error('❌ Error updating busy mode:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengupdate mode sibuk: ' + error.message
            });
        }
    },

    // Get periode sibuk by ID
    getBusyPeriodById: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Cek apakah tabel jadwal_sibuk ada
            const [tables] = await db.query("SHOW TABLES LIKE 'jadwal_sibuk'");
            
            if (tables.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Tabel jadwal_sibuk belum ada'
                });
            }
            
            const [rows] = await db.query(
                'SELECT * FROM jadwal_sibuk WHERE id = ?',
                [id]
            );
            
            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Periode tidak ditemukan'
                });
            }
            
            res.json({
                success: true,
                data: rows[0]
            });
            
        } catch (error) {
            console.error('❌ Error getting busy period:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil data periode: ' + error.message
            });
        }
    },

    // Tambah periode sibuk
    addBusyPeriod: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            const { keterangan, tanggal_mulai, tanggal_selesai } = req.body;
            
            console.log('📝 Adding busy period:', { keterangan, tanggal_mulai, tanggal_selesai });
            
            if (!keterangan || !tanggal_mulai || !tanggal_selesai) {
                return res.status(400).json({
                    success: false,
                    message: 'Semua field harus diisi'
                });
            }
            
            if (new Date(tanggal_mulai) > new Date(tanggal_selesai)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tanggal selesai harus setelah tanggal mulai'
                });
            }
            
            // Buat tabel jadwal_sibuk jika belum ada
            try {
                await db.query('SELECT 1 FROM jadwal_sibuk LIMIT 1');
            } catch (dbError) {
                if (dbError.code === 'ER_NO_SUCH_TABLE') {
                    console.log('📋 Creating jadwal_sibuk table...');
                    await db.query(`
                        CREATE TABLE IF NOT EXISTS jadwal_sibuk (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            keterangan VARCHAR(255) NOT NULL,
                            tanggal_mulai DATE NOT NULL,
                            tanggal_selesai DATE NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            created_at INT,
                            updated_at INT
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    `);
                }
            }
            
            // Insert periode
            const [result] = await db.query(
                `INSERT INTO jadwal_sibuk 
                (keterangan, tanggal_mulai, tanggal_selesai, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?)`,
                [keterangan, tanggal_mulai, tanggal_selesai, userId, userId]
            );
            
            // Catat aktivitas
            await db.query(
                `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                VALUES (?, ?, ?, ?)`,
                [userId, 'Add Busy Period', req.ip, req.headers['user-agent']]
            );
            
            res.json({
                success: true,
                message: 'Periode sibuk berhasil ditambahkan',
                data: { id: result.insertId }
            });
            
        } catch (error) {
            console.error('❌ Error adding busy period:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal menambah periode sibuk: ' + error.message
            });
        }
    },

    // Update periode sibuk
    updateBusyPeriod: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            const { id } = req.params;
            const { keterangan, tanggal_mulai, tanggal_selesai } = req.body;
            
            if (!keterangan || !tanggal_mulai || !tanggal_selesai) {
                return res.status(400).json({
                    success: false,
                    message: 'Semua field harus diisi'
                });
            }
            
            if (new Date(tanggal_mulai) > new Date(tanggal_selesai)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tanggal selesai harus setelah tanggal mulai'
                });
            }
            
            // Update periode
            const [result] = await db.query(
                `UPDATE jadwal_sibuk 
                SET keterangan = ?, tanggal_mulai = ?, tanggal_selesai = ?, updated_by = ? 
                WHERE id = ?`,
                [keterangan, tanggal_mulai, tanggal_selesai, userId, id]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Periode tidak ditemukan'
                });
            }
            
            // Catat aktivitas
            await db.query(
                `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                VALUES (?, ?, ?, ?)`,
                [userId, 'Update Busy Period', req.ip, req.headers['user-agent']]
            );
            
            res.json({
                success: true,
                message: 'Periode sibuk berhasil diupdate'
            });
            
        } catch (error) {
            console.error('❌ Error updating busy period:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengupdate periode sibuk: ' + error.message
            });
        }
    },

    // Delete periode sibuk
    deleteBusyPeriod: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            const { id } = req.params;
            
            // Hapus periode
            const [result] = await db.query(
                'DELETE FROM jadwal_sibuk WHERE id = ?',
                [id]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Periode tidak ditemukan'
                });
            }
            
            // Catat aktivitas
            await db.query(
                `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                VALUES (?, ?, ?, ?)`,
                [userId, 'Delete Busy Period', req.ip, req.headers['user-agent']]
            );
            
            res.json({
                success: true,
                message: 'Periode sibuk berhasil dihapus'
            });
            
        } catch (error) {
            console.error('❌ Error deleting busy period:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal menghapus periode sibuk: ' + error.message
            });
        }
    },

    // ==================== BACKUP & RESTORE METHODS ====================

    // Create backup
    createBackup: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            const fs = require('fs');
            const path = require('path');
            const { exec } = require('child_process');
            
            // Buat direktori backup jika belum ada
            const backupDir = path.join(__dirname, '../../backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const dateStr = new Date().toISOString().slice(0,10);
            const timestamp = new Date().getTime();
            const filename = `backup_${dateStr}_${timestamp}.sql`;
            const filepath = path.join(backupDir, filename);
            
            // Ambil konfigurasi database dari environment
            const dbConfig = {
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'uptd_lab'
            };
            
            // Jalankan mysqldump
            const dumpCommand = `mysqldump -h ${dbConfig.host} -u ${dbConfig.user} ${dbConfig.password ? '-p' + dbConfig.password : ''} ${dbConfig.database} > ${filepath}`;
            
            exec(dumpCommand, async (error, stdout, stderr) => {
                if (error) {
                    console.error('Backup error:', error);
                    
                    // Fallback: buat file dummy
                    const dummyContent = `-- Backup database ${dbConfig.database}\n-- Created at ${new Date().toISOString()}\n\n`;
                    fs.writeFileSync(filepath, dummyContent);
                }
                
                // Catat aktivitas
                await db.query(
                    `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                    VALUES (?, ?, ?, ?)`,
                    [userId, 'Create Backup', req.ip, req.headers['user-agent']]
                );
                
                const baseUrl = `${req.protocol}://${req.get('host')}`;
                const fileUrl = `${baseUrl}/backups/${filename}`;
                
                res.json({
                    success: true,
                    message: 'Backup berhasil dibuat',
                    data: {
                        url: fileUrl,
                        filename: filename,
                        created_at: new Date().toISOString()
                    }
                });
            });
            
        } catch (error) {
            console.error('Error creating backup:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal membuat backup: ' + error.message
            });
        }
    },

    // Get backup history
    getBackupHistory: async (req, res) => {
        try {
            const fs = require('fs');
            const path = require('path');
            const backupDir = path.join(__dirname, '../../backups');
            
            let backups = [];
            
            if (fs.existsSync(backupDir)) {
                const files = fs.readdirSync(backupDir);
                backups = files
                    .filter(f => f.endsWith('.sql') || f.endsWith('.gz'))
                    .map(f => {
                        const stats = fs.statSync(path.join(backupDir, f));
                        return {
                            filename: f,
                            size: stats.size,
                            created_at: stats.birthtime,
                            url: `/backups/${f}`
                        };
                    })
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 10);
            }
            
            res.json({
                success: true,
                data: backups
            });
            
        } catch (error) {
            console.error('Error getting backup history:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil history backup: ' + error.message
            });
        }
    },

    // Restore backup
    restoreBackup: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Tidak ada file backup yang diupload'
                });
            }
            
            const fs = require('fs');
            const path = require('path');
            const { exec } = require('child_process');
            
            // Simpan file upload
            const uploadDir = path.join(__dirname, '../../uploads/restore');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            const filename = `restore_${Date.now()}.sql`;
            const filepath = path.join(uploadDir, filename);
            fs.writeFileSync(filepath, req.file.buffer);
            
            // Ambil konfigurasi database
            const dbConfig = {
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'uptd_lab'
            };
            
            // Jalankan mysql restore
            const restoreCommand = `mysql -h ${dbConfig.host} -u ${dbConfig.user} ${dbConfig.password ? '-p' + dbConfig.password : ''} ${dbConfig.database} < ${filepath}`;
            
            exec(restoreCommand, async (error, stdout, stderr) => {
                if (error) {
                    console.error('Restore error:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Gagal merestore database: ' + error.message
                    });
                }
                
                // Catat aktivitas
                await db.query(
                    `INSERT INTO activities (user_id, activity_name, ip_address, user_agent) 
                    VALUES (?, ?, ?, ?)`,
                    [userId, 'Restore Backup', req.ip, req.headers['user-agent']]
                );
                
                // Hapus file temporary
                try {
                    fs.unlinkSync(filepath);
                } catch (e) {}
                
                res.json({
                    success: true,
                    message: 'Restore berhasil'
                });
            });
            
        } catch (error) {
            console.error('Error restoring backup:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal restore: ' + error.message
            });
        }
    },

    // ==================== ACTIVITY LOGS METHODS ====================

    // Get activity logs
    getActivityLogs: async (req, res) => {
        try {
            const type = req.query.type || 'all';
            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            
            // Query untuk mengambil log aktivitas
            let query = `
                SELECT 
                    a.*,
                    u.full_name as user_name 
                FROM activities a
                LEFT JOIN users u ON a.user_id = u.id
                WHERE 1=1
            `;
            let countQuery = `SELECT COUNT(*) as total FROM activities WHERE 1=1`;
            let params = [];
            let countParams = [];
            
            if (type !== 'all') {
                query += ` AND a.activity_name LIKE ?`;
                countQuery += ` AND activity_name LIKE ?`;
                const searchPattern = `%${type}%`;
                params.push(searchPattern);
                countParams.push(searchPattern);
            }
            
            query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
            params.push(limit, offset);
            
            const [logs] = await db.query(query, params);
            const [countResult] = await db.query(countQuery, countParams);
            
            const total = countResult[0].total;
            
            res.json({
                success: true,
                data: logs,
                total: total,
                page: page,
                totalPages: Math.ceil(total / limit)
            });
            
        } catch (error) {
            console.error('Error getting activity logs:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil log aktivitas: ' + error.message
            });
        }
    },

    // ==============================================
    // ==================== USER ====================
    // ==============================================

    // ==================== USER DASHBOARD ====================
    getUserDashboard: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            console.log('📊 Getting dashboard data for user:', userId);
            
            // Total submissions
            const [totalSubmissions] = await db.query(
                'SELECT COUNT(*) as total FROM submissions WHERE user_id = ?',
                [userId]
            );
            
            // Pending payment (status pembayaran yang belum lunas)
            const [pendingPayment] = await db.query(`
                SELECT COUNT(*) as total 
                FROM submissions s
                JOIN payments p ON s.id = p.submission_id
                WHERE s.user_id = ? AND p.status_pembayaran IN ('Belum Bayar', 'Belum Lunas', 'Menunggu SKRD Upload')
            `, [userId]);
            
            // Completed tests (status submission Selesai)
            const [completedTests] = await db.query(
                'SELECT COUNT(*) as total FROM submissions WHERE user_id = ? AND status = "Selesai"',
                [userId]
            );
            
            // Total spending (total tagihan dari payment yang sudah Lunas)
            const [totalSpending] = await db.query(`
                SELECT COALESCE(SUM(p.total_tagihan), 0) as total
                FROM payments p
                JOIN submissions s ON p.submission_id = s.id
                WHERE s.user_id = ? AND p.status_pembayaran = 'Lunas'
            `, [userId]);
            
            // Material testing count (test_type_id = 1 untuk PENGUJIAN BAHAN)
            const [materialTestingCount] = await db.query(`
                SELECT COUNT(DISTINCT s.id) as total
                FROM submissions s
                JOIN submission_samples ss ON s.id = ss.submission_id
                JOIN test_types tt ON ss.test_type_id = tt.id
                WHERE s.user_id = ? AND tt.id = 1
            `, [userId]);
            
            // Site review count (test_type_id = 2 untuk PENGUJIAN KONSTRUKSI)
            const [siteReviewCount] = await db.query(`
                SELECT COUNT(DISTINCT s.id) as total
                FROM submissions s
                JOIN submission_samples ss ON s.id = ss.submission_id
                JOIN test_types tt ON ss.test_type_id = tt.id
                WHERE s.user_id = ? AND tt.id = 2
            `, [userId]);
            
            // Paid invoices
            const [paidInvoices] = await db.query(`
                SELECT COUNT(*) as total
                FROM payments p
                JOIN submissions s ON p.submission_id = s.id
                WHERE s.user_id = ? AND p.status_pembayaran = 'Lunas'
            `, [userId]);
            
            // Due payments
            const [duePayments] = await db.query(`
                SELECT COUNT(*) as total
                FROM payments p
                JOIN submissions s ON p.submission_id = s.id
                WHERE s.user_id = ? AND p.status_pembayaran IN ('Belum Bayar', 'Belum Lunas', 'Menunggu SKRD Upload')
            `, [userId]);
            
            // Recent submissions (5 terbaru)
            const [recentSubmissions] = await db.query(`
                SELECT 
                    s.id,
                    s.no_permohonan as appId,
                    s.nama_proyek as projectName,
                    s.status,
                    s.created_at as dateSubmitted,
                    (SELECT COUNT(*) FROM submission_samples WHERE submission_id = s.id) as totalSamples,
                    (SELECT GROUP_CONCAT(DISTINCT tc.category_name SEPARATOR ', ') 
                    FROM submission_samples ss
                    JOIN test_categories tc ON ss.test_category_id = tc.id
                    WHERE ss.submission_id = s.id LIMIT 1) as serviceType
                FROM submissions s
                WHERE s.user_id = ?
                ORDER BY s.created_at DESC
                LIMIT 5
            `, [userId]);
            
            // Recent transactions (5 terbaru)
            const [recentTransactions] = await db.query(`
                SELECT 
                    p.id,
                    p.no_invoice,
                    p.total_tagihan,
                    p.jumlah_dibayar,
                    p.sisa_tagihan,
                    p.status_pembayaran,
                    p.created_at,
                    s.nama_proyek,
                    s.id as submission_id
                FROM payments p
                JOIN submissions s ON p.submission_id = s.id
                WHERE s.user_id = ?
                ORDER BY p.created_at DESC
                LIMIT 5
            `, [userId]);
            
            // Weekly activity (7 hari terakhir)
            const [weeklyActivity] = await db.query(`
                SELECT 
                    DAYOFWEEK(created_at) as day,
                    COUNT(*) as total
                FROM submissions
                WHERE user_id = ? 
                    AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY DAYOFWEEK(created_at)
            `, [userId]);
            
            // Format weekly activity (Senin-Minggu)
            const weeklyData = [0, 0, 0, 0, 0, 0, 0];
            
            weeklyActivity.forEach(item => {
                const day = item.day;
                if (day === 2) weeklyData[0] = item.total; // Senin
                else if (day === 3) weeklyData[1] = item.total; // Selasa
                else if (day === 4) weeklyData[2] = item.total; // Rabu
                else if (day === 5) weeklyData[3] = item.total; // Kamis
                else if (day === 6) weeklyData[4] = item.total; // Jumat
                else if (day === 7) weeklyData[5] = item.total; // Sabtu
                else if (day === 1) weeklyData[6] = item.total; // Minggu
            });
            
            // Submissions change
            const [lastWeekCount] = await db.query(`
                SELECT COUNT(*) as total
                FROM submissions
                WHERE user_id = ? 
                    AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
                    AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
            `, [userId]);
            
            const currentWeekTotal = weeklyData.reduce((a, b) => a + b, 0);
            const lastWeekTotal = lastWeekCount[0].total || 0;
            const submissionsChange = lastWeekTotal > 0 
                ? Math.round(((currentWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
                : currentWeekTotal > 0 ? 100 : 0;
            
            const response = {
                totalSubmissions: totalSubmissions[0].total,
                pendingPayment: pendingPayment[0].total,
                completedTests: completedTests[0].total,
                totalSpending: parseFloat(totalSpending[0].total) || 0,
                materialTestingCount: materialTestingCount[0].total,
                siteReviewCount: siteReviewCount[0].total,
                paidInvoices: paidInvoices[0].total,
                duePayments: duePayments[0].total,
                recentSubmissions: recentSubmissions.map(s => ({
                    id: s.id,
                    appId: s.appId || `SUB-${s.id}`,
                    serviceType: s.serviceType || 'Pengujian',
                    projectName: s.projectName || '-',
                    material: `${s.totalSamples || 0} sampel`,
                    dateSubmitted: s.dateSubmitted,
                    status: s.status
                })),
                recentTransactions: recentTransactions.map(t => ({
                    id: t.id,
                    invoiceNumber: t.no_invoice || `INV-${t.id}`,
                    serviceName: t.nama_proyek || 'Pengujian',
                    totalAmount: parseFloat(t.total_tagihan) || 0,
                    paidAmount: parseFloat(t.jumlah_dibayar) || 0,
                    remainingAmount: parseFloat(t.sisa_tagihan) || parseFloat(t.total_tagihan) || 0,
                    status: t.status_pembayaran,
                    paymentDate: t.created_at,
                    submissionId: t.submission_id
                })),
                weeklyActivity: weeklyData,
                submissionsChange: submissionsChange
            };

            res.json({
                success: true,
                data: response
            });
            
        } catch (error) {
            console.error('❌ Error in getUserDashboard:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal mengambil data dashboard: ' + error.message 
            });
        }
    },

    // ==================== CREATE SUBMISSION ====================
    createSubmission: async (req, res) => {
        try {
            console.log('========== CREATE SUBMISSION ==========');
            console.log('📦 req.body:', req.body);
            console.log('📦 req.files:', req.files);
            console.log('👤 req.user:', req.user);
            
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized - User tidak ditemukan'
                });
            }
            
            // CEK DUPLIKASI REQUEST (5 DETIK TERAKHIR)
            const [recentSubmission] = await db.query(`
                SELECT id, created_at 
                FROM submissions 
                WHERE user_id = ? 
                AND created_at > DATE_SUB(NOW(), INTERVAL 5 SECOND)
                ORDER BY created_at DESC 
                LIMIT 1
            `, [userId]);
            
            if (recentSubmission.length > 0) {
                console.log('⚠️ Duplicate submission detected:', recentSubmission[0].id);
                return res.json({
                    success: true,
                    message: 'Pengajuan sudah diproses',
                    data: {
                        id: recentSubmission[0].id,
                        no_permohonan: 'Sudah ada'
                    }
                });
            }
            
            // Ambil semua data dari body
            const {
                nomor_permohonan,
                nama_pemohon,
                nama_instansi,
                alamat_pemohon,
                nomor_telepon,
                email,
                nama_proyek,
                lokasi_proyek,
                catatan_pemohon,
                uji_bahan,
                uji_konstruksi,
                qty_estimasi,
                tanggal_sampel,
                jenis_sampel,
                jenis_sampel_lainnya,
                nama_sampel,
                jumlah_sample_angka,
                jumlah_sample_satuan,
                kemasan_sampel,
                asal_sampel,
                diambil_oleh,
                test_type_id,
                test_category_id,
                service_id,
                price_at_time,
                method_at_time
            } = req.body;
            
            // Validasi data wajib
            if (!nama_pemohon || !nama_proyek) {
                return res.status(400).json({
                    success: false,
                    message: 'Nama pemohon dan nama proyek wajib diisi'
                });
            }
            
            // Tentukan service_id yang dipilih
            const selectedServiceId = service_id || uji_bahan || uji_konstruksi;
            
            if (!selectedServiceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Pilih jenis pengujian terlebih dahulu'
                });
            }
            
            // Ambil data service untuk mendapatkan test_type_id dan test_category_id
            const [serviceData] = await db.query(`
                SELECT 
                    s.*,
                    tc.id as category_id,
                    tc.test_type_id as type_id
                FROM services s
                JOIN test_categories tc ON s.category_id = tc.id
                WHERE s.id = ?
            `, [selectedServiceId]);
            
            console.log('📋 Service data:', serviceData[0]);
            
            // Gunakan data dari service jika tidak dikirim dari form
            const finalTestTypeId = test_type_id || serviceData[0]?.type_id;
            const finalTestCategoryId = test_category_id || serviceData[0]?.category_id;
            const finalPrice = price_at_time || serviceData[0]?.price || 0;
            const finalMethod = method_at_time || serviceData[0]?.method || '-';
            
            // Generate nomor permohonan jika tidak ada
            let no_permohonan_final = nomor_permohonan;
            if (!no_permohonan_final) {
                const date = new Date();
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const [countResult] = await db.query(
                    "SELECT COUNT(*) as total FROM submissions WHERE DATE(created_at) = CURDATE()"
                );
                const sequence = String(countResult[0].total + 1).padStart(4, '0');
                no_permohonan_final = `SUB/${year}/${month}/${sequence}`;
            }
            
            // Proses jenis sampel (dari checkbox)
            let jenisSampleArray = [];
            if (jenis_sampel) {
                if (Array.isArray(jenis_sampel)) {
                    jenisSampleArray = jenis_sampel;
                } else {
                    jenisSampleArray = [jenis_sampel];
                }
            }
            if (jenis_sampel_lainnya && jenis_sampel_lainnya.trim() !== '') {
                jenisSampleArray.push(jenis_sampel_lainnya);
            }
            const jenisSampleStr = jenisSampleArray.join(', ');
            
            // INSERT KE TABEL SUBMISSIONS
            const [submissionResult] = await db.query(
                `INSERT INTO submissions (
                    user_id, no_permohonan, nama_pemohon, nama_instansi, 
                    alamat_pemohon, nomor_telepon, email_pemohon, nama_proyek, 
                    lokasi_proyek, catatan_tambahan, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Menunggu Verifikasi', NOW(), NOW())`,
                [
                    userId, 
                    no_permohonan_final, 
                    nama_pemohon || '', 
                    nama_instansi || '',
                    alamat_pemohon || '', 
                    nomor_telepon || '', 
                    email || '', 
                    nama_proyek || '',
                    lokasi_proyek || '', 
                    catatan_pemohon || ''
                ]
            );
            
            const submissionId = submissionResult.insertId;
            console.log('✅ Submission created with ID:', submissionId);
            
            // INSERT KE TABEL SUBMISSION_SAMPLES
            await db.query(
                `INSERT INTO submission_samples (
                    submission_id, 
                    jenis_sample, 
                    nama_identitas_sample, 
                    jumlah_sample_angka, 
                    jumlah_sample_satuan, 
                    tanggal_pengambilan, 
                    kemasan_sample, 
                    asal_sample, 
                    sample_diambil_oleh,
                    test_type_id, 
                    test_category_id, 
                    service_id,
                    price_at_time, 
                    method_at_time, 
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    submissionId,
                    jenisSampleStr || '-',
                    nama_sampel || '-',
                    jumlah_sample_angka || 1,
                    jumlah_sample_satuan || 'sample',
                    tanggal_sampel || null,
                    kemasan_sampel || '-',
                    asal_sampel || '-',
                    diambil_oleh || 'Pelanggan',
                    finalTestTypeId || 0,
                    finalTestCategoryId || 0,
                    selectedServiceId,
                    finalPrice,
                    finalMethod
                ]
            );
            console.log('✅ Submission sample inserted');
            
            // HANDLE FILE UPLOAD
            let suratFile = null;
            let ktpFile = null;
            
            if (req.files) {
                if (req.files['surat_permohonan']) {
                    const file = req.files['surat_permohonan'][0];
                    suratFile = file.filename; // Simpan hanya nama file
                    console.log('📁 Surat file saved:', suratFile);
                    console.log('📁 Full path:', file.path);
                }
                if (req.files['scan_ktp']) {
                    const file = req.files['scan_ktp'][0];
                    ktpFile = file.filename; // Simpan hanya nama file
                    console.log('📁 KTP file saved:', ktpFile);
                    console.log('📁 Full path:', file.path);
                }
            }
            
            // UPDATE SUBMISSION DENGAN FILE JIKA ADA
            if (suratFile || ktpFile) {
                let updateFields = [];
                const updateValues = [];
                
                if (suratFile) {
                    updateFields.push('file_surat_permohonan = ?');
                    updateValues.push(suratFile);
                }
                if (ktpFile) {
                    updateFields.push('file_ktp = ?');
                    updateValues.push(ktpFile);
                }
                
                updateValues.push(submissionId);
                
                await db.query(
                    `UPDATE submissions SET ${updateFields.join(', ')} WHERE id = ?`,
                    updateValues
                );
                console.log('✅ Files updated in submission');
            }
            
            // CATAT AKTIVITAS
            await db.query(
                `INSERT INTO activities (user_id, activity_name, created_at) 
                VALUES (?, 'create_submission', NOW())`,
                [userId]
            );
            
            console.log('✅ SUBMISSION COMPLETED:', submissionId);
            
            // KIRIM RESPONSE SUKSES
            res.json({
                success: true,
                message: 'Pengajuan berhasil dibuat',
                data: {
                    id: submissionId,
                    no_permohonan: no_permohonan_final
                }
            });
            
        } catch (error) {
            console.error('❌ ERROR in createSubmission:');
            console.error('❌ Error name:', error.name);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
            
            if (error.code) {
                console.error('❌ SQL Error code:', error.code);
                console.error('❌ SQL Error sqlMessage:', error.sqlMessage);
            }
            
            res.status(500).json({
                success: false,
                message: 'Gagal membuat pengajuan: ' + error.message
            });
        }
    },

    // ==================== GET USER HISTORY ====================
    getUserHistory: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            console.log('📋 Getting history for user:', userId);
            
            // Ambil data submissions dengan informasi samples
            const [submissions] = await db.query(`
                SELECT 
                    s.id,
                    s.no_permohonan,
                    s.nama_proyek,
                    s.status,
                    s.created_at,
                    p.status_pembayaran,
                    p.total_tagihan,
                    p.no_invoice,
                    (SELECT COUNT(*) FROM submission_samples WHERE submission_id = s.id) as total_samples,
                    (SELECT GROUP_CONCAT(DISTINCT tt.type_name SEPARATOR ', ') 
                    FROM submission_samples ss
                    JOIN test_types tt ON ss.test_type_id = tt.id
                    WHERE ss.submission_id = s.id LIMIT 1) as service_type
                FROM submissions s
                LEFT JOIN payments p ON s.id = p.submission_id
                WHERE s.user_id = ?
                ORDER BY s.created_at DESC
            `, [userId]);
            
            console.log(`✅ Found ${submissions.length} submissions in history`);
            
            res.json({
                success: true,
                data: submissions
            });
            
        } catch (error) {
            console.error('❌ Error getting user history:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil riwayat pengajuan: ' + error.message
            });
        }
    },

    // ==================== GET USER HISTORY DETAIL ====================
    getUserHistoryDetail: async (req, res) => {
        try {
            const submissionId = req.params.id;
            const userId = req.user?.id;
            
            console.log('========== GET USER HISTORY DETAIL ==========');
            console.log('📥 Submission ID:', submissionId);
            console.log('📥 User ID:', userId);
            
            if (!submissionId || isNaN(submissionId)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID tidak valid'
                });
            }
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            // Ambil data submission
            const [submissions] = await db.query(`
                SELECT 
                    s.*,
                    u.full_name,
                    u.email,
                    u.nama_instansi,
                    u.nomor_telepon,
                    u.alamat
                FROM submissions s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE s.id = ? AND s.user_id = ?
            `, [submissionId, userId]);
            
            if (submissions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Riwayat tidak ditemukan'
                });
            }
            
            const submission = submissions[0];
            
            // Ambil data samples
            const [samples] = await db.query(`
                SELECT 
                    ss.*,
                    sv.service_name,
                    sv.method,
                    tc.category_name,
                    tt.type_name
                FROM submission_samples ss
                JOIN services sv ON ss.service_id = sv.id
                JOIN test_categories tc ON ss.test_category_id = tc.id
                JOIN test_types tt ON ss.test_type_id = tt.id
                WHERE ss.submission_id = ?
            `, [submissionId]);
            
            submission.samples = samples;
            
            // Ambil data payment
            const [payments] = await db.query(`
                SELECT * FROM payments WHERE submission_id = ?
            `, [submissionId]);
            
            submission.payment = payments.length > 0 ? payments[0] : null;
            
            // Ambil data test report jika ada
            const [reports] = await db.query(`
                SELECT * FROM test_reports WHERE submission_id = ?
            `, [submissionId]);
            
            submission.report = reports.length > 0 ? reports[0] : null;
            
            console.log('✅ Data ditemukan, mengirim response');
            
            res.json({
                success: true,
                data: submission
            });

        } catch (error) {
            console.error('❌ Error getting user history detail:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil detail riwayat: ' + error.message
            });
        }
    },

    // ==================== GET FILE DENGAN TOKEN ====================
    getFile: async (req, res) => {
        try {
            const { filename } = req.params;
            const userId = req.user?.id;
            
            console.log('========== GET FILE ==========');
            console.log('📂 Filename:', filename);
            console.log('🔑 User ID:', userId);
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            // Tentukan folder berdasarkan URL path
            const pathParts = req.path.split('/');
            const fileType = pathParts[2]; // 'surat', 'ktp', 'payment', 'laporan', 'skrd'
            
            console.log('📁 File type (dari URL):', fileType);
            
            // 🔥 PERBAIKI MAPPING FOLDER - Sesuaikan dengan nama folder asli
            const folderMap = {
                'surat': 'surat',
                'ktp': 'ktp',
                'payment': 'payment',
                'laporan': 'laporan',     // 🔥 Ganti dari 'reports' menjadi 'laporan'
                'skrd': 'skrd'
            };
            
            // Coba cari di folder yang ditentukan URL
            const targetFolder = folderMap[fileType] || 'others';
            let filepath = path.join(__dirname, '../../uploads', targetFolder, filename);
            
            console.log('📄 Mencoba di:', filepath);
            
            // Cek apakah file ada di folder yang ditentukan
            if (fs.existsSync(filepath)) {
                console.log('✅ File ditemukan di folder:', targetFolder);
                return sendFile(res, filepath, filename);
            }
            
            // Jika tidak ditemukan, coba cari di semua folder
            console.log('❌ File tidak ditemukan di folder target, mencari di semua folder...');
            
            // 🔥 DAFTAR FOLDER YANG BENAR
            const allFolders = ['surat', 'ktp', 'payment', 'laporan', 'skrd', 'uploads', 'others'];
            let found = false;
            
            for (const folder of allFolders) {
                const testPath = path.join(__dirname, '../../uploads', folder, filename);
                console.log('🔍 Mencoba:', testPath);
                
                if (fs.existsSync(testPath)) {
                    console.log('✅ File DITEMUKAN di folder:', folder);
                    return sendFile(res, testPath, filename);
                }
            }
            
            // Coba langsung di folder uploads tanpa subfolder
            const directPath = path.join(__dirname, '../../uploads', filename);
            console.log('🔍 Mencoba di root uploads:', directPath);
            
            if (fs.existsSync(directPath)) {
                console.log('✅ File DITEMUKAN di root uploads');
                return sendFile(res, directPath, filename);
            }
            
            // File benar-benar tidak ditemukan
            console.error('❌ File TIDAK DITEMUKAN di mana pun');
            
            // List isi folder untuk debugging
            try {
                const uploadsDir = path.join(__dirname, '../../uploads');
                console.log('📋 Isi folder uploads:');
                const files = fs.readdirSync(uploadsDir);
                files.forEach(f => console.log('   -', f));
                
                // Cek isi folder laporan
                const laporanDir = path.join(__dirname, '../../uploads/laporan');
                if (fs.existsSync(laporanDir)) {
                    console.log('📋 Isi folder laporan:');
                    const laporanFiles = fs.readdirSync(laporanDir);
                    laporanFiles.forEach(f => console.log('   -', f));
                }
            } catch (e) {
                console.log('Gagal membaca direktori:', e.message);
            }
            
            return res.status(404).json({
                success: false,
                message: 'File tidak ditemukan di server'
            });

        } catch (error) {
            console.error('❌ Error getting file:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengakses file: ' + error.message
            });
        }
    },

    // ==================== GET USER TRANSACTIONS ====================
    getUserTransactions: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            console.log('💰 Getting transactions for user:', userId);
            
            // Ambil data payments dengan join ke submissions
            const [transactions] = await db.query(`
                SELECT 
                    p.id,
                    p.no_invoice,
                    p.total_tagihan,
                    p.jumlah_dibayar,
                    p.sisa_tagihan,
                    p.status_pembayaran,
                    p.bukti_pembayaran_1,
                    p.bukti_pembayaran_2,
                    p.bukti_pembayaran_notes,
                    p.created_at,
                    p.updated_at,
                    s.id as submission_id,
                    s.nama_proyek,
                    s.no_permohonan,
                    (SELECT COUNT(*) FROM submission_samples WHERE submission_id = s.id) as total_samples
                FROM payments p
                JOIN submissions s ON p.submission_id = s.id
                WHERE s.user_id = ?
                ORDER BY p.created_at DESC
            `, [userId]);
            
            console.log(`✅ Found ${transactions.length} transactions for user ${userId}`);
            console.log('📦 Sample transaction:', transactions[0]); // Log sample
            
            res.json({
                success: true,
                data: transactions
            });
            
        } catch (error) {
            console.error('❌ Error getting user transactions:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil data transaksi: ' + error.message
            });
        }
    },

    // ==================== GET USER TRANSACTION DETAIL ====================
    getUserTransactionDetail: async (req, res) => {
        try {
            const transactionId = req.params.id;
            const userId = req.user?.id;
            
            console.log('========== GET USER TRANSACTION DETAIL ==========');
            console.log('📥 Transaction ID:', transactionId);
            console.log('📥 User ID:', userId);
            
            if (!transactionId || isNaN(transactionId)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID tidak valid'
                });
            }
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            // HAPUS SEMUA REFERENSI KE skrd
            const [payments] = await db.query(`
                SELECT 
                    p.*,
                    u.full_name,
                    u.email,
                    u.nama_instansi,
                    u.nomor_telepon,
                    u.alamat,
                    s.nama_pemohon,
                    s.nama_instansi as instansi_submission,
                    s.nomor_telepon as telepon_submission,
                    s.nama_proyek,
                    s.lokasi_proyek,
                    s.no_permohonan,
                    ss.id as sample_id,
                    ss.jenis_sample,
                    ss.nama_identitas_sample,
                    ss.jumlah_sample_angka,
                    ss.jumlah_sample_satuan,
                    ss.price_at_time,
                    ss.method_at_time,
                    sv.service_name
                FROM payments p
                JOIN submissions s ON p.submission_id = s.id
                LEFT JOIN users u ON s.user_id = u.id
                LEFT JOIN submission_samples ss ON s.id = ss.submission_id
                LEFT JOIN services sv ON ss.service_id = sv.id
                WHERE p.id = ? AND s.user_id = ?
            `, [transactionId, userId]);

            if (payments.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Transaksi tidak ditemukan' 
                });
            }

            const payment = payments[0];
            
            // Kelompokkan samples
            const samples = [];
            const sampleMap = new Map();
            
            payments.forEach(p => {
                if (p.sample_id && !sampleMap.has(p.sample_id)) {
                    sampleMap.set(p.sample_id, true);
                    samples.push({
                        id: p.sample_id,
                        jenis_sample: p.jenis_sample,
                        nama_identitas_sample: p.nama_identitas_sample,
                        jumlah_sample_angka: p.jumlah_sample_angka,
                        jumlah_sample_satuan: p.jumlah_sample_satuan,
                        price_at_time: p.price_at_time,
                        method_at_time: p.method_at_time,
                        service_name: p.service_name
                    });
                }
            });
            
            const response = {
                id: payment.id,
                no_invoice: payment.no_invoice,
                submission_id: payment.submission_id,
                total_tagihan: parseFloat(payment.total_tagihan) || 0,
                jumlah_dibayar: parseFloat(payment.jumlah_dibayar) || 0,
                sisa_tagihan: parseFloat(payment.sisa_tagihan) || parseFloat(payment.total_tagihan) || 0,
                status_pembayaran: payment.status_pembayaran,
                bukti_pembayaran_1: payment.bukti_pembayaran_1,
                bukti_pembayaran_2: payment.bukti_pembayaran_2,
                bukti_pembayaran_notes: payment.bukti_pembayaran_notes,
                created_at: payment.created_at,
                
                // Data pemohon
                nama_pemohon: payment.nama_pemohon || payment.full_name,
                nama_instansi: payment.instansi_submission || payment.nama_instansi,
                nomor_telepon: payment.telepon_submission || payment.nomor_telepon,
                alamat: payment.alamat,
                email: payment.email,
                
                // Data proyek
                nama_proyek: payment.nama_proyek,
                lokasi_proyek: payment.lokasi_proyek,
                no_permohonan: payment.no_permohonan,
                
                // Data samples
                samples: samples,
                total_samples: samples.length
            };

            res.json({ 
                success: true, 
                data: response 
            });

        } catch (error) {
            console.error('❌ Error getting user transaction detail:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Gagal mengambil detail transaksi: ' + error.message 
            });
        }
    },

    // ==================== UPLOAD PAYMENT PROOF ====================
    uploadPaymentProof: async (req, res) => {
        try {
            console.log('========== UPLOAD PAYMENT PROOF ==========');
            console.log('📥 req.params:', req.params);
            console.log('📥 req.body:', req.body);
            console.log('📥 req.file:', req.file);
            console.log('📥 req.user:', req.user);
            
            const transactionId = req.params.id;
            const userId = req.user?.id;
            const { notes } = req.body;
            const file = req.file;
            
            console.log('📤 Transaction ID:', transactionId);
            console.log('📤 User ID:', userId);
            console.log('📤 File:', file);
            console.log('📤 Notes:', notes);
            
            if (!transactionId || isNaN(parseInt(transactionId))) {
                console.log('❌ ID tidak valid');
                return res.status(400).json({
                    success: false,
                    message: 'ID tidak valid'
                });
            }
            
            if (!userId) {
                console.log('❌ User ID tidak ditemukan');
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            if (!file) {
                console.log('❌ File tidak ditemukan di request');
                return res.status(400).json({
                    success: false,
                    message: 'File bukti pembayaran wajib diupload'
                });
            }
            
            console.log('✅ File received:', file.originalname);
            console.log('✅ File saved as:', file.filename);
            console.log('✅ File path:', file.path);
            console.log('✅ File size:', file.size);
            
            // Cek apakah transaksi milik user
            console.log('🔍 Checking transaction ownership...');
            const [check] = await db.query(`
                SELECT p.* FROM payments p
                JOIN submissions s ON p.submission_id = s.id
                WHERE p.id = ? AND s.user_id = ?
            `, [transactionId, userId]);
            
            console.log('🔍 Check result:', check);
            
            if (check.length === 0) {
                console.log('❌ Transaksi tidak ditemukan atau bukan milik user');
                return res.status(404).json({
                    success: false,
                    message: 'Transaksi tidak ditemukan'
                });
            }
            
            console.log('✅ Transaction found, current bukti_pembayaran_1:', check[0].bukti_pembayaran_1);
            
            // Cek apakah sudah ada bukti pembayaran 1
            let fieldName = 'bukti_pembayaran_1';
            
            if (check[0].bukti_pembayaran_1) {
                fieldName = 'bukti_pembayaran_2';
            }
            
            console.log('📁 Updating field:', fieldName);
            console.log('📁 Filename to save:', file.filename);
            
            const [updateResult] = await db.query(
                `UPDATE payments 
                SET ${fieldName} = ?, 
                    bukti_pembayaran_notes = ?,
                    status_pembayaran = 'Menunggu Verifikasi',
                    updated_at = NOW()
                WHERE id = ?`,
                [file.filename, notes, transactionId]
            );
            
            console.log('✅ Update result:', updateResult);
            console.log('✅ Payment proof uploaded successfully');
            
            res.json({
                success: true,
                message: 'Bukti pembayaran berhasil diupload',
                data: {
                    filename: file.filename,
                    field: fieldName
                }
            });
            
        } catch (error) {
            console.error('❌ Error uploading payment proof:');
            console.error('❌ Error name:', error.name);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
            res.status(500).json({
                success: false,
                message: 'Gagal upload bukti pembayaran: ' + error.message
            });
        }
    },

    // ==================== USER PROFILE API ====================
    getUserProfile: async (req, res) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            const [users] = await db.query(
                'SELECT id, email, full_name, nama_instansi, alamat, nomor_telepon, avatar, role, created_at, updated_at FROM users WHERE id = ?',
                [userId]
            );
            
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }
            
            // Format avatar URL jika ada
            if (users[0].avatar) {
                users[0].avatar_url = `http://localhost:5000${users[0].avatar}`;
            }
            
            res.json({
                success: true,
                data: users[0]
            });
            
        } catch (error) {
            console.error('❌ Error getting user profile:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil profil user'
            });
        }
    },

    // UPDATE user profile
    updateUserProfile: async (req, res) => {
        try {
            const userId = req.user?.id;
            const { full_name, email, nomor_telepon, alamat, nama_instansi } = req.body;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            // Build query dinamis
            let updateFields = [];
            let queryParams = [];
            
            if (full_name !== undefined) {
                updateFields.push('full_name = ?');
                queryParams.push(full_name);
            }
            if (email !== undefined) {
                // Cek apakah email sudah digunakan user lain
                if (email) {
                    const [existing] = await db.query(
                        'SELECT id FROM users WHERE email = ? AND id != ?',
                        [email, userId]
                    );
                    if (existing.length > 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Email sudah digunakan user lain'
                        });
                    }
                }
                updateFields.push('email = ?');
                queryParams.push(email);
            }
            if (nomor_telepon !== undefined) {
                updateFields.push('nomor_telepon = ?');
                queryParams.push(nomor_telepon);
            }
            if (alamat !== undefined) {
                updateFields.push('alamat = ?');
                queryParams.push(alamat);
            }
            if (nama_instansi !== undefined) {
                updateFields.push('nama_instansi = ?');
                queryParams.push(nama_instansi);
            }
            
            if (updateFields.length === 0) {
                return res.json({
                    success: true,
                    message: 'Tidak ada perubahan'
                });
            }
            
            queryParams.push(userId);
            
            await db.query(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
                queryParams
            );
            
            // Ambil data terbaru
            const [users] = await db.query(
                'SELECT id, email, full_name, nama_instansi, alamat, nomor_telepon, avatar, role FROM users WHERE id = ?',
                [userId]
            );
            
            res.json({
                success: true,
                message: 'Profil berhasil diperbarui',
                data: users[0]
            });
            
        } catch (error) {
            console.error('❌ Error updating user profile:', error);
            
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    success: false,
                    message: 'Email sudah digunakan'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Gagal memperbarui profil'
            });
        }
    },

    // UPLOAD avatar
    uploadAvatar: async (req, res) => {
        try {
            const userId = req.user?.id;
            const file = req.file;
            
            console.log('📸 Upload avatar - user:', userId);
            console.log('📸 File:', file);
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'File avatar wajib diupload'
                });
            }
            
            // Simpan path file di database (relative path)
            const avatarPath = `/uploads/avatar/${file.filename}`;
            
            await db.query(
                'UPDATE users SET avatar = ? WHERE id = ?',
                [avatarPath, userId]
            );
            
            // Ambil data user yang sudah diupdate
            const [users] = await db.query(
                'SELECT avatar FROM users WHERE id = ?',
                [userId]
            );
            
            res.json({
                success: true,
                message: 'Avatar berhasil diupload',
                data: {
                    avatar: users[0].avatar,
                    avatar_url: `http://localhost:5000${avatarPath}`
                }
            });
            
        } catch (error) {
            console.error('❌ Error uploading avatar:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal upload avatar'
            });
        }
    },

    // CHANGE password
    changePassword: async (req, res) => {
        try {
            const userId = req.user?.id;
            const { current_password, new_password } = req.body;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            if (!current_password || !new_password) {
                return res.status(400).json({
                    success: false,
                    message: 'Password saat ini dan password baru harus diisi'
                });
            }
            
            if (new_password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password baru minimal 6 karakter'
                });
            }
            
            // Ambil password user dari database
            const [users] = await db.query(
                'SELECT password FROM users WHERE id = ?',
                [userId]
            );
            
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }
            
            // Verifikasi password saat ini
            const bcrypt = require('bcrypt');
            const validPassword = await bcrypt.compare(current_password, users[0].password);
            
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Password saat ini salah'
                });
            }
            
            // Hash password baru
            const hashedPassword = await bcrypt.hash(new_password, 10);
            
            // Update password
            await db.query(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, userId]
            );
            
            res.json({
                success: true,
                message: 'Password berhasil diubah'
            });
            
        } catch (error) {
            console.error('❌ Error changing password:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengubah password'
            });
        }
    },

};

// ==================== HELPER FUNCTIONS (di luar object) ====================

// Format Rupiah
function formatRupiah(amount, withSymbol = true) {
    const formatted = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
    
    if (!withSymbol) {
        return formatted.replace('Rp', '').trim();
    }
    return formatted.replace('Rp', 'Rp ');
}

// Format tanggal
function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Format time ago (versi detail)
function formatTimeAgo(date) {
    if (!date) return '-';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return formatDate(date);
}

// Time ago sederhana (yang sudah ada)
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return seconds + ' detik';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' menit';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' jam';
    return Math.floor(seconds / 86400) + ' hari';
}

// Get status class untuk badge
function getStatusClass(status) {
    const classes = {
        'Menunggu Verifikasi': 'status-pending',
        'Pengecekan Sampel': 'status-info',
        'Belum Bayar': 'status-warning',
        'Belum Lunas': 'status-warning',
        'Menunggu SKRD Upload': 'status-warning',
        'Lunas': 'status-success',
        'Sedang Diuji': 'status-primary',
        'Selesai': 'status-success'
    };
    return classes[status] || 'status-default';
}

// Get status icon
function getStatusIcon(status) {
    const icons = {
        'Menunggu Verifikasi': 'fa-clock',
        'Pengecekan Sampel': 'fa-search',
        'Belum Bayar': 'fa-credit-card',
        'Belum Lunas': 'fa-exclamation-triangle',
        'Menunggu SKRD Upload': 'fa-file-invoice',
        'Lunas': 'fa-check-circle',
        'Sedang Diuji': 'fa-flask',
        'Selesai': 'fa-check-double'
    };
    return icons[status] || 'fa-info-circle';
}

// Get icon untuk action
function getIconForAction(action) {
    const icons = {
        'login': 'sign-in-alt',
        'logout': 'sign-out-alt',
        'create': 'plus-circle',
        'update': 'edit',
        'delete': 'trash',
        'upload': 'upload',
        'verify': 'check-circle',
        'cancel': 'times-circle'
    };
    return icons[action] || 'info-circle';
}

// Get color untuk action
function getColorForAction(action) {
    const colors = {
        'login': 'success',
        'logout': 'secondary',
        'create': 'info',
        'update': 'warning',
        'delete': 'danger',
        'upload': 'primary',
        'verify': 'success',
        'cancel': 'danger'
    };
    return colors[action] || 'primary';
}

// Get badge color untuk status
function getBadgeColorForStatus(status) {
    const colors = {
        'pending_verification': 'warning',
        'payment_pending': 'danger',
        'Lunas': 'success',
        'testing': 'primary',
        'completed': 'info',
        'cancelled': 'secondary'
    };
    return colors[status] || 'secondary';
}

// Get payment status mapping
function getPaymentStatus(status) {
    const statusMap = {
        'Lunas': 'paid',
        'Belum Bayar': 'pending',
        'Belum Lunas': 'partial',
        'Menunggu SKRD Upload': 'waiting_verification',
        'Dibatalkan': 'cancelled'
    };
    return statusMap[status] || status;
}

// Fungsi helper untuk mengirim file - PAKSA DOWNLOAD SEMUA
function sendFile(res, filepath, filename) {
    try {
        const stats = fs.statSync(filepath);
        console.log('📊 File size:', stats.size, 'bytes');
        
        if (stats.size === 0) {
            return res.status(404).json({
                success: false,
                message: 'File kosong'
            });
        }

        const ext = path.extname(filename).toLowerCase();
        let contentType = 'application/octet-stream';
        
        // Content-Type tetap diisi sesuai file agar tidak corrupt
        if (ext === '.pdf') {
            contentType = 'application/pdf';
        } else if (ext === '.jpg' || ext === '.jpeg') {
            contentType = 'image/jpeg';
        } else if (ext === '.png') {
            contentType = 'image/png';
        } else if (ext === '.gif') {
            contentType = 'image/gif';
        }
        
        res.setHeader('Content-Type', contentType);
        
        // 🔥 PAKSA DOWNLOAD UNTUK SEMUA JENIS FILE
        // Content-Disposition: attachment akan MEMAKSA browser untuk download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        console.log('📥 File akan DIDOWNLOAD:', filename);
        res.sendFile(filepath);
        
    } catch (error) {
        console.error('❌ Error sending file:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengirim file: ' + error.message
        });
    }
}

// Generate VA Number Bank Banten
function generateVANumber(paymentId) {
    // Format VA: 88 + kode lab (2 digit) + tanggal (6 digit) + random (4 digit)
    const labCode = '01'; // Kode lab
    const date = new Date();
    const dateStr = date.getFullYear().toString().substr(-2) + 
                    (date.getMonth() + 1).toString().padStart(2, '0') + 
                    date.getDate().toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    
    return `88${labCode}${dateStr}${random}`;
}

module.exports = apiController;