/**
 * ==========================================
 * GESTIÓN DE MÉTRICAS (CHART.JS - MINIMALISTA)
 * ==========================================
 */
let chartInstance = null;

// Asegúrate de que esta función se ejecute al cambiar de tab o al actualizar un hábito
async function loadMetrics() {
    const { data: habits } = await _supabase.from('habit_logs').select('*');
    const today = formatDateLocal(new Date());

    const uniqueHabitNames = [...new Set(habits.map(h => h.habit_name))];
    const projectMap = {};

    // Detección automática por corchetes [ ]
    uniqueHabitNames.forEach(name => {
        const match = name.match(/\[(.*?)\]/);
        if (match) {
            const projName = match[1];
            if (!projectMap[projName]) projectMap[projName] = [];
            projectMap[projName].push(name);
        }
    });

    const container = document.getElementById('subview-metrics-stats');
    container.innerHTML = '<h3>Avance de Proyectos</h3>';

    for (const [projName, habitList] of Object.entries(projectMap)) {
        const logsToday = habits.filter(h => h.log_date === today && h.is_completed);
        const completed = logsToday.filter(h => habitList.includes(h.habit_name)).length;
        const total = habitList.length;
        const percent = (completed / total) * 100;

        container.insertAdjacentHTML('beforeend', `
            <div class="project-card">
                <div class="project-header">
                    <span>${projName}</span>
                    <span>${completed}/${total}</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
            </div>
        `);
    }
    renderChart(labels, dataPoints);
    renderMinimalList(labels, stats, total)
}

function renderChart(labels, dataPoints) {
    const ctx = document.getElementById('metricsChart');
    if (!ctx) return;

    if (chartInstance) {
        chartInstance.destroy();
    }

    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#888888' : '#666666';

    const shortLabels = labels.map(date => {
        const d = new Date(date + 'T00:00:00');
        const weekDayName = d.toLocaleDateString('es-CO', { weekday: 'short' });
        return weekDayName.charAt(0).toUpperCase() + weekDayName.slice(1) + ' ' + d.getDate();
    });

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: shortLabels,
            datasets: [{
                data: dataPoints,
                borderColor: '#74C08A',
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                pointBackgroundColor: '#74C08A',
                pointBorderWidth: 0,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#1C1C1C' : '#ffffff',
                    titleColor: isDark ? '#EAEAEA' : '#1A1A1A',
                    bodyColor: isDark ? '#EAEAEA' : '#1A1A1A',
                    borderColor: isDark ? '#2D2D2D' : '#E5E5E5',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: function (context) { return `${context.parsed.y}% Completado`; }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 110,
                    border: { display: false },
                    grid: { display: false },
                    ticks: { color: textColor, font: { size: 10 }, stepSize: 25 }
                },
                x: {
                    border: { display: false },
                    grid: { display: false },
                    ticks: { color: textColor, font: { size: 10 } }
                }
            }
        }
    });
}

function renderMinimalList(labels, dateStats, totalHabits) {
    const container = document.getElementById('metrics-daily-list');
    if (!container) return;
    container.innerHTML = '';

    [...labels].reverse().forEach(date => {
        const stat = dateStats[date];
        const pct = Math.round((stat.completed / totalHabits) * 100);

        const dObj = new Date(date + 'T00:00:00');
        const weekDayName = dObj.toLocaleDateString('es-CO', { weekday: 'long' });
        const dayNum = dObj.getDate();
        const displayDate = weekDayName.charAt(0).toUpperCase() + weekDayName.slice(1) + ' ' + dayNum;

        const row = `
            <div class="daily-row">
                <div class="daily-date">${displayDate}</div>
                <div class="daily-bar-bg" title="${stat.completed} de ${totalHabits} completados">
                    <div class="daily-bar-fill" style="width: ${pct}%;"></div>
                </div>
                <div class="daily-pct" style="line-height: 1.2;">
                    <span style="display:block;">${pct}%</span>
                    <span style="display:block; font-size: 0.65rem; color: var(--text-muted); font-weight: normal;">${stat.completed}/${totalHabits}</span>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', row);
    });
}


/**
 * ==========================================
 * GENERACIÓN DE INSIGHTS (GEMINI API)
 * ==========================================
 */
/**
 * GENERACIÓN DE INSIGHTS (GEMINI API)
 * NOTA: No hardcodees tu API Key en el código.
 */
async function generateInsights() {
    const focoEl = document.getElementById('insight-foco');
    const patronesEl = document.getElementById('insight-patrones');
    const fraseEl = document.getElementById('insight-frase');

    // Mueve tu API Key a una variable de entorno o gestión segura en el futuro.
    // OBTÉN UNA NUEVA KEY EN: https://aistudio.google.com/
    const apiKey = 'apiKey'; 

    if (apiKey === 'apiKey') {
        alert("Configura tu API Key en la función generateInsights dentro de main.js");
        return;
    }

    try {
        if (focoEl) focoEl.textContent = "1. Leyendo base de datos...";

        const { data: ideas, error } = await _supabase
            .from('ideas_logs')
            .select('content')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw new Error("Error en Supabase: " + error.message);
        if (!ideas || ideas.length === 0) throw new Error("No hay suficientes ideas.");

        // Usamos directamente el modelo flash que es rápido y eficiente
        const modelName = "gemini-1.5-flash";
        
        if (focoEl) focoEl.textContent = "2. Analizando datos...";
        
        const textos = ideas.map(i => i.content).join("\n- ");
        const prompt = `Analiza estas entradas de mi diario. Devuelve SOLO un JSON con: {"foco_mental": "frase corta de 8 palabras max", "patrones": ["tema1", "tema2"], "frase_representativa": "resumen profundo"}. Entradas:\n${textos}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!response.ok) {
            const errRes = await response.json();
            throw new Error(errRes.error?.message || "Error en la petición a la API");
        }

        const result = await response.json();
        const rawText = result.candidates[0].content.parts[0].text;
        const data = JSON.parse(rawText);

        if (focoEl) focoEl.textContent = data.foco_mental || "Sin foco";
        if (patronesEl) patronesEl.textContent = (data.patrones || []).join(' • ');
        if (fraseEl) fraseEl.textContent = `"${data.frase_representativa || ''}"`;

    } catch (err) {
        console.error("Error completo:", err);
        alert("Falla en el análisis:\n\n" + err.message);
        if (focoEl) focoEl.textContent = "Error de ejecución.";
    }
}
