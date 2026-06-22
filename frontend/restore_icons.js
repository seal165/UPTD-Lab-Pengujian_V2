const fs = require('fs');

function restoreIcons(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add fa-eye to Buka
    content = content.replace(/>Buka<\/a>/g, ' d-flex align-items-center"><i class="fas fa-eye me-1"></i> Buka</a>');
    
    // Add fa-download to Download
    content = content.replace(/>Download<\/a>/g, ' d-flex align-items-center"><i class="fas fa-download me-1"></i> Download</a>');
    
    // Fix class concatenation
    content = content.replace(/" d-flex/g, ' d-flex');

    // Add fa-eye to Preview
    content = content.replace(/>\s*Preview\s*<\/a>/g, ' d-flex align-items-center">\n                    <i class="fas fa-eye me-1"></i> Preview\n                </a>');

    // Add fa-download to Download Salinan Kuisioner
    content = content.replace(/>\s*Download Salinan Kuisioner\s*<\/button>/g, ' d-flex align-items-center">\n                            <i class="fas fa-download me-2"></i>Download Salinan Kuisioner\n                        </button>');

    // Add fa-eye to Lihat
    content = content.replace(/>Lihat<\/a>/g, ' d-flex align-items-center"><i class="fas fa-eye me-1"></i> Lihat</a>');
    
    fs.writeFileSync(filePath, content);
    console.log('Restored ' + filePath);
}

restoreIcons('d:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/public/js/user/history-detail-handler.js');
restoreIcons('d:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/public/js/user/transaction-detail.js');
