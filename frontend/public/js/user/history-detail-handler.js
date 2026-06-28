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
        
        // 🔥 PERBAIKI STATUS BADGE (kanan atas)
        const statusBadge = document.getElementById('det-status');
        if (statusBadge) {
            const status = data.status || 'Menunggu Verifikasi';
            const statusClass = getStatusBadgeClass(status);
            statusBadge.className = `badge px-3 py-2 rounded-3 d-flex align-items-center shadow-sm ${statusClass}`;
            statusBadge.innerHTML = `<i class="fas ${getStatusIcon(status)} me-1"></i> ${status}`;
        }
        
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

        // 🔥 INFORMASI PEMBAYARAN (dengan status yang jelas)
        if (data.payment) {
            setText('det-invoice', data.payment.no_invoice || '-');
            setText('det-bill', formatRupiah(data.payment.total_tagihan || 0));
            setText('det-paid', formatRupiah(data.payment.jumlah_dibayar || 0));
            
            const sisa = (data.payment.total_tagihan || 0) - (data.payment.jumlah_dibayar || 0);
            setText('det-remaining', formatRupiah(sisa));
            
            // 🔥 STATUS PEMBAYARAN (dengan badge yang jelas)
            const paymentStatus = data.payment.status_pembayaran || 'Belum Bayar';
            const statusEl = document.getElementById('det-payment-status');
            if (statusEl) {
                const paymentClass = getPaymentStatusClass(paymentStatus);
                statusEl.innerHTML = `<span class="badge ${paymentClass}">${paymentStatus}</span>`;
            }
            
            // 🔥 TANGGAL PEMBAYARAN (ambil yang terbaru dari bukti 1 atau 2)
            const date1 = data.payment.bukti_pembayaran_1_uploaded_at;
            const date2 = data.payment.bukti_pembayaran_2_uploaded_at;
            let latestDate = null;
            if (date1 && date2) {
                latestDate = new Date(date1) > new Date(date2) ? date1 : date2;
            } else if (date1) {
                latestDate = date1;
            } else if (date2) {
                latestDate = date2;
            }

            if (!latestDate && paymentStatus === 'Lunas') {
                latestDate = data.payment.updated_at || data.payment.created_at;
            }

            setText('det-payment-date', latestDate ? formatDate(latestDate) : '-');
            
            renderPaymentProofs(data.payment, token);
        } else {
            setText('det-invoice', '-');
            setText('det-bill', formatRupiah(0));
            setText('det-paid', formatRupiah(0));
            setText('det-remaining', formatRupiah(0));
            document.getElementById('det-payment-status').innerHTML = '-';
            setText('det-payment-date', '-');
        }
        
        // Dokumen (termasuk lampiran tambahan)
        renderDocuments(data, token);
        
        // Laporan & Kuisioner
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
                <div class="document-card p-3 border rounded mb-3">
                    <div class="d-flex flex-column flex-xl-row gap-3 align-items-xl-center">
                        <div class="d-flex align-items-center flex-grow-1">
                            <div class="bg-light rounded text-success d-flex align-items-center justify-content-center me-3 flex-shrink-0" style="width: 44px; height: 44px; border: 1px solid #dee2e6;">
                                <i class="fas fa-file-invoice-dollar fs-4"></i>
                            </div>
                            <div>
                                <span class="fw-bold d-block text-dark">Bukti Pembayaran 1</span>
                                ${payment.bukti_pembayaran_notes ? `<small class="text-muted d-block mt-1" style="line-height: 1.4;">${payment.bukti_pembayaran_notes.replace(/\n/g, '<br>')}</small>` : ''}
                            </div>
                        </div>
                        <div class="d-flex gap-2 flex-shrink-0 ms-xl-auto">
                            <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-success">Buka</a>
                            <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-success">Download</a>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (payment.bukti_pembayaran_2) {
            hasProofs = true;
            const fileUrl = buildProtectedFileUrl('payment', payment.bukti_pembayaran_2, token);
            html += `
                <div class="document-card p-3 border rounded mb-3">
                    <div class="d-flex flex-column flex-xl-row gap-3 align-items-xl-center">
                        <div class="d-flex align-items-center flex-grow-1">
                            <div class="bg-light rounded text-success d-flex align-items-center justify-content-center me-3 flex-shrink-0" style="width: 44px; height: 44px; border: 1px solid #dee2e6;">
                                <i class="fas fa-file-invoice-dollar fs-4"></i>
                            </div>
                            <div>
                                <span class="fw-bold d-block text-dark">Bukti Pembayaran 2</span>
                            </div>
                        </div>
                        <div class="d-flex gap-2 flex-shrink-0 ms-xl-auto">
                            <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-success">Buka</a>
                            <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-success">Download</a>
                        </div>
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
                <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-primary me-1">Buka</a>
                <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-primary">Download</a>
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
                <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-primary me-1">Buka</a>
                <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-primary">Download</a>
            `;
        } else {
            setText('status-doc-ktp', '❌ Belum diupload');
            document.getElementById('action-doc-ktp').innerHTML = '';
        }

        // ====================================================================
        // 🔥 LAMPIRAN PENDUKUNG – PAKAI dokumen_tambahan
        // ====================================================================
        const docList = document.querySelector('.document-list');
        if (!docList) return;

        // Hapus semua elemen lampiran yang sudah ada
        const existingLampirans = docList.querySelectorAll('.document-optional, #lampiran-doc-wrapper');
        existingLampirans.forEach(el => el.remove());

        // Buat elemen lampiran baru
        const lampiranSection = document.createElement('div');
        lampiranSection.className = 'document-card p-3 border rounded mb-3 document-optional';
        lampiranSection.style.borderLeft = '4px solid #8b5cf6';

        let lampiranStatus = '';
        let lampiranActions = '';

        // 🔥 GUNAKAN data.dokumen_tambahan (bukan file_lampiran)
        if (data.dokumen_tambahan) {
            const fileName = normalizeFilename(data.dokumen_tambahan);
            const fileUrl = buildProtectedFileUrl('lampiran', data.dokumen_tambahan, token);
            lampiranStatus = `✅ Terupload: ${fileName}`;
            lampiranActions = `
                <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-primary me-1">Buka</a>
                <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-primary">Download</a>
            `;
        } else {
            lampiranStatus = 'Belum ada lampiran pendukung';
            lampiranActions = '';
        }

        lampiranSection.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="bg-light rounded text-purple d-flex align-items-center justify-content-center me-3" style="width: 44px; height: 44px; border: 1px solid #dee2e6; color: #8b5cf6;">
                    <i class="fas fa-paperclip fs-4"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-bold" style="color: #8b5cf6;">Lampiran Pendukung</span>
                        <span class="badge" style="background-color: #8b5cf6; color: white; font-size: 0.7rem;">Opsional</span>
                    </div>
                    <small class="text-muted d-block mt-1" id="status-doc-lampiran">${lampiranStatus}</small>
                </div>
                <div id="action-doc-lampiran" class="ms-3">${lampiranActions}</div>
            </div>
        `;

        // Sisipkan setelah KTP
        const ktpCard = docList.querySelector('.document-card:has(#status-doc-ktp)');
        if (ktpCard) {
            ktpCard.insertAdjacentElement('afterend', lampiranSection);
        } else {
            docList.appendChild(lampiranSection);
        }
    }

    // 🔥 FUNGSI UTAMA UNTUK LAPORAN + KUIISIONER
    function renderLaporanWithKuisioner(data, token) {
        const statusLaporan = document.getElementById('status-laporan');
        const actionLaporan = document.getElementById('action-laporan');
        const laporanDate = document.getElementById('laporan-date');
        const kuisionerSection = document.getElementById('kuisioner-section');
        
        if (!statusLaporan || !actionLaporan) return;
        
        const hasReport = data.report && data.report.file_laporan;
        
        if (hasReport) {
            const fileUrl = buildProtectedFileUrl('laporan', data.report.file_laporan, token);
            
            statusLaporan.innerHTML = '<i class="fas fa-check-circle text-success"></i> Laporan siap diunduh';
            if (laporanDate) {
                laporanDate.innerHTML = `Diterbitkan: ${formatDate(data.report.tanggal_selesai || data.report.created_at)}`;
            }
            
            if (!hasKuisioner) {
                // Belum isi kuisioner
                if (kuisionerSection) {
                    kuisionerSection.style.display = 'block';
                    // Cari alert info yang sudah ada, jika tidak ada buat baru
                    let existingInfo = kuisionerSection.querySelector('.alert-info');
                    if (!existingInfo) {
                        const infoDiv = document.createElement('div');
                        infoDiv.className = 'alert alert-info mt-3';
                        infoDiv.innerHTML = '<i class="fas fa-info-circle me-2"></i> Laporan siap diunduh. Silakan isi kuisioner terlebih dahulu.';
                        // Masukkan setelah border-bottom
                        const borderDiv = kuisionerSection.querySelector('.border-bottom');
                        if (borderDiv && borderDiv.nextSibling) {
                            borderDiv.parentNode.insertBefore(infoDiv, borderDiv.nextSibling);
                        } else {
                            kuisionerSection.appendChild(infoDiv);
                        }
                    }
                }
                actionLaporan.innerHTML = `
                    <span class="text-muted small">Laporan tersedia setelah mengisi kuisioner</span>
                `;
            } else {
                // Sudah isi kuisioner
                if (kuisionerSection) {
                    kuisionerSection.style.display = 'block';
                    // Kosongkan isi section selain border dan judul
                    const existingContent = kuisionerSection.querySelector('.kuisioner-content');
                    if (existingContent) {
                        existingContent.remove();
                    }
                    // Buat container baru
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'kuisioner-content text-center p-3';
                    contentDiv.innerHTML = `
                        <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                        <h6>Terima Kasih!</h6>
                        <p class="text-muted small mb-3">Anda telah mengisi kuisioner kepuasan untuk layanan ini.</p>
                        <button class="btn btn-outline-primary" onclick="window.downloadKuisionerPDF()">
                            <i class="fas fa-file-pdf me-1"></i> Download Salinan Kuisioner
                        </button>
                    `;
                    // Hapus alert info jika ada
                    const existingInfo = kuisionerSection.querySelector('.alert-info');
                    if (existingInfo) existingInfo.remove();
                    kuisionerSection.appendChild(contentDiv);
                }
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
            statusLaporan.innerHTML = '<i class="fas fa-hourglass-half text-secondary"></i> Laporan akan tersedia setelah pengujian selesai';
            actionLaporan.innerHTML = '';
            if (laporanDate) laporanDate.innerHTML = '';
            if (kuisionerSection) {
                kuisionerSection.style.display = 'none';
            }
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

    // 🔥 FUNGSI DOWNLOAD KUIISIONER PDF
    window.downloadKuisionerPDF = async function() {
        if (!currentSubmissionData || !currentSubmissionData.kuisioner) {
            alert('Data kuisioner tidak ditemukan');
            return;
        }
        
        try {
            const token = window.userToken;
            const API_URL = 'http://localhost:5000/api';
            const kuisionerId = currentSubmissionData.kuisioner.id;
            
            // Tampilkan state loading (bisa pakai sweetalert kalau ada, kita pakai log/alert biasa)
            console.log('Mengunduh data kuisioner...');
            
            // Fetch detail kuisioner
            const resKuisioner = await fetch(`${API_URL}/kuisioner/${kuisionerId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataKuisioner = await resKuisioner.json();
            
            if (!dataKuisioner.success) throw new Error('Gagal memuat data kuisioner');
            
            const detail = dataKuisioner.data;
            const jawaban = detail.jawaban || {};
            const pertanyaan = detail.pertanyaan || [];
            
            // Buat PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFontSize(18);
            doc.text('Detail Kuisioner Kepuasan', 105, 15, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Informasi Pemohon', 14, 25);
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.text(`Nama: ${detail.nama_pemohon || '-'}`, 14, 32);
            doc.text(`Instansi: ${detail.nama_instansi || '-'}`, 14, 38);
            doc.text(`Telepon: ${detail.nomor_telepon || '-'}`, 14, 44);
            doc.text(`Tanggal: ${formatDate(detail.created_at)}`, 14, 50);
            
            doc.setFont(undefined, 'bold');
            doc.text('Hasil Penilaian', 14, 62);
            
            const tableData = [];
            for (let i = 1; i <= 10; i++) {
                const nilai = detail[`skor_${i}`] !== undefined ? detail[`skor_${i}`] : (jawaban[i] !== undefined ? jawaban[i] : '-');
                const label = pertanyaan[i-1] || ('Kriteria ' + i);
                tableData.push([i, label, nilai]);
            }
            
            doc.autoTable({
                startY: 66,
                head: [['No', 'Kriteria', 'Nilai']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [67, 97, 238] },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 120 },
                    2: { cellWidth: 30 }
                }
            });
            
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFont(undefined, 'bold');
            doc.text('Saran / Komentar', 14, finalY);
            doc.setFont(undefined, 'normal');
            
            const saranLines = doc.splitTextToSize(detail.saran || '-', 180);
            doc.text(saranLines, 14, finalY + 6);
            
            const filename = 'kuisioner_' + (detail.nama_pemohon || 'pemohon') + '_' + new Date().getTime() + '.pdf';
            doc.save(filename);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Gagal mendownload PDF: ' + error.message);
        }
    };

    // 🔥 UPDATE FUNGSI renderTimeline DENGAN 9 STATUS
    function renderTimeline(data) {
        const timelineEl = document.getElementById('timeline');
        if (!timelineEl) return;
        
        const currentStatus = data.status || 'Menunggu Verifikasi';
        
        // Urutan 9 status
        const statuses = [
            { key: 'Menunggu Verifikasi', label: 'Pengajuan Diterima', icon: 'fa-file' },
            { key: 'Pengecekan Sampel', label: 'Pengecekan Sampel', icon: 'fa-search' },
            { key: 'Belum Bayar', label: 'Menunggu Pembayaran', icon: 'fa-credit-card' },
            { key: 'Menunggu SKRD Upload', label: 'Menunggu SKRD', icon: 'fa-file-invoice' },
            { key: 'Belum Lunas', label: 'Pembayaran Sebagian', icon: 'fa-hourglass-half' },
            { key: 'Lunas', label: 'Pembayaran Lunas', icon: 'fa-check-circle' },
            { key: 'Sedang Diuji', label: 'Proses Pengujian', icon: 'fa-flask' },
            { key: 'Selesai', label: 'Pengujian Selesai', icon: 'fa-check-double' },
            { key: 'Dibatalkan', label: 'Dibatalkan', icon: 'fa-ban' }
        ];

        let currentIndex = statuses.findIndex(s => s.key === currentStatus);
        if (currentIndex === -1) currentIndex = 0;

        const timelineHtml = statuses.map((status, index) => {
            let statusClass = 'pending';
            let statusIcon = 'far fa-circle';
            let statusText = '';
            
            if (currentStatus === 'Selesai') {
                if (index <= currentIndex) {
                    statusClass = 'completed';
                    statusIcon = 'fas fa-check-circle';
                    statusText = '<small class="text-success d-block mt-1">Selesai</small>';
                }
            } else if (currentStatus === 'Dibatalkan') {
                if (index === currentIndex) {
                    statusClass = 'cancelled';
                    statusIcon = 'fas fa-ban';
                    statusText = '<small class="text-danger d-block mt-1">Dibatalkan</small>';
                } else if (index < currentIndex) {
                    statusClass = 'completed';
                    statusIcon = 'fas fa-check-circle';
                    statusText = '<small class="text-success d-block mt-1">Selesai</small>';
                }
            } else {
                if (index < currentIndex) {
                    statusClass = 'completed';
                    statusIcon = 'fas fa-check-circle';
                    statusText = '<small class="text-success d-block mt-1">Selesai</small>';
                } else if (index === currentIndex) {
                    statusClass = 'current';
                    statusIcon = 'fas fa-spinner fa-pulse';
                    statusText = '<small class="text-primary d-block mt-1">Sedang dalam proses</small>';
                }
            }

            const borderStyle = statusClass === 'completed' ? '#28a745' : statusClass === 'current' ? '#0d6efd' : statusClass === 'cancelled' ? '#dc3545' : '#e9ecef';
            const iconColor = statusClass === 'current' ? 'text-primary' : statusClass === 'completed' ? 'text-success' : statusClass === 'cancelled' ? 'text-danger' : 'text-muted';
            const titleColor = statusClass === 'current' ? 'text-primary' : statusClass === 'cancelled' ? 'text-danger' : '';
            
            return `
                <div class="timeline-item ${statusClass} mb-3 ps-3" style="border-left: 2px solid ${borderStyle}; position: relative;">
                    <div class="d-flex align-items-center" style="position: absolute; left: -11px; top: 0; background: white;">
                        <i class="fas ${statusIcon} ${iconColor}" style="font-size: 1.2rem; background: white;"></i>
                    </div>
                    <div class="ms-3">
                        <span class="fw-bold ${titleColor}">${status.label}</span>
                        ${statusText}
                    </div>
                </div>
            `;
        }).join('');

        timelineEl.innerHTML = timelineHtml;
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

    // ==================== HELPER STATUS BADGE ====================
    function getStatusBadgeClass(status) {
        const classes = {
            'Menunggu Verifikasi': 'bg-warning text-dark',
            'Pengecekan Sampel': 'bg-info text-dark',
            'Belum Bayar': 'bg-secondary text-white',
            'Menunggu SKRD Upload': 'bg-warning text-dark',
            'Belum Lunas': 'bg-danger text-white',
            'Lunas': 'bg-success text-white',
            'Sedang Diuji': 'bg-primary text-white',
            'Selesai': 'bg-success text-white',
            'Dibatalkan': 'bg-secondary text-white'
        };
        return classes[status] || 'bg-secondary text-white';
    }

    function getStatusIcon(status) {
        const icons = {
            'Menunggu Verifikasi': 'fa-clock',
            'Pengecekan Sampel': 'fa-search',
            'Belum Bayar': 'fa-credit-card',
            'Menunggu SKRD Upload': 'fa-file-invoice',
            'Belum Lunas': 'fa-hourglass-half',
            'Lunas': 'fa-check-circle',
            'Sedang Diuji': 'fa-flask',
            'Selesai': 'fa-check-double',
            'Dibatalkan': 'fa-ban'
        };
        return icons[status] || 'fa-circle';
    }

    function getPaymentStatusClass(status) {
        const classes = {
            'Lunas': 'bg-success text-white',
            'Belum Lunas': 'badge-soft-danger',
            'Belum Bayar': 'badge-soft-danger',
            'Menunggu SKRD Upload': 'badge-soft-warning',
            'Menunggu Verifikasi': 'badge-soft-warning',
            'Pengecekan Sampel': 'badge-soft-info',
            'Sedang Diuji': 'badge-soft-primary',
            'Selesai': 'badge-soft-success',
            'Dibatalkan': 'badge-soft-secondary'
        };
        return classes[status] || 'badge-soft-secondary';
    }

    function showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('contentState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }
})();