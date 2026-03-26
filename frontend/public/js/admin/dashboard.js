// frontend/public/js/admin/dashboard.js

(function() {
    'use strict';

    // ==================== KONFIGURASI ====================
    const API_BASE_URL = 'http://localhost:5000/api';
    let loadingTimeout;
    let refreshInterval;
    let revenueChart = null;

    // ==================== AMBIL DATA DARI CONTAINER ====================
    const container = document.getElementById('admin-data-container');
    let user = {};
    let dashboardData = {};

    if (container) {
        try {
            if (container.dataset.user) {
                user = JSON.parse(container.dataset.user);
            }
            if (container.dataset.dashboard) {
                dashboardData = JSON.parse(container.dataset.dashboard);
            }
            console.log('✅ Data admin:', user);
            console.log('✅ Data dashboard:', dashboardData);
        } catch (e) {
            console.error('Error parsing data:', e);
        }
    }

    // ==================== FUNGSI HEADERS ====================
    function getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
        };
    }

    // ==================== FUNGSI FETCH DENGAN TIMEOUT ====================
    async function fetchWithTimeout(url, options = {}, timeout = 5000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                credentials: 'include',
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - server terlalu lama merespon');
            }
            throw error;
        }
    }

    // ==================== FUNGSI TOAST ====================
    function showToast(message, type = 'info', duration = 3000) {
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.style.position = 'fixed';
            toastContainer.style.top = '20px';
            toastContainer.style.right = '20px';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
        
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

    // ==================== LOAD DATA DASHBOARD ====================
    async function loadDashboardData() {
        showLoading(true);
        
        loadingTimeout = setTimeout(() => {
            showToast('Memuat data... mohon tunggu', 'info');
        }, 2000);
        
        try {
            const response = await fetchWithTimeout(`${API_BASE_URL}/admin/dashboard/stats`, {
                method: 'GET',
                headers: getHeaders(),
                credentials: 'include'
            }, 5000);
            
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
            
            if (result.success) {
                updateUI(result.data);
                showToast('Data berhasil dimuat', 'success');
            } else {
                throw new Error(result.message || 'Gagal memuat data');
            }
        } catch (error) {
            clearTimeout(loadingTimeout);
            console.error('Error:', error);
            
            if (dashboardData.stats) {
                updateUI(dashboardData);
                showToast('Menampilkan data tersimpan', 'info');
            } else {
                showToast('Gagal memuat data: ' + error.message, 'danger');
            }
        } finally {
            showLoading(false);
            hideChartSkeleton();
        }
    }

    // ==================== UPDATE UI ====================
    function updateUI(data) {
        if (data.stats) updateStatsCards(data.stats);
        if (data.activities) updateRecentActivities(data.activities);
        if (data.submissions) updateSubmissionsTable(data.submissions);
        if (data.chartLabels && data.chartValues) {
            updateChart(data.chartLabels, data.chartValues);
        }
    }

    // ==================== SHOW/HIDE LOADING ====================
    function showLoading(show) {
        if (!show) return;
        
        const statsCards = document.getElementById('stats-cards');
        const activities = document.getElementById('recent-activities');
        const submissions = document.getElementById('submissions-table-body');
        
        if (statsCards) {
            statsCards.innerHTML = `
                <div class="col-xxl-3 col-xl-6 col-md-6 admin-kpi-col">
                    <div class="card-custom admin-kpi-card">
                        <div class="loading-skeleton skeleton-text mb-2"></div>
                        <div class="loading-skeleton skeleton-text w-75"></div>
                    </div>
                </div>
                <div class="col-xxl-3 col-xl-6 col-md-6 admin-kpi-col">
                    <div class="card-custom admin-kpi-card">
                        <div class="loading-skeleton skeleton-text mb-2"></div>
                        <div class="loading-skeleton skeleton-text w-75"></div>
                    </div>
                </div>
                <div class="col-xxl-3 col-xl-6 col-md-6 admin-kpi-col">
                    <div class="card-custom admin-kpi-card">
                        <div class="loading-skeleton skeleton-text mb-2"></div>
                        <div class="loading-skeleton skeleton-text w-75"></div>
                    </div>
                </div>
                <div class="col-xxl-3 col-xl-6 col-md-6 admin-kpi-col">
                    <div class="card-custom admin-kpi-card">
                        <div class="loading-skeleton skeleton-text mb-2"></div>
                        <div class="loading-skeleton skeleton-text w-75"></div>
                    </div>
                </div>
            `;
        }
        
        if (activities) {
            activities.innerHTML = `
                <div class="loading-skeleton skeleton-text mb-2"></div>
                <div class="loading-skeleton skeleton-text mb-2"></div>
                <div class="loading-skeleton skeleton-text"></div>
            `;
        }
        
        if (submissions) {
            submissions.innerHTML = `
                <tr><td colspan="6"><div class="loading-skeleton skeleton-text my-2"></div></td></tr>
                <tr><td colspan="6"><div class="loading-skeleton skeleton-text my-2"></div></td></tr>
                <tr><td colspan="6"><div class="loading-skeleton skeleton-text my-2"></div></td></tr>
            `;
        }
    }

    function hideChartSkeleton() {
        const skeleton = document.getElementById('chartSkeleton');
        const chart = document.getElementById('revenueChart');
        if (skeleton) skeleton.style.display = 'none';
        if (chart) chart.style.display = 'block';
    }

    // ==================== UPDATE STATS CARDS ====================
    function updateStatsCards(stats) {
        const statsHtml = `
            <div class="col-xxl-3 col-xl-6 col-md-6 admin-kpi-col fade-in">
                <div class="card-custom admin-kpi-card d-flex flex-row justify-content-between align-items-center h-100">
                    <div>
                        <p class="admin-kpi-title text-muted mb-1 small fw-bold text-uppercase">Total Pendapatan</p>
                        <h2 class="admin-kpi-value fw-bold m-0 text-dark">${stats.income || 'Rp 0'}</h2>
                        <span class="badge badge-soft-success mt-2 admin-kpi-chip">
                            <i class="fas fa-chart-line me-1"></i>Bulan ini
                        </span>
                    </div>
                    <div class="bg-success-subtle rounded-circle text-success admin-kpi-icon-wrap">
                        <i class="fas fa-rupiah-sign fa-lg"></i>
                    </div>
                </div>
            </div>

            <div class="col-xxl-3 col-xl-6 col-md-6 admin-kpi-col fade-in">
                <div class="card-custom admin-kpi-card d-flex flex-row justify-content-between align-items-center h-100">
                    <div>
                        <p class="admin-kpi-title text-muted mb-1 small fw-bold text-uppercase">Menunggu Verifikasi</p>
                        <h2 class="admin-kpi-value fw-bold m-0 text-dark">${stats.pending || 0}</h2>
                        ${stats.pending > 0 ? 
                            '<span class="badge badge-soft-warning mt-2 admin-kpi-chip"><i class="fas fa-exclamation-circle me-1"></i>Perlu Tindakan</span>' : 
                            '<span class="badge badge-soft-success mt-2 admin-kpi-chip"><i class="fas fa-check me-1"></i>Tidak Ada</span>'
                        }
                    </div>
                    <div class="bg-warning-subtle rounded-circle text-warning admin-kpi-icon-wrap">
                        <i class="far fa-clock fa-lg"></i>
                    </div>
                </div>
            </div>

            <div class="col-xxl-3 col-xl-6 col-md-6 admin-kpi-col fade-in">
                <div class="card-custom admin-kpi-card d-flex flex-row justify-content-between align-items-center h-100">
                    <div>
                        <p class="admin-kpi-title text-muted mb-1 small fw-bold text-uppercase">Pengujian Selesai</p>
                        <h2 class="admin-kpi-value fw-bold m-0 text-dark">${stats.completed || 0}</h2>
                        <span class="badge badge-soft-primary mt-2 admin-kpi-chip">
                            <i class="fas fa-flask me-1"></i>Total
                        </span>
                    </div>
                    <div class="bg-primary-subtle rounded-circle text-primary admin-kpi-icon-wrap">
                        <i class="fas fa-check-double fa-lg"></i>
                    </div>
                </div>
            </div>

            <div class="col-xxl-3 col-xl-6 col-md-6 admin-kpi-col fade-in">
                <div class="card-custom admin-kpi-card d-flex flex-row justify-content-between align-items-center h-100">
                    <div>
                        <p class="admin-kpi-title text-muted mb-1 small fw-bold text-uppercase">Menunggu Bayar</p>
                        <h2 class="admin-kpi-value fw-bold m-0 text-dark">${stats.awaitingPayment || 0}</h2>
                        <span class="badge badge-soft-danger mt-2 admin-kpi-chip">
                            <i class="fas fa-credit-card me-1"></i>Belum Lunas
                        </span>
                    </div>
                    <div class="bg-danger-subtle rounded-circle text-danger admin-kpi-icon-wrap">
                        <i class="far fa-credit-card fa-lg"></i>
                    </div>
                </div>
            </div>
        `;
        
        const statsCards = document.getElementById('stats-cards');
        if (statsCards) statsCards.innerHTML = statsHtml;
    }

    // ==================== UPDATE AKTIVITAS ====================
    function updateRecentActivities(activities) {
        const activitiesEl = document.getElementById('recent-activities');
        if (!activitiesEl) return;
        
        if (!activities || activities.length === 0) {
            activitiesEl.innerHTML = `
                <div class="dashboard-activity-empty">
                    <i class="far fa-clock"></i>
                    <p>Tidak ada aktivitas terbaru</p>
                </div>
            `;
            return;
        }

        const activitiesHtml = activities.map(activity => `
            <article class="dashboard-activity-item fade-in">
                <div class="dashboard-activity-icon bg-${activity.color}-subtle text-${activity.color}">
                    <i class="fas fa-${activity.icon}" aria-hidden="true"></i>
                </div>
                <div class="dashboard-activity-content">
                    <div class="dashboard-activity-top">
                        <p class="dashboard-activity-company">${activity.company}</p>
                        <small class="dashboard-activity-time">${activity.time}</small>
                    </div>
                    <p class="dashboard-activity-desc">${activity.description}</p>
                    <span class="badge badge-soft-${activity.badgeColor} dashboard-activity-status">${activity.status}</span>
                </div>
            </article>
        `).join('');

        activitiesEl.innerHTML = activitiesHtml;
    }

    // ==================== UPDATE TABEL ====================
    function updateSubmissionsTable(submissions) {
        const tbody = document.getElementById('submissions-table-body');
        if (!tbody) return;
        
        if (!submissions || submissions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-muted">
                        Tidak ada data permohonan
                    </td>
                </tr>
            `;
            return;
        }

        console.log('📋 Submissions data:', submissions); // Debug

        const rowsHtml = submissions.map(sub => {
            let badgeClass = 'badge-soft-primary';
            if (sub.status && sub.status.includes('Menunggu')) badgeClass = 'badge-soft-warning';
            if (sub.status === 'Lunas') badgeClass = 'badge-soft-success';
            if (sub.status === 'Selesai') badgeClass = 'badge-soft-info';
            if (sub.status === 'Belum Lunas') badgeClass = 'badge-soft-danger';
            
            // 🔴 AMBIL ID YANG BENAR (pastikan ID adalah number, bukan string dengan prefix)
            const submissionId = sub.id;
            
            // 🔴 TAMPILKAN NAMA PERUSAHAAN DENGAN BENAR
            // Coba beberapa kemungkinan field name
            const companyName = sub.company || sub.nama_instansi || sub.perusahaan || '-';
            
            // 🔴 AMBIL JENIS UJI
            const jenisUji = sub.type || sub.jenis_uji || '-';

            return `
                <tr class="fade-in">
                    <td class="ps-4 fw-bold text-primary">${submissionId}</td>
                    <td>
                        <div class="fw-bold text-dark">${companyName}</div>
                    </td>
                    <td>${jenisUji}</td>
                    <td>${sub.date}</td>
                    <td><span class="badge ${badgeClass} px-3 py-2 rounded-pill">${sub.status || '-'}</span></td>
                    <td class="text-end pe-4">
                        <!-- 🔴 LINK YANG BENAR KE HALAMAN DETAIL SUBMISSION -->
                        <a href="/admin/submissions/${submissionId}" class="btn btn-sm btn-light text-primary fw-bold">
                            Detail <i class="fas fa-arrow-right ms-1"></i>
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rowsHtml;
    }

    // ==================== UPDATE CHART ====================
    function updateChart(labels, data) {
        const canvas = document.getElementById('revenueChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (revenueChart) {
            revenueChart.destroy();
        }

        revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pendapatan (Rp)',
                    data: data,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Rp ' + context.raw.toLocaleString('id-ID');
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 8,
                            maxRotation: 0,
                            minRotation: 0
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + value.toLocaleString('id-ID');
                            }
                        }
                    }
                }
            }
        });
    }

    // ==================== INITIALIZATION ====================
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ Admin dashboard JS loaded');
        
        // Tampilkan nama admin
        const adminName = document.getElementById('adminName');
        if (adminName && user.full_name) {
            adminName.textContent = user.full_name;
        }
        
        // Tampilkan data awal dari controller
        if (dashboardData && dashboardData.stats) {
            updateUI(dashboardData);
        }
        
        // Load data dari API
        loadDashboardData();
        
        // Refresh setiap 30 detik
        refreshInterval = setInterval(loadDashboardData, 30000);
        
        // Bersihkan interval saat page unload
        window.addEventListener('beforeunload', () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        });
    });

    // Event listener untuk perubahan tahun chart
    document.getElementById('chart-year')?.addEventListener('change', (e) => {
        loadDashboardData();
    });

})();