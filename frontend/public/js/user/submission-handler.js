/**
 * UPTD Lab Submission Handler
 * VERSI FIX - Data sesuai database
 */

// ==================== FUNGSI GLOBAL ====================

// Data services dari backend (disimpan di global)
let servicesData = [];

// Fungsi untuk mengambil data services dari API/database
async function loadServicesData() {
    try {
        // Ambil dari atribut data di HTML jika ada
        const servicesElement = document.getElementById('services-data');
        if (servicesElement && servicesElement.dataset.services) {
            servicesData = JSON.parse(servicesElement.dataset.services);
            console.log('✅ Services data loaded from DOM:', servicesData.length);
        } else {
            // Fallback: fetch dari API
            const response = await fetch('/api/services');
            const result = await response.json();
            if (result.success) {
                servicesData = result.data;
                console.log('✅ Services data loaded from API:', servicesData.length);
            }
        }
    } catch (error) {
        console.error('❌ Error loading services data:', error);
    }
}

// Fungsi untuk mencari detail service berdasarkan ID
function getServiceDetails(serviceId) {
    for (const type of servicesData) {
        for (const category of type.categories) {
            for (const item of category.items) {
                if (item.id == serviceId) {
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
        
        const hint = document.getElementById('minSampleHint');
        const data = document.getElementById('minSampleData');
        if (hint && data) {
            hint.style.display = 'flex';
            data.style.display = 'none';
        }
        return;
    }
    
    const selectedOption = activeSelect.options[activeSelect.selectedIndex];
    
    // Ambil data
    let price = parseInt(selectedOption.getAttribute('data-price')) || 0;
    let duration = parseInt(selectedOption.getAttribute('data-duration')) || 0;
    let method = selectedOption.getAttribute('data-method') || '-';
    let minSampleText = selectedOption.getAttribute('data-min-sample') || '1';
    let itemName = selectedOption.getAttribute('data-name') || selectedOption.textContent.split(' (Rp')[0];
    
    // Ambil angka dari teks minimal sample
    let minSampleNumber = 1;
    const match = minSampleText.match(/\d+/);
    if (match) {
        minSampleNumber = parseInt(match[0]);
    }
    
    console.log('Data:', { price, duration, method, minSampleText, minSampleNumber });
    
    // Cari detail service dari data
    const serviceDetails = getServiceDetails(selectedServiceId);
    
    // Update hidden inputs
    if (serviceDetails) {
        document.getElementById('testTypeId').value = serviceDetails.testTypeId || '';
        document.getElementById('testCategoryId').value = serviceDetails.testCategoryId || '';
        document.getElementById('serviceId').value = serviceDetails.serviceId || '';
        document.getElementById('methodAtTime').value = serviceDetails.method || method;
        document.getElementById('priceAtTime').value = serviceDetails.price || price;
    } else {
        // Fallback ke data dari attribute
        document.getElementById('serviceId').value = selectedServiceId;
        document.getElementById('methodAtTime').value = method;
        document.getElementById('priceAtTime').value = price;
    }
    
    // Update quantity input
    const qtyInput = document.getElementById('qtyInput');
    if (qtyInput) {
        qtyInput.min = minSampleNumber;
        qtyInput.setAttribute('data-min', minSampleNumber);
        qtyInput.value = minSampleNumber;
    }
    
    // Update metode uji
    const metodeUji = document.getElementById('metodeUji');
    if (metodeUji) metodeUji.value = method;
    
    // Update card minimal sample
    const hint = document.getElementById('minSampleHint');
    const data = document.getElementById('minSampleData');
    const full = document.getElementById('minSampleFull');
    const desc = document.getElementById('minSampleDesc');
    
    if (hint && data && full && desc) {
        hint.style.display = 'none';
        data.style.display = 'flex';
        full.innerText = minSampleText;
        desc.innerText = itemName;
    }
    
    // Hitung total
    const total = price * minSampleNumber;
    document.getElementById('totalPrice').innerText = 'Rp ' + total.toLocaleString('id-ID');
    document.getElementById('timeEstimation').innerText = duration + ' Hari';
    
    // Update estimasi selesai
    updateCompletionDate(duration);
}

// Fungsi update estimasi selesai
function updateCompletionDate(duration) {
    const tanggalSampel = document.getElementById('tanggalSampel');
    const completionDateEl = document.getElementById('completionDate');
    const totalDaysEl = document.getElementById('totalDays');
    
    if (!tanggalSampel || !completionDateEl || !totalDaysEl) return;
    
    const tanggalValue = tanggalSampel.value;
    
    if (!tanggalValue) {
        completionDateEl.innerText = '-';
        totalDaysEl.innerText = '0';
        return;
    }
    
    const totalHari = 3 + 7 + (parseInt(duration) || 0);
    const startDate = new Date(tanggalValue);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + totalHari);
    
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = endDate.toLocaleDateString('id-ID', options);
    
    completionDateEl.innerText = formattedDate;
    totalDaysEl.innerText = totalHari;
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
    console.log('✅ Handler siap - Versi database');
    
    // Load data services
    await loadServicesData();
    
    // Set default date
    const requestDateInput = document.getElementById('request-date');
    if (requestDateInput) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        requestDateInput.value = today.toLocaleDateString('id-ID', options);
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
    const tanggalSampel = document.getElementById('tanggalSampel');
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
    
    // Di submission-handler.js - TAMBAHKAN CEK DUPLIKASI
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