// public/js/user/transaction-detail.js

(function() {
    'use strict';

    let isSubmitting = false;
    let selectedFile = null;

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

    function getStatusClass(status) {
        return STATUS_CONFIG[status]?.class || 'status-default';
    }

    function getStatusBadge(status) {
        const config = STATUS_CONFIG[status] || { class: 'status-default', label: status };
        return `<span class="status-badge ${config.class}">${config.label}</span>`;
    }

    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ Transaction Detail Handler initialized');
        const dataElement = document.getElementById('transaction-detail-data');
        if (!dataElement) {
            console.error('❌ Element not found');
            showError('Data tidak ditemukan');
            return;
        }
        const transactionId = dataElement.dataset.id;
        if (!transactionId) {
            showError('ID transaksi tidak valid');
            return;
        }
        loadTransactionDetail(transactionId);
    });

    async function loadTransactionDetail(id) {
        showLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Token tidak ditemukan. Silakan login ulang.');
            
            const API_URL = 'http://localhost:5000/api';
            const response = await fetch(`${API_URL}/user/transactions/${id}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                throw new Error('Sesi habis. Silakan login ulang.');
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const result = await response.json();
            if (result.success) {
                renderDetail(result.data);
                setupUploadForm();
            } else {
                throw new Error(result.message || 'Gagal memuat data');
            }
        } catch (error) {
            console.error('❌ Error:', error);
            showError(error.message);
        }
    }

    function renderDetail(data) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('contentState').style.display = 'block';
        document.getElementById('errorState').style.display = 'none';
        
        setText('invoice-number', `#${data.no_invoice || data.id || '-'}`);
        const statusEl = document.getElementById('invoice-status');
        if (statusEl) {
            const status = data.status_pembayaran || 'Belum Bayar';
            statusEl.innerHTML = getStatusBadge(status);
        }
        setText('invoice-date', data.created_at ? formatDate(data.created_at) : '-');
        
        setText('company-name', data.nama_instansi || '-');
        setText('applicant-name', data.nama_pemohon || '-');
        setText('applicant-email', data.email || '-');
        setText('applicant-phone', data.nomor_telepon || '-');
        
        const total = parseFloat(data.total_tagihan) || 0;
        const dibayar = parseFloat(data.jumlah_dibayar) || 0;
        const sisa = total - dibayar;
        
        setText('total-amount', formatRupiah(total));
        setText('paid-amount', formatRupiah(dibayar));
        setText('remaining-amount', formatRupiah(sisa));
        
        // Sembunyikan item tanggal bayar (tidak ada data)
        const paymentDateItem = document.querySelector('.payment-item:has(#payment-date)');
        if (paymentDateItem) paymentDateItem.style.display = 'none';
        
        setText('service-code', data.no_permohonan || '-');
        setText('service-name', data.nama_proyek || '-');
        setText('service-qty', data.total_samples || '1');
        const hargaSatuan = total / (data.total_samples || 1);
        setText('service-price', formatRupiah(hargaSatuan));
        
        // SKRD
        const skrdInfo = document.getElementById('skrd-info');
        const skrdAction = document.getElementById('skrd-action');
        const token = localStorage.getItem('token');
        if (skrdInfo && skrdAction) {
            if (data.skrd_file) {
                const fileUrl = `http://localhost:5000/api/file/skrd/${data.skrd_file}?token=${token}`;
                const uploadedAt = data.skrd_uploaded_at ? formatDate(data.skrd_uploaded_at) : '';
                skrdInfo.innerHTML = `
                    <i class="fas fa-check-circle text-success"></i> SKRD telah diupload
                    ${uploadedAt ? `<br><small class="text-muted">Diunggah: ${uploadedAt}</small>` : ''}
                `;
                skrdAction.innerHTML = `
                    <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary me-2">Lihat</a>
                    <a href="${fileUrl}" download class="btn btn-sm btn-primary">Download</a>
                `;
            } else {
                skrdInfo.innerHTML = '<i class="fas fa-hourglass-half text-warning"></i> SKRD sedang diproses oleh admin';
                skrdAction.innerHTML = '';
            }
        }
        
        // Bukti Pembayaran
        const proofSection = document.getElementById('proof-section');
        const proofContainer = document.getElementById('proof-container');
        if (proofSection && proofContainer) {
            let hasProof = false;
            let proofHtml = '<div class="proof-list">';
            
            [data.bukti_pembayaran_1, data.bukti_pembayaran_2].forEach((proof, idx) => {
                if (proof) {
                    hasProof = true;
                    const fileUrl = `http://localhost:5000/api/file/payment/${proof}?token=${token}`;
                    const uploadedAt = idx === 0 ? data.bukti_pembayaran_1_uploaded_at : data.bukti_pembayaran_2_uploaded_at;
                    proofHtml += `
                        <div class="proof-item border rounded p-3 mb-3">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <div class="d-flex align-items-center gap-2 mb-2">
                                        <i class="fas fa-receipt text-primary"></i>
                                        <strong>Bukti Pembayaran ${idx + 1}</strong>
                                    </div>
                                    <div class="text-muted small">${uploadedAt ? `Diunggah: ${formatDate(uploadedAt)}` : ''}</div>
                                </div>
                                <div class="btn-group">
                                    <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary">Lihat</a>
                                    <a href="${fileUrl}" download class="btn btn-sm btn-outline-success">Download</a>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
            proofHtml += '</div>';
            
            proofSection.style.display = 'block';
            proofContainer.innerHTML = hasProof ? proofHtml : '<div class="text-center py-3 text-muted"><i class="fas fa-info-circle"></i> Belum ada bukti pembayaran</div>';
        }
        
        // Logika Upload
        const uploadSection = document.getElementById('upload-proof-section');
        const showUploadBtn = document.getElementById('show-upload-btn');
        const uploadTitle = document.getElementById('upload-title');
        const uploadDesc = document.getElementById('upload-description');
        const status = data.status_pembayaran || 'Belum Bayar';
        const hasProof1 = !!data.bukti_pembayaran_1;
        const hasProof2 = !!data.bukti_pembayaran_2;
        
        if (uploadSection && showUploadBtn && uploadTitle && uploadDesc) {
            if (hasProof1 && hasProof2) {
                showUploadBtn.style.display = 'none';
                uploadSection.style.display = 'none';
            } else if (status === 'Lunas' || status === 'Selesai' || status === 'Dibatalkan') {
                showUploadBtn.style.display = 'none';
                uploadSection.style.display = 'none';
            } else if (status === 'Menunggu Verifikasi') {
                // Menunggu verifikasi admin, sembunyikan upload form agar tidak tertimpa
                showUploadBtn.style.display = 'none';
                uploadSection.style.display = 'none';
            } else if (hasProof1 && !hasProof2 && status === 'Belum Lunas') {
                // Status Belum Lunas berarti Bukti 1 sudah diverifikasi tapi ada kurang bayar
                uploadTitle.innerHTML = '<i class="fas fa-cloud-upload-alt text-primary me-2"></i>Upload Bukti Pelunasan';
                uploadDesc.innerHTML = `Sisa tagihan: ${formatRupiah(sisa)}`;
                showUploadBtn.style.display = 'block';
                uploadSection.style.display = 'none';
            } else if (!hasProof1) {
                uploadTitle.innerHTML = '<i class="fas fa-cloud-upload-alt text-primary me-2"></i>Upload Bukti Pembayaran';
                uploadDesc.innerHTML = `Total tagihan: ${formatRupiah(total)}`;
                showUploadBtn.style.display = 'block';
                uploadSection.style.display = 'none';
            } else {
                showUploadBtn.style.display = 'none';
                uploadSection.style.display = 'none';
            }
        }
        
        // Catatan
        const notesSection = document.getElementById('notes-section');
        const paymentNotes = document.getElementById('payment-notes');
        if (notesSection && paymentNotes) {
            if (data.bukti_pembayaran_notes) {
                notesSection.style.display = 'block';
                paymentNotes.textContent = data.bukti_pembayaran_notes;
            } else {
                notesSection.style.display = 'none';
            }
        }
    }

    function setupUploadForm() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('proofFile');
        const form = document.getElementById('uploadProofForm');
        if (!uploadArea || !fileInput || !form) return;
        
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#4361ee'; uploadArea.style.backgroundColor = '#f0f7ff'; });
        uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = '#dee2e6'; uploadArea.style.backgroundColor = 'transparent'; });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#dee2e6';
            uploadArea.style.backgroundColor = 'transparent';
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });
        fileInput.addEventListener('change', function() { if (this.files.length) handleFileSelect(this.files[0]); });
        
        function handleFileSelect(file) {
            selectedFile = file;
            const preview = document.getElementById('filePreview');
            if (!preview) return;
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('fileSize').textContent = `${(file.size / 1024).toFixed(2)} KB`;
            document.getElementById('fileType').textContent = file.type.includes('pdf') ? 'PDF Document' : file.type.includes('image') ? 'Image' : 'File';
            const icon = document.getElementById('fileIcon');
            if (icon) {
                icon.className = file.type.includes('pdf') ? 'fas fa-file-pdf text-danger fa-2x' :
                                 file.type.includes('image') ? 'fas fa-file-image text-primary fa-2x' :
                                 'fas fa-file text-secondary fa-2x';
            }
            preview.style.display = 'block';
            if (file.type.includes('image')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    let img = document.getElementById('imagePreview');
                    if (!img) { img = document.createElement('img'); img.id = 'imagePreview'; img.className = 'img-thumbnail mt-2'; img.style.maxWidth = '200px'; img.style.maxHeight = '150px'; preview.appendChild(img); }
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                const img = document.getElementById('imagePreview');
                if (img) img.remove();
            }
        }
        
        window.removeFile = function() {
            fileInput.value = '';
            selectedFile = null;
            const preview = document.getElementById('filePreview');
            if (preview) preview.style.display = 'none';
            const img = document.getElementById('imagePreview');
            if (img) img.remove();
        };
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (isSubmitting) { console.log('⏳ Submit sedang berlangsung...'); return; }
            const notes = document.getElementById('paymentNotes').value;
            const transactionId = document.getElementById('transactionId').value;
            const token = localStorage.getItem('token');
            const submitBtn = document.getElementById('submitProofBtn');
            
            if (!selectedFile) { alert('Pilih file bukti pembayaran terlebih dahulu'); return; }
            if (selectedFile.size > 2 * 1024 * 1024) { alert('Ukuran file terlalu besar. Maksimal 2MB'); return; }
            if (!token) { alert('Token tidak ditemukan. Silakan login ulang.'); window.location.href = '/login'; return; }
            
            isSubmitting = true;
            const formData = new FormData();
            formData.append('payment_proof', selectedFile);
            formData.append('notes', notes || '');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading...';
            
            try {
                const API_URL = 'http://localhost:5000/api';
                const response = await fetch(`${API_URL}/user/transactions/${transactionId}/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const result = await response.json();
                if (result.success) {
                    alert('✅ Bukti pembayaran berhasil diupload');
                    location.reload();
                } else {
                    alert('❌ ' + (result.message || 'Gagal upload bukti pembayaran'));
                }
            } catch (error) {
                console.error('❌ Upload error:', error);
                alert('❌ Gagal upload bukti pembayaran: ' + error.message);
            } finally {
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Upload Bukti';
            }
        });
    }

    // ========== HELPER ==========
    function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return '-'; }
    }
    function formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    }
    function showLoading(show) {
        document.getElementById('loadingState').style.display = show ? 'block' : 'none';
        document.getElementById('contentState').style.display = show ? 'none' : 'block';
        document.getElementById('errorState').style.display = 'none';
    }
    function showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('contentState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        document.getElementById('errorMessage').textContent = message || 'Terjadi kesalahan saat memuat data';
    }

    window.showUploadForm = function() {
        document.getElementById('show-upload-btn').style.display = 'none';
        document.getElementById('upload-proof-section').style.display = 'block';
    };
    window.cancelUpload = function() {
        document.getElementById('upload-proof-section').style.display = 'none';
        document.getElementById('show-upload-btn').style.display = 'block';
        document.getElementById('uploadProofForm').reset();
        document.getElementById('filePreview').style.display = 'none';
        selectedFile = null;
    };
    window.removeFile = function() {
        const fileInput = document.getElementById('proofFile');
        if (fileInput) fileInput.value = '';
        selectedFile = null;
        const preview = document.getElementById('filePreview');
        if (preview) preview.style.display = 'none';
        const img = document.getElementById('imagePreview');
        if (img) img.remove();
    };
})();