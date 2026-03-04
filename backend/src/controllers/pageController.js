// Import database connection
const db = require('../config/database'); // Sesuaikan dengan konfigurasi database Anda

const pageController = {
    // ===========================
    // 1. HALAMAN PUBLIK (USER)
    // ===========================
    
    getLandingPage: async (req, res) => {
        try {
            // Ambil data layanan dari database
            const [accreditedServices] = await db.query(
                "SELECT * FROM services WHERE accredited = true ORDER BY category, name"
            );
            
            const [nonAccreditedServices] = await db.query(
                "SELECT * FROM services WHERE accredited = false ORDER BY category, name"
            );
            
            // Ambil data harga terbaru
            const [prices] = await db.query(
                "SELECT * FROM services WHERE is_active = true ORDER BY category LIMIT 4"
            );

            const parameters = {
                accredited: accreditedServices.map(s => s.name),
                nonAccredited: nonAccreditedServices.map(s => s.name)
            };

            res.render('index', { 
                title: 'Beranda - UPTD Lab',
                active: 'home', 
                params: parameters,
                prices: prices
            });
        } catch (error) {
            console.error('Error mengambil data landing page:', error);
            // Fallback ke data default jika terjadi error
            res.render('index', { 
                title: 'Beranda - UPTD Lab',
                active: 'home', 
                params: { accredited: [], nonAccredited: [] },
                prices: []
            });
        }
    },

    getProfilePage: (req, res) => {
        res.render('profile', { title: 'Profil Kami', active: 'profile' });
    },

    getServicesPage: async (req, res) => {
        try {
            // Ambil semua layanan dari database
            const [services] = await db.query(`
                SELECT s.*, c.name as category_name 
                FROM services s
                JOIN service_categories c ON s.category_id = c.id
                WHERE s.is_active = true
                ORDER BY c.sort_order, s.name
            `);

            // Kelompokkan berdasarkan kategori
            const servicesByCategory = {};
            services.forEach(service => {
                if (!servicesByCategory[service.category_name]) {
                    servicesByCategory[service.category_name] = {
                        categoryName: service.category_name,
                        items: []
                    };
                }
                servicesByCategory[service.category_name].items.push({
                    id: service.id,
                    name: service.name,
                    accredited: service.accredited === 1,
                    type: service.type,
                    price: service.price,
                    duration: service.duration,
                    unit: service.unit,
                    method: service.method
                });
            });

            res.render('services', { 
                title: 'Pelayanan & Tarif', 
                active: 'pelayanan', 
                services: Object.values(servicesByCategory)
            });
        } catch (error) {
            console.error('Error mengambil data services:', error);
            // Fallback ke data default
            res.render('services', { 
                title: 'Pelayanan & Tarif', 
                active: 'pelayanan', 
                services: []
            });
        }
    },

    getEstimasi: async (req, res) => {
        try {
            // Ambil data untuk estimasi
            const [services] = await db.query(`
                SELECT s.*, c.name as category_name 
                FROM services s
                JOIN service_categories c ON s.category_id = c.id
                WHERE s.is_active = true AND s.show_in_estimator = true
                ORDER BY c.sort_order, s.name
            `);

            // Format data untuk estimasi
            const servicesData = [];
            let currentCategory = '';
            let categoryItems = [];

            services.forEach(service => {
                if (service.category_name !== currentCategory) {
                    if (currentCategory !== '') {
                        servicesData.push({
                            categoryName: currentCategory,
                            items: categoryItems
                        });
                    }
                    currentCategory = service.category_name;
                    categoryItems = [];
                }
                
                categoryItems.push({
                    name: service.name,
                    type: service.type,
                    price: service.price,
                    duration: service.duration
                });
            });

            // Push kategori terakhir
            if (currentCategory !== '') {
                servicesData.push({
                    categoryName: currentCategory,
                    items: categoryItems
                });
            }

            res.render('estimasi', {
                title: 'Estimasi Biaya - UPTD Lab',
                active: 'estimasi',
                services: servicesData
            });
        } catch (error) {
            console.error('Error mengambil data estimasi:', error);
            res.render('estimasi', {
                title: 'Estimasi Biaya - UPTD Lab',
                active: 'estimasi',
                services: []
            });
        }
    },

    // ===========================
    // 2. HALAMAN ADMIN (DENGAN DATABASE)
    // ===========================
    
    adminDashboard: async (req, res) => {
        try {
            // Ambil statistik dashboard dari database
            const [incomeResult] = await db.query(`
                SELECT COALESCE(SUM(total_amount), 0) as total_income 
                FROM payments 
                WHERE payment_status = 'paid' 
                AND MONTH(created_at) = MONTH(CURRENT_DATE())
                AND YEAR(created_at) = YEAR(CURRENT_DATE())
            `);

            const [pendingResult] = await db.query(`
                SELECT COUNT(*) as pending_count 
                FROM submissions 
                WHERE status = 'pending_verification'
            `);

            const [completedResult] = await db.query(`
                SELECT COUNT(*) as completed_count 
                FROM submissions 
                WHERE status = 'completed'
            `);

            const [newUsersResult] = await db.query(`
                SELECT COUNT(*) as new_users 
                FROM users 
                WHERE DATE(created_at) = CURRENT_DATE()
                AND role = 'customer'
            `);

            // Ambil aktivitas terbaru
            const [recentActivities] = await db.query(`
                SELECT 
                    a.*,
                    u.company_name,
                    u.name as user_name
                FROM activities a
                JOIN users u ON a.user_id = u.id
                ORDER BY a.created_at DESC
                LIMIT 5
            `);

            // Ambil submissions terbaru untuk tabel
            const [recentSubmissions] = await db.query(`
                SELECT 
                    s.id,
                    s.registration_number,
                    u.company_name,
                    s.test_type,
                    s.created_at,
                    s.status
                FROM submissions s
                JOIN users u ON s.user_id = u.id
                ORDER BY s.created_at DESC
                LIMIT 5
            `);

            // Data untuk grafik pendapatan (6 bulan terakhir)
            const [chartData] = await db.query(`
                SELECT 
                    MONTHNAME(created_at) as month,
                    COALESCE(SUM(total_amount), 0) as total
                FROM payments 
                WHERE payment_status = 'paid'
                AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
                GROUP BY MONTH(created_at)
                ORDER BY created_at
            `);

            const stats = {
                income: `Rp ${new Intl.NumberFormat('id-ID').format(incomeResult[0].total_income || 0)}`,
                pending: pendingResult[0].pending_count || 0,
                completed: completedResult[0].completed_count || 0,
                newUsers: newUsersResult[0].new_users || 0
            };

            res.render('admin/dashboard', { 
                page: 'dashboard', 
                title: 'Dashboard Summary', 
                stats: stats,
                activities: recentActivities,
                submissions: recentSubmissions,
                chartLabels: chartData.map(d => d.month),
                chartValues: chartData.map(d => d.total)
            });

        } catch (error) {
            console.error('Error mengambil data dashboard:', error);
            // Fallback ke data dummy jika terjadi error
            res.render('admin/dashboard', { 
                page: 'dashboard', 
                title: 'Dashboard Summary', 
                stats: {
                    income: 'Rp 124.500.000',
                    pending: 12,
                    completed: 48,
                    newUsers: 5
                },
                activities: [],
                submissions: [],
                chartLabels: [],
                chartValues: []
            });
        }
    },

    adminSubmissions: async (req, res) => {
        try {
            const [submissions] = await db.query(`
                SELECT 
                    s.id,
                    s.registration_number as id,
                    u.company_name as company,
                    s.test_type as type,
                    DATE_FORMAT(s.created_at, '%d %b %Y') as date,
                    CASE 
                        WHEN s.status = 'pending_verification' THEN 'Menunggu Verifikasi'
                        WHEN s.status = 'payment_pending' THEN 'Menunggu Pembayaran'
                        WHEN s.status = 'paid' THEN 'Lunas'
                        WHEN s.status = 'testing' THEN 'Sedang Diuji'
                        WHEN s.status = 'completed' THEN 'Selesai'
                        ELSE s.status
                    END as status
                FROM submissions s
                JOIN users u ON s.user_id = u.id
                ORDER BY s.created_at DESC
            `);

            res.render('admin/submissions', { 
                page: 'submissions', 
                title: 'Data Pengajuan Masuk', 
                data: submissions 
            });
        } catch (error) {
            console.error('Error mengambil data submissions:', error);
            res.render('admin/submissions', { 
                page: 'submissions', 
                title: 'Data Pengajuan Masuk', 
                data: [] 
            });
        }
    },

    adminDetailSubmission: async (req, res) => {
        try {
            const id = req.params.id;
            
            // Ambil detail submission
            const [submission] = await db.query(`
                SELECT 
                    s.*,
                    u.company_name,
                    u.name as pic_name,
                    u.phone,
                    u.email,
                    u.address
                FROM submissions s
                JOIN users u ON s.user_id = u.id
                WHERE s.id = ?
            `, [id]);

            // Ambil detail item pengujian
            const [testItems] = await db.query(`
                SELECT 
                    si.*,
                    sv.name as service_name,
                    sv.price as unit_price
                FROM submission_items si
                JOIN services sv ON si.service_id = sv.id
                WHERE si.submission_id = ?
            `, [id]);

            // Ambil history pembayaran
            const [payments] = await db.query(`
                SELECT * FROM payments 
                WHERE submission_id = ?
                ORDER BY created_at DESC
            `, [id]);

            res.render('admin/detail-submission', { 
                page: 'submissions', 
                title: 'Detail Pengajuan', 
                idPengajuan: id,
                submission: submission[0],
                testItems: testItems,
                payments: payments
            });
        } catch (error) {
            console.error('Error mengambil detail submission:', error);
            res.render('admin/detail-submission', { 
                page: 'submissions', 
                title: 'Detail Pengajuan', 
                idPengajuan: req.params.id,
                submission: null,
                testItems: [],
                payments: []
            });
        }
    },

    adminSKRD: async (req, res) => {
        try {
            const [invoices] = await db.query(`
                SELECT 
                    p.id,
                    p.invoice_number as no,
                    u.company_name as company,
                    CONCAT('Rp ', FORMAT(p.total_amount, 0)) as total,
                    CASE 
                        WHEN p.payment_status = 'paid' THEN 'Lunas'
                        WHEN p.payment_status = 'pending' THEN 'Menunggu'
                        ELSE p.payment_status
                    END as status,
                    DATE_FORMAT(p.payment_date, '%Y-%m-%d') as date
                FROM payments p
                JOIN users u ON p.user_id = u.id
                ORDER BY p.created_at DESC
            `);

            res.render('admin/skrd', { 
                page: 'skrd', 
                title: 'Manajemen SKRD & Pembayaran', 
                invoices: invoices 
            });
        } catch (error) {
            console.error('Error mengambil data invoices:', error);
            res.render('admin/skrd', { 
                page: 'skrd', 
                title: 'Manajemen SKRD & Pembayaran', 
                invoices: [] 
            });
        }
    },

    adminDetailSKRD: async (req, res) => {
        try {
            const id = req.params.id;
            
            const [invoice] = await db.query(`
                SELECT 
                    p.*,
                    u.company_name,
                    u.name as customer_name,
                    u.address,
                    u.phone,
                    u.email
                FROM payments p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = ?
            `, [id]);

            const [items] = await db.query(`
                SELECT 
                    pi.*,
                    s.name as service_name
                FROM payment_items pi
                JOIN services s ON pi.service_id = s.id
                WHERE pi.payment_id = ?
            `, [id]);

            res.render('admin/detail-skrd', { 
                page: 'skrd', 
                title: 'Detail Invoice / SKRD', 
                idInvoice: id,
                invoice: invoice[0],
                items: items
            });
        } catch (error) {
            console.error('Error mengambil detail invoice:', error);
            res.render('admin/detail-skrd', { 
                page: 'skrd', 
                title: 'Detail Invoice / SKRD', 
                idInvoice: req.params.id,
                invoice: null,
                items: []
            });
        }
    },
    
    adminReports: async (req, res) => {
        try {
            // Ambil data laporan bulanan
            const [monthlyReports] = await db.query(`
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    COUNT(*) as total_submissions,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    (SELECT COALESCE(SUM(total_amount), 0) 
                     FROM payments 
                     WHERE payment_status = 'paid' 
                     AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(submissions.created_at, '%Y-%m')
                    ) as total_revenue
                FROM submissions
                WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month DESC
            `);

            res.render('admin/reports', { 
                page: 'reports', 
                title: 'Laporan & Statistik',
                reports: monthlyReports
            });
        } catch (error) {
            console.error('Error mengambil data reports:', error);
            res.render('admin/reports', { 
                page: 'reports', 
                title: 'Laporan & Statistik' 
            });
        }
    },

    adminUsers: async (req, res) => {
        try {
            const [users] = await db.query(`
                SELECT 
                    id,
                    name,
                    email,
                    phone,
                    company_name as company,
                    status,
                    DATE_FORMAT(created_at, '%d %b %Y') as joined_at
                FROM users 
                WHERE role = 'customer'
                ORDER BY created_at DESC
            `);

            res.render('admin/users', { 
                page: 'users',
                title: 'Manajemen Pemohon', 
                users: users 
            });
        } catch (error) {
            console.error('Error mengambil data users:', error);
            res.render('admin/users', { 
                page: 'users',
                title: 'Manajemen Pemohon', 
                users: [] 
            });
        }
    },

    adminSettings: (req, res) => {
        res.render('admin/settings', { page: 'settings', title: 'Pengaturan Aplikasi' });
    }
};

module.exports = pageController;