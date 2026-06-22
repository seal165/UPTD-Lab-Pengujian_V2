// public/js/admin/kuisioner.js

(function() {
    'use strict';

    // ==================== KONFIGURASI ====================
    const API_BASE_URL = window.location.origin === 'http://localhost:3000' 
        ? 'http://localhost:5000/api' 
        : '/api';
    const ITEMS_PER_PAGE = 10;
    
    let currentPage = 1;
    let startDate = '';
    let endDate = '';
    let searchTerm = '';
    let totalData = 0;
    let allKuisioner = [];
    let questions = [];
    let searchTimeout;
    let currentPreviewData = null;
    
    // Chart instances
    let kriteriaChart, distribusiChart;
    
    // Daftar kriteria akan diambil dari database
    let kriteriaList = [];

    // ==================== CEK TOKEN ====================
    function getToken() {
        return localStorage.getItem('token');
    }

    if (!getToken()) {
        window.location.href = '/admin/login';
        return;
    }

    // ==================== LOAD DATA KUISIONER ====================
    async function loadKuisioner() {
        try {
            const params = new URLSearchParams({
                page: currentPage,
                limit: ITEMS_PER_PAGE,
                search: searchTerm
            });
            
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            console.log('📡 Fetching kuisioner:', `${API_BASE_URL}/admin/kuisioner?${params}`);
            
            const response = await fetch(`${API_BASE_URL}/admin/kuisioner?${params}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/admin/login';
                return;
            }

            const result = await response.json();
            console.log('📦 Kuisioner response:', result);

            if (result.success) {
                allKuisioner = result.data.kuisioner || [];
                totalData = result.data.total || 0;
                updateTable(allKuisioner);
                updatePagination();
                
                loadStats();
            } else {
                showAlert(result.message || 'Gagal memuat data', 'danger');
            }
        } catch (error) {
            console.error('Error loading kuisioner:', error);
            showAlert('Gagal memuat data: ' + error.message, 'danger');
        }
    }

    // ==================== LOAD STATISTIK ====================
    async function loadStats() {
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            
            console.log('📡 Fetching stats:', `${API_BASE_URL}/admin/kuisioner/stats?${params}`);
            
            const response = await fetch(`${API_BASE_URL}/admin/kuisioner/stats?${params}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            const result = await response.json();
            console.log('📦 Stats response:', result);

            if (result.success) {
                updateStats(result.data);
            } else {
                console.error('Stats error:', result.message);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    // ==================== LOAD PERTANYAAN ====================
    async function loadQuestions() {
        console.log('========== LOAD QUESTIONS ==========');
        
        try {
            const token = getToken();
            if (!token) {
                console.error('Token tidak ditemukan');
                showAlert('Sesi habis, silakan login ulang', 'warning');
                window.location.href = '/admin/login';
                return;
            }
            
            const response = await fetch(`${API_BASE_URL}/kuisioner/questions`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📡 Response status:', response.status);
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/admin/login';
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('📦 Questions API response:', result);
            
            if (result.success) {
                questions = result.data || [];
                console.log(`✅ Loaded ${questions.length} questions from database`);
                
                kriteriaList = questions
                    .sort((a, b) => (a.urutan || 0) - (b.urutan || 0))
                    .map(q => q.question_text);
                
                console.log('📋 Kriteria list:', kriteriaList.length);
                
                updateQuestionsTable(questions);
                
                const totalEl = document.getElementById('totalQuestions');
                if (totalEl) totalEl.textContent = `${questions.length} Pertanyaan`;
                
                loadStats();
            } else {
                throw new Error(result.message || 'Gagal memuat pertanyaan');
            }
        } catch (error) {
            console.error('❌ Error loading questions:', error);
            showAlert('Gagal memuat pertanyaan: ' + error.message, 'danger');
            
            questions = [];
            kriteriaList = [];
            updateQuestionsTable([]);
            document.getElementById('totalQuestions').textContent = '0 Pertanyaan';
        }
    }

    function updateStats(data) {
        const stats = data.stats || {};
        const distribusi = data.distribusi || {};
        
        console.log('📊 Updating stats:', stats);
        
        const totalResponden = document.getElementById('totalResponden');
        const rataKeseluruhan = document.getElementById('rataKeseluruhan');
        const nilaiTertinggi = document.getElementById('nilaiTertinggi');
        const nilaiTerendah = document.getElementById('nilaiTerendah');
        const kriteriaTertinggi = document.getElementById('kriteriaTertinggi');
        const kriteriaTerendah = document.getElementById('kriteriaTerendah');
        
        if (totalResponden) totalResponden.textContent = stats.total_responden || 0;
        if (rataKeseluruhan) rataKeseluruhan.textContent = (stats.rata_keseluruhan || 0).toFixed(1);
        
        // 🔥 Gunakan rata_skor_array dari backend (dinamis)
        const rataSkorArray = stats.rata_skor_array || [];
        
        if (rataSkorArray.length > 0) {
            const nilaiArray = rataSkorArray.map((nilai, index) => ({ nilai, index }));
            const tertinggi = nilaiArray.reduce((max, item) => item.nilai > max.nilai ? item : max, nilaiArray[0]);
            const terendah = nilaiArray.reduce((min, item) => item.nilai < min.nilai ? item : min, nilaiArray[0]);
            
            if (nilaiTertinggi) nilaiTertinggi.textContent = tertinggi.nilai.toFixed(1);
            if (nilaiTerendah) nilaiTerendah.textContent = terendah.nilai.toFixed(1);
            if (kriteriaTertinggi) {
                kriteriaTertinggi.textContent = kriteriaList[tertinggi.index] || `Kriteria ${tertinggi.index + 1}`;
            }
            if (kriteriaTerendah) {
                kriteriaTerendah.textContent = kriteriaList[terendah.index] || `Kriteria ${terendah.index + 1}`;
            }
        }
        
        // Panggil updateCharts dengan rataSkorArray
        updateCharts(rataSkorArray, distribusi);
    }

    // ==================== UPDATE CHART ====================
    function updateCharts(rataSkorArray, distribusi) {
        // rataSkorArray adalah array rata-rata per pertanyaan (sesuai urutan)
        const kriteriaValues = rataSkorArray || [];
        
        let labels = [];
        if (kriteriaList.length > 0) {
            labels = kriteriaList.map((k, i) => {
                return k.length > 40 ? k.substring(0, 40) + '...' : k;
            });
        } else {
            labels = kriteriaValues.map((_, i) => `Kriteria ${i+1}`);
        }
        
        // Chart Kriteria (Bar)
        if (kriteriaChart) {
            kriteriaChart.destroy();
        }
        const ctx = document.getElementById('kriteriaChart')?.getContext('2d');
        if (ctx) {
            kriteriaChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Rata-rata Nilai',
                        data: kriteriaValues,
                        backgroundColor: '#4361ee',
                        borderRadius: 8,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 5,
                            ticks: { stepSize: 1 }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
        
        // Chart Distribusi (Doughnut)
        if (distribusiChart) {
            distribusiChart.destroy();
        }
        const distribusiData = [
            distribusi.skor_1_count || 0,
            distribusi.skor_2_count || 0,
            distribusi.skor_3_count || 0,
            distribusi.skor_4_count || 0,
            distribusi.skor_5_count || 0   // tambahkan ini
        ];
        const ctx2 = document.getElementById('distribusiChart')?.getContext('2d');
        if (ctx2) {
            distribusiChart = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: ['Sangat Tidak Puas (1)', 'Tidak Puas (2)', 'Cukup Puas (3)', 'Puas (4)', 'Sangat Puas (5)'],
                    datasets: [{
                        data: distribusiData,
                        backgroundColor: ['#dc2626', '#f97316', '#eab308', '#3b82f6', '#10b981'],
                        borderWidth: 1,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    },
                    cutout: '60%'
                }
            });
        }
    }

    // ==================== UPDATE TABEL KUISIONER ====================
    function updateTable(kuisioner) {
        const tbody = document.getElementById('kuisionerTableBody');
        
        if (!kuisioner || kuisioner.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center">Tidak ada data</td></tr>`;
            return;
        }

        let html = '';
        kuisioner.forEach((item, index) => {
            // 🔥 Gunakan total_nilai dan rata_rata yang sudah dikirim backend
            const totalNilai = item.total_nilai !== undefined ? item.total_nilai : '-';
            const jumlahPertanyaan = item.jumlah_pertanyaan || 0;
            const rataRata = item.rata_rata !== undefined ? item.rata_rata.toFixed(1) : '-';
            const nilaiDisplay = totalNilai !== '-' ? `${totalNilai} / ${jumlahPertanyaan * 5}` : '-';
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.nama_pemohon || '-'}</td>
                    <td>${item.nama_instansi || '-'}</td>
                    <td>${formatDate(item.created_at)}</td>
                    <td class="text-center">
                        <strong>${nilaiDisplay}</strong>
                        <br><small class="text-muted">(rata-rata ${rataRata})</small>
                    </td>
                    <td>${item.saran ? item.saran.substring(0, 50) + '...' : '-'}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-secondary" onclick="previewKuisioner(${item.id})">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    // ==================== UPDATE TABEL PERTANYAAN ====================
    function updateQuestionsTable(questions) {
        const tbody = document.getElementById('questionsTableBody');
        if (!tbody) return;
        
        if (!questions || questions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-4 text-muted">
                        <i class="fas fa-list fa-2x mb-2"></i>
                        <p>Belum ada pertanyaan</p>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        questions.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
        
        questions.forEach((q, index) => {
            const statusClass = 'bg-success';
            const statusText = 'Aktif';
            
            html += `
                <tr>
                    <td>${q.urutan || index + 1}</td>
                    <td>${q.question_text}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-light action-btn" onclick="editQuestion(${q.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-light text-danger action-btn" onclick="confirmDeleteQuestion(${q.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    // ==================== PREVIEW KUISIONER ====================
    async function previewKuisioner(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/kuisioner/${id}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            
            const result = await response.json();
            
            if (result.success) {
                const data = result.data;
                currentPreviewData = data;
                
                // Isi info pemohon
                document.getElementById('previewNamaPemohon').textContent = data.nama_pemohon || '-';
                document.getElementById('previewInstansi').textContent = data.nama_instansi || '-';
                document.getElementById('previewTelepon').textContent = data.nomor_telepon || '-';
                document.getElementById('previewTanggal').textContent = formatDate(data.created_at);
                document.getElementById('previewSaran').textContent = data.saran || '-';
                
                // 🔥 Gunakan skor_list dan pertanyaan yang sudah dikirim server
                const skorList = data.skor_list || [];
                const pertanyaanList = data.pertanyaan || [];
                
                const tbody = document.getElementById('previewNilaiBody');
                let html = '';
                let total = 0, count = 0;
                
                pertanyaanList.forEach((qText, idx) => {
                    const nilai = skorList[idx] !== undefined ? skorList[idx] : null;
                    if (nilai !== null && !isNaN(nilai)) {
                        total += nilai;
                        count++;
                        html += `
                            <tr>
                                <td>${idx + 1}</td>
                                <td>${qText}</td>
                                <td class="text-center">
                                    <span class="nilai-box nilai-${nilai}">${nilai}</span>
                                </td>
                            </tr>
                        `;
                    }
                });
                
                if (html === '') {
                    html = '<tr><td colspan="3" class="text-center text-muted">Belum ada nilai</td></tr>';
                }
                tbody.innerHTML = html;
                
                // Tampilkan total & rata-rata
                const avg = count > 0 ? (total / count).toFixed(1) : '-';
                document.getElementById('previewTotalNilai').textContent = `Total: ${total} / ${pertanyaanList.length * 5}, Rata-rata: ${avg}`;
                
                new bootstrap.Modal(document.getElementById('previewModal')).show();
            }
        } catch (error) {
            showAlert('Error: ' + error.message, 'danger');
        }
    }

    // ==================== FUNGSI PERTANYAAN ====================
    function tambahPertanyaan() {
        console.log('➡️ tambahPertanyaan function called');
        
        const modalElement = document.getElementById('questionModal');
        if (!modalElement) {
            console.error('Modal element questionModal tidak ditemukan!');
            return;
        }

        document.getElementById('questionForm').reset();
        document.getElementById('questionModalTitle').textContent = 'Tambah Pertanyaan';
        document.getElementById('questionId').value = '';
        document.getElementById('deleteQuestionBtn').style.display = 'none';

        let modal = bootstrap.Modal.getInstance(modalElement);
        if (!modal) {
            modal = new bootstrap.Modal(modalElement);
        }
        modal.show();
    }

    function editQuestion(id) {
        console.log('➡️ editQuestion:', id);
        const question = questions.find(q => q.id === id);
        if (!question) {
            showAlert('Data pertanyaan tidak ditemukan', 'warning');
            return;
        }
        
        document.getElementById('questionModalTitle').textContent = 'Edit Pertanyaan';
        document.getElementById('questionId').value = question.id;
        document.getElementById('questionText').value = question.question_text;
        document.getElementById('questionOrder').value = question.urutan || '';
        document.getElementById('questionStatus').value = 'active';
        
        document.getElementById('deleteQuestionBtn').style.display = 'inline-block';
        
        const modalElement = document.getElementById('questionModal');
        let modal = bootstrap.Modal.getInstance(modalElement);
        if (!modal) {
            modal = new bootstrap.Modal(modalElement);
        }
        modal.show();
    }

    async function saveQuestion() {
        console.log('➡️ saveQuestion');
        
        const id = document.getElementById('questionId').value;
        const data = {
            question_text: document.getElementById('questionText').value,
            urutan: document.getElementById('questionOrder').value || null,
            status: 'active'
        };
        
        if (!data.question_text) {
            showAlert('Pertanyaan harus diisi', 'warning');
            return;
        }
        
        const url = id ? `${API_BASE_URL}/kuisioner/questions/${id}` : `${API_BASE_URL}/kuisioner/questions`;
        const method = id ? 'PUT' : 'POST';
        
        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            console.log('📦 Save response:', result);
            
            if (result.success) {
                const modalElement = document.getElementById('questionModal');
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
                
                showAlert(id ? 'Pertanyaan berhasil diupdate' : 'Pertanyaan berhasil ditambahkan', 'success');
                
                await loadQuestions();
                
                document.getElementById('questionForm').reset();
                document.getElementById('questionId').value = '';
            } else {
                showAlert(result.message || 'Gagal menyimpan', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal menyimpan pertanyaan', 'danger');
        }
    }

    function confirmDeleteQuestion(id) {
        const questionId = id || document.getElementById('questionId').value;
        if (!questionId) return;
        if (!confirm('Hapus pertanyaan ini? Data jawaban yang sudah ada akan tetap tersimpan.')) return;
        deleteQuestion(questionId);
    }

    async function deleteQuestion(id) {
        console.log('➡️ deleteQuestion:', id);
        
        try {
            const response = await fetch(`${API_BASE_URL}/kuisioner/questions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            
            const result = await response.json();
            console.log('📦 Delete response:', result);
            
            if (result.success) {
                const modalElement = document.getElementById('questionModal');
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
                
                showAlert('Pertanyaan berhasil dihapus', 'success');
                
                await loadQuestions();
            } else {
                showAlert(result.message || 'Gagal menghapus', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Gagal menghapus pertanyaan', 'danger');
        }
    }

    // ==================== FUNGSI FILTER ====================
    function applyDateFilter() {
        startDate = document.getElementById('startDate').value;
        endDate = document.getElementById('endDate').value;
        
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            showAlert('Tanggal akhir harus setelah tanggal awal', 'warning');
            return;
        }
        
        currentPage = 1;
        loadKuisioner();
    }

    function resetDateFilter() {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        startDate = '';
        endDate = '';
        currentPage = 1;
        loadKuisioner();
    }

    // ==================== PAGINATION ====================
    function updatePagination() {
        const totalPages = Math.ceil(totalData / ITEMS_PER_PAGE);
        const pagination = document.getElementById('pagination');
        const paginationInfo = document.getElementById('paginationInfo');
        
        if (!pagination) return;
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            if (paginationInfo) paginationInfo.innerHTML = `Total: <strong>${totalData}</strong> data`;
            return;
        }

        let paginationHtml = '';
        
        paginationHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Prev</a>
            </li>
        `;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                paginationHtml += `
                    <li class="page-item ${currentPage === i ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        paginationHtml += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
            </li>
        `;

        pagination.innerHTML = paginationHtml;
        
        const start = ((currentPage - 1) * ITEMS_PER_PAGE) + 1;
        const end = Math.min(currentPage * ITEMS_PER_PAGE, totalData);
        if (paginationInfo) {
            paginationInfo.innerHTML = `Menampilkan ${start}-${end} dari <strong>${totalData}</strong> data`;
        }
    }

    function changePage(page) {
        currentPage = page;
        loadKuisioner();
    }

    // ==================== EXPORT ====================
    async function exportKuisioner() {
        try {
            showAlert('Menyiapkan file export...', 'info');
            
            const params = new URLSearchParams({
                search: searchTerm,
                limit: 1000
            });
            
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            
            const response = await fetch(`${API_BASE_URL}/admin/kuisioner?${params}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            
            const result = await response.json();
            
            if (!result.success || !result.data.kuisioner) {
                showAlert('Tidak ada data untuk diexport', 'warning');
                return;
            }
            
            const data = result.data.kuisioner;
            
            const headers = [
                'No', 'Nama Pemohon', 'Instansi', 'Telepon',
                ...kriteriaList.map((_, i) => `Kriteria ${i+1}`),
                'Rata-rata', 'Saran', 'Tanggal'
            ];
            
            const rows = data.map((item, index) => {
                const nilaiList = [];
                for (let i = 1; i <= kriteriaList.length; i++) {
                    nilaiList.push(item[`skor_${i}`] || '');
                }
                
                const validNilai = nilaiList.filter(n => n !== '');
                const rataRata = validNilai.length > 0 
                    ? (validNilai.reduce((a, b) => parseInt(a) + parseInt(b), 0) / validNilai.length).toFixed(1)
                    : '-';
                
                return [
                    index + 1,
                    item.nama_pemohon || '',
                    item.nama_instansi || '',
                    item.nomor_telepon || '',
                    ...nilaiList,
                    rataRata,
                    item.saran || '',
                    formatDate(item.created_at)
                ];
            });

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            let filename = `kuisioner_${new Date().toISOString().split('T')[0]}`;
            if (startDate && endDate) {
                filename += `_${startDate}_${endDate}`;
            }
            filename += '.csv';
            
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
            
            showAlert('Export berhasil', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            showAlert('Gagal export data', 'danger');
        }
    }

    // ==================== DOWNLOAD PDF ====================
    function downloadKuisionerPDF() {
        if (!currentPreviewData) {
            showAlert('Data tidak tersedia', 'warning');
            return;
        }
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFontSize(18);
            doc.text('Detail Kuisioner Kepuasan', 105, 15, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Informasi Pemohon', 14, 25);
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.text(`Nama: ${currentPreviewData.nama_pemohon || '-'}`, 14, 32);
            doc.text(`Instansi: ${currentPreviewData.nama_instansi || '-'}`, 14, 38);
            doc.text(`Telepon: ${currentPreviewData.nomor_telepon || '-'}`, 14, 44);
            doc.text(`Tanggal: ${formatDate(currentPreviewData.created_at)}`, 14, 50);
            
            doc.setFont(undefined, 'bold');
            doc.text('Hasil Penilaian', 14, 62);
            
            // 🔥 Gunakan skor_list dan pertanyaan dari currentPreviewData
            const skorList = currentPreviewData.skor_list || [];
            const pertanyaanList = currentPreviewData.pertanyaan || [];
            
            const tableData = pertanyaanList.map((qText, idx) => {
                const nilai = skorList[idx] !== undefined ? skorList[idx] : '-';
                return [idx + 1, qText, nilai];
            });
            
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
            
            const saranLines = doc.splitTextToSize(currentPreviewData.saran || '-', 180);
            doc.text(saranLines, 14, finalY + 6);
            
            doc.save(`kuisioner_${currentPreviewData.nama_pemohon || 'pemohon'}_${formatDateForFilename(new Date())}.pdf`);
            
            showAlert('PDF berhasil didownload', 'success');
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            showAlert('Gagal membuat PDF', 'danger');
        }
    }

    // ==================== HELPER FUNCTIONS ====================
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    function formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }

    function formatDateForFilename(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}${month}${day}`;
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
        
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 5000);
    }

    // ==================== SEARCH ====================
    document.getElementById('searchInput')?.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchTerm = e.target.value;
            currentPage = 1;
            loadKuisioner();
        }, 500);
    });

    // ==================== EXPOSE FUNCTIONS TO WINDOW ====================
    window.loadKuisioner = loadKuisioner;
    window.applyDateFilter = applyDateFilter;
    window.resetDateFilter = resetDateFilter;
    window.exportKuisioner = exportKuisioner;
    window.tambahPertanyaan = tambahPertanyaan;
    window.editQuestion = editQuestion;
    window.saveQuestion = saveQuestion;
    window.confirmDeleteQuestion = confirmDeleteQuestion;
    window.previewKuisioner = previewKuisioner;
    window.downloadKuisionerPDF = downloadKuisionerPDF;
    window.changePage = changePage;

    // ==================== INITIALIZE ====================
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM loaded - Admin Kuisioner');
        
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput) {
            startDateInput.value = formatDateForInput(thirtyDaysAgo);
            startDate = formatDateForInput(thirtyDaysAgo);
        }
        if (endDateInput) {
            endDateInput.value = formatDateForInput(today);
            endDate = formatDateForInput(today);
        }
        
        loadKuisioner();
        loadQuestions().then(() => loadStats());
        
        const btnTambah = document.getElementById('btnTambahPertanyaan');
        if (btnTambah) {
            btnTambah.addEventListener('click', tambahPertanyaan);
        }
    });

})();