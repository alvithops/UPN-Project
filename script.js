// Data Storage Keys
const STORAGE_KEYS = {
    PRODUCTS: 'sales_products',
    HISTORY: 'sales_history'
};

// Global Data
let products = [];
let activityHistory = [];

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderProducts();
    renderHistory();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Form tambah barang
    document.getElementById('productForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addNewProduct();
    });

    // Reset semua penjualan
    document.getElementById('resetAllBtn').addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin mereset semua penjualan hari ini? Data barang akan tetap ada, tetapi total penjualan akan direset ke 0.')) {
            resetAllSales();
        }
    });

    // Hapus riwayat
    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        if (confirm('Hapus semua riwayat aktivitas?')) {
            clearHistory();
        }
    });
}

// Add New Product
function addNewProduct() {
    const productName = document.getElementById('productName').value.trim();
    const dailyTarget = parseFloat(document.getElementById('dailyTarget').value);

    // Validasi input
    if (!productName) {
        showNotification('Nama barang tidak boleh kosong!', 'error');
        return;
    }

    if (isNaN(dailyTarget) || dailyTarget <= 0) {
        showNotification('Target penjualan harus lebih dari 0!', 'error');
        return;
    }

    // Cek apakah barang sudah ada
    if (products.some(p => p.name.toLowerCase() === productName.toLowerCase())) {
        showNotification('Barang dengan nama tersebut sudah ada!', 'error');
        return;
    }

    // Create new product
    const newProduct = {
        id: Date.now(),
        name: productName,
        target: dailyTarget,
        currentSales: 0,
        createdAt: new Date().toISOString()
    };

    products.push(newProduct);
    saveProducts();
    renderProducts();
    
    // Add to history
    addToHistory(`Menambahkan barang baru: ${productName} (Target: ${dailyTarget} unit)`, 'success');
    
    // Clear form
    document.getElementById('productForm').reset();
    
    showNotification(`Barang "${productName}" berhasil ditambahkan!`, 'success');
}

// Add Sales to Product
function addSales(productId, amount) {
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        showNotification('Produk tidak ditemukan!', 'error');
        return;
    }

    // Validasi amount
    if (isNaN(amount) || amount <= 0) {
        showNotification('Jumlah penjualan harus lebih dari 0!', 'error');
        return;
    }

    const oldSales = product.currentSales;
    product.currentSales += amount;
    
    saveProducts();
    renderProducts();
    
    // Calculate percentage for history
    const percentage = ((product.currentSales / product.target) * 100).toFixed(1);
    addToHistory(`${product.name}: Menambah penjualan ${amount} unit (Total: ${product.currentSales}/${product.target} unit - ${percentage}%)`, 'info');
    
    showNotification(`Berhasil menambah penjualan ${product.name} sebanyak ${amount} unit!`, 'success');
    
    // Check if target achieved
    const oldPercentage = (oldSales / product.target) * 100;
    const newPercentage = (product.currentSales / product.target) * 100;
    
    if (oldPercentage < 100 && newPercentage >= 100) {
        showNotification(`🎉 Selamat! Target penjualan ${product.name} telah TERCAPAI! 🎉`, 'success');
        addToHistory(`✨ ${product.name} mencapai target penjualan! ✨`, 'success');
    } else if (oldPercentage < 80 && newPercentage >= 80 && newPercentage < 100) {
        showNotification(`⚡ ${product.name} hampir mencapai target! (${newPercentage}%)`, 'info');
    }
}

// Reset Single Product Sales
function resetProductSales(productId) {
    const product = products.find(p => p.id === productId);
    if (product && confirm(`Reset penjualan untuk "${product.name}"?`)) {
        product.currentSales = 0;
        saveProducts();
        renderProducts();
        addToHistory(`Reset penjualan ${product.name} ke 0`, 'warning');
        showNotification(`Penjualan ${product.name} telah direset`, 'info');
    }
}

// Reset All Sales
function resetAllSales() {
    products.forEach(product => {
        product.currentSales = 0;
    });
    saveProducts();
    renderProducts();
    addToHistory('Reset semua penjualan harian', 'warning');
    showNotification('Semua penjualan telah direset', 'info');
}

// Delete Product
function deleteProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (product && confirm(`Hapus barang "${product.name}"?`)) {
        products = products.filter(p => p.id !== productId);
        saveProducts();
        renderProducts();
        addToHistory(`Menghapus barang: ${product.name}`, 'error');
        showNotification(`Barang "${product.name}" telah dihapus`, 'info');
    }
}

// Calculate Status and Percentage
function calculateStatus(currentSales, target) {
    const percentage = (currentSales / target) * 100;
    let status = '';
    let statusClass = '';
    
    if (percentage < 80) {
        status = 'Belum Tercapai';
        statusClass = 'red';
    } else if (percentage >= 80 && percentage < 100) {
        status = 'Hampir Tercapai';
        statusClass = 'yellow';
    } else {
        status = 'Target Tercapai';
        statusClass = 'green';
    }
    
    return {
        percentage: Math.min(percentage, 100).toFixed(1),
        status: status,
        statusClass: statusClass,
        progressClass: percentage < 80 ? 'low' : (percentage < 100 ? 'medium' : 'high')
    };
}

// Render Products to Dashboard
function renderProducts() {
    const container = document.getElementById('productsContainer');
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>Belum Ada Barang</h3>
                <p>Silakan tambah barang terlebih dahulu menggunakan form di atas</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(product => {
        const { percentage, status, statusClass, progressClass } = calculateStatus(product.currentSales, product.target);
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-header">
                    <div class="product-name">${escapeHtml(product.name)}</div>
                    <div class="product-actions">
                        <button class="icon-btn" onclick="resetProductSales(${product.id})" title="Reset Penjualan">
                            🔄
                        </button>
                        <button class="icon-btn" onclick="deleteProduct(${product.id})" title="Hapus Barang">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="product-body">
                    <div class="stat-item">
                        <span class="stat-label">Target Harian:</span>
                        <span class="stat-value">${formatNumber(product.target)} unit</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Penjualan Hari Ini:</span>
                        <span class="stat-value ${percentage >= 100 ? 'success' : (percentage >= 80 ? 'warning' : 'danger')}">
                            ${formatNumber(product.currentSales)} unit
                        </span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Persentase:</span>
                        <span class="stat-value">${percentage}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Status:</span>
                        <span class="status-badge ${statusClass}">${status}</span>
                    </div>
                    
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill ${progressClass}" style="width: ${percentage}%">
                                ${percentage}%
                            </div>
                        </div>
                    </div>
                    
                    <div class="add-sales-section">
                        <div class="stat-label" style="margin-bottom: 8px;">Tambah Penjualan:</div>
                        <div class="add-sales-form">
                            <input type="number" id="salesInput-${product.id}" class="add-sales-input" 
                                   placeholder="Jumlah unit" min="1" step="1">
                            <button class="btn-add-sales" onclick="addSalesFromInput(${product.id})">
                                + Tambah
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Helper function to add sales from input
function addSalesFromInput(productId) {
    const input = document.getElementById(`salesInput-${productId}`);
    const amount = parseFloat(input.value);
    
    if (isNaN(amount) || amount <= 0) {
        showNotification('Masukkan jumlah penjualan yang valid (lebih dari 0)!', 'error');
        return;
    }
    
    addSales(productId, amount);
    input.value = ''; // Clear input after adding
}

// Add to History
function addToHistory(message, type = 'info') {
    const historyItem = {
        id: Date.now(),
        message: message,
        type: type,
        timestamp: new Date().toLocaleString('id-ID')
    };
    
    activityHistory.unshift(historyItem); // Add to beginning
    
    // Keep only last 50 history items
    if (activityHistory.length > 50) {
        activityHistory = activityHistory.slice(0, 50);
    }
    
    saveHistory();
    renderHistory();
}

// Render History
function renderHistory() {
    const historyContainer = document.getElementById('historyList');
    
    if (activityHistory.length === 0) {
        historyContainer.innerHTML = '<div class="empty-history">Belum ada aktivitas</div>';
        return;
    }
    
    historyContainer.innerHTML = activityHistory.map(item => `
        <div class="history-item">
            <div>
                <strong>${getHistoryIcon(item.type)}</strong> ${escapeHtml(item.message)}
            </div>
            <div class="history-time">📅 ${item.timestamp}</div>
        </div>
    `).join('');
}

// Get History Icon based on type
function getHistoryIcon(type) {
    switch(type) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        default: return '📝';
    }
}

// Clear History
function clearHistory() {
    activityHistory = [];
    saveHistory();
    renderHistory();
    showNotification('Riwayat berhasil dihapus', 'info');
}

// Show Notification Toast
function showNotification(message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    toast.textContent = message;
    toast.className = `toast-notification ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Format Number with thousand separator
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Save Products to LocalStorage
function saveProducts() {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

// Save History to LocalStorage
function saveHistory() {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(activityHistory));
}

// Load Data from LocalStorage
function loadData() {
    // Load products
    const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (storedProducts) {
        products = JSON.parse(storedProducts);
    } else {
        // Sample data for demonstration
        products = [
            {
                id: 1,
                name: 'Kopi Arabica',
                target: 100,
                currentSales: 75,
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                name: 'Teh Hijau',
                target: 80,
                currentSales: 82,
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                name: 'Susu Kedelai',
                target: 50,
                currentSales: 35,
                createdAt: new Date().toISOString()
            }
        ];
        saveProducts();
    }
    
    // Load history
    const storedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (storedHistory) {
        activityHistory = JSON.parse(storedHistory);
    } else {
        activityHistory = [
            {
                id: Date.now(),
                message: 'Selamat datang di Dashboard Penjualan!',
                type: 'info',
                timestamp: new Date().toLocaleString('id-ID')
            }
        ];
        saveHistory();
    }
}

// Make functions available globally for inline event handlers
window.addSalesFromInput = addSalesFromInput;
window.resetProductSales = resetProductSales;
window.deleteProduct = deleteProduct;