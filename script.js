let currentData = [];
let histChart = null;
let normalChart = null;

// --- GESTIÓN DE PESTAÑAS ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if(btn.innerText.includes(tabId) || btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
        }
    });
}

function toggleSpecMode() {
    const mode = document.querySelector('input[name="specMode"]:checked').value;
    document.getElementById('limitsInputs').classList.toggle('hidden', mode !== 'limits');
    document.getElementById('toleranceInputs').classList.toggle('hidden', mode !== 'tolerance');
}

function toggleTarget() {
    const isAuto = document.getElementById('autoTarget').checked;
    const targetInput = document.getElementById('target');
    
    if (isAuto) {
        targetInput.disabled = true;
        targetInput.value = ''; 
        targetInput.placeholder = "Auto (Calculado)";
        targetInput.style.opacity = "0.6";
        targetInput.style.cursor = "not-allowed";
    } else {
        targetInput.disabled = false;
        targetInput.placeholder = "Ej: 50";
        targetInput.style.opacity = "1";
        targetInput.style.cursor = "text";
        targetInput.focus();
    }
}

// --- SUBIDA DE ARCHIVOS ---
document.getElementById('fileUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('dataPaste').value = e.target.result;
        switchTab('paste'); 
        alert('Datos cargados. Presiona "CALCULAR RESULTADOS".');
    };
    reader.readAsText(file);
});

// --- SIMULACIÓN ---
function runSimulation() {
    const mu = parseFloat(document.getElementById('simMean').value);
    const sigma = parseFloat(document.getElementById('simStd').value);
    const n = parseInt(document.getElementById('simN').value);
    let simData = [];
    for(let i=0; i<n; i++) {
        let u=0, v=0; 
        while(u===0) u=Math.random(); 
        while(v===0) v=Math.random();
        let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        simData.push(mu + z*sigma);
    }
    document.getElementById('dataPaste').value = simData.map(v => v.toFixed(3)).join('\n');
    switchTab('paste');
}

// --- INTERPRETACIÓN Y COLORES ---
function getInterpretation(val, type) {
    // Si es un índice C (Cp, Cpk, etc.)
    if (val >= 1.33) return "Muy Capaz (Clase 1)";
    if (val >= 1.00) return "Capaz (Clase 2)";
    
    // Mensajes específicos para valores bajos
    if (type === 'Cp') return "Alta Variabilidad";
    if (type === 'Cpu') return "Problema Lim. Sup.";
    if (type === 'Cpl') return "Problema Lim. Inf.";
    if (type === 'Cpk') return "Proceso Descentrado";
    
    return "No Capaz (Clase 3)";
}

// --- FUNCIONES DE EXPORTACIÓN ---

function downloadTxt() {
    let content = "REPORTE SIX SIGMA CALC PRO\n==========================\n\n";
    content += "1. ESPECIFICACIONES\n";
    content += `LSL: ${document.getElementById('lsl').value}\n`;
    content += `USL: ${document.getElementById('usl').value}\n`;
    content += `Target: ${document.getElementById('target').value || 'Auto'}\n\n`;

    content += "2. ESTADÍSTICOS\n";
    content += `Media: ${document.getElementById('res-media').innerText}\n`;
    content += `Desviación: ${document.getElementById('res-sigma').innerText}\n`;
    content += `Rango Datos: ${document.getElementById('res-rango-real').innerText}\n\n`;

    content += "3. ÍNDICES DE CAPACIDAD\n";
    content += `Cp:  ${document.getElementById('res-cp').innerText}\n`;
    content += `Cpk: ${document.getElementById('res-cpk').innerText}\n`;
    content += `Cpu: ${document.getElementById('res-cpu').innerText}\n`;
    content += `Cpl: ${document.getElementById('res-cpl').innerText}\n`;
    content += `Cpm: ${document.getElementById('res-cpm').innerText}\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "Reporte_Capacidad.txt";
    link.click();
}

function downloadExcel() {
    // Generar CSV simple
    let csv = "REPORTE DE CAPACIDAD\n";
    csv += "Parametro,Valor\n";
    csv += `LSL,${document.getElementById('lsl').value}\n`;
    csv += `USL,${document.getElementById('usl').value}\n`;
    csv += `Target,${document.getElementById('target').value || 'Auto'}\n`;
    csv += `Media,${document.getElementById('res-media').innerText}\n`;
    csv += `Desviacion,${document.getElementById('res-sigma').innerText}\n`;
    csv += `Cp,${document.getElementById('res-cp').innerText}\n`;
    csv += `Cpk,${document.getElementById('res-cpk').innerText}\n`;
    csv += `Cpm,${document.getElementById('res-cpm').innerText}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "Reporte_Capacidad.csv";
    link.click();
}

function captureScreen() {
    const element = document.getElementById('captureArea'); // Capturamos la zona de resultados
    // Usamos html2canvas (Asegurate de que la librería esté en el HTML)
    if(typeof html2canvas === 'undefined') {
        alert("Librería de captura no cargada. Revisa tu conexión a internet.");
        return;
    }
    html2canvas(element, { background: '#121212' }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'screenshot_capacidad.png';
        link.href = canvas.toDataURL();
        link.click();
    });
}


// --- CALCULAR ---
function calcular() {
    // 1. ESPECIFICACIONES
    let LSL, USL, Target;
    const mode = document.querySelector('input[name="specMode"]:checked').value;
    
    if (mode === 'limits') {
        LSL = parseFloat(document.getElementById('lsl').value);
        USL = parseFloat(document.getElementById('usl').value);
        const isAutoTarget = document.getElementById('autoTarget').checked;
        if (isAutoTarget) {
            if (!isNaN(LSL) && !isNaN(USL)) {
                Target = (LSL + USL) / 2;
                document.getElementById('target').value = Target; 
            } else { Target = NaN; }
        } else {
            Target = parseFloat(document.getElementById('target').value);
        }
    } else {
        const nom = parseFloat(document.getElementById('nominal').value);
        const tol = parseFloat(document.getElementById('tolerance').value);
        if(!isNaN(nom) && !isNaN(tol)) {
            LSL = nom - tol; USL = nom + tol; Target = nom;
            document.getElementById('calcRangeDisplay').innerText = `[${LSL} - ${USL}]`;
        }
    }

    if(isNaN(LSL) || isNaN(USL) || isNaN(Target)) { 
        alert("Error: Faltan especificaciones (LSL, USL) o Target."); return; 
    }

    // 2. PROCESAR DATOS
    const isManual = document.getElementById('tab-manual').classList.contains('active');
    let Mean, Sigma, N, Var, MinObs, MaxObs;
    let freqData = []; 
    
    if (isManual) {
        // MODO MANUAL
        Mean = parseFloat(document.getElementById('manMean').value);
        Sigma = parseFloat(document.getElementById('manStd').value);
        N = parseInt(document.getElementById('manN').value) || 0;
        Var = Math.pow(Sigma, 2);
        MinObs = Mean - 3*Sigma; 
        MaxObs = Mean + 3*Sigma; 
        
        if (isNaN(Mean) || isNaN(Sigma)) { alert("Modo Manual: Faltan datos."); return; }
        currentData = []; 
        document.getElementById('dataCountDisplay').innerText = "Manual";
        document.getElementById('processedDataContainer').innerText = "Datos ingresados manualmente.";
        document.getElementById('res-rango-real').innerText = "N/A";
        document.getElementById('res-conformidad').innerText = "Estimación Teórica";
        document.querySelector('#freqTable tbody').innerHTML = '<tr><td colspan="6" style="padding:20px; color:#aaa;">Tabla no disponible en modo manual</td></tr>';
        
    } else {
        // --- MODO LISTA DE DATOS ---
        let raw = document.getElementById('dataPaste').value;
        let tempArr = raw.split(/[\s,;]+/).map(n => n.trim())
                         .filter(n => n !== '' && !isNaN(parseFloat(n)) && isFinite(n))
                         .map(Number);

        if(tempArr.length < 2) { alert("Ingresa al menos 2 datos."); return; }

        const getDecimals = (num) => {
            if (Math.floor(num) === num) return 0;
            return num.toString().split(".")[1]?.length || 0;
        };
        const maxDecimals = tempArr.slice(0,100).reduce((max, n) => Math.max(max, getDecimals(n)), 0);
        const precision = Math.max(maxDecimals, 3); 
        
        const roundTo = (num, decimals) => Number(Math.round(num + 'e' + decimals) + 'e-' + decimals);
        
        currentData = tempArr.map(n => roundTo(n, precision));

        document.getElementById('dataCountDisplay').innerText = currentData.length;
        document.getElementById('processedDataContainer').innerText = currentData.join(', ');

        N = currentData.length;
        Mean = currentData.reduce((a,b)=>a+b,0)/N;
        Var = currentData.reduce((a,b)=>a+Math.pow(b-Mean,2),0)/(N-1);
        Sigma = Math.sqrt(Var); 
        
        MinObs = Math.min(...currentData);
        MaxObs = Math.max(...currentData);
        const RangeData = MaxObs - MinObs;

        // --- CÁLCULO DE HISTOGRAMA ---
        let userK = parseInt(document.getElementById('userClasses').value);
        let userW = parseFloat(document.getElementById('userWidth').value);
        let k, rawStep;

        if (!isNaN(userW) && userW > 0) { 
            rawStep = userW;
            k = Math.ceil(RangeData / rawStep);
            if(k < 1) k = 1; 
        } else { 
            k = (userK > 1) ? userK : Math.ceil(1 + 3.322 * Math.log10(N)); 
            rawStep = RangeData / k; 
        }

        let cumF = 0;
        let startPoint = MinObs;

        for(let i=0; i<k; i++) {
            let exactLower = startPoint + (i * rawStep);
            let exactUpper = startPoint + ((i + 1) * rawStep);
            let lower = roundTo(exactLower, precision);
            let upper = roundTo(exactUpper, precision);

            if (i === 0) lower = roundTo(MinObs, precision); 
            if (i === k - 1 && upper < MaxObs) upper = roundTo(MaxObs, precision);

            let mark = (lower + upper) / 2;
            let count = currentData.filter(d => {
                if (i === k - 1) return d >= lower && d <= upper;
                return d >= lower && d < upper;
            }).length;
            
            cumF += count;
            freqData.push({ id: i+1, range: `[${lower.toFixed(precision)} - ${upper.toFixed(precision)})`, x: mark, f: count, F: cumF, h: count/N });
        }
        
        const tbody = document.querySelector('#freqTable tbody');
        tbody.innerHTML = '';
        freqData.forEach(r => { 
            tbody.innerHTML += `<tr><td>${r.id}</td><td>${r.range}</td><td>${r.x.toFixed(precision)}</td><td>${r.f}</td><td>${r.F}</td><td>${(r.h*100).toFixed(1)}%</td></tr>`; 
        });
        
        document.getElementById('res-rango-real').innerText = `[ ${MinObs.toFixed(precision)} ; ${MaxObs.toFixed(precision)} ]`;
        const failures = currentData.filter(x => x < LSL || x > USL).length;
        document.getElementById('res-conformidad').innerText = `${N-failures} OK / ${failures} Fuera`;
    }

    // 3. ÍNDICES
    const Cp = (USL - LSL)/(6*Sigma);
    const Cpu = (USL - Mean)/(3*Sigma);
    const Cpl = (Mean - LSL)/(3*Sigma);
    const Cpk = Math.min(Cpu, Cpl);
    const Tau = Math.sqrt(Math.pow(Sigma,2) + Math.pow(Mean-Target,2));
    const Cpm = (USL - LSL)/(6*Tau);

    // 4. MOSTRAR RESULTADOS
    const resSec = document.getElementById('resultsSection');
    resSec.classList.remove('hidden');
    setTimeout(() => resSec.scrollIntoView({behavior:'smooth'}), 100);

    document.getElementById('res-media').innerText = Mean.toFixed(4);
    document.getElementById('res-var').innerText = Var.toFixed(4);
    document.getElementById('res-sigma').innerText = Sigma.toFixed(4);
    document.getElementById('res-intervalo').innerText = `[ ${(Mean-3*Sigma).toFixed(3)} ; ${(Mean+3*Sigma).toFixed(3)} ]`;

    const analisisBox = document.getElementById('analisis-riesgo');
    let msg = "";
    if (Math.abs(Cpu - Cpl) < 0.1) msg = "✅ <strong>Proceso Centrado:</strong> La media está alineada con el objetivo.";
    else if (Cpl < Cpu) msg = "⚠️ <strong>Riesgo Inferior:</strong> Riesgo alto en <strong>Límite Inferior (LSL)</strong>.";
    else msg = "⚠️ <strong>Riesgo Superior:</strong> Riesgo alto en <strong>Límite Superior (USL)</strong>.";
    if (Cpk < 1) msg += "<br><br>🛑 <strong>Alerta:</strong> El proceso NO es capaz (Cpk < 1).";
    analisisBox.innerHTML = msg;

    // ACTUALIZAR ÍNDICES CON COLORES
    const updateIdx = (id, val, type) => {
        const elV = document.getElementById(`res-${id}`);
        const elD = document.getElementById(`desc-${id}`);
        elV.innerText = val.toFixed(3);
        elD.innerText = getInterpretation(val, type);
        
        // Reset clases
        elV.className = 'index-value'; 
        elD.className = 'index-desc';
        
        // Lógica de Semáforo
        if (val < 1.0) { 
            elV.classList.add('val-fail'); // Rojo
            elD.classList.add('desc-fail'); 
        } else if (val >= 1.0 && val < 1.33) {
            elV.classList.add('val-warn'); // Amarillo
            elD.classList.add('desc-warn');
        } else { 
            elV.classList.add('val-ok'); // Verde
            elD.classList.add('desc-ok'); 
        }
    };
    updateIdx('cp', Cp, 'Cp'); updateIdx('cpu', Cpu, 'Cpu');
    updateIdx('cpl', Cpl, 'Cpl'); updateIdx('cpk', Cpk, 'Cpk'); updateIdx('cpm', Cpm, 'Cpm');

    // 5. GRÁFICOS
    drawHist(freqData); 
    drawNorm(null, Mean, Sigma, LSL, USL);
}

// --- GRÁFICOS ---
// --- GRÁFICO 6.1: HISTOGRAMA CON CURVA REAL ---
function drawHist(data) {
    const ctx = document.getElementById('histogramChart').getContext('2d');
    if(histChart) histChart.destroy();
    
    histChart = new Chart(ctx, {
        type: 'bar', // El tipo base es barras
        data: {
            // Usamos las marcas de clase (punto medio) para el eje X
            labels: data.map(d => d.x.toFixed(3)), 
            datasets: [
                { 
                    // LA CURVA REAL (Línea suavizada)
                    type: 'line',
                    label: 'Tendencia Real', 
                    data: data.map(d=>d.f), 
                    borderColor: '#ffffff', // Línea blanca brillante
                    borderWidth: 2,
                    tension: 0.4, // ESTO ES LA MAGIA: 0 = Recto, 0.4 = Curvo suave
                    pointRadius: 3,
                    pointBackgroundColor: '#1e1e1e',
                    fill: false,
                    order: 1 // Para que aparezca encima de las barras
                },
                { 
                    // LAS BARRAS (Histograma)
                    label: 'Frecuencia', 
                    data: data.map(d=>d.f), 
                    backgroundColor: 'rgba(255, 51, 85, 0.5)', 
                    borderColor: '#ff3355', 
                    borderWidth: 1, 
                    barPercentage: 1.0, 
                    categoryPercentage: 1.0,
                    order: 2
                }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { 
                x: { 
                    grid: { color: '#333' }, 
                    ticks: { color: '#aaa', font: {size: 10} } 
                }, 
                y: { 
                    beginAtZero: true, 
                    grid: { color: '#333' }, 
                    ticks: { color: '#aaa' } 
                } 
            },
            plugins: { 
                legend: { display: true, labels: { color: '#ccc' } },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}

function drawNorm(data, mean, sigma, lsl, usl) {
    const ctx = document.getElementById('normalChart').getContext('2d');
    if(normalChart) normalChart.destroy();
    
    const pts = 100;
    const start = mean - 4*sigma;
    const end = mean + 4*sigma;
    const step = (end-start)/pts;
    let norm = [];
    const peakY = 1/(sigma*Math.sqrt(2*Math.PI));

    for(let i=0; i<=pts; i++) {
        let x = start + i*step;
        let y = (1/(sigma*Math.sqrt(2*Math.PI))) * Math.exp(-0.5*Math.pow((x-mean)/sigma, 2));
        norm.push({x, y});
    }

    const vLine = (x, col, lbl, dash=[5,5], width=2) => {
        return { 
            type: 'line', label: lbl, 
            data: [{x, y:0}, {x, y: peakY}], 
            borderColor: col, borderWidth: width, borderDash: dash, pointRadius: 0, order: 1
        };
    };

    normalChart = new Chart(ctx, {
        data: {
            datasets: [
                { type: 'line', label: 'Curva Normal', data: norm, borderColor: '#fff', borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: 'rgba(255,255,255,0.1)', order: 10 },
                vLine(lsl, '#ff3355', 'LSL', [0,0], 3), vLine(usl, '#ff3355', 'USL', [0,0], 3), vLine(mean, '#fff', 'Media (x̄)'),
                vLine(mean + sigma, 'rgba(0, 255, 255, 0.8)', '+1σ', [4,4], 1), vLine(mean - sigma, 'rgba(0, 255, 255, 0.8)', '-1σ', [4,4], 1),
                vLine(mean + 2*sigma, 'rgba(255, 255, 0, 0.8)', '+2σ', [4,4], 1), vLine(mean - 2*sigma, 'rgba(255, 255, 0, 0.8)', '-2σ', [4,4], 1),
                vLine(mean + 3*sigma, 'rgba(255, 0, 255, 0.8)', '+3σ', [4,4], 1), vLine(mean - 3*sigma, 'rgba(255, 0, 255, 0.8)', '-3σ', [4,4], 1),
            ]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            interaction: { intersect: false, mode: 'index' },
            scales: { x: { type: 'linear', min: start, max: end, grid: { color: '#333' } }, y: { display: false } },
            plugins: { legend: { display: true, position: 'top', labels: { color: '#ccc', boxWidth: 12, font: { size: 10 } } } }
        }
    });
}

function resetAll() {
    document.getElementById('dataPaste').value = '';
    document.getElementById('resultsSection').classList.add('hidden');
    switchTab('paste');
}