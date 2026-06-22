const fs = require('fs');

function removeIcons(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove icons from Buka / Lihat / Preview buttons
    content = content.replace(/<i class="fas fa-eye.*?><\/i>\s*/g, '');
    
    // Remove icons from Download buttons
    content = content.replace(/<i class="fas fa-download.*?><\/i>\s*/g, '');
    
    // Remove 'd-flex align-items-center' from buttons since they don't have icons anymore
    content = content.replace(/class="([^"]*)d-flex align-items-center([^"]*)"/g, (match, p1, p2) => {
        if (p1.includes('btn ') || p2.includes('btn ')) {
            return 'class="' + (p1 + p2).trim() + '"';
        }
        return match;
    });

    fs.writeFileSync(filePath, content);
    console.log('Processed ' + filePath);
}

removeIcons('d:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/public/js/user/history-detail-handler.js');
removeIcons('d:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/public/js/user/transaction-detail.js');
