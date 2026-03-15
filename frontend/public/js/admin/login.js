// public/js/admin/login.js

(function() {
    'use strict';

    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.getElementById('buttonText');
    const buttonSpinner = document.getElementById('buttonSpinner');
    const alertMessage = document.getElementById('alertMessage');
    const rememberCheck = document.getElementById('remember');

    function showAlert(message, type) {
        alertMessage.style.display = 'block';
        alertMessage.className = `alert alert-${type} alert-dismissible fade show`;
        alertMessage.innerHTML = `
            ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.style.display='none'"></button>
        `;
        setTimeout(() => {
            if (alertMessage.style.display !== 'none') {
                alertMessage.style.display = 'none';
            }
        }, 5000);
    }

    window.togglePassword = function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        const icon = document.getElementById('togglePasswordIcon');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    };

    window.showForgotPassword = function(event) {
        event.preventDefault();
        showAlert('Silakan hubungi administrator sistem', 'info');
    };

    // ==================== HANDLE LOGIN ====================
async function handleLogin(event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        showAlert('Email dan password harus diisi!', 'warning');
        return;
    }

    loginButton.disabled = true;
    buttonText.style.display = 'none';
    buttonSpinner.style.display = 'inline-block';

    try {
        const API_URL = 'http://localhost:5000/api';
        
        console.log('📡 Mencoba login admin dengan:', email);

        const response = await fetch('/auth/login', {  // PAKAI RELATIVE PATH
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();
        console.log('📦 Response:', result);

        if (result.success && result.data) {
            const userData = result.data;
            const role = userData.role.toLowerCase();
            
            console.log('👤 User role:', role);
            
            if (role === 'admin' || role === 'superadmin') {
                console.log('✅ Admin access granted');
                
                // HAPUS semua token lama
                localStorage.clear();
                
                // SIMPAN token
                localStorage.setItem('token', userData.token);
                localStorage.setItem('user', JSON.stringify({
                    id: userData.id,
                    email: userData.email,
                    full_name: userData.full_name,
                    role: userData.role
                }));

                console.log('✅ Token admin tersimpan');
                
                showAlert('Login berhasil! Mengalihkan...', 'success');
                
                // PASTIKAN REDIRECT
                window.location.href = '/admin/dashboard';
                
            } else {
                console.log('❌ Access denied. Bukan admin.');
                showAlert('Akses ditolak. Hanya untuk administrator.', 'danger');
                resetButton();
            }
        } else {
            showAlert(result.message || 'Email atau password salah!', 'danger');
            resetButton();
        }
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('Gagal terhubung ke server', 'danger');
        resetButton();
    }
}

    function resetButton() {
        loginButton.disabled = false;
        buttonText.style.display = 'inline-block';
        buttonSpinner.style.display = 'none';
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLogin(e);
            }
        });
        
        // Kosongkan input
        emailInput.value = '';
        passwordInput.value = '';
    });

})();