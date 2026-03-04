// public/js/user/history-detail-handler.js

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ History Detail Handler initialized');
        
        // CEK TOKEN - Ambil dari cookie atau dari meta tag
        const token = getTokenFromCookie() || getTokenFromMeta();
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
        setText('det-address', data.alamat_pemohon || '-');
        
        // Contact
        const contact = [];
        if (data.email_pemohon) contact.push(data.email_pemohon);
        if (data.nomor_telepon) contact.push(data.nomor_telepon);
        setText('det-contact', contact.join(' / ') || '-');
        
        // Material - dari samples jika ada
        if (data.samples && data.samples.length > 0) {
            const sample = data.samples[0];
            
            // Kode Pengujian (method)
            setText('det-material', sample.method_at_time || sample.method || '-');
            
            // Nama layanan
            setText('det-service-name', sample.service_name || sample.nama_identitas_sample || '-');
            
            // Jumlah sample
            const qty = sample.jumlah_sample_angka || 1;
            setText('det-qty', qty);
            
            // Harga per sample
            const price = parseFloat(sample.price_at_time) || 0;
            setText('det-price', formatRupiah(price));
            
            // Total tagihan = qty * price
            const total = qty * price;
            setText('det-total', formatRupiah(total));
            
            console.log('💰 Perhitungan:', {
                qty: qty,
                price: price,
                total: total
            });
        } else {
            // Fallback jika tidak ada samples
            setText('det-material', '-');
            setText('det-service-name', '-');
            setText('det-qty', '1');
            setText('det-price', formatRupiah(0));
            setText('det-total', formatRupiah(0));
        }

        // Informasi Pembayaran
        if (data.payment) {
            console.log('💰 Data pembayaran:', {
                no_invoice: data.payment.no_invoice,
                status: data.payment.status_pembayaran,
                total: data.payment.total_tagihan
            });
        }
        
        // Dokumen - dengan token untuk autentikasi
        renderDocuments(data, token);
        
        console.log('✅ Selesai mengisi data');
    }

    function renderDocuments(data, token) {
        const BACKEND_URL = 'http://localhost:5000';
        
        // Surat Permohonan
        if (data.file_surat_permohonan) {
            setText('status-doc-permohonan', '✅ Terupload');
            // Cara PALING SEDERHANA: langsung link dengan token di URL
            const fileUrl = `${BACKEND_URL}/api/file/surat/${data.file_surat_permohonan}?token=${token}`;
            document.getElementById('action-doc-permohonan').innerHTML = 
                `<a href="${fileUrl}" target="_blank" class="btn btn-sm btn-primary">Lihat</a>`;
        } else {
            setText('status-doc-permohonan', '❌ Belum diupload');
            document.getElementById('action-doc-permohonan').innerHTML = '';
        }
        
        // Scan KTP
        if (data.file_ktp) {
            setText('status-doc-ktp', '✅ Terupload');
            const fileUrl = `${BACKEND_URL}/api/file/ktp/${data.file_ktp}?token=${token}`;
            document.getElementById('action-doc-ktp').innerHTML = 
                `<a href="${fileUrl}" target="_blank" class="btn btn-sm btn-primary">Lihat</a>`;
        } else {
            setText('status-doc-ktp', '❌ Belum diupload');
            document.getElementById('action-doc-ktp').innerHTML = '';
        }
    }

    function renderLaporan(data, token) {
        const statusLaporan = document.getElementById('status-laporan');
        const actionLaporan = document.getElementById('action-laporan');
        const BACKEND_URL = 'http://localhost:5000';
        
        if (!statusLaporan || !actionLaporan) return;
        
        if (data.status === 'Selesai') {
            if (data.report && data.report.file_laporan) {
                statusLaporan.innerHTML = '<i class="fas fa-check-circle text-success"></i> Laporan siap diunduh';
                const fileUrl = `${BACKEND_URL}/api/file/laporan/${data.report.file_laporan}`;
                
                actionLaporan.innerHTML = `
                    <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}', true); return false;" class="btn btn-sm btn-success">
                        <i class="fas fa-download"></i> Download Laporan
                    </a>
                `;
            } else {
                statusLaporan.innerHTML = '<i class="fas fa-exclamation-circle text-warning"></i> Laporan sedang diproses';
                actionLaporan.innerHTML = '';
            }
        } else {
            statusLaporan.innerHTML = '<i class="fas fa-hourglass-half text-secondary"></i> Laporan akan tersedia setelah pengujian selesai';
            actionLaporan.innerHTML = '';
        }
    }

    // Fungsi untuk membuka file dengan token di header
    window.openFileWithToken = async function(url, token, download = false) {
        try {
            console.log('========== MEMBUKA FILE ==========');
            console.log('📂 URL:', url);
            console.log('🔑 Token:', token ? 'ADA (length: ' + token.length + ')' : 'TIDAK ADA');
            console.log('📥 Download mode:', download ? 'Ya' : 'Tidak');
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('📡 Response status:', response.status);
            console.log('📡 Response status text:', response.statusText);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (response.status === 401) {
                console.error('❌ Unauthorized - Token mungkin expired');
                alert('Sesi habis. Silakan login ulang.');
                window.location.href = '/login';
                return;
            }
            
            if (response.status === 404) {
                console.error('❌ File tidak ditemukan di server');
                alert('File tidak ditemukan di server');
                return;
            }
            
            if (!response.ok) {
                console.error('❌ HTTP Error:', response.status);
                throw new Error(`HTTP ${response.status}`);
            }
            
            // Cek content-type
            const contentType = response.headers.get('content-type');
            console.log('📁 Content-Type dari server:', contentType);
            
            // Cek apakah response berupa JSON (kemungkinan error)
            if (contentType && contentType.includes('application/json')) {
                console.warn('⚠️ Server mengembalikan JSON, bukan file');
                const errorData = await response.json();
                console.error('❌ Error dari server:', errorData);
                alert('Error: ' + (errorData.message || 'Gagal membuka file'));
                return;
            }
            
            // Ambil blob
            const blob = await response.blob();
            console.log('📦 Blob size:', blob.size, 'bytes');
            console.log('📦 Blob type:', blob.type);
            
            if (blob.size === 0) {
                console.error('❌ File kosong (0 bytes)');
                alert('File kosong');
                return;
            }
            
            // Validasi tipe file
            if (contentType && !contentType.includes(blob.type)) {
                console.warn('⚠️ Mismatch content-type:', contentType, 'vs', blob.type);
            }
            
            const blobUrl = window.URL.createObjectURL(blob);
            console.log('🔗 Blob URL:', blobUrl);
            
            if (download) {
                console.log('📥 Mendownload file...');
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = url.split('/').pop().split('?')[0]; // Ambil nama file dari URL
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                console.log('✅ Download selesai');
            } else {
                console.log('🖥️ Membuka file di tab baru...');
                
                // Untuk PDF, coba buka dengan iframe dulu
                if (blob.type === 'application/pdf') {
                    console.log('📄 File PDF terdeteksi');
                    
                    // Buka di tab baru
                    const newWindow = window.open('about:blank', '_blank');
                    if (newWindow) {
                        newWindow.document.write(`
                            <html>
                            <head><title>Loading PDF...</title></head>
                            <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh;">
                                <iframe src="${blobUrl}" width="100%" height="100%" style="border:none;"></iframe>
                            </body>
                            </html>
                        `);
                        console.log('✅ PDF dibuka di tab baru dengan iframe');
                    } else {
                        // Fallback: buka langsung
                        window.open(blobUrl, '_blank');
                    }
                } else {
                    // Untuk gambar atau file lain
                    window.open(blobUrl, '_blank');
                }
            }
            
            // Bersihkan blob URL setelah 1 menit
            setTimeout(() => {
                console.log('🧹 Membersihkan blob URL:', blobUrl);
                window.URL.revokeObjectURL(blobUrl);
            }, 60000);
            
            console.log('========== SELESAI ==========');
            
        } catch (error) {
            console.error('❌ Error membuka file:');
            console.error('❌ Error name:', error.name);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
            alert('Gagal membuka file: ' + error.message);
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