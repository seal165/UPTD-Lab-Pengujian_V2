// public/js/admin/settings.js

(function() {
    'use strict';

    // ==================== KONFIGURASI ====================
    const API_BASE_URL = window.location.origin === 'http://localhost:3000' 
        ? 'http://localhost:5000/api' 
        : '/api';
    
    // State
    let adminData = {};
    let systemConfig = {};
    let currentSection = 'profile';
    let logsPage = 1;
    
    // Mode Sibuk State
    let busyModeActive = false;
    let busyPeriods = [];

    // ==================== CEK TOKEN ====================
    function getToken() {
        return localStorage.getItem('token');
    }

    if (!getToken()) {
        window.location.href = '/admin/login';
        return;
    }

    // Helper untuk headers
    function getAuthHeaders() {
        return {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
        };
    }

    // Handle unauthorized
    function handleUnauthorized() {
        localStorage.removeItem('token');
        window.location.href = '/admin/login';
    }

    // ==================== LOAD SETTINGS ====================
    async function loadSettings() {
        try {
            // Load admin profile
            const profileResponse = await fetch(`${API_BASE_URL}/settings/profile`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            
            if (profileResponse.status === 401) {
                handleUnauthorized();
                return;
            }

            const profileResult = await profileResponse.json();
            
            if (profileResult.success) {
                adminData = profileResult.data;
                updateProfileForm(adminData);
            }

            // Load system config
            const configResponse = await fetch(`${API_BASE_URL}/settings/system`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            const configResult = await configResponse.json();
            
            if (configResult.success) {
                systemConfig = configResult.data;
                updateSystemForm(systemConfig);
            }

            // Load mode sibuk
            await loadBusyMode();

            // Load activity logs
            loadActivityLogs();

            // Load backup history
            loadBackupHistory();

            // Load active sessions
            // loadActiveSessions();

        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal memuat pengaturan', 'danger');
        }
    }

    // ==================== UPDATE FORMS ====================
    function updateProfileForm(data) {
        document.getElementById('fullName').value = data.name || '';
        document.getElementById('employeeId').value = data.employee_id || '';
        document.getElementById('officialEmail').value = data.email || '';
        document.getElementById('phoneNumber').value = data.phone || '';
        document.getElementById('position').value = data.position || 'Super Administrator (Kepala Teknis)';
        
        let newAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'Admin+Lab')}&background=047857&color=fff&size=150`;
        
        if (data.avatar) {
            newAvatarUrl = data.avatar;
        } 
        
        document.getElementById('profileImage').src = newAvatarUrl;
        
        // Update avatar di top navbar jika ada
        const navbarAvatar = document.querySelector('.avatar-image');
        if (navbarAvatar) {
            navbarAvatar.src = newAvatarUrl;
        }
        
        document.getElementById('lastProfileUpdate').textContent = data.updated_at ? `Terakhir update: ${formatDate(data.updated_at)}` : '';
    }

    // ==================== SYSTEM CONFIG FUNCTIONS ====================
    function updateSystemForm(data) {
        document.getElementById('institutionName').value = data.institution_name || '';
        document.getElementById('officeAddress').value = data.address || '';
        document.getElementById('officePhone').value = data.phone || '';
        document.getElementById('officeEmail').value = data.email || '';
        document.getElementById('website').value = data.website || '';
        document.getElementById('maintenanceMode').checked = data.maintenance_mode || false;
        document.getElementById('maxUploadSize').value = data.max_upload_size || '5';
    }

    // ==================== PROFILE FUNCTIONS ====================
    async function updateProfile(event) {
        event.preventDefault();
        
        const formData = {
            name: document.getElementById('fullName').value,
            employee_id: document.getElementById('employeeId').value,
            email: document.getElementById('officialEmail').value,
            phone: document.getElementById('phoneNumber').value
        };

        document.getElementById('saveProfileText').style.display = 'none';
        document.getElementById('saveProfileSpinner').style.display = 'inline-block';

        try {
            const response = await fetch(`${API_BASE_URL}/settings/profile`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();

            if (result.success) {
                showAlert('Profil berhasil diperbarui', 'success');
                loadSettings();
            } else {
                showAlert(result.message || 'Gagal memperbarui profil', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal memperbarui profil', 'danger');
        } finally {
            document.getElementById('saveProfileText').style.display = 'inline';
            document.getElementById('saveProfileSpinner').style.display = 'none';
        }
    }

    function previewImage(event) {
        const reader = new FileReader();
        reader.onload = function(){
            document.getElementById('profileImage').src = reader.result;
            
            // Upload image
            uploadProfileImage(event.target.files[0]);
        };
        if(event.target.files[0]){
            reader.readAsDataURL(event.target.files[0]);
        }
    }

    async function uploadProfileImage(file) {
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await fetch(`${API_BASE_URL}/settings/profile/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();

            if (result.success) {
                showAlert('Foto profil berhasil diupload', 'success');
                // 🔥 Refresh data agar avatar terbaru tampil
                await loadSettings();
            } else {
                showAlert('Gagal upload foto', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal upload foto', 'danger');
        }
    }

    async function removeProfileImage() {
        if (!confirm('Hapus foto profil?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/settings/profile/avatar`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();

            if (result.success) {
                const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(adminData.name || 'Admin+Lab')}&background=047857&color=fff&size=150`;
                document.getElementById('profileImage').src = defaultAvatar;
                
                // Update navbar avatar
                const navbarAvatar = document.querySelector('.avatar-image');
                if (navbarAvatar) {
                    navbarAvatar.src = defaultAvatar;
                }
                
                showAlert('Foto profil dihapus', 'success');
            } else {
                showAlert('Gagal menghapus foto', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal menghapus foto', 'danger');
        }
    }

    // ==================== PASSWORD FUNCTIONS ====================
    function checkPasswordStrength() {
        const password = document.getElementById('newPassword').value;
        const strengthBar = document.getElementById('passwordStrength');
        const hint = document.getElementById('passwordHint');
        
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/)) strength++;
        if (password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^a-zA-Z0-9]/)) strength++;
        
        const colors = ['#dc3545', '#ffc107', '#ffc107', '#28a745', '#28a745'];
        const texts = ['Sangat Lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat Kuat'];
        
        strengthBar.style.width = '100%';
        strengthBar.style.backgroundColor = colors[strength];
        strengthBar.style.height = '5px';
        hint.textContent = texts[strength];
    }

    function checkPasswordMatch() {
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;
        const hint = document.getElementById('passwordMatchHint');
        
        if (confirmPass) {
            if (newPass === confirmPass) {
                hint.innerHTML = '<i class="fas fa-check text-success"></i> Password cocok';
                hint.className = 'text-success';
            } else {
                hint.innerHTML = '<i class="fas fa-times text-danger"></i> Password tidak cocok';
                hint.className = 'text-danger';
            }
        }
    }

    async function changePassword(event) {
        event.preventDefault();
        
        const currentPass = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;

        if (newPass !== confirmPass) {
            showAlert('Password baru tidak cocok', 'danger');
            return;
        }

        if (newPass.length < 8) {
            showAlert('Password minimal 8 karakter', 'danger');
            return;
        }

        document.getElementById('changePasswordText').style.display = 'none';
        document.getElementById('changePasswordSpinner').style.display = 'inline-block';

        try {
            const response = await fetch(`${API_BASE_URL}/settings/password`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    current_password: currentPass,
                    new_password: newPass
                })
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();

            if (result.success) {
                showAlert('Password berhasil diubah', 'success');
                document.getElementById('passwordForm').reset();
                document.getElementById('lastPasswordChange').textContent = `Terakhir diubah: ${formatDate(new Date())}`;
            } else {
                showAlert(result.message || 'Gagal mengubah password', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal mengubah password', 'danger');
        } finally {
            document.getElementById('changePasswordText').style.display = 'inline';
            document.getElementById('changePasswordSpinner').style.display = 'none';
        }
    }

    // ==================== SYSTEM CONFIG FUNCTIONS ====================
    async function updateSystemConfig(event) {
        event.preventDefault();
        
        const config = {
            institution_name: document.getElementById('institutionName').value,
            address: document.getElementById('officeAddress').value,
            phone: document.getElementById('officePhone').value,
            email: document.getElementById('officeEmail').value,
            website: document.getElementById('website').value,
            maintenance_mode: document.getElementById('maintenanceMode').checked,
            max_upload_size: parseInt(document.getElementById('maxUploadSize').value)
        };

        try {
            const response = await fetch(`${API_BASE_URL}/settings/system`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(config)
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();

            if (result.success) {
                showAlert('Konfigurasi berhasil disimpan', 'success');
            } else {
                showAlert(result.message || 'Gagal menyimpan konfigurasi', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal menyimpan konfigurasi', 'danger');
        }
    }

    // ==================== MODE SIBUK FUNCTIONS ====================
    async function loadBusyMode() {
        try {
            const response = await fetch(`${API_BASE_URL}/settings/busy-mode`, {
                headers: getAuthHeaders()
            });
            
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();
            
            if (result.success) {
                busyModeActive = result.data.active || false;
                busyPeriods = result.data.periods || [];
            }
            
            // Update UI
            document.getElementById('busyModeToggle').checked = busyModeActive;
            document.getElementById('busyPeriodContainer').style.display = busyModeActive ? 'block' : 'none';
            renderBusyPeriods();
            
        } catch (error) {
            console.error('Error loading busy mode:', error);
            showAlert('Gagal memuat mode sibuk', 'danger');
        }
    }

    // Toggle mode sibuk
    if (document.getElementById('busyModeToggle')) {
        document.getElementById('busyModeToggle').addEventListener('change', function(e) {
            busyModeActive = e.target.checked;
            document.getElementById('busyPeriodContainer').style.display = busyModeActive ? 'block' : 'none';
        });
    }

    // Render daftar periode sibuk
    function renderBusyPeriods() {
        const container = document.getElementById('busyPeriodList');
        
        if (!busyPeriods || busyPeriods.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-calendar-times fa-2x mb-2"></i>
                    <p>Belum ada periode sibuk</p>
                </div>
            `;
            return;
        }
        
        busyPeriods.sort((a, b) => new Date(a.tanggal_mulai) - new Date(b.tanggal_mulai));
        
        let html = '<div class="list-group">';
        busyPeriods.forEach(period => {
            const mulai = new Date(period.tanggal_mulai);
            const selesai = new Date(period.tanggal_selesai);
            const durasi = Math.ceil((selesai - mulai) / (1000 * 60 * 60 * 24)) + 1;
            
            html += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="fw-bold mb-1">${period.keterangan}</h6>
                        <p class="mb-0 small text-muted">
                            ${formatDate(period.tanggal_mulai)} - ${formatDate(period.tanggal_selesai)}
                            <span class="badge bg-light text-dark ms-2">${durasi} hari</span>
                        </p>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-light me-1" onclick="editPeriode(${period.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-light text-danger" onclick="hapusPeriode(${period.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }

    function tambahPeriodeSibuk() {
        document.getElementById('periodFormTitle').textContent = 'Tambah Periode Sibuk';
        document.getElementById('periodId').value = '';
        document.getElementById('periodKeterangan').value = '';
        
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        document.getElementById('periodMulai').value = formatDateForInput(today);
        document.getElementById('periodSelesai').value = formatDateForInput(nextWeek);
        
        document.getElementById('busyPeriodForm').style.display = 'block';
    }

    function editPeriode(id) {
        const period = busyPeriods.find(p => p.id === id);
        if (!period) return;
        
        document.getElementById('periodFormTitle').textContent = 'Edit Periode Sibuk';
        document.getElementById('periodId').value = period.id;
        document.getElementById('periodKeterangan').value = period.keterangan;
        document.getElementById('periodMulai').value = period.tanggal_mulai;
        document.getElementById('periodSelesai').value = period.tanggal_selesai;
        
        document.getElementById('busyPeriodForm').style.display = 'block';
    }

    function batalEditPeriode() {
        document.getElementById('busyPeriodForm').style.display = 'none';
    }

    async function simpanPeriode() {
        const id = document.getElementById('periodId').value;
        const keterangan = document.getElementById('periodKeterangan').value;
        const tanggalMulai = document.getElementById('periodMulai').value;
        const tanggalSelesai = document.getElementById('periodSelesai').value;
        
        if (!keterangan || !tanggalMulai || !tanggalSelesai) {
            showAlert('Semua field harus diisi', 'warning');
            return;
        }
        
        if (new Date(tanggalMulai) > new Date(tanggalSelesai)) {
            showAlert('Tanggal selesai harus setelah tanggal mulai', 'danger');
            return;
        }
        
        try {
            const url = id ? 
                `${API_BASE_URL}/settings/busy-mode/periods/${id}` : 
                `${API_BASE_URL}/settings/busy-mode/periods`;
            
            const method = id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    keterangan,
                    tanggal_mulai: tanggalMulai,
                    tanggal_selesai: tanggalSelesai
                })
            });
            
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            
            const result = await response.json();
            
            if (result.success) {
                showAlert(id ? 'Periode berhasil diupdate' : 'Periode berhasil ditambahkan', 'success');
                document.getElementById('busyPeriodForm').style.display = 'none';
                await loadBusyMode();
            } else {
                showAlert(result.message || 'Gagal menyimpan periode', 'danger');
            }
            
        } catch (error) {
            console.error('Error saving period:', error);
            showAlert('Gagal menyimpan periode', 'danger');
        }
    }

    async function hapusPeriode(id) {
        if (!confirm('Hapus periode ini?')) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/settings/busy-mode/periods/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            
            const result = await response.json();
            
            if (result.success) {
                showAlert('Periode berhasil dihapus', 'success');
                await loadBusyMode();
            } else {
                showAlert(result.message || 'Gagal menghapus periode', 'danger');
            }
            
        } catch (error) {
            console.error('Error deleting period:', error);
            showAlert('Gagal menghapus periode', 'danger');
        }
    }

    // ==================== SIMPAN MODE SIBUK ====================
    async function simpanModeSibuk(event) {
        if (event) event.preventDefault();
        
        try {
            const response = await fetch(`${API_BASE_URL}/settings/busy-mode`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    active: busyModeActive
                })
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();

            if (result.success) {
                showAlert('Mode sibuk berhasil diperbarui', 'success');
                await loadBusyMode();
            } else {
                showAlert(result.message || 'Gagal memperbarui mode sibuk', 'danger');
            }
        } catch (error) {
            console.error('Error saving busy mode status:', error);
            showAlert('Gagal memperbarui mode sibuk', 'danger');
        }
    }

    // ==================== BACKUP & RESTORE ====================
    async function loadBackupHistory() {
        try {
            const response = await fetch(`${API_BASE_URL}/settings/backups`, {
                headers: getAuthHeaders()
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();
            const container = document.getElementById('backupHistory');

            if (result.success && result.data && result.data.length > 0) {
                let html = '<div class="table-responsive"><table class="table table-hover align-middle">';
                html += '<thead><tr><th>Tanggal</th><th>Nama File</th><th>Ukuran</th><th>Aksi</th></tr></thead><tbody>';
                
                result.data.forEach(backup => {
                    const sizeInKB = (backup.size / 1024).toFixed(2);
                    // 🔥 Perbaiki URL: pakai API_BASE_URL (dengan /api)
                    const downloadUrl = `${API_BASE_URL}/backups/${backup.filename}?token=${getToken()}`;
                    html += `
                        <tr>
                            <td>${formatDate(backup.created_at)}</td>
                            <td><code class="small">${backup.filename}</code></td>
                            <td>${sizeInKB} KB</td>
                            <td>
                                <a href="${downloadUrl}" class="btn btn-sm btn-outline-primary" title="Download" target="_blank">
                                    <i class="fas fa-download"></i>
                                </a>
                            </td>
                        </tr>
                    `;
                });
                
                html += '</tbody></table></div>';
                container.innerHTML = html;
            } else {
                container.innerHTML = `
                    <div class="text-center py-4 text-muted">
                        <i class="fas fa-database fa-2x mb-2"></i>
                        <p>Belum ada backup database</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading backup history:', error);
            document.getElementById('backupHistory').innerHTML = `
                <div class="text-center py-4 text-danger">
                    <i class="fas fa-exclamation-circle fa-2x mb-2"></i>
                    <p>Gagal memuat history backup</p>
                </div>
            `;
        }
    }

    async function createBackup() {
        showAlert('Membuat backup database...', 'info');
        
        try {
            const response = await fetch(`${API_BASE_URL}/settings/backup`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();

            if (result.success) {
                showAlert('Backup berhasil dibuat', 'success');
                await loadBackupHistory(); // 🔥 Muat ulang history
            } else {
                showAlert(result.message || 'Gagal membuat backup', 'danger');
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            showAlert('Gagal membuat backup', 'danger');
        }
    }

    async function restoreBackup() {
        const fileInput = document.getElementById('restoreFile');
        if (!fileInput.files || fileInput.files.length === 0) return;

        const file = fileInput.files[0];
        if (!confirm(`Restore database menggunakan file "${file.name}"? Data saat ini mungkin akan tertimpa.`)) {
            fileInput.value = '';
            return;
        }

        showAlert('Mengembalikan database... Mohon tunggu', 'info');

        const formData = new FormData();
        formData.append('backup_file', file);

        try {
            const response = await fetch(`${API_BASE_URL}/settings/restore`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();

            if (result.success) {
                showAlert('Restore database berhasil. Memuat ulang data...', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                showAlert(result.message || 'Gagal restore database', 'danger');
            }
        } catch (error) {
            console.error('Error restoring backup:', error);
            showAlert('Gagal restore database', 'danger');
        } finally {
            fileInput.value = '';
        }
    }

    // ==================== ACTIVITY LOGS ====================
    async function loadActivityLogs() {
        const filter = document.getElementById('logFilter').value;
        logsPage = 1;

        try {
            // 🔥 Ganti filter menjadi type
            const response = await fetch(`${API_BASE_URL}/settings/logs?page=${logsPage}&limit=10&type=${filter}`, {
                headers: getAuthHeaders()
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();
            const container = document.getElementById('activityLogs');

            if (result.success && result.data && result.data.length > 0) {
                renderLogs(result.data, false);
            } else {
                container.innerHTML = `
                    <div class="text-center py-4 text-muted">
                        <i class="fas fa-history fa-2x mb-2"></i>
                        <p>Tidak ada log aktivitas ditemukan</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    }

    async function loadMoreLogs() {
        const filter = document.getElementById('logFilter').value;
        logsPage++;

        try {
            const response = await fetch(`${API_BASE_URL}/settings/logs?page=${logsPage}&limit=10&filter=${filter}`, {
                headers: getAuthHeaders()
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();

            if (result.success && result.data && result.data.length > 0) {
                renderLogs(result.data, true);
            } else {
                showAlert('Semua log sudah ditampilkan', 'info');
            }
        } catch (error) {
            console.error('Error loading more logs:', error);
        }
    }

    function renderLogs(logs, append = false) {
        const container = document.getElementById('activityLogs');
        let html = '';

        logs.forEach(log => {
            let iconClass = 'fa-info-circle text-info';
            let borderStyle = 'border-info';

            // Tentukan ikon berdasarkan activity_name
            const activity = (log.activity_name || '').toLowerCase();
            if (activity.includes('login')) {
                iconClass = 'fa-sign-in-alt text-primary';
                borderStyle = 'border-primary';
            } else if (activity.includes('update') || activity.includes('edit')) {
                iconClass = 'fa-edit text-warning';
                borderStyle = 'border-warning';
            } else if (activity.includes('create') || activity.includes('add') || activity.includes('tambah')) {
                iconClass = 'fa-plus-circle text-success';
                borderStyle = 'border-success';
            } else if (activity.includes('delete') || activity.includes('hapus')) {
                iconClass = 'fa-trash text-danger';
                borderStyle = 'border-danger';
            } else if (activity.includes('backup')) {
                iconClass = 'fa-database text-secondary';
                borderStyle = 'border-secondary';
            } else if (activity.includes('verifikasi') || activity.includes('verify')) {
                iconClass = 'fa-check-circle text-success';
                borderStyle = 'border-success';
            }

            // 🔥 Gunakan activity_name sebagai deskripsi, user_name dari join
            const userName = log.user_name || 'System';
            const ip = log.ip_address || '-';
            const activityName = log.activity_name || 'Aktivitas';

            html += `
                <div class="activity-item p-3 mb-2 bg-white rounded shadow-sm border-start border-3 ${borderStyle}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <div class="me-3 fs-5">
                                <i class="fas ${iconClass}"></i>
                            </div>
                            <div>
                                <div class="fw-bold small text-dark">${activityName}</div>
                                <div class="text-muted small">Oleh: ${userName} • IP: ${ip}</div>
                            </div>
                        </div>
                        <div class="text-end">
                            <span class="small text-muted">${formatDate(log.created_at)}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        if (append) {
            container.innerHTML += html;
        } else {
            container.innerHTML = html;
        }
    }

    // ==================== ACTIVE SESSIONS ====================
    // async function loadActiveSessions() {
    //     try {
    //         const response = await fetch(`${API_BASE_URL}/settings/sessions`, {
    //             headers: getAuthHeaders()
    //         });

    //         if (response.status === 401) {
    //             handleUnauthorized();
    //             return;
    //         }

    //         const result = await response.json();
    //         console.log('Active Sessions:', result);
    //     } catch (error) {
    //         console.error('Error loading sessions:', error);
    //     }
    // }

    // ==================== NAVIGATION / SWITCH TAB ====================
    window.switchSection = function(sectionId) {
        currentSection = sectionId;
        
        // Sembunyikan semua section
        document.querySelectorAll('.settings-section').forEach(section => {
            section.style.display = 'none';
        });

        // Tampilkan section yang dipilih
        const activeSection = document.getElementById(`${sectionId}-section`);
        if (activeSection) {
            activeSection.style.display = 'block';
        }

        // Update active class navigation
        document.querySelectorAll('#settingsNav a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
            }
        });
    };

    // ==================== PASSWORD UI TOGGLE ====================
    window.togglePassword = function(inputId) {
        const input = document.getElementById(inputId);
        const icon = input.nextElementSibling.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    };

    // ==================== NOTIFICATION SYSTEM ====================
    window.showAlert = function(message, type = 'info') {
        const alertBox = document.getElementById('alertMessage');
        if (!alertBox) return;

        alertBox.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        alertBox.style.zIndex = '10000';
        alertBox.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertBox.style.display = 'block';

        // Auto close after 4 seconds
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alertBox);
            bsAlert.close();
        }, 4000);
    };

    // ==================== DATE FORMATTERS ====================
    function formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;

        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        
        const day = d.getDate();
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');

        return `${day} ${month} ${year} ${hours}:${minutes}`;
    }

    function formatDateForInput(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    // Bind functions to window context for onclick inline triggers in EJS
    window.updateProfile = updateProfile;
    window.previewImage = previewImage;
    window.removeProfileImage = removeProfileImage;
    window.checkPasswordStrength = checkPasswordStrength;
    window.checkPasswordMatch = checkPasswordMatch;
    window.changePassword = changePassword;
    window.updateSystemConfig = updateSystemConfig;
    window.tambahPeriodeSibuk = tambahPeriodeSibuk;
    window.editPeriode = editPeriode;
    window.batalEditPeriode = batalEditPeriode;
    window.simpanPeriode = simpanPeriode;
    window.hapusPeriode = hapusPeriode;
    window.simpanModeSibuk = simpanModeSibuk;
    window.createBackup = createBackup;
    window.restoreBackup = restoreBackup;
    window.loadActivityLogs = loadActivityLogs;
    window.loadMoreLogs = loadMoreLogs;

    // ==================== INITIATE LOAD ====================
    document.addEventListener('DOMContentLoaded', () => {
        loadSettings();
    });

})();