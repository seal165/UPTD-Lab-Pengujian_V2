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

    function showAlert(message, type) {
        alertMessage.style.display = 'block';
        alertMessage.className = `alert alert-${type} alert-dismissible fade show`;
        alertMessage.innerHTML = `
            ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.style.display='none'"></button>
        `;
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
            
            console.log('📡 Mencoba login dengan:', email);

            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            console.log('📡 Response status:', response.status);
            
            const result = await response.json();
            console.log('📦 Response dari server:', result);

            if (result.success && result.data) {
                const userData = result.data;
                console.log('👤 User data:', userData);
                console.log('👤 User role:', userData.user.role);
                console.log('👤 Role type:', typeof userData.user.role);
                
                // Cek role admin (case sensitive)
                const role = userData.user.role;
                
                if (role === 'admin' || role === 'superadmin') {
                    console.log('✅ Admin access granted');
                    
                    localStorage.setItem('token', userData.token);
                    localStorage.setItem('user', JSON.stringify({
                        id: userData.user.id,
                        email: userData.user.email,
                        full_name: userData.user.full_name,
                        role: userData.user.role
                    }));

                    showAlert('Login berhasil! Mengalihkan...', 'success');
                    
                    setTimeout(() => {
                        window.location.href = '/admin/dashboard';
                    }, 1000);
                } else {
                    console.log('❌ Access denied. Role:', role);
                    showAlert('Akses ditolak. Hanya untuk administrator.', 'danger');
                    resetButton();
                }

            } else {
                console.log('❌ Login failed:', result.message);
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
        
        // Isi form dengan default admin (untuk testing)
        emailInput.value = 'admin@uptd.gov.id';
        passwordInput.value = 'admin123';
    });

})();