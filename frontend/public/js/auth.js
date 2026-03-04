// public/js/auth.js

// Fungsi untuk menyimpan token setelah login
function saveAuthData(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    console.log('✅ Token disimpan di localStorage:', token.substring(0, 20) + '...');
    return true;
}

// Fungsi untuk mendapatkan token
function getToken() {
    return localStorage.getItem('token');
}

// Fungsi untuk logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Cek token saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    const token = getToken();
    if (token) {
        console.log('🔑 Token ditemukan di localStorage');
    } else {
        console.log('ℹ️ Tidak ada token di localStorage');
    }
});