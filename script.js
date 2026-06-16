const API_URL = "https://script.google.com/macros/s/AKfycbzcIDOcWS1jgIEMReDpzlHEEIQLtEtoo_Y1_Xa3-WsgcFL0vUZ5OZ4NORXCpPcLbEQ_4g/exec";

let chartInstances = {};
let comparisonChartInstance = null;
let globalRawGroupedData = {}; // Lưu trữ data để vẽ lại khi xoay đt
let globalAllRecords = [];

// Xử lý Check xoay ngang/dọc (iPhone 12 Pro Max: 428px ngang < 500px)
let isMobilePortrait = window.innerWidth < 500;
window.addEventListener('resize', () => {
    let newIsMobile = window.innerWidth < 500;
    if(newIsMobile !== isMobilePortrait) {
        isMobilePortrait = newIsMobile;
        if(Object.keys(globalRawGroupedData).length > 0) {
            renderCharts(globalRawGroupedData);
            renderComparisonChart(globalAllRecords, globalRawGroupedData);
        }
    }
});

function showChartLoader() { document.getElementById('chartLoader')?.classList.add('active'); }
function hideChartLoader() { document.getElementById('chartLoader')?.classList.remove('active'); }

function openTab(evt, tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
    loadData();
}

async function guiDuLieu() {
    let maTk = document.getElementById('maTk').value.trim();
    let tenTk = document.getElementById('tenTk').value.trim(); 
    let canNang = document.getElementById('canNang').value;
    if(!maTk || !canNang) return alert("Vui lòng nhập đủ Mã tài khoản và Cân nặng!");

    showChartLoader();
    try {
        await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "nhap_lieu", maTk, tenTk, canNang }) });
        document.getElementById('maTk').value = ''; document.getElementById('tenTk').value = ''; document.getElementById('canNang').value = '';
        await loadData();
    } catch (e) { alert("Lỗi mạng!"); hideChartLoader(); }
}   

async function yeuCauXoa() {
    let maTk = document.getElementById('maTkXoa').value.trim();
    if(!maTk) return alert("Vui lòng nhập mã");
    showChartLoader();
    try {
        await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "yeu_cau_xoa", maTk }) });
        document.getElementById('maTkXoa').value = '';
        await loadData();
    } catch (e) { alert("Lỗi mạng!"); hideChartLoader(); }
}

// Format: HH:MM:SS - DD/MM/YYYY
function formatDateTimeStr(dateObj) {
    let h = String(dateObj.getHours()).padStart(2, '0');
    let m = String(dateObj.getMinutes()).padStart(2, '0');
    let s = String(dateObj.getSeconds()).padStart(2, '0');
    let d = String(dateObj.getDate()).padStart(2, '0');
    let mo = String(dateObj.getMonth() + 1).padStart(2, '0');
    let y = dateObj.getFullYear();
    return `${h}:${m}:${s} - ${d}/${mo}/${y}`;
}

async function loadData() {
    showChartLoader();
    try {
        let res = await fetch(API_URL);
        let data = await res.json();
        
        let allRecords = [];
        let rawGroupedData = {}; 

        data.forEach(row => {
            let maTk = row[0] ? row[0].toString().trim() : "";
            let canNang = parseFloat(row[1] ? row[1].toString().replace(',', '.') : "");
            let dateObj = new Date(row[2]);
            let tenTk = row[3] ? row[3].toString().trim() : "";

            if (isNaN(canNang) || isNaN(dateObj.getTime())) return; 

            let displayTen = tenTk || maTk || "Ẩn danh";
            let lowerMa = maTk.toLowerCase(), lowerTen = tenTk.toLowerCase();
            if (["long", "1", "l"].includes(lowerMa) || ["long", "1", "l"].includes(lowerTen)) displayTen = "longhairRr";

            let fullStr = formatDateTimeStr(dateObj);
            let record = { user: displayTen, weight: canNang, timestamp: dateObj.getTime(), dateStr: fullStr };
            
            allRecords.push(record);
            if(!rawGroupedData[displayTen]) rawGroupedData[displayTen] = [];
            rawGroupedData[displayTen].push(record);
        });

        globalAllRecords = allRecords;
        globalRawGroupedData = rawGroupedData;

        // XỬ LÝ BẢNG THỐNG KÊ (Giới hạn 20 dòng mới nhất)
        allRecords.sort((a, b) => b.timestamp - a.timestamp); // Xếp mới nhất lên đầu
        let recent20 = allRecords.slice(0, 20);
        
        let htmlTable = "";
        recent20.forEach(item => {
            htmlTable += `<tr>
                <td data-label="Thành Viên"><span class="user-tag">${item.user}</span></td>
                <td data-label="Cân Nặng"><span class="weight-badge">${item.weight} kg</span></td>
                <td data-label="Thời Gian" class="time-col">${item.dateStr}</td>
            </tr>`;
        });
        document.getElementById('dataBody').innerHTML = htmlTable;

        // VẼ BIỂU ĐỒ
        for (let user in rawGroupedData) rawGroupedData[user].sort((a, b) => a.timestamp - b.timestamp);
        renderCharts(rawGroupedData);
        renderComparisonChart(globalAllRecords, rawGroupedData);

    } catch (e) { console.error(e); } 
    finally { hideChartLoader(); }
}

function renderCharts(groupedData) {
    const container = document.getElementById('chartsContainer');
    if(!container) return;
    container.innerHTML = ''; 

    const accentColor = getComputedStyle(document.body).getPropertyValue('--chart-accent').trim() || '#00f5ff';
    const gridColor = 'rgba(255, 0, 127, 0.1)';

    for (const [user, records] of Object.entries(groupedData)) {
        // CẮT 15 MỐC TRÊN ĐIỆN THOẠI DỌC
        let displayRecords = isMobilePortrait ? records.slice(-15) : records;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-wrapper';
        wrapper.innerHTML = `<canvas id="chart-${user.replace(/\s+/g, '-')}" style="width:100%; height:280px;"></canvas>`;
        container.appendChild(wrapper);

        const ctx = document.getElementById(`chart-${user.replace(/\s+/g, '-')}`).getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, accentColor + '44');
        gradient.addColorStop(1, accentColor + '00');

        if(chartInstances[user]) chartInstances[user].destroy();

        chartInstances[user] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: displayRecords.map(r => r.dateStr),
                datasets: [{
                    label: `TIẾN ĐỘ: ${user.toUpperCase()}`,
                    data: displayRecords.map(r => r.weight),
                    borderColor: accentColor, 
                    backgroundColor: gradient, 
                    borderWidth: 3,
                    pointBackgroundColor: '#0a0612',
                    pointBorderColor: accentColor,
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    tension: 0.35, fill: true
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#8fa0dd', font: { size: 9 } }, grid: { color: gridColor } },
                    y: { ticks: { color: accentColor, font: { size: 10 } }, grid: { color: gridColor } }
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: accentColor, font: { size: 11, weight: 'bold' }, boxWidth: 0 } // ĐÃ BỎ Ô VUÔNG Ở ĐÂY
                    }
                }
            }
        });
    }
}

function renderComparisonChart(allRecords, groupedData) {
    const canvas = document.getElementById('chart-all-comparison');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');

    // Mảng màu phân biệt các User
    const colors = ['#00f5ff', '#ff007f', '#ffea00', '#39ff14', '#bc13fe', '#ff7b00'];

    // Lấy TẤT CẢ các mốc thời gian duy nhất để làm trục ngang chung, sắp xếp tăng dần
    let uniqueTimestamps = Array.from(new Set(allRecords.map(r => r.timestamp))).sort((a,b) => a-b);
    let displayTimestamps = isMobilePortrait ? uniqueTimestamps.slice(-15) : uniqueTimestamps;
    let commonLabels = displayTimestamps.map(ts => formatDateTimeStr(new Date(ts)));

    let datasets = Object.keys(groupedData).map((user, index) => {
        let color = colors[index % colors.length];
        // Ánh xạ cân nặng của user vào trục thời gian chung. Nếu user không cân lúc đó -> null
        let dataPoints = displayTimestamps.map(ts => {
            let found = groupedData[user].find(r => r.timestamp === ts);
            return found ? found.weight : null;
        });

        return {
            label: user.toUpperCase(),
            data: dataPoints,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2,
            pointRadius: 4,
            spanGaps: true, // Nối liền mạch các điểm dù ở giữa có giá trị null
            tension: 0.2
        };
    });

    if(comparisonChartInstance) comparisonChartInstance.destroy();
    comparisonChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: commonLabels, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#8fa0dd', font: { size: 9 } }, grid: { color: 'rgba(255, 0, 127, 0.1)' } },
                y: { ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255, 0, 127, 0.1)' } }
            },
            plugins: {
                legend: {
                    display: true, position: 'top',
                    labels: { color: '#fff', font: { size: 11, weight: 'bold' }, boxWidth: 12 } // GIỮ Ô VUÔNG Ở ĐÂY ĐỂ PHÂN BIỆT MÀU
                }
            }
        }
    });
}