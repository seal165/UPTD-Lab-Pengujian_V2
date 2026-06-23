// public/js/admin/submissions.js

(function() {
    'use strict';

    // ==================== KONFIGURASI ====================
    const API_BASE_URL = 'http://localhost:5000/api';
    const ITEMS_PER_PAGE = 10;

    // State
    let currentPage = 1;
    let currentStatus = '';
    let searchTerm = '';
    let startDate = '';
    let endDate = '';
    let sortOrder = 'desc';
    let currentTestType = '';
    let currentTestCategory = '';
    let totalData = 0;
    let searchTimeout;

    // ==================== CEK TOKEN ====================
    function getToken() {
        return localStorage.getItem('token');
    }

    if (!getToken()) {
        window.location.href = '/admin/login';
        return;
    }

    // ==================== AMBIL DATA DARI ATRIBUT ====================
    const pageData = document.getElementById('page-data');
    if (!pageData) {
        console.error('❌ Element page-data tidak ditemukan');
        return;
    }

    try {
        const initialSubmissions = JSON.parse(pageData.dataset.submissions || '[]');
        const initialPagination = JSON.parse(pageData.dataset.pagination || '{}');
        const initialFilters = JSON.parse(pageData.dataset.filters || '{}');

        if (initialPagination.page) currentPage = initialPagination.page;
        if (initialFilters.status) currentStatus = initialFilters.status;
        if (initialFilters.search) searchTerm = initialFilters.search;
        if (initialFilters.startDate) startDate = initialFilters.startDate;
        if (initialFilters.endDate) endDate = initialFilters.endDate;
        if (initialPagination.total) totalData = initialPagination.total;

        if (initialSubmissions.length > 0) {
            renderTable(initialSubmissions);
            updatePagination(initialPagination);
        } else {
            loadSubmissions();
        }
    } catch (error) {
        console.error('❌ Error parsing page data:', error);
        loadSubmissions();
    }

    // ==================== FUNGSI TOAST/ALERT ====================
    function showAlert(message, type = 'danger', duration = 3000) {
        const alertDiv = document.getElementById('alertMessage');
        if (!alertDiv) return;
        
        alertDiv.style.display = 'flex';
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, duration);
    }

    // ==================== RENDER TABEL ====================
    function renderTable(submissions) {
        const tbody = document.getElementById('submissionsTableBody');
        if (!tbody) return;

        if (!submissions || submissions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p class="text-muted">Tidak ada data pengajuan</p>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        submissions.forEach(sub => {
            // Format tanggal
            const dateStr = sub.tgl_permohonan || sub.created_at;
            const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric'
            }) : '-';
            
            // Nama perusahaan/pemohon
            const namaPerusahaan = sub.nama_instansi || sub.nama_pemohon || '-';
            const namaPemohon = sub.nama_pemohon || '-';
            
            // Jenis pengujian
            const jenisUji = sub.jenis_uji || '-';
            const kategoriUji = sub.kategori_uji || '';
            
            // 🔥 MAPPING STATUS LANGSUNG (tanpa external file)
            let statusClass = 'badge-soft-secondary';
            let statusIcon = 'fa-circle';
            
            switch(sub.status) {
                case 'Menunggu Verifikasi':
                    statusClass = 'badge-soft-warning';
                    statusIcon = 'fa-clock';
                    break;
                case 'Pengecekan Sampel':
                    statusClass = 'badge-soft-info';
                    statusIcon = 'fa-search';
                    break;
                case 'Belum Bayar':
                    statusClass = 'badge-soft-danger';
                    statusIcon = 'fa-credit-card';
                    break;
                case 'Menunggu SKRD Upload':
                    statusClass = 'badge-soft-primary';
                    statusIcon = 'fa-file-invoice';
                    break;
                case 'Belum Lunas':
                    statusClass = 'badge-soft-warning';
                    statusIcon = 'fa-hourglass-half';
                    break;
                case 'Lunas':
                    statusClass = 'badge-soft-success';
                    statusIcon = 'fa-check-circle';
                    break;
                case 'Sedang Diuji':
                    statusClass = 'badge-soft-primary';
                    statusIcon = 'fa-flask';
                    break;
                case 'Selesai':
                    statusClass = 'badge-soft-success';
                    statusIcon = 'fa-check-double';
                    break;
                case 'Dibatalkan':
                    statusClass = 'badge-soft-secondary';
                    statusIcon = 'fa-ban';
                    break;
                default:
                    statusClass = 'badge-soft-secondary';
                    statusIcon = 'fa-circle';
            }
            
            html += `
                <tr style="cursor: pointer;" onclick="viewDetail(${sub.id})">
                    <td>
                        <span class="fw-bold">${sub.no_urut || `#${sub.id}`}</span>
                        <small class="d-block text-muted">${sub.no_permohonan || ''}</small>
                    </td>
                    <td>
                        <div class="fw-bold">${namaPerusahaan}</div>
                        <small class="text-muted">${namaPemohon}</small>
                    </td>
                    <td>
                        <div class="jenis-pengujian-cell">
                            <span class="jenis-pengujian-tipe">${jenisUji}</span>
                            ${kategoriUji ? `<span class="jenis-pengujian-kategori">${kategoriUji}</span>` : ''}
                        </div>
                    </td>
                    <td>${formattedDate}</td>
                    <td>
                        <span class="badge ${statusClass} px-3 py-2 rounded-pill">
                            <i class="fas ${statusIcon} me-1"></i>${sub.status}
                        </span>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-secondary" onclick="viewDetail(${sub.id}); event.stopPropagation();">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    // ==================== UPDATE PAGINATION INFO ====================
    function updatePaginationInfo(pagination) {
        const start = ((pagination.page - 1) * ITEMS_PER_PAGE) + 1;
        const end = Math.min(pagination.page * ITEMS_PER_PAGE, pagination.total);
        const paginationInfo = document.getElementById('paginationInfo');
        
        if (paginationInfo) {
            paginationInfo.innerHTML = `Menampilkan ${start}-${end} dari ${pagination.total} data`;
        }
    }

    // ==================== LOAD DATA ====================
    async function loadSubmissions() {
        console.log('========== LOAD SUBMISSIONS ==========');
        
        try {
            const tbody = document.getElementById('submissionsTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="text-muted mt-2">Memuat data...</p>
                        </td>
                    </tr>
                `;
            }
            
            let url = `${API_BASE_URL}/submissions?page=${currentPage}&limit=${ITEMS_PER_PAGE}`;
            url += `&sort=${sortOrder}`;
            
            if (currentStatus) url += `&status=${encodeURIComponent(currentStatus)}`;
            if (startDate) url += `&start_date=${startDate}`;
            if (endDate) url += `&end_date=${endDate}`;
            if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
            if (currentTestType) url += `&test_type=${encodeURIComponent(currentTestType)}`;
            if (currentTestCategory) url += `&test_category=${encodeURIComponent(currentTestCategory)}`;
            
            console.log('📡 Fetching:', url);

            const response = await fetch(url, {
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

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();
            console.log('📦 Response data:', result);

            if (result.success) {
                const data = result.data;
                totalData = data.total || 0;
                renderTable(data.submissions || []);
                updatePagination(data);
            } else {
                showAlert(result.message || 'Gagal memuat data', 'danger');
            }
        } catch (error) {
            console.error('❌ Error:', error);
            showAlert('Gagal terhubung ke server: ' + error.message, 'danger');
        }
    }

    // ==================== UPDATE PAGINATION ====================
    function updatePagination(data) {
        const itemsTotal = parseInt(data && data.total ? data.total : totalData) || 0;
        const totalPages = Math.ceil(itemsTotal / ITEMS_PER_PAGE);
        const pagination = document.getElementById('pagination');
        const paginationInfo = document.getElementById('paginationInfo');
        
        console.log('🔄 Memperbarui paginasi:', { itemsTotal, totalPages, currentPage });
        
        if (!pagination) {
            console.error('❌ Elemen pagination tidak ditemukan!');
            return;
        }
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            if (paginationInfo) {
                paginationInfo.innerHTML = `Menampilkan ${itemsTotal} data`;
            }
            return;
        }

        const currPage = parseInt(currentPage) || 1;
        let html = '';
        
        html += `
            <li class="page-item ${currPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.changePage(${currPage - 1})">
                    Prev
                </a>
            </li>
        `;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currPage - 2 && i <= currPage + 2)) {
                html += `
                    <li class="page-item ${currPage === i ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="window.changePage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === currPage - 3 || i === currPage + 3) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        html += `
            <li class="page-item ${currPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.changePage(${currPage + 1})">
                    Next
                </a>
            </li>
        `;
        
        console.log('📝 HTML Paginasi generated:', html);
        pagination.innerHTML = html;
        
        if (paginationInfo) {
            const start = ((currPage - 1) * ITEMS_PER_PAGE) + 1;
            const end = Math.min(currPage * ITEMS_PER_PAGE, itemsTotal);
            paginationInfo.innerHTML = `Menampilkan ${start}-${end} dari ${itemsTotal} data`;
        }
    }

    // ==================== FILTER FUNCTIONS ====================
    window.applyFilter = function() {
        startDate = document.getElementById('startDateFilter')?.value || '';
        endDate = document.getElementById('endDateFilter')?.value || '';
        
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            showAlert('Tanggal akhir harus setelah tanggal awal', 'warning');
            return;
        }
        
        currentPage = 1;
        loadSubmissions();
    };

    window.resetDateFilter = function() {
        document.getElementById('startDateFilter').value = '';
        document.getElementById('endDateFilter').value = '';
        startDate = '';
        endDate = '';
        currentPage = 1;
        loadSubmissions();
    };
    
    window.viewDetail = function(id) {
        window.location.href = `/admin/submissions/${id}`;
    };

    window.changePage = function(page) {
        currentPage = page;
        loadSubmissions();
    };

    // ==================== SETUP FILTERS ====================
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ Halaman submissions siap');
        
        const testTypeFilter = document.getElementById('testTypeFilter');
        if (testTypeFilter) {
            testTypeFilter.addEventListener('change', function() {
                currentTestType = this.value;
                currentPage = 1;
                loadSubmissions();
            });
        }
        
        const testCategoryFilter = document.getElementById('testCategoryFilter');
        if (testCategoryFilter) {
            testCategoryFilter.addEventListener('change', function() {
                currentTestCategory = this.value;
                currentPage = 1;
                loadSubmissions();
            });
        }
        
        const statusSelect = document.getElementById('statusSelect');
        if (statusSelect) {
            statusSelect.addEventListener('change', function() {
                currentStatus = this.value;
                currentPage = 1;
                loadSubmissions();
            });
        }
        
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', function() {
                sortOrder = this.value;
                currentPage = 1;
                loadSubmissions();
            });
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    searchTerm = e.target.value;
                    currentPage = 1;
                    loadSubmissions();
                }, 500);
            });
        }
    });
})();