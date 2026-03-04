const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const upload = require('../config/multer');
const authMiddleware = require('../middleware/auth');
// Tambahkan ini untuk akses file
const path = require('path');
const fs = require('fs');

// ==================== PUBLIC API (TIDAK PERLU AUTH) ====================
router.get('/services', apiController.getServices);
router.get('/services/:id', apiController.getServiceById);
router.get('/public/busy-schedule', apiController.getPublicBusySchedule);
router.get('/jadwal-sibuk', apiController.getJadwalSibuk);

// ==================== AUTH API ====================
router.post('/auth/register', apiController.register);
router.post('/auth/login', apiController.login);
router.post('/login', apiController.login);

// ==================== DASHBOARD API ====================
router.get('/dashboard/stats', authMiddleware, apiController.getDashboardStats);
router.get('/dashboard/complete', authMiddleware, apiController.getDashboardData);

// ==================== SUBMISSIONS API ====================
router.get('/submissions', authMiddleware, apiController.getSubmissions);
router.get('/submissions/:id', authMiddleware, apiController.getSubmissionDetail);
router.post('/submissions', authMiddleware, upload.fields([
    { name: 'surat_permohonan', maxCount: 1 },
    { name: 'ktp', maxCount: 1 }
]), apiController.createSubmission);
// COMMENT DULU YANG BELUM ADA
// router.put('/submissions/:id', authMiddleware, apiController.updateSubmission);
// router.get('/submissions/:id/documents', authMiddleware, apiController.getSubmissionDocuments);
// router.post('/submissions/:id/cancel', authMiddleware, apiController.cancelSubmission);

// ==================== SKRD API ====================
router.get('/skrd', authMiddleware, apiController.getSKRD);
router.get('/skrd/:id', authMiddleware, apiController.getSKRDDetail);
router.post('/skrd', authMiddleware, apiController.createSKRD);
// COMMENT DULU YANG BELUM ADA
// router.post('/skrd/:id/verify-payment', authMiddleware, apiController.verifyPayment);
// router.post('/skrd/:id/upload-skrd', authMiddleware, upload.single('skrd_file'), apiController.uploadSkrd);
// router.post('/skrd/:id/reject-proof', authMiddleware, apiController.rejectProof);
// router.post('/skrd/:id/remind', authMiddleware, apiController.sendPaymentReminder);
// router.post('/skrd/:id/verify', authMiddleware, apiController.verifyPayment);
// router.post('/skrd/:id/cancel', authMiddleware, apiController.cancelInvoice);
// router.put('/skrd/:id/status', authMiddleware, apiController.updateSKRDStatus);

// ==================== USERS API (ADMIN) ====================
router.get('/users', authMiddleware, apiController.getUsers);
router.get('/users/:id', authMiddleware, apiController.getUserDetail);
// COMMENT DULU YANG BELUM ADA
// router.get('/users/:id/detail', authMiddleware, apiController.getUserDetail);
// router.put('/users/:id', authMiddleware, apiController.updateUser);
// router.post('/users/:id/verify', authMiddleware, apiController.verifyUser);
// router.delete('/users/:id', authMiddleware, apiController.deleteUser);
// router.post('/users/:id/deactivate', authMiddleware, apiController.deactivateUser);
// router.post('/users/:id/reset-password', authMiddleware, apiController.resetPassword);
// router.post('/users/:id/notify', authMiddleware, apiController.sendNotification);

// ==================== REPORTS API ====================
router.get('/reports', authMiddleware, apiController.getReports);

// ==================== KUISIONER API ====================
router.get('/kuisioner', authMiddleware, apiController.getKuisioner);
router.get('/kuisioner/stats', authMiddleware, apiController.getKuisionerStats);
router.get('/kuisioner/:id', authMiddleware, apiController.getKuisionerById);
router.post('/kuisioner', apiController.createKuisioner); // Public
// COMMENT DULU YANG BELUM ADA
// router.put('/kuisioner/:id', authMiddleware, apiController.updateKuisioner);
// router.delete('/kuisioner/:id', authMiddleware, apiController.deleteKuisioner);

router.get('/kuisioner/questions', authMiddleware, apiController.getKuisionerQuestions);
router.get('/kuisioner/questions/:id', authMiddleware, apiController.getKuisionerQuestionById);
router.post('/kuisioner/questions', authMiddleware, apiController.createKuisionerQuestion);
// COMMENT DULU YANG BELUM ADA
// router.put('/kuisioner/questions/:id', authMiddleware, apiController.updateKuisionerQuestion);
// router.delete('/kuisioner/questions/:id', authMiddleware, apiController.deleteKuisionerQuestion);
// router.post('/kuisioner/questions/reorder', authMiddleware, apiController.reorderKuisionerQuestions);

// ==================== SETTINGS API ====================
router.get('/settings/profile', authMiddleware, apiController.getProfileSettings);
// COMMENT DULU YANG BELUM ADA
// router.put('/settings/profile', authMiddleware, apiController.updateProfile);
// router.post('/settings/profile/avatar', authMiddleware, upload.single('avatar'), apiController.uploadAvatar);
// router.delete('/settings/profile/avatar', authMiddleware, apiController.deleteAvatar);
// router.put('/settings/password', authMiddleware, apiController.changePassword);
// router.get('/settings/system', authMiddleware, apiController.getSystemConfig);
// router.put('/settings/system', authMiddleware, apiController.updateSystemConfig);
// router.get('/settings/sessions', authMiddleware, apiController.getActiveSessions);
// router.post('/settings/sessions/logout-all', authMiddleware, apiController.logoutAllDevices);
// router.post('/settings/backup', authMiddleware, apiController.createBackup);
// router.get('/settings/backups', authMiddleware, apiController.getBackupHistory);
// router.get('/settings/logs', authMiddleware, apiController.getActivityLogs);

// ==================== MODE SIBUK ROUTES ====================
router.get('/settings/busy-mode', authMiddleware, apiController.getBusyMode);
router.put('/settings/busy-mode', authMiddleware, apiController.updateBusyMode);
router.get('/settings/busy-mode/periods/:id', authMiddleware, apiController.getBusyPeriodById);
router.post('/settings/busy-mode/periods', authMiddleware, apiController.addBusyPeriod);
router.put('/settings/busy-mode/periods/:id', authMiddleware, apiController.updateBusyPeriod);
router.delete('/settings/busy-mode/periods/:id', authMiddleware, apiController.deleteBusyPeriod);

// ==================== USER API (CUSTOMER) ====================
// Dashboard
router.get('/user/dashboard', authMiddleware, apiController.getUserDashboard);

// Create Submission (form pengajuan baru) - DENGAN UPLOAD FILE
router.post('/user/submission', 
    authMiddleware, 
    upload.fields([
        { name: 'surat_permohonan', maxCount: 1 },
        { name: 'scan_ktp', maxCount: 1 }
    ]), 
    apiController.createSubmission
);

// History (daftar pengajuan)
router.get('/user/history', authMiddleware, apiController.getUserHistory);

// History Detail (detail satu pengajuan)
router.get('/user/history/:id', authMiddleware, apiController.getUserHistoryDetail);

// Transactions (daftar transaksi)
router.get('/user/transactions', authMiddleware, apiController.getUserTransactions);

// Transaction Detail
router.get('/user/transactions/:id', authMiddleware, apiController.getUserTransactionDetail);

// Upload payment proof
router.post('/user/transactions/:id/upload', 
    authMiddleware, 
    upload.single('payment_proof'), 
    apiController.uploadPaymentProof
);

// ==================== FILE ACCESS ROUTES ====================
router.get('/file/:folder/:filename', authMiddleware, (req, res) => {
    try {
        const { folder, filename } = req.params;
        const userId = req.user?.id;
        
        console.log('📁 File request:', { folder, filename, userId });
        
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        
        // Tambahkan folder 'skrd' ke allowedFolders
        const allowedFolders = ['surat', 'ktp', 'laporan', 'payment', 'skrd'];
        if (!allowedFolders.includes(folder)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        
        const filePath = path.join(__dirname, '../../uploads', folder, filename);
        console.log('📁 File path:', filePath);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }
        
        // Kirim file langsung
        res.sendFile(filePath);
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== USER PROFILE API ====================
// Get user profile
router.get('/user/profile', authMiddleware, apiController.getUserProfile);

// Update user profile
router.put('/user/profile', authMiddleware, apiController.updateUserProfile);

// Upload avatar
router.post('/user/avatar', 
    authMiddleware, 
    upload.single('avatar'), 
    apiController.uploadAvatar
);

// Change password
router.post('/user/change-password', authMiddleware, apiController.changePassword);

module.exports = router;