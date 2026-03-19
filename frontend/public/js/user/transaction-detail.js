// public/js/user/transaction-detail.js

(function() {
    'use strict';

    let isSubmitting = false; // Flag untuk mencegah double submit

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
                throw new Error(result.message || 'Gagal memuat data');
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
        
        // ========== BUKTI PEMBAYARAN ==========
        const token = localStorage.getItem('token');
        const proofSection = document.getElementById('proof-section');
        const proofStatus = document.getElementById('proof-status');
        const proofAction = document.getElementById('proof-action');
        
        if (proofStatus && proofAction && proofSection) {
            if (data.bukti_pembayaran_1 || data.bukti_pembayaran_2) {
                const bukti = data.bukti_pembayaran_2 || data.bukti_pembayaran_1;
                proofSection.style.display = 'block';
                proofStatus.innerHTML = '<i class="fas fa-check-circle text-success"></i> Bukti pembayaran telah diupload';
                proofAction.innerHTML = `
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <a href="http://localhost:5000/api/file/payment/${bukti}?token=${token}" target="_blank" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-eye"></i> Lihat Bukti
                        </a>
                        <a href="http://localhost:5000/api/file/payment/${bukti}?token=${token}" download class="btn btn-sm btn-outline-success">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>
                `;
            } else {
                proofSection.style.display = 'block';
                proofStatus.innerHTML = '<i class="fas fa-exclamation-circle text-danger"></i> Belum ada bukti pembayaran yang diupload';
                proofAction.innerHTML = '';
            }
        }
        
        // ========== LOGIKA UPLOAD ==========
        const uploadSection = document.getElementById('upload-proof-section');
        const showUploadBtn = document.getElementById('show-upload-btn');
        const uploadTitle = document.getElementById('upload-title');
        const uploadDesc = document.getElementById('upload-description');
        
        if (uploadSection && showUploadBtn && uploadTitle && uploadDesc) {
            const status = data.status_pembayaran || 'Belum Bayar';
            
            if (status === 'Lunas') {
                showUploadBtn.style.display = 'none';
                uploadSection.style.display = 'none';
            } else if (status === 'Belum Lunas') {
                // Belum Lunas - bisa upload bukti kedua
                uploadTitle.innerHTML = '<i class="fas fa-cloud-upload-alt text-primary me-2"></i>Upload Bukti Pelunasan';
                uploadDesc.innerHTML = `Sisa tagihan: ${formatRupiah(sisa)}`;
                showUploadBtn.style.display = 'block';
                uploadSection.style.display = 'none';
            } else if (status === 'Belum Bayar' || status === 'Menunggu SKRD Upload') {
                // Belum Bayar - bisa upload bukti pertama
                uploadTitle.innerHTML = '<i class="fas fa-cloud-upload-alt text-primary me-2"></i>Upload Bukti Pembayaran';
                uploadDesc.innerHTML = `Total tagihan: ${formatRupiah(total)}`;
                showUploadBtn.style.display = 'block';
                uploadSection.style.display = 'none';
            } else {
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

    // Setup upload form dengan flag untuk mencegah double submit
    // Setup upload form dengan flag untuk mencegah double submit
    function setupUploadForm() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('proofFile');
        const form = document.getElementById('uploadProofForm');
        const preview = document.getElementById('filePreview');
        const fileName = document.getElementById('fileName');
        const removeBtn = document.querySelector('[onclick="removeFile()"]');
        
        if (uploadArea && fileInput) {
            // Hapus event listener lama
            const newUploadArea = uploadArea.cloneNode(true);
            uploadArea.parentNode.replaceChild(newUploadArea, uploadArea);
            
            const newFileInput = document.getElementById('proofFile');
            const newUploadAreaElement = document.getElementById('uploadArea');
            
            // Klik area upload untuk memilih file
            newUploadAreaElement.addEventListener('click', () => newFileInput.click());
            
            // Drag & drop
            newUploadAreaElement.addEventListener('dragover', (e) => {
                e.preventDefault();
                newUploadAreaElement.style.borderColor = '#4361ee';
                newUploadAreaElement.style.backgroundColor = '#f0f7ff';
            });
            
            newUploadAreaElement.addEventListener('dragleave', () => {
                newUploadAreaElement.style.borderColor = '#dee2e6';
                newUploadAreaElement.style.backgroundColor = 'transparent';
            });
            
            newUploadAreaElement.addEventListener('drop', (e) => {
                e.preventDefault();
                newUploadAreaElement.style.borderColor = '#dee2e6';
                newUploadAreaElement.style.backgroundColor = 'transparent';
                
                if (e.dataTransfer.files.length) {
                    newFileInput.files = e.dataTransfer.files;
                    handleFileSelect(e.dataTransfer.files[0]);
                }
            });
            
            // Event ketika file dipilih
            newFileInput.addEventListener('change', function() {
                if (this.files.length) {
                    handleFileSelect(this.files[0]);
                }
            });
        }
        
        // Fungsi untuk handle file yang dipilih
        function handleFileSelect(file) {
            console.log('📁 File selected:', file.name, 'size:', file.size, 'type:', file.type);
            
            const preview = document.getElementById('filePreview');
            const fileName = document.getElementById('fileName');
            const fileIcon = document.getElementById('fileIcon');
            const fileSize = document.getElementById('fileSize');
            const fileType = document.getElementById('fileType');
            
            if (preview && fileName) {
                // Tampilkan nama file
                fileName.textContent = file.name;
                
                // Tampilkan ukuran file dalam format yang mudah dibaca
                const sizeInKB = (file.size / 1024).toFixed(2);
                const fileSizeText = document.createElement('small');
                fileSizeText.className = 'text-muted d-block';
                fileSizeText.textContent = `Ukuran: ${sizeInKB} KB`;
                
                // Tampilkan icon berdasarkan tipe file
                const iconElement = document.querySelector('#filePreview i');
                if (iconElement) {
                    if (file.type.includes('pdf')) {
                        iconElement.className = 'fas fa-file-pdf text-danger';
                    } else if (file.type.includes('image')) {
                        iconElement.className = 'fas fa-file-image text-primary';
                    } else {
                        iconElement.className = 'fas fa-file text-secondary';
                    }
                }
                
                // Hapus file size lama jika ada
                const oldSize = preview.querySelector('.file-size');
                if (oldSize) oldSize.remove();
                
                // Tambah file size baru
                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'file-size text-muted small ms-2';
                sizeSpan.textContent = `(${sizeInKB} KB)`;
                document.getElementById('fileName').appendChild(sizeSpan);
                
                preview.style.display = 'block';
                
                // Untuk file gambar, tampilkan preview thumbnail
                if (file.type.includes('image')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const imgPreview = document.getElementById('imagePreview');
                        if (!imgPreview) {
                            const img = document.createElement('img');
                            img.id = 'imagePreview';
                            img.className = 'img-thumbnail mt-2';
                            img.style.maxWidth = '200px';
                            img.style.maxHeight = '150px';
                            img.src = e.target.result;
                            preview.appendChild(img);
                        } else {
                            imgPreview.src = e.target.result;
                        }
                    };
                    reader.readAsDataURL(file);
                } else {
                    // Hapus preview gambar jika ada
                    const imgPreview = document.getElementById('imagePreview');
                    if (imgPreview) imgPreview.remove();
                }
            }
        }
        
        // Fungsi untuk remove file
        window.removeFile = function() {
            const fileInput = document.getElementById('proofFile');
            const preview = document.getElementById('filePreview');
            const fileName = document.getElementById('fileName');
            const imgPreview = document.getElementById('imagePreview');
            
            if (fileInput) fileInput.value = '';
            if (preview) preview.style.display = 'none';
            if (fileName) fileName.innerHTML = '';
            if (imgPreview) imgPreview.remove();
            
            console.log('🗑️ File removed');
        };
        
        if (form) {
            // Hapus event listener lama
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            
            const newFormElement = document.getElementById('uploadProofForm');
            
            newFormElement.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                // Cegah double submit
                if (isSubmitting) {
                    console.log('⏳ Submit sedang berlangsung...');
                    return;
                }
                
                const fileInput = document.getElementById('proofFile');
                const notes = document.getElementById('paymentNotes').value;
                const transactionId = document.getElementById('transactionId').value;
                const token = localStorage.getItem('token');
                const submitBtn = document.getElementById('submitProofBtn');
                
                console.log('📤 Uploading file:', fileInput.files[0]?.name);
                console.log('📤 Transaction ID:', transactionId);
                
                if (!fileInput.files.length) {
                    alert('Pilih file bukti pembayaran terlebih dahulu');
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
                formData.append('payment_proof', fileInput.files[0]);
                formData.append('notes', notes);
                
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
                        isSubmitting = false;
                    }
                    
                } catch (error) {
                    console.error('❌ Upload error:', error);
                    alert('❌ Gagal upload bukti pembayaran: ' + error.message);
                    isSubmitting = false;
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Upload Bukti';
                }
            });
        }
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
    };

    window.removeFile = function() {
        document.getElementById('proofFile').value = '';
        document.getElementById('filePreview').style.display = 'none';
    };
})();