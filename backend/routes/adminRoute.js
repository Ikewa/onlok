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
    getWebsiteHits
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
router.put('/withdrawals/:id/status', updateWithdrawalStatus);

module.exports = router;
