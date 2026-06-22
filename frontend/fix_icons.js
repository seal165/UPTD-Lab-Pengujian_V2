const fs = require('fs');

function fixIcons(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix malformed class attributes: class="btn btn-sm btn-outline-primary" d-flex align-items-center">
    content = content.replace(/" d-flex align-items-center">/g, ' d-flex align-items-center">');

    fs.writeFileSync(filePath, content);
    console.log('Fixed ' + filePath);
}

fixIcons('d:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/public/js/user/history-detail-handler.js');
fixIcons('d:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/public/js/user/transaction-detail.js');
