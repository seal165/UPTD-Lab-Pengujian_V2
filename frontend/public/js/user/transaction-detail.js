// public/js/user/transaction-detail.js

(function() {
    'use strict';

    let isSubmitting = false; // Flag untuk mencegah double submit
    let selectedFile = null; // Simpan file yang dipilih

    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ Transaction Detail Handler initialized');
        
        // Ambil ID dari atribut data
        const dataElement = document.getElementById('transaction-detail-data');
        
        if (!dataElement) {
            console.error('❌ Element transaction-detail-data tidak ditemukan');
            showError('Data tidak ditemukan');
            return;
        }
        
        const transactionId = dataElement.dataset.id;
        console.log('🔍 Transaction ID:', transactionId);
        
        if (!transactionId) {
            console.error('❌ Transaction ID tidak valid');
            showError('ID transaksi tidak valid');
            return;
        }
        
        // Load data
        loadTransactionDetail(transactionId);
    });

    async function loadTransactionDetail(id) {
        showLoading(true);
        
        try {
            // Ambil token dari localStorage
            const token = localStorage.getItem('token');
            
            console.log('🔑 Token dari localStorage:', token ? token.substring(0, 20) + '...' : 'TIDAK ADA');
            
            if (!token) {
                throw new Error('Token tidak ditemukan. Silakan login ulang.');
            }
            
            // Panggil API
            const API_URL = 'http://localhost:5000/api';
            const endpoint = `${API_URL}/user/transactions/${id}`;
            
            console.log('📡 Fetching from:', endpoint);
            
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Response status:', response.status);

            if (response.status === 401) {
                localStorage.removeItem('token');
                throw new Error('Sesi habis. Silakan login ulang.');
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('📦 Data dari API:', result);

            if (result.success) {
                renderDetail(result.data);
                
                // Setup upload form AFTER data loaded
                setupUploadForm();
            } else {
                throw new Error(result.message || 'Gagal memuat数据');
            }

        } catch (error) {
            console.error('❌ Error:', error);
            showError(error.message);
        }
    }

    function renderDetail(data) {
        console.log('🎯 Rendering data:', data);
        
        // Sembunyikan loading, tampilkan content
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('contentState').style.display = 'block';
        document.getElementById('errorState').style.display = 'none';
        
        // ========== HEADER INFO ==========
        setText('invoice-number', `#${data.no_invoice || data.id || '-'}`);
        
        // Status dengan badge
        const statusEl = document.getElementById('invoice-status');
        if (statusEl) {
            const status = data.status_pembayaran || 'Belum Bayar';
            statusEl.textContent = status;
            statusEl.className = `status-badge ${getStatusClass(status)}`;
        }
        
        // Format tanggal invoice
        const dateStr = data.created_at;
        setText('invoice-date', dateStr ? formatDate(dateStr) : '-');
        
        // ========== INFORMASI PERUSAHAAN ==========
        setText('company-name', data.nama_instansi || '-');
        setText('applicant-name', data.nama_pemohon || '-');
        setText('applicant-email', data.email || '-');
        setText('applicant-phone', data.nomor_telepon || '-');
        
        // ========== DETAIL PEMBAYARAN ==========
        const total = parseFloat(data.total_tagihan) || 0;
        const dibayar = parseFloat(data.jumlah_dibayar) || 0;
        const sisa = total - dibayar;
        
        setText('total-amount', formatRupiah(total));
        setText('paid-amount', formatRupiah(dibayar));
        setText('remaining-amount', formatRupiah(sisa));
        
        // Tanggal bayar - tidak ada di database, jadi sembunyikan section
        const paymentDateItem = document.querySelector('.payment-item:has(#payment-date)');
        if (paymentDateItem) {
            paymentDateItem.style.display = 'none';
        }
        
        // ========== DETAIL LAYANAN ==========
        setText('service-code', data.no_permohonan || '-');
        setText('service-name', data.nama_proyek || '-');
        setText('service-qty', data.total_samples || '1');
        const hargaSatuan = total / (data.total_samples || 1);
        setText('service-price', formatRupiah(hargaSatuan));
        
        // ========== SKRD SECTION ==========
        const skrdSection = document.getElementById('skrd-section');
        const skrdInfo = document.getElementById('skrd-info');
        const skrdAction = document.getElementById('skrd-action');
        const token = localStorage.getItem('token');
        
        if (skrdSection && skrdInfo && skrdAction) {
            if (data.skrd_file) {
                const fileUrl = `http://localhost:5000/api/file/skrd/${data.skrd_file}?token=${token}`;
                skrdInfo.innerHTML = '<i class="fas fa-check-circle text-success"></i> SKRD telah diupload';
                skrdAction.innerHTML = `
                    <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary me-2">
                        <i class="fas fa-eye"></i> Lihat SKRD
                    </a>
                    <a href="${fileUrl}" download class="btn btn-sm btn-primary">
                        <i class="fas fa-download"></i> Download SKRD
                    </a>
                `;
            } else {
                skrdInfo.innerHTML = '<i class="fas fa-hourglass-half text-warning"></i> SKRD sedang diproses oleh admin';
                skrdAction.innerHTML = '';
            }
        }
        
        // ========== 🔥 BUKTI PEMBAYARAN - TAMPILKAN KEDUA BUKTI ==========
        const proofSection = document.getElementById('proof-section');
        const proofContainer = document.getElementById('proof-container');
        
        if (proofSection && proofContainer) {
            let hasProof = false;
            let proofHtml = '<div class="proof-list">';
            
            // Bukti Pembayaran 1
            if (data.bukti_pembayaran_1) {
                hasProof = true;
                const fileUrl = `http://localhost:5000/api/file/payment/${data.bukti_pembayaran_1}?token=${token}`;
                proofHtml += `
                    <div class="proof-item border rounded p-3 mb-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <div class="d-flex align-items-center gap-2 mb-2">
                                    <i class="fas fa-receipt text-primary"></i>
                                    <strong>Bukti Pembayaran 1</strong>
                                </div>
                                <div class="text-muted small">
                                    ${data.bukti_pembayaran_1_uploaded_at ? `Diunggah: ${formatDate(data.bukti_pembayaran_1_uploaded_at)}` : ''}
                                </div>
                            </div>
                            <div class="btn-group">
                                <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                                    <i class="fas fa-eye"></i> Lihat
                                </a>
                                <a href="${fileUrl}" download class="btn btn-sm btn-outline-success">
                                    <i class="fas fa-download"></i> Download
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Bukti Pembayaran 2
            if (data.bukti_pembayaran_2) {
                hasProof = true;
                const fileUrl = `http://localhost:5000/api/file/payment/${data.bukti_pembayaran_2}?token=${token}`;
                proofHtml += `
                    <div class="proof-item border rounded p-3 mb-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <div class="d-flex align-items-center gap-2 mb-2">
                                    <i class="fas fa-receipt text-primary"></i>
                                    <strong>Bukti Pembayaran 2</strong>
                                </div>
                                <div class="text-muted small">
                                    ${data.bukti_pembayaran_2_uploaded_at ? `Diunggah: ${formatDate(data.bukti_pembayaran_2_uploaded_at)}` : ''}
                                </div>
                            </div>
                            <div class="btn-group">
                                <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                                    <i class="fas fa-eye"></i> Lihat
                                </a>
                                <a href="${fileUrl}" download class="btn btn-sm btn-outline-success">
                                    <i class="fas fa-download"></i> Download
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            proofHtml += '</div>';
            
            if (hasProof) {
                proofSection.style.display = 'block';
                proofContainer.innerHTML = proofHtml;
            } else {
                proofSection.style.display = 'block';
                proofContainer.innerHTML = '<div class="text-center py-3 text-muted"><i class="fas fa-info-circle"></i> Belum ada bukti pembayaran yang diupload</div>';
            }
        }
        
        // ========== LOGIKA UPLOAD ==========
        const uploadSection = document.getElementById('upload-proof-section');
        const showUploadBtn = document.getElementById('show-upload-btn');
        const uploadTitle = document.getElementById('upload-title');
        const uploadDesc = document.getElementById('upload-description');
        
        if (uploadSection && showUploadBtn && uploadTitle && uploadDesc) {
            const status = data.status_pembayaran || 'Belum Bayar';
            const hasProof1 = data.bukti_pembayaran_1;
            const hasProof2 = data.bukti_pembayaran_2;
            
            // Jika sudah ada 2 bukti pembayaran, sembunyikan tombol upload
            if (hasProof1 && hasProof2) {
                showUploadBtn.style.display = 'none';
                uploadSection.style.display = 'none';
            }
            // Jika status Lunas, sembunyikan tombol upload
            else if (status === 'Lunas') {
                showUploadBtn.style.display = 'none';
                uploadSection.style.display = 'none';
            }
            // Jika sudah ada bukti 1 (belum Lunas) -> upload bukti 2
            else if (hasProof1 && !hasProof2) {
                uploadTitle.innerHTML = '<i class="fas fa-cloud-upload-alt text-primary me-2"></i>Upload Bukti Pelunasan';
                uploadDesc.innerHTML = `Sisa tagihan: ${formatRupiah(sisa)}`;
                showUploadBtn.style.display = 'block';
                uploadSection.style.display = 'none';
            }
            // Belum ada bukti sama sekali
            else if (!hasProof1 && !hasProof2) {
                uploadTitle.innerHTML = '<i class="fas fa-cloud-upload-alt text-primary me-2"></i>Upload Bukti Pembayaran';
                uploadDesc.innerHTML = `Total tagihan: ${formatRupiah(total)}`;
                showUploadBtn.style.display = 'block';
                uploadSection.style.display = 'none';
            }
            else {
                showUploadBtn.style.display = 'none';
                uploadSection.style.display = 'none';
            }
        }
        
        // ========== CATATAN ==========
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
        
        console.log('✅ Rendering selesai');
    }

    // Setup upload form
    function setupUploadForm() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('proofFile');
        const form = document.getElementById('uploadProofForm');
        const preview = document.getElementById('filePreview');
        
        if (!uploadArea || !fileInput || !form) {
            console.log('⚠️ Upload elements not found');
            return;
        }
        
        // Klik area upload untuk memilih file
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // Drag & drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#4361ee';
            uploadArea.style.backgroundColor = '#f0f7ff';
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#dee2e6';
            uploadArea.style.backgroundColor = 'transparent';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#dee2e6';
            uploadArea.style.backgroundColor = 'transparent';
            
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });
        
        // Event ketika file dipilih
        fileInput.addEventListener('change', function() {
            if (this.files.length) {
                handleFileSelect(this.files[0]);
            }
        });
        
        // Fungsi untuk handle file yang dipilih
        function handleFileSelect(file) {
            console.log('📁 File selected:', file.name, 'size:', file.size, 'type:', file.type);
            
            selectedFile = file;
            
            const preview = document.getElementById('filePreview');
            const fileName = document.getElementById('fileName');
            const fileIcon = document.getElementById('fileIcon');
            const fileSize = document.getElementById('fileSize');
            const fileType = document.getElementById('fileType');
            
            if (preview && fileName) {
                fileName.textContent = file.name;
                
                // Tampilkan ukuran file
                const sizeInKB = (file.size / 1024).toFixed(2);
                if (fileSize) fileSize.textContent = `${sizeInKB} KB`;
                
                // Tampilkan tipe file
                if (fileType) {
                    if (file.type.includes('pdf')) fileType.textContent = 'PDF Document';
                    else if (file.type.includes('image')) fileType.textContent = 'Image';
                    else fileType.textContent = 'File';
                }
                
                // Tampilkan icon berdasarkan tipe file
                if (fileIcon) {
                    if (file.type.includes('pdf')) fileIcon.className = 'fas fa-file-pdf text-danger fa-2x';
                    else if (file.type.includes('image')) fileIcon.className = 'fas fa-file-image text-primary fa-2x';
                    else fileIcon.className = 'fas fa-file text-secondary fa-2x';
                }
                
                preview.style.display = 'block';
                
                // Untuk file gambar, tampilkan preview thumbnail
                if (file.type.includes('image')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        let imgPreview = document.getElementById('imagePreview');
                        if (!imgPreview) {
                            imgPreview = document.createElement('img');
                            imgPreview.id = 'imagePreview';
                            imgPreview.className = 'img-thumbnail mt-2';
                            imgPreview.style.maxWidth = '200px';
                            imgPreview.style.maxHeight = '150px';
                            preview.appendChild(imgPreview);
                        }
                        imgPreview.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                } else {
                    const imgPreview = document.getElementById('imagePreview');
                    if (imgPreview) imgPreview.remove();
                }
            }
        }
        
        // Fungsi untuk remove file
        window.removeFile = function() {
            fileInput.value = '';
            selectedFile = null;
            const preview = document.getElementById('filePreview');
            const imgPreview = document.getElementById('imagePreview');
            if (preview) preview.style.display = 'none';
            if (imgPreview) imgPreview.remove();
            console.log('🗑️ File removed');
        };
        
        // Handle form submit
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Cegah double submit
            if (isSubmitting) {
                console.log('⏳ Submit sedang berlangsung...');
                return;
            }
            
            const notes = document.getElementById('paymentNotes').value;
            const transactionId = document.getElementById('transactionId').value;
            const token = localStorage.getItem('token');
            const submitBtn = document.getElementById('submitProofBtn');
            
            console.log('📤 Uploading file:', selectedFile?.name);
            console.log('📤 Transaction ID:', transactionId);
            
            if (!selectedFile) {
                alert('Pilih file bukti pembayaran terlebih dahulu');
                return;
            }
            
            // Validasi ukuran file (maks 2MB)
            if (selectedFile.size > 2 * 1024 * 1024) {
                alert('Ukuran file terlalu besar. Maksimal 2MB');
                return;
            }
            
            if (!token) {
                alert('Token tidak ditemukan. Silakan login ulang.');
                window.location.href = '/login';
                return;
            }
            
            // Set flag submitting
            isSubmitting = true;
            
            const formData = new FormData();
            formData.append('payment_proof', selectedFile);
            formData.append('notes', notes || '');
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading...';
            
            try {
                const API_URL = 'http://localhost:5000/api';
                const url = `${API_URL}/user/transactions/${transactionId}/upload`;
                console.log('📡 Uploading to:', url);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                
                console.log('📡 Response status:', response.status);
                
                const result = await response.json();
                console.log('📦 Response:', result);
                
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

    // Helper functions
    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '-';
        }
    }

    function formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    function getStatusClass(status) {
        const classes = {
            'Menunggu Verifikasi': 'status-pending',
            'Pengecekan Sampel': 'status-info',
            'Belum Bayar': 'status-warning',
            'Belum Lunas': 'status-warning',
            'Menunggu SKRD Upload': 'status-warning',
            'Lunas': 'status-success',
            'Sedang Diuji': 'status-primary',
            'Selesai': 'status-success'
        };
        return classes[status] || 'status-default';
    }

    function showLoading(show) {
        const loadingEl = document.getElementById('loadingState');
        const contentEl = document.getElementById('contentState');
        const errorEl = document.getElementById('errorState');
        
        if (loadingEl) loadingEl.style.display = show ? 'block' : 'none';
        if (contentEl) contentEl.style.display = show ? 'none' : 'block';
        if (errorEl) errorEl.style.display = 'none';
    }

    function showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('contentState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        document.getElementById('errorMessage').textContent = message || 'Terjadi kesalahan saat memuat data';
    }

    // Fungsi untuk upload form
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
        const imgPreview = document.getElementById('imagePreview');
        if (preview) preview.style.display = 'none';
        if (imgPreview) imgPreview.remove();
    };
})();