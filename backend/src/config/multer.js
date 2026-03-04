const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = path.join(__dirname, '../../uploads/');
        
        // Tentukan subfolder berdasarkan fieldname
        if (file.fieldname === 'surat_permohonan') {
            uploadPath += 'surat';
        } else if (file.fieldname === 'scan_ktp') {
            uploadPath += 'ktp';
        } else if (file.fieldname === 'payment_proof') {
            uploadPath += 'payment';
        } else if (file.fieldname === 'avatar') {
            uploadPath += 'avatar';
        } else {
            uploadPath += 'others';
        }
        
        console.log('📁 Upload destination:', uploadPath);
        
        // Buat folder jika belum ada
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const prefix = file.fieldname;
        const filename = prefix + '-' + uniqueSuffix + ext;
        console.log('📁 Generated filename:', filename);
        cb(null, filename);
    }
});

// Filter file
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Hanya file gambar (JPG/PNG/GIF) atau PDF yang diperbolehkan'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

module.exports = upload;