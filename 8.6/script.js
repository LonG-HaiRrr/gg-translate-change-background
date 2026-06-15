// script.js
document.addEventListener('DOMContentLoaded', function() {
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const translateBtn = document.getElementById('translateBtn');
    const sourceLang = document.getElementById('sourceLang');
    const targetLang = document.getElementById('targetLang');
    const swapLang = document.getElementById('swapLang');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const bgMode = document.getElementById('bgMode');
    const bgUrl = document.getElementById('bgUrl');
    const applyBg = document.getElementById('applyBg');

    // Áp dụng background
    applyBg.addEventListener('click', function() {
        const url = bgUrl.value.trim();
        if (url) {
            const mode = bgMode.value;
            if (mode === 'full') {
                document.body.className = 'full-bg';
                document.body.style.backgroundImage = `url(${url})`;
                document.querySelector('.translator').classList.remove('frame-bg');
            } else {
                document.body.className = '';
                document.body.style.backgroundImage = '';
                document.querySelector('.translator').classList.add('frame-bg');
                document.querySelector('.translator').style.backgroundImage = `url(${url})`;
            }
        }
    });

    // Đổi chế độ background
    bgMode.addEventListener('change', function() {
        const url = bgUrl.value.trim();
        if (url) {
            applyBg.click(); // Tự động áp dụng lại
        }
    });

    // Swap ngôn ngữ
    swapLang.addEventListener('click', function() {
        const temp = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = temp;
    });

    // Dịch văn bản
    translateBtn.addEventListener('click', async function() {
        const text = inputText.value.trim();
        if (!text) return;

        translateBtn.textContent = 'Đang dịch...';
        translateBtn.disabled = true;
        outputText.value = 'Đang dịch...';

        try {
            const from = sourceLang.value === 'auto' ? 'auto' : sourceLang.value;
            const to = targetLang.value;
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
            const data = await response.json();
            
            if (data.responseStatus === 200) {
                outputText.value = data.responseData.translatedText;
            } else {
                outputText.value = 'Lỗi dịch: ' + (data.responseDetails || 'Không rõ');
            }
        } catch (error) {
            outputText.value = 'Lỗi kết nối: ' + error.message;
        }

        translateBtn.textContent = 'Dịch ngay';
        translateBtn.disabled = false;
    });

    // Enter để dịch
    inputText.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            translateBtn.click();
        }
    });

    // Sao chép kết quả
    copyBtn.addEventListener('click', function() {
        outputText.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Đã sao chép!';
        setTimeout(() => copyBtn.textContent = 'Sao chép', 2000);
    });

    // Xóa
    clearBtn.addEventListener('click', function() {
        inputText.value = '';
        outputText.value = '';
        inputText.focus();
    });
});
