const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Gunakan path.resolve agar alamat folder absolut dari root project
        // Asumsi folder 'uploads' ada di root project
        const rootPath = path.resolve(__dirname, '../../uploads');
        let subFolder = 'others';
        
        // Tentukan subfolder berdasarkan fieldname
        if (file.fieldname === 'surat_permohonan') {
            subFolder = 'surat';
        } else if (file.fieldname === 'scan_ktp') {
            subFolder = 'ktp';
        } else if (file.fieldname === 'payment_proof') {
            subFolder = 'payment';
        } else if (file.fieldname === 'avatar') {
            subFolder = 'avatar';
        }

        const finalPath = path.join(rootPath, subFolder);
        
        console.log(`📁 Target Upload: ${finalPath}`);
        
        // Buat folder jika belum ada (recursive: true sangat penting)
        if (!fs.existsSync(finalPath)) {
            fs.mkdirSync(finalPath, { recursive: true });
        }
        
        cb(null, finalPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Ambil ekstensi file asli
        const ext = path.extname(file.originalname).toLowerCase();
        // Nama file: fieldname-timestamp-random.ext
        const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
        
        console.log('📝 Generated Filename:', filename);
        cb(null, filename);
    }
});

// Filter file (Tambahkan pengecekan null/undefined)
const fileFilter = (req, file, cb) => {
    if (!file) {
        return cb(new Error('Tidak ada file yang diunggah'), false);
    }

    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Hanya file gambar (JPG/PNG/GIF) atau PDF yang diperbolehkan!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024 // Limit 5MB
    },
    fileFilter: fileFilter
});

module.exports = upload;