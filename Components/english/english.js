/**
 * ==========================================
 * COMPONENTE: ENGLISH COURSE TRACKER
 * ==========================================
 * Curso de Inglés: 704 horas | Inicio: 2025-04-12 | Fin: 2027-06-19
 * 
 * Tabla requerida en Supabase:
 * CREATE TABLE english_classes (
 *   id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 *   level text NOT NULL,
 *   class_number numeric NOT NULL,
 *   class_name text NOT NULL,
 *   grade numeric DEFAULT 0,
 *   status text DEFAULT 'Pendiente',
 *   assigned_date text,
 *   class_date text,
 *   group_code text,
 *   notes text,
 *   created_at timestamptz DEFAULT now(),
 *   updated_at timestamptz DEFAULT now()
 * );
 */

const ENGLISH_END_DATE = '2027-06-19';
let _englishFilter = 'all';

/* ---------- Generador del plan de estudios (388 clases) ---------- */
function generateEnglishCurriculum() {
    const items = [];
    let n = 1;
    function add(level, name, patch) {
        const it = { level, num: n, name, grade: 0, status: 'Pendiente', assigned: '', classDate: '', group: '', notes: '' };
        if (patch) Object.assign(it, patch);
        items.push(it);
        n++;
    }

    /* ===== INGA1 (items 1–98) ===== */
    for (let i = 1; i <= 9; i++) add('INGA1', `INTRO ${i}`);
    for (let i = 2; i <= 9; i++) add('INGA1', `CLASE ${i}`);
    add('INGA1', 'QUIZ UNITS 1*2 - A1');
    add('INGA1', 'TUTORÍA UNITS 1*2 - A1');
    add('INGA1', 'REPETITION QUIZ UNITS 1*2 - A1');
    add('INGA1', 'SMART ZONE - A1');
    for (let i = 10; i <= 18; i++) add('INGA1', `CLASE ${i}`);
    add('INGA1', 'QUIZ UNITS 3*4 - A1');
    add('INGA1', 'SMART ZONE - A1');
    for (let i = 19; i <= 27; i++) add('INGA1', `CLASE ${i}`);
    add('INGA1', 'QUIZ UNITS 5*6 - A1');
    add('INGA1', 'SMART ZONE - A1');
    for (let i = 28; i <= 36; i++) add('INGA1', `CLASE ${i}`);
    add('INGA1', 'QUIZ UNITS 7*8 - A1');
    add('INGA1', 'SMART ZONE - A1');
    for (let i = 37; i <= 45; i++) add('INGA1', `CLASE ${i}`);
    add('INGA1', 'QUIZ UNITS 9*10 - A1');
    add('INGA1', 'SMART ZONE - A1');
    for (let i = 46; i <= 54; i++) add('INGA1', `CLASE ${i}`);
    add('INGA1', 'QUIZ UNITS 11*12 - A1');
    add('INGA1', 'SMART ZONE - A1');
    for (let i = 55; i <= 63; i++) add('INGA1', `CLASE ${i}`);
    add('INGA1', 'QUIZ UNITS 13*14 - A1');
    add('INGA1', 'SMART ZONE - A1');
    for (let i = 64; i <= 72; i++) add('INGA1', `CLASE ${i}`);
    add('INGA1', 'QUIZ UNITS 15*16 - A1');
    add('INGA1', 'SMART ZONE - A1');
    add('INGA1', 'PREPARACIÓN EXAMEN FINAL - A1');
    add('INGA1', 'EXAMEN FINAL - A1');

    /* ===== INGA2 (items 99–188) ===== */
    for (let i = 1; i <= 9; i++) add('INGA2', `CLASE ${i}`);
    add('INGA2', 'QUIZ UNITS 1*2 - A2');
    add('INGA2', 'SMART ZONE - A2');
    for (let i = 10; i <= 18; i++) add('INGA2', `CLASE ${i}`);
    add('INGA2', 'QUIZ UNITS 3*4 - A2');
    add('INGA2', 'SMART ZONE - A2');
    for (let i = 19; i <= 27; i++) add('INGA2', `CLASE ${i}`);
    add('INGA2', 'QUIZ UNITS 5*6 - A2');
    add('INGA2', 'SMART ZONE - A2');
    for (let i = 28; i <= 36; i++) add('INGA2', `CLASE ${i}`);
    add('INGA2', 'QUIZ UNITS 7*8 - A2');
    add('INGA2', 'SMART ZONE - A2');
    for (let i = 37; i <= 45; i++) add('INGA2', `CLASE ${i}`);
    add('INGA2', 'QUIZ UNITS 9*10 - A2');
    add('INGA2', 'SMART ZONE - A2');
    for (let i = 46; i <= 54; i++) add('INGA2', `CLASE ${i}`);
    add('INGA2', 'QUIZ UNITS 11*12 - A2');
    add('INGA2', 'SMART ZONE - A2');
    for (let i = 55; i <= 63; i++) add('INGA2', `CLASE ${i}`);
    add('INGA2', 'QUIZ UNITS 13*14 - A2');
    add('INGA2', 'SMART ZONE - A2');
    for (let i = 64; i <= 72; i++) add('INGA2', `CLASE ${i}`);
    add('INGA2', 'QUIZ UNITS 15*16 - A2');
    add('INGA2', 'SMART ZONE - A2');
    add('INGA2', 'PREPARACIÓN EXAMEN FINAL - A2');
    add('INGA2', 'EXAMEN FINAL - A2');

    /* ===== INGB1 (items 189–278) ===== */
    for (let i = 1; i <= 9; i++) add('INGB1', `CLASE ${i}`);
    add('INGB1', 'QUIZ UNITS 1*2 - B1');
    add('INGB1', 'SMART ZONE - B1');
    for (let i = 10; i <= 18; i++) add('INGB1', `CLASE ${i}`);
    add('INGB1', 'QUIZ UNITS 3*4 - B1');
    add('INGB1', 'SMART ZONE - B1');
    for (let i = 19; i <= 27; i++) add('INGB1', `CLASE ${i}`);
    add('INGB1', 'QUIZ UNITS 5*6 - B1');
    add('INGB1', 'SMART ZONE - B1');
    for (let i = 28; i <= 36; i++) add('INGB1', `CLASE ${i}`);
    add('INGB1', 'QUIZ UNITS 7*8 - B1');
    add('INGB1', 'SMART ZONE - B1');
    for (let i = 37; i <= 45; i++) add('INGB1', `CLASE ${i}`);
    add('INGB1', 'QUIZ UNITS 9*10 - B1');
    add('INGB1', 'SMART ZONE - B1');
    for (let i = 46; i <= 54; i++) add('INGB1', `CLASE ${i}`);
    add('INGB1', 'QUIZ UNITS 11*12 - B1');
    add('INGB1', 'SMART ZONE - B1');
    for (let i = 55; i <= 63; i++) add('INGB1', `CLASE ${i}`);
    add('INGB1', 'QUIZ UNITS 13*14 - B1');
    add('INGB1', 'SMART ZONE - B1');
    for (let i = 64; i <= 72; i++) add('INGB1', `CLASE ${i}`);
    add('INGB1', 'QUIZ UNITS 15*16 - B1');
    add('INGB1', 'SMART ZONE - B1');
    add('INGB1', 'PREPARACIÓN EXAMEN FINAL - B1');
    add('INGB1', 'EXAMEN FINAL - B1');

    /* ===== INGB2 (items 279–388) ===== */
    for (let i = 1; i <= 7; i++) add('INGB2', `CLASE ${i}`);
    add('INGB2', 'QUIZ UNIT 1 - B2');
    add('INGB2', 'SMART ZONE - B2');
    for (let i = 8; i <= 14; i++) add('INGB2', `CLASE ${i}`);
    add('INGB2', 'QUIZ UNIT 2 - B2');
    add('INGB2', 'SMART ZONE - B2');
    for (let i = 15; i <= 21; i++) add('INGB2', `CLASE ${i}`);
    add('INGB2', 'QUIZ UNIT 3 - B2');
    add('INGB2', 'SMART ZONE - B2');
    for (let i = 22; i <= 28; i++) add('INGB2', `CLASE ${i}`);
    add('INGB2', 'QUIZ UNIT 4 - B2');
    add('INGB2', 'SMART ZONE - B2');
    for (let i = 29; i <= 35; i++) add('INGB2', `CLASE ${i}`);
    add('INGB2', 'QUIZ UNIT 5 - B2');
    add('INGB2', 'SMART ZONE - B2');
    for (let i = 36; i <= 42; i++) add('INGB2', `CLASE ${i}`);
    add('INGB2', 'QUIZ UNIT 6 - B2');
    add('INGB2', 'SMART ZONE - B2');
    for (let i = 43; i <= 49; i++) add('INGB2', `CLASE ${i}`);
    add('INGB2', 'QUIZ UNIT 7 - B2');
    add('INGB2', 'SMART ZONE - B2');
    for (let i = 50; i <= 56; i++) add('INGB2', `CLASE ${i}`);
    add('INGB2', 'QUIZ UNIT 8 - B2');
    add('INGB2', 'SMART ZONE - B2');
    for (let i = 57; i <= 63; i++) add('INGB2', `CLASE ${i}`);
    add('INGB2', 'QUIZ UNIT 9 - B2');
    add('INGB2', 'SMART ZONE - B2');
    for (let i = 64; i <= 70; i++) add('INGB2', `CLASE ${i}`);
    add('INGB2', 'QUIZ UNIT 10 - B2');
    add('INGB2', 'SMART ZONE - B2');
    for (let i = 71; i <= 77; i++) add('INGB2', `CLASE ${i}`);
    add('INGB2', 'QUIZ UNIT 11 - B2');
    add('INGB2', 'SMART ZONE - B2');
    for (let i = 78; i <= 84; i++) add('INGB2', `CLASE ${i}`);
    add('INGB2', 'QUIZ UNIT 12 - B2');
    add('INGB2', 'SMART ZONE - B2');
    add('INGB2', 'PREPARACIÓN EXAMEN FINAL - B2');
    add('INGB2', 'EXAMEN FINAL - B2');

    /* ===== PATCH: clases ya tomadas (datos reales del usuario) ===== */
    const patches = [
        { num: 1, grade: 0, status: 'Tomada', assigned: '22/04/25 05:15', classDate: '23/04/25 18:00', group: '2504232017' },
        { num: 2, grade: 0, status: 'Tomada', assigned: '23/04/25 05:16', classDate: '24/04/25 18:00', group: '2504242017' },
        { num: 3, grade: 0, status: 'Tomada', assigned: '24/04/25 05:33', classDate: '25/04/25 16:30', group: '2504252015' },
        { num: 4, grade: 0, status: 'Tomada', assigned: '28/04/25 05:54', classDate: '29/04/25 18:00', group: '2504292017' },
        { num: 5, grade: 0, status: 'Tomada', assigned: '29/04/25 05:52', classDate: '30/04/25 18:00', group: '2504302017' },
        { num: 6, grade: 0, status: 'Tomada', assigned: '29/04/25 18:15', classDate: '30/04/25 19:30', group: '2504302019' },
        { num: 7, grade: 0, status: 'Tomada', assigned: '04/05/25 11:35', classDate: '05/05/25 18:00', group: '2505052017' },
        { num: 8, grade: 0, status: 'Tomada', assigned: '05/05/25 06:26', classDate: '06/05/25 18:00', group: '2505062017' },
        { num: 9, grade: 0, status: 'Tomada', assigned: '06/05/25 05:47', classDate: '07/05/25 18:00', group: '2505072017' },
        { num: 10, grade: 0, status: 'Tomada', assigned: '09/05/25 05:35', classDate: '09/05/25 16:30', group: '2505092015' },
        { num: 11, grade: 0, status: 'Tomada', assigned: '09/05/25 13:13', classDate: '09/05/25 18:00', group: '2505092017' },
        { num: 12, grade: 0, status: 'Tomada', assigned: '19/05/25 05:52', classDate: '20/05/25 18:00', group: '2505202017' },
        { num: 13, grade: 0, status: 'Tomada', assigned: '20/05/25 05:53', classDate: '21/05/25 18:00', group: '2505212017' },
        { num: 14, grade: 0, status: 'Tomada', assigned: '03/06/25 06:15', classDate: '03/06/25 18:00', group: '2506032017' },
        { num: 15, grade: 0, status: 'Tomada', assigned: '03/06/25 06:15', classDate: '04/06/25 18:00', group: '2506042017' },
        { num: 16, grade: 0, status: 'Tomada', assigned: '18/08/25 06:00', classDate: '19/08/25 18:00', group: '2508192017' },
        { num: 17, grade: 0, status: 'Tomada', assigned: '20/08/25 06:07', classDate: '21/08/25 18:00', group: '2508212017' },
    ];
    patches.forEach(p => {
        const it = items.find(x => x.num === p.num);
        if (it) Object.assign(it, p);
    });
    const quiz18 = items.find(x => x.num === 18 && x.level === 'INGA1' && x.name.includes('QUIZ'));
    if (quiz18) { quiz18.grade = 3.40; quiz18.status = 'Tomada'; quiz18.assigned = '06/02/26 10:47'; quiz18.classDate = '06/02/26 11:18'; quiz18.group = ''; }
    const tutor = items.find(x => x.level === 'INGA1' && x.name.includes('TUTORÍA'));
    if (tutor) { tutor.status = 'Tomada'; tutor.assigned = '23/06/26 06:04'; tutor.classDate = '24/06/26 18:00'; tutor.group = '2606243017'; }

    return items;
}

/* ---------- Carga inicial ---------- */
async function loadEnglish() {
    const { data, error } = await _supabase.from('english_classes').select('*').order('class_number', { ascending: true });
    if (error) { console.error('Error cargando english_classes:', error.message); return; }

    const section = document.getElementById('english-section');
    if (!section) return;

    if (!data || data.length === 0) {
        section.innerHTML = `
            <div style="padding:24px; text-align:center;">
                <div style="font-size:1.1rem; font-weight:700; margin-bottom:12px;">🇬🇧 Curso de Inglés</div>
                <p style="color:var(--text-muted); margin-bottom:16px;">No hay plan de estudios cargado.</p>
                <button class="add-habit-btn" onclick="seedEnglishClasses()">📥 Importar plan de 388 clases</button>
            </div>`;
        return;
    }

    renderEnglish(data);
}

async function seedEnglishClasses() {
    const curriculum = generateEnglishCurriculum();
    const payload = curriculum.map(c => ({
        level: c.level,
        class_number: c.num,
        class_name: c.name,
        grade: c.grade,
        status: c.status,
        assigned_date: c.assigned,
        class_date: c.classDate,
        group_code: c.group,
        notes: c.notes
    }));

    const BATCH = 50;
    for (let i = 0; i < payload.length; i += BATCH) {
        const batch = payload.slice(i, i + BATCH);
        const { error } = await _supabase.from('english_classes').insert(batch);
        if (error) { alert('Error importando lote ' + (i/BATCH+1) + ': ' + error.message); return; }
    }
    loadEnglish();
}

/* ---------- Render principal ---------- */
function renderEnglish(data) {
    const section = document.getElementById('english-section');
    if (!section) return;

    const stats = calculateEnglishStats(data);
    const plan = calculateStudyPlan(stats.pending);

    section.innerHTML = `
        <div class="english-kpi-grid">
            <div class="english-kpi-card">
                <div class="english-kpi-label">Completadas</div>
                <div class="english-kpi-value">${stats.completed}<span style="font-size:0.9rem; color:var(--text-muted);"> / ${stats.total}</span></div>
            </div>
            <div class="english-kpi-card">
                <div class="english-kpi-label">Avance</div>
                <div class="english-kpi-value" style="color:var(--primary-green);">${stats.percent}%</div>
            </div>
            <div class="english-kpi-card">
                <div class="english-kpi-label">Promedio</div>
                <div class="english-kpi-value">${stats.avgGrade}</div>
            </div>
            <div class="english-kpi-card">
                <div class="english-kpi-label">Pendientes</div>
                <div class="english-kpi-value" style="color:#e74c3c;">${stats.pending}</div>
            </div>
        </div>

        <div class="english-plan-card">
            <div class="english-plan-header">📅 Plan sugerido para terminar a tiempo</div>
            <div class="english-plan-body">
                <div class="english-plan-row">
                    <span>Fecha límite del curso:</span>
                    <strong>${formatDateNice(ENGLISH_END_DATE)}</strong>
                </div>
                <div class="english-plan-row">
                    <span>Días restantes:</span>
                    <strong>${plan.daysLeft}</strong>
                </div>
                <div class="english-plan-row">
                    <span>Clases pendientes:</span>
                    <strong>${stats.pending}</strong>
                </div>
                <div class="english-plan-row">
                    <span>Ritmo necesario:</span>
                    <strong style="color:${plan.feasible ? 'var(--primary-green)' : '#e74c3c'};">${plan.neededPerWeek} clases/semana</strong>
                </div>
                <div class="english-plan-row">
                    <span>Tu disponibilidad:</span>
                    <strong>Lunes a viernes (máx 10/sem)</strong>
                </div>
                <div class="english-plan-msg ${plan.feasible ? 'english-plan--ok' : 'english-plan--warn'}">
                    ${plan.feasible 
                        ? `✅ Vas bien. Si tomas <strong>${plan.suggestedPerWeek} clases por semana</strong> terminarías aproximadamente el <strong>${formatDateNice(plan.estimatedEnd)}</strong>.` 
                        : `⚠️ Necesitas acelerar. Debes tomar al menos <strong>${Math.ceil(plan.neededPerWeek)} clases/semana</strong> para llegar a la meta.`}
                </div>
            </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding:0 16px; margin-bottom:12px;">
            <div class="english-level-tabs">
                <button class="english-tab-btn ${_englishFilter==='all'?'english-tab-active':''}" onclick="setEnglishFilter('all')">Todos</button>
                <button class="english-tab-btn ${_englishFilter==='INGA1'?'english-tab-active':''}" onclick="setEnglishFilter('INGA1')">A1</button>
                <button class="english-tab-btn ${_englishFilter==='INGA2'?'english-tab-active':''}" onclick="setEnglishFilter('INGA2')">A2</button>
                <button class="english-tab-btn ${_englishFilter==='INGB1'?'english-tab-active':''}" onclick="setEnglishFilter('INGB1')">B1</button>
                <button class="english-tab-btn ${_englishFilter==='INGB2'?'english-tab-active':''}" onclick="setEnglishFilter('INGB2')">B2</button>
            </div>
            <button class="sql-btn-compact" onclick="exportEnglishSQL()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                SQL
            </button>
        </div>

        <div class="english-list">
            ${renderEnglishList(data)}
        </div>

        <div style="padding:12px 16px;">
            <button class="add-habit-btn" style="width:100%;" onclick="addEnglishClass()">+ Agregar clase manual</button>
        </div>
    `;
}

function renderEnglishList(data) {
    let filtered = data;
    if (_englishFilter !== 'all') filtered = data.filter(c => c.level === _englishFilter);

    const grouped = filtered.reduce((acc, c) => {
        if (!acc[c.level]) acc[c.level] = [];
        acc[c.level].push(c);
        return acc;
    }, {});

    return Object.entries(grouped).map(([level, classes]) => {
        const levelPct = Math.round((classes.filter(c => c.status === 'Tomada').length / classes.length) * 100);
        return `
            <div class="english-level-group">
                <div class="english-level-header">
                    <span>${level}</span>
                    <div class="english-level-bar-track">
                        <div class="english-level-bar-fill" style="width:${levelPct}%;"></div>
                    </div>
                    <span class="english-level-pct">${levelPct}%</span>
                </div>
                ${classes.map(c => {
                    const isTaken = c.status === 'Tomada';
                    const safeName = String(c.class_name || '').replace(/'/g, "\\'");
                    return `
                    <div class="english-row ${isTaken ? 'english-row--taken' : ''}">
                        <div class="english-row-main" onclick="toggleEnglishStatus(${c.id}, '${isTaken ? 'Pendiente' : 'Tomada'}')">
                            <span class="english-row-num">${c.class_number}</span>
                            <span class="english-row-name">${c.class_name}</span>
                            <span class="english-row-badge ${isTaken ? 'english-badge--taken' : 'english-badge--pending'}">${isTaken ? '✅ Tomada' : '⏳ Pendiente'}</span>
                        </div>
                        <div class="english-row-meta">
                            ${c.grade > 0 ? `<span class="english-row-grade" onclick="editEnglishGrade(${c.id}, ${c.grade})" title="Clic para editar nota">Nota: ${c.grade}</span>` : ''}
                            ${c.class_date ? `<span class="english-row-date">${c.class_date}</span>` : ''}
                            ${c.notes ? `<span class="english-row-note" title="${c.notes.replace(/"/g, '&quot;')}">📝</span>` : ''}
                            <button class="english-row-btn" onclick="editEnglishNotes(${c.id}, '${safeName}')" title="Notas">📝</button>
                            <button class="english-row-btn" onclick="deleteEnglishClass(${c.id}, '${safeName}')" title="Eliminar">🗑</button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
    }).join('');
}

/* ---------- Filtros ---------- */
function setEnglishFilter(filter) {
    _englishFilter = filter;
    loadEnglish();
}

/* ---------- Cálculos ---------- */
function calculateEnglishStats(data) {
    const total = data.length;
    const completed = data.filter(c => c.status === 'Tomada').length;
    const pending = total - completed;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    const grades = data.filter(c => c.grade > 0).map(c => c.grade);
    const avgGrade = grades.length ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2) : '0.00';
    return { total, completed, pending, percent, avgGrade };
}

function calculateStudyPlan(pending) {
    const end = new Date(ENGLISH_END_DATE);
    const today = new Date();
    const msDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.max(0, Math.ceil((end - today) / msDay));
    const weeksLeft = Math.max(1, daysLeft / 7);
    const neededPerWeek = pending / weeksLeft;
    const maxPerWeek = 10; // lunes-viernes, 2 clases/día máximo recomendado
    const feasible = neededPerWeek <= maxPerWeek;
    const suggestedPerWeek = Math.min(maxPerWeek, Math.ceil(neededPerWeek));
    const weeksAtSuggested = Math.ceil(pending / suggestedPerWeek);
    const estimatedEnd = new Date(today.getTime() + weeksAtSuggested * 7 * msDay);
    return { daysLeft, weeksLeft: Math.ceil(weeksLeft), neededPerWeek: neededPerWeek.toFixed(1), feasible, suggestedPerWeek, estimatedEnd, maxPerWeek };
}

function formatDateNice(dateStrOrObj) {
    const d = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj;
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ---------- Acciones ---------- */
async function toggleEnglishStatus(id, newStatus) {
    const { error } = await _supabase.from('english_classes').update({ status: newStatus }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else loadEnglish();
}

async function editEnglishGrade(id, current) {
    const val = prompt('Editar nota (0-5):', current);
    if (val === null) return;
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const { error } = await _supabase.from('english_classes').update({ grade: num }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else loadEnglish();
}

async function editEnglishNotes(id, name) {
    const { data } = await _supabase.from('english_classes').select('notes').eq('id', id).single();
    const val = prompt(`Notas para "${name}":`, data?.notes || '');
    if (val === null) return;
    const { error } = await _supabase.from('english_classes').update({ notes: val }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else loadEnglish();
}

async function addEnglishClass() {
    const name = prompt('Nombre de la clase:');
    if (!name) return;
    const level = prompt('Nivel (ej: INGA1):', 'INGA1');
    if (!level) return;
    const num = prompt('Número de clase:', '1');
    const { error } = await _supabase.from('english_classes').insert([{
        level, class_number: parseFloat(num) || 1, class_name: name, status: 'Pendiente'
    }]);
    if (error) alert('Error: ' + error.message);
    else loadEnglish();
}

async function deleteEnglishClass(id, name) {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    const { error } = await _supabase.from('english_classes').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else loadEnglish();
}

async function exportEnglishSQL() {
    try {
        const { data, error } = await _supabase.from('english_classes').select('*').order('class_number', { ascending: true });
        if (error) throw error;
        if (!data || !data.length) { alert('No hay datos.'); return; }
        const sql = buildSQLInsert('english_classes', data);
        descargarArchivo(sql, 'english_classes.sql', 'text/sql');
    } catch (err) {
        alert('Error exportando: ' + err.message);
    }
}