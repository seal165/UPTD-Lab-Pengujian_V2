// frontend/public/js/admin/skrd.js

(function() {
    'use strict';

    // ==================== KONFIGURASI ====================
    const API_BASE_URL = 'http://localhost:5000/api';
    const ITEMS_PER_PAGE = 10;
    const LOAD_TIMEOUT = 5000;
    
    // State
    let currentPage = 1;
    let currentStatus = '';
    let searchTerm = '';
    let startDate = '';
    let endDate = '';
    let totalData = 0;
    let allInvoices = [];
    let loadingTimeout;
    let refreshInterval;

    // Cache
    const cache = {
        invoices: { data: null, timestamp: null, params: '' }
    };
    const CACHE_DURATION = 30000;

    // ==================== CEK TOKEN ====================
    function getToken() {
        return localStorage.getItem('token');
    }

    if (!getToken()) {
        window.location.href = '/admin/login';
        return;
    }

    // ==================== FUNGSI TOAST ====================
    function showToast(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} alert-dismissible fade show`;
        toast.role = 'alert';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }

    // ==================== FETCH WITH TIMEOUT ====================
    async function fetchWithTimeout(url, options = {}, timeout = LOAD_TIMEOUT) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    // ==================== LOAD DATA DARI DATABASE ====================
    async function loadInvoices(showLoadingIndicator = true) {
        if (showLoadingIndicator) showLoading(true);
        
        const loadingRow = document.getElementById('loadingRow');
        if (loadingRow) loadingRow.style.display = '';
        
        loadingTimeout = setTimeout(() => {
            console.log('⚠️ Loading timeout');
        }, 3000);
        
        try {
            const params = new URLSearchParams({
                page: currentPage,
                limit: ITEMS_PER_PAGE
            });
            
            if (currentStatus) params.append('status', currentStatus);
            if (searchTerm) params.append('search', searchTerm);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            console.log('📡 Fetching SKRD data with params:', params.toString());
            
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/skrd?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                    }
                },
                5000
            );

            clearTimeout(loadingTimeout);

            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/admin/login';
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('📦 Data dari database:', result);

            if (result.success) {
                allInvoices = result.data.invoices || [];
                totalData = result.data.total || 0;
                
                updateStats(result.data.stats);
                
                setTimeout(() => {
                    updateInvoicesTable(allInvoices);
                    updatePagination();
                }, 10);
            } else {
                showAlert(result.message || 'Gagal memuat data', 'danger');
                if (loadingRow) loadingRow.style.display = 'none';
            }
        } catch (error) {
            clearTimeout(loadingTimeout);
            console.error('Error:', error);
            
            if (loadingRow) loadingRow.style.display = 'none';
            
            if (error.message.includes('timeout')) {
                showAlert('Koneksi lambat, silakan coba lagi', 'warning');
            } else {
                showAlert('Gagal terhubung ke server: ' + error.message, 'danger');
            }
        } finally {
            if (showLoadingIndicator) showLoading(false);
        }
    }

    // ==================== UPDATE STATS ====================
    function updateStats(stats) {
        if (!stats) return;
        
        // Konsisten: "Belum Bayar" untuk pending + waiting verification
        const totalBelumBayar = (stats.pendingCount || 0) + (stats.waitingVerification || 0);
        
        const statsHtml = `
            <div class="col-md-4">
                <div class="card-custom h-100 flex-row align-items-center justify-content-between">
                    <div>
                        <p class="text-muted mb-1 small fw-bold text-uppercase">Total Piutang</p>
                        <h3 class="fw-bold m-0 text-dark">${stats.totalReceivable || 'Rp 0'}</h3>
                        <div class="mt-2 d-flex gap-2">
                            <span class="badge badge-soft-danger">
                                <i class="fas fa-times-circle me-1"></i>${totalBelumBayar} Belum Bayar
                            </span>
                            <span class="badge badge-soft-warning">
                                <i class="fas fa-hourglass-half me-1"></i>${stats.partialCount || 0} Belum Lunas
                            </span>
                        </div>
                    </div>
                    <div class="bg-danger-subtle p-3 rounded-circle text-danger">
                        <i class="fas fa-wallet fa-lg"></i>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card-custom h-100 flex-row align-items-center justify-content-between">
                    <div>
                        <p class="text-muted mb-1 small fw-bold text-uppercase">Perlu Verifikasi</p>
                        <h3 class="fw-bold m-0 text-dark">${stats.waitingVerification || 0}</h3>
                        <div class="mt-2">
                            <span class="badge badge-soft-primary">
                                <i class="fas fa-exclamation-circle me-1"></i>Menunggu Verifikasi
                            </span>
                        </div>
                    </div>
                    <div class="bg-primary-subtle p-3 rounded-circle text-primary">
                        <i class="fas fa-file-invoice-dollar fa-lg"></i>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card-custom h-100 flex-row align-items-center justify-content-between">
                    <div>
                        <p class="text-muted mb-1 small fw-bold text-uppercase">Pendapatan Bulan Ini</p>
                        <h3 class="fw-bold m-0 text-dark">${stats.monthlyIncome || 'Rp 0'}</h3>
                        <div class="mt-2">
                            <span class="badge badge-soft-success">
                                <i class="fas fa-check-circle me-1"></i>${stats.paidCount || 0} Transaksi Lunas
                            </span>
                        </div>
                    </div>
                    <div class="bg-success-subtle p-3 rounded-circle text-success">
                        <i class="fas fa-coins fa-lg"></i>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('statsCards').innerHTML = statsHtml;
    }

    /// ==================== UPDATE TABLE DENGAN DATA DARI DATABASE ====================
    function updateInvoicesTable(invoices) {
        const loadingRow = document.getElementById('loadingRow');
        if (loadingRow) {
            loadingRow.style.display = 'none';
        }
        
        const tbody = document.getElementById('invoicesTableBody');
        
        if (!invoices || invoices.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p class="text-muted">Tidak ada data tagihan</p>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        invoices.forEach(inv => {
            // Ambil data dari database
            const invoiceNumber = inv.invoice_number || inv.no_invoice || '-';
            const skrdNumber = inv.skrd_number || inv.no_invoice || '-';
            
            // PERBAIKI: Ambil dari berbagai kemungkinan field
            const companyName = inv.company_name || inv.nama_instansi || '-';
            const serviceDesc = inv.service_description || inv.nama_proyek || 'Pengujian';
            
            const issueDate = inv.issue_date || inv.created_at;
            const dueDate = inv.due_date || inv.created_at;
            const totalAmount = parseFloat(inv.total_amount || inv.total_tagihan || 0);
            const paidAmount = parseFloat(inv.paid_amount || inv.jumlah_dibayar || 0);
            const remainingAmount = parseFloat(inv.remaining_amount || inv.sisa_tagihan || (totalAmount - paidAmount));
            
            // Status dari database - KONSISTEN
            const statusPembayaran = inv.status_pembayaran || inv.status || '-';
            
            let statusClass = 'badge-soft-secondary';
            let statusText = statusPembayaran;
            
            // Mapping class berdasarkan status - konsisten dengan filter
            if (statusPembayaran === 'Lunas') {
                statusClass = 'badge-soft-success';
                statusText = 'Lunas';
            } else if (statusPembayaran === 'Belum Bayar') {
                statusClass = 'badge-soft-danger';
                statusText = 'Belum Bayar';
            } else if (statusPembayaran === 'Belum Lunas') {
                statusClass = 'badge-soft-warning';
                statusText = 'Belum Lunas';
            } else if (statusPembayaran === 'Menunggu SKRD Upload') {
                statusClass = 'badge-soft-primary';
                statusText = 'Menunggu Verifikasi';
            } else if (statusPembayaran === 'Dibatalkan') {
                statusClass = 'badge-soft-secondary';
                statusText = 'Dibatalkan';
            }
            
            html += `
                <tr>
                    <td class="ps-4">
                        <span class="fw-bold text-primary">#${invoiceNumber}</span>
                        <div class="small text-muted">SKRD: ${skrdNumber}</div>
                    </td>
                    <td>
                        <div class="fw-bold text-dark">${companyName}</div>
                        <small class="text-muted">${serviceDesc}</small>
                    </td>
                    <td class="text-muted small">${formatDate(issueDate)}</td>
                    <td class="text-muted small">${formatDate(dueDate)}</td>
                    <td class="fw-bold text-dark">${formatRupiah(totalAmount)}</td>
                    <td>
                        <span class="badge ${statusClass} px-3 py-2">${statusText}</span>
                    </td>
                    <td class="fw-bold ${remainingAmount > 0 ? 'text-danger' : 'text-success'}">${formatRupiah(remainingAmount)}</td>
                    <td class="text-end pe-4">
                        <a href="/admin/skrd/${inv.id}" class="btn btn-sm btn-light">Detail</a>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    // ==================== HELPER FUNCTIONS ====================
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    function formatRupiah(number) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(number || 0);
    }

    // ==================== FILTER TANGGAL ====================
    window.applyFilter = function() {
        startDate = document.getElementById('startDateFilter')?.value || '';
        endDate = document.getElementById('endDateFilter')?.value || '';
        
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            showAlert('Tanggal akhir harus setelah tanggal awal', 'warning');
            return;
        }
        
        currentPage = 1;
        loadInvoices(true);
    };

    window.resetDateFilter = function() {
        document.getElementById('startDateFilter').value = '';
        document.getElementById('endDateFilter').value = '';
        startDate = '';
        endDate = '';
        currentPage = 1;
        loadInvoices(true);
    };

    // ==================== FILTER HANDLERS ====================
    function setupFilters() {
        // SEARCH - PERBAIKI DEBOUNCE
        let searchTimeout;
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    searchTerm = e.target.value;
                    currentPage = 1;
                    loadInvoices(true);
                    console.log('🔍 Searching for:', searchTerm);
                }, 500);
            });
        }

        // STATUS FILTER
        document.querySelectorAll('#statusFilter .dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const status = e.target.dataset.status;
                currentStatus = status;
                document.getElementById('selectedFilter').textContent = e.target.textContent;
                currentPage = 1;
                loadInvoices(true);
                console.log('📊 Filter status:', status);
            });
        });

        // TANGGAL FILTER
        const startDateFilter = document.getElementById('startDateFilter');
        const endDateFilter = document.getElementById('endDateFilter');
        
        if (startDateFilter && endDateFilter) {
            startDateFilter.addEventListener('change', window.applyFilter);
            endDateFilter.addEventListener('change', window.applyFilter);
        }
    }

    // ==================== PAGINATION ====================
    function updatePagination() {
        const totalPages = Math.ceil(totalData / ITEMS_PER_PAGE);
        const pagination = document.getElementById('pagination');
        
        if (!pagination) return;
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            document.getElementById('paginationInfo').innerHTML = 
                `Menampilkan ${totalData} data`;
            return;
        }

        let paginationHtml = '';
        
        paginationHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link rounded-2 me-1" href="#" onclick="changePage(${currentPage - 1})">
                    Prev
                </a>
            </li>
        `;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                paginationHtml += `
                    <li class="page-item ${currentPage === i ? 'active' : ''}">
                        <a class="page-link rounded-2 me-1" href="#" onclick="changePage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        paginationHtml += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link rounded-2" href="#" onclick="changePage(${currentPage + 1})">
                    Next
                </a>
            </li>
        `;

        pagination.innerHTML = paginationHtml;
        
        const start = ((currentPage - 1) * ITEMS_PER_PAGE) + 1;
        const end = Math.min(currentPage * ITEMS_PER_PAGE, totalData);
        document.getElementById('paginationInfo').innerHTML = 
            `Menampilkan ${start}-${end} dari ${totalData} data`;
    }

    window.changePage = function(page) {
        currentPage = page;
        loadInvoices(true);
    };

    // ==================== EXPORT EXCEL ====================
    window.exportToExcel = async function() {
        if (!allInvoices || allInvoices.length === 0) {
            showAlert('Tidak ada data untuk diexport', 'warning');
            return;
        }

        try {
            showToast('Menyiapkan file Excel...', 'info');
            
            // Ambil semua data dengan filter yang sama
            const params = new URLSearchParams({
                limit: 1000
            });
            
            if (currentStatus) params.append('status', currentStatus);
            if (searchTerm) params.append('search', searchTerm);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const response = await fetchWithTimeout(
                `${API_BASE_URL}/skrd?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                    }
                },
                10000
            );

            if (!response.ok) {
                throw new Error('Gagal mengambil data');
            }

            const result = await response.json();
            
            if (!result.success || !result.data.invoices) {
                throw new Error('Data tidak ditemukan');
            }

            const allData = result.data.invoices;

            const headers = [
                'No. Invoice', 'SKRD', 'Perusahaan', 'Layanan', 'Tanggal Terbit',
                'Total Tagihan', 'Status', 'Sisa'
            ];
            
            const rows = allData.map(inv => {
                const totalAmount = parseFloat(inv.total_amount || inv.total_tagihan || 0);
                const paidAmount = parseFloat(inv.paid_amount || inv.jumlah_dibayar || 0);
                const remainingAmount = parseFloat(inv.remaining_amount || inv.sisa_tagihan || (totalAmount - paidAmount));
                const status = inv.status_pembayaran || inv.status || '-';
                
                // Konsisten dengan tampilan
                let displayStatus = status;
                if (status === 'Menunggu SKRD Upload') displayStatus = 'Menunggu Verifikasi';
                
                return [
                    inv.invoice_number || inv.no_invoice || '-',
                    inv.skrd_number || inv.no_invoice || '-',
                    inv.company_name || inv.nama_instansi || '-',
                    inv.service_description || inv.nama_proyek || 'Pengujian',
                    formatDate(inv.issue_date || inv.created_at),
                    totalAmount,
                    displayStatus,
                    remainingAmount
                ];
            });

            // Buat CSV
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Download file
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            let filename = `skrd_${new Date().toISOString().split('T')[0]}`;
            if (startDate && endDate) {
                filename += `_${startDate}_${endDate}`;
            }
            filename += '.csv';
            
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
            
            showToast(`Export berhasil: ${rows.length} data`, 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            showAlert('Gagal export data: ' + error.message, 'danger');
        }
    };

    // ==================== UI CONTROLS ====================
    function showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    function showAlert(message, type) {
        const alertDiv = document.getElementById('alertMessage');
        if (!alertDiv) return;
        
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

    // ==================== INITIALIZE ====================
    document.addEventListener('DOMContentLoaded', () => {
        setupFilters();
        loadInvoices(true);
        
        refreshInterval = setInterval(() => loadInvoices(false), 60000);
        
        window.addEventListener('beforeunload', () => {
            if (refreshInterval) clearInterval(refreshInterval);
            if (loadingTimeout) clearTimeout(loadingTimeout);
        });
    });
})();