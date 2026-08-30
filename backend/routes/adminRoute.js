const express = require('express');
const router = express.Router();
const { 
    getVerificationQueue, 
    getVerificationDetails, 
    updateVerificationStatus, 
    adminLogin,
    getDashboardMetrics,
    getAlerts,
    getSettings,
    updateSettings,
    getMockUsers,
    getReferralsAdmin,
    getWithdrawalsAdmin,
    updateWithdrawalStatus,
    approveWithdrawalAdmin,
    approveBulkWithdrawalsAdmin,
    rejectWithdrawalAdmin,
    rejectBulkWithdrawalsAdmin,
    syncWithdrawalStatusAdmin,
    getWebsiteHits,
    getPaymentsAdmin,
    syncPaymentAdmin
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// Public admin routes
router.post('/login', adminLogin);
router.get('/mock-users', getMockUsers);

// All admin routes below are protected and require admin role
router.use(protect);
router.use(adminOnly);

// Verification Queue
router.get('/verifications', getVerificationQueue);
router.get('/verifications/:id', getVerificationDetails);
router.put('/verifications/:id/status', updateVerificationStatus);

// Payments & Subscriptions
router.get('/payments', getPaymentsAdmin);
router.post('/payments/:id/sync', syncPaymentAdmin);

// Dashboard & User Management
router.get('/dashboard', getDashboardMetrics);
router.get('/website-hits', getWebsiteHits);

// Alerts & Risk
router.get('/alerts', getAlerts);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Referrals & Withdrawals
router.get('/referrals', getReferralsAdmin);
router.get('/withdrawals', getWithdrawalsAdmin);
router.post('/withdrawals/approve-bulk', approveBulkWithdrawalsAdmin);
router.post('/withdrawals/reject-bulk', rejectBulkWithdrawalsAdmin);
router.put('/withdrawals/:id/approve', approveWithdrawalAdmin);
router.put('/withdrawals/:id/reject', rejectWithdrawalAdmin);
router.put('/withdrawals/:id/status', updateWithdrawalStatus);
router.post('/withdrawals/:id/sync-status', syncWithdrawalStatusAdmin);
router.put('/withdrawals/:id/sync-status', syncWithdrawalStatusAdmin);

module.exports = router;
