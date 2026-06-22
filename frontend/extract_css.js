const fs = require('fs');

const adminFiles = [
    'd:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/src/views/admin/detail-user.ejs',
    'd:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/src/views/admin/kuisioner.ejs',
    'd:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/src/views/admin/login.ejs',
    'd:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/src/views/admin/settings.ejs',
    'd:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/src/views/admin/skrd.ejs',
    'd:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/src/views/admin/submissions.ejs'
];

let adminCss = '\n/* ==================================================== */\n/* EXTRACTED ADMIN STYLES */\n/* ==================================================== */\n';

for (const file of adminFiles) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    let extracted = false;
    
    // Extract all style tags
    content = content.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (match, p1) => {
        adminCss += `\n/* --- From ${file.split('/').pop()} --- */\n${p1.trim()}\n`;
        extracted = true;
        return '';
    });
    
    if (extracted) {
        fs.writeFileSync(file, content);
        console.log('Processed and updated ' + file);
    }
}

fs.appendFileSync('d:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/public/css/admin-style.css', adminCss);
console.log('Admin CSS extraction complete.');

const userFiles = [
    'd:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/src/views/estimasi.ejs',
    'd:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/src/views/kuisioner.ejs',
    'd:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/src/views/login.ejs',
    'd:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/src/views/register.ejs',
    'd:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/src/views/services.ejs',
    'd:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/src/views/user/history.ejs'
];

let userCss = '\n/* ==================================================== */\n/* EXTRACTED USER & PUBLIC STYLES */\n/* ==================================================== */\n';

for (const file of userFiles) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    let extracted = false;
    
    // Extract all style tags
    content = content.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (match, p1) => {
        userCss += `\n/* --- From ${file.split('/').pop()} --- */\n${p1.trim()}\n`;
        extracted = true;
        return '';
    });
    
    if (extracted) {
        fs.writeFileSync(file, content);
        console.log('Processed and updated ' + file);
    }
}

fs.appendFileSync('d:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/public/css/user-style.css', userCss);
console.log('User CSS extraction complete.');

