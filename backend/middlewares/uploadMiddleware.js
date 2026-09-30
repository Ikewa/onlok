const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validateDocument } = require('../utils/fileValidator');

// ─── Ensure upload subdirectories exist on startup ───────────────────────────
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '../uploads');
const UPLOAD_DIR = STORAGE_PATH;
const AVATAR_DIR = path.join(STORAGE_PATH, 'avatars');
const TEMP_DIR = path.join(STORAGE_PATH, 'temp');

[UPLOAD_DIR, AVATAR_DIR, TEMP_DIR, path.join(UPLOAD_DIR, 'tus')].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ─── Profile Picture Storage & Filter ─────────────────────────────────────────
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, AVATAR_DIR);
    },
    filename: (req, file, cb) => {
        // Always JPEG: the extension is never taken from client input.
        cb(null, `avatar-${req.user.id}-${Date.now()}.jpg`);
    }
});

const avatarFilter = (req, file, cb) => {
    const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
        return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPEG, PNG, and WebP images are accepted'));
    }
    cb(null, true);
};

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB hard cap
        files: 1,
    },
    fileFilter: avatarFilter,
});

module.exports = {
    uploadAvatar,
    UPLOAD_DIR,
    AVATAR_DIR,
    TEMP_DIR
};
