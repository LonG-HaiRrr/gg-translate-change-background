const API_URL = "https://script.google.com/macros/s/AKfycbzcIDOcWS1jgIEMReDpzlHEEIQLtEtoo_Y1_Xa3-WsgcFL0vUZ5OZ4NORXCpPcLbEQ_4g/exec";

// Khởi tạo object lưu trữ các biểu đồ để tránh lỗi vẽ đè (memory leak)
let chartInstances = {};

/* ================= 1. HÀM CHUYỂN TAB ================= */
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
    
    // Nếu bấm sang tab danh sách thì reload lại dữ liệu cho mới nhất
    if(tabId === 'TabDanhSach') {
        loadData();
    }
}

/* ================= 2. HÀM API GỬI / XOÁ ================= */
async function guiDuLieu() {
    let maTk = document.getElementById('maTk').value;
    let tenTk = document.getElementById('tenTk').value; // Optional
    let canNang = document.getElementById('canNang').value;
    
    if(!maTk || !canNang) return alert("Vui lòng nhập đủ Mã tài khoản và Cân nặng!");

    // Giữ nguyên action nhap_lieu cho file App Script cũ của bạn
    await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "nhap_lieu", maTk: maTk, canNang: canNang }) 
    });
    
    alert("Đã cập nhật dữ liệu!");
    document.getElementById('maTk').value = '';
    document.getElementById('tenTk').value = '';
    document.getElementById('canNang').value = '';
}

async function yeuCauXoa() {
    let maTk = document.getElementById('maTkXoa').value;
    if(!maTk) return alert("Vui lòng nhập mã tài khoản cần xoá");

    await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "yeu_cau_xoa", maTk })
    });
    alert("Đã gửi yêu cầu xoá!");
    document.getElementById('maTkXoa').value = '';
}

/* ================= 3. HÀM LẤY VÀ XỬ LÝ DỮ LIỆU ================= */
async function loadData() {
    try {
        let res = await fetch(API_URL);
        let data = await res.json();
        
        let htmlTable = "";
        let groupedData = {}; // Object nhóm dữ liệu để vẽ biểu đồ

        data.forEach(row => {
            // Bỏ qua dòng tiêu đề nếu script trả về
            if(row[0] === "Mã Tài Khoản" || row[2] === "Cân Nặng") return;

            let originalMaTk = row[0] ? row[0].toString().trim() : "";
            let lowerMaTk = originalMaTk.toLowerCase();
            let displayMaTk = originalMaTk;

            // GỘP TÊN: Rỗng, "1", "long" -> "longhairrr"
            if (lowerMaTk === "" || lowerMaTk === "1" || lowerMaTk === "long") {
                displayMaTk = "longhairrr";
            }

            // Dữ liệu từ Sheet theo ảnh: Index 2 là Cân Nặng, Index 3 là Ngày
            let canNang = parseFloat(row[2]);
            if (isNaN(canNang)) return; // Bỏ qua nếu cân nặng không phải là số

            let dateObj = new Date(row[3]);
            if(isNaN(dateObj.getTime())) return; // Bỏ qua nếu ngày không hợp lệ

            // Format Giờ phút giây và Ngày
            let timeStr = dateObj.toLocaleTimeString('vi-VN', { hour12: false });
            let dateStr = dateObj.toLocaleDateString('vi-VN');
            let fullDateTime = `${dateStr} ${timeStr}`;

            // 1. TẠO HTML CHO BẢNG
            htmlTable += `<tr>
                <td><strong>${displayMaTk}</strong></td>
                <td>${canNang}</td>
                <td>${timeStr}</td>
                <td>${dateStr}</td>
            </tr>`;

            // 2. NHÓM DỮ LIỆU CHO BIỂU ĐỒ
            if(!groupedData[displayMaTk]) {
                groupedData[displayMaTk] = {
                    labels: [], // Chứa chuỗi thời gian trục X
                    weights: [] // Chứa giá trị cân nặng trục Y
                };
            }
            groupedData[displayMaTk].labels.push(fullDateTime);
            groupedData[displayMaTk].weights.push(canNang);
        });

        document.getElementById('dataBody').innerHTML = htmlTable;

        // Vẽ biểu đồ
        renderCharts(groupedData);

    } catch (error) {
        console.error("Lỗi khi load dữ liệu: ", error);
    }
}

/* ================= 4. HÀM VẼ BIỂU ĐỒ BẰNG CHART.JS ================= */
function renderCharts(groupedData) {
    const container = document.getElementById('chartsContainer');
    container.innerHTML = ''; // Xóa DOM biểu đồ cũ

    for (const [user, data] of Object.entries(groupedData)) {
        // Tạo HTML khung chứa Canvas
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-wrapper';
        wrapper.innerHTML = `
            <h3>[ ADC Dữ Liệu: ${user.toUpperCase()} ]</h3>
            <canvas id="chart-${user}"></canvas>
        `;
        container.appendChild(wrapper);

        // Cấu hình vẽ Chart.js
        const ctx = document.getElementById(`chart-${user}`).getContext('2d');
        
        // Hủy instance cũ nếu có để tránh lỗi hiển thị đè nhấp nháy
        if(chartInstances[user]) {
            chartInstances[user].destroy();
        }

        chartInstances[user] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: `Cân nặng (kg) của ${user}`,
                    data: data.weights,
                    borderColor: '#00ff87', // Màu đường line xanh neon
                    backgroundColor: 'rgba(0, 255, 135, 0.1)', // Màu nền dưới line
                    borderWidth: 2,
                    pointBackgroundColor: '#60efff',
                    pointBorderColor: '#00ff87',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.3, // Độ cong của đường line
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        ticks: { color: '#00ff87' },
                        grid: { color: 'rgba(0, 255, 135, 0.1)' }
                    },
                    y: {
                        ticks: { color: '#00ff87' },
                        grid: { color: 'rgba(0, 255, 135, 0.2)' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#fff', font: { family: 'monospace' } }
                    }
                }
            }
        });
    }
}

// Chạy load dữ liệu ngay khi vừa tải trang
document.addEventListener('DOMContentLoaded', loadData);