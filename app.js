// 配置常量
const LEVELS = [350, 500, 800, 1000, 3000, 5000, 8000];
let currentMode = 'simple';

// 图表实例存储
let charts = { pie: null, line: null };

// 初始化
window.onload = function() {
    const now = new Date();
    document.getElementById('currentYear').value = now.getFullYear();
    
    initSelectOptions('simplePersonal', LEVELS, 5000);
    initSelectOptions('simpleChild', LEVELS, 0, true);

    renderYearlyInputs();
};

// 辅助：生成下拉选项
function initSelectOptions(elementId, values, defaultValue, allowZero = false) {
    const select = document.getElementById(elementId);
    select.innerHTML = '';
    
    const allVals = allowZero ? [0, ...values] : values;
    const uniqueVals = [...new Set(allVals)];

    uniqueVals.forEach(val => {
        const opt = document.createElement('option');
        const valNum = parseInt(val);
        opt.value = valNum;
        opt.text = valNum === 0 ? '无资助 (¥0)' : `¥${valNum.toLocaleString()}`;
        if (valNum === defaultValue) opt.selected = true;
        select.appendChild(opt);
    });
}

// 辅助：生成HTML字符串给动态列表
function getSelectHTML(className, defaultValue) {
    let html = `<select class="${className}">`;
    html += `<option value="0">¥0</option>`;
    LEVELS.forEach(v => {
        const selected = v === defaultValue ? 'selected' : '';
        html += `<option value="${v}" ${selected}>¥${v.toLocaleString()}</option>`;
    });
    html += `</select>`;
    return html;
}

// 切换模式
function toggleMode(mode) {
    currentMode = mode;
    if (mode === 'simple') {
        document.getElementById('modeSimple').classList.add('active');
        document.getElementById('modeDetailed').classList.remove('active');
        document.getElementById('simpleModePanel').style.display = 'block';
        document.getElementById('detailedModePanel').style.display = 'none';
    } else {
        document.getElementById('modeSimple').classList.remove('active');
        document.getElementById('modeDetailed').classList.add('active');
        document.getElementById('simpleModePanel').style.display = 'none';
        document.getElementById('detailedModePanel').style.display = 'block';
        renderYearlyInputs();
    }
}

// 渲染每年的输入框
function renderYearlyInputs() {
    const currentYear = parseInt(document.getElementById('currentYear').value);
    const birthYear = parseInt(document.getElementById('birthYear').value);
    const retireYear = birthYear + 60;
    const yearsRemaining = retireYear - currentYear;

    const infoDiv = document.getElementById('remainingInfo');
    const container = document.getElementById('dynamicYearsContainer');
    container.innerHTML = '';

    if (yearsRemaining < 0) {
        infoDiv.innerHTML = `根据出生年份，已超过退休年龄 (${retireYear}年)。无法进行未来缴费规划。`;
        infoDiv.style.background = 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
        infoDiv.style.borderColor = '#fecaca';
        infoDiv.style.color = '#991b1b';
        return;
    }

    infoDiv.style.background = '';
    infoDiv.style.borderColor = '';
    infoDiv.style.color = '';
    infoDiv.innerHTML = `预计 <span>${retireYear}</span> 年退休，包含退休当年在内，最多还可缴纳 <span>${yearsRemaining + 1}</span> 次`;

    for (let i = 0; i <= yearsRemaining; i++) {
        const year = currentYear + i;
        const isLastYear = (year === retireYear);
        const row = document.createElement('div');
        row.className = 'year-row';
        
        const labelClass = isLastYear ? 'year-label last-year' : 'year-label';
        const labelText = isLastYear ? `${year}年 (退休)` : `${year}年`;

        row.innerHTML = `
            <div class="${labelClass}">${labelText}</div>
            <div class="input-wrapper">
                <span class="input-label">个人缴纳</span>
                ${getSelectHTML('input-personal', 5000)}
            </div>
            <div class="input-wrapper">
                <span class="input-label">子女资助</span>
                ${getSelectHTML('input-child', 0)}
            </div>
        `;
        container.appendChild(row);
    }
}

function formatMoney(num) {
    return "¥" + num.toFixed(2);
}

function getSubsidy(amount) {
    if (amount >= 800) return 80;
    if (amount >= 500) return 50;
    if (amount >= 350) return 30;
    return 0;
}

// 主计算逻辑
function calculate() {
    const currentYear = parseInt(document.getElementById('currentYear').value);
    const birthYear = parseInt(document.getElementById('birthYear').value);
    let pastYears = parseInt(document.getElementById('pastYears').value);
    let balance = parseFloat(document.getElementById('currentBalance').value);
    
    const basePension = parseFloat(document.getElementById('basePension').value);
    const bonusRate = parseFloat(document.getElementById('bonusRate').value);
    const interestRate = parseFloat(document.getElementById('interestRate').value) / 100;

    const retireYear = birthYear + 60;
    const yearsDifference = retireYear - currentYear;

    if (yearsDifference < 0) {
        showToast("已超过退休年龄，无法计算未来缴费。");
        return;
    }

    let yearlyInputs = [];

    if (currentMode === 'simple') {
        const p = parseFloat(document.getElementById('simplePersonal').value);
        const c = parseFloat(document.getElementById('simpleChild').value);
        for(let i=0; i <= yearsDifference; i++) {
            yearlyInputs.push(p + c);
        }
    } else {
        const container = document.getElementById('dynamicYearsContainer');
        const rows = container.getElementsByClassName('year-row');
        for (let row of rows) {
            const p = parseFloat(row.querySelector('.input-personal').value);
            const c = parseFloat(row.querySelector('.input-child').value);
            yearlyInputs.push(p + c);
        }
    }

    for (let amount of yearlyInputs) {
        balance = balance * (1 + interestRate);
        
        if (amount > 0) {
            let subsidy = getSubsidy(amount); 
            balance = balance + amount + subsidy;
        }
    }

    const futurePayYears = yearlyInputs.filter(v => v > 0).length;
    const totalYears = pastYears + futurePayYears;

    const personalMonthly = balance / 139;

    let longTermBonus = 0;
    if (totalYears > 15) {
        longTermBonus = (totalYears - 15) * bonusRate;
    }
    const baseTotal = basePension + longTermBonus;

    const data60 = { base: baseTotal, personal: personalMonthly };
    const data65 = { base: baseTotal + 5, personal: personalMonthly }; 
    const data75 = { base: baseTotal + 10, personal: personalMonthly };

    document.getElementById('resultCard').style.display = 'block';
    document.getElementById('resRetireYear').innerText = retireYear + "年";
    document.getElementById('resTotalYears').innerText = totalYears + "年";
    document.getElementById('resTotalBalance').innerText = formatMoney(balance);
    document.getElementById('resFirstMonth').innerText = formatMoney(data60.base + data60.personal);

    const tbody = document.getElementById('resultTableBody');
    tbody.innerHTML = `
        <tr>
            <td><strong>60-64岁</strong></td>
            <td style="color:var(--primary-dark); font-weight:bold;">${formatMoney(data60.base + data60.personal)}</td>
            <td>${formatMoney(data60.base)}<span class="sub-text">含长缴奖励 ¥${Math.round(longTermBonus)}</span></td>
            <td>${formatMoney(data60.personal)}</td>
        </tr>
        <tr>
            <td><strong>65-74岁</strong></td>
            <td style="color:var(--primary-dark); font-weight:bold;">${formatMoney(data65.base + data65.personal)}</td>
            <td>${formatMoney(data65.base)}<span class="sub-text" style="color:var(--primary)">+5 高龄补贴</span></td>
            <td>${formatMoney(data65.personal)}</td>
        </tr>
        <tr>
            <td><strong>75岁及以上</strong></td>
            <td style="color:var(--primary-dark); font-weight:bold;">${formatMoney(data75.base + data75.personal)}</td>
            <td>${formatMoney(data75.base)}<span class="sub-text" style="color:var(--primary)">+10 高龄补贴</span></td>
            <td>${formatMoney(data75.personal)}</td>
        </tr>
    `;

    drawCharts(data60, balance);

    setTimeout(() => {
        document.getElementById('resultCard').scrollIntoView({behavior: "smooth", block: "start"});
    }, 100);
}

// Toast 提示
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ef4444;
        color: white;
        padding: 12px 24px;
        border-radius: 10px;
        font-weight: 500;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideDown 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function drawCharts(data60, totalAccountBalance) {
    if (charts.pie) charts.pie.destroy();
    if (charts.line) charts.line.destroy();

    const pieCtx = document.getElementById('pieChart').getContext('2d');
    const total60 = data60.base + data60.personal;
    
    const pieLabelsPlugin = {
        id: 'pieLabels',
        afterDatasetsDraw(chart) {
            const { ctx, data } = chart;
            const meta = chart.getDatasetMeta(0);
            
            ctx.save();
            ctx.font = 'bold 12px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';

            meta.data.forEach((element, index) => {
                const value = data.datasets[0].data[index];
                const percent = ((value / total60) * 100).toFixed(1) + '%';
                const position = element.tooltipPosition();
                
                ctx.fillText(`¥${value.toFixed(0)}`, position.x, position.y - 8);
                ctx.fillText(percent, position.x, position.y + 8);
            });
            ctx.restore();
        }
    };

    charts.pie = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: ['基础养老金', '个人账户养老金'],
            datasets: [{
                data: [data60.base, data60.personal],
                backgroundColor: ['#10b981', '#0ea5e9'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { 
                    display: true, 
                    text: '60岁养老金构成 (月领)', 
                    font: { size: 14, weight: 'bold' },
                    color: '#1e293b',
                    padding: { bottom: 16 }
                },
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        boxWidth: 14, 
                        padding: 16,
                        font: { size: 12 },
                        color: '#64748b'
                    } 
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: '#1e293b',
                    titleFont: { size: 13 },
                    bodyFont: { size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ¥${ctx.raw.toFixed(2)}`
                    }
                }
            }
        },
        plugins: [pieLabelsPlugin]
    });

    const lineCtx = document.getElementById('lineChart').getContext('2d');
    const labels = [];
    const dataPoints = [];
    let cumulative = 0;
    let breakEvenIndex = -1;
    let breakEvenValue = 0;

    for(let age = 60; age <= 90; age++) {
        labels.push(age + '岁');
        
        let monthly = data60.personal;
        let base = data60.base;
        if (age >= 65 && age < 75) base += 5;
        else if (age >= 75) base += 10;
        
        let yearlyTotal = (monthly + base) * 12;
        cumulative += yearlyTotal;
        dataPoints.push(cumulative);

        if (breakEvenIndex === -1 && cumulative >= totalAccountBalance) {
            breakEvenIndex = age - 60;
            breakEvenValue = cumulative;
        }
    }

    const verticalLinePlugin = {
        id: 'verticalLine',
        afterDatasetsDraw(chart) {
            if (breakEvenIndex === -1) return;
            
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
            const xPos = x.getPixelForValue(breakEvenIndex);

            ctx.save();
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ef4444';
            ctx.setLineDash([6, 4]);
            ctx.moveTo(xPos, top);
            ctx.lineTo(xPos, bottom);
            ctx.stroke();
            
            // 背景框
            ctx.fillStyle = '#fef2f2';
            ctx.strokeStyle = '#fecaca';
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            const boxWidth = 85;
            const boxHeight = 36;
            const boxX = xPos + 6;
            const boxY = top + 4;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = '#dc2626';
            ctx.textAlign = 'left';
            ctx.font = 'bold 11px -apple-system, sans-serif';
            ctx.fillText(`🎉 回本 ${breakEvenIndex + 60}岁`, boxX + 6, boxY + 14);
            ctx.font = '10px -apple-system, sans-serif';
            ctx.fillStyle = '#991b1b';
            ctx.fillText(`累计 ¥${Math.round(breakEvenValue).toLocaleString()}`, boxX + 6, boxY + 28);
            ctx.restore();
        }
    };

    charts.line = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '累计领取金额',
                data: dataPoints,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#10b981',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                title: { 
                    display: true, 
                    text: '累计领取金额走势', 
                    font: { size: 14, weight: 'bold' },
                    color: '#1e293b',
                    padding: { bottom: 16 }
                },
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleFont: { size: 13 },
                    bodyFont: { size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: (ctx) => `累计领取: ${formatMoney(ctx.raw)}`,
                        footer: (tooltipItems) => {
                            if(tooltipItems[0].dataIndex === breakEvenIndex) return "★ 恭喜！此时已回本";
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: { size: 10 },
                        color: '#94a3b8',
                        callback: function(value, index) {
                            if (window.innerWidth < 768) {
                                return index % 5 === 0 ? this.getLabelForValue(value) : '';
                            }
                            return index % 2 === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: { 
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        font: { size: 10 },
                        color: '#94a3b8',
                        callback: function(value) {
                            if (value >= 10000) {
                                return (value / 10000).toFixed(0) + '万';
                            }
                            return value;
                        }
                    }
                }
            }
        },
        plugins: [verticalLinePlugin]
    });
}

// 添加动画样式
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes slideDown {
        from { opacity: 0; transform: translate(-50%, -20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes slideUp {
        from { opacity: 1; transform: translate(-50%, 0); }
        to { opacity: 0; transform: translate(-50%, -20px); }
    }
`;
document.head.appendChild(styleSheet);