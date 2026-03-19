// middleware/auth.js

const authMiddleware = {
    // Middleware untuk redirect jika sudah login
    redirectIfAuthenticated: (req, res, next) => {
        console.log('🔐 Redirect if authenticated check...');
        console.log('📋 Session user:', req.session?.user);
        
        if (req.session && req.session.user) {
            console.log('✅ User sudah login, redirect ke dashboard sesuai role');
            if (req.session.user.role === 'admin' || req.session.user.role === 'superadmin') {
                return res.redirect('/admin/dashboard');
            } else if (req.session.user.role === 'pelanggan') {
                return res.redirect('/user/dashboard');
            }
        }
        
        console.log('✅ User belum login, lanjutkan');
        next();
    },
    
    // Middleware untuk halaman admin
    verifyPageAccess: (req, res, next) => {
        console.log('🔐 Verifikasi akses admin...');
        console.log('📋 Session ID:', req.sessionID);
        console.log('📋 Session user:', req.session?.user);
        console.log('📋 Requested URL:', req.originalUrl);
        
        if (!req.session || !req.session.user) {
            console.log('❌ Tidak ada session user, redirect ke admin login');
            return res.redirect('/admin/login');
        }
        
        // CEK ROLE - HARUS admin atau superadmin
        if (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin') {
            console.log('❌ Role tidak sesuai:', req.session.user.role);
            
            // Jika user biasa (pelanggan) coba akses halaman admin, redirect ke dashboard user
            if (req.session.user.role === 'pelanggan') {
                return res.redirect('/user/dashboard');
            }
            
            // Jika role lain, redirect ke home
            return res.redirect('/');
        }
        
        console.log('✅ Akses admin diberikan untuk:', req.session.user.email);
        next();
    },
    
    // Middleware untuk halaman user
    verifyUserAccess: (req, res, next) => {
        console.log('🔐 Verifikasi akses user...');
        console.log('📋 Session user:', req.session?.user);
        console.log('📋 Requested URL:', req.originalUrl);
        
        if (!req.session || !req.session.user) {
            console.log('❌ Tidak ada session user, redirect ke login user');
            return res.redirect('/login'); // LANGSUNG KE LOGIN USER, BUKAN ADMIN LOGIN
        }
        
        if (req.session.user.role === 'pelanggan') {
            console.log('✅ Akses user diberikan untuk:', req.session.user.email);
            return next();
        }
        
        if (req.session.user.role === 'admin' || req.session.user.role === 'superadmin') {
            console.log('✅ Admin mengakses halaman user, redirect ke admin dashboard');
            return res.redirect('/admin/dashboard');
        }
        
        console.log('❌ Role tidak dikenal, redirect ke login user');
        return res.redirect('/login'); // LANGSUNG KE LOGIN USER, BUKAN ADMIN LOGIN
    }
};

module.exports = authMiddleware;