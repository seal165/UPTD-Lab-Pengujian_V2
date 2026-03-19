// public/js/user/history-detail-handler.js

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ History Detail Handler initialized');
        
        // CEK TOKEN - Ambil dari hidden input dulu, lalu cookie/meta
        const token = document.getElementById('currentUserToken')?.value || getTokenFromCookie() || getTokenFromMeta();
        console.log('🔑 Token:', token ? 'ADA' : 'TIDAK ADA');
        
        if (!token) {
            console.error('❌ Token tidak ditemukan!');
            showError('Token tidak ditemukan. Silakan login ulang.');
            return;
        }
        
        // Simpan token ke variable global untuk digunakan di fungsi lain
        window.userToken = token;
        
        // Ambil ID dari URL atau dari hidden input
        const submissionId = document.getElementById('currentSubmissionId')?.value || 
                            window.location.pathname.split('/').pop();
        
        console.log('🔍 Submission ID:', submissionId);
        
        if (!submissionId || submissionId === 'detail' || submissionId === 'history') {
            showError('ID pengajuan tidak valid');
            return;
        }
        
        // Load data
        loadSubmissionDetail(submissionId, token);
    });

    // Fungsi untuk mendapatkan token dari cookie
    function getTokenFromCookie() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token' || name === 'uptd.sid') {
                return value;
            }
        }
        return null;
    }

    // Fungsi untuk mendapatkan token dari meta tag (jika ada)
    function getTokenFromMeta() {
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        return metaToken ? metaToken.getAttribute('content') : null;
    }

    async function loadSubmissionDetail(id, token) {
        console.log('🔄 Loading detail for ID:', id);
        
        // Tampilkan loading
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('contentState').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';
        
        try {
            // Panggil API
            const API_URL = 'http://localhost:5000/api';
            const endpoint = `${API_URL}/user/history/${id}`;
            
            console.log('📡 Fetching:', endpoint);
            
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            console.log('📡 Response status:', response.status);

            if (response.status === 401) {
                showError('Sesi habis. Silakan login ulang.');
                setTimeout(() => window.location.href = '/login', 2000);
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('📦 Data dari API:', result);

            if (result.success) {
                // Sembunyikan loading, tampilkan content
                document.getElementById('loadingState').style.display = 'none';
                document.getElementById('contentState').style.display = 'block';
                
                // Isi data ke HTML
                fillData(result.data, token);
            } else {
                throw new Error(result.message || 'Gagal memuat data');
            }

        } catch (error) {
            console.error('❌ Error:', error);
            showError(error.message || 'Terjadi kesalahan');
        }
    }

    function fillData(data, token) {
        console.log('📝 Mengisi data:', data);
        
        // Header - Format ID dengan 6 digit
        const formattedId = String(data.id).padStart(6, '0');
        setText('det-id', data.no_permohonan ? `#${data.no_permohonan}` : `#${formattedId}`);
        setText('det-status', data.status || '-');
        setText('det-date', formatDate(data.created_at));
        
        // Perusahaan
        setText('det-company', data.nama_instansi || '-');
        setText('det-pic', data.nama_pemohon || '-');
        setText('det-position', data.jabatan || '-');
        setText('det-address', data.alamat_pemohon || '-');
        
        // Contact
        const contact = [];
        if (data.email_pemohon) contact.push(data.email_pemohon);
        if (data.nomor_telepon) contact.push(data.nomor_telepon);
        setText('det-contact', contact.join(' / ') || '-');
        setText('det-email', data.email_pemohon || '-');
        
        // Proyek
        setText('det-project', data.nama_proyek || '-');
        setText('det-project-location', data.lokasi_proyek || '-');
        
        // Material & Layanan
        if (data.samples && data.samples.length > 0) {
            const sample = data.samples[0];
            
            // Jenis sample
            setText('det-sample-type', sample.jenis_sample || '-');
            
            // Metode Pengujian
            setText('det-method', sample.method_at_time || sample.method || '-');
            
            // Nama layanan
            setText('det-service-name', sample.nama_identitas_sample || '-');
            
            // Jumlah sample
            const qty = sample.jumlah_sample_angka || 1;
            setText('det-qty', qty);
            
            // Harga per sample
            const unitPrice = parseFloat(sample.price_at_time) || 0;
            setText('det-unit-price', formatRupiah(unitPrice));
            
            // Subtotal
            const subtotal = qty * unitPrice;
            setText('det-subtotal', formatRupiah(subtotal));
            
            // Total tagihan
            const totalTagihan = data.payment?.total_tagihan || subtotal;
            setText('det-total', formatRupiah(totalTagihan));
            
            console.log('💰 Perhitungan:', {
                qty: qty,
                unitPrice: unitPrice,
                subtotal: subtotal,
                totalTagihan: totalTagihan
            });
        } else {
            setText('det-sample-type', '-');
            setText('det-method', '-');
            setText('det-service-name', '-');
            setText('det-qty', '1');
            setText('det-unit-price', formatRupiah(0));
            setText('det-subtotal', formatRupiah(0));
            setText('det-total', formatRupiah(0));
        }

        // Informasi Pembayaran
        if (data.payment) {
            setText('det-invoice', data.payment.no_invoice || '-');
            setText('det-bill', formatRupiah(data.payment.total_tagihan || 0));
            setText('det-paid', formatRupiah(data.payment.jumlah_dibayar || 0));
            
            const sisa = (data.payment.total_tagihan || 0) - (data.payment.jumlah_dibayar || 0);
            setText('det-remaining', formatRupiah(sisa));
            
            let paymentStatus = data.payment.status_pembayaran || '-';
            let statusClass = '';
            
            if (paymentStatus === 'Lunas') statusClass = 'badge-soft-success';
            else if (paymentStatus === 'Belum Lunas' || paymentStatus === 'Belum Bayar') statusClass = 'badge-soft-danger';
            else if (paymentStatus === 'Menunggu SKRD Upload') statusClass = 'badge-soft-warning';
            
            document.getElementById('det-payment-status').innerHTML = 
                `<span class="badge ${statusClass}">${paymentStatus}</span>`;
            
            setText('det-payment-date', data.payment.bukti_pembayaran_1_uploaded_at ? 
                formatDate(data.payment.bukti_pembayaran_1_uploaded_at) : '-');
            
            // Tampilkan bukti pembayaran jika ada
            renderPaymentProofs(data.payment, token);
        } else {
            setText('det-invoice', '-');
            setText('det-bill', formatRupiah(0));
            setText('det-paid', formatRupiah(0));
            setText('det-remaining', formatRupiah(0));
            document.getElementById('det-payment-status').innerHTML = '-';
            setText('det-payment-date', '-');
        }
        
        // Dokumen
        renderDocuments(data, token);
        
        // Laporan
        renderLaporan(data, token);
        
        // Catatan Admin
        if (data.catatan_admin) {
            document.getElementById('admin-notes-section').style.display = 'block';
            setText('admin-notes', data.catatan_admin);
        }
        
        // Timeline
        renderTimeline(data);
        
        console.log('✅ Selesai mengisi data');
    }

    function renderPaymentProofs(payment, token) {
        const BACKEND_URL = 'http://localhost:5000';
        const section = document.getElementById('payment-proof-section');
        const list = document.getElementById('payment-proof-list');
        
        if (!section || !list) return;
        
        let hasProofs = false;
        let html = '';
        
        if (payment.bukti_pembayaran_1) {
            hasProofs = true;
            const fileUrl = `${BACKEND_URL}/api/file/payment/${payment.bukti_pembayaran_1}?token=${token}`;
            html += `
                <div class="document-item d-flex align-items-center p-2 mb-2 border rounded">
                    <div class="doc-icon me-2">
                        <i class="fas fa-file-pdf text-danger"></i>
                    </div>
                    <div class="doc-info flex-grow-1">
                        <small>Bukti Pembayaran 1</small>
                        ${payment.bukti_pembayaran_notes ? 
                            `<small class="text-muted d-block">Catatan: ${payment.bukti_pembayaran_notes}</small>` : ''}
                    </div>
                    <div class="doc-action">
                        <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" 
                           class="btn btn-sm btn-primary">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>
                </div>
            `;
        }
        
        if (payment.bukti_pembayaran_2) {
            hasProofs = true;
            const fileUrl = `${BACKEND_URL}/api/file/payment/${payment.bukti_pembayaran_2}?token=${token}`;
            html += `
                <div class="document-item d-flex align-items-center p-2 mb-2 border rounded">
                    <div class="doc-icon me-2">
                        <i class="fas fa-file-pdf text-danger"></i>
                    </div>
                    <div class="doc-info flex-grow-1">
                        <small>Bukti Pembayaran 2</small>
                    </div>
                    <div class="doc-action">
                        <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" 
                           class="btn btn-sm btn-primary">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>
                </div>
            `;
        }
        
        if (hasProofs) {
            section.style.display = 'block';
            list.innerHTML = html;
        }
    }

    function renderDocuments(data, token) {
        const BACKEND_URL = 'http://localhost:5000';
        
        // Surat Permohonan - 1 TOMBOL DOWNLOAD SAJA
        if (data.file_surat_permohonan) {
            setText('status-doc-permohonan', '✅ Terupload');
            const fileUrl = `${BACKEND_URL}/api/file/surat/${data.file_surat_permohonan}?token=${token}`;
            document.getElementById('action-doc-permohonan').innerHTML = 
                `<a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" 
                    class="btn btn-sm btn-primary">
                    <i class="fas fa-download"></i> Download
                </a>`;
        } else {
            setText('status-doc-permohonan', '❌ Belum diupload');
            document.getElementById('action-doc-permohonan').innerHTML = '';
        }
        
        // Scan KTP - 1 TOMBOL DOWNLOAD SAJA
        if (data.file_ktp) {
            setText('status-doc-ktp', '✅ Terupload');
            const fileUrl = `${BACKEND_URL}/api/file/ktp/${data.file_ktp}?token=${token}`;
            document.getElementById('action-doc-ktp').innerHTML = 
                `<a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" 
                    class="btn btn-sm btn-primary">
                    <i class="fas fa-download"></i> Download
                </a>`;
        } else {
            setText('status-doc-ktp', '❌ Belum diupload');
            document.getElementById('action-doc-ktp').innerHTML = '';
        }
    }

    function renderLaporan(data, token) {
        const statusLaporan = document.getElementById('status-laporan');
        const actionLaporan = document.getElementById('action-laporan');
        const laporanDate = document.getElementById('laporan-date');
        const BACKEND_URL = 'http://localhost:5000';
        
        if (!statusLaporan || !actionLaporan) return;
        
        if (data.status === 'Selesai' && data.report && data.report.file_laporan) {
            statusLaporan.innerHTML = '<i class="fas fa-check-circle text-success"></i> Laporan siap diunduh';
            if (laporanDate) {
                laporanDate.innerHTML = `Diterbitkan: ${formatDate(data.report.tanggal_selesai || data.report.created_at)}`;
            }
            
            const fileUrl = `${BACKEND_URL}/api/file/laporan/${data.report.file_laporan}?token=${token}`;
            
            actionLaporan.innerHTML = `
                <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" 
                   class="btn btn-sm btn-success">
                    <i class="fas fa-download"></i> Download Laporan
                </a>
            `;
        } else if (data.status === 'Selesai' && !data.report) {
            statusLaporan.innerHTML = '<i class="fas fa-exclamation-circle text-warning"></i> Laporan sedang diproses';
            actionLaporan.innerHTML = '';
            if (laporanDate) laporanDate.innerHTML = '';
        } else {
            statusLaporan.innerHTML = '<i class="fas fa-hourglass-half text-secondary"></i> Laporan akan tersedia setelah pengujian selesai';
            actionLaporan.innerHTML = '';
            if (laporanDate) laporanDate.innerHTML = '';
        }
    }

    function renderTimeline(data) {
        const timelineEl = document.getElementById('timeline');
        if (!timelineEl) return;
        
        const statuses = [
            { status: 'Menunggu Verifikasi', date: data.created_at, icon: 'fa-clock' },
            { status: 'Pengecekan Sampel', date: data.tgl_pengecekan, icon: 'fa-search' },
            { status: 'Menunggu Pembayaran', date: data.tgl_tagihan, icon: 'fa-credit-card' },
            { status: 'Lunas', date: data.payment?.updated_at, icon: 'fa-check-circle' },
            { status: 'Sedang Diuji', date: data.tgl_pengujian, icon: 'fa-flask' },
            { status: 'Selesai', date: data.report?.created_at, icon: 'fa-check-double' }
        ];
        
        let html = '<div class="timeline-vertical">';
        
        statuses.forEach((item, index) => {
            const isActive = item.date && new Date(item.date) <= new Date();
            const isCurrent = item.status === data.status;
            
            html += `
                <div class="timeline-item ${isCurrent ? 'current' : ''} ${isActive ? 'active' : ''}">
                    <div class="timeline-icon ${isActive ? 'bg-primary' : 'bg-secondary'}">
                        <i class="fas ${item.icon}"></i>
                    </div>
                    <div class="timeline-content">
                        <h6>${item.status}</h6>
                        <p class="text-muted small">${item.date ? formatDate(item.date) : '-'}</p>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        timelineEl.innerHTML = html;
    }

    // 🔥 FUNGSI DOWNLOAD FILE DENGAN TOKEN - SEMUA FILE DI-DOWNLOAD
    window.downloadFileWithToken = async function(url, token) {
        try {
            console.log('📥 Downloading file:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('📡 Response status:', response.status);
            
            if (response.status === 401) {
                alert('Sesi habis. Silakan login ulang.');
                window.location.href = '/login';
                return;
            }
            
            if (response.status === 404) {
                alert('File tidak ditemukan di server');
                return;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const blob = await response.blob();
            console.log('📦 Blob size:', blob.size, 'bytes');
            
            if (blob.size === 0) {
                alert('File kosong');
                return;
            }
            
            // 🔥 SEMUA FILE DI-DOWNLOAD, TIDAK ADA YANG DITAMPILKAN
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            
            // Ambil nama file dari URL
            const urlParts = url.split('/');
            const filename = urlParts[urlParts.length - 1].split('?')[0];
            link.download = filename;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Bersihkan blob URL
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
            
            console.log('✅ Download selesai:', filename);
            
        } catch (error) {
            console.error('❌ Error download:', error);
            alert('Gagal download file: ' + error.message);
        }
    };

    // Helper function
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
                year: 'numeric'
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

    function showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('contentState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }
})();