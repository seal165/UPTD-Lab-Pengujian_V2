// public/js/user/history-detail-handler.js

(function() {
    'use strict';

    // State untuk data submission
    let currentSubmissionData = null;
    let hasKuisioner = false;

    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ History Detail Handler initialized');
        
        const token = document.getElementById('currentUserToken')?.value || getTokenFromCookie() || getTokenFromMeta();
        console.log('🔑 Token:', token ? 'ADA' : 'TIDAK ADA');
        
        if (!token) {
            console.error('❌ Token tidak ditemukan!');
            showError('Token tidak ditemukan. Silakan login ulang.');
            return;
        }
        
        window.userToken = token;
        
        const submissionId = document.getElementById('currentSubmissionId')?.value || 
                            window.location.pathname.split('/').pop();
        
        console.log('🔍 Submission ID:', submissionId);
        
        if (!submissionId || submissionId === 'detail' || submissionId === 'history') {
            showError('ID pengajuan tidak valid');
            return;
        }
        
        loadSubmissionDetail(submissionId, token);
    });

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

    function getTokenFromMeta() {
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        return metaToken ? metaToken.getAttribute('content') : null;
    }

    // Fungsi untuk membersihkan nama file dari path database
    function normalizeFilename(filename) {
        if (!filename) return '';
        // Ambil hanya nama filenya saja (misal: "laporan/abc.pdf" jadi "abc.pdf")
        return filename.split('/').pop().split('\\').pop().trim();
    }

    // Fungsi membuat URL yang akan di-fetch
    function buildProtectedFileUrl(fileType, filename, token) {
        const safeName = normalizeFilename(filename);
        if (!safeName) return '#';
        
        // Format: /api/file/tipe/nama_file
        // Contoh: /api/file/surat/surat-permohonan-123.pdf
        const baseUrl = 'http://localhost:5000/api/file';
        return `${baseUrl}/${fileType}/${encodeURIComponent(safeName)}`;
    }

    async function loadSubmissionDetail(id, token) {
        console.log('🔄 Loading detail for ID:', id);
        
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('contentState').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';
        
        try {
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
                currentSubmissionData = result.data;
                
                // 🔥 CEK APAKAH KUIISIONER SUDAH ADA
                if (result.data.kuisioner) {
                    hasKuisioner = true;
                } else {
                    hasKuisioner = false;
                }
                
                document.getElementById('loadingState').style.display = 'none';
                document.getElementById('contentState').style.display = 'block';
                
                fillData(result.data, token);
            } else {
                throw new Error(result.message || 'Gagal memuat数据');
            }

        } catch (error) {
            console.error('❌ Error:', error);
            showError(error.message || 'Terjadi kesalahan');
        }
    }

    function fillData(data, token) {
        console.log('📝 Mengisi data:', data);
        
        const formattedId = String(data.id).padStart(6, '0');
        setText('det-id', data.no_permohonan ? `#${data.no_permohonan}` : `#${formattedId}`);
        setText('det-status', data.status || '-');
        setText('det-date', formatDate(data.created_at));
        
        // Perusahaan
        setText('det-company', data.nama_instansi || '-');
        setText('det-pic', data.nama_pemohon || '-');
        setText('det-address', data.alamat_pemohon || '-');
        
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
            setText('det-sample-type', sample.jenis_sample || '-');
            setText('det-method', sample.method_at_time || sample.method || '-');
            setText('det-service-name', sample.nama_identitas_sample || '-');
            
            const qty = sample.jumlah_sample_angka || 1;
            setText('det-qty', qty);
            
            const unitPrice = parseFloat(sample.price_at_time) || 0;
            setText('det-unit-price', formatRupiah(unitPrice));
            
            const subtotal = qty * unitPrice;
            setText('det-subtotal', formatRupiah(subtotal));
            
            const totalTagihan = data.payment?.total_tagihan || subtotal;
            setText('det-total', formatRupiah(totalTagihan));
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
            
            document.getElementById('det-payment-status').innerHTML = `<span class="badge ${statusClass}">${paymentStatus}</span>`;
            setText('det-payment-date', data.payment.bukti_pembayaran_1_uploaded_at ? formatDate(data.payment.bukti_pembayaran_1_uploaded_at) : '-');
            
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
        
        // 🔥 LAPORAN & KUIISIONER (Syarat: Laporan sudah diupload + Kuisioner belum diisi)
        renderLaporanWithKuisioner(data, token);
        
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
        const section = document.getElementById('payment-proof-section');
        const list = document.getElementById('payment-proof-list');
        
        if (!section || !list) return;
        
        let hasProofs = false;
        let html = '';
        
        if (payment.bukti_pembayaran_1) {
            hasProofs = true;
            const fileUrl = buildProtectedFileUrl('payment', payment.bukti_pembayaran_1, token);
            html += `
                <div class="document-item d-flex align-items-center p-2 mb-2 border rounded">
                    <div class="doc-icon me-2">
                        <i class="fas fa-file-pdf text-danger"></i>
                    </div>
                    <div class="doc-info flex-grow-1">
                        <small>Bukti Pembayaran 1</small>
                        ${payment.bukti_pembayaran_notes ? `<small class="text-muted d-block">Catatan: ${payment.bukti_pembayaran_notes}</small>` : ''}
                    </div>
                    <div class="doc-action">
                        <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-primary me-1"><i class="fas fa-eye"></i> Buka</a>
                        <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-primary"><i class="fas fa-download"></i> Download</a>
                    </div>
                </div>
            `;
        }
        
        if (payment.bukti_pembayaran_2) {
            hasProofs = true;
            const fileUrl = buildProtectedFileUrl('payment', payment.bukti_pembayaran_2, token);
            html += `
                <div class="document-item d-flex align-items-center p-2 mb-2 border rounded">
                    <div class="doc-icon me-2">
                        <i class="fas fa-file-pdf text-danger"></i>
                    </div>
                    <div class="doc-info flex-grow-1">
                        <small>Bukti Pembayaran 2</small>
                    </div>
                    <div class="doc-action">
                        <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-primary me-1"><i class="fas fa-eye"></i> Buka</a>
                        <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-primary"><i class="fas fa-download"></i> Download</a>
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
        // Surat Permohonan
        if (data.file_surat_permohonan) {
            setText('status-doc-permohonan', '✅ Terupload');
            const fileUrl = buildProtectedFileUrl('surat', data.file_surat_permohonan, token);
            document.getElementById('action-doc-permohonan').innerHTML = `
                <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-primary me-1"><i class="fas fa-eye"></i> Buka</a>
                <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-primary"><i class="fas fa-download"></i> Download</a>
            `;
        } else {
            setText('status-doc-permohonan', '❌ Belum diupload');
            document.getElementById('action-doc-permohonan').innerHTML = '';
        }
        
        // Scan KTP
        if (data.file_ktp) {
            setText('status-doc-ktp', '✅ Terupload');
            const fileUrl = buildProtectedFileUrl('ktp', data.file_ktp, token);
            document.getElementById('action-doc-ktp').innerHTML = `
                <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-primary me-1"><i class="fas fa-eye"></i> Buka</a>
                <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-primary"><i class="fas fa-download"></i> Download</a>
            `;
        } else {
            setText('status-doc-ktp', '❌ Belum diupload');
            document.getElementById('action-doc-ktp').innerHTML = '';
        }
    }

    // 🔥 FUNGSI UTAMA UNTUK LAPORAN + KUIISIONER
    function renderLaporanWithKuisioner(data, token) {
        const statusLaporan = document.getElementById('status-laporan');
        const actionLaporan = document.getElementById('action-laporan');
        const laporanDate = document.getElementById('laporan-date');
        const kuisionerSection = document.getElementById('kuisioner-section');
        
        if (!statusLaporan || !actionLaporan) return;
        
        // 🔥 CEK APAKAH LAPORAN SUDAH ADA
        const hasReport = data.report && data.report.file_laporan;
        
        if (hasReport) {
            // Laporan sudah diupload oleh admin
            const fileUrl = buildProtectedFileUrl('laporan', data.report.file_laporan, token);
            
            statusLaporan.innerHTML = '<i class="fas fa-check-circle text-success"></i> Laporan siap diunduh';
            if (laporanDate) {
                laporanDate.innerHTML = `Diterbitkan: ${formatDate(data.report.tanggal_selesai || data.report.created_at)}`;
            }
            
            // 🔥 TAMPILKAN 2 TOMBOL: Preview dan Download
            actionLaporan.innerHTML = `
                <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-primary me-1">
                    <i class="fas fa-eye"></i> Preview
                </a>
                <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-success">
                    <i class="fas fa-download"></i> Download
                </a>
            `;
            
            // 🔥 CEK APAKAH KUIISIONER SUDAH DIISI
            if (!hasKuisioner) {
                // Belum isi kuisioner - tampilkan tombol isi kuisioner
                kuisionerSection.style.display = 'block';
                
                // Tambahkan info bahwa laporan bisa didownload setelah isi kuisioner
                const existingInfo = document.querySelector('#kuisioner-section .alert-info');
                if (!existingInfo) {
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'alert alert-info mt-3 mb-0';
                    infoDiv.innerHTML = '<i class="fas fa-info-circle me-2"></i> Laporan siap diunduh. Silakan isi kuisioner terlebih dahulu.';
                    document.querySelector('#kuisioner-section .card-body-custom').appendChild(infoDiv);
                }
                
                // Sembunyikan sementara tombol download (tapi tetap tampil preview?)
                // Atau biarkan preview tetap bisa dilihat, tapi download baru bisa setelah isi kuisioner
                // Sesuai permintaan: tombol download dan preview baru muncul setelah isi kuisioner
                // Jadi kita sembunyikan dulu
                actionLaporan.innerHTML = `
                    <span class="text-muted small">Laporan tersedia setelah mengisi kuisioner</span>
                `;
            } else {
                // Sudah isi kuisioner - tampilkan tombol download dan preview
                kuisionerSection.style.display = 'none';
                actionLaporan.innerHTML = `
                    <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-primary me-1">
                        <i class="fas fa-eye"></i> Preview
                    </a>
                    <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-success">
                        <i class="fas fa-download"></i> Download
                    </a>
                `;
            }
            
        } else {
            // Belum ada laporan
            statusLaporan.innerHTML = '<i class="fas fa-hourglass-half text-secondary"></i> Laporan akan tersedia setelah pengujian selesai';
            actionLaporan.innerHTML = '';
            if (laporanDate) laporanDate.innerHTML = '';
            kuisionerSection.style.display = 'none';
        }
    }

    // 🔥 FUNGSI BUKA KUIISIONER
    window.openKuisioner = function() {
        const submissionId = document.getElementById('currentSubmissionId')?.value;
        if (submissionId) {
            window.location.href = `/kuisioner/${submissionId}`;
        } else {
            alert('ID pengajuan tidak ditemukan');
        }
    };

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

    async function fetchProtectedFileBlob(url, token) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('📡 Fetch File Status:', response.status);

            // 1. Cek jika Unauthorized
            if (response.status === 401) {
                alert('Sesi habis. Silakan login ulang.');
                window.location.href = '/login';
                return null;
            }

            // 2. Cek jika file tidak ada (Ini biasanya penyebab 9 bytes)
            if (!response.ok) {
                // Coba baca pesan errornya
                const errorData = await response.text();
                console.error('❌ Server Error Response:', errorData);
                
                if (response.status === 404) {
                    alert('File tidak ditemukan di server. Pastikan folder uploads sudah benar.');
                } else {
                    alert('Gagal mengambil file dari server (Error ' + response.status + ')');
                }
                return null;
            }

            // 3. Ambil Blob
            const blob = await response.blob();
            console.log('📦 Received Blob size:', blob.size, 'bytes');

            // 🔥 Validasi "9 Bytes" atau file rusak
            // Jika size sangat kecil, kemungkinan besar isinya teks error, bukan PDF/Gambar
            if (blob.size < 50) { 
                console.warn('⚠️ Ukuran file sangat kecil, kemungkinan corrupt.');
                // Opsional: Baca isi blob untuk debug
                const text = await blob.text();
                console.log('📄 Isi blob kecil tersebut:', text);
                
                if (text.includes('not found') || text.includes('error')) {
                    alert('File di server rusak atau tidak terbaca.');
                    return null;
                }
            }

            return blob;
        } catch (error) {
            console.error('❌ Network Error saat fetch file:', error);
            alert('Terjadi kesalahan jaringan saat mengambil file.');
            return null;
        }
    }

    // Fungsi Preview (Buka Tab Baru Tanpa Diblokir Browser)
    window.openFileWithToken = async function(url, token) {
        const newTab = window.open('', '_blank');
        if (!newTab) return alert('Izinkan popup browser!');
        
        newTab.document.write('<html><body style="background:#333;color:white;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif;">Memproses dokumen...</body></html>');

        try {
            // fetchProtectedFileBlob adalah fungsi yang Jey buat untuk fetch dengan Header Auth
            const blob = await fetchProtectedFileBlob(url, token);
            if (!blob) {
                newTab.close();
                return;
            }
            const blobUrl = window.URL.createObjectURL(blob);
            newTab.location.href = blobUrl;
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
        } catch (e) {
            newTab.close();
            alert('Gagal memuat file.');
        }
    };

    window.downloadFileWithToken = async function(url, token) {
        try {
            console.log('📥 Downloading file:', url);
            const blob = await fetchProtectedFileBlob(url, token);
            if (!blob) return;
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            const urlParts = url.split('/');
            const filename = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
            console.log('✅ Download selesai:', filename);
        } catch (error) {
            console.error('❌ Error download:', error);
            alert('Gagal download file: ' + error.message);
        }
    };

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        } catch {
            return '-';
        }
    }

    function formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    }

    function showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('contentState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }
})();