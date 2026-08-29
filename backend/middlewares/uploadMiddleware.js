const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validateDocument, validateVideo } = require('../utils/fileValidator');

// ─── Ensure upload subdirectories exist on startup ───────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const AVATAR_DIR = path.join(__dirname, '../uploads/avatars');
const TEMP_DIR = path.join(__dirname, '../uploads/temp');

[UPLOAD_DIR, AVATAR_DIR, TEMP_DIR].forEach((dir) => {
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
        const safeName = `avatar-${req.user.id}-${Date.now()}.jpg`;
        cb(null, safeName);
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

// ─── Single Document Upload (ID / CAC) Storage & Filter ───────────────────────
const singleDocStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const docType = file.fieldname || 'doc';
        const ext = path.extname(file.originalname) || '.jpg';
        const safeName = `${req.user.id}-${docType}-${Date.now()}${ext.toLowerCase()}`;
        cb(null, safeName);
    }
});

const singleDocFilter = (req, file, cb) => {
    const validation = validateDocument(file.originalname, file.mimetype);
    if (!validation.valid) {
        return cb(new Error(validation.error || 'Invalid document file type.'));
    }
    cb(null, true);
};

const uploadSingleDoc = multer({
    storage: singleDocStorage,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15 MB cap for single document
        files: 1,
    },
    fileFilter: singleDocFilter,
});

// ─── Chunk Upload Storage (staged into TEMP_DIR) ──────────────────────────────
const chunkStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadId = req.body.uploadId;
        if (uploadId) {
            const targetDir = path.join(TEMP_DIR, uploadId);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            cb(null, targetDir);
        } else {
            cb(null, TEMP_DIR);
        }
    },
    filename: (req, file, cb) => {
        const chunkIndex = req.body.chunkIndex !== undefined ? req.body.chunkIndex : Date.now();
        cb(null, `chunk_${chunkIndex}`);
    }
});

const uploadChunkMulter = multer({
    storage: chunkStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB maximum per chunk
        files: 1,
    }
});

module.exports = {
    uploadAvatar,
    uploadSingleDoc,
    uploadChunkMulter,
    UPLOAD_DIR,
    AVATAR_DIR,
    TEMP_DIR
};
