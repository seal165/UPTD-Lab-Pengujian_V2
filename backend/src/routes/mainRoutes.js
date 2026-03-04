const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');

router.get('/', pageController.getLandingPage);
router.get('/profile', pageController.getProfilePage);
router.get('/pelayanan', pageController.getServicesPage); 
router.get('/estimasi', pageController.getEstimasi);

router.get('/login', pageController.loginPage);
router.get('/register', pageController.registerPage);

router.get('/admin/login', pageController.adminLogin);

// Route Dashboard
router.get('/admin/dashboard', pageController.adminDashboard);

// Route List Pengajuan
router.get('/admin/submissions', pageController.adminSubmissions);

// Route Detail Pengajuan (pake parameter :id)
router.get('/admin/submission/:id', pageController.adminDetailSubmission);

// Route untuk Login Proses (POST) - Nanti diisi logika login
router.post('/admin/login', (req, res) => {
    // Ceritanya login sukses, lempar ke dashboard
    res.redirect('/admin/dashboard');
});
router.get('/admin/skrd', pageController.adminSKRD);
router.get('/admin/skrd/:id', pageController.adminDetailSKRD);
router.get('/admin/reports', pageController.adminReports);
router.get('/admin/users', pageController.adminUsers);
router.get('/admin/settings', pageController.adminSettings);

module.exports = router;