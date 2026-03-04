// middleware/auth.js

const authMiddleware = {
    // Middleware untuk halaman user
    verifyUserAccess: (req, res, next) => {
        console.log('🔐 Verifikasi akses user...');
        console.log('📋 Session ID:', req.sessionID);
        console.log('📋 Session user:', req.session?.user);
        console.log('📋 URL yang diminta:', req.originalUrl);
        
        if (!req.session || !req.session.user) {
            console.log('❌ Tidak ada session user, redirect ke login');
            return res.redirect('/login');
        }
        
        console.log('✅ Session user ditemukan dengan role:', req.session.user.role);
        
        if (req.session.user.role === 'pelanggan') {
            console.log('✅ Akses user diberikan untuk:', req.session.user.email);
            return next();
        }
        
        if (req.session.user.role === 'admin' || req.session.user.role === 'petugas') {
            console.log('✅ Admin mengakses halaman user, redirect ke admin dashboard');
            return res.redirect('/admin/dashboard');
        }
        
        console.log('❌ Role tidak dikenal, redirect ke login');
        return res.redirect('/login');
    },
    
    // Middleware untuk redirect jika sudah login
    redirectIfAuthenticated: (req, res, next) => {
        console.log('🔐 Redirect if authenticated check...');
        console.log('📋 Session user:', req.session?.user);
        
        if (req.session && req.session.user) {
            console.log('✅ User sudah login, redirect ke dashboard sesuai role');
            if (req.session.user.role === 'admin' || req.session.user.role === 'petugas') {
                return res.redirect('/admin/dashboard');
            } else if (req.session.user.role === 'pelanggan') {
                return res.redirect('/user/dashboard');
            }
        }
        
        console.log('✅ User belum login, lanjutkan');
        next();
    }
};

module.exports = authMiddleware;