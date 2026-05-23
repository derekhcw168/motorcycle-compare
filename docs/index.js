// State Management
let motorcyclesData = [];
let filteredData = [];
let compareList = [];

// Global Subsidy Config
let subsidyConfig = {
    city: 'none',
    hasOldScooter: false
};

// AI Wizard State
let wizardAnswers = {
    purpose: '',
    budget: '',
    priorities: []
};
let currentWizardStep = 1;

// DOM Elements
const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const resultsCount = document.getElementById('results-count');

// Stats Elements
const statBrands = document.getElementById('stat-brands');
const statModels = document.getElementById('stat-models');
const statLowPrice = document.getElementById('stat-low-price');
const lastUpdateTime = document.getElementById('last-update-time');

// Compare Bar Elements
const compareBar = document.getElementById('compare-bar');
const compareItemsList = document.getElementById('compare-items-list');
const compareBadge = document.getElementById('compare-badge');
const clearCompareBtn = document.getElementById('clear-compare-btn');
const triggerCompareBtn = document.getElementById('trigger-compare-btn');

// Modals
const compareModal = document.getElementById('compare-modal');
const closeCompareModal = document.getElementById('close-compare-modal');
const compareTableElement = document.getElementById('compare-table-element');

const aiWizardBtn = document.getElementById('ai-wizard-btn');
const aiWizardModal = document.getElementById('ai-wizard-modal');
const closeWizardModal = document.getElementById('close-wizard-modal');
const wizardPrevBtn = document.getElementById('wizard-prev-btn');
const wizardNextBtn = document.getElementById('wizard-next-btn');
const wizardSubmitBtn = document.getElementById('wizard-submit-btn');

const aiResultModal = document.getElementById('ai-result-modal');
const closeResultModal = document.getElementById('close-result-modal');
const closeResultModalBtn = document.getElementById('close-result-modal-btn');
const restartWizardBtn = document.getElementById('restart-wizard-btn');
const aiRecommendationsList = document.getElementById('ai-recommendations-list');

// New Feature Modals & Elements
const detailModal = document.getElementById('detail-modal');
const closeDetailModal = document.getElementById('close-detail-modal');
const subsidyModal = document.getElementById('subsidy-modal');
const closeSubsidyModal = document.getElementById('close-subsidy-modal');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchMotorcycles();
    setupFilters();
    setupCompareEvents();
    setupModalEvents();
    setupWizardEvents();
    setupThemeToggle();
    setupDatabaseRefresh();
    setupQuickTags();
    setupTcoEvents();
    setupDiffToggleEvent();
});

// Fetch Data from API
async function fetchMotorcycles() {
    try {
        const response = await fetch('./data/motorcycles.json');
        if (!response.ok) throw new Error('Failed to fetch data');
        
        motorcyclesData = await response.json();
        filteredData = [...motorcyclesData];
        
        updateStats();
        renderProducts();
        updateResultsCount();
    } catch (error) {
        console.error('Error fetching motorcycles:', error);
        productGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fa-solid fa-triangle-exclamation text-warning" style="font-size: 3rem;"></i>
                <p>載入失敗，請確認後端服務是否已啟動。</p>
            </div>
        `;
    }
}

// Update Header Statistics
function updateStats() {
    if (motorcyclesData.length === 0) return;
    
    // Brand Count
    const brands = new Set(motorcyclesData.map(b => b.brand));
    statBrands.textContent = `${brands.size} 主流`;
    
    // Model Count
    statModels.textContent = `${motorcyclesData.length} 款`;
    
    // Lowest Price
    const validPrices = motorcyclesData.map(b => b.price).filter(p => p > 0);
    if (validPrices.length > 0) {
        const lowest = Math.min(...validPrices);
        statLowPrice.textContent = `NT$ ${lowest.toLocaleString()}`;
    }
    
    // Last Update Time
    if (motorcyclesData[0] && motorcyclesData[0].last_updated) {
        lastUpdateTime.innerHTML = `<i class="fa-solid fa-clock"></i> 價格更新時間：${motorcyclesData[0].last_updated}`;
    }
}

// Calculate Subsidy amount for a specific motorcycle
function calculateSubsidy(bike) {
    let amount = 0;
    
    if (subsidyConfig.hasOldScooter) {
        // Base cargo tax reduction
        amount += 4000;
        // Base EPA environmental protection subsidy
        amount += 2000;
        
        // City additional environmental protection subsidy
        switch (subsidyConfig.city) {
            case 'taipei':
                amount += 6000;
                break;
            case 'new_taipei':
                amount += 4000;
                break;
            case 'taichung':
                amount += 3000;
                break;
            case 'kaohsiung':
                amount += 4000;
                break;
            case 'none':
            default:
                amount += 2000; // Other cities average
                break;
        }
    }
    
    return amount;
}

// Render Products Grid
function renderProducts() {
    if (filteredData.length === 0) {
        productGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fa-solid fa-magnifying-glass-minus" style="font-size: 3rem; color: var(--text-muted);"></i>
                <p>找不到符合條件的車款，請嘗試調整篩選條件。</p>
            </div>
        `;
        return;
    }
    
    productGrid.innerHTML = '';
    
    filteredData.forEach(bike => {
        const subsidy = calculateSubsidy(bike);
        const finalPrice = Math.max(0, bike.price - subsidy);
        const monthlyInstallment = Math.round(finalPrice / 24);
        
        const isChecked = compareList.includes(bike.id) ? 'checked' : '';
        
        // Define price source elements
        let sourceBadgeHtml = '';
        let origPriceLabel = '原始售價';
        let actionBtnText = '前往購買';
        let actionBtnIcon = 'fa-cart-shopping';
        
        if (bike.price_source === 'momo') {
            sourceBadgeHtml = `<span class="price-source-badge badge-momo">momo 價</span>`;
            origPriceLabel = 'momo 售價';
            actionBtnText = '前往 momo 購買';
            actionBtnIcon = 'fa-cart-shopping';
        } else if (bike.price_source === 'shopee') {
            sourceBadgeHtml = `<span class="price-source-badge badge-shopee">${bike.source_name || '蝦皮價'}</span>`;
            origPriceLabel = '蝦皮售價';
            actionBtnText = '前往蝦皮比價';
            actionBtnIcon = 'fa-bag-shopping';
        } else {
            sourceBadgeHtml = `<span class="price-source-badge badge-official">建議售價</span>`;
            origPriceLabel = '官方建議售價';
            actionBtnText = '前往官方網站';
            actionBtnIcon = 'fa-globe';
        }
        
        const card = document.createElement('div');
        card.className = 'product-card glass-panel';
        card.innerHTML = `
            <div class="card-header">
                <img src="${bike.source_image || bike.official_image}" alt="${bike.name}" class="card-img vehicle-detail-trigger" data-id="${bike.id}" onerror="this.src='https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&q=80'" style="cursor: pointer;">
                <span class="card-badge">${bike.cc_class}cc 級距</span>
                ${sourceBadgeHtml}
                <label class="card-compare-label">
                    <input type="checkbox" class="compare-checkbox" data-id="${bike.id}" ${isChecked}> 比較
                </label>
            </div>
            <div class="card-body">
                <span class="brand-label">${bike.brand}</span>
                <h3 class="card-title vehicle-detail-trigger" data-id="${bike.id}" style="cursor: pointer; transition: color var(--transition-fast);">${bike.name}</h3>
                
                <div class="specs-preview">
                    <div class="spec-item" title="油耗表現">
                        <i class="fa-solid fa-droplet"></i>
                        <span>${bike.fuel_efficiency} km/L (${bike.fuel_efficiency_level})</span>
                    </div>
                    <div class="spec-item" title="冷卻系統">
                        <i class="fa-solid fa-temperature-empty"></i>
                        <span>${bike.cooling}</span>
                    </div>
                    <div class="spec-item" title="煞車系統">
                        <i class="fa-solid fa-shield-halved"></i>
                        <span>${bike.has_abs ? 'ABS' : (bike.has_cbs ? 'CBS' : '一般碟鼓')}</span>
                    </div>
                    <div class="spec-item" title="座高">
                        <i class="fa-solid fa-arrows-up-down"></i>
                        <span>座高 ${bike.seat_height} mm</span>
                    </div>
                </div>
                
                <!-- Price info with real-time subsidy math -->
                <div class="price-block">
                    <div class="momo-orig-price">
                        <span>${origPriceLabel}</span>
                        <a href="${bike.source_url || '#'}" target="_blank">
                            NT$ ${bike.price.toLocaleString()} <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                    </div>
                    <div class="final-price-wrapper">
                        <span class="final-price-label">${subsidy > 0 ? '補助後估算 <a href="#" class="subsidy-detail-link" data-id="' + bike.id + '" style="font-size: 0.75rem; color: var(--color-primary); text-decoration: underline; margin-left: 0.3rem;"><i class="fa-solid fa-calculator"></i> 明細</a>' : '促銷優惠價'}</span>
                        <span class="final-price-num">NT$ ${finalPrice.toLocaleString()}</span>
                    </div>
                    <div class="installment-price">
                        <span>分期付款 (24期 0利率)</span>
                        <span>NT$ ${monthlyInstallment.toLocaleString()} / 月</span>
                    </div>
                </div>
                
                <div class="card-footer">
                    <a href="${bike.source_url || '#'}" target="_blank" class="btn btn-secondary btn-small">
                        <i class="fa-solid ${actionBtnIcon}"></i> ${actionBtnText}
                    </a>
                </div>
            </div>
        `;
        
        productGrid.appendChild(card);
    });
    
    // Bind comparison checkboxes
    const checkboxes = productGrid.querySelectorAll('.compare-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
            const bikeId = e.target.getAttribute('data-id');
            if (e.target.checked) {
                addToCompare(bikeId);
            } else {
                removeFromCompare(bikeId);
            }
        });
    });

    // Bind detail triggers
    const detailTriggers = productGrid.querySelectorAll('.vehicle-detail-trigger');
    detailTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const bikeId = trigger.getAttribute('data-id');
            openVehicleDetail(bikeId);
        });
    });

    // Bind subsidy detail links
    const subsidyLinks = productGrid.querySelectorAll('.subsidy-detail-link');
    subsidyLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const bikeId = link.getAttribute('data-id');
            openSubsidyDetail(bikeId);
        });
    });
}

// Setup Event Listeners for Filters
function setupFilters() {
    // Search input
    searchInput.addEventListener('input', () => {
        applyFilters();
    });
    
    // Chip selections (brand, engine class, safety)
    setupChips('brand-chips', 'brand');
    setupChips('cc-chips', 'cc_class');
    setupChips('safety-chips', 'safety');
    
    // Sort selection
    sortSelect.addEventListener('change', () => {
        applyFilters();
    });
    
    // Dynamically insert global subsidy options at the top of the filters
    const filterCard = document.querySelector('.filter-card');
    const filterGrid = document.querySelector('.filter-grid');
    
    const subsidyPanel = document.createElement('div');
    subsidyPanel.className = 'subsidy-controls';
    subsidyPanel.innerHTML = `
        <div class="control-item">
            <label><i class="fa-solid fa-map-location-dot"></i> 戶籍設籍縣市 (影響地方補助)</label>
            <select id="subsidy-city">
                <option value="none">其他縣市 (平均補助)</option>
                <option value="taipei">台北市 (高補助)</option>
                <option value="new_taipei">新北市</option>
                <option value="taichung">台中市</option>
                <option value="kaohsiung">高雄市</option>
            </select>
        </div>
        <div class="control-item" style="justify-content: flex-end;">
            <label class="control-checkbox">
                <input type="checkbox" id="subsidy-old-scooter">
                <span>我有舊機車要汰舊換新 (報廢)</span>
            </label>
        </div>
    `;
    
    filterCard.insertBefore(subsidyPanel, filterGrid.nextSibling);
    
    // Subsidy events
    document.getElementById('subsidy-city').addEventListener('change', (e) => {
        subsidyConfig.city = e.target.value;
        renderProducts();
    });
    document.getElementById('subsidy-old-scooter').addEventListener('change', (e) => {
        subsidyConfig.hasOldScooter = e.target.checked;
        renderProducts();
    });
}

function setupChips(containerId, stateKey) {
    const chips = document.getElementById(containerId).querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            applyFilters();
        });
    });
}

// Filter and Sort Data
function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    
    // Get active chip values
    const brandChip = document.getElementById('brand-chips').querySelector('.chip.active').getAttribute('data-value');
    const ccChip = document.getElementById('cc-chips').querySelector('.chip.active').getAttribute('data-value');
    const safetyChip = document.getElementById('safety-chips').querySelector('.chip.active').getAttribute('data-value');
    
    filteredData = motorcyclesData.filter(bike => {
        // Brand filter
        if (brandChip !== 'all' && bike.brand !== brandChip) return false;
        
        // CC Class filter
        if (ccChip !== 'all') {
            const ccVal = parseInt(ccChip);
            if (ccVal === 125 && bike.cc_class !== 125) return false;
            if (ccVal === 150 && bike.cc_class < 150) return false;
        }
        
        // Safety filter
        if (safetyChip !== 'all') {
            if (safetyChip === 'abs' && !bike.has_abs) return false;
            if (safetyChip === 'tcs' && !bike.has_tcs) return false;
            if (safetyChip === 'cbs' && !bike.has_cbs) return false;
        }
        
        // Search query filter
        if (query) {
            const matchName = bike.name.toLowerCase().includes(query);
            const matchBrand = bike.brand.toLowerCase().includes(query);
            const matchEngine = bike.engine_type.toLowerCase().includes(query);
            const matchSelling = bike.selling_points.some(p => p.toLowerCase().includes(query));
            
            if (!matchName && !matchBrand && !matchEngine && !matchSelling) return false;
        }
        
        return true;
    });
    
    // Sort logic
    const sortVal = sortSelect.value;
    if (sortVal === 'price-asc') {
        filteredData.sort((a, b) => a.price - b.price);
    } else if (sortVal === 'price-desc') {
        filteredData.sort((a, b) => b.price - a.price);
    } else if (sortVal === 'fuel-desc') {
        filteredData.sort((a, b) => b.fuel_efficiency - a.fuel_efficiency);
    } else if (sortVal === 'weight-asc') {
        filteredData.sort((a, b) => a.weight - b.weight);
    } else {
        // Default sort (original catalog order)
        const idOrder = motorcyclesData.map(b => b.id);
        filteredData.sort((a, b) => idOrder.indexOf(a.id) - idOrder.indexOf(b.id));
    }
    
    renderProducts();
    updateResultsCount();
}

function updateResultsCount() {
    resultsCount.textContent = `共 ${filteredData.length} 款符合條件`;
}

// Comparison Bar Logic
function setupCompareEvents() {
    clearCompareBtn.addEventListener('click', () => {
        compareList = [];
        updateCompareBar();
        renderProducts();
    });
    
    triggerCompareBtn.addEventListener('click', () => {
        if (compareList.length === 0) return;
        renderComparisonTable();
        updateTcoCalculator();
        applyDiffToggle();
        compareModal.classList.remove('hidden');
    });
}

function addToCompare(bikeId) {
    if (compareList.includes(bikeId)) return;
    
    if (compareList.length >= 4) {
        alert('最多只能同時比較 4 款車！');
        // Uncheck the checkbox
        const cb = productGrid.querySelector(`.compare-checkbox[data-id="${bikeId}"]`);
        if (cb) cb.checked = false;
        return;
    }
    
    compareList.push(bikeId);
    updateCompareBar();
}

function removeFromCompare(bikeId) {
    compareList = compareList.filter(id => id !== bikeId);
    updateCompareBar();
    
    // Also uncheck in DOM if checked
    const cb = productGrid.querySelector(`.compare-checkbox[data-id="${bikeId}"]`);
    if (cb && cb.checked) cb.checked = false;
}

function updateCompareBar() {
    compareBadge.textContent = compareList.length;
    
    if (compareList.length > 0) {
        compareBar.classList.remove('hidden');
    } else {
        compareBar.classList.add('hidden');
    }
    
    // Render selected avatars
    compareItemsList.innerHTML = '';
    compareList.forEach(id => {
        const bike = motorcyclesData.find(b => b.id === id);
        if (!bike) return;
        
        const avatar = document.createElement('div');
        avatar.className = 'compare-item-avatar';
        avatar.innerHTML = `
            <img src="${bike.source_image || bike.official_image}" alt="${bike.name}">
            <button class="compare-item-remove" data-id="${bike.id}">&times;</button>
        `;
        
        avatar.querySelector('.compare-item-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromCompare(id);
            renderProducts();
        });
        
        compareItemsList.appendChild(avatar);
    });
}

// Render Side-by-side comparison table
function renderComparisonTable() {
    const bikes = compareList.map(id => motorcyclesData.find(b => b.id === id));
    
    // 1. 提取並找出各規格欄位之最優值
    let bestPrices = [];
    let bestFuel = [];
    let bestWeight = [];
    let bestHorsepower = [];
    let bestTorque = [];
    let bestSeatHeight = [];
    let bestFuelCapacity = [];

    bikes.forEach(b => {
        const subsidy = calculateSubsidy(b);
        const finalPrice = b.price - subsidy;
        bestPrices.push(finalPrice);
        bestFuel.push(b.fuel_efficiency || 0);
        bestWeight.push(b.weight || 999);
        bestHorsepower.push(parseFloat(b.horsepower) || 0);
        bestTorque.push(parseFloat(b.torque) || 0);
        bestSeatHeight.push(b.seat_height || 999);
        bestFuelCapacity.push(b.fuel_capacity || 0);
    });

    const minPrice = Math.min(...bestPrices);
    const maxFuel = Math.max(...bestFuel);
    const minWeight = Math.min(...bestWeight);
    const maxHorsepower = Math.max(...bestHorsepower);
    const maxTorque = Math.max(...bestTorque);
    const minSeatHeight = Math.min(...bestSeatHeight);
    const maxFuelCapacity = Math.max(...bestFuelCapacity);
    
    let html = `
        <thead>
            <tr>
                <th>規格比較欄位</th>
    `;
    
    bikes.forEach(bike => {
        const subsidy = calculateSubsidy(bike);
        const finalPrice = bike.price - subsidy;
        
        let sourceLabel = '原價';
        if (bike.price_source === 'momo') sourceLabel = 'momo 售價';
        else if (bike.price_source === 'shopee') sourceLabel = '蝦皮售價';
        else sourceLabel = '建議售價';
        
        html += `
            <th>
                <div class="compare-bike-header">
                    <img src="${bike.source_image || bike.official_image}" class="compare-bike-img">
                    <span class="brand-label">${bike.brand}</span>
                    <span class="compare-bike-name">${bike.name}</span>
                    <span class="compare-bike-price">NT$ ${finalPrice.toLocaleString()}</span>
                    <small style="color:var(--text-muted)">${sourceLabel}: NT$ ${bike.price.toLocaleString()}</small>
                </div>
            </th>
        `;
    });
    
    html += `
            </tr>
        </thead>
        <tbody>
    `;
    
    // Rows
    const rows = [
        { 
            label: '實估價格', 
            format: b => `NT$ ${(b.price - calculateSubsidy(b)).toLocaleString()}`,
            checkBest: b => (b.price - calculateSubsidy(b)) === minPrice
        },
        { label: '排氣量', key: 'displacement' },
        { label: '冷卻系統', key: 'cooling' },
        { label: '引擎規格', key: 'engine_type' },
        { 
            label: '油耗表現', 
            format: b => `${b.fuel_efficiency} km/L (${b.fuel_efficiency_level})`,
            checkBest: b => b.fuel_efficiency === maxFuel && maxFuel > 0
        },
        { 
            label: '最大馬力', 
            key: 'horsepower',
            checkBest: b => (parseFloat(b.horsepower) || 0) === maxHorsepower && maxHorsepower > 0
        },
        { 
            label: '最大扭力', 
            key: 'torque',
            checkBest: b => (parseFloat(b.torque) || 0) === maxTorque && maxTorque > 0
        },
        { label: '煞車配備', key: 'brakes' },
        { label: '安全電控', format: b => {
            let list = [];
            if (b.has_abs) list.push('ABS');
            if (b.has_tcs) list.push('TCS');
            if (b.has_cbs) list.push('CBS');
            return list.length > 0 ? list.join(' + ') : '無防鎖死連動系統';
        }},
        { 
            label: '座高 (mm)', 
            format: b => `${b.seat_height} mm`,
            checkBest: b => b.seat_height === minSeatHeight && minSeatHeight < 999
        },
        { 
            label: '車重 (kg)', 
            format: b => `${b.weight} kg`,
            checkBest: b => b.weight === minWeight && minWeight < 999
        },
        { 
            label: '油箱容量 (L)', 
            format: b => `${b.fuel_capacity} L`,
            checkBest: b => b.fuel_capacity === maxFuelCapacity && maxFuelCapacity > 0
        },
        { label: '置物容量', key: 'storage_capacity' },
        { label: '燈具配備', key: 'lights' },
        { label: '儀表板', key: 'dashboard' },
        { label: '鎖頭與免鑰匙', key: 'key_type' },
        { label: '特色賣點', format: b => {
            return `<ul style="text-align:left; padding-left:1.2rem; font-size:0.8rem;">
                ${b.selling_points.map(p => `<li>${p}</li>`).join('')}
            </ul>`;
        }},
        { label: '通路/官方連結', format: b => {
            let icon = 'fa-cart-shopping';
            let text = '前往購買';
            if (b.price_source === 'momo') {
                icon = 'fa-cart-shopping';
                text = '前往 momo 購買';
            } else if (b.price_source === 'shopee') {
                icon = 'fa-bag-shopping';
                text = '前往蝦皮比價';
            } else {
                icon = 'fa-globe';
                text = '前往官方網站';
            }
            return `
                <a href="${b.source_url || '#'}" target="_blank" class="btn btn-secondary btn-small">
                    <i class="fa-solid ${icon}"></i> ${text}
                </a>
            `;
        }}
    ];
    
    rows.forEach(row => {
        html += `<tr><td>${row.label}</td>`;
        bikes.forEach(bike => {
            let val = '';
            if (row.key) {
                val = bike[row.key];
            } else if (row.format) {
                val = row.format(bike);
            }
            
            const isBest = row.checkBest ? row.checkBest(bike) : false;
            const bestClass = isBest ? 'class="compare-best-cell"' : '';
            const bestIcon = isBest ? '👑 ' : '';
            
            html += `<td ${bestClass}>${bestIcon}${val}</td>`;
        });
        html += `</tr>`;
    });
    
    html += `</tbody>`;
    compareTableElement.innerHTML = html;
}

// Modal closing events
function setupModalEvents() {
    closeCompareModal.addEventListener('click', () => {
        compareModal.classList.add('hidden');
    });
    
    closeWizardModal.addEventListener('click', () => {
        aiWizardModal.classList.add('hidden');
    });
    
    const closeResult = () => {
        aiResultModal.classList.add('hidden');
    };
    closeResultModal.addEventListener('click', closeResult);
    closeResultModalBtn.addEventListener('click', closeResult);

    if (closeDetailModal) {
        closeDetailModal.addEventListener('click', () => {
            detailModal.classList.add('hidden');
        });
    }
    if (closeSubsidyModal) {
        closeSubsidyModal.addEventListener('click', () => {
            subsidyModal.classList.add('hidden');
        });
    }
    
    // Close on click outside
    window.addEventListener('click', (e) => {
        if (e.target === compareModal) compareModal.classList.add('hidden');
        if (e.target === aiWizardModal) aiWizardModal.classList.add('hidden');
        if (e.target === aiResultModal) aiResultModal.classList.add('hidden');
        if (e.target === detailModal) detailModal.classList.add('hidden');
        if (e.target === subsidyModal) subsidyModal.classList.add('hidden');
    });
}

// AI Recommendation Wizard Logic
function setupWizardEvents() {
    aiWizardBtn.addEventListener('click', () => {
        // Reset Wizard
        currentWizardStep = 1;
        wizardAnswers = { purpose: '', budget: '', priorities: [] };
        
        const steps = document.querySelectorAll('.wizard-step');
        steps.forEach(s => s.classList.remove('active'));
        steps[0].classList.add('active');
        
        // Reset option highlights
        const options = document.querySelectorAll('.wizard-option');
        options.forEach(o => o.classList.remove('selected'));
        
        wizardPrevBtn.classList.add('hidden');
        wizardNextBtn.classList.remove('hidden');
        wizardNextBtn.disabled = true;
        wizardSubmitBtn.classList.add('hidden');
        
        aiWizardModal.classList.remove('hidden');
    });
    
    // Handle options click
    const options = document.querySelectorAll('.wizard-option');
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            const key = opt.getAttribute('data-key');
            const val = opt.getAttribute('data-value');
            const isMulti = opt.classList.contains('multi');
            
            if (isMulti) {
                // Multi select step (priorities)
                opt.classList.toggle('selected');
                if (opt.classList.contains('selected')) {
                    wizardAnswers[key].push(val);
                } else {
                    wizardAnswers[key] = wizardAnswers[key].filter(v => v !== val);
                }
                // Priorities can be empty, so next button is always enabled for step 3
                wizardNextBtn.disabled = false;
                wizardSubmitBtn.disabled = false;
            } else {
                // Single select step
                const siblings = opt.parentElement.querySelectorAll('.wizard-option');
                siblings.forEach(s => s.classList.remove('selected'));
                opt.classList.add('selected');
                
                wizardAnswers[key] = val;
                wizardNextBtn.disabled = false;
            }
        });
    });
    
    // Prev Button
    wizardPrevBtn.addEventListener('click', () => {
        changeWizardStep(-1);
    });
    
    // Next Button
    wizardNextBtn.addEventListener('click', () => {
        changeWizardStep(1);
    });
    
    // Submit Button
    wizardSubmitBtn.addEventListener('click', () => {
        aiWizardModal.classList.add('hidden');
        calculateAIRecommendations();
    });
    
    // Restart Wizard from result modal
    restartWizardBtn.addEventListener('click', () => {
        aiResultModal.classList.add('hidden');
        aiWizardBtn.click();
    });
}

function changeWizardStep(direction) {
    const steps = document.querySelectorAll('.wizard-step');
    steps[currentWizardStep - 1].classList.remove('active');
    
    currentWizardStep += direction;
    steps[currentWizardStep - 1].classList.add('active');
    
    // Nav Visibility controls
    if (currentWizardStep === 1) {
        wizardPrevBtn.classList.add('hidden');
        wizardNextBtn.classList.remove('hidden');
        wizardSubmitBtn.classList.add('hidden');
    } else if (currentWizardStep === steps.length) {
        wizardPrevBtn.classList.remove('hidden');
        wizardNextBtn.classList.add('hidden');
        wizardSubmitBtn.classList.remove('hidden');
        
        // Multi-select step is always enabled by default even with 0 items
        wizardSubmitBtn.disabled = false;
    } else {
        wizardPrevBtn.classList.remove('hidden');
        wizardNextBtn.classList.remove('hidden');
        wizardSubmitBtn.classList.add('hidden');
    }
    
    // Enable Next button if current step has an answer
    const currentKey = steps[currentWizardStep - 1].querySelector('.wizard-option').getAttribute('data-key');
    if (currentKey === 'priorities') {
        wizardNextBtn.disabled = false;
    } else {
        wizardNextBtn.disabled = !wizardAnswers[currentKey];
    }
}

function calculateAIRecommendations() {
    const scores = motorcyclesData.map(bike => {
        let score = 0;
        let maxPossible = 100;
        
        // 1. Purpose Match
        if (wizardAnswers.purpose === 'commute') {
            // Highly value fuel efficiency
            if (bike.fuel_efficiency >= 60) score += 35;
            else if (bike.fuel_efficiency >= 50) score += 25;
            else if (bike.fuel_efficiency >= 45) score += 15;
            
            // Prefer commuter models (Duke, Vivo, CLBCU, GP)
            const commuters = ['sym_duke_125_enmis', 'kymco_gp_125', 'sym_clbcu_125'];
            if (commuters.includes(bike.id)) score += 15;
        } else if (wizardAnswers.purpose === 'sport') {
            // Highly value horsepower & water cooling & safety
            if (bike.cooling === '水冷') score += 20;
            if (bike.has_abs && bike.has_tcs) score += 20;
            else if (bike.has_abs) score += 10;
            
            // Premium/Sport engines
            if (bike.horsepower.includes('15') || bike.horsepower.includes('14')) score += 10;
            
            const sports = ['sym_jet_sl_plus_158', 'sym_mmbcu_158', 'kymco_rcs_moto_150', 'yamaha_cygnus_gryphus_125', 'yamaha_augur_155'];
            if (sports.includes(bike.id)) score += 10;
        } else if (wizardAnswers.purpose === 'cargo') {
            // Prefer utility models
            const utility = ['kymco_dollar_150', 'yamaha_bws_125', 'sym_duke_125_enmis'];
            if (utility.includes(bike.id)) score += 35;
            
            // Large storage, heavy weight capacity
            if (bike.storage_capacity.includes('大') || bike.storage_capacity.includes('置物')) score += 15;
        } else if (wizardAnswers.purpose === 'style') {
            // Prefer lightweight & retro/stylish
            if (bike.weight < 110) score += 20;
            if (bike.seat_height <= 760) score += 15;
            
            const stylish = ['sym_clbcu_125', 'sym_mmbcu_158']; // clbcu, mmbcu
            if (stylish.includes(bike.id)) score += 15;
        }
        
        // 2. Budget Match
        const price = bike.price;
        if (wizardAnswers.budget === 'budget') {
            // Under 70k NTD
            if (price <= 70000) score += 30;
            else if (price <= 85000) score += 15;
            else score -= 10;
        } else if (wizardAnswers.budget === 'mid') {
            // 70k - 95k NTD
            if (price > 70000 && price <= 95000) score += 30;
            else if (price <= 70000 || price <= 100000) score += 15;
            else score -= 10;
        } else if (wizardAnswers.budget === 'premium') {
            // 95k+ NTD
            if (price > 95000) score += 30;
            else if (price >= 85000) score += 15;
        }
        
        // 3. Priorities Match (Multi-select)
        if (wizardAnswers.priorities.length > 0) {
            wizardAnswers.priorities.forEach(p => {
                if (p === 'fuel' && bike.fuel_efficiency >= 55) score += 10;
                if (p === 'safety' && bike.has_abs && bike.has_tcs) score += 10;
                else if (p === 'safety' && bike.has_abs) score += 5;
                if (p === 'keyless' && bike.key_type.includes('Keyless')) score += 10;
                if (p === 'storage' && (bike.storage_capacity.includes('37') || bike.storage_capacity.includes('30'))) score += 10;
            });
        }
        
        // Normalize matching score
        const matchPercentage = Math.round((score / maxPossible) * 100);
        return {
            bike: bike,
            matchPercentage: Math.max(10, Math.min(100, matchPercentage))
        };
    });
    
    // Sort and take top 3
    scores.sort((a, b) => b.matchPercentage - a.matchPercentage);
    const top3 = scores.slice(0, 3);
    
    // Render result cards
    aiRecommendationsList.innerHTML = '';
    top3.forEach((rec, idx) => {
        const bike = rec.bike;
        const card = document.createElement('div');
        card.className = 'result-item';
        
        let sourceLabel = '促銷優惠價';
        let actionText = '前往購買';
        let actionIcon = 'fa-cart-shopping';
        if (bike.price_source === 'momo') {
            sourceLabel = 'momo 優惠價';
            actionText = '前往 momo';
            actionIcon = 'fa-cart-shopping';
        } else if (bike.price_source === 'shopee') {
            sourceLabel = '蝦皮促銷價';
            actionText = '前往蝦皮';
            actionIcon = 'fa-bag-shopping';
        } else {
            sourceLabel = '建議售價';
            actionText = '官方網站';
            actionIcon = 'fa-globe';
        }
        
        card.innerHTML = `
            <span class="result-rank-badge">推薦首選 #${idx + 1}</span>
            <img src="${bike.source_image || bike.official_image}" class="result-item-img">
            <div class="result-item-info">
                <span class="result-item-match"><i class="fa-solid fa-circle-check"></i> 契合度 ${rec.matchPercentage}%</span>
                <h4 class="result-item-name">${bike.brand} ${bike.name}</h4>
                <p style="font-size: 0.75rem; color:var(--text-muted); margin-bottom: 0.2rem;">${bike.cooling} | ${bike.cc_class}cc 級距 | ${bike.fuel_efficiency} km/L</p>
                <div class="result-item-price">${sourceLabel} NT$ ${bike.price.toLocaleString()}</div>
            </div>
            <a href="${bike.source_url || '#'}" target="_blank" class="btn btn-primary btn-small">
                <i class="fa-solid ${actionIcon}"></i> ${actionText}
            </a>
        `;
        aiRecommendationsList.appendChild(card);
    });
    
    aiResultModal.classList.remove('hidden');
}

// Light/Dark Theme Switcher
function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    const icon = themeToggle.querySelector('i');
    
    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            if (icon) {
                icon.className = 'fa-solid fa-moon';
            }
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            if (icon) {
                icon.className = 'fa-solid fa-sun';
            }
        }
    });
}

// Database Refresh Notice
function setupDatabaseRefresh() {
    const refreshBtn = document.getElementById('refresh-db-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            alert('本網站已作為靜態網頁發布於 Internet 上，無法直接執行後端爬蟲。\n若要更新最新的市場價格，請在本地運行爬蟲程式更新 data/motorcycles.json 並重新部署。');
        });
    }
    
    // Set static mock update time
    if (lastUpdateTime) {
        lastUpdateTime.innerHTML = `<i class="fa-solid fa-clock"></i> 最後更新時間：2026-05-22`;
    }
}

// ==========================================
// 優化功能模組 - 實作邏輯
// ==========================================

// 1. 快速推薦標籤邏輯
function setupQuickTags() {
    const tags = document.querySelectorAll('.quick-tag');
    tags.forEach(tag => {
        tag.addEventListener('click', () => {
            const isActive = tag.classList.contains('active');
            
            // 清除其他標籤狀態
            tags.forEach(t => t.classList.remove('active'));
            
            if (isActive) {
                resetAllFilters();
            } else {
                tag.classList.add('active');
                applyQuickFilter(tag.getAttribute('data-tag'));
            }
        });
    });
}

function applyQuickFilter(tagName) {
    resetFilterUIElements();
    
    filteredData = motorcyclesData.filter(bike => {
        const subsidy = calculateSubsidy(bike);
        const finalPrice = bike.price - subsidy;
        
        if (tagName === '國民神車') {
            return finalPrice <= 70000 && bike.fuel_efficiency_level === '1級';
        } else if (tagName === '運動水冷') {
            return bike.cooling === '水冷';
        } else if (tagName === '省油之王') {
            return bike.fuel_efficiency >= 55;
        } else if (tagName === '免鑰匙') {
            return bike.key_type.includes('Keyless');
        } else if (tagName === '超大載物') {
            return bike.id.includes('4mica') || bike.id.includes('dollar') || bike.id.includes('bws') || bike.storage_capacity.includes('大') || bike.storage_capacity.includes('37.5');
        }
        return true;
    });
    
    // 預設做降序排序以顯示最符合的
    filteredData.sort((a, b) => b.fuel_efficiency - a.fuel_efficiency);
    
    renderProducts();
    updateResultsCount();
}

function resetAllFilters() {
    searchInput.value = '';
    document.getElementById('brand-chips').querySelectorAll('.chip').forEach(c => {
        c.classList.remove('active');
        if (c.getAttribute('data-value') === 'all') c.classList.add('active');
    });
    document.getElementById('cc-chips').querySelectorAll('.chip').forEach(c => {
        c.classList.remove('active');
        if (c.getAttribute('data-value') === 'all') c.classList.add('active');
    });
    document.getElementById('safety-chips').querySelectorAll('.chip').forEach(c => {
        c.classList.remove('active');
        if (c.getAttribute('data-value') === 'all') c.classList.add('active');
    });
    sortSelect.value = 'default';
    applyFilters();
}

function resetFilterUIElements() {
    document.getElementById('brand-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    document.getElementById('cc-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    document.getElementById('safety-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    searchInput.value = '';
}

// 2. 車款詳細資訊彈出視窗
function openVehicleDetail(bikeId) {
    const bike = motorcyclesData.find(b => b.id === bikeId);
    if (!bike) return;
    
    const detailModal = document.getElementById('detail-modal');
    const detailBody = document.getElementById('detail-modal-body');
    
    const subsidy = calculateSubsidy(bike);
    const finalPrice = bike.price - subsidy;
    
    // 2.1 計算指標分數
    // 省油: 40 km/L 為 50 分，60 km/L 以上為 100 分
    const fuelScore = Math.max(30, Math.min(100, Math.round(((bike.fuel_efficiency - 35) / 25) * 50 + 50)));
    
    // 安全: ABS+TCS 100, ABS 85, CBS 70, 其餘 50
    let safetyScore = 50;
    if (bike.has_abs && bike.has_tcs) safetyScore = 100;
    else if (bike.has_abs) safetyScore = 85;
    else if (bike.has_cbs) safetyScore = 70;
    
    // 性能: 基於馬力
    const hpNum = parseFloat(bike.horsepower) || 0;
    let powerScore = 60;
    if (hpNum >= 15) powerScore = 100;
    else if (hpNum >= 13) powerScore = 90;
    else if (hpNum >= 11) powerScore = 80;
    else if (hpNum >= 9.5) powerScore = 70;
    
    // 空間
    let spaceScore = 60;
    if (bike.storage_capacity.includes('37') || bike.storage_capacity.includes('33') || bike.storage_capacity.includes('載貨') || bike.storage_capacity.includes('平台')) spaceScore = 100;
    else if (bike.storage_capacity.includes('30') || bike.storage_capacity.includes('28')) spaceScore = 85;
    else if (bike.storage_capacity.includes('25') || bike.storage_capacity.includes('22')) spaceScore = 75;
    
    // CP值: 價格與配備綜合
    let featuresCount = 0;
    if (bike.cooling === '水冷') featuresCount++;
    if (bike.has_abs) featuresCount++;
    if (bike.has_tcs) featuresCount++;
    if (bike.key_type.includes('Keyless')) featuresCount++;
    if (bike.lights.includes('LED')) featuresCount++;
    
    let cpScore = 70;
    if (bike.price <= 70000 && featuresCount >= 2) cpScore = 100;
    else if (bike.price <= 90000 && featuresCount >= 3) cpScore = 95;
    else if (bike.price <= 120000 && featuresCount >= 4) cpScore = 90;
    else if (bike.price > 120000 && featuresCount >= 4) cpScore = 80;
    else if (bike.price <= 70000) cpScore = 90;
    
    let sourceLabel = '促銷優惠價';
    let actionBtnIcon = 'fa-cart-shopping';
    let actionBtnText = '前往購買';
    if (bike.price_source === 'momo') {
        sourceLabel = 'momo 優惠價';
        actionBtnIcon = 'fa-cart-shopping';
        actionBtnText = '前往 momo 購買';
    } else if (bike.price_source === 'shopee') {
        sourceLabel = '蝦皮促銷價';
        actionBtnIcon = 'fa-bag-shopping';
        actionBtnText = '前往蝦皮比價';
    } else {
        sourceLabel = '官方建議售價';
        actionBtnIcon = 'fa-globe';
        actionBtnText = '前往官方網站';
    }
    
    const isChecked = compareList.includes(bike.id) ? 'checked' : '';
    const addBtnHtml = compareList.includes(bike.id) 
        ? `<button class="btn btn-secondary" disabled><i class="fa-solid fa-check"></i> 已加入比較</button>`
        : `<button class="btn btn-secondary detail-compare-add" data-id="${bike.id}"><i class="fa-solid fa-plus"></i> 加入比較</button>`;
        
    detailBody.innerHTML = `
        <div class="detail-container">
            <div class="detail-header-block">
                <div class="detail-img-container">
                    <img src="${bike.source_image || bike.official_image}" alt="${bike.name}">
                </div>
                <div class="detail-main-info">
                    <span class="brand-label">${bike.brand}</span>
                    <h2 style="font-size: 1.8rem; font-weight: 800; color: var(--text-primary);">${bike.name}</h2>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">排氣量: ${bike.displacement} | 引擎冷卻: ${bike.cooling} | 車重: ${bike.weight} kg</p>
                    
                    <div style="margin: 0.5rem 0;">
                        <span style="font-size: 0.85rem; color: var(--text-muted);">${sourceLabel}: </span>
                        <span style="font-size: 1.1rem; color: var(--text-muted); text-decoration: line-through;">NT$ ${bike.price.toLocaleString()}</span>
                        <div style="margin-top: 0.3rem;">
                            <span style="font-size: 0.95rem; font-weight: 700; color: var(--text-secondary);">汰舊補助估算: </span>
                            <span style="font-size: 1.9rem; font-weight: 900; color: var(--color-success);">NT$ ${finalPrice.toLocaleString()}</span>
                            ${subsidy > 0 ? `<span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.1rem;">(已包含政府與設籍縣市汰舊換新補助 NT$ ${subsidy.toLocaleString()})</span>` : ''}
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 0.8rem; margin-top: 0.5rem;">
                        <a href="${bike.source_url || '#'}" target="_blank" class="btn btn-primary btn-glow" style="flex: 1; justify-content: center;">
                            <i class="fa-solid ${actionBtnIcon}"></i> ${actionBtnText}
                        </a>
                        ${addBtnHtml}
                    </div>
                </div>
            </div>
            
            <div class="detail-indicators">
                <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary);"><i class="fa-solid fa-chart-bar"></i> 五大購車面向評估</h4>
                
                <div class="indicator-row">
                    <div class="indicator-label">
                        <span>🍃 省油節能 (一級油耗 ${bike.fuel_efficiency} km/L)</span>
                        <span>${fuelScore} 分</span>
                    </div>
                    <div class="indicator-bar-outer">
                        <div class="indicator-bar-inner" data-val="${fuelScore}"></div>
                    </div>
                </div>
                
                <div class="indicator-row">
                    <div class="indicator-label">
                        <span>🛡️ 安全防護 (${bike.has_abs ? 'ABS' : ''} ${bike.has_tcs ? '+ TCS' : ''} ${bike.has_cbs ? 'CBS' : ''} ${(!bike.has_abs && !bike.has_tcs && !bike.has_cbs) ? '一般煞車' : ''})</span>
                        <span>${safetyScore} 分</span>
                    </div>
                    <div class="indicator-bar-outer">
                        <div class="indicator-bar-inner" data-val="${safetyScore}"></div>
                    </div>
                </div>
                
                <div class="indicator-row">
                    <div class="indicator-label">
                        <span>⚡ 動力性能 (最大馬力 ${bike.horsepower.split('@')[0]})</span>
                        <span>${powerScore} 分</span>
                    </div>
                    <div class="indicator-bar-outer">
                        <div class="indicator-bar-inner" data-val="${powerScore}"></div>
                    </div>
                </div>
                
                <div class="indicator-row">
                    <div class="indicator-label">
                        <span>👜 置物空間 (${bike.storage_capacity.split('，')[0]})</span>
                        <span>${spaceScore} 分</span>
                    </div>
                    <div class="indicator-bar-outer">
                        <div class="indicator-bar-inner" data-val="${spaceScore}"></div>
                    </div>
                </div>
                
                <div class="indicator-row">
                    <div class="indicator-label">
                        <span>💎 性價比 (CP值)</span>
                        <span>${cpScore} 分</span>
                    </div>
                    <div class="indicator-bar-outer">
                        <div class="indicator-bar-inner" data-val="${cpScore}"></div>
                    </div>
                </div>
            </div>
            
            <div>
                <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.8rem; color: var(--text-primary);"><i class="fa-solid fa-wand-magic-sparkles"></i> 亮點特色</h4>
                <div class="detail-bullets">
                    ${bike.selling_points.map(point => `
                        <div class="detail-bullet-item">
                            <i class="fa-solid fa-circle-check"></i>
                            <span>${point}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    detailModal.classList.remove('hidden');
    
    // 動畫延遲觸發
    setTimeout(() => {
        const fillBars = detailModal.querySelectorAll('.indicator-bar-inner');
        fillBars.forEach(bar => {
            const val = bar.getAttribute('data-val');
            bar.style.width = `${val}%`;
        });
    }, 100);
    
    // 綁定加入比較事件
    const addCompareBtn = detailBody.querySelector('.detail-compare-add');
    if (addCompareBtn) {
        addCompareBtn.addEventListener('click', () => {
            addToCompare(bikeId);
            const cb = productGrid.querySelector(`.compare-checkbox[data-id="${bikeId}"]`);
            if (cb) cb.checked = true;
            detailModal.classList.add('hidden');
        });
    }
}

// 3. 補助明細對話框
function openSubsidyDetail(bikeId) {
    const bike = motorcyclesData.find(b => b.id === bikeId);
    if (!bike) return;
    
    const subsidyBody = document.getElementById('subsidy-modal-body');
    if (!subsidyBody) return;
    
    let cityLabel = '其他縣市';
    let citySub = 2000;
    
    switch (subsidyConfig.city) {
        case 'taipei':
            cityLabel = '台北市環保局 (汰舊加碼)';
            citySub = 6000;
            break;
        case 'new_taipei':
            cityLabel = '新北市環保局 (汰舊加碼)';
            citySub = 4000;
            break;
        case 'taichung':
            cityLabel = '台中市環保局 (汰舊加碼)';
            citySub = 3000;
            break;
        case 'kaohsiung':
            cityLabel = '高雄市環保局 (汰舊加碼)';
            citySub = 4000;
            break;
    }
    
    const totalSubsidy = calculateSubsidy(bike);
    
    subsidyBody.innerHTML = `
        <div class="subsidy-list">
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.2rem; line-height: 1.5;">
                此為您針對 <strong>${bike.brand} ${bike.name}</strong> 進行汰舊換新時，可向各政府部門申請之估算金額：
            </p>
            <div class="subsidy-item">
                <span>1. 財政部國稅局 (貨物稅減徵)</span>
                <span>NT$ 4,000</span>
            </div>
            <div class="subsidy-item">
                <span>2. 環境部環保局 (廢車回收補助)</span>
                <span>NT$ 2,000</span>
            </div>
            <div class="subsidy-item">
                <span>3. 地方政府環保局 (${cityLabel})</span>
                <span>NT$ ${citySub.toLocaleString()}</span>
            </div>
            <div class="subsidy-item" style="border-top: 1px dashed var(--border-color); padding-top: 1rem; margin-top: 0.8rem; font-weight: 700; font-size: 1.1rem; color: var(--color-success);">
                <span>總預估最高補助金額</span>
                <span>NT$ ${totalSubsidy.toLocaleString()}</span>
            </div>
            <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); padding: 0.8rem; border-radius: 6px; margin-top: 1.2rem;">
                <small style="color: var(--text-muted); line-height: 1.4; display: block;">
                    *注意事項：
                    1. 汰舊之舊機車須設籍且出廠滿一定年限 (通常為 4 年以上)。
                    2. 實際補助款申請進度與資格條件，須依各縣市環保局及相關局處最新公告審核標準為準。
                </small>
            </div>
        </div>
    `;
    
    subsidyModal.classList.remove('hidden');
}

// 4. 持有成本試算邏輯 (TCO)
function updateTcoCalculator() {
    const mileageInput = document.getElementById('tco-mileage');
    const yearsInput = document.getElementById('tco-years');
    const mileageVal = document.getElementById('tco-mileage-val');
    const chartContainer = document.getElementById('tco-chart-container');
    
    if (!mileageInput || !yearsInput || !chartContainer) return;
    
    const mileage = parseInt(mileageInput.value);
    const years = parseInt(yearsInput.value);
    mileageVal.textContent = `${mileage.toLocaleString()} km / 年`;
    
    const bikes = compareList.map(id => motorcyclesData.find(b => b.id === id));
    if (bikes.length === 0) {
        chartContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted);">請先加入機車以進行估算。</p>';
        return;
    }
    
    const gasPrice = 31; // 預估 95 汽油價格
    
    const tcoData = bikes.map(bike => {
        const subsidy = calculateSubsidy(bike);
        const carPrice = bike.price - subsidy;
        const totalKm = mileage * years;
        const fuelUsed = totalKm / (bike.fuel_efficiency || 40);
        const fuelCost = Math.round(fuelUsed * gasPrice);
        const totalCost = carPrice + fuelCost;
        
        return {
            bike: bike,
            carPrice: carPrice,
            fuelCost: fuelCost,
            totalCost: totalCost
        };
    });
    
    const maxTotalCost = Math.max(...tcoData.map(t => t.totalCost));
    
    let html = '';
    tcoData.forEach(item => {
        const pricePercent = (item.carPrice / maxTotalCost) * 100;
        const fuelPercent = (item.fuelCost / maxTotalCost) * 100;
        
        html += `
            <div class="tco-bar-wrapper">
                <div class="tco-bar-label">
                    <span style="font-weight:700;">${item.bike.brand} ${item.bike.name}</span>
                    <span style="font-weight: 800; color: var(--color-success);">NT$ ${item.totalCost.toLocaleString()}</span>
                </div>
                <div class="tco-bar-outer">
                    <div class="tco-bar-price" style="width: ${pricePercent}%;" title="購車開銷: NT$ ${item.carPrice.toLocaleString()}"></div>
                    <div class="tco-bar-fuel" style="width: ${fuelPercent}%;" title="${years}年預估油錢: NT$ ${item.fuelCost.toLocaleString()}"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.1rem;">
                    <span>購車價: NT$ ${item.carPrice.toLocaleString()}</span>
                    <span>預估油錢: NT$ ${item.fuelCost.toLocaleString()}</span>
                </div>
            </div>
        `;
    });
    
    html += `
        <div class="tco-bar-legend">
            <div class="tco-legend-item">
                <div class="tco-legend-color" style="background-color: var(--color-primary);"></div>
                <span>實付購車價格</span>
            </div>
            <div class="tco-legend-item">
                <div class="tco-legend-color" style="background-color: var(--color-accent);"></div>
                <span>${years}年行駛油資成本</span>
            </div>
        </div>
    `;
    
    chartContainer.innerHTML = html;
}

function setupTcoEvents() {
    const mileageInput = document.getElementById('tco-mileage');
    const yearsInput = document.getElementById('tco-years');
    
    if (mileageInput) {
        mileageInput.addEventListener('input', () => {
            updateTcoCalculator();
        });
    }
    
    if (yearsInput) {
        yearsInput.addEventListener('change', () => {
            updateTcoCalculator();
        });
    }
}

// 5. 僅顯示差異項目邏輯
function setupDiffToggleEvent() {
    const diffToggle = document.getElementById('diff-toggle');
    if (diffToggle) {
        diffToggle.addEventListener('change', () => {
            applyDiffToggle();
        });
    }
}

function applyDiffToggle() {
    const diffToggle = document.getElementById('diff-toggle');
    const table = document.getElementById('compare-table-element');
    if (!diffToggle || !table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    const isChecked = diffToggle.checked;
    
    rows.forEach(row => {
        if (!isChecked) {
            row.style.display = '';
            return;
        }
        
        // 排除規格名稱格
        const cells = Array.from(row.querySelectorAll('td')).slice(1);
        if (cells.length <= 1) return;
        
        // 去除👑與空白再做內容一致性比對
        const firstVal = cells[0].textContent.trim().replace('👑', '').replace(/\s+/g, '');
        const allSame = cells.every(c => c.textContent.trim().replace('👑', '').replace(/\s+/g, '') === firstVal);
        
        if (allSame) {
            row.style.display = 'none';
        } else {
            row.style.display = '';
        }
    });
}

