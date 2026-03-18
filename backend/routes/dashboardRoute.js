const express = require('express');
const router = express.Router();
const { getVendorDashboard, searchVendor } = require('../controllers/dashboardController');
const { protect } = require('../middlewares/authMiddleware');
const { paginate } = require('../middlewares/pagination');

router.get('/', protect, getVendorDashboard);
router.get('/search', paginate, searchVendor);

module.exports = router;
