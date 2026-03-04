// backend/generate-hash.js
const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'admin123';
    const saltRounds = 10;
    
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        
        console.log('=================================');
        console.log('✅ HASH BERHASIL DIGENERATE');
        console.log('=================================');
        console.log('Password : admin123');
        console.log('Hash     :', hash);
        console.log('=================================');
        console.log('\n📝 COPY SQL INI KE phpMyAdmin:\n');
        console.log('=================================');
        console.log(`INSERT INTO users (
    email, 
    password, 
    role, 
    full_name, 
    nama_instansi, 
    alamat, 
    nomor_telepon, 
    avatar, 
    created_at, 
    updated_at
) VALUES (
    'admin@uptd.gov.id', 
    '${hash}', 
    'admin', 
    'Administrator UPTD', 
    'UPTD Laboratorium Pengujian', 
    'Kantor UPTD Laboratorium, Provinsi Banten', 
    '0254-1234567', 
    NULL, 
    NOW(), 
    NOW()
);`);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

generateHash();