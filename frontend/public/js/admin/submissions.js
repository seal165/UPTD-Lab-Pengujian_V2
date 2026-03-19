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
    let totalData = 0;
    let searchTimeout;

    // ==================== CEK TOKEN ====================
    function getToken() {
        return localStorage.getItem('token'); // GANTI: dari admin_token jadi token
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

        // Set initial state dari data yang dikirim server
        if (initialPagination.page) currentPage = initialPagination.page;
        if (initialFilters.status) currentStatus = initialFilters.status;
        if (initialFilters.search) searchTerm = initialFilters.search;
        if (initialFilters.startDate) startDate = initialFilters.startDate;
        if (initialFilters.endDate) endDate = initialFilters.endDate;
        if (initialPagination.total) totalData = initialPagination.total;

        // Render tabel dari data awal
        if (initialSubmissions.length > 0) {
            renderTable(initialSubmissions);
            updatePaginationInfo(initialPagination);
        } else {
            // Load data jika tidak ada data awal
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
            // Tentukan class status
            let statusClass = 'badge-soft-secondary';
            switch(sub.status) {
                case 'Menunggu Verifikasi':
                    statusClass = 'badge-soft-warning';
                    break;
                case 'Pengecekan Sampel':
                    statusClass = 'badge-soft-info';
                    break;
                case 'Belum Bayar':
                case 'Belum Lunas':
                    statusClass = 'badge-soft-danger';
                    break;
                case 'Menunggu SKRD Upload':
                    statusClass = 'badge-soft-warning';
                    break;
                case 'Lunas':
                    statusClass = 'badge-soft-success';
                    break;
                case 'Sedang Diuji':
                    statusClass = 'badge-soft-primary';
                    break;
                case 'Selesai':
                    statusClass = 'badge-soft-success';
                    break;
            }
            
            // Format tanggal
            const dateStr = sub.tgl_permohonan || sub.created_at;
            const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric'
            }) : '-';
            
            // Nama perusahaan/pemohon
            const namaPerusahaan = sub.nama_instansi || sub.nama_pemohon || '-';
            const namaPemohon = sub.nama_pemohon || '-';
            
            // Jenis pengujian
            const jenisPengujian = sub.jenis_pengujian || '-';
            
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
                        <div>${jenisPengujian}</div>
                        <small class="text-muted">${sub.total_samples || 0} sampel</small>
                    </td>
                    <td>${formattedDate}</td>
                    <td><span class="badge ${statusClass} px-3 py-2 rounded-pill">${sub.status || '-'}</span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewDetail(${sub.id}); event.stopPropagation();">
                            <i class="fas fa-eye"></i>
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
            // Tampilkan loading di tabel
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
            
            // Build URL
            let url = `${API_BASE_URL}/submissions?page=${currentPage}&limit=${ITEMS_PER_PAGE}`;
            url += `&sort=${sortOrder}`;
            
            if (currentStatus) url += `&status=${encodeURIComponent(currentStatus)}`;
            if (startDate) url += `&start_date=${startDate}`;
            if (endDate) url += `&end_date=${endDate}`;
            if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
            
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
        const totalPages = data.totalPages || 1;
        const pagination = document.getElementById('pagination');
        
        if (!pagination) return;
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let html = '';
        
        // Previous button
        if (currentPage > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="window.changePage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></a></li>`;
        }
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<li class="page-item ${currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="window.changePage(${i})">${i}</a>
                </li>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        // Next button
        if (currentPage < totalPages) {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="window.changePage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></a></li>`;
        }
        
        pagination.innerHTML = html;
        
        // Update pagination info
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            const start = ((currentPage - 1) * ITEMS_PER_PAGE) + 1;
            const end = Math.min(currentPage * ITEMS_PER_PAGE, data.total);
            paginationInfo.innerHTML = `Menampilkan ${start}-${end} dari ${data.total} data`;
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
        
        // Setup event listeners
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