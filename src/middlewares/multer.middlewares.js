import multer from 'multer';
import path from 'path';

// Use **absolute path** based on project root
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // This is the correct way: uploads folder in project root
        const uploadPath = path.join(process.cwd(), 'uploads');
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed!'), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },   // ← fixed typo: limites → limits
    fileFilter
});

export const uploadAvatar = upload.single('avatar');