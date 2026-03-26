// frontend/public/js/admin/detail-submission.js

(function() {
    'use strict';

    // ==================== KONFIGURASI ====================
    const API_BASE_URL = 'http://localhost:5000/api';
    const BACKEND_BASE_URL = 'http://localhost:5000';
    const LOAD_TIMEOUT = 5000;
    
    // Ambil ID dari data attribute
    const dataContainer = document.getElementById('submission-data');
    const submissionId = dataContainer?.dataset.id;
    
    console.log('🔍 Submission ID:', submissionId);

    if (!submissionId) {
        showError('ID pengajuan tidak ditemukan');
    }

    // State untuk loading dan cache
    let loadingTimeout;
    let isDataLoaded = false;

    // Cache sederhana
    const detailCache = {
        data: null,
        timestamp: null,
        id: null
    };
    const CACHE_DURATION = 30000; // 30 detik

    // Template formulir pengajuan
    const formTemplate = `UPTD-PBKBIK-F.01-PO.07.docx

Hari / Tanggal : {tanggal}

Nama Petugas Pendaftaran : {petugas}

I.  **PERMINTAAN PENGUJIAN**

+-----------------------------------+-----------------------------------+
| Nomor Urut : {nomor_urut}        | Kode Pengujian : {kode_uji}      |
+===================================+===================================+
| Tanggal Permohonan : {tgl_mohon}  | Nomor Permohonan : {nomor_permohonan} |
+-----------------------------------+-----------------------------------+
| Nama Pemohon : {nama_pemohon}     | Nama Instansi : {instansi}        |
+-----------------------------------+-----------------------------------+
| Alamat : {alamat}                 | Nomor telepon : {telepon}         |
+-----------------------------------+-----------------------------------+
| Email : {email}                   | Nama Proyek : {proyek}            |
+-----------------------------------+-----------------------------------+
| Lokasi Proyek : {lokasi_proyek}   | Catatan Lainnya : {catatan}       |
+-----------------------------------+-----------------------------------+

II. **KECUKUPAN SAMPLE UJI**

+----------------------------------+-----------------------------------+
| Jenis Sample Uji : {jenis_sample} | Nama Sample Uji : {nama_sample}   |
+==================================+===================================+
| Jumlah Sample Uji : {jumlah_sample} | Sample Uji dibuat/diambil pada    |
|                                  | tanggal : {tgl_sample}            |
+----------------------------------+-----------------------------------+
| Kemasan Sample Uji : {kemasan}    | Asal Sample Uji : {asal_sample}   |
+----------------------------------+-----------------------------------+
| Parameter Pengujian : {parameter} | Metode Pengujian : {metode}       |
+----------------------------------+-----------------------------------+
| Sample diambil Oleh : {pengambil} | Catatan Lainnya : {catatan_sample}|
+----------------------------------+-----------------------------------+

III. **KAJI ULANG PERMINTAAN**

+----------------------------------+-----------------------------------+
| Metode Uji : {metode_uji}         | Sumber Daya Manusia : {sdm}       |
+==================================+===================================+
| Peralatan : {peralatan}           | Bukti Setor : {bukti_setor}       |
+----------------------------------+-----------------------------------+
| Catatan Lainnya : {catatan_kaji}  | Kontrak Pengujian : {kontrak}     |
|                                  +-----------------------------------+
|                                  | Keputusan : {keputusan}           |
+----------------------------------+-----------------------------------+
| Tanggal pelaksanaan : {tgl_laksana} | Estimasi selesai : {tgl_selesai} |
+----------------------------------+-----------------------------------+

+-------------------------------------+-------------------------------------+
| Petugas pendaftaran,                | Pelanggan / Pemohon,                |
+:===================================:+:===================================:+
| ({petugas_ttd})                     | ({pemohon_ttd})                     |
+-------------------------------------+-------------------------------------+
| Mengetahui,                                                               |
| Kepala Seksi Pengujian,                                                   |
| ({kepala_ttd})                                                           |
+---------------------------------------------------------------------------+`;

    // ==================== CEK TOKEN ====================
    function getToken() {
        return localStorage.getItem('token');
    }

    function normalizeFilename(filename) {
        if (!filename || typeof filename !== 'string') return '';
        return filename.split('/').pop().split('\\').pop().trim();
    }

    function buildProtectedFileUrl(fileType, filename) {
        const safeFilename = normalizeFilename(filename);
        const token = getToken();

        if (!safeFilename || !token) return '#';

        return `${BACKEND_BASE_URL}/api/file/${fileType}/${encodeURIComponent(safeFilename)}?token=${encodeURIComponent(token)}`;
    }

    if (!getToken()) {
        window.location.href = '/admin/login';
        return;
    }

    // ==================== FUNGSI FETCH DENGAN TIMEOUT ====================
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
                throw new Error('Request timeout - server terlalu lama merespon');
            }
            throw error;
        }
    }

    // ==================== FUNGSI CACHE ====================
    function getCachedDetail() {
        if (detailCache.id === submissionId && 
            detailCache.data && 
            (Date.now() - detailCache.timestamp < CACHE_DURATION)) {
            console.log('📦 Using cached detail data');
            return detailCache.data;
        }
        return null;
    }

    function setCachedDetail(data) {
        detailCache.id = submissionId;
        detailCache.data = data;
        detailCache.timestamp = Date.now();
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

    // ==================== LOAD DATA ====================
    async function loadSubmissionDetail() {
        // Cek cache dulu
        const cachedData = getCachedDetail();
        if (cachedData) {
            updatePage(cachedData);
            return;
        }
        
        showLoading(true);
        
        // Set timeout warning
        loadingTimeout = setTimeout(() => {
            if (!isDataLoaded) {
                showToast('Koneksi lambat, mohon tunggu...', 'warning', 0);
            }
        }, 3000);
        
        try {
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/submissions/${submissionId}`,
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

            if (result.success) {
                isDataLoaded = true;
                setCachedDetail(result.data);
                updatePage(result.data);
                
                // 🔥 Load dokumen pendukung
                loadDocuments();
                
            } else {
                showAlert(result.message || 'Gagal memuat data', 'danger');
            }
        } catch (error) {
            clearTimeout(loadingTimeout);
            console.error('Error:', error);
            
            if (error.message.includes('timeout')) {
                showToast('Koneksi lambat, silakan refresh halaman', 'warning');
                showAlert('Koneksi lambat, silakan refresh', 'warning');
            } else {
                showAlert('Gagal terhubung ke server', 'danger');
            }
        } finally {
            showLoading(false);
        }
    }

    // 🔥 FUNGSI LOAD DOKUMEN PENDUKUNG (PERBAIKAN)
    async function loadDocuments() {
        try {
            const data = detailCache.data;
            if (!data) return;
            
            // Surat Permohonan
            if (data.file_surat_permohonan) {
                const fileName = normalizeFilename(data.file_surat_permohonan);
                const fileUrl = buildProtectedFileUrl('surat', data.file_surat_permohonan);
                document.getElementById('suratPermohonanInfo').innerHTML = `
                    <i class="fas fa-check-circle text-success me-1"></i> Terupload: ${fileName}
                `;
                document.getElementById('suratPermohonanActions').innerHTML = `
                    <a href="${fileUrl}" download class="btn btn-sm btn-outline-primary me-1">
                        <i class="fas fa-download"></i>
                    </a>
                    <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-secondary">
                        <i class="fas fa-eye"></i>
                    </a>
                `;
            } else {
                document.getElementById('suratPermohonanInfo').innerHTML = `
                    <i class="fas fa-exclamation-circle text-warning me-1"></i> Belum diupload
                `;
                document.getElementById('suratPermohonanActions').innerHTML = '';
            }
            
            // Scan KTP
            if (data.file_ktp) {
                const fileName = normalizeFilename(data.file_ktp);
                const fileUrl = buildProtectedFileUrl('ktp', data.file_ktp);
                document.getElementById('scanKTPInfo').innerHTML = `
                    <i class="fas fa-check-circle text-success me-1"></i> Terupload: ${fileName}
                `;
                document.getElementById('scanKTPActions').innerHTML = `
                    <a href="${fileUrl}" download class="btn btn-sm btn-outline-primary me-1">
                        <i class="fas fa-download"></i>
                    </a>
                    <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-secondary">
                        <i class="fas fa-eye"></i>
                    </a>
                `;
            } else {
                document.getElementById('scanKTPInfo').innerHTML = `
                    <i class="fas fa-exclamation-circle text-warning me-1"></i> Belum diupload
                `;
                document.getElementById('scanKTPActions').innerHTML = '';
            }
            
            // Dokumen Tambahan (placeholder)
            document.getElementById('additionalDocCount').textContent = '0 dokumen';
            document.getElementById('additionalDocumentsList').innerHTML = `
                <div class="text-center py-3 text-muted">
                    <i class="far fa-folder-open fa-2x mb-2"></i>
                    <p class="small mb-0">Tidak ada dokumen tambahan</p>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading documents:', error);
        }
    }

    // ==================== UPDATE UI ====================
    function updatePage(data) {
        // Tambahkan class fade-in untuk animasi
        document.querySelectorAll('.card-custom').forEach(el => {
            el.classList.add('fade-in');
        });
        
        // Update ID
        document.getElementById('idValue').textContent = data.id;
        document.getElementById('submissionId').value = data.id;
        
        // Update Status Badge
        updateStatusBadge(data.status);
        
        // Update Date Badge
        document.getElementById('dateBadge').innerHTML = `<i class="far fa-calendar me-1"></i>${formatDate(data.created_at)}`;
        
        // Update Company Info
        document.getElementById('companyName').textContent = data.nama_instansi || data.company_name || '-';
        document.getElementById('picName').textContent = data.nama_pemohon || data.pic_name || '-';
        document.getElementById('companyAddress').textContent = data.alamat_pemohon || data.address || '-';
        document.getElementById('picEmail').textContent = data.email_pemohon || data.pic_email || '-';
        document.getElementById('picPhone').textContent = data.nomor_telepon || data.pic_phone || '-';
        
        // Update Service Details
        document.getElementById('category').innerHTML = `<i class="fas fa-flask me-2"></i>${data.category || '-'}`;
        document.getElementById('testType').textContent = data.test_type || '-';
        
        // Update Items Table
        updateItemsTable(data.samples || data.items || []);
        
        // Update Status Timeline
        updateStatusTimeline(data.status);
        
        // Set form values untuk admin
        const statusSelect = document.getElementById('statusSelect');
        if (statusSelect) {
            // Map dari nilai database ke value select
            const statusMap = {
                'Menunggu Verifikasi': 'pending_verification',
                'Pengecekan Sampel': 'sample_checking',
                'Belum Bayar': 'unpaid',
                'Belum Lunas': 'partially_paid',
                'Menunggu SKRD Upload': 'awaiting_skrd',
                'Lunas': 'paid',
                'Sedang Diuji': 'testing',
                'Selesai': 'completed',
                'Dibatalkan': 'cancelled'
            };
            
            const selectValue = statusMap[data.status] || 'pending_verification';
            statusSelect.value = selectValue;
        }
        
        // CATATAN DARI USER (dari database catatan_tambahan)
        const userNotes = document.getElementById('userNotes');
        if (userNotes) {
            userNotes.textContent = data.catatan_tambahan || data.notes || '-';
            console.log('📝 Catatan dari user:', data.catatan_tambahan);
        }
        
        // CATATAN DARI ADMIN (untuk diisi)
        const internalNotes = document.getElementById('internalNotes');
        if (internalNotes) {
            internalNotes.value = data.catatan_admin || ''; // Jika sudah ada kolom catatan_admin
        }
        
        // Hitung total items
        document.getElementById('totalItems').textContent = (data.samples || data.items || []).length + ' item';
        
        // 🔥 Tampilkan file laporan jika sudah ada
        if (data.report && data.report.file_laporan) {
            const reportName = normalizeFilename(data.report.file_laporan);
            const reportUrl = buildProtectedFileUrl('laporan', data.report.file_laporan);
            const reportInfo = `
                <div class="alert alert-success mt-2">
                    <i class="fas fa-check-circle me-2"></i>
                    Laporan sudah diupload: ${reportName}
                    <div class="mt-2">
                        <a href="${reportUrl}" download class="btn btn-sm btn-primary me-1">
                            <i class="fas fa-download"></i> Download
                        </a>
                        <a href="${reportUrl}" target="_blank" class="btn btn-sm btn-outline-secondary">
                            <i class="fas fa-eye"></i> Lihat
                        </a>
                    </div>
                </div>
            `;
            
            // Tampilkan info di bawah upload area
            const uploadArea = document.getElementById('uploadArea');
            const existingInfo = document.querySelector('.alert-success.mt-2');
            if (existingInfo) existingInfo.remove();
            uploadArea.insertAdjacentHTML('afterend', reportInfo);
        }
    }

    function updateStatusBadge(status) {
        const badge = document.getElementById('statusBadge');
        const statusConfig = {
            'pending_verification': { class: 'badge-soft-warning', text: 'Menunggu Verifikasi' },
            'payment_pending': { class: 'badge-soft-danger', text: 'Menunggu Pembayaran' },
            'paid': { class: 'badge-soft-success', text: 'Lunas' },
            'testing': { class: 'badge-soft-primary', text: 'Sedang Diuji' },
            'completed': { class: 'badge-soft-info', text: 'Selesai' },
            'cancelled': { class: 'badge-soft-secondary', text: 'Dibatalkan' }
        };
        
        const config = statusConfig[status] || { class: 'badge-soft-secondary', text: status };
        badge.className = `badge ${config.class} px-3 py-2 rounded-pill`;
        badge.textContent = config.text;
    }

    function updateItemsTable(items) {
        const tbody = document.getElementById('itemsTableBody');
        
        if (!items || items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted">
                        Tidak ada item pengujian
                    </td>
                </tr>
            `;
            return;
        }

        let total = 0;
        const rowsHtml = items.map(item => {
            const subtotal = (item.jumlah_sample_angka || item.quantity || 0) * (item.price_at_time || item.unit_price || 0);
            total += subtotal;
            
            return `
                <tr>
                    <td>${item.nama_identitas_sample || item.service_name || item.name || '-'}</td>
                    <td class="text-center fw-bold">${item.jumlah_sample_angka || item.quantity || 0}</td>
                    <td class="text-muted">${item.jumlah_sample_satuan || item.unit || 'Sampel'}</td>
                    <td>${formatRupiah(item.price_at_time || item.unit_price || 0)}</td>
                    <td>${formatRupiah(subtotal)}</td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rowsHtml;
    }

    function updateStatusTimeline(currentStatus) {
        const timeline = document.getElementById('statusTimeline');
        if (!timeline) return;
        
        // Urutan status berdasarkan alur yang benar
        const statuses = [
            { key: 'Menunggu Verifikasi', label: 'Pengajuan Diterima', icon: 'fa-file' },
            { key: 'Pengecekan Sampel', label: 'Pengecekan Sampel', icon: 'fa-search' },
            { key: 'Belum Bayar', label: 'Menunggu Pembayaran', icon: 'fa-credit-card' },
            { key: 'Belum Lunas', label: 'Pembayaran Sebagian', icon: 'fa-hourglass-half' },
            { key: 'Menunggu SKRD Upload', label: 'Menunggu SKRD', icon: 'fa-file-invoice' },
            { key: 'Lunas', label: 'Pembayaran Lunas', icon: 'fa-check-circle' },
            { key: 'Sedang Diuji', label: 'Proses Pengujian', icon: 'fa-flask' },
            { key: 'Selesai', label: 'Selesai', icon: 'fa-certificate' }
        ];

        // Cari index status saat ini
        let currentIndex = statuses.findIndex(s => s.key === currentStatus);
        
        // Jika status tidak ditemukan, coba cari berdasarkan kemiripan
        if (currentIndex === -1) {
            // Mapping untuk status yang mungkin tidak tepat
            const statusMap = {
                'pending_verification': 'Menunggu Verifikasi',
                'payment_pending': 'Belum Bayar',
                'paid': 'Lunas',
                'testing': 'Sedang Diuji',
                'completed': 'Selesai',
                'cancelled': 'Dibatalkan',
                'sample_checking': 'Pengecekan Sampel',
                'unpaid': 'Belum Bayar',
                'partially_paid': 'Belum Lunas',
                'awaiting_skrd': 'Menunggu SKRD Upload'
            };
            
            const mappedStatus = statusMap[currentStatus] || currentStatus;
            currentIndex = statuses.findIndex(s => s.key === mappedStatus);
        }

        const timelineHtml = statuses.map((status, index) => {
            let statusClass = 'pending';
            let statusIcon = 'far fa-circle';
            
            if (index < currentIndex) {
                statusClass = 'completed';
                statusIcon = 'fas fa-check-circle';
            } else if (index === currentIndex) {
                statusClass = 'current';
                statusIcon = 'fas fa-spinner fa-pulse';
            }
            
            return `
                <div class="timeline-item ${statusClass} mb-4 ps-3">
                    <div class="d-flex align-items-center">
                        <i class="fas ${status.icon} me-2 ${statusClass === 'current' ? 'text-primary' : statusClass === 'completed' ? 'text-success' : 'text-muted'}"></i>
                        <span class="fw-bold ${statusClass === 'current' ? 'text-primary' : ''}">${status.label}</span>
                    </div>
                    ${index === currentIndex ? '<small class="text-primary d-block mt-1">Sedang dalam proses</small>' : ''}
                    ${index < currentIndex ? '<small class="text-success d-block mt-1">Selesai</small>' : ''}
                </div>
            `;
        }).join('');

        timeline.innerHTML = timelineHtml;
    }

    // ==================== HELPER FUNCTIONS ====================
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    function formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    function formatRupiah(number) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(number);
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ==================== UI CONTROLS ====================
    function showLoading(show) {
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
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

    function showError(message) {
        document.getElementById('loadingOverlay').style.display = 'none';
        showAlert(message, 'danger');
    }

    // ==================== FILE UPLOAD HANDLER ====================
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');

    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                previewFile(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                previewFile(e.target.files[0]);
            }
        });
    }

    // 🔥 FUNGSI PREVIEW FILE DENGAN TOMBOL UPLOAD
    function previewFile(file) {
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        filePreview.style.display = 'block';
        filePreview.innerHTML = `
            <div class="d-flex align-items-center gap-2 p-2 bg-light rounded">
                <i class="fas fa-file-pdf text-danger"></i>
                <div class="flex-grow-1">
                    <small class="fw-bold d-block">${file.name}</small>
                    <small class="text-muted">${fileSize} MB</small>
                </div>
                <button type="button" class="btn btn-sm btn-primary me-1" onclick="uploadSelectedFile()">
                    <i class="fas fa-upload"></i> Upload
                </button>
                <button type="button" class="btn btn-sm btn-light" onclick="removeFile()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    // 🔥 FUNGSI UPLOAD FILE YANG DIPILIH
    window.uploadSelectedFile = function() {
        const file = fileInput.files[0];
        if (file) {
            uploadReportFile(file);
        }
    };

    // 🔥 FUNGSI UPLOAD FILE LAPORAN
    async function uploadReportFile(file) {
        if (!file) return;
        
        const formData = new FormData();
        formData.append('laporan', file);
        
        // Tampilkan loading di tombol
        const uploadArea = document.getElementById('uploadArea');
        const originalHTML = uploadArea.innerHTML;
        uploadArea.innerHTML = `
            <div class="text-center py-2">
                <div class="spinner-border spinner-border-sm text-primary mb-2"></div>
                <small>Mengupload...</small>
            </div>
        `;
        
        try {
            const response = await fetch(`${API_BASE_URL}/submissions/${submissionId}/report`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showToast('Laporan berhasil diupload!', 'success');
                
                // Tampilkan file yang sudah diupload
                filePreview.innerHTML = `
                    <div class="d-flex align-items-center gap-2 p-2 bg-success-subtle rounded">
                        <i class="fas fa-check-circle text-success"></i>
                        <div class="flex-grow-1">
                            <small class="fw-bold d-block">${file.name}</small>
                            <small class="text-success">Terupload</small>
                        </div>
                        <a href="${result.data.url}" target="_blank" class="btn btn-sm btn-light">
                            <i class="fas fa-eye"></i> Lihat
                        </a>
                    </div>
                `;
                
                // Kembalikan tampilan upload area
                uploadArea.innerHTML = originalHTML;
                
                // Refresh data untuk update status
                setTimeout(() => loadSubmissionDetail(), 1000);
            } else {
                showToast(result.message || 'Gagal upload', 'danger');
                // Kembalikan tampilan awal
                uploadArea.innerHTML = originalHTML;
            }
        } catch (error) {
            console.error('Error uploading:', error);
            showToast('Gagal upload file: ' + error.message, 'danger');
            uploadArea.innerHTML = originalHTML;
        }
    }

    window.removeFile = function() {
        fileInput.value = '';
        filePreview.style.display = 'none';
        filePreview.innerHTML = '';
    };

    // ==================== FORM HANDLERS ====================
    async function handleUpdate(event) {
        event.preventDefault();
        
        const statusSelect = document.getElementById('statusSelect');
        const adminNotes = document.getElementById('internalNotes').value; // Catatan dari admin

        const selectedStatus = statusSelect.value;
        
        console.log('========== HANDLE UPDATE ==========');
        console.log('📝 Selected status value:', selectedStatus);
        console.log('📝 Admin notes:', adminNotes);
        
        // Validasi sederhana
        if (!selectedStatus) {
            showAlert('Status harus dipilih', 'warning');
            return;
        }

        // Mapping status dari frontend ke database
        const statusMap = {
            'pending_verification': 'Menunggu Verifikasi',
            'payment_pending': 'Menunggu Pembayaran',
            'paid': 'Lunas',
            'testing': 'Sedang Diuji',
            'completed': 'Selesai',
            'cancelled': 'Dibatalkan',
            'sample_checking': 'Pengecekan Sampel',
            'unpaid': 'Belum Bayar',
            'partially_paid': 'Belum Lunas',
            'awaiting_skrd': 'Menunggu SKRD Upload'
        };

        const dbStatus = statusMap[selectedStatus] || selectedStatus;

        // Tampilkan loading
        document.getElementById('updateBtn').disabled = true;
        document.getElementById('updateBtnText').style.display = 'none';
        document.getElementById('updateBtnSpinner').style.display = 'inline-block';

        try {
            const response = await fetch(`${API_BASE_URL}/submissions/${submissionId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: dbStatus,
                    catatan: adminNotes || null // Kirim sebagai catatan
                })
            });

            const result = await response.json();
            console.log('📦 Response dari server:', result);

            if (result.success) {
                showAlert('Perubahan berhasil disimpan!', 'success');
                
                // Refresh data
                setTimeout(() => loadSubmissionDetail(), 1000);
            } else {
                showAlert(result.message || 'Gagal menyimpan perubahan', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal terhubung ke server: ' + error.message, 'danger');
        } finally {
            document.getElementById('updateBtn').disabled = false;
            document.getElementById('updateBtnText').style.display = 'inline';
            document.getElementById('updateBtnSpinner').style.display = 'none';
        }
    }

    window.cancelSubmission = async function() {
        if (!confirm('Apakah Anda yakin ingin membatalkan pengajuan ini?')) {
            return;
        }

        // Tampilkan loading
        document.getElementById('updateBtn').disabled = true;
        document.getElementById('updateBtnText').style.display = 'none';
        document.getElementById('updateBtnSpinner').style.display = 'inline-block';

        try {
            const response = await fetch(`${API_BASE_URL}/submissions/${submissionId}/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                showAlert('Pengajuan berhasil dibatalkan', 'success');
                
                // Update UI dengan data terbaru
                if (result.data) {
                    updatePage(result.data);
                } else {
                    // Refresh halaman
                    setTimeout(() => loadSubmissionDetail(), 1000);
                }
            } else {
                showAlert(result.message || 'Gagal membatalkan pengajuan', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal terhubung ke server: ' + error.message, 'danger');
        } finally {
            document.getElementById('updateBtn').disabled = false;
            document.getElementById('updateBtnText').style.display = 'inline';
            document.getElementById('updateBtnSpinner').style.display = 'none';
        }
    };

    // 🔥 FUNGSI DOWNLOAD FORMULIR
    window.downloadForm = function() {
        const data = detailCache.data;
        if (!data) {
            showToast('Data belum tersedia', 'warning');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ 
                orientation: 'p', 
                unit: 'mm', 
                format: [215.9, 330.2] // Ukuran F4
            });

            let y = 20;
            const startX = 17;
            const endX = 195;
            const colMid = 112;
            const padding = 2;

            // Fungsi Kotak Centang (Manual)
            const drawBox = (x, yPos) => {
                doc.setLineWidth(0.2);
                doc.rect(x, yPos - 3, 3.5, 3.5);
            };

            // Fungsi Teks Terbungkus (Agar tidak tabrak garis)
            const drawWrappedText = (text, x, yPos, maxWidth) => {
                if (!text) return;
                const lines = doc.splitTextToSize(text.toString(), maxWidth - (padding * 2));
                doc.text(lines, x + padding, yPos);
            };

            // BORDER LUAR
            doc.rect(12, 12, 192, 305);

            // --- HEADER GRID (3 KOLOM) - REVISI TINGGI 24MM ---
            const headerH = 24;
            const rowH = headerH / 2;
            const metaH = headerH / 4;

            // 1. Kotak Logo (Kiri) - Sekarang 32x24
            doc.rect(12, 12, 32, headerH); 
            try {
                doc.addImage('/img/logo-banten.png', 'PNG', 16, 17.35, 24, 13.3); 
            } catch (e) { console.log('Logo skip'); }

            // 2. Kotak Judul (Tengah)
            const judulW = 98; 
            doc.rect(44, 12, judulW, rowH);
            doc.rect(44, 12 + rowH, judulW, rowH);

            doc.setFont("helvetica", "bold").setFontSize(12);
            doc.text("FORMULIR", 44 + (judulW / 2), 12 + 8, { align: 'center' });
            doc.setFontSize(11);
            doc.text("PERMINTAAN PENGUJIAN", 44 + (judulW / 2), 12 + rowH + 8, { align: 'center' });

            // 3. Kotak Metadata (Kanan)
            const metaX = 44 + judulW; 
            const metaW = 62;

            doc.setFontSize(7.5).setFont("helvetica", "normal");

            doc.rect(metaX, 12, metaW, metaH); 
            doc.text("No. Dokumen : UPTD-PBKBIK-F.01-PO.07", metaX + 2, 12 + 4.5);

            doc.rect(metaX, 12 + metaH, metaW, metaH); 
            doc.text("Terbitan / Revisi : 2 / 0", metaX + 2, 12 + metaH + 4.5);

            doc.rect(metaX, 12 + (metaH * 2), metaW, metaH); 
            doc.text("Tanggal Revisi : 2 Januari 2023", metaX + 2, 12 + (metaH * 2) + 4.5);

            doc.rect(metaX, 12 + (metaH * 3), metaW, metaH); 
            doc.text("Halaman : 1 dari 1", metaX + 2, 12 + (metaH * 3) + 4.5);

            // Border Luar
            doc.rect(12, 12, 192, 305);

            y = 43;
            doc.setFontSize(10);
            doc.text(`Hari / Tanggal : ${formatDate(new Date())}`, 17, y);
            y += 5;
            doc.text("Nama Petugas Pendaftaran : ___________________________", 17, y);
            y += 10;

            // --- I. PERMINTAAN PENGUJIAN ---
            doc.setFont("helvetica", "bold").text("I. PERMINTAAN PENGUJIAN", 17, y);
            y += 7;

            const drawRow = (l1, v1, l2, v2, h = 8) => {
                doc.rect(startX, y - 5, colMid - startX, h);
                doc.rect(colMid, y - 5, endX - colMid, h);
                doc.setFont("helvetica", "normal").setFontSize(9);
                
                const l1Width = doc.getTextWidth(l1);
                const l2Width = doc.getTextWidth(l2);

                doc.text(l1, startX + 2, y);
                doc.text(l2, colMid + 2, y);

                drawWrappedText(v1, startX + 2 + l1Width + 1.5, y, (colMid - startX) - (l1Width + 4));
                drawWrappedText(v2, colMid + 2 + l2Width + 1.5, y, (endX - colMid) - (l2Width + 4));
                
                y += h;
            };

            drawRow("Nomor Urut :", data.id, "Kode Pengujian :", data.registration_number);
            drawRow("Tgl Permohonan :", formatDate(data.created_at), "No Permohonan :", data.nomor_permohonan);
            drawRow("Nama Pemohon :", data.pic_name, "Nama Instansi :", data.company_name);
            drawRow("Alamat :", data.address, "Nomor Telepon :", data.pic_phone);
            drawRow("Email :", data.pic_email, "Nama Proyek :", data.proyek);
            drawRow("Lokasi Proyek :", data.lokasi_proyek, "Catatan Lainnya :", data.description, 20);
            
            y += 5;

            // --- II. KECUKUPAN SAMPLE UJI ---
            doc.setFont("helvetica", "bold").text("II. KECUKUPAN SAMPLE UJI", 17, y);
            y += 7;

            // Jenis & Nama Sample (Tinggi 22mm)
            doc.rect(startX, y - 5, colMid - startX, 22);
            doc.rect(colMid, y - 5, endX - colMid, 22);
            doc.setFont("helvetica", "normal").setFontSize(9);
            doc.text("Jenis Sample Uji :", startX + 2, y);

            // Checkbox Jenis Sample
            let cbX = startX + 2; let cbY = y + 7;
            const types = ["Beton", "Aspal", "Agregat", "Tanah", "Besi", "......."];
            types.forEach((t, i) => {
                if(i === 3) { cbX = startX + 2; cbY += 6; } 
                drawBox(cbX, cbY);
                doc.text(t, cbX + 5, cbY);
                cbX += 25;
            });

            doc.text("Nama Sample Uji :", colMid + 2, y);
            drawWrappedText(data.test_type, colMid + 32, y, (endX - colMid) - 32);
            y += 22;

            // Jumlah Sample
            const qCount = (data.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);

            doc.rect(startX, y - 5, colMid - startX, 8); 
            doc.rect(colMid, y - 5, endX - colMid, 8);

            doc.text("Jumlah Sample Uji : " + (qCount > 0 ? qCount + " sampel" : "____"), startX + 2, y);

            let checkX = startX + 45;
            drawBox(checkX, y); 
            doc.text("Cukup", checkX + 5, y);

            drawBox(checkX + 20, y); 
            doc.text("Tidak Cukup", checkX + 25, y);

            doc.text("Sample dibuat pada : ________________", colMid + 2, y);
            y += 8;

            drawRow("Kemasan Sample : ________________", "", "Asal Sample : ________________",);
            drawRow("Parameter : ", (data.items || []).map(i => i.service_name).join(', '), "Metode : ________________",);

            // Sample diambil oleh
            doc.rect(startX, y - 5, colMid - startX, 15);
            doc.rect(colMid, y - 5, endX - colMid, 15);
            doc.text("Sample diambil oleh :", startX + 2, y);
            drawBox(startX + 2, y + 7); doc.text("Pelanggan", startX + 7, y + 7);
            drawBox(startX + 30, y + 7); doc.text("Laboratorium", startX + 35, y + 7);

            doc.text("Catatan Lainnya :", colMid + 2, y);
            y += 15;
            y += 5;

            // --- III. KAJI ULANG PERMINTAAN ---
            doc.setFont("helvetica", "bold").text("III. KAJI ULANG PERMINTAAN", 17, y);
            y += 7;

            const drawReviewRow = (l1, l2) => {
                doc.rect(startX, y - 5, colMid - startX, 8);
                doc.rect(colMid, y - 5, endX - colMid, 8);
                doc.setFont("helvetica", "normal");
                doc.text(l1, startX + 2, y);
                drawBox(startX + 40, y); doc.text("Ada", startX + 45, y);
                drawBox(startX + 55, y); doc.text("Tidak", startX + 60, y);
                doc.text(l2, colMid + 2, y);
                drawBox(colMid + 45, y); doc.text("Ada", colMid + 50, y);
                drawBox(colMid + 60, y); doc.text("Tidak", colMid + 65, y);
                y += 8;
            };

            drawReviewRow("Metode Uji :", "Sumber Daya Manusia :");
            drawReviewRow("Peralatan :", "Bukti Setor :");

            const boxH = 16;
            doc.rect(startX, y - 5, colMid - startX, boxH * 2);
            doc.rect(colMid, y - 5, endX - colMid, boxH);
            doc.rect(colMid, y - 5 + boxH, endX - colMid, boxH);

            doc.text("Catatan :", startX + 2, y);

            doc.text("Kontrak Pengujian :", colMid + 2, y);
            drawBox(colMid + 2, y + 7); doc.text("Diperlukan", colMid + 7, y + 7);
            drawBox(colMid + 30, y + 7); doc.text("Tidak Diperlukan", colMid + 35, y + 7);

            y += boxH;
            doc.text("Keputusan Kaji Ulang Permintaan Pengujian :", colMid + 2, y);
            drawBox(colMid + 2, y + 7); doc.text("DITERIMA", colMid + 7, y + 7);
            drawBox(colMid + 30, y + 7); doc.text("DITOLAK", colMid + 35, y + 7);

            y += boxH; 
            drawRow("Tanggal Pelaksanaan Pengujian : ____________", "", "Estimasi Tanggal Selesai Pengujian : ____________",);

            // Tanda Tangan
            y += 5;
            doc.setFont("helvetica", "bold");
            doc.text("Petugas Pendaftaran,", 33, y);
            doc.text("Pelanggan / Pemohon,", 135, y);
            y += 15;
            doc.text("(............................)", 35, y);
            doc.text("(............................)", 138, y);
            y += 8;
            doc.text("Mengetahui,", 105, y, { align: 'center' });
            y += 5;
            doc.text("Kepala Seksi Pengujian,", 105, y, { align: 'center' });
            y += 15;
            doc.text("(....................................................)", 105, y, { align: 'center' });

            doc.save(`Form_Uji_${data.registration_number || 'Export'}.pdf`);
            showToast('PDF Berhasil Diunduh!', 'success');

        } catch (error) {
            console.error(error);
            showToast('Gagal membuat PDF', 'danger');
        }
    };

    // 🔥 FUNGSI LIHAT DETAIL TRANSAKSI
    window.viewTransactionDetail = function() {
        const data = detailCache.data;
        if (!data) {
            showToast('Data belum dimuat', 'warning');
            return;
        }
        
        // Redirect ke halaman SKRD/transaksi dengan filter submission ID
        window.location.href = `/admin/skrd?submission=${submissionId}`;
    };

    // ==================== EVENT LISTENERS ====================
    document.getElementById('updateForm')?.addEventListener('submit', handleUpdate);

    // ==================== INITIALIZE ====================
    document.addEventListener('DOMContentLoaded', () => {
        loadSubmissionDetail();
        
        // Bersihkan timeout saat page unload
        window.addEventListener('beforeunload', () => {
            if (loadingTimeout) {
                clearTimeout(loadingTimeout);
            }
        });
    });
})();