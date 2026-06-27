const fs = require('fs');

const checkUploadSize = (req, res, next) => {
    // req.settings.system_max_upload_size is in MB
    const maxSize = (parseFloat(req.settings?.system_max_upload_size) || 5) * 1024 * 1024;
    let exceeded = false;
    let filesToDelete = [];

    if (req.file) {
        if (req.file.size > maxSize) {
            exceeded = true;
        }
        filesToDelete.push(req.file.path);
    } else if (req.files) {
        Object.keys(req.files).forEach(fieldname => {
            req.files[fieldname].forEach(file => {
                if (file.size > maxSize) {
                    exceeded = true;
                }
                filesToDelete.push(file.path); 
            });
        });
    }

    if (exceeded) {
        filesToDelete.forEach(filepath => {
            try {
                if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            } catch (e) {
                console.error('Failed to delete file:', filepath, e);
            }
        });
        return res.status(400).json({
            success: false,
            message: `Ukuran file melebihi batas maksimal (${req.settings?.max_upload_size || 5}MB)`
        });
    }

    next();
};

module.exports = checkUploadSize;
