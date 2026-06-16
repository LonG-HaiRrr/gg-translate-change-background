const API_URL = "https://script.google.com/macros/s/AKfycbzcIDOcWS1jgIEMReDpzlHEEIQLtEtoo_Y1_Xa3-WsgcFL0vUZ5OZ4NORXCpPcLbEQ_4g/exec";

let chartInstances = {};

// Chỉ kích hoạt hiệu ứng đợi ở khu vực Biểu Đồ
function showChartLoader() {
    const loader = document.getElementById('chartLoader');
    if(loader) loader.classList.add('active');
}

function hideChartLoader() {
    const loader = document.getElementById('chartLoader');
    if(loader) loader.classList.remove('active');
}

/* ================= 1. ĐIỀU HƯỚNG TABS ================= */
function openTab(evt, tabId) {
    let tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
    }

    let tabLinks = document.getElementsByClassName("tab-link");
    for (let i = 0; i < tabLinks.length; i++) {
        tabLinks[i].classList.remove("active");
    }

    document.getElementById(tabId).classList.add("active");
    evt.currentTarget.classList.add("active");
    
    // Tải lại dữ liệu bất kể chuyển sang tab nào để luôn đồng bộ đồ thị
    loadData();
}

/* ================= 2. TRUYỀN TẢI DỮ LIỆU API ================= */
async function guiDuLieu() {
    let maTk = document.getElementById('maTk').value.trim();
    let tenTk = document.getElementById('tenTk').value.trim(); 
    let canNang = document.getElementById('canNang').value;
    
    if(!maTk || !canNang) return alert("Vui lòng nhập đủ Mã tài khoản và Cân nặng!");

    showChartLoader(); // Chỉ làm xoay vùng chart bên dưới
    try {
        await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "nhap_lieu", maTk: maTk, tenTk: tenTk, canNang: canNang }) 
        });
        
        // Reset sạch form nhập liệu ngay lập tức để người dùng gõ tiếp hàng tiếp theo nếu cần
        document.getElementById('maTk').value = '';
        document.getElementById('tenTk').value = '';
        document.getElementById('canNang').value = '';
        
        // Cập nhật ngầm biểu đồ và bảng dữ liệu sau khi nhận phản hồi thành công
        await loadData();
    } catch (error) {
        console.error("Lỗi gửi dữ liệu:", error);
        hideChartLoader();
    }
}   

async function yeuCauXoa() {
    let maTk = document.getElementById('maTkXoa').value.trim();
    if(!maTk) return alert("Vui lòng nhập mã tài khoản cần xoá");

    showChartLoader();
    try {
        await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "yeu_cau_xoa", maTk })
        });
        document.getElementById('maTkXoa').value = '';
        await loadData();
    } catch (error) {
        console.error("Lỗi gửi yêu cầu xoá:", error);
        hideChartLoader();
    }
}

/* ================= 3. ĐỒNG BỘ VÀ CHUẨN HOÁ TÊN HỒ SƠ ================= */
async function loadData() {
    showChartLoader();
    try {
        let res = await fetch(API_URL);
        let data = await res.json();
        
        let htmlTable = "";
        let rawGroupedData = {}; 

        data.forEach(row => {
            let maTk = row[0] ? row[0].toString().trim() : "";
            let canNangStr = row[1] ? row[1].toString().replace(',', '.') : "";
            let canNang = parseFloat(canNangStr);
            let dateObj = new Date(row[2]);
            let tenTk = row[3] ? row[3].toString().trim() : "";

            if (isNaN(canNang) || isNaN(dateObj.getTime())) return; 

            // Thuật toán gộp tài khoản chuẩn hóa 3 tài khoản: long - 1 - l thành longhairRr
            let displayTen = tenTk || maTk || "Ẩn danh";
            let lowerMa = maTk.toLowerCase();
            let lowerTen = tenTk.toLowerCase();
            
            if (["long", "1", "l"].includes(lowerMa) || ["long", "1", "l"].includes(lowerTen)) {
                displayTen = "longhairRr";
            }

            let timeStr = dateObj.toLocaleTimeString('vi-VN', { hour12: false });
            let dateStr = dateObj.toLocaleDateString('vi-VN');
            let fullDateTime = `${dateStr} ${timeStr}`;

            htmlTable += `<tr>
                <td><span class="user-tag">${displayTen}</span></td>
                <td><span class="weight-badge">${canNang} kg</span></td>
                <td>${timeStr}</td>
                <td>${dateStr}</td>
            </tr>`;

            if(!rawGroupedData[displayTen]) {
                rawGroupedData[displayTen] = [];
            }
            rawGroupedData[displayTen].push({
                timestamp: dateObj.getTime(),
                fullDateTime: fullDateTime,
                weight: canNang
            });
        });

        const dataBody = document.getElementById('dataBody');
        if(dataBody) dataBody.innerHTML = htmlTable;

        let finalChartData = {};
        for (let user in rawGroupedData) {
            rawGroupedData[user].sort((a, b) => a.timestamp - b.timestamp);
            finalChartData[user] = {
                labels: rawGroupedData[user].map(item => item.fullDateTime),
                weights: rawGroupedData[user].map(item => item.weight)
            };
        }

        renderCharts(finalChartData);
    } catch (error) {
        console.error("Lỗi xử lý dữ liệu: ", error);
    } finally {
        hideChartLoader();
    }
}

/* ================= 4. KHỞI TẠO ĐỒ THỊ CHART.JS TỰ ĐỘNG KHỚP THEO BIẾN CSS ================= */
function renderCharts(finalChartData) {
    const container = document.getElementById('chartsContainer');
    if(!container) return;
    container.innerHTML = ''; 

    // Đọc động các biến màu Neon khai báo bên CSS để vẽ biểu đồ
    const styles = getComputedStyle(document.body);
    const accentColor = styles.getPropertyValue('--chart-accent').trim() || '#00ff87';
    const gridColor = styles.getPropertyValue('--chart-grid').trim() || 'rgba(255, 255, 255, 0.05)';
    const textColor = styles.getPropertyValue('--chart-text').trim() || '#e0e0e0';

    for (const [user, data] of Object.entries(finalChartData)) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-wrapper';
        wrapper.innerHTML = `<canvas id="chart-${user.replace(/\s+/g, '-')}" style="width:100%; height:320px;"></canvas>`;
        container.appendChild(wrapper);

        const ctx = document.getElementById(`chart-${user.replace(/\s+/g, '-')}`).getContext('2d');
        
        // Tạo dải màu gradient mờ dưới đường đồ thị tuyến tính
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, accentColor + '33');
        gradient.addColorStop(1, accentColor + '00');

        chartInstances[user] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: `TIẾN ĐỘ THÀNH VIÊN: ${user.toUpperCase()}`,
                    data: data.weights,
                    borderColor: accentColor, 
                    backgroundColor: gradient, 
                    borderWidth: 3,
                    pointBackgroundColor: '#0b0c10',
                    pointBorderColor: accentColor,
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.35, 
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: { color: textColor, font: { size: 10, family: 'monospace' } },
                        grid: { color: gridColor }
                    },
                    y: {
                        ticks: { color: accentColor, font: { size: 11, family: 'monospace' } },
                        grid: { color: gridColor }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: accentColor, font: { size: 12, weight: 'bold', family: 'inherit' } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 10, 15, 0.95)',
                        titleColor: accentColor,
                        bodyColor: '#fff',
                        borderColor: accentColor,
                        borderWidth: 1
                    }
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', loadData);