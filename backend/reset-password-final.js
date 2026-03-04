const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function resetPassword() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'uptd_lab'
    });

    const email = 'admin@uptd.gov.id';
    const newPassword = 'admin123';
    
    // Hash password dengan bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('📧 Email:', email);
    console.log('🔑 Password baru:', newPassword);
    console.log('🔒 Hash baru:', hashedPassword);
    
    // Hapus user lama jika ada
    await connection.execute('DELETE FROM users WHERE email = ?', [email]);
    
    // Insert user baru
    await connection.execute(
        `INSERT INTO users (email, password, full_name, role, created_at) 
         VALUES (?, ?, 'Administrator UPTD', 'admin', NOW())`,
        [email, hashedPassword]
    );
    
    console.log('✅ Admin berhasil dibuat ulang!');
    
    // Verifikasi
    const [users] = await connection.execute(
        'SELECT id, email, full_name, role FROM users WHERE email = ?',
        [email]
    );
    
    if (users.length > 0) {
        console.log('\n📋 Data user:', users[0]);
        
        // Test verifikasi password
        const testMatch = await bcrypt.compare(newPassword, hashedPassword);
        console.log('🔐 Verifikasi password:', testMatch ? '✅ BERHASIL' : '❌ GAGAL');
    }

    await connection.end();
}

resetPassword();