const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const upload = require('../config/multer');
const authMiddleware = require('../middleware/auth');
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

// ==================== ADMIN DASHBOARD API ====================
router.get('/admin/dashboard/stats', authMiddleware, apiController.getAdminDashboardStats);
router.get('/dashboard/complete', authMiddleware, apiController.getDashboardData);

// ==================== SUBMISSIONS API (ADMIN) ====================
router.get('/submissions', authMiddleware, apiController.getSubmissions);
router.get('/submissions/:id', authMiddleware, apiController.getSubmissionDetail);
router.put('/submissions/:id', authMiddleware, apiController.updateSubmission);
router.get('/submissions/:id/documents', authMiddleware, apiController.getSubmissionDocuments);
router.post('/submissions/:id/cancel', authMiddleware, apiController.cancelSubmission);

// Route untuk create submission (user)
router.post('/submissions', authMiddleware, upload.fields([
    { name: 'surat_permohonan', maxCount: 1 },
    { name: 'ktp', maxCount: 1 }
]), apiController.createSubmission);

// ==================== SUBMISSION REPORTS API ====================
// Upload laporan hasil pengujian
router.post('/submissions/:id/report', 
    authMiddleware, 
    upload.single('laporan'), 
    apiController.uploadSubmissionReport
);

// Download laporan hasil pengujian
router.get('/submissions/:id/report', 
    authMiddleware, 
    apiController.downloadSubmissionReport
);

// ==================== SKRD API ====================
router.get('/skrd', authMiddleware, apiController.getSKRD);
router.get('/skrd/:id', authMiddleware, apiController.getSKRDDetail);
router.post('/skrd', authMiddleware, apiController.createSKRD);
router.put('/skrd/:id/status', authMiddleware, apiController.updateSKRDStatus);
router.post('/skrd/:id/verify-payment', authMiddleware, apiController.verifyPayment);
router.post('/skrd/:id/upload-skrd', authMiddleware, upload.single('skrd_file'), apiController.uploadSkrd);
router.post('/skrd/:id/reject-proof', authMiddleware, apiController.rejectProof);
router.post('/skrd/:id/remind', authMiddleware, apiController.sendPaymentReminder);
router.post('/skrd/:id/cancel', authMiddleware, apiController.cancelInvoice);

// ==================== SKRD API ====================
// Upload SKRD file
router.post('/skrd/:id/upload-skrd', 
    authMiddleware, 
    upload.single('skrd'), 
    apiController.uploadSkrd
);

// Download SKRD file
router.get('/skrd/:id/download-skrd', 
    authMiddleware, 
    apiController.downloadSkrd
);

// ==================== KUISIONER API ====================
// PENTING: URUTKAN DARI YANG PALING SPESIFIK

// 1. QUESTIONS ROUTES (PALING ATAS - PALING SPESIFIK)
router.get('/kuisioner/questions', authMiddleware, apiController.getKuisionerQuestions);
router.get('/kuisioner/questions/:id', authMiddleware, apiController.getKuisionerQuestionById);
router.post('/kuisioner/questions', authMiddleware, apiController.createKuisionerQuestion);
router.put('/kuisioner/questions/:id', authMiddleware, apiController.updateKuisionerQuestion);
router.delete('/kuisioner/questions/:id', authMiddleware, apiController.deleteKuisionerQuestion);
router.post('/kuisioner/questions/reorder', authMiddleware, apiController.reorderKuisionerQuestions);

// 2. BARU ROUTES GENERIK
router.get('/kuisioner', authMiddleware, apiController.getKuisioner);
router.get('/kuisioner/stats', authMiddleware, apiController.getKuisionerStats);
router.get('/kuisioner/:id', authMiddleware, apiController.getKuisionerById);
router.post('/kuisioner', apiController.createKuisioner);
router.put('/kuisioner/:id', authMiddleware, apiController.updateKuisioner);
router.delete('/kuisioner/:id', authMiddleware, apiController.deleteKuisioner);

// 3. ADMIN ROUTES
router.get('/admin/kuisioner', authMiddleware, apiController.getAdminKuisioner);
router.get('/admin/kuisioner/stats', authMiddleware, apiController.getAdminKuisionerStats);
router.get('/admin/kuisioner/:id', authMiddleware, apiController.getAdminKuisionerById);

// ==================== USERS API (ADMIN) ====================
// Urutkan dari yang paling spesifik ke generik

// 1. DETAIL USER (spesifik dengan /detail)
router.get('/admin/users/:id/detail', authMiddleware, apiController.getUserDetail);

// 2. USER ACTIONS
router.post('/admin/users/:id/verify', authMiddleware, apiController.verifyUser);
router.post('/admin/users/:id/deactivate', authMiddleware, apiController.deactivateUser);
router.post('/admin/users/:id/reset-password', authMiddleware, apiController.resetPassword);
router.post('/admin/users/:id/notify', authMiddleware, apiController.sendNotification);
router.put('/admin/users/:id', authMiddleware, apiController.updateUser);
router.delete('/admin/users/:id', authMiddleware, apiController.deleteUser);

// 3. LIST USERS (paling generik)
router.get('/admin/users', authMiddleware, apiController.getUsers);

// ==================== REPORTS API ====================
router.get('/reports', authMiddleware, apiController.getReports);

// ==================== SETTINGS API ====================
// Profile settings
router.get('/settings/profile', authMiddleware, apiController.getProfileSettings);
router.put('/settings/profile', authMiddleware, apiController.updateProfile);
router.post('/settings/profile/avatar', authMiddleware, upload.single('avatar'), apiController.uploadAvatar);
router.delete('/settings/profile/avatar', authMiddleware, apiController.deleteAvatar);

// Password
router.put('/settings/password', authMiddleware, apiController.changePassword);

// System configuration
router.get('/settings/system', authMiddleware, apiController.getSystemConfig);
router.put('/settings/system', authMiddleware, apiController.updateSystemConfig);

// 🔴 COMMENT DULU YANG PAKAI TABEL SESSIONS (KARENA TABELNYA TIDAK ADA)
// router.get('/settings/sessions', authMiddleware, apiController.getActiveSessions);
// router.post('/settings/sessions/logout-all', authMiddleware, apiController.logoutAllDevices);

// Backup & Restore
router.get('/settings/backups', authMiddleware, apiController.getBackupHistory);
router.post('/settings/backup', authMiddleware, apiController.createBackup);
router.post('/settings/restore', authMiddleware, upload.single('backup_file'), apiController.restoreBackup);

// Activity logs
router.get('/settings/logs', authMiddleware, apiController.getActivityLogs);

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

// ==================== FILE ACCESS API (dengan token) ====================
// Akses file surat permohonan
router.get('/file/surat/:filename', authMiddleware, apiController.getFile);

// Akses file KTP
router.get('/file/ktp/:filename', authMiddleware, apiController.getFile);

// Akses file bukti pembayaran
router.get('/file/payment/:filename', authMiddleware, apiController.getFile);

// Akses file laporan
router.get('/file/laporan/:filename', authMiddleware, apiController.getFile);

// Akses file SKRD
router.get('/file/skrd/:filename', authMiddleware, apiController.getFile);

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
// Pastikan parameter pertama adalah :fileType agar nyambung dengan Controller
router.get('/file/:fileType/:filename', authMiddleware, apiController.getFile);

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