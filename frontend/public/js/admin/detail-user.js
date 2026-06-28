// public/js/admin/detail-user.js

(function() {
    'use strict';

    // ==================== KONFIGURASI ====================
    const API_BASE_URL = window.location.origin === 'http://localhost:3000' 
        ? 'http://localhost:5000/api' 
        : '/api';
    
    // Ambil ID dari URL
    const pathParts = window.location.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];

    // State
    let currentPage = 1;
    const ITEMS_PER_PAGE = 5;
    let totalData = 0;
    let userData = null;

    // ==================== CEK TOKEN ====================
    function getToken() {
        return localStorage.getItem('token');
    }

    if (!getToken()) {
        window.location.href = '/admin/login';
        return;
    }

    // ==================== LOAD DATA ====================
    async function loadUserDetail() {
        // Tampilkan loading di tabel
        const tbody = document.getElementById('submissionsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                        Memuat data...
                    </td>
                </tr>
            `;
        }
        
        const timeoutId = setTimeout(() => {
            showAlert('Loading terlalu lama', 'warning');
        }, 8000);
        
        try {
            // 🔴 PAKAI ENDPOINT /admin/users/:id/detail
            const userResponse = await fetch(`${API_BASE_URL}/admin/users/${userId}/detail`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (userResponse.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/admin/login';
                return;
            }

            const userResult = await userResponse.json();
            
            if (!userResult.success) {
                throw new Error(userResult.message || 'Gagal memuat data user');
            }

            userData = userResult.data;
            
            // Update profil
            updateProfile(userData);
            
            // 🔴 AMBIL SUBMISSIONS UNTUK USER INI
            await loadUserSubmissions();
            
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal memuat data: ' + error.message, 'danger');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-4 text-danger">
                            <i class="fas fa-exclamation-circle me-2"></i>
                            Gagal memuat data
                        </td>
                    </tr>
                `;
            }
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async function loadUserSubmissions() {
        try {
            // 🔴 FILTER SUBMISSIONS BERDASARKAN USER ID
            const params = new URLSearchParams({
                user_id: userId,  // <-- INI YANG DITAMBAHKAN
                page: currentPage,
                limit: ITEMS_PER_PAGE
            });

            const response = await fetch(`${API_BASE_URL}/submissions?${params}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            const result = await response.json();
            
            if (result.success) {
                updateSubmissionsTable(result.data.submissions);
                totalData = result.data.total;
                updatePagination();
            }
        } catch (error) {
            console.error('Error loading submissions:', error);
        }
    }

    // ==================== UPDATE PROFILE ====================
    function updateProfile(user) {
            let avatarHtml = '';
            if (user.avatar && user.avatar !== 'null' && user.avatar !== '') {
                // Pastikan URL avatar valid
                let avatarUrl = user.avatar;
                // Jika avatar tidak dimulai dengan http, tambahkan base URL
                if (!avatarUrl.startsWith('http')) {
                    avatarUrl = avatarUrl.startsWith('/') ? `http://localhost:5000${avatarUrl}` : `http://localhost:5000/${avatarUrl}`;
                }
                const initial = (user.name || 'U').charAt(0).toUpperCase();
                avatarHtml = `<img src="${avatarUrl}" alt="${user.name}" class="profile-avatar-img" onerror="this.outerHTML='<div class=\\'profile-avatar\\'>${initial}</div>'">`;
            } else {
                // Fallback ke inisial
                const initial = (user.name || 'U').charAt(0).toUpperCase();
                avatarHtml = `<div class="profile-avatar">${initial}</div>`;
            }
            
            const profileHtml = `
                <div class="d-flex flex-column flex-md-row align-items-center align-items-md-start gap-4">
                    <div class="profile-avatar-wrapper shadow-sm mb-3 mb-md-0">
                        ${avatarHtml}
                    </div>
                    <div class="flex-grow-1 text-center text-md-start w-100">
                        <div class="d-flex flex-column flex-md-row align-items-center gap-3 mb-3">
                            <h4 class="fw-bold mb-0 text-dark">${user.name || '-'}</h4>
                            <span class="badge ${user.status === 'active' ? 'bg-success' : user.status === 'pending' ? 'bg-warning' : 'bg-secondary'} rounded-pill px-3 py-2 fw-normal" style="font-size: 0.85rem;">
                                <i class="fas ${user.status === 'active' ? 'fa-check-circle' : user.status === 'pending' ? 'fa-clock' : 'fa-ban'} me-1"></i>
                                ${user.status === 'active' ? 'Aktif' : user.status === 'pending' ? 'Pending' : 'Nonaktif'}
                            </span>
                        </div>
                        
                        <div class="row g-3">
                            <div class="col-sm-6 col-md-4">
                                <div class="d-flex align-items-center text-muted">
                                    <div class="bg-light rounded p-2 me-3 text-secondary"><i class="fas fa-envelope fa-fw"></i></div>
                                    <div>
                                        <small class="d-block text-muted" style="font-size: 0.7rem;">Email</small>
                                        <span class="text-dark fw-medium" style="font-size: 0.9rem;">${user.email || '-'}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-sm-6 col-md-4">
                                <div class="d-flex align-items-center text-muted">
                                    <div class="bg-light rounded p-2 me-3 text-secondary"><i class="fas fa-phone fa-fw"></i></div>
                                    <div>
                                        <small class="d-block text-muted" style="font-size: 0.7rem;">Telepon</small>
                                        <span class="text-dark fw-medium" style="font-size: 0.9rem;">${user.phone || '-'}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-sm-6 col-md-4">
                                <div class="d-flex align-items-center text-muted">
                                    <div class="bg-light rounded p-2 me-3 text-secondary"><i class="fas fa-building fa-fw"></i></div>
                                    <div>
                                        <small class="d-block text-muted" style="font-size: 0.7rem;">Perusahaan</small>
                                        <span class="text-dark fw-medium" style="font-size: 0.9rem;">${user.company || 'Perorangan'}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-sm-6 col-md-4">
                                <div class="d-flex align-items-center text-muted">
                                    <div class="bg-light rounded p-2 me-3 text-secondary"><i class="fas fa-user-shield fa-fw"></i></div>
                                    <div>
                                        <small class="d-block text-muted" style="font-size: 0.7rem;">Role</small>
                                        <span class="text-dark fw-medium" style="font-size: 0.9rem;">${user.role === 'admin' ? 'Administrator' : 'Pemohon'}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-sm-6 col-md-4">
                                <div class="d-flex align-items-center text-muted">
                                    <div class="bg-light rounded p-2 me-3 text-secondary"><i class="fas fa-calendar-alt fa-fw"></i></div>
                                    <div>
                                        <small class="d-block text-muted" style="font-size: 0.7rem;">Terdaftar Sejak</small>
                                        <span class="text-dark fw-medium" style="font-size: 0.9rem;">${formatDate(user.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-sm-6 col-md-4">
                                <div class="d-flex align-items-center text-muted">
                                    <div class="bg-light rounded p-2 me-3 text-secondary"><i class="fas fa-map-marker-alt fa-fw"></i></div>
                                    <div>
                                        <small class="d-block text-muted" style="font-size: 0.7rem;">Alamat</small>
                                        <span class="text-dark fw-medium" style="font-size: 0.9rem;">${user.address || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('profileCard').innerHTML = profileHtml;

        // Stats row
        const statsHtml = `
            <div class="col-md-3">
                <div class="stat-card-small">
                    <div class="stat-number">${user.total_transactions || 0}</div>
                    <div class="stat-label">Total Pengajuan</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card-small">
                    <div class="stat-number text-success">${user.completed_transactions || 0}</div>
                    <div class="stat-label">Selesai</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card-small">
                    <div class="stat-number text-warning">${user.pending_transactions || 0}</div>
                    <div class="stat-label">Dalam Proses</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card-small">
                    <div class="stat-number text-primary">${formatRupiah(user.total_payments || 0)}</div>
                    <div class="stat-label">Total Pembayaran</div>
                </div>
            </div>
        `;
        
        document.getElementById('statsRow').innerHTML = statsHtml;
    }

    // ==================== UPDATE SUBMISSIONS TABLE ====================
    function updateSubmissionsTable(submissions) {
        const tbody = document.getElementById('submissionsTableBody');
        const countEl = document.getElementById('submissionCount');
        
        if (!submissions || submissions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4 text-muted">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <p>Belum ada pengajuan</p>
                    </td>
                </tr>
            `;
            if (countEl) countEl.textContent = '0 pengajuan';
            return;
        }

        console.log('📦 Rendering submissions:', submissions);

        let rowsHtml = '';
        submissions.forEach(sub => {
            let statusClass = 'badge-soft-secondary';
            
            // Mapping status
            if (sub.status === 'Menunggu Verifikasi') {
                statusClass = 'badge-soft-warning';
            } else if (sub.status === 'Lunas') {
                statusClass = 'badge-soft-success';
            } else if (sub.status === 'Sedang Diuji') {
                statusClass = 'badge-soft-primary';
            } else if (sub.status === 'Selesai') {
                statusClass = 'badge-soft-info';
            } else if (sub.status === 'Belum Lunas') {
                statusClass = 'badge-soft-danger';
            }
            
            // 🔴 PISAHKAN DATA - Jenis Uji hanya menampilkan type_name
            const jenisUji = sub.jenis_uji || '-';
            
            // 🔴 Jenis Sample menampilkan kategori_uji (Tanah, Beton, dll) atau jenis_sample
            // Prioritaskan kategori_uji dulu, baru jenis_sample
            const jenisSample = sub.kategori_uji && sub.kategori_uji !== '-' 
                ? sub.kategori_uji 
                : (sub.jenis_sample || '-');
            
            rowsHtml += `
                <tr>
                    <td class="ps-4"><span class="fw-bold text-dark">${sub.no_permohonan || '#' + sub.id}</span></td>
                    <td><span class="text-secondary small">${jenisUji}</span></td>
                    <td><span class="text-secondary small">${jenisSample}</span></td>
                    <td><span class="text-secondary small">${sub.nama_proyek || '-'}</span></td>
                    <td><span class="text-secondary small">${formatDate(sub.created_at)}</span></td>
                    <td><span class="badge ${statusClass} rounded-pill px-3 py-1"><i class="fas fa-circle me-1" style="font-size: 0.5rem; vertical-align: middle;"></i>${sub.status}</span></td>
                    <td class="fw-bold text-dark small">${formatRupiah(sub.total_tagihan || 0)}</td>
                    <td class="text-center pe-4">
                        <a href="/admin/submissions/${sub.id}" class="text-secondary align-middle action-icon" style="font-size: 1.1rem; text-decoration: none;" title="Detail">
                            <i class="fas fa-external-link-alt"></i>
                        </a>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = rowsHtml;
        if (countEl) countEl.textContent = `${submissions.length} pengajuan`;
    }

    // ==================== PAGINATION ====================
    function updatePagination() {
        const totalPages = Math.ceil(totalData / ITEMS_PER_PAGE);
        const pagination = document.getElementById('pagination');
        const info = document.getElementById('paginationInfo');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            info.innerHTML = `Menampilkan ${totalData} pengajuan`;
            return;
        }

        let paginationHtml = '';
        
        paginationHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Prev</a>
            </li>
        `;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                paginationHtml += `
                    <li class="page-item ${currentPage === i ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        paginationHtml += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
            </li>
        `;

        pagination.innerHTML = paginationHtml;
        
        const start = ((currentPage - 1) * ITEMS_PER_PAGE) + 1;
        const end = Math.min(currentPage * ITEMS_PER_PAGE, totalData);
        info.innerHTML = `Menampilkan ${start}-${end} dari ${totalData} pengajuan`;
    }

    function changePage(page) {
        currentPage = page;
        loadUserSubmissions();
    }

    // ==================== HELPER FUNCTIONS ====================
    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
        } catch {
            return '-';
        }
    }

    function formatRupiah(number) {
        if (number === undefined || number === null) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(number);
    }

    function showAlert(message, type = 'info') {
        let swalType = type === 'danger' ? 'error' : (type === 'primary' ? 'info' : type);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: swalType,
            title: message,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            customClass: {
                popup: 'swal2-toast'
            }
        });
    }

    // ==================== EXPOSE FUNCTIONS TO WINDOW ====================
    window.changePage = changePage;

    // ==================== INITIALIZE ====================
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ Detail user page initialized for user ID:', userId);
        loadUserDetail();
    });

})();