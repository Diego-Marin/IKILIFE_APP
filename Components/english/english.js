/**
 * ==========================================
 * COMPONENTE: ENGLISH COURSE TRACKER
 * ==========================================
 * Estructura de datos y plan oficial de A1: sin cambios respecto a
 * la versión anterior (ver A1_CURRICULUM_BLOCKS más abajo). Lo que
 * cambia en esta versión es la PRESENTACIÓN de la lista de clases:
 * en vez de una tabla (difícil de leer en pantallas angostas), cada
 * unidad es una tarjeta plegable (acordeón) con un badge de tarea,
 * una grilla de "chips" numerados para las clases y filas para sus
 * evaluaciones (quiz escrito/online, smart zone). Las entregas de
 * escritura y el examen final se muestran como tarjetas destacadas
 * ("milestones"), igual que en el mockup de referencia
 * (tracker_a1_mobile.html), pero con los tokens visuales de IKILIFE
 * (--primary-green, --text-dark, --bg-header, --border-color, etc.)
 * en vez de la paleta oscura fija del mockup, para que respete el
 * modo claro/oscuro del resto de la app.
 *
 * Se respeta también el ESTADO real de la planilla: las clases 1 a 9
 * ya aparecían marcadas (✓) en la hoja oficial, así que el plan se
 * siembra con esas 9 clases en estado "Tomada".
 *
 * Estructura de la planilla oficial (8 bloques, 72 clases + checkpoints):
 *   UND 1&2   (TASK 1)        → clases 1-9   + Quiz escrito/online + Smart Zone
 *   UND 3&4   (TASK 2)        → clases 10-18 + Quiz escrito/online + Smart Zone
 *   UND 5&6   (TASK 3&4)      → clases 19-27 + Quiz escrito/online + Smart Zone
 *                                + ENTREGA ACTIVIDADES ESCRITURA 1 TO 4
 *   UND 7&8   (TASK 5)        → clases 28-36 + Quiz escrito/online + Smart Zone
 *   UND 9&10  (TASK 6)        → clases 37-45 + Quiz escrito/online + Smart Zone
 *   UND 11&12 (TASK 7)        → clases 46-54 + Quiz escrito/online + Smart Zone
 *   UND 13    (TASK 8)        → clases 55-63 + Quiz escrito/online + Smart Zone
 *                                + ENTREGA ACTIVIDADES ESCRITURA 5 TO 8
 *   UND 14,15&16 (TASK 9,10&11) → clases 64-72 + Quiz escrito/online + Smart Zone
 *                                + ENTREGA ACTIVIDADES ESCRITURA 9 TO 11
 *                                + EXAMEN FINAL A1
 *
 * Tabla requerida en Supabase (con las columnas NUEVAS marcadas):
 * CREATE TABLE english_classes (
 *   id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 *   level text NOT NULL,
 *   sort_order integer NOT NULL,        -- orden real del plan
 *   class_number numeric,               -- 0 en checkpoints/extras (no tienen número real)
 *   class_name text NOT NULL,
 *   kind text DEFAULT 'clase',          -- 'clase' | 'checkpoint' | 'extra'
 *   unit_label text,                    -- ej. "UND 1 & 2" ('' en las filas "extra")
 *   unit_task text,                     -- entrega de la unidad, ej. "TASK 1"
 *   grade numeric DEFAULT 0,
 *   status text DEFAULT 'Pendiente',
 *   assigned_date text,
 *   class_date text,
 *   group_code text,
 *   notes text,
 *   created_at timestamptz DEFAULT now(),
 *   updated_at timestamptz DEFAULT now()
 * );
 *
 * Si la tabla ya existía de una versión anterior, agrega las columnas
 * nuevas así:
 *   ALTER TABLE english_classes ADD COLUMN IF NOT EXISTS sort_order integer;
 *   ALTER TABLE english_classes ADD COLUMN IF NOT EXISTS kind text DEFAULT 'clase';
 *   ALTER TABLE english_classes ADD COLUMN IF NOT EXISTS unit_label text;
 *   ALTER TABLE english_classes ADD COLUMN IF NOT EXISTS unit_task text;
 * El botón "↻ Reimportar plan A1" de la barra de herramientas limpia
 * los datos anteriores y vuelve a cargar el plan oficial real,
 * incluyendo el estado (✓) que ya traía la planilla.
 */

const ENGLISH_END_DATE = '2027-06-19';

/* Niveles disponibles en el tracker. Por ahora solo A1 — agregar acá
   el siguiente nivel (con su propio generador) quedará reflejado
   automáticamente en los tabs y en todos los cálculos por nivel. */
const ENGLISH_LEVELS = [
    { key: 'A1', label: 'A1' },
];
let _englishFilter = 'A1';

/* Caché en memoria de la última carga de Supabase. Permite re-renderizar
   (por ejemplo al abrir/cerrar un acordeón, o al marcar una clase) sin
   tener que volver a pedir los datos cada vez. */
let _englishData = [];

/* Qué tarjetas de unidad están abiertas ahora mismo. Se guarda por
   índice de bloque (0, 1, 2...) para que sobreviva a los re-renders
   provocados por marcar/desmarcar una clase. */
let _englishOpenSections = new Set();
let _englishSectionsInitialized = false;

/* ---------- Estructura real del plan oficial de A1 ----------
   Extraída celda por celda de la planilla oficial: cada bloque son
   las clases numeradas de esa unidad + sus 3 checkpoints (quiz
   escrito, quiz online, smart zone). Las filas "extra" (ENTREGA
   ACTIVIDADES ESCRITURA / EXAMEN FINAL) no pertenecen a ninguna
   unidad — en la planilla original son filas propias, de ancho
   completo, y aquí se muestran como tarjetas "milestone" fuera de
   cualquier acordeón. */
const A1_CURRICULUM_BLOCKS = [
    { unit: 'UND 1 & 2', task: 'TASK 1', start: 1, end: 9, checkpoints: ['QUIZ ESCRITO 1 & 2', 'QUIZ ONLINE 1 & 2', 'SMART ZONE'] },
    { unit: 'UND 3 & 4', task: 'TASK 2', start: 10, end: 18, checkpoints: ['QUIZ ESCRITO 3 & 4', 'QUIZ ONLINE 3 & 4', 'SMART ZONE'] },
    { unit: 'UND 5 & 6', task: 'TASK 3 & 4', start: 19, end: 27, checkpoints: ['QUIZ ESCRITO 5 & 6', 'QUIZ ONLINE 5 & 6', 'SMART ZONE'], extra: ['ENTREGA ACTIVIDADES ESCRITURA 1 TO 4'] },
    { unit: 'UND 7 & 8', task: 'TASK 5', start: 28, end: 36, checkpoints: ['QUIZ ESCRITO 7 & 8', 'QUIZ ONLINE 7 & 8', 'SMART ZONE'] },
    { unit: 'UND 9 & 10', task: 'TASK 6', start: 37, end: 45, checkpoints: ['QUIZ ESCRITO 9 & 10', 'QUIZ ONLINE 9 & 10', 'SMART ZONE'] },
    { unit: 'UND 11 & 12', task: 'TASK 7', start: 46, end: 54, checkpoints: ['QUIZ ESCRITO 11 & 12', 'QUIZ ONLINE 11 & 12', 'SMART ZONE'] },
    { unit: 'UND 13', task: 'TASK 8', start: 55, end: 63, checkpoints: ['QUIZ ESCRITO 13 & 14', 'QUIZ ONLINE 13 & 14', 'SMART ZONE'], extra: ['ENTREGA ACTIVIDADES ESCRITURA 5 TO 8'] },
    { unit: 'UND 14, 15 & 16', task: 'TASK 9, 10 & 11', start: 64, end: 72, checkpoints: ['QUIZ ESCRITO 15 & 16', 'QUIZ ONLINE 15 & 16', 'SMART ZONE'], extra: ['ENTREGA ACTIVIDADES ESCRITURA 9 TO 11', 'EXAMEN FINAL A1'] },
];

/* En la planilla oficial las clases 1 a 9 ya estaban marcadas (✓).
   Se siembra el plan respetando ese estado real. */
const A1_ALREADY_TAKEN = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

function generateA1Curriculum() {
    const items = [];
    let order = 1;

    A1_CURRICULUM_BLOCKS.forEach(block => {
        for (let n = block.start; n <= block.end; n++) {
            items.push({
                level: 'A1', sortOrder: order++, kind: 'clase', classNumber: n,
                name: `Clase ${n}`, unit: block.unit, unitTask: block.task,
                grade: 0, status: A1_ALREADY_TAKEN.has(n) ? 'Tomada' : 'Pendiente',
                assigned: '', classDate: '', group: '', notes: ''
            });
        }
        block.checkpoints.forEach(cpName => {
            items.push({
                // class_number es NOT NULL en la tabla; los checkpoints
                // (quiz, smart zone) no tienen un número real de clase,
                // así que usamos 0 como valor "vacío" seguro — nunca se
                // muestra: el render decide qué pintar por "kind".
                level: 'A1', sortOrder: order++, kind: 'checkpoint', classNumber: 0,
                name: cpName, unit: block.unit, unitTask: block.task,
                grade: 0, status: 'Pendiente', assigned: '', classDate: '', group: '', notes: ''
            });
        });
        (block.extra || []).forEach(exName => {
            items.push({
                // Filas "extra": igual que en la planilla original, no
                // pertenecen a ninguna unidad/entrega — se muestran
                // como tarjeta milestone independiente.
                level: 'A1', sortOrder: order++, kind: 'extra', classNumber: 0,
                name: exName, unit: '', unitTask: '',
                grade: 0, status: 'Pendiente', assigned: '', classDate: '', group: '', notes: ''
            });
        });
    });

    return items;
}

/* Generador único por nivel — hoy solo resuelve A1; cuando se sume un
   nivel nuevo, se agrega su propio "generate<Nivel>Curriculum()" y un
   caso más aquí. */
function generateEnglishCurriculum(levelKey) {
    if (levelKey === 'A1') return generateA1Curriculum();
    return [];
}

/* ---------- Carga inicial ---------- */
async function loadEnglish() {
    if (typeof renderEnglishCourseWeeks === 'function') renderEnglishCourseWeeks();

    const { data, error } = await _supabase.from('english_classes').select('*').order('sort_order', { ascending: true });
    if (error) { console.error('Error cargando english_classes:', error.message); return; }

    const section = document.getElementById('english-section');
    if (!section) return;

    const levelData = (data || []).filter(c => c.level === 'A1');

    if (levelData.length === 0) {
        section.innerHTML = `
            <div style="padding:24px; text-align:center;">
                <div style="font-size:1.1rem; font-weight:700; margin-bottom:12px;">🇬🇧 Curso de Inglés — Nivel A1</div>
                <p style="color:var(--text-muted); margin-bottom:16px;">Aún no está cargada la tabla oficial de A1.</p>
                <button class="add-habit-btn" onclick="seedEnglishClasses()">📥 Importar tabla oficial A1 (72 clases)</button>
            </div>`;
        return;
    }

    _englishData = data.filter(c => ENGLISH_LEVELS.some(l => l.key === c.level));
    renderEnglish(_englishData);
}

/* Siembra (o RE-siembra) el plan oficial de A1. Si ya había datos, se
   limpian primero, con confirmación, antes de cargar la tabla real. */
async function seedEnglishClasses() {
    const { count } = await _supabase.from('english_classes').select('id', { count: 'exact', head: true });

    if (count && count > 0) {
        const ok = confirm('Esto reemplazará todo el historial actual de Inglés por la tabla oficial de A1 (72 clases). ¿Continuar?');
        if (!ok) return;
        const { error: delError } = await _supabase.from('english_classes').delete().neq('id', -1);
        if (delError) { alert('Error limpiando el plan anterior: ' + delError.message); return; }
    }

    const curriculum = generateEnglishCurriculum('A1');
    const payload = curriculum.map(c => ({
        level: c.level,
        sort_order: c.sortOrder,
        class_number: c.classNumber,
        class_name: c.name,
        kind: c.kind,
        unit_label: c.unit,
        unit_task: c.unitTask,
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
        if (error) { alert('Error importando lote ' + (i / BATCH + 1) + ': ' + error.message); return; }
    }
    _englishSectionsInitialized = false; // vuelve a abrir el primer bloque en el plan recién importado
    loadEnglish();
}

/* ---------- Render principal ---------- */
function renderEnglish(data) {
    const section = document.getElementById('english-section');
    if (!section) return;

    const levelData = data.filter(c => c.level === _englishFilter);
    const stats = calculateEnglishStats(levelData);
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
                    <span>Clases/entregables pendientes:</span>
                    <strong>${stats.pending}</strong>
                </div>
                <div class="english-plan-row">
                    <span>Ritmo necesario:</span>
                    <strong style="color:${plan.feasible ? 'var(--primary-green)' : '#e74c3c'};">${plan.neededPerWeek} por semana</strong>
                </div>
                <div class="english-plan-row">
                    <span>Tu disponibilidad:</span>
                    <strong>Lunes a viernes (máx 10/sem)</strong>
                </div>
                <div class="english-plan-msg ${plan.feasible ? 'english-plan--ok' : 'english-plan--warn'}">
                    ${plan.feasible
                        ? `✅ Vas bien. Si tomas <strong>${plan.suggestedPerWeek} por semana</strong> terminarías aproximadamente el <strong>${formatDateNice(plan.estimatedEnd)}</strong>.`
                        : `⚠️ Necesitas acelerar. Debes avanzar al menos <strong>${Math.ceil(plan.neededPerWeek)} por semana</strong> para llegar a la meta.`}
                </div>
            </div>
        </div>

        <div class="english-toolbar">
            <div class="english-level-tabs">
                ${ENGLISH_LEVELS.map(lvl => `
                    <button class="english-tab-btn ${_englishFilter === lvl.key ? 'english-tab-active' : ''}" onclick="setEnglishFilter('${lvl.key}')">${lvl.label}</button>
                `).join('')}
            </div>
            <div style="display:flex; gap:6px;">
                <button class="sql-btn-compact" onclick="seedEnglishClasses()" title="Reimportar la tabla oficial de A1 desde cero">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                    Reimportar
                </button>
                <button class="sql-btn-compact" onclick="exportEnglishSQL()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    SQL
                </button>
            </div>
        </div>

        <div class="english-list">
            ${renderEnglishList(levelData)}
        </div>

        <div style="padding:12px 16px;">
            <button class="add-habit-btn" style="width:100%;" onclick="addEnglishClass()">+ Agregar clase o actividad extra</button>
        </div>
    `;

    // Los acordeones marcados como abiertos arrancan con max-height:0
    // en el CSS (para poder animar su cierre); una vez que el HTML ya
    // está en el DOM, se mide su alto real y se aplica, si no quedan
    // colapsados aunque digan "abiertos".
    requestAnimationFrame(syncEnglishAccordions);
}

function syncEnglishAccordions() {
    document.querySelectorAll('.english-acc.open > .english-acc-body').forEach(body => {
        body.style.maxHeight = body.scrollHeight + 'px';
    });
}

/* Íconos inline (mismo lenguaje visual que el mockup de referencia,
   pero con stroke="currentColor" para heredar el color de IKILIFE
   según el contexto donde se usen). */
const ENGLISH_CHECK_ICON = '<svg width="11" height="11" viewBox="0 0 24 24"><polyline fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" points="4.5 12.5 9.5 17.5 19.5 6.5"/></svg>';
const ENGLISH_ENTREGA_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>';
const ENGLISH_FINAL_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/></svg>';

/* Badge compacto del número de unidad ("UND 1 & 2" -> "U1·2", "UND
   3 & 4" -> "U3·4", "UND 14, 15 & 16" -> "U14·16", "UND 13" -> "U13")
   — mismo criterio de abreviación que antes, aplicado a la unidad en
   vez de a la tarea. Si el bloque no trae número de unidad (por
   ejemplo una clase agregada a mano con unit_label "EXTRA"), usa la
   tarea como respaldo. */
function englishUnitBadge(unitLabel, taskStr) {
    const nums = ((unitLabel || '').match(/\d+/g) || []);
    if (nums.length === 0) {
        const fallback = (taskStr || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
        return fallback || '•';
    }
    if (nums.length === 1) return 'U' + nums[0];
    return 'U' + nums[0] + '·' + nums[nums.length - 1];
}

/* Sub-etiqueta de una fila de evaluación, según el tipo. */
function englishEvalSubLabel(name) {
    if (name.includes('SMART ZONE')) return 'Práctica inteligente';
    if (name.includes('QUIZ')) return 'Evaluación';
    return '';
}

/* Chip numerado de una clase individual dentro de un bloque. */
function englishChipHtml(item) {
    const on = item.status === 'Tomada';
    return `
        <div class="english-chip${on ? ' on' : ''}" data-id="${item.id}" onclick="toggleEnglishStatus(${item.id}, '${on ? 'Pendiente' : 'Tomada'}')">
            <span class="english-chip-dot">${on ? ENGLISH_CHECK_ICON : ''}</span>${item.class_number}
        </div>`;
}

/* Fila de evaluación (quiz escrito/online, smart zone) dentro de un
   bloque de unidad. */
function englishEvalRowHtml(item) {
    const on = item.status === 'Tomada';
    const sub = englishEvalSubLabel(item.class_name);
    return `
        <div class="english-eval-row${on ? ' on' : ''}" data-id="${item.id}" onclick="toggleEnglishStatus(${item.id}, '${on ? 'Pendiente' : 'Tomada'}')">
            <span class="english-eval-dot">${on ? ENGLISH_CHECK_ICON : ''}</span>
            <span class="english-row-txt">${item.class_name}${sub ? `<div class="english-eval-sub">${sub}</div>` : ''}</span>
        </div>`;
}

/* Tarjeta "milestone" de ancho completo: entrega de escritura o
   examen final — no pertenecen a ninguna unidad, igual que en la
   planilla original. */
function englishMilestoneHtml(item) {
    const on = item.status === 'Tomada';
    const isFinal = item.class_name.includes('EXAMEN');
    const cls = 'english-milestone' + (isFinal ? ' english-milestone--final' : '') + (on ? ' on' : '');
    const icon = isFinal ? ENGLISH_FINAL_ICON : ENGLISH_ENTREGA_ICON;
    const sub = isFinal ? 'Último paso del curso' : 'Entrega parcial de escritura';
    return `
        <div class="${cls}" data-id="${item.id}" onclick="toggleEnglishStatus(${item.id}, '${on ? 'Pendiente' : 'Tomada'}')">
            <div class="english-milestone-ic">${icon}</div>
            <div class="english-row-txt">
                <div class="english-milestone-title">${item.class_name}</div>
                <div class="english-milestone-sub">${sub}</div>
            </div>
            <span class="english-milestone-dot">${on ? ENGLISH_CHECK_ICON : ''}</span>
        </div>`;
}

/* Tarjeta plegable de una unidad completa: badge + tarea/unidad +
   contador "hechas/total" + chevron en la cabecera, y grilla de
   chips + filas de evaluación en el cuerpo (colapsable). */
function englishAccordionSectionHtml(items, idx) {
    const first = items[0];
    const classItems = items.filter(c => c.kind === 'clase');
    const evalItems = items.filter(c => c.kind === 'checkpoint');
    const doneCount = items.filter(c => c.status === 'Tomada').length;
    const totalCount = items.length;
    const isOpen = _englishOpenSections.has(idx);
    const isDone = totalCount > 0 && doneCount === totalCount;
    const badge = englishUnitBadge(first.unit_label, first.unit_task);
    const rangeLabel = classItems.length
        ? `Clases ${classItems[0].class_number}–${classItems[classItems.length - 1].class_number}`
        : 'Clases';

    const chips = classItems.map(englishChipHtml).join('');
    const evalRows = evalItems.map(englishEvalRowHtml).join('');

    return `
        <div class="english-acc${isOpen ? ' open' : ''}">
            <div class="english-acc-hd" onclick="toggleEnglishSection(${idx})">
                <div class="english-acc-badge${isDone ? ' done' : ''}">${badge}</div>
                <div class="english-acc-txt">
                    <div class="english-acc-task">${first.unit_label || ''}</div>
                    <div class="english-acc-und">${first.unit_task || ''}</div>
                </div>
                <span class="english-acc-prog">${doneCount}/${totalCount}</span>
                <svg class="english-acc-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="english-acc-body">
                <div class="english-acc-pad">
                    ${classItems.length ? `<div class="english-acc-lbl">${rangeLabel}</div><div class="english-chip-grid">${chips}</div>` : ''}
                    ${evalRows ? `<div class="english-acc-lbl">Evaluaciones</div>${evalRows}` : ''}
                </div>
            </div>
        </div>`;
}

/* Recorre la lista (ya ordenada por sort_order) agrupando en bloques
   de unidad consecutivos (tarjetas de acordeón) y dejando las filas
   "extra" como tarjetas milestone independientes. */
function buildEnglishAccordion(data) {
    if (!_englishSectionsInitialized) {
        _englishOpenSections = new Set([0]); // primer bloque abierto por defecto
        _englishSectionsInitialized = true;
    }

    const html = [];
    let i = 0;
    let blockIdx = 0;
    while (i < data.length) {
        const item = data[i];
        if (item.kind === 'extra') {
            html.push(englishMilestoneHtml(item));
            i++;
            continue;
        }
        const label = item.unit_label;
        const blockItems = [];
        while (i < data.length && data[i].kind !== 'extra' && data[i].unit_label === label) {
            blockItems.push(data[i]);
            i++;
        }
        html.push(englishAccordionSectionHtml(blockItems, blockIdx));
        blockIdx++;
    }
    return html.join('');
}

/* Lista completa: mismo contenido que la planilla oficial de A1
   (72 clases, 8 unidades, checkpoints y entregas), en formato de
   acordeón móvil en vez de tabla. */
function renderEnglishList(data) {
    if (!data.length) {
        return `<div class="english-empty">No hay clases registradas en este nivel.</div>`;
    }

    const levelPct = Math.round((data.filter(c => c.status === 'Tomada').length / data.length) * 100);

    return `
        <div class="english-level-progress">
            <span class="english-level-progress-label">${_englishFilter}</span>
            <div class="english-level-bar-track">
                <div class="english-level-bar-fill" style="width:${levelPct}%;"></div>
            </div>
            <span class="english-level-pct">${levelPct}%</span>
        </div>
        <div class="english-accordion-list">
            ${buildEnglishAccordion(data)}
        </div>
    `;
}

/* ---------- Filtros ---------- */
function setEnglishFilter(filter) {
    _englishFilter = filter;
    _englishSectionsInitialized = false; // el nuevo nivel abre su propio primer bloque
    loadEnglish();
}

/* ---------- Acordeón ---------- */
function toggleEnglishSection(idx) {
    if (_englishOpenSections.has(idx)) _englishOpenSections.delete(idx);
    else _englishOpenSections.add(idx);
    renderEnglish(_englishData); // re-render local, sin volver a pedir datos a Supabase
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
    // Actualización optimista: cambia el estado local y re-renderiza
    // de inmediato (sin esperar la respuesta del servidor ni volver a
    // pedir todos los datos), para que se sienta instantáneo en
    // móvil y no se pierda qué acordeón estaba abierto. Si falla el
    // guardado en Supabase, se revierte y se avisa.
    const item = _englishData.find(c => c.id === id);
    const previousStatus = item ? item.status : null;
    if (item) {
        item.status = newStatus;
        renderEnglish(_englishData);
    }

    const { error } = await _supabase.from('english_classes').update({ status: newStatus }).eq('id', id);
    if (error) {
        alert('Error: ' + error.message);
        if (item) {
            item.status = previousStatus;
            renderEnglish(_englishData);
        }
    }
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

async function addEnglishClass() {
    const name = prompt('Nombre de la clase o actividad extra:');
    if (!name) return;

    const { data: maxRows } = await _supabase
        .from('english_classes')
        .select('sort_order')
        .eq('level', _englishFilter)
        .order('sort_order', { ascending: false })
        .limit(1);
    const nextOrder = (maxRows && maxRows[0] && maxRows[0].sort_order ? maxRows[0].sort_order : 0) + 1;

    const { error } = await _supabase.from('english_classes').insert([{
        level: _englishFilter,
        sort_order: nextOrder,
        class_number: 0, // NOT NULL en la tabla — 0 = "sin número real" (ver nota en generateA1Curriculum)
        class_name: name,
        kind: 'clase',
        unit_label: 'EXTRA',
        unit_task: '',
        status: 'Pendiente'
    }]);
    if (error) alert('Error: ' + error.message);
    else loadEnglish();
}

async function exportEnglishSQL() {
    try {
        const { data, error } = await _supabase.from('english_classes').select('*').order('sort_order', { ascending: true });
        if (error) throw error;
        if (!data || !data.length) { alert('No hay datos.'); return; }
        const sql = buildSQLInsert('english_classes', data);
        descargarArchivo(sql, 'english_classes.sql', 'text/sql');
    } catch (err) {
        alert('Error exportando: ' + err.message);
    }
}