const express = require('express');
const router = express.Router();
const { registerUser, loginUser, magicLogin, getMe, getUsers, updateUser, deleteUser, getReferrals, uploadProfilePicture, forgotPassword, resetPassword } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const { uploadAvatar } = require('../middlewares/uploadMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/magic-login', magicLogin);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/me', protect, getMe);
router.get('/referrals', protect, getReferrals);
router.get('/', getUsers);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);

// Profile picture upload (multer middleware runs before controller)
router.post('/me/avatar', protect, uploadAvatar.single('profile_picture'), uploadProfilePicture);

module.exports = router;
