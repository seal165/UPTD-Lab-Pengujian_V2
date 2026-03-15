// public/js/admin/users.js

(function() {
    'use strict';

    // ==================== KONFIGURASI ====================
    const API_BASE_URL = window.location.origin === 'http://localhost:3000' 
        ? 'http://localhost:5000/api' 
        : '/api';
    const ITEMS_PER_PAGE = 10;
    
    // State
    let currentPage = 1;
    let currentStatus = '';
    let searchTerm = '';
    let totalData = 0;
    let allUsers = [];
    let searchTimeout;

    // ==================== CEK TOKEN ====================
    function getToken() {
        return localStorage.getItem('token');
    }

    if (!getToken()) {
        window.location.href = '/admin/login';
        return;
    }

    // ==================== LOAD DATA ====================
    async function loadUsers() {
        try {
            const params = new URLSearchParams({
                page: currentPage,
                limit: ITEMS_PER_PAGE,
                status: currentStatus,
                search: searchTerm
            });

            console.log('📡 Fetching users:', `${API_BASE_URL}/admin/users?${params}`);
            
            const response = await fetch(`${API_BASE_URL}/admin/users?${params}`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/admin/login';
                return;
            }

            const result = await response.json();
            console.log('📦 Users response:', result);

            if (result.success) {
                allUsers = result.data.users || [];
                totalData = result.data.total || 0;
                updateStats(result.data.stats);
                updateUsersTable(allUsers);
                updatePagination();
            } else {
                showAlert(result.message || 'Gagal memuat data', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal terhubung ke server', 'danger');
        } finally {
            const loadingRow = document.getElementById('loadingRow');
            if (loadingRow) {
                loadingRow.style.display = 'none';
            }
        }
    }

    // ==================== UPDATE STATS ====================
    function updateStats(stats) {
        const statsHtml = `
            <div class="col-md-3">
                <div class="stats-card">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <small class="text-muted d-block">Total Pemohon</small>
                            <h3 class="fw-bold mb-0">${stats.total || 0}</h3>
                        </div>
                        <div class="bg-primary-subtle p-2 rounded-circle">
                            <i class="fas fa-users text-primary"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <small class="text-muted d-block">Aktif</small>
                            <h3 class="fw-bold mb-0 text-success">${stats.active || 0}</h3>
                        </div>
                        <div class="bg-success-subtle p-2 rounded-circle">
                            <i class="fas fa-check-circle text-success"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <small class="text-muted d-block">Pending</small>
                            <h3 class="fw-bold mb-0 text-warning">${stats.pending || 0}</h3>
                        </div>
                        <div class="bg-warning-subtle p-2 rounded-circle">
                            <i class="fas fa-clock text-warning"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <small class="text-muted d-block">Perusahaan</small>
                            <h3 class="fw-bold mb-0 text-info">${stats.companies || 0}</h3>
                        </div>
                        <div class="bg-info-subtle p-2 rounded-circle">
                            <i class="fas fa-building text-info"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('statsCards').innerHTML = statsHtml;
    }

    // ==================== UPDATE TABLE ====================
    function updateUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        const emptyState = document.getElementById('emptyState');
        
        const loadingRow = document.getElementById('loadingRow');
        if (loadingRow) loadingRow.style.display = 'none';
        
        if (!users || users.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        const rowsHtml = users.map(user => {
            const initials = (user.name || 'NA').substring(0, 2).toUpperCase();
            const statusClass = user.status === 'active' ? 'badge-soft-success' : 
                            user.status === 'pending' ? 'badge-soft-warning' : 'badge-soft-secondary';
            const statusIcon = user.status === 'active' ? 'fa-check-circle' : 
                            user.status === 'pending' ? 'fa-clock' : 'fa-ban';
            const statusText = user.status === 'active' ? 'Terverifikasi' : 
                            user.status === 'pending' ? 'Menunggu Verifikasi' : 'Nonaktif';
            
            const totalTrans = parseInt(user.total_transactions) || 0;
            
            return `
                <tr>
                    <td class="ps-4">
                        <input type="checkbox" class="form-check-input row-checkbox" value="${user.id}">
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar-initials bg-primary-subtle me-3">
                                ${initials}
                            </div>
                            <div>
                                <div class="fw-bold text-dark">${user.name}</div>
                                <div class="small text-muted">
                                    ${user.company ? 
                                        `<i class="fas fa-building me-1"></i> ${user.company}` : 
                                        '<i class="fas fa-user me-1"></i> Perorangan'
                                    }
                                </div>
                            </div>
                        </div>
                    </td>

                    <td>
                        <div class="d-flex flex-column">
                            <span class="text-dark small">${user.email}</span>
                            <span class="text-muted small">${user.phone || '-'}</span>
                        </div>
                    </td>

                    <td>
                        <span class="badge ${statusClass} rounded-pill px-3">
                            <i class="fas ${statusIcon} me-1"></i>${statusText}
                        </span>
                    </td>

                    <td class="text-muted small">
                        ${formatDate(user.created_at)}
                    </td>

                    <td class="text-center">
                        <span class="fw-bold">${totalTrans}</span>
                    </td>

                    <td class="text-end pe-4">
                        <div class="btn-group">
                            <!-- 🔴 PERBAIKI: Arahkan ke halaman detail user -->
                            <a href="/admin/users/${user.id}" class="btn btn-sm btn-light action-btn" title="Detail">
                                <i class="fas fa-eye"></i>
                            </a>
                            
                            ${user.status === 'pending' ? `
                                <button class="btn btn-sm btn-light text-success action-btn" title="Verifikasi" onclick="window.verifyUser('${user.id}')">
                                    <i class="fas fa-check"></i>
                                </button>
                            ` : ''}
                            
                            <button class="btn btn-sm btn-light text-danger action-btn" title="Hapus" onclick="window.deleteUser('${user.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rowsHtml;

        // Update select all functionality
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            const newSelectAll = selectAll.cloneNode(true);
            selectAll.parentNode.replaceChild(newSelectAll, selectAll);
            newSelectAll.addEventListener('change', (e) => {
                document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = e.target.checked);
            });
        }
    }

    // ==================== FILTER HANDLERS ====================
    function initFilters() {
        document.querySelectorAll('.filter-badge').forEach(badge => {
            badge.addEventListener('click', function() {
                const status = this.dataset.status;
                
                document.querySelectorAll('.filter-badge').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                currentStatus = status;
                currentPage = 1;
                loadUsers();
            });
        });

        document.getElementById('searchInput').addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchTerm = e.target.value;
                currentPage = 1;
                loadUsers();
            }, 500);
        });
    }

    function filterByStatus(status) {
        currentStatus = status;
        currentPage = 1;
        loadUsers();
        
        document.querySelectorAll('.filter-badge').forEach(badge => {
            if (badge.dataset.status === status) {
                badge.classList.add('active');
            } else {
                badge.classList.remove('active');
            }
        });
    }

    function resetFilters() {
        document.getElementById('searchInput').value = '';
        currentStatus = '';
        searchTerm = '';
        currentPage = 1;
        loadUsers();
    }

    // ==================== PAGINATION ====================
    function updatePagination() {
        const totalPages = Math.ceil(totalData / ITEMS_PER_PAGE);
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            document.getElementById('paginationInfo').innerHTML = 
                `Total: <strong>${totalData}</strong> Pemohon`;
            return;
        }

        let paginationHtml = '';
        
        paginationHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.changePage(${currentPage - 1})">Prev</a>
            </li>
        `;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                paginationHtml += `
                    <li class="page-item ${currentPage === i ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="window.changePage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        paginationHtml += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.changePage(${currentPage + 1})">Next</a>
            </li>
        `;

        pagination.innerHTML = paginationHtml;
        
        const start = ((currentPage - 1) * ITEMS_PER_PAGE) + 1;
        const end = Math.min(currentPage * ITEMS_PER_PAGE, totalData);
        document.getElementById('paginationInfo').innerHTML = 
            `Menampilkan ${start}-${end} dari <strong>${totalData}</strong> Pemohon`;
    }

    function changePage(page) {
        currentPage = page;
        loadUsers();
    }

    // ==================== VIEW DETAIL (TIDAK DIGUNAKAN LAGI - PAKAI LINK) ====================
    // Function ini bisa dihapus atau dikomentar karena sekarang pakai link
    /*
    async function viewUser(userId) {
        try {
            console.log('🔍 Viewing user:', userId);
            
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/detail`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            const result = await response.json();
            console.log('📦 User detail:', result);

            if (result.success) {
                const user = result.data;
                
                // Tampilkan di modal detail
                document.getElementById('detailAvatar').textContent = (user.name || 'NA').substring(0, 2).toUpperCase();
                document.getElementById('detailName').textContent = user.name;
                document.getElementById('detailEmail').textContent = user.email;
                document.getElementById('detailPhone').textContent = user.phone || '-';
                document.getElementById('detailCompany').textContent = user.company || '-';
                document.getElementById('detailAddress').textContent = user.address || '-';
                document.getElementById('detailJoined').textContent = formatDate(user.created_at);
                document.getElementById('detailTransactions').textContent = user.total_transactions || 0;
                document.getElementById('detailPayments').textContent = formatRupiah(user.total_payments || 0);
                
                const statusClass = user.status === 'active' ? 'badge-soft-success' : 
                                   user.status === 'pending' ? 'badge-soft-warning' : 'badge-soft-secondary';
                const statusText = user.status === 'active' ? 'Terverifikasi' : 
                                  user.status === 'pending' ? 'Menunggu Verifikasi' : 'Nonaktif';
                
                document.getElementById('detailStatus').className = `badge ${statusClass}`;
                document.getElementById('detailStatus').textContent = statusText;

                // Load transactions
                const transactionsHtml = (user.recent_submissions || []).map(t => `
                    <tr>
                        <td>${formatDate(t.created_at)}</td>
                        <td>${t.registration_number || '-'}</td>
                        <td>${t.test_name || '-'}</td>
                        <td><span class="badge ${getStatusClass(t.status)}">${t.status}</span></td>
                        <td>${formatRupiah(t.amount || 0)}</td>
                    </tr>
                `).join('') || '<tr><td colspan="5" class="text-center py-3">Belum ada transaksi</td></tr>';
                
                document.getElementById('detailTransactionsBody').innerHTML = transactionsHtml;
                
                new bootstrap.Modal(document.getElementById('detailModal')).show();
            } else {
                showAlert(result.message || 'Gagal memuat detail user', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal memuat detail user', 'danger');
        }
    }
    */

    // ==================== USER ACTIONS ====================
    async function verifyUser(userId) {
        if (!confirm('Verifikasi user ini?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                showAlert('User berhasil diverifikasi', 'success');
                loadUsers();
            } else {
                showAlert(result.message || 'Gagal memverifikasi user', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal memverifikasi user', 'danger');
        }
    }

    async function deleteUser(userId) {
        if (!confirm('Hapus user ini? Tindakan ini tidak dapat dibatalkan.')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                showAlert('User berhasil dihapus', 'success');
                loadUsers();
            } else {
                showAlert(result.message || 'Gagal menghapus user', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal menghapus user', 'danger');
        }
    }

    // ==================== EXPORT FUNCTIONS ====================
    function exportToExcel() {
        if (!allUsers || allUsers.length === 0) {
            showAlert('Tidak ada data untuk diexport', 'warning');
            return;
        }

        const headers = [
            'Nama', 'Email', 'Telepon', 'Perusahaan', 'Alamat', 
            'Status', 'Terdaftar', 'Total Transaksi'
        ];
        
        const rows = allUsers.map(user => [
            user.name,
            user.email,
            user.phone || '-',
            user.company || '-',
            user.address || '-',
            user.status === 'active' ? 'Aktif' : user.status === 'pending' ? 'Pending' : 'Nonaktif',
            formatDate(user.created_at),
            user.total_transactions || 0
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pemohon_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    // ==================== HELPER FUNCTIONS ====================
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    function formatRupiah(number) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(number);
    }

    function getStatusClass(status) {
        const classes = {
            'Selesai': 'badge-soft-success',
            'Lunas': 'badge-soft-success',
            'Sedang Diuji': 'badge-soft-primary',
            'Menunggu Verifikasi': 'badge-soft-warning',
            'Pengecekan Sampel': 'badge-soft-warning',
            'Belum Lunas': 'badge-soft-warning',
            'Menunggu Pembayaran': 'badge-soft-warning'
        };
        return classes[status] || 'badge-soft-secondary';
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
    window.loadUsers = loadUsers;
    window.filterByStatus = filterByStatus;
    window.resetFilters = resetFilters;
    // window.viewUser = viewUser; // DIKOMENTAR KARENA PAKAI LINK
    window.verifyUser = verifyUser;
    window.deleteUser = deleteUser;
    window.exportToExcel = exportToExcel;
    window.changePage = changePage;

    // ==================== INITIALIZE ====================
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ Users page initialized');
        
        initFilters();
        loadUsers();
        
        // Auto refresh every 30 seconds
        setInterval(loadUsers, 30000);
    });

})();