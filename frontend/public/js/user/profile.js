// public/js/user/profile.js

(function() {
    'use strict';

    let user = {};
    let notificationCount = 0;
    let isSubmitting = false;
    let toastTimer = null;

    function getAvatarUrl(avatar) {
        if (!avatar) return '';
        return avatar.startsWith('http') ? avatar : `http://localhost:5000${avatar}`;
    }

    function buildAvatarMarkup(avatar, imageClass, iconClass) {
        const avatarUrl = getAvatarUrl(avatar);
        if (avatarUrl) {
            return `<img src="${avatarUrl}" alt="Profile" class="${imageClass}">`;
        }

        return `<i class="fas fa-user-circle ${iconClass}"></i>`;
    }

    function renderProfileAvatar() {
        const profileAvatar = document.getElementById('profileAvatar');
        if (!profileAvatar) return;

        profileAvatar.innerHTML = buildAvatarMarkup(
            user.avatar,
            'profile-avatar-image',
            'profile-avatar-icon'
        );
    }

    function renderCurrentPhotoPreview() {
        const photoPreview = document.getElementById('photoPreview');
        if (!photoPreview) return;

        photoPreview.innerHTML = buildAvatarMarkup(
            user.avatar,
            'profile-current-photo-image',
            'profile-current-photo-icon'
        );
    }

    // ================ DOM CONTENT LOADED ================
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Profile page loaded');
        
        // Load user profile from API
        loadUserProfile();
        
        setupEventListeners();
    });

    // ================ LOAD USER PROFILE FROM API ================
    async function loadUserProfile() {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                console.log('No token found, redirecting to login');
                window.location.href = '/login';
                return;
            }
            
            const API_URL = 'http://localhost:5000/api';
            
            console.log('📡 Fetching user profile...');
            
            const response = await fetch(`${API_URL}/user/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
                return;
            }
            
            const result = await response.json();
            
            if (result.success) {
                user = result.data;
                console.log('✅ User profile loaded:', user);
                renderProfile();
            } else {
                console.error('Failed to load profile:', result.message);
                showToast('Gagal memuat profil', 'error');
            }
            
        } catch (error) {
            console.error('Error loading profile:', error);
            showToast('Gagal menghubungi server', 'error');
        }
    }

    // ================ RENDER PROFILE ================
    function renderProfile() {
        const setText = (id, value) => {
            const node = document.getElementById(id);
            if (node) node.textContent = value;
        };

        // Profile header
        setText('profileDisplayName', user.full_name || 'User');
        setText('profileDisplayRole', user.role || 'Customer');
        setText('profileHeaderEmail', user.email || 'Belum diisi');
        setText('profileHeaderPhone', user.nomor_telepon || 'Belum diisi');
        setText('profileHeaderCompany', user.nama_instansi || 'Belum diisi');
        
        // Personal info
        setText('displayName', user.full_name || '-');
        setText('displayEmail', user.email || '-');
        setText('displayPhone', user.nomor_telepon || '-');
        
        // Company info
        setText('displayCompany', user.nama_instansi || '-');
        setText('displayAddress', user.alamat || '-');
        
        renderProfileAvatar();
        renderCurrentPhotoPreview();

        // Sync avatar + identity to localStorage so all pages/partials can use latest profile data
        try {
            const currentUserRaw = localStorage.getItem('user');
            const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : {};
            localStorage.setItem('user', JSON.stringify({
                ...currentUser,
                full_name: user.full_name || currentUser.full_name,
                email: user.email || currentUser.email,
                nomor_telepon: user.nomor_telepon || currentUser.nomor_telepon,
                role: user.role || currentUser.role,
                nama_instansi: user.nama_instansi || currentUser.nama_instansi,
                alamat: user.alamat || currentUser.alamat,
                avatar: user.avatar || currentUser.avatar || null
            }));

            if (typeof window.syncUserAvatarUI === 'function') {
                window.syncUserAvatarUI(user.avatar || currentUser.avatar || '');
            }
        } catch (error) {
            console.warn('Failed to sync user cache:', error);
        }
        
        // Update notification badge
        updateNotificationBadge();
    }

    function openEditPersonalModal() {
        // Populate form with current data
        document.getElementById('editName').value = user.full_name || '';
        document.getElementById('editEmail').value = user.email || '';
        document.getElementById('editPhone').value = user.nomor_telepon || '';
        
        // Show modal
        document.getElementById('editPersonalModal').classList.add('active');
    }

    async function savePersonalInfo() {
        if (isSubmitting) return;
        
        const name = document.getElementById('editName').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const phone = document.getElementById('editPhone').value.trim();
        
        // Validation
        if (!name) {
            showToast('Nama lengkap harus diisi', 'warning');
            return;
        }
        
        if (!email) {
            showToast('Email harus diisi', 'warning');
            return;
        }
        
        if (!isValidEmail(email)) {
            showToast('Format email tidak valid', 'warning');
            return;
        }
        
        isSubmitting = true;
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('Sesi habis. Silakan login ulang.', 'error');
                setTimeout(() => window.location.href = '/login', 1500);
                return;
            }
            
            const API_URL = 'http://localhost:5000/api';
            
            showToast('Menyimpan perubahan...', 'info');
            
            const response = await fetch(`${API_URL}/user/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    full_name: name,
                    email: email,
                    nomor_telepon: phone
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update local user object
                user = { ...user, ...result.data };
                
                // Update display
                renderProfile();
                
                // Close modal
                closeModal(document.getElementById('editPersonalModal'));
                
                showToast('Informasi pribadi berhasil diperbarui', 'success');
            } else {
                showToast(result.message || 'Gagal memperbarui profil', 'error');
            }
            
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('Gagal menghubungi server', 'error');
        } finally {
            isSubmitting = false;
        }
    }

    function openEditCompanyModal() {
        // Populate form with current data
        document.getElementById('editCompany').value = user.nama_instansi || '';
        document.getElementById('editAddress').value = user.alamat || '';
        
        // Show modal
        document.getElementById('editCompanyModal').classList.add('active');
    }

    async function saveCompanyInfo() {
        if (isSubmitting) return;
        
        const company = document.getElementById('editCompany').value.trim();
        const address = document.getElementById('editAddress').value.trim();
        
        isSubmitting = true;
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('Sesi habis. Silakan login ulang.', 'error');
                setTimeout(() => window.location.href = '/login', 1500);
                return;
            }
            
            const API_URL = 'http://localhost:5000/api';
            
            showToast('Menyimpan perubahan...', 'info');
            
            const response = await fetch(`${API_URL}/user/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nama_instansi: company,
                    alamat: address
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update local user object
                user = { ...user, ...result.data };
                
                // Update display
                renderProfile();
                
                // Close modal
                closeModal(document.getElementById('editCompanyModal'));
                
                showToast('Informasi instansi berhasil diperbarui', 'success');
            } else {
                showToast(result.message || 'Gagal memperbarui profil', 'error');
            }
            
        } catch (error) {
            console.error('Error updating company:', error);
            showToast('Gagal menghubungi server', 'error');
        } finally {
            isSubmitting = false;
        }
    }

    function openChangePasswordModal() {
        // Reset form
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        // Show modal
        document.getElementById('changePasswordModal').classList.add('active');
    }

    async function changePassword() {
        if (isSubmitting) return;
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validation
        if (!currentPassword) {
            showToast('Password saat ini harus diisi', 'warning');
            return;
        }
        
        if (!newPassword) {
            showToast('Password baru harus diisi', 'warning');
            return;
        }
        
        if (newPassword.length < 6) {
            showToast('Password minimal 6 karakter', 'warning');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showToast('Konfirmasi password tidak cocok', 'warning');
            return;
        }
        
        isSubmitting = true;
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('Sesi habis. Silakan login ulang.', 'error');
                setTimeout(() => window.location.href = '/login', 1500);
                return;
            }
            
            const API_URL = 'http://localhost:5000/api';
            
            showToast('Mengubah password...', 'info');
            
            const response = await fetch(`${API_URL}/user/change-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Close modal
                closeModal(document.getElementById('changePasswordModal'));
                
                showToast('Password berhasil diubah', 'success');
            } else {
                showToast(result.message || 'Gagal mengubah password', 'error');
            }
            
        } catch (error) {
            console.error('Error changing password:', error);
            showToast('Gagal menghubungi server', 'error');
        } finally {
            isSubmitting = false;
        }
    }

    function openChangePhotoModal() {
        // Reset
        document.getElementById('photoUpload').value = '';
        document.getElementById('imagePreview').hidden = true;
        document.getElementById('uploadArea').hidden = false;
        document.getElementById('savePhotoBtn').disabled = true;
        renderCurrentPhotoPreview();
        
        // Show modal
        document.getElementById('changePhotoModal').classList.add('active');
    }

    function handlePhotoSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.match('image.*')) {
            showToast('File harus berupa gambar', 'warning');
            return;
        }
        
        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showToast('Ukuran file maksimal 2MB', 'warning');
            return;
        }
        
        // Preview image
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('previewImage').src = e.target.result;
            document.getElementById('imagePreview').hidden = false;
            document.getElementById('uploadArea').hidden = true;
            document.getElementById('savePhotoBtn').disabled = false;
        };
        reader.readAsDataURL(file);
    }

    async function savePhoto() {
        const fileInput = document.getElementById('photoUpload');
        if (!fileInput || !fileInput.files.length) return;
        
        const file = fileInput.files[0];
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('Sesi habis. Silakan login ulang.', 'error');
                setTimeout(() => window.location.href = '/login', 1500);
                return;
            }
            
            const API_URL = 'http://localhost:5000/api';
            
            const formData = new FormData();
            formData.append('avatar', file);
            
            showToast('Mengupload foto...', 'info');
            
            const response = await fetch(`${API_URL}/user/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update user object with new avatar
                user.avatar = result.data.avatar;

                // Keep cached user in sync so avatar appears across navbar/sidebar on all pages
                try {
                    const currentUserRaw = localStorage.getItem('user');
                    const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : {};
                    localStorage.setItem('user', JSON.stringify({
                        ...currentUser,
                        avatar: result.data.avatar
                    }));
                } catch (error) {
                    console.warn('Failed to update localStorage avatar:', error);
                }

                renderProfile();

                if (typeof window.syncUserAvatarUI === 'function') {
                    window.syncUserAvatarUI(result.data.avatar);
                }
                
                // Close modal
                closeModal(document.getElementById('changePhotoModal'));
                
                showToast('Foto profil berhasil diperbarui', 'success');
            } else {
                showToast(result.message || 'Gagal upload foto', 'error');
            }
            
        } catch (error) {
            console.error('Error uploading photo:', error);
            showToast('Gagal menghubungi server', 'error');
        }
    }

    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function showNotificationSettings() {
        showToast('Fitur notifikasi akan segera hadir!', 'info');
    }

    function closeModal(modal) {
        if (modal) modal.classList.remove('active');
    }

    function updateNotificationBadge() {
        // This would be implemented if you have notification count
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.style.display = 'none';
        }
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        if (toastTimer) {
            clearTimeout(toastTimer);
        }

        toast.textContent = message;
        toast.className = `custom-toast toast-${type} is-visible`;
        toast.hidden = false;

        toastTimer = setTimeout(() => {
            toast.classList.remove('is-visible');
            toast.hidden = true;
        }, 3000);
    }

    function setupEventListeners() {
        // Edit buttons
        document.getElementById('editPersonalBtn')?.addEventListener('click', openEditPersonalModal);
        document.getElementById('editCompanyBtn')?.addEventListener('click', openEditCompanyModal);
        document.getElementById('changePasswordBtn')?.addEventListener('click', openChangePasswordModal);
        document.getElementById('changePhotoBtn')?.addEventListener('click', openChangePhotoModal);
        
        // Settings buttons
        document.getElementById('notificationSettingsBtn')?.addEventListener('click', showNotificationSettings);
        
        // Personal modal
        const personalModal = document.getElementById('editPersonalModal');
        document.getElementById('closePersonalModal')?.addEventListener('click', () => closeModal(personalModal));
        document.getElementById('cancelPersonalBtn')?.addEventListener('click', () => closeModal(personalModal));
        document.getElementById('savePersonalBtn')?.addEventListener('click', savePersonalInfo);
        
        if (personalModal) {
            personalModal.addEventListener('click', function(e) {
                if (e.target === this) closeModal(personalModal);
            });
        }
        
        // Company modal
        const companyModal = document.getElementById('editCompanyModal');
        document.getElementById('closeCompanyModal')?.addEventListener('click', () => closeModal(companyModal));
        document.getElementById('cancelCompanyBtn')?.addEventListener('click', () => closeModal(companyModal));
        document.getElementById('saveCompanyBtn')?.addEventListener('click', saveCompanyInfo);
        
        if (companyModal) {
            companyModal.addEventListener('click', function(e) {
                if (e.target === this) closeModal(companyModal);
            });
        }
        
        // Password modal
        const passwordModal = document.getElementById('changePasswordModal');
        document.getElementById('closePasswordModal')?.addEventListener('click', () => closeModal(passwordModal));
        document.getElementById('cancelPasswordBtn')?.addEventListener('click', () => closeModal(passwordModal));
        document.getElementById('savePasswordBtn')?.addEventListener('click', changePassword);
        
        if (passwordModal) {
            passwordModal.addEventListener('click', function(e) {
                if (e.target === this) closeModal(passwordModal);
            });
        }
        
        // Photo modal
        const photoModal = document.getElementById('changePhotoModal');
        document.getElementById('closePhotoModal')?.addEventListener('click', () => closeModal(photoModal));
        document.getElementById('cancelPhotoBtn')?.addEventListener('click', () => closeModal(photoModal));
        document.getElementById('savePhotoBtn')?.addEventListener('click', savePhoto);
        
        // Photo upload
        const uploadArea = document.getElementById('uploadArea');
        const photoUpload = document.getElementById('photoUpload');
        
        if (uploadArea && photoUpload) {
            uploadArea.addEventListener('click', () => photoUpload.click());
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('is-dragover');
            });
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('is-dragover');
            });
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('is-dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    photoUpload.files = files;
                    handlePhotoSelect({ target: { files: [files[0]] } });
                }
            });
        }
        
        if (photoUpload) {
            photoUpload.addEventListener('change', handlePhotoSelect);
        }
        
        if (photoModal) {
            photoModal.addEventListener('click', function(e) {
                if (e.target === this) closeModal(photoModal);
            });
        }
        
        // Logout dan notification bell ditangani terpusat di public/js/sidebar.js.
    }

    // ================ EXPOSE GLOBAL FUNCTIONS ================
    window.closeModal = closeModal;

})();