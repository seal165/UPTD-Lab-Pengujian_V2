// frontend/public/js/admin/detail-skrd.js

(function() {
    'use strict';

    // ==================== KONFIGURASI ====================
    const API_BASE_URL = 'http://localhost:5000/api';
    
    // Ambil ID dari URL
    const pathParts = window.location.pathname.split('/');
    const invoiceId = pathParts[pathParts.length - 1];

    // State
    let invoiceData = null;
    let submissionId = null;

    // ==================== CEK TOKEN ====================
    function getToken() {
        return localStorage.getItem('token');
    }

    if (!getToken()) {
        window.location.href = '/admin/login';
        return;
    }

    // ==================== LOAD DATA ====================
    async function loadInvoiceDetail() {
        showLoading(true);
        
        console.log('📡 Fetching detail untuk ID:', invoiceId);
        
        const timeoutId = setTimeout(() => {
            showLoading(false);
            showAlert('Loading terlalu lama, silakan coba lagi', 'warning');
        }, 8000);
        
        try {
            console.log('🔗 URL:', `${API_BASE_URL}/skrd/${invoiceId}`);
            
            const response = await fetch(`${API_BASE_URL}/skrd/${invoiceId}`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            console.log('📊 Response status:', response.status);

            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/admin/login';
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('📦 Response:', result);

            if (result.success) {
                invoiceData = result.data;
                submissionId = result.data.submission_id || null;
                updatePage(result.data);
            } else {
                showAlert(result.message || 'Gagal memuat data', 'danger');
                showLoading(false);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('❌ Error detail:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            if (error.message.includes('Failed to fetch')) {
                showAlert('Tidak dapat terhubung ke server. Pastikan backend running di port 5000', 'danger');
            } else {
                showAlert('Gagal terhubung ke server: ' + error.message, 'danger');
            }
            showLoading(false);
        }
    }

    // ==================== CETAK INVOICE ====================
    function printInvoice() {
        if (!invoiceData) {
            showAlert('Data belum tersedia', 'warning');
            return;
        }

        const printWindow = window.open('', '_blank');
        const data = invoiceData;
        const totalAmount = data.total_tagihan || 0;
        
        const today = new Date();
        const day = today.getDate().toString().padStart(2, '0');
        const month = today.toLocaleString('id-ID', { month: 'long' });
        const year = today.getFullYear();
        const formattedDate = `${day} ${month} ${year}`;
        
        const itemsRows = generateInvoiceItems(data);
        
        // Ambil nama pemohon dari database (nama_instansi atau nama_pemohon)
        const namaPemohon = data.nama_instansi || data.nama_pemohon || '....................................';
        const alamat = data.alamat || '....................................';
        const telepon = data.nomor_telepon || '....................................';
        const kodePengujian = data.no_permohonan || '....................................';
        
        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice - ${data.no_invoice || ''}</title>
            <style>
                @page { size: A4; margin: 15mm; }
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #fff; }
                .outer-border { border: 1.5pt solid black; padding: 15px; min-height: 230mm; position: relative; box-sizing: border-box; }
                .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .header-table td { border: 1px solid #777; padding: 5px; vertical-align: middle; }
                .logo-col { width: 15%; text-align: center; }
                .title-col { width: 45%; text-align: center; }
                .meta-col { width: 40%; font-size: 9pt; }
                .logo-img { width: 120px; height: auto; }
                .header-title { font-size: 14pt; font-weight: bold; margin: 0; }
                .header-subtitle { font-size: 11pt; font-weight: bold; margin: 0; }
                .doc-num-section { text-align: center; margin: 15px 0; font-size: 11pt; }
                .info-section { width: 100%; margin-bottom: 20px; font-size: 10.5pt; }
                .info-section table { width: 100%; border-collapse: collapse; }
                .info-section td { padding: 3px 0; vertical-align: top; }
                .label { width: 150px; }
                .separator { width: 20px; text-align: center; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                .items-table th { background-color: #9dbad5; border: 1.5pt solid black; padding: 8px; font-size: 10pt; text-align: center; }
                .items-table td { border: 1px solid black; padding: 8px; font-size: 10pt; }
                .total-box { border: 1.5pt solid black; margin-top: -1px; padding: 8px; text-align: right; font-weight: bold; display: flex; justify-content: flex-end; font-size: 10pt; }
                .total-label { width: 100px; text-align: left; }
                .terbilang-box { border: 1.5pt solid black; margin-top: 15px; padding: 10px; font-style: italic; font-weight: bold; font-size: 10.5pt; }
                .signature-section { margin-top: 30px; width: 100%; display: flex; justify-content: space-between; font-size: 10.5pt; }
                .sig-block { width: 45%; text-align: center; }
                .sig-space { height: 70px; }
                .footer-note { position: absolute; bottom: 20px; left: 20px; font-size: 8.5pt; font-style: italic; }
                @media print { body { padding: 0; } .outer-border { border: 1.5pt solid black; } .items-table th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
        </head>
        <body>
            <div class="outer-border">
                <table class="header-table">
                    <tr>
                        <td rowspan="2" class="logo-col">
                            <img src="/img/logo-banten.png" class="logo-img" alt="Logo">
                        </td>
                        <td class="title-col">
                            <div class="header-title">FORMULIR</div>
                        </td>
                        <td class="meta-col">
                            No. Dokumen : UPTD-PBKBIK/F-11/PO-07<br>
                            Terbitan/Revisi : 2/0
                        </td>
                    </tr>
                    <tr>
                        <td class="title-col">
                            <div class="header-subtitle">SURAT TAGIHAN PEMBAYARAN<br>RETRIBUSI PENGUJIAN</div>
                        </td>
                        <td class="meta-col">
                            Tanggal Revisi : 2 Januari 2023<br>
                            Halaman 1 dari 1
                        </td>
                    </tr>
                </table>

                <!-- NOMOR DIKOSONGKAN UNTUK DIISI TANGAN -->
                <div class="doc-num-section">
                    Nomor : _______________________________
                </div>

                <div class="info-section">
                    <table>
                        <tr>
                            <td class="label">Nama Pemohon</td>
                            <td class="separator">:</td>
                            <td style="width: 35%">${namaPemohon}</td>
                            <td style="width: 15%">Tanggal</td>
                            <td class="separator">:</td>
                            <td>${formattedDate}</td>
                        </tr>
                        <tr>
                            <td class="label">Alamat</td>
                            <td class="separator">:</td>
                            <td>${alamat}</td>
                            <td>Kode Pengujian</td>
                            <td class="separator">:</td>
                            <td>${kodePengujian}</td>
                        </tr>
                        <tr>
                            <td class="label">Nomor Telephone/HP</td>
                            <td class="separator">:</td>
                            <td colspan="4">${telepon}</td>
                        </tr>
                    </table>
                </div>

                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 40px">No.</th>
                            <th>Jenis Pengujian</th>
                            <th style="width: 120px">Jumlah Satuan Sample</th>
                            <th style="width: 100px">Harga Satuan</th>
                            <th style="width: 120px">Jumlah Biaya</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <div class="total-box">
                    <span class="total-label">Total</span>
                    <span>${formatRupiah(totalAmount).replace('Rp', 'Rp ')}</span>
                </div>

                <div class="terbilang-box">
                    Terbilang : ${numberToWords(Math.round(totalAmount))} Rupiah
                </div>

                <div class="signature-section">
                    <div class="sig-block">
                        <br><br>
                        <strong>Bendahara Penerimaan Pembantu</strong>
                        <div class="sig-space"></div>
                        ( ................................................. )
                    </div>
                    <div class="sig-block">
                        Serang, .............................. 20......<br>
                        <strong>Mengetahui,<br>Kepala UPTD,</strong>
                        <div class="sig-space"></div>
                        ( ................................................. )
                    </div>
                </div>

                <div class="footer-note">
                    * Pembayaran di setorkan paling lambat 14 (empat belas) hari setelah surat tagihan ini diterbitkan<br>
                    * Pembayaran di transfer melalui Bank Banten Atas Nama : RKUD Provinsi Banten No. Rekening : 0801202021
                </div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 700);
                };
            <\/script>
        </body>
        </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
    }

    // Helper function untuk generate rows items (untuk print)
    function generateInvoiceItems(data) {
        const items = data.samples || [];
        const totalAmount = data.total_tagihan || 0;
        
        if (items.length === 0) {
            const hargaSatuan = Math.round(totalAmount / 1.11);
            const layanan = data.layanan || 'Pengujian';
            return `
                <tr>
                    <td class="text-center">1</td>
                    <td>${layanan}</td>
                    <td class="text-center">1 sampel</td>
                    <td class="text-right">${formatRupiah(hargaSatuan).replace('Rp', '').trim()}</td>
                    <td class="text-right">${formatRupiah(hargaSatuan).replace('Rp', '').trim()}</td>
                </tr>
            `;
        } else {
            let rows = '';
            items.forEach((item, index) => {
                const description = item.service_name || item.nama_identitas_sample || 'Pengujian';
                const quantity = item.jumlah_sample_angka || 1;
                const satuan = item.jumlah_sample_satuan || 'sampel';
                const price = item.price_at_time || 0;
                const subtotal = price * quantity;
                
                rows += `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td>${description}</td>
                        <td class="text-center">${quantity} ${satuan}</td>
                        <td class="text-right">${formatRupiah(price).replace('Rp', '').trim()}</td>
                        <td class="text-right">${formatRupiah(subtotal).replace('Rp', '').trim()}</td>
                    </tr>
                `;
            });
            return rows;
        }
    }

    // ==================== UPDATE UI ====================
    function updatePage(data) {
        console.log('🔄 Update page dengan data:', data);
        
        try {
            // CEK ELEMEN SEBELUM MENGGUNAKAN
            const elements = {
                invoiceId: document.getElementById('invoiceId'),
                invoiceNumber: document.getElementById('invoiceNumber'),
                statusBadge: document.getElementById('statusBadge'),
                companyName: document.getElementById('companyName'),
                picName: document.getElementById('picName'),
                companyAddress: document.getElementById('companyAddress'),
                companyPhone: document.getElementById('companyPhone'),
                companyEmail: document.getElementById('companyEmail'),
                skrdNumber: document.getElementById('skrdNumber'),
                issueDate: document.getElementById('issueDate'),
                dueDate: document.getElementById('dueDate'),
                totalTagihanDisplay: document.getElementById('totalTagihanDisplay'),
                paidAmountDisplay: document.getElementById('paidAmountDisplay'),
                remainingDisplay: document.getElementById('remainingDisplay'),
                subtotal: document.getElementById('subtotal'),
                ppn: document.getElementById('ppn'),
                totalAmount: document.getElementById('totalAmount'),
                paymentNotesDisplay: document.getElementById('paymentNotesDisplay'),
                createdAt: document.getElementById('createdAt')
            };

            // 1. HEADER
            if (elements.invoiceId) elements.invoiceId.textContent = data.id || '';
            if (elements.invoiceNumber) elements.invoiceNumber.textContent = `#${data.no_invoice || ''}`;
            
            // Update status badge
            if (elements.statusBadge) {
                updateStatusBadge(data.status_pembayaran);
            }
            
            // 2. COMPANY INFO
            if (elements.companyName) elements.companyName.textContent = data.nama_instansi || '-';
            if (elements.picName) elements.picName.textContent = data.nama_pemohon ? `UP: ${data.nama_pemohon}` : '-';
            if (elements.companyAddress) elements.companyAddress.textContent = data.alamat || '-';
            if (elements.companyPhone) elements.companyPhone.textContent = data.nomor_telepon || '-';
            if (elements.companyEmail) elements.companyEmail.textContent = data.email || '-';
            
            // 3. PAYMENT DETAILS
            if (elements.skrdNumber) elements.skrdNumber.textContent = data.no_permohonan || '-';
            if (elements.issueDate) elements.issueDate.textContent = formatDate(data.created_at);
            
            const dueDateText = formatDate(data.due_date) + (isOverdue(data.due_date, data.status_pembayaran) ? ' (Jatuh Tempo)' : '');
            if (elements.dueDate) elements.dueDate.textContent = dueDateText;
            
            // Total dan pembayaran
            const totalAmount = data.total_tagihan || 0;
            const paidAmount = data.jumlah_dibayar || 0;
            const remaining = data.sisa_tagihan || (totalAmount - paidAmount);
            
            if (elements.totalTagihanDisplay) elements.totalTagihanDisplay.textContent = formatRupiah(totalAmount);
            if (elements.paidAmountDisplay) elements.paidAmountDisplay.textContent = formatRupiah(paidAmount);
            if (elements.remainingDisplay) elements.remainingDisplay.textContent = formatRupiah(remaining);
            
            // 4. ITEMS TABLE
            updateItemsTable(data);
            
            // 5. TOTALS
            const subtotal = totalAmount / 1.11;
            const ppn = totalAmount - subtotal;
            
            if (elements.subtotal) elements.subtotal.textContent = formatRupiah(Math.round(subtotal));
            if (elements.ppn) elements.ppn.textContent = formatRupiah(Math.round(ppn));
            if (elements.totalAmount) elements.totalAmount.textContent = formatRupiah(totalAmount);
            
            // 6. NOTES
            if (elements.paymentNotesDisplay) {
                // Gabungkan catatan dari payment dan notes
                let notes = '';
                if (data.bukti_pembayaran_notes) {
                    notes += data.bukti_pembayaran_notes;
                }
                if (data.catatan) {
                    notes += (notes ? '\n\n' : '') + data.catatan;
                }
                elements.paymentNotesDisplay.textContent = notes || '-';
            }
            
            if (elements.createdAt) elements.createdAt.textContent = data.created_at ? formatDateTime(data.created_at) : '-';
            
            // 7. BUKTI PEMBAYARAN
            updatePaymentProof(data);
            
            // 8. SKRD FILE
            updateSkrdFile(data);
            
            // 9. RIWAYAT PEMBAYARAN
            updatePaymentHistory(data);
            
            // 10. ACTION BUTTONS
            updateActionButtons(data.status_pembayaran);
            
            // 11. PRINT VERSION
            updatePrintVersion(data);
            
            // 12. FORM VERIFIKASI - update nilai-nilai
            const totalTagihanInput = document.getElementById('totalTagihan');
            const sudahDibayarInput = document.getElementById('sudahDibayar');
            const sisaTagihanInput = document.getElementById('sisaTagihan');
            const sisaSetelahInput = document.getElementById('sisaSetelah');
            
            if (totalTagihanInput) totalTagihanInput.value = totalAmount.toLocaleString('id-ID');
            if (sudahDibayarInput) sudahDibayarInput.value = paidAmount.toLocaleString('id-ID');
            if (sisaTagihanInput) sisaTagihanInput.value = remaining.toLocaleString('id-ID');
            if (sisaSetelahInput) sisaSetelahInput.value = remaining.toLocaleString('id-ID');
            
            // Update status info
            const statusAfterPayment = document.getElementById('statusAfterPayment');
            if (statusAfterPayment) {
                if (remaining === 0) {
                    statusAfterPayment.innerHTML = '<strong class="text-success">Lunas</strong>';
                } else {
                    statusAfterPayment.innerHTML = '<strong class="text-warning">Belum Lunas</strong>';
                }
            }
            
            showLoading(false);
            
        } catch (error) {
            console.error('❌ Error di updatePage:', error);
            console.error('Error details:', error.message);
            console.error('Data yang menyebabkan error:', data);
            showAlert('Terjadi kesalahan saat menampilkan data: ' + error.message, 'danger');
            showLoading(false);
        }
    }

    function updateStatusBadge(status) {
        const badgeDiv = document.getElementById('statusBadge');
        let badgeHtml = '';
        
        switch(status) {
            case 'Lunas':
                badgeHtml = '<span class="badge bg-success rounded-pill px-3 py-2">LUNAS</span>';
                break;
            case 'Belum Lunas':
                badgeHtml = '<span class="badge bg-warning rounded-pill px-3 py-2">BELUM LUNAS</span>';
                break;
            case 'Belum Bayar':
                badgeHtml = '<span class="badge bg-danger rounded-pill px-3 py-2">BELUM BAYAR</span>';
                break;
            case 'Menunggu SKRD Upload':
                badgeHtml = '<span class="badge bg-info rounded-pill px-3 py-2">CEK BUKTI</span>';
                break;
            default:
                badgeHtml = `<span class="badge bg-secondary rounded-pill px-3 py-2">${status || '-'}</span>`;
        }
        
        badgeDiv.innerHTML = badgeHtml;
    }

    function updateItemsTable(data) {
        const tbody = document.getElementById('itemsTableBody');
        const items = data.samples || [];
        
        if (items.length === 0) {
            const totalAmount = data.total_tagihan || 0;
            const hargaSatuan = totalAmount / 1.11;
            
            tbody.innerHTML = `
                <tr>
                    <td>${data.layanan || 'Pengujian'}</td>
                    <td class="text-center">1</td>
                    <td class="text-end">${formatRupiah(Math.round(hargaSatuan))}</td>
                    <td class="text-end">${formatRupiah(Math.round(hargaSatuan))}</td>
                </tr>
            `;
        } else {
            let rowsHtml = '';
            items.forEach(item => {
                const description = item.service_name || item.nama_identitas_sample || '-';
                const quantity = item.jumlah_sample_angka || 1;
                const satuan = item.jumlah_sample_satuan || 'sampel';
                const price = item.price_at_time || 0;
                const subtotal = price * quantity;
                
                rowsHtml += `
                    <tr>
                        <td>${description} <small class="text-muted">(${satuan})</small></td>
                        <td class="text-center">${quantity}</td>
                        <td class="text-end">${formatRupiah(price)}</td>
                        <td class="text-end">${formatRupiah(subtotal)}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = rowsHtml;
        }
    }

    // 🔥 PERBAIKI FUNGSI updatePaymentProof
    function updatePaymentProof(data) {
        const proofSection = document.getElementById('paymentProofSection');
        const proofStatusBadge = document.getElementById('proofStatusBadge');
        const proofFilename = document.getElementById('proofFilename');
        const proofUploadedAt = document.getElementById('proofUploadedAt');
        const verifyBtn = document.getElementById('verifyBtn');
        const rejectBtn = document.getElementById('rejectBtn');
        
        if (!proofSection) return;
        
        console.log('💳 Data pembayaran:', {
            bukti_pembayaran_1: data.bukti_pembayaran_1,
            bukti_pembayaran_2: data.bukti_pembayaran_2,
            status_pembayaran: data.status_pembayaran
        });
        
        // CEK APAKAH ADA BUKTI PEMBAYARAN
        if (data.bukti_pembayaran_1) {
            proofSection.style.display = 'block';
            
            // Tentukan file URL
            const fileUrl = `http://localhost:5000/uploads/payment/${data.bukti_pembayaran_1}`;
            
            if (proofFilename) {
                // Coba ambil nama file dari data atau gunakan default
                const fileName = data.bukti_pembayaran_1_filename || 
                                data.bukti_pembayaran_1.split('/').pop() || 
                                'Bukti Pembayaran';
                proofFilename.textContent = fileName;
            }
            
            if (proofUploadedAt) {
                const uploadDate = data.bukti_pembayaran_1_uploaded_at ? 
                    formatDateTime(data.bukti_pembayaran_1_uploaded_at) : '-';
                proofUploadedAt.textContent = `Diunggah: ${uploadDate}`;
            }
            
            // Update status badge dan tombol
            if (proofStatusBadge) {
                if (data.status_pembayaran === 'Menunggu SKRD Upload') {
                    proofStatusBadge.className = 'badge bg-warning';
                    proofStatusBadge.textContent = 'Menunggu Verifikasi';
                    if (verifyBtn) verifyBtn.style.display = 'inline-block';
                    if (rejectBtn) rejectBtn.style.display = 'inline-block';
                } else if (data.status_pembayaran === 'Belum Lunas' || data.status_pembayaran === 'Lunas') {
                    proofStatusBadge.className = 'badge bg-success';
                    proofStatusBadge.textContent = 'Terverifikasi';
                    if (verifyBtn) verifyBtn.style.display = 'none';
                    if (rejectBtn) rejectBtn.style.display = 'none';
                }
            }
            
            // Simpan URL untuk fungsi viewProof
            window.currentProofUrl = fileUrl;
            
        } else {
            proofSection.style.display = 'none';
        }
    }

    // 🔥 PERBAIKI FUNGSI updateSkrdFile
    function updateSkrdFile(data) {
        const skrdFileSection = document.getElementById('skrdFileSection');
        const skrdUploadSection = document.getElementById('skrdUploadSection');
        const skrdFilename = document.getElementById('skrdFilename');
        const skrdUploadedAt = document.getElementById('skrdUploadedAt');
        const downloadSkrdBtn = document.getElementById('downloadSkrdBtn');
        
        if (!skrdFileSection || !skrdUploadSection) return;
        
        console.log('📁 Data SKRD:', {
            skrd_file: data.skrd_file,
            skrd_filename: data.skrd_filename,
            skrd_uploaded_at: data.skrd_uploaded_at
        });
        
        // CEK KOLOM DATABASE YANG TERSEDIA
        if (data.skrd_file) {
            // Data dari tabel payments
            const fileUrl = `http://localhost:5000/uploads/skrd/${data.skrd_file}`;
            
            skrdFileSection.style.display = 'block';
            skrdUploadSection.style.display = 'none';
            
            if (skrdFilename) skrdFilename.textContent = data.skrd_filename || data.skrd_file || 'SKRD.pdf';
            if (skrdUploadedAt) {
                const uploadDate = data.skrd_uploaded_at ? formatDateTime(data.skrd_uploaded_at) : '-';
                skrdUploadedAt.textContent = `Diunggah: ${uploadDate}`;
            }
            if (downloadSkrdBtn) {
                downloadSkrdBtn.href = fileUrl;
                downloadSkrdBtn.setAttribute('download', data.skrd_filename || data.skrd_file);
            }
        } else {
            skrdFileSection.style.display = 'none';
            skrdUploadSection.style.display = 'block';
        }
    }

    function updatePaymentHistory(data) {
        const historyDiv = document.getElementById('paymentHistory');
        if (!historyDiv) return;
        
        const totalAmount = data.total_tagihan || 0;
        const paidAmount = data.jumlah_dibayar || 0;
        const remaining = data.sisa_tagihan || (totalAmount - paidAmount);
        
        // Ambil riwayat pembayaran dari notes
        const paymentNotes = data.bukti_pembayaran_notes || '';
        const paymentHistory = paymentNotes ? paymentNotes.split('\n').filter(line => line.trim() !== '') : [];
        
        if (paymentHistory.length > 0) {
            let historyHtml = '<div class="payment-timeline">';
            
            // Tampilkan setiap baris riwayat
            paymentHistory.forEach((note, index) => {
                const isLast = index === paymentHistory.length - 1;
                
                historyHtml += `
                    <div class="d-flex justify-content-between align-items-start border-bottom pb-2 mb-2">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <span class="badge bg-${isLast && remaining === 0 ? 'success' : 'secondary'} rounded-pill">
                                    Pembayaran #${index + 1}
                                </span>
                                ${isLast && remaining === 0 ? '<span class="badge bg-success">LUNAS</span>' : ''}
                            </div>
                            <p class="mb-0 text-muted small">${note}</p>
                        </div>
                    </div>
                `;
            });
            
            historyHtml += '</div>';
            
            // Tampilkan summary
            historyHtml += `
                <div class="mt-3 pt-2 border-top bg-light p-3 rounded">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="fw-bold">Total Tagihan:</span>
                        <span class="fw-bold">${formatRupiah(totalAmount)}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-1">
                        <span class="fw-bold">Total Dibayar:</span>
                        <span class="fw-bold text-success">${formatRupiah(paidAmount)}</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold">Sisa Tagihan:</span>
                        <span class="fw-bold ${remaining > 0 ? 'text-danger' : 'text-success'}">${formatRupiah(remaining)}</span>
                    </div>
                </div>
            `;
            
            historyDiv.innerHTML = historyHtml;
        } else {
            historyDiv.innerHTML = '<p class="text-muted text-center py-3">Belum ada riwayat pembayaran</p>';
        }
    }

    function updatePrintVersion(data) {
        const printSkrdNumber = document.getElementById('printSkrdNumber');
        const printCompanyName = document.getElementById('printCompanyName');
        const printCompanyAddress = document.getElementById('printCompanyAddress');
        const printDueDate = document.getElementById('printDueDate');
        const printMonth = document.getElementById('printMonth');
        const printYear = document.getElementById('printYear');
        const printSubtotal = document.getElementById('printSubtotal');
        const printTotal = document.getElementById('printTotal');
        const printTerbilang = document.getElementById('printTerbilang');
        const printItemsBody = document.getElementById('printItemsTableBody');
        
        if (printSkrdNumber) printSkrdNumber.textContent = data.no_permohonan || '100095/SKR/DDPUPR/IV2026';
        if (printCompanyName) printCompanyName.textContent = data.nama_instansi || '-';
        if (printCompanyAddress) printCompanyAddress.textContent = data.alamat || '-';
        if (printDueDate) printDueDate.textContent = formatDate(data.due_date || data.created_at);
        
        if (printMonth && printYear) {
            const now = new Date();
            printMonth.textContent = now.toLocaleString('id-ID', { month: 'long' });
            printYear.textContent = now.getFullYear();
        }
        
        const totalAmount = data.total_tagihan || 0;
        const subtotal = totalAmount / 1.11;
        
        if (printSubtotal) printSubtotal.textContent = formatRupiah(Math.round(subtotal));
        if (printTotal) printTotal.textContent = formatRupiah(totalAmount);
        
        if (printTerbilang) {
            printTerbilang.textContent = `Dengan Huruf : ${numberToWords(Math.round(totalAmount))} Rupiah`;
        }
        
        if (printItemsBody) {
            const layanan = data.layanan || 'Pengujian';
            const hargaSatuan = totalAmount / 1.11;
            
            printItemsBody.innerHTML = `
                <tr>
                    <td class="text-center">1</td>
                    <td>4120220</td>
                    <td>Laboratorium>Lab Pengujian Bahan>Penelitian Laboratorium Untuk Pekerjaan Jalan, Jembatan Dan Pengairan>Besi>A, ${layanan}</td>
                    <td class="text-center">1</td>
                    <td class="text-center">sample</td>
                    <td class="text-end">${formatRupiah(Math.round(hargaSatuan)).replace('Rp', '').trim()}</td>
                    <td class="text-end">${formatRupiah(Math.round(hargaSatuan)).replace('Rp', '').trim()}</td>
                </tr>
            `;
        }
    }

    function updateActionButtons(status) {
        const remindBtn = document.getElementById('remindBtn');
        
        if (status === 'Lunas' || status === 'Dibatalkan') {
            if (remindBtn) remindBtn.style.display = 'none';
        } else {
            if (remindBtn) remindBtn.style.display = 'inline-block';
        }
    }

    // ==================== HELPER FUNCTIONS ====================
    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
        } catch {
            return '-';
        }
    }

    function formatDateTime(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} ${hours}:${minutes}`;
        } catch {
            return '-';
        }
    }

    function formatRupiah(number) {
        if (number === undefined || number === null) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(number);
    }

    function formatRupiahInput(input) {
        let value = input.value.replace(/\D/g, '');
        if (value) {
            value = parseInt(value);
            input.value = formatRupiah(value).replace('Rp', '').trim();
            hitungSisa();
        } else {
            input.value = '';
            document.getElementById('sisaSetelah').value = '';
        }
    }

    function isOverdue(dueDate, status) {
        if (!dueDate || status === 'Lunas' || status === 'Dibatalkan') return false;
        try {
            return new Date(dueDate) < new Date();
        } catch {
            return false;
        }
    }

    function numberToWords(num) {
        if (num === 0) return 'Nol';
        
        const words = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
        
        if (num < 12) return words[num];
        if (num < 20) return words[num - 10] + ' Belas';
        if (num < 100) {
            const puluh = Math.floor(num / 10);
            const sisa = num % 10;
            return words[puluh] + ' Puluh' + (sisa > 0 ? ' ' + words[sisa] : '');
        }
        if (num < 200) return 'Seratus ' + numberToWords(num - 100);
        if (num < 1000) {
            const ratus = Math.floor(num / 100);
            const sisa = num % 100;
            return words[ratus] + ' Ratus ' + (sisa > 0 ? numberToWords(sisa) : '');
        }
        if (num < 1000000) {
            const ribu = Math.floor(num / 1000);
            const sisa = num % 1000;
            return numberToWords(ribu) + ' Ribu ' + (sisa > 0 ? numberToWords(sisa) : '');
        }
        if (num < 1000000000) {
            const juta = Math.floor(num / 1000000);
            const sisa = num % 1000000;
            return numberToWords(juta) + ' Juta ' + (sisa > 0 ? numberToWords(sisa) : '');
        }
        return '';
    }

    // ==================== PAYMENT FUNCTIONS ====================
    function hitungSisa() {
        const total = invoiceData?.total_tagihan || 0;
        const sudahDibayar = invoiceData?.jumlah_dibayar || 0;
        const sisaSebelum = total - sudahDibayar;
        
        const nominalInput = document.getElementById('nominalBayar').value;
        const nominalBayar = parseFloat(nominalInput.replace(/\D/g, '')) || 0;
        
        document.getElementById('totalTagihan').value = total.toLocaleString('id-ID');
        document.getElementById('sudahDibayar').value = sudahDibayar.toLocaleString('id-ID');
        document.getElementById('sisaTagihan').value = sisaSebelum.toLocaleString('id-ID');
        
        let sisaSetelah = sisaSebelum;
        if (nominalBayar > 0) {
            if (nominalBayar > sisaSebelum) {
                document.getElementById('sisaSetelah').value = '0';
                document.getElementById('sisaStatus').innerHTML = '<span class="text-danger">Melebihi sisa tagihan!</span>';
            } else {
                sisaSetelah = sisaSebelum - nominalBayar;
                document.getElementById('sisaSetelah').value = sisaSetelah.toLocaleString('id-ID');
                
                const statusInfo = document.getElementById('statusAfterPayment');
                if (sisaSetelah === 0) {
                    statusInfo.innerHTML = '<strong class="text-success">Lunas</strong>';
                } else {
                    statusInfo.innerHTML = '<strong class="text-warning">Belum Lunas</strong>';
                }
                document.getElementById('sisaStatus').innerHTML = '';
            }
        } else {
            document.getElementById('sisaSetelah').value = sisaSebelum.toLocaleString('id-ID');
            document.getElementById('sisaStatus').innerHTML = 'Akan otomatis terisi';
        }
    }

    function showVerifyModal() {
        document.getElementById('paymentInputSection').style.display = 'block';
        document.getElementById('nominalBayar').value = '';
        hitungSisa();
        document.getElementById('paymentInputSection').scrollIntoView({ behavior: 'smooth' });
    }

    async function submitPayment() {
        const nominalInput = document.getElementById('nominalBayar');
        const paymentDate = document.getElementById('paymentDate');
        const notes = document.getElementById('paymentNotes');
        
        if (!nominalInput || !paymentDate) {
            showAlert('Form tidak lengkap', 'danger');
            return;
        }
        
        const nominalBayar = parseFloat(nominalInput.value.replace(/\D/g, '')) || 0;
        const tanggalBayar = paymentDate.value;
        const catatan = notes ? notes.value : '';
        
        const total = invoiceData?.total_tagihan || 0;
        const sudahDibayar = invoiceData?.jumlah_dibayar || 0;
        const sisa = total - sudahDibayar;
        
        if (nominalBayar <= 0) {
            showAlert('Masukkan nominal pembayaran', 'danger');
            return;
        }
        
        if (nominalBayar > sisa) {
            showAlert('Nominal melebihi sisa tagihan', 'danger');
            return;
        }
        
        if (!tanggalBayar) {
            showAlert('Pilih tanggal pembayaran', 'danger');
            return;
        }
        
        const statusText = (sisa - nominalBayar === 0) ? 'LUNAS' : 'BELUM LUNAS';
        if (!confirm(`Verifikasi pembayaran Rp ${nominalBayar.toLocaleString('id-ID')}?\nStatus akan menjadi: ${statusText}`)) {
            return;
        }
        
        showLoading(true);
        
        try {
            console.log('📡 Mengirim verifikasi pembayaran:', {
                id: invoiceId,
                paid_amount: nominalBayar,
                paid_date: tanggalBayar,
                notes: catatan
            });
            
            const response = await fetch(`${API_BASE_URL}/skrd/${invoiceId}/verify-payment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    paid_amount: nominalBayar,
                    paid_date: tanggalBayar,
                    notes: catatan
                })
            });
            
            const result = await response.json();
            console.log('📦 Response verifikasi:', result);
            
            if (result.success) {
                showAlert('Pembayaran berhasil diverifikasi', 'success');
                
                // Reset form
                if (nominalInput) nominalInput.value = '';
                if (notes) notes.value = '';
                
                // Sembunyikan form verifikasi
                const paymentInputSection = document.getElementById('paymentInputSection');
                if (paymentInputSection) paymentInputSection.style.display = 'none';
                
                // Reload data
                await loadInvoiceDetail();
                
            } else {
                showAlert(result.message || 'Gagal verifikasi', 'danger');
            }
        } catch (error) {
            console.error('❌ Error verifikasi:', error);
            showAlert('Gagal verifikasi pembayaran: ' + error.message, 'danger');
        } finally {
            showLoading(false);
        }
    }

    // Reset form setelah pembayaran
    function resetPaymentForm() {
        document.getElementById('nominalBayar').value = '';
        document.getElementById('paymentNotes').value = '';
        document.getElementById('paymentInputSection').style.display = 'none';
        
        // Reset perhitungan sisa
        if (invoiceData) {
            const total = invoiceData.total_tagihan || 0;
            const sudahDibayar = invoiceData.jumlah_dibayar || 0;
            const sisa = total - sudahDibayar;
            
            document.getElementById('totalTagihan').value = total.toLocaleString('id-ID');
            document.getElementById('sudahDibayar').value = sudahDibayar.toLocaleString('id-ID');
            document.getElementById('sisaTagihan').value = sisa.toLocaleString('id-ID');
            document.getElementById('sisaSetelah').value = sisa.toLocaleString('id-ID');
        }
    }

    // Update fungsi cancelVerify
    function cancelVerify() {
        resetPaymentForm();
    }

    // 🔥 PERBAIKI FUNGSI viewProof
    function viewProof() {
        if (window.currentProofUrl) {
            window.open(window.currentProofUrl, '_blank');
        } else if (invoiceData?.bukti_pembayaran_1) {
            const fileUrl = `http://localhost:5000/uploads/payment/${invoiceData.bukti_pembayaran_1}`;
            window.open(fileUrl, '_blank');
        } else {
            showAlert('File bukti pembayaran tidak ditemukan', 'warning');
        }
    }

    async function rejectProof() {
        if (!confirm('Tolak bukti pembayaran ini?')) return;
        
        const reason = prompt('Alasan penolakan:');
        if (reason === null) return;
        
        showLoading(true);
        
        try {
            const response = await fetch(`${API_BASE_URL}/skrd/${invoiceId}/reject-proof`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showAlert('Bukti pembayaran ditolak', 'success');
                loadInvoiceDetail();
            } else {
                showAlert(result.message || 'Gagal menolak bukti', 'danger');
            }
        } catch (error) {
            showAlert('Gagal menolak bukti', 'danger');
        } finally {
            showLoading(false);
        }
    }

    // ==================== SKRD FUNCTIONS ====================
    async function uploadSkrdFile() {
        const fileInput = document.getElementById('skrdFileInput');
        const file = fileInput.files[0];
        
        if (!file) return;
        
        if (file.size > 2 * 1024 * 1024) {
            showAlert('File maksimal 2MB', 'danger');
            fileInput.value = '';
            return;
        }
        
        if (file.type !== 'application/pdf') {
            showAlert('File harus PDF', 'danger');
            fileInput.value = '';
            return;
        }
        
        showLoading(true);
        
        const formData = new FormData();
        formData.append('skrd', file); // Gunakan nama field 'skrd' sesuai dengan backend
        
        try {
            console.log('📡 Uploading SKRD untuk invoice:', invoiceId);
            
            const response = await fetch(`${API_BASE_URL}/skrd/${invoiceId}/upload-skrd`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                    // JANGAN set Content-Type, biar browser yang set dengan boundary
                },
                body: formData
            });
            
            const result = await response.json();
            console.log('📦 Response upload:', result);
            
            if (result.success) {
                showAlert('SKRD berhasil diupload', 'success');
                
                // Refresh data
                await loadInvoiceDetail();
                
                // Reset file input
                fileInput.value = '';
            } else {
                showAlert(result.message || 'Gagal upload', 'danger');
            }
        } catch (error) {
            console.error('❌ Error upload:', error);
            showAlert('Gagal upload file: ' + error.message, 'danger');
        } finally {
            showLoading(false);
            fileInput.value = '';
        }
    }

    function uploadNewSkrd() {
        document.getElementById('skrdFileInput').click();
    }

    // ==================== SUBMISSION ====================
    function viewSubmission() {
        if (submissionId) {
            window.location.href = `/admin/submissions/${submissionId}`;
        } else {
            showAlert('Submission tidak ditemukan', 'warning');
        }
    }

    // ==================== OTHER ACTIONS ====================
    async function sendReminder() {
        if (!confirm('Kirim pengingat pembayaran ke perusahaan?')) return;
        
        showLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/skrd/${invoiceId}/remind`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();
            if (result.success) {
                showAlert('Pengingat berhasil dikirim', 'success');
            } else {
                showAlert(result.message || 'Gagal mengirim pengingat', 'danger');
            }
        } catch (error) {
            showAlert('Gagal mengirim pengingat', 'danger');
        } finally {
            showLoading(false);
        }
    }

    // ==================== UI CONTROLS ====================
    function showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = show ? 'flex' : 'none';
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
        setTimeout(() => alertDiv.style.display = 'none', 5000);
    }

    // ==================== EXPOSE FUNCTIONS TO WINDOW ====================
    // INI YANG PALING PENTING!
    window.printInvoice = printInvoice;
    window.sendReminder = sendReminder;
    window.formatRupiahInput = formatRupiahInput;
    window.showVerifyModal = showVerifyModal;
    window.submitPayment = submitPayment;
    window.cancelVerify = cancelVerify;
    window.viewProof = viewProof;
    window.rejectProof = rejectProof;
    window.uploadSkrdFile = uploadSkrdFile;
    window.uploadNewSkrd = uploadNewSkrd;
    window.viewSubmission = viewSubmission;
    window.hitungSisa = hitungSisa;
    window.resetPaymentForm = resetPaymentForm;

    // ==================== INITIALIZE ====================
    document.addEventListener('DOMContentLoaded', () => {
        // Set lab info default
        const labAddress = document.getElementById('labAddress');
        const labPhone = document.getElementById('labPhone');
        
        if (labAddress) labAddress.textContent = 'Jl. Raya Lab Pengujian No. 123, Banten';
        if (labPhone) labPhone.textContent = 'Telp: (021) 555-1234';
        
        // Set default payment date
        const paymentDate = document.getElementById('paymentDate');
        if (paymentDate) {
            const today = new Date().toISOString().split('T')[0];
            paymentDate.value = today;
        }
        
        // Load data
        loadInvoiceDetail();
    });

})();