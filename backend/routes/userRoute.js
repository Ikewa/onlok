const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, getUsers, updateUser, deleteUser, getReferrals } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/referrals', protect, getReferrals);
router.get('/', getUsers);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);

module.exports = router;
