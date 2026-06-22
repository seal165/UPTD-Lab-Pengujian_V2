const fs = require('fs');
const filePath = 'd:/Magang/baru/UPTD-Lab-Pengujian_V2/frontend/src/views/user/history-detail.ejs';
const content = fs.readFileSync(filePath, 'utf8');

const newContentState = `        <!-- Content State -->
        <div id="contentState" style="display: none;">
            <!-- Header dengan ID dan Status -->
            <div class="card-custom mb-4 p-3 border-0 shadow-sm d-flex flex-column flex-md-row align-items-md-center justify-content-between">
                <div class="mb-3 mb-md-0">
                    <small class="text-muted fw-bold d-block mb-1">ID Pengajuan</small>
                    <h4 class="fw-bold m-0 text-dark" id="det-id">#APP-ID</h4>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-light text-secondary px-3 py-2 border rounded-3 d-flex align-items-center shadow-sm" style="font-size: 0.85rem;"><i class="far fa-calendar-alt me-2"></i><span id="det-date">-</span></span>
                    <span class="badge px-3 py-2 rounded-3 d-flex align-items-center shadow-sm" id="det-status" style="font-size: 0.85rem;">Menunggu...</span>
                </div>
            </div>

            <div class="row g-4">
                <!-- KOLOM KIRI (8 kolom) -->
                <div class="col-md-8">
                    <!-- Informasi Perusahaan -->
                    <div class="card-custom mb-4">
                        <h6 class="fw-bold text-uppercase text-muted small mb-3 border-bottom pb-3">
                            <i class="far fa-building me-2"></i>Informasi Perusahaan
                        </h6>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <small class="text-muted d-block mb-1">Nama Perusahaan / Instansi</small>
                                <span class="fw-bold text-dark" id="det-company">-</span>
                            </div>
                            <div class="col-md-6">
                                <small class="text-muted d-block mb-1">Nama Pemohon</small>
                                <span class="fw-bold text-dark" id="det-pic">-</span>
                            </div>
                            <div class="col-12">
                                <small class="text-muted d-block mb-1">Alamat Lengkap</small>
                                <span class="text-dark" id="det-address">-</span>
                            </div>
                            <div class="col-md-6">
                                <small class="text-muted d-block mb-1">No. Telepon</small>
                                <span class="text-dark" id="det-contact">-</span>
                            </div>
                            <div class="col-md-6">
                                <small class="text-muted d-block mb-1">Email</small>
                                <span class="text-dark" id="det-email">-</span>
                            </div>
                        </div>
                    </div>

                    <!-- Informasi Proyek -->
                    <div class="card-custom mb-4">
                        <h6 class="fw-bold text-uppercase text-muted small mb-3 border-bottom pb-3">
                            <i class="fas fa-hard-hat me-2"></i>Informasi Proyek
                        </h6>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <small class="text-muted d-block mb-1">Nama Proyek</small>
                                <span class="fw-bold text-dark" id="det-project">-</span>
                            </div>
                            <div class="col-md-6">
                                <small class="text-muted d-block mb-1">Lokasi Proyek</small>
                                <span class="text-dark" id="det-project-location">-</span>
                            </div>
                        </div>
                    </div>

                    <!-- Detail Material & Layanan -->
                    <div class="card-custom mb-4">
                        <h6 class="fw-bold text-uppercase text-muted small mb-3 border-bottom pb-3">
                            <i class="fas fa-cubes me-2"></i>Detail Material & Layanan
                        </h6>
                        <div class="d-flex flex-wrap gap-5 mb-4">
                            <div>
                                <small class="text-muted d-block mb-1">Jenis Sample</small>
                                <div class="fw-bold text-primary" id="det-sample-type">
                                    <i class="fas fa-flask me-2"></i>-
                                </div>
                            </div>
                            <div>
                                <small class="text-muted d-block mb-1">Metode Pengujian</small>
                                <div class="fw-bold text-dark" id="det-method">-</div>
                            </div>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="table table-bordered align-middle mb-0">
                                <thead class="bg-light">
                                    <tr class="text-muted small text-uppercase">
                                        <th class="py-2">Spesifikasi Item</th>
                                        <th width="100" class="text-center py-2">Jumlah</th>
                                        <th width="150" class="text-end py-2">Harga Satuan</th>
                                        <th width="150" class="text-end py-2">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody id="det-items-body">
                                    <tr>
                                        <td class="fw-bold" id="det-service-name">-</td>
                                        <td class="text-center" id="det-qty">1</td>
                                        <td class="text-end" id="det-unit-price">Rp 0</td>
                                        <td class="text-end fw-bold" id="det-subtotal">Rp 0</td>
                                    </tr>
                                    <tr class="bg-light">
                                        <td colspan="3" class="text-end fw-bold">Total Retribusi</td>
                                        <td class="text-end fw-bold text-primary" id="det-total">Rp 0</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- DOKUMEN PENDUKUNG -->
                    <div class="card-custom mb-4">
                        <div class="border-bottom pb-3 mb-3">
                            <h6 class="fw-bold text-uppercase text-muted small m-0">
                                <i class="fas fa-file-pdf me-2 text-danger"></i>Dokumen Pendukung
                            </h6>
                        </div>
                        <div class="document-list">
                            <!-- Surat Permohonan -->
                            <div class="document-card p-3 border rounded mb-3 document-required">
                                <div class="d-flex align-items-center">
                                    <div class="bg-light rounded text-danger d-flex align-items-center justify-content-center me-3" style="width: 44px; height: 44px; border: 1px solid #dee2e6;">
                                        <i class="fas fa-file-pdf fs-4"></i>
                                    </div>
                                    <div class="flex-grow-1">
                                        <div class="d-flex align-items-center gap-2">
                                            <span class="fw-bold">Surat Permohonan dari Perusahaan</span>
                                            <span class="badge" style="background-color: #dc3545; color: white; font-size: 0.7rem;">Wajib</span>
                                        </div>
                                        <small class="text-muted d-block mt-1" id="status-doc-permohonan">Memuat status...</small>
                                    </div>
                                    <div id="action-doc-permohonan" class="ms-3"></div>
                                </div>
                            </div>
                            <!-- Scan KTP -->
                            <div class="document-card p-3 border rounded mb-3 document-required">
                                <div class="d-flex align-items-center">
                                    <div class="bg-light rounded text-danger d-flex align-items-center justify-content-center me-3" style="width: 44px; height: 44px; border: 1px solid #dee2e6;">
                                        <i class="fas fa-file-pdf fs-4"></i>
                                    </div>
                                    <div class="flex-grow-1">
                                        <div class="d-flex align-items-center gap-2">
                                            <span class="fw-bold">Scan KTP</span>
                                            <span class="badge" style="background-color: #dc3545; color: white; font-size: 0.7rem;">Wajib</span>
                                        </div>
                                        <small class="text-muted d-block mt-1" id="status-doc-ktp">Memuat status...</small>
                                    </div>
                                    <div id="action-doc-ktp" class="ms-3"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- LAPORAN HASIL PENGUJIAN -->
                    <div class="card-custom mb-4 border-success border" style="border-width: 1px !important;">
                        <div class="border-bottom pb-3 mb-3">
                            <h6 class="fw-bold text-uppercase text-success small m-0">
                                <i class="fas fa-file-pdf me-2"></i>Laporan Hasil Pengujian
                            </h6>
                        </div>
                        <div class="document-card p-3 rounded">
                            <div class="d-flex align-items-center">
                                <div class="bg-success-subtle rounded text-success d-flex align-items-center justify-content-center me-3" style="width: 44px; height: 44px;">
                                    <i class="fas fa-file-pdf fs-4"></i>
                                </div>
                                <div class="flex-grow-1">
                                    <div class="d-flex align-items-center gap-2">
                                        <span class="fw-bold text-success">Laporan Hasil Pengujian</span>
                                        <span class="badge bg-success" style="font-size: 0.7rem;">Hasil</span>
                                    </div>
                                    <small class="text-muted d-block mt-1" id="status-laporan">Memuat status...</small>
                                    <small class="text-muted d-block" id="laporan-date"></small>
                                </div>
                                <div id="action-laporan" class="ms-3"></div>
                            </div>
                        </div>
                    </div>

                    <!-- KUISIONER (JIKA ADA) -->
                    <div class="card-custom mb-4" id="kuisioner-section" style="display: none;">
                        <div class="border-bottom pb-3 mb-3">
                            <h6 class="fw-bold text-uppercase text-muted small m-0">
                                <i class="fas fa-star me-2 text-warning"></i>Kuisioner Kepuasan
                            </h6>
                        </div>
                        <div class="text-center p-4">
                            <i class="fas fa-smile fa-3x text-primary mb-3"></i>
                            <h6 class="fw-bold">Berikan Penilaian Anda</h6>
                            <p class="text-muted small mb-3">Bantu kami meningkatkan kualitas layanan dengan mengisi kuisioner kepuasan</p>
                            <button class="btn btn-primary px-4" onclick="window.openKuisioner()">
                                <i class="fas fa-edit me-2"></i>Isi Kuisioner
                            </button>
                        </div>
                    </div>
                </div>

                <!-- KOLOM KANAN (4 kolom) -->
                <div class="col-md-4">
                    <!-- Status & Timeline -->
                    <div class="card-custom mb-4">
                        <h6 class="fw-bold text-uppercase text-muted small mb-3 border-bottom pb-3">
                            <i class="fas fa-history me-2"></i>Timeline Pengajuan
                        </h6>
                        <div class="timeline" id="timeline"></div>
                    </div>

                    <!-- Informasi Pembayaran -->
                    <div class="card-custom mb-4">
                        <h6 class="fw-bold text-uppercase text-muted small mb-3 border-bottom pb-3">
                            <i class="fas fa-credit-card me-2"></i>Informasi Pembayaran
                        </h6>
                        <div class="d-flex flex-column gap-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">No. Invoice</small>
                                <span class="fw-bold" id="det-invoice">-</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">Status</small>
                                <span id="det-payment-status">-</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">Total Tagihan</small>
                                <span class="fw-bold" id="det-bill">Rp 0</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">Jumlah Dibayar</small>
                                <span class="text-success fw-bold" id="det-paid">Rp 0</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center border-top pt-3">
                                <small class="text-muted fw-bold">Sisa Tagihan</small>
                                <span class="text-danger fw-bold fs-5" id="det-remaining">Rp 0</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-1">
                                <small class="text-muted">Tgl Pembayaran</small>
                                <span class="small" id="det-payment-date">-</span>
                            </div>
                        </div>

                        <!-- Bukti Pembayaran -->
                        <div class="mt-4 border-top pt-3" id="payment-proof-section" style="display: none;">
                            <small class="text-muted fw-bold d-block mb-2">Bukti Pembayaran</small>
                            <div class="document-list" id="payment-proof-list"></div>
                        </div>
                    </div>

                    <!-- Catatan Admin -->
                    <div class="card-custom mb-4" id="admin-notes-section" style="display: none;">
                        <h6 class="fw-bold text-uppercase text-muted small mb-3 border-bottom pb-3">
                            <i class="fas fa-sticky-note me-2 text-warning"></i>Catatan Admin
                        </h6>
                        <div class="alert alert-warning mb-0" id="admin-notes">
                            -
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

const startIdx = content.indexOf('<!-- Content State -->');
const endIdx = content.indexOf('<input type="hidden" id="currentSubmissionId"');

if (startIdx !== -1 && endIdx !== -1) {
    const updated = content.substring(0, startIdx) + newContentState + '\n\n    ' + content.substring(endIdx);
    fs.writeFileSync(filePath, updated);
    console.log('Successfully replaced contentState');
} else {
    console.log('Failed to find markers');
}
