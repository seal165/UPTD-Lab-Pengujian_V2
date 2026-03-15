/**
 * UPTD Lab Submission Handler
 * VERSI ASLI + MODE SIBUK + PERBAIKAN MINIMAL SAMPLE
 */

// ==================== FUNGSI GLOBAL ====================

// Data services dari backend (disimpan di global)
let servicesData = [];

// 🔴 TAMBAHKAN VARIABEL UNTUK MODE SIBUK
let busyModeActive = false;
let busyModePeriods = [];

// 🔥 FUNGSI UNTUK MENGAMBIL DATA SERVICES DARI DOM
function loadServicesData() {
    console.log('📦 Loading services data from DOM...');
    
    const allSelects = document.querySelectorAll('.test-select');
    servicesData = [];
    
    allSelects.forEach(select => {
        const typeName = select.getAttribute('data-type');
        if (!typeName) return;
        
        const typeObj = {
            typeName: typeName,
            categories: []
        };
        
        const options = select.querySelectorAll('option[data-price]');
        const categoryMap = new Map();
        
        options.forEach(option => {
            if (!option.value) return;
            
            const price = option.getAttribute('data-price');
            const duration = option.getAttribute('data-duration');
            const method = option.getAttribute('data-method');
            const minSample = option.getAttribute('data-min-sample'); // 🔥 AMBIL MIN SAMPLE
            const name = option.getAttribute('data-name');
            
            console.log(`📊 Option: ${option.value}, minSample: ${minSample}`); // 🔥 LOGGING
            
            // Tentukan kategori dari teks option
            const optionText = option.textContent;
            let categoryName = 'Umum';
            
            if (optionText.includes('Beton')) categoryName = 'Beton';
            else if (optionText.includes('Aspal')) categoryName = 'Aspal';
            else if (optionText.includes('Agregat')) categoryName = 'Agregat';
            else if (optionText.includes('Tanah')) categoryName = 'Tanah';
            else if (optionText.includes('Besi')) categoryName = 'Besi / Baja';
            
            if (!categoryMap.has(categoryName)) {
                categoryMap.set(categoryName, {
                    categoryName: categoryName,
                    items: []
                });
            }
            
            categoryMap.get(categoryName).items.push({
                id: option.value,
                name: name || optionText.split(' (Rp')[0],
                sample: minSample + ' sample',
                duration: duration,
                price: price,
                method: method
            });
        });
        
        typeObj.categories = Array.from(categoryMap.values());
        servicesData.push(typeObj);
    });
    
    console.log('✅ Services data loaded:', servicesData.length, 'types');
}

// 🔴 FUNGSI UNTUK MENGAMBIL DATA MODE SIBUK
function loadBusyModeData() {
    const dataElement = document.getElementById('busy-mode-data');
    if (dataElement) {
        busyModeActive = dataElement.dataset.active === 'true';
        try {
            if (dataElement.dataset.periods) {
                busyModePeriods = JSON.parse(dataElement.dataset.periods) || [];
            }
        } catch (e) {
            console.error('Error parsing busy mode periods:', e);
        }
        console.log('📅 Busy mode active:', busyModeActive, 'Periods:', busyModePeriods);
    }
}

// 🔴 FUNGSI UNTUK MENDAPATKAN TAMBAHAN HARI DARI MODE SIBUK
function getBusyModeExtraDays() {
    if (!busyModeActive || busyModePeriods.length === 0) {
        return 0;
    }
    
    const today = new Date();
    let extraDays = 0;
    
    // Hitung total hari dari periode sibuk yang aktif
    for (const period of busyModePeriods) {
        const start = new Date(period.tanggal_mulai);
        const end = new Date(period.tanggal_selesai);
        
        // Jika periode masih berlangsung atau akan datang
        if (end >= today) {
            // Hitung sisa hari dari periode ini
            const periodEnd = end > today ? end : today;
            const daysInPeriod = Math.ceil((periodEnd - today) / (1000 * 60 * 60 * 24)) + 1;
            extraDays += Math.max(0, daysInPeriod);
        }
    }
    
    console.log('📅 Busy mode extra days:', extraDays);
    return extraDays;
}

// Fungsi untuk mencari detail service berdasarkan ID
function getServiceDetails(serviceId) {
    console.log('🔍 Mencari service dengan ID:', serviceId);
    
    for (const type of servicesData) {
        for (const category of type.categories) {
            for (const item of category.items) {
                if (item.id == serviceId) {
                    console.log('✅ Service ditemukan:', item);
                    return {
                        serviceId: item.id,
                        serviceName: item.name,
                        price: item.price,
                        method: item.method,
                        testTypeId: getTestTypeId(type.typeName),
                        testCategoryId: getTestCategoryId(category.categoryName)
                    };
                }
            }
        }
    }
    console.log('❌ Service tidak ditemukan untuk ID:', serviceId);
    return null;
}

// Fungsi untuk mendapatkan test_type_id berdasarkan nama type
function getTestTypeId(typeName) {
    // Mapping sesuai database: 1 = PENGUJIAN BAHAN, 2 = PENGUJIAN KONSTRUKSI
    return typeName === 'PENGUJIAN BAHAN' ? 1 : 2;
}

// Fungsi untuk mendapatkan test_category_id berdasarkan nama kategori
function getTestCategoryId(categoryName) {
    // Mapping kategori (contoh, sesuaikan dengan database Anda)
    const categoryMap = {
        'Agregat': 1,
        'Tanah': 2,
        'Besi / Baja': 3,
        'Mortar / Lainnya': 4,
        'Beton': 5,
        'Aspal': 6
    };
    return categoryMap[categoryName] || 0;
}

// Increment quantity (tombol +)
window.incrementQty = function() {
    console.log('➕ Increment button clicked');
    const qtyInput = document.getElementById('qtyInput');
    if (!qtyInput) {
        console.log('❌ qtyInput tidak ditemukan');
        return;
    }
    
    let currentVal = parseInt(qtyInput.value) || 1;
    qtyInput.value = currentVal + 1;
    
    // Update harga
    updatePriceFromCurrentQty();
};

// Decrement quantity (tombol -)
window.decrementQty = function() {
    console.log('➖ Decrement button clicked');
    const qtyInput = document.getElementById('qtyInput');
    if (!qtyInput) {
        console.log('❌ qtyInput tidak ditemukan');
        return;
    }
    
    let currentVal = parseInt(qtyInput.value) || 1;
    
    // Ambil minimal sample dari attribute
    let minSample = 1;
    const minSampleAttr = qtyInput.getAttribute('data-min');
    if (minSampleAttr) {
        minSample = parseInt(minSampleAttr) || 1;
    }
    
    console.log('Current:', currentVal, 'Min:', minSample);
    
    if (currentVal > minSample) {
        qtyInput.value = currentVal - 1;
        updatePriceFromCurrentQty();
    } else {
        console.log('Sudah minimal');
    }
};

// Fungsi update harga berdasarkan quantity saat ini
function updatePriceFromCurrentQty() {
    console.log('💰 Update harga dari quantity');
    
    const qtyInput = document.getElementById('qtyInput');
    const totalPriceEl = document.getElementById('totalPrice');
    
    if (!qtyInput || !totalPriceEl) return;
    
    // Cari select yang aktif
    const bahanSelect = document.querySelector('select[name="uji_bahan"]');
    const konstruksiSelect = document.querySelector('select[name="uji_konstruksi"]');
    
    let activeSelect = null;
    let activeSelectName = '';
    
    if (bahanSelect && bahanSelect.value !== "") {
        activeSelect = bahanSelect;
        activeSelectName = 'uji_bahan';
    } else if (konstruksiSelect && konstruksiSelect.value !== "") {
        activeSelect = konstruksiSelect;
        activeSelectName = 'uji_konstruksi';
    }
    
    if (!activeSelect) {
        totalPriceEl.innerText = 'Rp 0';
        return;
    }
    
    const selectedOption = activeSelect.options[activeSelect.selectedIndex];
    const price = parseInt(selectedOption.getAttribute('data-price')) || 0;
    const qty = parseInt(qtyInput.value) || 1;
    const total = price * qty;
    
    totalPriceEl.innerText = 'Rp ' + total.toLocaleString('id-ID');
    
    // Update hidden inputs untuk dikirim ke backend
    const priceAtTime = document.getElementById('priceAtTime');
    if (priceAtTime) priceAtTime.value = price;
    
    console.log('Harga diupdate:', total);
}

// Fungsi utama untuk update semua
function updateAll() {
    console.log('🔄 Update semua');
    
    const bahanSelect = document.querySelector('select[name="uji_bahan"]');
    const konstruksiSelect = document.querySelector('select[name="uji_konstruksi"]');
    
    console.log('📋 Bahan select:', bahanSelect?.value);
    console.log('📋 Konstruksi select:', konstruksiSelect?.value);
    
    let activeSelect = null;
    let activeSelectName = '';
    let selectedServiceId = null;
    
    if (bahanSelect && bahanSelect.value !== "") {
        activeSelect = bahanSelect;
        activeSelectName = 'uji_bahan';
        selectedServiceId = bahanSelect.value;
    } else if (konstruksiSelect && konstruksiSelect.value !== "") {
        activeSelect = konstruksiSelect;
        activeSelectName = 'uji_konstruksi';
        selectedServiceId = konstruksiSelect.value;
    }
    
    console.log('🎯 Active select:', activeSelectName, 'ID:', selectedServiceId);
    
    if (!activeSelect || !selectedServiceId) {
        // Reset semua
        document.getElementById('totalPrice').innerText = 'Rp 0';
        document.getElementById('timeEstimation').innerText = '-';
        
        const metodeUji = document.getElementById('metodeUji');
        if (metodeUji) metodeUji.value = '';
        
        // Reset hidden inputs
        document.getElementById('testTypeId').value = '';
        document.getElementById('testCategoryId').value = '';
        document.getElementById('serviceId').value = '';
        document.getElementById('methodAtTime').value = '';
        document.getElementById('priceAtTime').value = '0';
        
        // 🔥 Reset qtyInput min
        const qtyInput = document.getElementById('qtyInput');
        if (qtyInput) {
            qtyInput.min = 1;
            qtyInput.setAttribute('data-min', 1);
            qtyInput.value = 1;
        }
        
        return;
    }
    
    const selectedOption = activeSelect.options[activeSelect.selectedIndex];
    
    // Ambil data
    let price = parseInt(selectedOption.getAttribute('data-price')) || 0;
    let duration = parseInt(selectedOption.getAttribute('data-duration')) || 0;
    let method = selectedOption.getAttribute('data-method') || '-';
    
    // 🔥 AMBIL MIN SAMPLE DARI DATABASE (dari attribute data-min-sample)
    let minSampleNumber = parseInt(selectedOption.getAttribute('data-min-sample')) || 1;
    
    console.log('📊 Data dari option:', { price, duration, method, minSampleNumber });
    
    // Cari detail service dari data
    const serviceDetails = getServiceDetails(selectedServiceId);
    
    // Update hidden inputs
    if (serviceDetails) {
        document.getElementById('testTypeId').value = serviceDetails.testTypeId || '';
        document.getElementById('testCategoryId').value = serviceDetails.testCategoryId || '';
        document.getElementById('serviceId').value = serviceDetails.serviceId || '';
        document.getElementById('methodAtTime').value = serviceDetails.method || method;
        document.getElementById('priceAtTime').value = serviceDetails.price || price;
        console.log('✅ Menggunakan data dari serviceDetails');
    } else {
        // Fallback ke data dari attribute
        document.getElementById('serviceId').value = selectedServiceId;
        document.getElementById('methodAtTime').value = method;
        document.getElementById('priceAtTime').value = price;
        console.log('⚠️ Fallback ke data attribute');
    }
    
    // 🔥 UPDATE QUANTITY INPUT DENGAN MIN SAMPLE DARI DATABASE
    const qtyInput = document.getElementById('qtyInput');
    if (qtyInput) {
        qtyInput.min = minSampleNumber;
        qtyInput.setAttribute('data-min', minSampleNumber);
        qtyInput.value = minSampleNumber; // Set ke nilai minimal
        console.log('📊 Quantity min dari database:', minSampleNumber);
    }
    
    // Update metode uji
    const metodeUji = document.getElementById('metodeUji');
    if (metodeUji) metodeUji.value = method;
    
    // Hitung total
    const total = price * minSampleNumber;
    document.getElementById('totalPrice').innerText = 'Rp ' + total.toLocaleString('id-ID');
    document.getElementById('timeEstimation').innerText = duration + ' Hari';
    
    // Update estimasi selesai (dengan mode sibuk)
    updateCompletionDate(duration);
}

// 🔴 FUNGSI UPDATE ESTIMASI SELESAI - DIMODIFIKASI UNTUK MENAMBAHKAN BUSY MODE
function updateCompletionDate(duration) {
    const tanggalSampel = document.getElementById('tanggalSampel');
    const completionDateEl = document.getElementById('completionDate');
    const totalDaysEl = document.getElementById('totalDays');
    const busyModeInfo = document.getElementById('busyModeInfo');
    
    if (!tanggalSampel || !completionDateEl || !totalDaysEl) return;
    
    const tanggalValue = tanggalSampel.value;
    
    // 🔴 PERBAIKI TYPO: 'tangalValue' → 'tanggalValue'
    if (!tanggalValue) {
        completionDateEl.innerText = '-';
        totalDaysEl.innerText = '0';
        if (busyModeInfo) busyModeInfo.style.display = 'none';
        return;
    }
    
    // Hitung total hari dengan tambahan mode sibuk
    const extraDays = getBusyModeExtraDays();
    const totalHari = 3 + 7 + (parseInt(duration) || 0) + extraDays;
    
    const startDate = new Date(tanggalValue);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + totalHari);
    
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = endDate.toLocaleDateString('id-ID', options);
    
    completionDateEl.innerText = formattedDate;
    totalDaysEl.innerText = totalHari;
    
    // Tampilkan info mode sibuk jika aktif
    if (busyModeInfo) {
        if (busyModeActive && extraDays > 0) {
            busyModeInfo.style.display = 'inline';
        } else {
            busyModeInfo.style.display = 'none';
        }
    }
}

// Fungsi ketika select berubah
window.onSelectChange = function(selectElement) {
    console.log('🎯 Select berubah:', selectElement.name);
    
    // Reset select lainnya
    const allSelects = document.querySelectorAll('.test-select');
    for (let i = 0; i < allSelects.length; i++) {
        if (allSelects[i] !== selectElement) {
            allSelects[i].value = "";
        }
    }
    
    updateAll();
};

// ==================== INISIALISASI ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ Handler siap - Versi database + Mode Sibuk');
    
    // 🔥 LOAD DATA SERVICES DARI DOM
    loadServicesData();
    
    // 🔴 LOAD DATA MODE SIBUK
    loadBusyModeData();
    
    // Set default date
    const requestDateInput = document.getElementById('request-date');
    if (requestDateInput) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        requestDateInput.value = today.toLocaleDateString('id-ID', options);
    }
    
    // Set default untuk tanggal sampel (hari ini)
    const tanggalSampel = document.getElementById('tanggalSampel');
    if (tanggalSampel && !tanggalSampel.value) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        tanggalSampel.value = `${year}-${month}-${day}`;
    }
    
    // CEK TOMBOL
    const minusBtn = document.getElementById('minusBtn');
    const plusBtn = document.getElementById('plusBtn');
    
    console.log('Tombol minus:', minusBtn ? 'ADA' : 'TIDAK ADA');
    console.log('Tombol plus:', plusBtn ? 'ADA' : 'TIDAK ADA');
    
    // Event untuk input manual quantity
    const qtyInput = document.getElementById('qtyInput');
    if (qtyInput) {
        qtyInput.addEventListener('input', function() {
            let val = parseInt(this.value) || 1;
            const minSample = parseInt(this.getAttribute('data-min')) || 1;
            
            if (val < minSample) {
                val = minSample;
                this.value = val;
            }
            if (val < 1) {
                val = 1;
                this.value = 1;
            }
            
            updatePriceFromCurrentQty();
        });
    }
    
    // Event untuk tanggal sampel
    if (tanggalSampel) {
        tanggalSampel.addEventListener('change', function() {
            const duration = document.getElementById('timeEstimation').innerText;
            const days = duration !== '-' ? parseInt(duration) : 0;
            updateCompletionDate(days);
        });
    }
    
    // Preview file
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            const fileName = this.files[0] ? this.files[0].name : "Pilih file";
            const label = this.nextElementSibling;
            if (label && label.tagName === 'P') {
                label.innerText = fileName;
            }
        });
    });
    
    // Set default untuk jumlah sample
    const jumlahSampleAngka = document.getElementById('jumlahSampleAngka');
    if (jumlahSampleAngka) {
        jumlahSampleAngka.addEventListener('change', function() {
            const qty = document.getElementById('qtyInput');
            if (qty) {
                qty.value = this.value;
                updatePriceFromCurrentQty();
            }
        });
    }
    
    // Handle form submit
    document.getElementById('applicationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // CEK APAKAH SUDAH DISUBMIT
        if (this.dataset.submitting === 'true') {
            console.log('⚠️ Form sudah disubmit, menunggu...');
            return;
        }
        
        // TANDAI SEDANG DISUBMIT
        this.dataset.submitting = 'true';
        
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        // Disable button
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
        
        try {
            const formData = new FormData(this);
            const response = await fetch('/user/submission', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Redirect ke history
                window.location.href = '/user/history?success=true&message=Pengajuan+berhasil+dikirim';
            } else {
                alert('Error: ' + (result.message || 'Gagal mengirim pengajuan'));
                
                // Reset status
                this.dataset.submitting = 'false';
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
            
        } catch (error) {
            console.error('❌ Error:', error);
            alert('Terjadi kesalahan saat mengirim data');
            
            // Reset status
            this.dataset.submitting = 'false';
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    });
    
    // Initial update
    setTimeout(updateAll, 500);
});