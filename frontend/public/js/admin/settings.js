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
            loadActiveSessions();

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
        
        if (data.avatar) {
            document.getElementById('profileImage').src = data.avatar;
        } else {
            document.getElementById('profileImage').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'Admin+Lab')}&background=667eea&color=fff&size=150`;
        }
        
        document.getElementById('lastProfileUpdate').textContent = data.updated_at ? `Terakhir update: ${formatDate(data.updated_at)}` : '';
    }

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
                document.getElementById('profileImage').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(adminData.name || 'Admin+Lab')}&background=667eea&color=fff&size=150`;
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
        // 🔴 TERIMA EVENT PARAMETER
        if (!event) event = window.event;
        
        const saveBtn = event.target;
        const originalText = saveBtn.innerHTML;
        
        try {
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...';
            saveBtn.disabled = true;
            
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
                showAlert('Mode sibuk berhasil disimpan', 'success');
                
                if (busyModeActive) {
                    showAlert(
                        `<i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>Mode Sibuk AKTIF</strong><br>
                        Estimasi waktu pengerjaan akan bertambah.`,
                        'warning',
                        8000
                    );
                } else {
                    showAlert(
                        `<i class="fas fa-check-circle me-2"></i>
                        <strong>Mode Sibuk Nonaktif</strong>`,
                        'info',
                        5000
                    );
                }
                
                // Simpan ke localStorage
                localStorage.setItem('busyMode', JSON.stringify({
                    active: busyModeActive,
                    periods: busyPeriods,
                    lastUpdated: new Date().toISOString()
                }));
                
            } else {
                showAlert(result.message || 'Gagal menyimpan mode sibuk', 'danger');
            }
            
        } catch (error) {
            console.error('Error saving busy mode:', error);
            showAlert('Gagal menyimpan mode sibuk: ' + error.message, 'danger');
        } finally {
            // 🔴 PASTIKAN INI SELALU DIJALANKAN
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    // ==================== ACTIVITY LOGS FUNCTIONS ====================
    async function loadActivityLogs() {
        const filter = document.getElementById('logFilter').value;

        try {
            const response = await fetch(`${API_BASE_URL}/settings/logs?type=${filter}&page=${logsPage}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();

            if (result.success) {
                const logs = result.data;
                
                if (!logs || logs.length === 0) {
                    document.getElementById('activityLogs').innerHTML = '<p class="text-muted text-center">Belum ada aktivitas</p>';
                    return;
                }
                
                // Di function loadActivityLogs, ganti bagian ini:

                const logsHtml = logs.map(log => {
                    let icon = 'info-circle';
                    let color = 'primary';
                    let description = '';
                    
                    // Buat deskripsi berdasarkan activity_name
                    if (log.activity_name) {
                        if (log.activity_name.toLowerCase().includes('login')) { 
                            icon = 'sign-in-alt'; 
                            color = 'success';
                            description = 'Melakukan login ke sistem';
                        }
                        else if (log.activity_name.toLowerCase().includes('register')) { 
                            icon = 'user-plus'; 
                            color = 'info';
                            description = 'Mendaftarkan akun baru';
                        }
                        else if (log.activity_name.toLowerCase().includes('update') || log.activity_name.toLowerCase().includes('edit')) { 
                            icon = 'edit'; 
                            color = 'warning';
                            description = 'Memperbarui data';
                        }
                        else if (log.activity_name.toLowerCase().includes('create') || log.activity_name.toLowerCase().includes('add')) { 
                            icon = 'plus-circle'; 
                            color = 'info';
                            description = 'Menambahkan data baru';
                        }
                        else if (log.activity_name.toLowerCase().includes('delete') || log.activity_name.toLowerCase().includes('hapus')) { 
                            icon = 'trash'; 
                            color = 'danger';
                            description = 'Menghapus data';
                        }
                        else if (log.activity_name.toLowerCase().includes('backup')) { 
                            icon = 'database'; 
                            color = 'secondary';
                            description = 'Membuat backup database';
                        }
                        else if (log.activity_name.toLowerCase().includes('restore')) { 
                            icon = 'undo'; 
                            color = 'secondary';
                            description = 'Merestore database';
                        }
                        else if (log.activity_name.toLowerCase().includes('verify')) { 
                            icon = 'check-circle'; 
                            color = 'success';
                            description = 'Memverifikasi user';
                        }
                        else {
                            description = log.activity_name;
                        }
                    }
                    
                    return `
                        <div class="activity-item border-${color} ps-3 mb-3">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <span class="badge bg-${color} bg-opacity-10 text-${color} mb-2">
                                        <i class="fas fa-${icon} me-1"></i>${log.activity_name || 'Aktivitas'}
                                    </span>
                                    <p class="mb-1">${description}</p>  <!-- Deskripsi yang lebih jelas -->
                                </div>
                                <small class="text-muted">${formatDateTime(log.created_at)}</small>
                            </div>
                            <small class="text-muted">
                                <i class="fas fa-user me-1"></i>${log.user_name || 'System'}
                                ${log.ip_address ? ` · <i class="fas fa-network-wired me-1"></i>${log.ip_address}` : ''}
                                ${log.user_agent ? ` · <i class="fas fa-globe me-1"></i>${log.user_agent.substring(0, 30)}...` : ''}
                            </small>
                        </div>
                    `;
                }).join('');

                document.getElementById('activityLogs').innerHTML = logsHtml;
            }
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('activityLogs').innerHTML = '<p class="text-muted text-center">Gagal memuat log</p>';
        }
    }

    function loadMoreLogs() {
        logsPage++;
        loadActivityLogs();
    }

    // ==================== BACKUP FUNCTIONS ====================
    async function createBackup() {
        try {
            const response = await fetch(`${API_BASE_URL}/settings/backup`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();

            if (result.success) {
                showAlert('Backup berhasil dibuat', 'success');
                
                if (result.data && result.data.url) {
                    const a = document.createElement('a');
                    a.href = result.data.url;
                    a.download = result.data.filename;
                    a.click();
                }
                
                loadBackupHistory();
            } else {
                showAlert('Gagal membuat backup', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal membuat backup', 'danger');
        }
    }

    async function restoreBackup() {
        const file = document.getElementById('restoreFile').files[0];
        if (!file) return;

        if (!confirm('Restore akan menimpa semua data. Lanjutkan?')) return;

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
                showAlert('Restore berhasil', 'success');
            } else {
                showAlert('Gagal restore', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal restore', 'danger');
        }
    }

    async function loadBackupHistory() {
        try {
            const response = await fetch(`${API_BASE_URL}/settings/backups`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();

            if (result.success) {
                const backups = result.data;
                
                if (!backups || backups.length === 0) {
                    document.getElementById('backupHistory').innerHTML = '<p class="text-muted text-center">Belum ada backup</p>';
                    return;
                }
                
                const historyHtml = backups.map(b => `
                    <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                        <div>
                            <i class="fas fa-file-archive me-2 text-primary"></i>
                            <span>${b.filename}</span>
                            <small class="text-muted ms-2">${formatFileSize(b.size)}</small>
                        </div>
                        <div>
                            <small class="text-muted me-3">${formatDateTime(b.created_at)}</small>
                            <a href="${b.url}" class="btn btn-sm btn-outline-primary" download>
                                <i class="fas fa-download"></i>
                            </a>
                        </div>
                    </div>
                `).join('');

                document.getElementById('backupHistory').innerHTML = historyHtml;
            }
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('backupHistory').innerHTML = '<p class="text-muted text-center">Gagal memuat backup</p>';
        }
    }

    // ==================== SESSION FUNCTIONS ====================
    async function loadActiveSessions() {
        try {
            const response = await fetch(`${API_BASE_URL}/settings/sessions`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();

            if (result.success) {
                const sessions = result.data;
                
                if (!sessions || sessions.length === 0) {
                    return;
                }
                
                // TODO: Tampilkan di UI jika ada tempatnya
                console.log('Active sessions:', sessions);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function logoutAllDevices() {
        if (!confirm('Logout dari semua perangkat lain?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/settings/sessions/logout-all`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const result = await response.json();

            if (result.success) {
                showAlert('Berhasil logout dari semua perangkat lain', 'success');
            } else {
                showAlert('Gagal logout', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal logout', 'danger');
        }
    }

    // ==================== NAVIGATION ====================
    function switchSection(section) {
        currentSection = section;
        
        document.querySelectorAll('.list-group-item').forEach(item => {
            item.classList.remove('active');
        });
        
        event.target.closest('.list-group-item').classList.add('active');
        
        document.querySelectorAll('.settings-section').forEach(s => s.style.display = 'none');
        document.getElementById(`${section}-section`).style.display = 'block';
        
        window.location.hash = section;
    }

    // ==================== UTILITY FUNCTIONS ====================
    function togglePassword(inputId) {
        const input = document.getElementById(inputId);
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    function formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return formatDate(dateString) + ' ' + 
               String(date.getHours()).padStart(2, '0') + ':' + 
               String(date.getMinutes()).padStart(2, '0');
    }

    function formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function showAlert(message, type) {
        const alertDiv = document.getElementById('alertMessage');
        alertDiv.style.display = 'block';
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.style.display='none'"></button>
        `;
        
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 5000);
    }

    // ==================== EXPOSE FUNCTIONS TO WINDOW ====================
    window.switchSection = switchSection;
    window.updateProfile = updateProfile;
    window.previewImage = previewImage;
    window.removeProfileImage = removeProfileImage;
    window.changePassword = changePassword;
    window.togglePassword = togglePassword;
    window.checkPasswordStrength = checkPasswordStrength;
    window.checkPasswordMatch = checkPasswordMatch;
    window.updateSystemConfig = updateSystemConfig;
    window.loadBusyMode = loadBusyMode;
    window.tambahPeriodeSibuk = tambahPeriodeSibuk;
    window.editPeriode = editPeriode;
    window.batalEditPeriode = batalEditPeriode;
    window.simpanPeriode = simpanPeriode;
    window.hapusPeriode = hapusPeriode;
    window.simpanModeSibuk = simpanModeSibuk;
    window.loadActivityLogs = loadActivityLogs;
    window.loadMoreLogs = loadMoreLogs;
    window.createBackup = createBackup;
    window.restoreBackup = restoreBackup;
    window.logoutAllDevices = logoutAllDevices;

    // ==================== INITIALIZE ====================
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ Settings page initialized');
        loadSettings();
        
        const hash = window.location.hash.substring(1);
        if (hash) {
            const link = document.querySelector(`[href="#${hash}"]`);
            if (link) link.click();
        }
    });

})();