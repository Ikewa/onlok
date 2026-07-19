const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Ensure the avatars subdirectory exists on startup ───────────────────────
const AVATAR_DIR = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

// ─── Storage: server-generated filename, no user input ───────────────────────
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, AVATAR_DIR);
    },
    filename: (req, file, cb) => {
        // userId from verified JWT — attacker cannot influence this value
        const safeName = `avatar-${req.user.id}-${Date.now()}.jpg`;
        cb(null, safeName);
    }
});

// ─── MIME whitelist (Layer 1 of 2 — magic bytes check is Layer 2) ────────────
const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const avatarFilter = (req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
        return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPEG, PNG, and WebP images are accepted'));
    }
    cb(null, true);
};

// ─── Export configured multer instance ───────────────────────────────────────
const uploadAvatar = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB hard cap
        files: 1,                   // one file per request
    },
    fileFilter: avatarFilter,
});

module.exports = { uploadAvatar, AVATAR_DIR };
