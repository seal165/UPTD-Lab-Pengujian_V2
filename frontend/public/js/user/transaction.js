// public/js/user/transaction.js

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ Transaction.js initialized');
        
        const dataElement = document.getElementById('transaction-data');
        if (!dataElement) {
            console.error('❌ Element transaction-data tidak ditemukan');
            return;
        }
        
        try {
            const rawData = dataElement.dataset.transactions;
            const transactions = rawData ? JSON.parse(rawData) : [];
            
            console.log('📦 Jumlah transaksi:', transactions.length);
            if (transactions.length > 0) {
                console.log('Contoh data transaksi:', transactions[0]);
            }
            
            calculateStats(transactions);
            renderTable(transactions);
            setupFilters(transactions);
            
        } catch (error) {
            console.error('❌ Error parsing data:', error);
        }
    });

    // ========== STATUS CONFIG (9 STATUS) ==========
    const STATUS_CONFIG = {
        'Menunggu Verifikasi': { class: 'status-menunggu-verifikasi', label: 'Menunggu Verifikasi' },
        'Pengecekan Sampel': { class: 'status-pengecekan-sampel', label: 'Pengecekan Sampel' },
        'Belum Bayar': { class: 'status-belum-bayar', label: 'Belum Bayar' },
        'Menunggu SKRD Upload': { class: 'status-menunggu-skrd', label: 'Menunggu SKRD Upload' },
        'Belum Lunas': { class: 'status-belum-lunas', label: 'Belum Lunas' },
        'Lunas': { class: 'status-lunas', label: 'Lunas' },
        'Sedang Diuji': { class: 'status-sedang-diuji', label: 'Sedang Diuji' },
        'Selesai': { class: 'status-selesai', label: 'Selesai' },
        'Dibatalkan': { class: 'status-dibatalkan', label: 'Dibatalkan' }
    };

    function getStatusBadge(status) {
        const config = STATUS_CONFIG[status] || { class: 'status-default', label: status };
        return `<span class="status-badge ${config.class}">${config.label}</span>`;
    }

    function calculateStats(transactions) {
        let totalTagihan = 0;
        let totalDibayar = 0;
        let totalLunas = 0;
        let totalBelumLunas = 0;
        let totalBelumBayar = 0;
        let totalMenungguSKRD = 0;
        let totalSelesai = 0;
        let totalDibatalkan = 0;
        
        transactions.forEach(t => {
            const tagihan = parseFloat(t.total_tagihan) || 0;
            totalTagihan += tagihan;
            const dibayar = parseFloat(t.jumlah_dibayar) || 0;
            totalDibayar += dibayar;
            
            const status = t.status_pembayaran || 'Belum Bayar';
            switch(status) {
                case 'Lunas': totalLunas++; break;
                case 'Belum Lunas': totalBelumLunas++; break;
                case 'Belum Bayar': totalBelumBayar++; break;
                case 'Menunggu SKRD Upload': totalMenungguSKRD++; break;
                case 'Selesai': totalSelesai++; break;
                case 'Dibatalkan': totalDibatalkan++; break;
                default: break;
            }
        });
        
        const totalPending = totalBelumLunas + totalBelumBayar + totalMenungguSKRD;
        
        const statsHtml = `
            <div class="stat-card">
                <div class="stat-icon bg-primary"><i class="fas fa-file-invoice"></i></div>
                <div class="stat-info">
                    <span class="stat-label">Total Transaksi</span>
                    <span class="stat-value">${transactions.length}</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon bg-success"><i class="fas fa-check-circle"></i></div>
                <div class="stat-info">
                    <span class="stat-label">Lunas</span>
                    <span class="stat-value">${totalLunas}</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon bg-warning"><i class="fas fa-hourglass-half"></i></div>
                <div class="stat-info">
                    <span class="stat-label">Pending</span>
                    <span class="stat-value">${totalPending}</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon bg-info"><i class="fas fa-money-bill-wave"></i></div>
                <div class="stat-info">
                    <span class="stat-label">Total Tagihan</span>
                    <span class="stat-value">${formatRupiah(totalTagihan)}</span>
                </div>
            </div>
        `;
        
        const statsEl = document.getElementById('transactionStats');
        if (statsEl) statsEl.innerHTML = statsHtml;
    }

    function renderTable(transactions) {
        const tbody = document.getElementById('transactionTableBody');
        if (!tbody) return;
        
        if (transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <i class="fas fa-inbox fa-3x mb-3 text-muted"></i>
                        <p class="text-muted">Belum ada data transaksi</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        transactions.forEach(item => {
            const total = parseFloat(item.total_tagihan) || 0;
            const dibayar = parseFloat(item.jumlah_dibayar) || 0;
            const sisa = total - dibayar;
            const status = item.status_pembayaran || 'Belum Bayar';
            
            const date = item.created_at;
            const formattedDate = date ? new Date(date).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'long', year: 'numeric'
            }) : '-';
            
            const noInvoice = item.no_invoice || `INV-${String(item.submission_id || item.id).padStart(5, '0')}`;
            const namaProyek = item.nama_proyek || 'Pengujian';
            
            html += `
                <tr>
                    <td><strong>${noInvoice}</strong></td>
                    <td>
                        <div class="layanan-info">
                            <span class="layanan-nama">${namaProyek}</span>
                            ${item.total_samples ? `<small class="layanan-sampel">${item.total_samples} sampel</small>` : ''}
                        </div>
                    </td>
                    <td>${formatRupiah(total)}</td>
                    <td>${formatRupiah(dibayar)}</td>
                    <td class="${sisa > 0 ? 'text-danger' : 'text-success'}">${formatRupiah(sisa)}</td>
                    <td>${getStatusBadge(status)}</td>
                    <td>${formattedDate}</td>
                    <td class="text-center">
                        <a href="/user/transaction/${item.id}" class="action-icon text-secondary" title="Detail">
                            <i class="fas fa-external-link-alt"></i>
                        </a>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    function setupFilters(transactions) {
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        if (!searchInput || !statusFilter) return;
        
        function filterData() {
            const search = searchInput.value.toLowerCase();
            const status = statusFilter.value;
            
            const filtered = transactions.filter(item => {
                const noInvoice = (item.no_invoice || '').toLowerCase();
                const namaProyek = (item.nama_proyek || '').toLowerCase();
                const matchSearch = noInvoice.includes(search) || namaProyek.includes(search);
                const itemStatus = item.status_pembayaran || 'Belum Bayar';
                const matchStatus = status === 'all' || itemStatus === status;
                return matchSearch && matchStatus;
            });
            
            renderTable(filtered);
            calculateStats(filtered);
        }
        
        searchInput.addEventListener('input', filterData);
        statusFilter.addEventListener('change', filterData);
    }

    function formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0
        }).format(amount);
    }

    // Export CSV
    document.getElementById('exportBtn')?.addEventListener('click', function() {
        const dataElement = document.getElementById('transaction-data');
        if (!dataElement) return;
        try {
            const transactions = JSON.parse(dataElement.dataset.transactions);
            const headers = ['No. Invoice', 'Layanan', 'Total', 'Dibayar', 'Sisa', 'Status', 'Tanggal'];
            const rows = transactions.map(item => {
                const total = parseFloat(item.total_tagihan) || 0;
                const dibayar = parseFloat(item.jumlah_dibayar) || 0;
                const sisa = total - dibayar;
                return [
                    item.no_invoice || `INV-${item.id}`,
                    item.nama_proyek || 'Pengujian',
                    total, dibayar, sisa,
                    item.status_pembayaran || 'Belum Bayar',
                    item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'
                ];
            });
            let csv = headers.join(',') + '\n';
            rows.forEach(row => { csv += row.map(cell => `"${cell}"`).join(',') + '\n'; });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transaksi_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
        } catch (error) {
            console.error('Export error:', error);
            alert('Gagal export data');
        }
    });
})();