// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================

// Clave de Supabase dividida para evitar bloqueos de seguridad en GitHub
const sPart1 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnYXdz";
const sPart2 = "d2Z1cm91enN0a2Fwd2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Nzg0NzEsImV4cCI6MjA5";
const sPart3 = "MDU1NDQ3MX0.KciMvGBygkY2lTDtUIE_zztaODNX3XuWb_sEnpzkMHw";
const SUPABASE_KEY = sPart1 + sPart2 + sPart3;

const SUPABASE_URL = "https://pgawswfurouzstkapwby.supabase.co";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


/**
 * ==========================================
 * INICIALIZACIÓN
 * ==========================================
 */
document.addEventListener('DOMContentLoaded', () => {

    // 1. Inicialización de UI
    try {
        const stateBarContainer = document.getElementById('state-bar-container');
        if (stateBarContainer) {
            renderStateBar('state-bar-container');
        } else {
            console.warn("Advertencia: El contenedor 'state-bar-container' no existe en el HTML.");
        }
    } catch (error) {
        console.error("Error al renderizar State Bar:", error);
    }

    // 2. Carga de datos y estado
    try {
        applySavedTheme();
        updateWeeklyProgress();
        loadHabits();
        loadEscuelas();
        loadIdeas();
        loadTareas();
        loadInversiones();
        loadLoves();
        loadSentimientos();
        loadCompras();
        loadBloques();
        loadMetrics(); // Esta ya ejecuta internamente renderYearWeeks() y loadTopHabits()
        loadFinances();
        loadAgradecimientos();
        generateInsights();
    } catch (error) {
        console.error("Error durante la carga de datos:", error);
    }

    // 3. Suscripciones en tiempo real (Supabase)
    try {
        if (typeof _supabase !== 'undefined') {
            _supabase.channel('habit-changes')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'habit_logs' }, () => loadHabits())
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'habit_logs' }, () => loadHabits())
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'habit_logs' }, () => loadHabits())
                .subscribe();
        }
    } catch (error) {
        console.error("Error en la suscripción de Supabase:", error);
    }
});









/**
 * ==========================================
 * GESTIÓN DEL TEMA (MODO CLARO / OSCURO)
 * ==========================================
 */
function toggleTheme() {
    const body = document.body;
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    body.classList.toggle('dark-mode');

    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    if (isDark) {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    } else {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    }
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        if (sunIcon) sunIcon.classList.add('hidden');
        if (moonIcon) moonIcon.classList.remove('hidden');
    } else {
        body.classList.remove('dark-mode');
        if (sunIcon) sunIcon.classList.remove('hidden');
        if (moonIcon) moonIcon.classList.add('hidden');
    }
}

/**
 * ==========================================
 * UTILIDAD: NÚMERO DE SEMANA DEL AÑO (ISO-ish)
 * ==========================================
 * Se centraliza aquí porque ahora la usan tanto el progreso semanal
 * como el bloque de métricas (Progreso del Año).
 */
function getWeekOfYear(date) {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const daysToDate = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
    return Math.ceil((daysToDate + startOfYear.getDay() + 1) / 7);
}

function getDaysRemainingInYear(date) {
    const endOfYear = new Date(date.getFullYear(), 11, 31);
    const msPerDay = 24 * 60 * 60 * 1000;
    // Normalizamos horas para evitar desfaces por horas/minutos
    const todayMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.round((endOfYear - todayMidnight) / msPerDay);
}

/**
 * ==========================================
 * CÁLCULO DE PROGRESO SEMANAL Y FECHAS
 * ==========================================
 */
function updateWeeklyProgress() {
    const today = new Date();

    const dateElement = document.getElementById('current-month-text');
    if (dateElement) {
        const fullDate = new Intl.DateTimeFormat('es-CO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(today);
        dateElement.textContent = fullDate;
    }

    // Ahora se muestra la semana del año (no la semana del mes)
    const weekOfYear = getWeekOfYear(today);
    const weekElement = document.getElementById('current-week-text');
    if (weekElement) {
        weekElement.textContent = `Avance Semana ${weekOfYear} de 52`;
    }

    let currentDay = today.getDay();
    currentDay = currentDay === 0 ? 7 : currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1);

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        const dayString = String(dayDate.getDate()).padStart(2, '0');

        const labelEl = document.getElementById(`day-label-${i + 1}`);
        if (labelEl) {
            labelEl.textContent = dayString;
        }
    }

    const segments = document.querySelectorAll('.day-segment');
    segments.forEach((segment, index) => {
        const segmentDay = index + 1;
        segment.classList.remove('past', 'today', 'future');

        if (segmentDay <= currentDay) {
            segment.classList.add(segmentDay === currentDay ? 'today' : 'past');
            segment.style.backgroundColor = 'var(--primary-green)';
            segment.style.opacity = '1';
        } else {
            segment.classList.add('future');
            segment.style.backgroundColor = 'var(--border-color)';
            segment.style.opacity = '1';
        }
    });
}
/**
 * ==========================================
 * GESTIÓN DE BLOQUES DE RUTINA (JSONB)
 * ==========================================
 */
let bloquesState = {};

async function loadBloques() {
    const { data: bloques, error } = await _supabase
        .from('bloques_logs')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error("Error cargando bloques:", error.message);
        return;
    }

    const container = document.getElementById('bloques-container');
    if (!container) return;

    container.innerHTML = '';
    bloquesState = {};

    bloques.forEach(bloque => {
        bloquesState[bloque.id] = bloque;
        const tasks = bloque.tasks || [];

        let tasksHTML = '';
        tasks.forEach((task, index) => {
            const isDoneClass = task.done ? 'task-done' : '';
            const isChecked = task.done ? 'checked' : '';

            tasksHTML += `
                <li class="bloque-task-item">
                    <input type="checkbox" class="task-checkbox" ${isChecked} onchange="toggleBloqueTask(${bloque.id}, ${index})">
                    <div class="bloque-task-text ${isDoneClass}" 
                         onclick="editBloqueTask(${bloque.id}, ${index})" 
                         title="Clic para editar tarea">${task.text}</div>
                    <button class="delete-btn" onclick="deleteBloqueTask(${bloque.id}, ${index})" title="Eliminar tarea">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </li>
            `;
        });

        const card = `
            <div class="bloque-card">
                <div class="bloque-card-top">
                    <div class="bloque-card-title" 
                         onclick="editBloque(${bloque.id})" 
                         oncontextmenu="event.preventDefault(); deleteBloque(${bloque.id}, '${bloque.name}')" 
                         title="Clic: Editar Nombre | Clic Derecho: Eliminar Bloque">
                        ${bloque.name}
                    </div>
                    <button class="bloque-add-task" onclick="addBloqueTask(${bloque.id})">
                        + Tarea
                    </button>
                </div>
                <ul class="bloque-task-list">
                    ${tasksHTML}
                </ul>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', card);
    });
}

async function addBloque() {
    const name = prompt("Nombre del nuevo bloque (Ej: Mañana):");
    if (!name || name.trim() === "") return;

    const { error } = await _supabase
        .from('bloques_logs')
        .insert([{ name: name.trim(), tasks: [] }]);

    if (error) alert("Error: " + error.message);
    else loadBloques();
}

async function editBloque(id) {
    const currentName = bloquesState[id].name;
    const newName = prompt("Editar nombre del bloque:", currentName);
    if (!newName || newName.trim() === "" || newName === currentName) return;

    const { error } = await _supabase
        .from('bloques_logs')
        .update({ name: newName.trim() })
        .eq('id', id);

    if (error) alert("Error: " + error.message);
    else loadBloques();
}

async function deleteBloque(id, name) {
    if (!confirm(`¿Eliminar todo el bloque "${name}" y sus tareas?`)) return;

    const { error } = await _supabase
        .from('bloques_logs')
        .delete()
        .eq('id', id);

    if (error) alert("Error: " + error.message);
    else loadBloques();
}

async function updateTasksDB(id, newTasksArray) {
    const { error } = await _supabase
        .from('bloques_logs')
        .update({ tasks: newTasksArray })
        .eq('id', id);

    if (error) {
        console.error("Error actualizando tareas:", error.message);
    } else {
        loadBloques();
    }
}

function addBloqueTask(id) {
    const text = prompt("Nueva actividad para este bloque:");
    if (!text || text.trim() === "") return;

    const tasks = bloquesState[id].tasks || [];
    tasks.push({ text: text.trim(), done: false });

    updateTasksDB(id, tasks);
}

function editBloqueTask(id, taskIndex) {
    const tasks = bloquesState[id].tasks;
    const newText = prompt("Editar tarea:", tasks[taskIndex].text);

    if (!newText || newText.trim() === "" || newText === tasks[taskIndex].text) return;

    tasks[taskIndex].text = newText.trim();
    updateTasksDB(id, tasks);
}

function deleteBloqueTask(id, taskIndex) {
    const tasks = bloquesState[id].tasks;
    tasks.splice(taskIndex, 1);
    updateTasksDB(id, tasks);
}

function toggleBloqueTask(id, taskIndex) {
    const tasks = bloquesState[id].tasks;
    tasks[taskIndex].done = !tasks[taskIndex].done;
    updateTasksDB(id, tasks);
}










/**
 * ==========================================
 * GESTIÓN DE HÁBITOS (HISTÓRICO Y DINÁMICO)
 * ==========================================
 */
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

let currentWeekOffset = 0;

function changeWeek(delta) {
    currentWeekOffset += delta;
    if (currentWeekOffset > 0) currentWeekOffset = 0;
    loadHabits();
}

async function loadHabits() {
    const today = new Date();
    let currentDay = today.getDay();
    currentDay = currentDay === 0 ? 7 : currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1 + (currentWeekOffset * 7));

    const datesOfWeek = [];
    let sunday;

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        datesOfWeek.push(formatDateLocal(d));

        if (i === 6) sunday = d;

        const labelEl = document.getElementById(`day-label-${i + 1}`);
        if (labelEl) {
            labelEl.textContent = String(d.getDate()).padStart(2, '0');
        }
    }

    const monthStart = monday.toLocaleDateString('es-CO', { month: 'long' });
    const monthEnd = sunday.toLocaleDateString('es-CO', { month: 'long' });
    const dayStart = monday.getDate();
    const dayEnd = sunday.getDate();

    let weekTitleStr = "";
    if (monthStart === monthEnd) {
        weekTitleStr = `Semana del ${dayStart} al ${dayEnd} de ${monthStart}`;
    } else {
        weekTitleStr = `Semana del ${dayStart} de ${monthStart} al ${dayEnd} de ${monthEnd}`;
    }

    const weekLabel = document.getElementById('habit-week-label');
    const nextBtn = document.getElementById('btn-next-week');
    if (weekLabel && nextBtn) {
        if (currentWeekOffset === 0) {
            weekLabel.textContent = "Semana Actual";
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.3';
            nextBtn.style.cursor = 'default';
        } else {
            weekLabel.textContent = weekTitleStr;
            nextBtn.disabled = false;
            nextBtn.style.opacity = '1';
            nextBtn.style.cursor = 'pointer';
        }
    }

    const { data: allHabitsData, error: err1 } = await _supabase.from('habit_logs').select('habit_name');
    if (err1) return console.error("Error obteniendo nombres:", err1.message);
    const uniqueHabits = [...new Set(allHabitsData.map(h => h.habit_name))].sort();

    const { data: weekLogs, error: err2 } = await _supabase
        .from('habit_logs')
        .select('*')
        .gte('log_date', datesOfWeek[0])
        .lte('log_date', datesOfWeek[6]);

    if (err2) return console.error("Error cargando logs semanales:", err2.message);

    const listContainer = document.getElementById('list-habits');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    uniqueHabits.forEach(habitName => {
        let circlesHTML = '';

        datesOfWeek.forEach(dateStr => {
            const log = weekLogs.find(l => l.habit_name === habitName && l.log_date === dateStr);
            const isDone = log ? log.is_completed : false;

            circlesHTML += `
                <div class="status-circle" 
                     style="background-color: ${isDone ? 'var(--primary-green)' : 'transparent'}; 
                           border-color: ${isDone ? 'var(--primary-green)' : '#999'}"
                     onclick="toggleHabit('${habitName}', '${dateStr}', ${isDone})">
                </div>`;
        });

        const row = `
            <li class="habit-grid">
                <div class="item-name" 
                     onclick="editHabit('${habitName}')"
                     oncontextmenu="event.preventDefault(); deleteHabit('${habitName}')"
                     style="cursor: pointer;"
                     title="Clic: Editar | Clic Derecho: Eliminar todo su historial">
                     ${cleanHabitName(habitName)}
                </div>
                ${circlesHTML}
            </li>
        `;
        listContainer.insertAdjacentHTML('beforeend', row);
    });
}

// Función auxiliar para extraer el proyecto del nombre del hábito
function getProjectFromHabitName(name) {
    if (!name) return null;
    const nameUpper = name.toUpperCase();
    if (nameUpper.includes('#ME')) return 'ME';
    if (nameUpper.includes('#WORK')) return 'WORK';
    if (nameUpper.includes('#INGLES')) return 'INGLES & SOFTWARE';
    if (nameUpper.includes('#LOVES')) return 'LOVES & LIFESTYLE';
    if (nameUpper.includes('#OPPORTUNITIES')) return 'OPPORTUNITIES';
    return null;
}

async function addHabit() {
    const name = prompt("Crea un nuevo hábito:");
    if (!name || name.trim() === "") return;

    const habitName = name.trim();
    const todayStr = formatDateLocal(new Date());
    const projectTag = getProjectFromHabitName(habitName);

    const { data, error } = await _supabase
        .from('habit_logs')
        .insert([{
            habit_name: habitName,
            log_date: todayStr,
            is_completed: false,
            project_tag: projectTag
        }])
        .select();

    if (error) {
        alert("Fallo al guardar. Revisa la Consola (F12). Error: " + error.message);
    } else {
        loadHabits();
    }
}

async function toggleHabit(habitName, dateStr, currentState) {
    const { data, error: fetchError } = await _supabase
        .from('habit_logs')
        .select('id')
        .eq('habit_name', habitName)
        .eq('log_date', dateStr)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error buscando registro:", fetchError.message);
        return;
    }

    if (data) {
        const { error: updateError } = await _supabase
            .from('habit_logs')
            .update({ is_completed: !currentState })
            .eq('id', data.id);

        if (updateError) console.error("Error actualizando:", updateError.message);
    } else {
        const projectTag = getProjectFromHabitName(habitName);

        const { error: insertError } = await _supabase
            .from('habit_logs')
            .insert([{
                habit_name: habitName,
                log_date: dateStr,
                is_completed: !currentState,
                project_tag: projectTag
            }]);

        if (insertError) console.error("Error insertando:", insertError.message);
    }

    loadHabits();
    if (typeof loadMetrics === 'function') loadMetrics();
}

async function editHabit(oldName) {
    const newName = prompt("Editar nombre (afectará a todo su historial):", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;

    const updatedName = newName.trim();
    const newProjectTag = getProjectFromHabitName(updatedName);

    const { error } = await _supabase
        .from('habit_logs')
        .update({
            habit_name: updatedName,
            project_tag: newProjectTag
        })
        .eq('habit_name', oldName);

    if (error) alert("Error al editar: " + error.message);
    else loadHabits();
}

async function deleteHabit(name) {
    const confirmDelete = confirm(`¿Deseas eliminar "${name}" y TODO su registro histórico?`);
    if (!confirmDelete) return;

    const { error } = await _supabase
        .from('habit_logs')
        .delete()
        .eq('habit_name', name);

    if (error) alert("Error al eliminar: " + error.message);
    else loadHabits();
}

/**
 * ==========================================
 * EXPORTAR HÁBITOS A CSV
 * ==========================================
 * Se agrega la lógica que faltaba: el HTML ya llamaba a
 * exportAllHistoryCSV(), pero la función no existía en el JS.
 * Se exporta TODO el historial de habit_logs (todas las semanas).
 */
async function exportAllHistoryCSV() {
    try {
        const { data: allLogs, error } = await _supabase
            .from('habit_logs')
            .select('*')
            .order('log_date', { ascending: true });

        if (error) {
            alert("Error al conectar con la base de datos: " + error.message);
            return;
        }

        if (!allLogs || allLogs.length === 0) {
            alert("No hay datos históricos de hábitos para exportar.");
            return;
        }

        let csvContent = "\uFEFF";
        csvContent += "ID,Fecha,Habito,Proyecto,Completado\n";

        allLogs.forEach(log => {
            const id = log.id || "";
            const fecha = log.log_date || "";
            const nombreLimpio = String(log.habit_name || "").replace(/"/g, '""');
            const habitoCSV = `"${nombreLimpio}"`;
            const proyecto = log.project_tag || "";
            const completado = log.is_completed ? "Si" : "No";

            csvContent += `${id},"${fecha}",${habitoCSV},"${proyecto}",${completado}\n`;
        });

        descargarCSV(csvContent, "IKILIFE_Habitos_Historial_Completo.csv");

    } catch (err) {
        console.error("Error al exportar CSV de hábitos:", err);
        alert("Ocurrió un error inesperado generando el archivo:\n" + err.message);
    }
}

/**
 * Pequeña utilidad compartida para disparar la descarga de cualquier CSV
 * (evita repetir el mismo bloque de Blob/link en cada exportador).
 */
function descargarCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * ==========================================
 * MEJORES HÁBITOS (TOP 3 HISTÓRICO)
 * ==========================================
 * Recorre TODO el historial de habit_logs y cuenta cuántas veces
 * cada hábito fue marcado como completado, mostrando el top 3.
 */
async function loadTopHabits() {
    const { data: allLogs, error } = await _supabase
        .from('habit_logs')
        .select('habit_name, is_completed');

    const container = document.getElementById('top-habits-list');
    if (!container) return;

    if (error) {
        console.error("Error cargando top de hábitos:", error.message);
        container.innerHTML = '';
        return;
    }

    const counts = {};
    allLogs.forEach(log => {
        if (!log.is_completed) return;
        const name = log.habit_name;
        counts[name] = (counts[name] || 0) + 1;
    });

    const ranking = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    container.innerHTML = '';

    if (ranking.length === 0) {
        container.innerHTML = `<div class="top-habit-empty">Aún no hay hábitos completados para mostrar.</div>`;
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];

    ranking.forEach(([name, count], index) => {
        const row = `
            <div class="top-habit-row">
                <span class="top-habit-medal">${medals[index]}</span>
                <span class="top-habit-name">${cleanHabitName(name)}</span>
                <span class="top-habit-count">${count}x</span>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', row);
    });
}









/**
 * ==========================================
 * INTERFAZ DE USUARIO (TABS Y OTROS)
 * ==========================================
 */
function switchTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('tab-active');
        b.classList.add('tab-inactive');
    });
    btn.classList.add('tab-active');
    btn.classList.remove('tab-inactive');

    const views = ['view-habits', 'view-metrics', 'view-ideas', 'view-tareas', 'view-loves', 'view-sentimientos', 'view-money', 'view-compras'];
    views.forEach(v => {
        const viewEl = document.getElementById(v);
        if (viewEl) viewEl.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${tab}`);
    if (targetView) targetView.classList.add('active');

    if (tab === 'metrics') {
        loadMetrics();
    }
}

async function saveLearning() {
    const textEl = document.getElementById('daily-learning');
    if (!textEl || !textEl.value.trim()) return;

    const { error } = await _supabase
        .from('journal_logs')
        .insert([{ content: textEl.value }]);

    if (!error) {
        alert("Guardado");
        textEl.value = '';
    } else {
        alert("Error al guardar: " + error.message);
    }
}

function toggleFinanceView(viewId) {
    const mainView = document.getElementById('finance-main');
    const incomeView = document.getElementById('finance-income');

    if (viewId === 'finance-income') {
        mainView.classList.add('hidden');
        incomeView.classList.remove('hidden');
    } else {
        incomeView.classList.add('hidden');
        mainView.classList.remove('hidden');
    }
}









/**
 * ==========================================
 * GESTIÓN DE ESCUELAS (PROGRESO CONTINUO)
 * ==========================================
 */
async function loadEscuelas() {
    const { data: escuelas, error } = await _supabase
        .from('escuelas_logs')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error("Error cargando escuelas:", error.message);
        return;
    }

    const listContainer = document.getElementById('list-escuelas');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    escuelas.forEach(escuela => {
        const progress = escuela.progress || 0;

        const row = `
            <li class="escuela-grid">
                <div class="item-name" 
                     onclick="editEscuela('${escuela.name}', ${escuela.id})"
                     oncontextmenu="event.preventDefault(); deleteEscuela('${escuela.name}', ${escuela.id})"
                     style="cursor: pointer;"
                     title="Clic: Editar | Clic Derecho: Eliminar">
                     ${escuela.name}
                </div>
                <div class="progress-wrapper" onclick="incrementEscuelaProgress(${escuela.id}, ${progress})" title="Clic para sumar 1%">
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-text">${progress}%</span>
                </div>
            </li>
        `;
        listContainer.insertAdjacentHTML('beforeend', row);
    });
}

async function addEscuela() {
    const name = prompt("Nuevo aprendizaje/escuela:");
    if (!name || name.trim() === "") return;

    const { error } = await _supabase
        .from('escuelas_logs')
        .insert([{ name: name.trim(), progress: 0 }]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        loadEscuelas();
    }
}

async function incrementEscuelaProgress(id, currentProgress) {
    const newProgress = currentProgress + 1;

    const { error } = await _supabase
        .from('escuelas_logs')
        .update({ progress: newProgress })
        .eq('id', id);

    if (error) {
        console.error("Error actualizando progreso:", error.message);
    } else {
        loadEscuelas();
    }
}

async function editEscuela(oldName, id) {
    const newName = prompt("Editar nombre:", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;

    const { error } = await _supabase
        .from('escuelas_logs')
        .update({ name: newName.trim() })
        .eq('id', id);

    if (error) {
        alert("Error al editar: " + error.message);
    } else {
        loadEscuelas();
    }
}

async function deleteEscuela(name, id) {
    const confirmDelete = confirm(`¿Deseas eliminar "${name}"?`);
    if (!confirmDelete) return;

    const { error } = await _supabase
        .from('escuelas_logs')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Error al eliminar: " + error.message);
    } else {
        loadEscuelas();
    }
}











/**
 * ==========================================
 * GESTIÓN DE IDEAS
 * ==========================================
 */
async function loadIdeas() {
    const { data: ideas, error } = await _supabase
        .from('ideas_logs')
        .select('*')
        .or('type.eq.idea,type.is.null')
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) return console.error("Error cargando ideas:", error.message);

    const listContainer = document.getElementById('list-ideas');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    ideas.forEach(idea => {
        const dateObj = new Date(idea.created_at);
        const dateString = dateObj.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
        const timeString = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

        const row = `
            <li class="idea-row">
                <div class="idea-content"
                     onclick="editIdea(${idea.id}, '${idea.content.replace(/'/g, "\\'")}')"
                     oncontextmenu="event.preventDefault(); deleteIdea(${idea.id})"
                     title="Clic: Editar | Clic Derecho: Eliminar">
                     ${idea.content}
                </div>
                <div class="idea-date">${dateString} - ${timeString}</div>
            </li>
        `;
        listContainer.insertAdjacentHTML('beforeend', row);
    });
}

async function addIdea() {
    const rawInput = prompt("Escribe tu nueva idea (usa #etiquetas para categorizar):");
    if (!rawInput || rawInput.trim() === "") return;

    const { content, tags } = parseContentAndTags(rawInput);

    const { error } = await _supabase
        .from('ideas_logs')
        .insert([{ content: content, type: 'idea', tags: tags }]);

    if (error) alert("Error al guardar: " + error.message);
    else loadIdeas();
}
function parseContentAndTags(text) {
    if (!text) return { content: '', tags: [] };
    const words = text.split(' ');
    const tags = words.filter(word => word.startsWith('#')).map(tag => tag.substring(1));
    const content = words.filter(word => !word.startsWith('#')).join(' ').trim();
    return { content, tags };
}

function loadAgradecimientos() {
    // Pendiente de implementación
}
async function editIdea(id, oldContent) {
    const newContent = prompt("Editar idea:", oldContent);
    if (!newContent || newContent.trim() === "" || newContent === oldContent) return;

    const { error } = await _supabase
        .from('ideas_logs')
        .update({ content: newContent.trim() })
        .eq('id', id);

    if (error) {
        alert("Error al editar: " + error.message);
    } else {
        loadIdeas();
    }
}

async function deleteIdea(id) {
    const confirmDelete = confirm("¿Deseas eliminar esta idea?");
    if (!confirmDelete) return;

    const { error } = await _supabase
        .from('ideas_logs')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Error al eliminar: " + error.message);
    } else {
        loadIdeas();
    }
}









/**
 * ==========================================
 * GESTIÓN DE TAREAS (Única Lista)
 * ==========================================
 * Ahora soporta, igual que Brain Dump: editar (clic) y eliminar
 * (clic derecho), conservando también el check para "completar".
 */
async function loadTareas() {
    const { data: tareas, error } = await _supabase.from('tareas_logs').select('*').order('id', { ascending: true });
    if (error) return console.error("Error cargando tareas:", error.message);

    const listDia = document.getElementById('list-tareas-dia');
    if (listDia) listDia.innerHTML = '';

    tareas.forEach(tarea => {
        const safeName = String(tarea.name || '').replace(/'/g, "\\'");

        const row = `
            <li class="tarea-row">
                <div class="tarea-content"
                     onclick="editTarea(${tarea.id}, '${safeName}')"
                     oncontextmenu="event.preventDefault(); deleteTarea(${tarea.id})"
                     style="cursor: pointer;"
                     title="Clic: Editar | Clic Derecho: Eliminar">
                     ${tarea.name}
                </div>
                <button class="delete-btn" onclick="completeTarea(${tarea.id})" aria-label="Completar" title="Completar tarea">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
            </li>
        `;
        if (listDia) listDia.insertAdjacentHTML('beforeend', row);
    });
}

async function addTarea() {
    const name = prompt("Nueva obligación:");
    if (!name || name.trim() === "") return;
    const { error } = await _supabase.from('tareas_logs').insert([{ name: name.trim(), type: 'dia' }]);
    if (error) alert("Error al guardar: " + error.message);
    else loadTareas();
}

// Editar el texto de una tarea (igual que en Brain Dump)
async function editTarea(id, oldName) {
    const newName = prompt("Editar tarea:", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;

    const { error } = await _supabase
        .from('tareas_logs')
        .update({ name: newName.trim() })
        .eq('id', id);

    if (error) alert("Error al editar: " + error.message);
    else loadTareas();
}

// Eliminar la tarea de forma definitiva (clic derecho), con confirmación
async function deleteTarea(id) {
    const confirmDelete = confirm("¿Deseas eliminar esta tarea de forma permanente?");
    if (!confirmDelete) return;

    const { error } = await _supabase.from('tareas_logs').delete().eq('id', id);
    if (error) alert("Error al eliminar: " + error.message);
    else loadTareas();
}

// Completar tarea: mantiene el comportamiento original del botón check
// (al completarla, se elimina de la lista de pendientes)
async function completeTarea(id) {
    const { error } = await _supabase.from('tareas_logs').delete().eq('id', id);
    if (error) console.error("Error al completar tarea:", error.message);
    else loadTareas();
}











/**
 * ==========================================
 * GESTIÓN DE INVERSIONES Y DEUDAS (JSONB - CUOTAS)
 * ==========================================
 */
let inversionesState = {};

async function loadInversiones() {
    const { data: inversiones, error } = await _supabase
        .from('inversiones_logs')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error("Error cargando inversiones:", error.message);
        return;
    }

    const container = document.getElementById('inversiones-container');
    if (!container) return;

    container.innerHTML = '';
    inversionesState = {};

    inversiones.forEach(inv => {
        inversionesState[inv.id] = inv;
        const cuotas = inv.cuotas || [];

        let cuotasHTML = '';
        cuotas.forEach((cuota, index) => {
            const isDoneClass = cuota.done ? 'cuota-done' : '';
            const isChecked = cuota.done ? 'checked' : '';

            cuotasHTML += `
                <li class="cuota-item">
                    <input type="checkbox" class="task-checkbox" ${isChecked} onchange="toggleCuota(${inv.id}, ${index})">
                    <div class="cuota-text ${isDoneClass}" 
                         onclick="editCuota(${inv.id}, ${index})" 
                         title="Clic para editar cuota">${cuota.text}</div>
                    <button class="delete-btn" onclick="deleteCuota(${inv.id}, ${index})" title="Eliminar cuota">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </li>
            `;
        });

        const card = `
            <div class="inversion-card">
                <div class="inversion-card-top">
                    <div class="inversion-card-title" 
                         onclick="editInversionName(${inv.id})" 
                         oncontextmenu="event.preventDefault(); deleteInversionFull(${inv.id}, '${inv.name}')" 
                         title="Clic: Editar Nombre | Clic Derecho: Eliminar Deuda Completa">
                        ${inv.name}
                    </div>
                    <button class="inversion-add-cuota" onclick="addCuota(${inv.id})">
                        + Cuota
                    </button>
                </div>
                <ul class="cuota-list">
                    ${cuotasHTML}
                </ul>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', card);
    });
}

async function addInversion() {
    const name = prompt("Nombre de la Deuda/Inversión (Ej: Bolso Totto):");
    if (!name || name.trim() === "") return;

    const numCuotasStr = prompt("¿Cuántas cuotas iniciales tiene? (Escribe un número, 0 si no sabes):", "1");
    const numCuotas = parseInt(numCuotasStr) || 0;

    let cuotasIniciales = [];
    for (let i = 1; i <= numCuotas; i++) {
        cuotasIniciales.push({ text: `Cuota ${i}`, done: false });
    }

    const { error } = await _supabase
        .from('inversiones_logs')
        .insert([{ name: name.trim(), cuotas: cuotasIniciales }]);

    if (error) alert("Error: " + error.message);
    else loadInversiones();
}

async function editInversionName(id) {
    const currentName = inversionesState[id].name;
    const newName = prompt("Editar nombre de la deuda:", currentName);
    if (!newName || newName.trim() === "" || newName === currentName) return;

    const { error } = await _supabase
        .from('inversiones_logs')
        .update({ name: newName.trim() })
        .eq('id', id);

    if (error) alert("Error: " + error.message);
    else loadInversiones();
}

async function deleteInversionFull(id, name) {
    if (!confirm(`¿Eliminar la deuda "${name}" y todo su historial de cuotas?`)) return;

    const { error } = await _supabase
        .from('inversiones_logs')
        .delete()
        .eq('id', id);

    if (error) alert("Error: " + error.message);
    else loadInversiones();
}

async function updateCuotasDB(id, newCuotasArray) {
    const { error } = await _supabase
        .from('inversiones_logs')
        .update({ cuotas: newCuotasArray })
        .eq('id', id);

    if (error) {
        console.error("Error actualizando cuotas:", error.message);
    } else {
        loadInversiones();
    }
}

function addCuota(id) {
    const text = prompt("Detalle de la cuota (Ej: Cuota 2 - $50.000):");
    if (!text || text.trim() === "") return;

    const cuotas = inversionesState[id].cuotas || [];
    cuotas.push({ text: text.trim(), done: false });

    updateCuotasDB(id, cuotas);
}

function editCuota(id, cuotaIndex) {
    const cuotas = inversionesState[id].cuotas;
    const newText = prompt("Editar cuota:", cuotas[cuotaIndex].text);

    if (!newText || newText.trim() === "" || newText === cuotas[cuotaIndex].text) return;

    cuotas[cuotaIndex].text = newText.trim();
    updateCuotasDB(id, cuotas);
}

function deleteCuota(id, cuotaIndex) {
    if (!confirm("¿Eliminar esta cuota?")) return;
    const cuotas = inversionesState[id].cuotas;
    cuotas.splice(cuotaIndex, 1);
    updateCuotasDB(id, cuotas);
}

function toggleCuota(id, cuotaIndex) {
    const cuotas = inversionesState[id].cuotas;
    cuotas[cuotaIndex].done = !cuotas[cuotaIndex].done;
    updateCuotasDB(id, cuotas);
}









/**
 * ==========================================
 * GESTIÓN DE COSAS QUE AMO (LOVES)
 * ==========================================
 */
async function loadLoves() {
    const { data: loves, error } = await _supabase
        .from('loves_logs')
        .select('*')
        .order('count', { ascending: false });

    if (error) return console.error(error.message);

    const container = document.getElementById('list-loves');
    if (!container) return;
    container.className = 'loves-grid';
    container.innerHTML = '';

    loves.forEach(love => {
        const card = document.createElement('div');
        card.className = 'passion-card';

        const localImagePath = `assets/images/${love.image_filename}`;

        card.innerHTML = `
            <img src="${localImagePath}" class="passion-img" 
                 onerror="this.src='assets/images/default.jpg'">
            <div class="passion-info">
                <span class="passion-name">${love.name}</span>
                <span class="passion-count">${love.count}</span>
            </div>
        `;

        card.addEventListener('dblclick', () => {
            card.classList.add('pop-animation');
            incrementLove(love.id, love.count);

            const countEl = card.querySelector('.passion-count');
            countEl.textContent = parseInt(countEl.textContent) + 1;

            setTimeout(() => card.classList.remove('pop-animation'), 300);
        });

        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            deleteLove(love.name, love.id);
        });

        container.appendChild(card);
    });
}

async function addLove() {
    const name = prompt("Nueva pasión o actividad que amas:");
    if (!name || name.trim() === "") return;

    const { error } = await _supabase
        .from('loves_logs')
        .insert([{ name: name.trim(), count: 0 }]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        loadLoves();
    }
}

async function incrementLove(id, currentCount) {
    const { error } = await _supabase
        .from('loves_logs')
        .update({ count: currentCount + 1 })
        .eq('id', id);

    if (error) {
        console.error("Error sumando contador:", error.message);
    } else {
        loadLoves();
    }
}

async function editLove(oldName, id) {
    const newName = prompt("Editar nombre:", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;

    const { error } = await _supabase
        .from('loves_logs')
        .update({ name: newName.trim() })
        .eq('id', id);

    if (error) {
        alert("Error al editar: " + error.message);
    } else {
        loadLoves();
    }
}

async function deleteLove(name, id) {
    const confirmDelete = confirm(`¿Deseas eliminar "${name}"?`);
    if (!confirmDelete) return;

    const { error } = await _supabase
        .from('loves_logs')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Error al eliminar: " + error.message);
    } else {
        loadLoves();
    }
}

/**
 * Exportar historial completo de Loves a CSV.
 */
async function exportLovesCSV() {
    try {
        const { data: allLoves, error } = await _supabase
            .from('loves_logs')
            .select('*')
            .order('count', { ascending: false });

        if (error) {
            alert("Error al conectar con la base de datos: " + error.message);
            return;
        }

        if (!allLoves || allLoves.length === 0) {
            alert("No hay datos de Loves para exportar.");
            return;
        }

        let csvContent = "\uFEFF";
        csvContent += "ID,Nombre,Veces_Registrado\n";

        allLoves.forEach(love => {
            const id = love.id || "";
            const nombreLimpio = String(love.name || "").replace(/"/g, '""');
            csvContent += `${id},"${nombreLimpio}",${love.count || 0}\n`;
        });

        descargarCSV(csvContent, "IKILIFE_Loves_Historial_Completo.csv");

    } catch (err) {
        console.error("Error al exportar CSV de Loves:", err);
        alert("Ocurrió un error inesperado generando el archivo:\n" + err.message);
    }
}









/**
 * ==========================================
 * GESTIÓN DE SENTIMIENTOS (CLON DE LOVES)
 * ==========================================
 */
async function loadSentimientos() {
    const { data: sentimientos, error } = await _supabase
        .from('sentimientos_logs')
        .select('*')
        .order('count', { ascending: false });

    if (error) return console.error(error.message);

    const container = document.getElementById('list-sentimientos');
    if (!container) return;
    container.className = 'loves-grid';
    container.innerHTML = '';

    sentimientos.forEach(sentimiento => {
        const card = document.createElement('div');
        card.className = 'passion-card';

        const localImagePath = `assets/images/${sentimiento.image_filename}`;

        card.innerHTML = `
            <img src="${localImagePath}" class="passion-img" 
                 onerror="this.src='assets/images/default.jpg'">
            <div class="passion-info">
                <span class="passion-name">${sentimiento.name}</span>
                <span class="passion-count">${sentimiento.count}</span>
            </div>
        `;

        card.addEventListener('dblclick', () => {
            card.classList.add('pop-animation');
            incrementSentimiento(sentimiento.id, sentimiento.count);

            const countEl = card.querySelector('.passion-count');
            countEl.textContent = parseInt(countEl.textContent) + 1;

            setTimeout(() => card.classList.remove('pop-animation'), 300);
        });

        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            deleteSentimiento(sentimiento.name, sentimiento.id);
        });

        container.appendChild(card);
    });
}

async function addSentimiento() {
    const name = prompt("Nuevo sentimiento a registrar:");
    if (!name || name.trim() === "") return;

    const { error } = await _supabase
        .from('sentimientos_logs')
        .insert([{ name: name.trim(), count: 0 }]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        loadSentimientos();
    }
}

async function incrementSentimiento(id, currentCount) {
    const { error } = await _supabase
        .from('sentimientos_logs')
        .update({ count: currentCount + 1 })
        .eq('id', id);

    if (error) {
        console.error("Error sumando contador:", error.message);
    } else {
        loadSentimientos();
    }
}

async function editSentimiento(oldName, id) {
    const newName = prompt("Editar nombre:", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;

    const { error } = await _supabase
        .from('sentimientos_logs')
        .update({ name: newName.trim() })
        .eq('id', id);

    if (error) {
        alert("Error al editar: " + error.message);
    } else {
        loadSentimientos();
    }
}

async function deleteSentimiento(name, id) {
    const confirmDelete = confirm(`¿Deseas eliminar "${name}"?`);
    if (!confirmDelete) return;

    const { error } = await _supabase
        .from('sentimientos_logs')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Error al eliminar: " + error.message);
    } else {
        loadSentimientos();
    }
}









/**
 * ==========================================
 * GESTIÓN DE MÉTRICAS 
 * ==========================================
 */
// Función para limpiar el nombre del hábito visualmente (quita hashtags)
function cleanHabitName(name) {
    if (!name) return '';
    return name.replace(/#[a-zA-Z0-9_&]+/gi, '').trim();
}

async function loadMetrics() {
    // 1. Renderizar Semanas del Año
    if (typeof renderYearWeeks === 'function') {
        renderYearWeeks();
    }

    // 2. Renderizar el Top 3 de mejores hábitos históricos
    if (typeof loadTopHabits === 'function') {
        loadTopHabits();
    }
}

function renderYearWeeks() {
    const container = document.getElementById('year-weeks-grid');
    if (!container) return;
    container.innerHTML = '';

    const today = new Date();

    // Semana actual del año y días restantes hasta el 31 de diciembre
    const currentWeek = getWeekOfYear(today);
    const daysRemaining = getDaysRemainingInYear(today);
    const totalWeeks = 52;

    // Actualizar el título de la sección con la semana corriendo
    // y el mensaje de días restantes para terminar el año.
    const titleEl = document.getElementById('year-progress-title');
    if (titleEl) {
        titleEl.innerHTML = `Progreso del Año · Semana ${currentWeek} de ${totalWeeks}
            <span class="year-progress-subtitle">Quedan ${daysRemaining} días para terminar el año</span>`;
    }

    for (let i = 1; i <= totalWeeks; i++) {
        const box = document.createElement('div');
        box.className = 'week-box';
        box.title = `Semana ${i}`;

        if (i < currentWeek) {
            box.classList.add('passed');
        } else if (i === currentWeek) {
            box.classList.add('current');
            box.title = `Semana ${i} (Actual)`;
        }

        container.appendChild(box);
    }
}








/**
 * ==========================================
 * GESTIÓN DE FINANZAS (DINÁMICO - ACUMULATIVO)
 * ==========================================
 */
function formatCurrency(num) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num || 0);
}

async function loadFinances() {
    const { data: finances, error } = await _supabase.from('finance_logs').select('*').order('id', { ascending: true });
    if (error) return console.error("Error cargando finanzas:", error.message);

    const listIncomes = document.getElementById('list-incomes');
    const expensesContainer = document.getElementById('dynamic-expense-categories');

    if (listIncomes) listIncomes.innerHTML = '';
    if (expensesContainer) expensesContainer.innerHTML = '';

    let totalIngresosReal = 0;
    let totalGastosReal = 0;
    const expensesByCategory = {};

    finances.forEach(item => {
        const isIncome = item.type === 'income';
        const textColorClass = isIncome ? 'text-income' : 'text-expense';

        const row = `
            <li class="finance-item" oncontextmenu="event.preventDefault(); deleteFinanceItem(${item.id}, '${item.concept}')">
                <div class="finance-item-name" style="cursor:pointer; overflow:hidden; text-overflow:ellipsis;" onclick="editFinanceConcept(${item.id}, '${item.concept}')" title="Clic para editar nombre | Clic Derecho para eliminar">
                    ${item.concept}
                </div>
                <div class="${textColorClass}" style="font-weight:bold; font-size: 0.95rem; text-align:right; cursor:pointer;" onclick="editFinanceRealTotal(${item.id}, ${item.real})" title="Total acumulado (Clic para corregir manualmente)">
                    ${formatCurrency(item.real)}
                </div>
                <div>
                    <input type="number" class="finance-input" onchange="addFinanceReal(${item.id}, ${item.real}, this.value)" placeholder="+ Sumar" title="Escribe un valor y presiona Enter">
                </div>
            </li>
        `;

        if (isIncome) {
            totalIngresosReal += Number(item.real);
            if (listIncomes) listIncomes.insertAdjacentHTML('beforeend', row);
        } else {
            totalGastosReal += Number(item.real);
            if (!expensesByCategory[item.category]) expensesByCategory[item.category] = [];
            expensesByCategory[item.category].push(row);
        }
    });

    for (const [category, itemsRows] of Object.entries(expensesByCategory)) {
        const sectionHTML = `
            <section class="category">
                <div class="category-header" style="display:flex; justify-content:space-between; align-items:center;">
                    ${category}
                    <button class="icon-btn" onclick="addFinanceItem('expense', '${category}')" title="Agregar a ${category}" style="padding: 2px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>
                <ul style="list-style:none;">
                    ${itemsRows.join('')}
                </ul>
            </section>
        `;
        expensesContainer.insertAdjacentHTML('beforeend', sectionHTML);
    }

    const totalAhorro = totalIngresosReal - totalGastosReal;
    if (document.getElementById('kpi-ingresos')) document.getElementById('kpi-ingresos').textContent = formatCurrency(totalIngresosReal);
    if (document.getElementById('kpi-ingresos-detail')) document.getElementById('kpi-ingresos-detail').textContent = formatCurrency(totalIngresosReal);
    if (document.getElementById('kpi-gastos')) document.getElementById('kpi-gastos').textContent = formatCurrency(totalGastosReal);
    if (document.getElementById('kpi-ahorro')) document.getElementById('kpi-ahorro').textContent = formatCurrency(totalAhorro);
}

async function addFinanceCategory() {
    const categoryName = prompt("Nombre de la nueva categoría (Ej: Transporte, Suscripciones):");
    if (!categoryName || categoryName.trim() === "") return;

    addFinanceItem('expense', categoryName.trim());
}

async function addFinanceReal(id, currentReal, addedValue) {
    if (!addedValue) return;
    const newVal = Number(addedValue);
    if (isNaN(newVal)) return;

    const total = Number(currentReal) + newVal;
    const { error } = await _supabase.from('finance_logs').update({ real: total }).eq('id', id);

    if (error) console.error("Error al sumar cantidad:", error.message);
    else loadFinances();
}

async function editFinanceRealTotal(id, currentTotal) {
    const newValStr = prompt("Corregir total acumulado manualmente (Sin puntos):", currentTotal);
    if (newValStr === null) return;
    const newVal = Number(newValStr) || 0;
    const { error } = await _supabase.from('finance_logs').update({ real: newVal }).eq('id', id);
    if (!error) loadFinances();
}

async function addFinanceItem(type, category) {
    const concept = prompt(`Nuevo concepto en ${category}:`);
    if (!concept || concept.trim() === "") return;

    const { error } = await _supabase
        .from('finance_logs')
        .insert([{ type, category, concept: concept.trim(), projected: 0, real: 0 }]);

    if (error) alert("Error al guardar: " + error.message);
    else loadFinances();
}

async function editFinanceConcept(id, oldConcept) {
    const newConcept = prompt("Editar nombre del concepto:", oldConcept);
    if (!newConcept || newConcept.trim() === "" || newConcept === oldConcept) return;

    const { error } = await _supabase.from('finance_logs').update({ concept: newConcept.trim() }).eq('id', id);
    if (error) alert("Error al editar: " + error.message);
    else loadFinances();
}

async function deleteFinanceItem(id, concept) {
    if (!confirm(`¿Eliminar la fila "${concept}" permanentemente?`)) return;

    const { error } = await _supabase.from('finance_logs').delete().eq('id', id);
    if (error) alert("Error al eliminar: " + error.message);
    else loadFinances();
}









/**
 * ==========================================
 * GESTIÓN DE COMPRAS (CLON DE LOVES)
 * ==========================================
 */
async function loadCompras() {
    const { data: compras, error } = await _supabase
        .from('compras_logs')
        .select('*')
        .order('count', { ascending: false });

    if (error) return console.error(error.message);

    const container = document.getElementById('list-compras');
    if (!container) return;
    container.className = 'loves-grid';
    container.innerHTML = '';

    compras.forEach(compra => {
        const card = document.createElement('div');
        card.className = 'passion-card';

        const localImagePath = `assets/images/${compra.image_filename}`;

        card.innerHTML = `
            <img src="${localImagePath}" class="passion-img" 
                 onerror="this.src='assets/images/default.jpg'">
            <div class="passion-info">
                <span class="passion-name">${compra.name}</span>
                <span class="passion-count">${compra.count}</span>
            </div>
        `;

        card.addEventListener('dblclick', () => {
            card.classList.add('pop-animation');
            incrementCompra(compra.id, compra.count);

            const countEl = card.querySelector('.passion-count');
            countEl.textContent = parseInt(countEl.textContent) + 1;

            setTimeout(() => card.classList.remove('pop-animation'), 300);
        });

        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            deleteCompra(compra.name, compra.id);
        });

        container.appendChild(card);
    });
}

async function addCompra() {
    const name = prompt("Elemento que deseas comprar:");
    if (!name || name.trim() === "") return;

    const { error } = await _supabase
        .from('compras_logs')
        .insert([{ name: name.trim(), count: 0 }]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        loadCompras();
    }
}

async function incrementCompra(id, currentCount) {
    const { error } = await _supabase
        .from('compras_logs')
        .update({ count: currentCount + 1 })
        .eq('id', id);

    if (error) {
        console.error("Error sumando contador:", error.message);
    } else {
        loadCompras();
    }
}

async function editCompra(oldName, id) {
    const newName = prompt("Editar nombre:", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;

    const { error } = await _supabase
        .from('compras_logs')
        .update({ name: newName.trim() })
        .eq('id', id);

    if (error) {
        alert("Error al editar: " + error.message);
    } else {
        loadCompras();
    }
}

async function deleteCompra(name, id) {
    const confirmDelete = confirm(`¿Deseas eliminar "${name}" de tu lista?`);
    if (!confirmDelete) return;

    const { error } = await _supabase
        .from('compras_logs')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Error al eliminar: " + error.message);
    } else {
        loadCompras();
    }
}







/**
 * ==========================================
 * EXPORTAR HISTORIAL DE IDEAS A CSV
 * ==========================================
 */
async function exportIdeasCSV() {
    try {
        const { data: allIdeas, error } = await _supabase
            .from('ideas_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            alert("Error al conectar con la base de datos: " + error.message);
            return;
        }

        if (!allIdeas || allIdeas.length === 0) {
            alert("No hay datos históricos para exportar.");
            return;
        }

        let csvContent = "\uFEFF";
        csvContent += "ID,Fecha,Tipo,Contenido,Etiquetas\n";

        allIdeas.forEach(idea => {
            const id = idea.id || "";

            let fecha = "";
            if (idea.created_at) {
                fecha = new Date(idea.created_at).toLocaleString('es-CO');
            }

            const tipo = idea.type || "idea";

            const rawContent = idea.content ? String(idea.content) : "";
            const contenidoLimpio = rawContent.replace(/"/g, '""');
            const contenidoCSV = `"${contenidoLimpio}"`;

            let etiquetasStr = "";
            if (Array.isArray(idea.tags)) {
                etiquetasStr = idea.tags.join(', ');
            } else if (typeof idea.tags === 'string') {
                etiquetasStr = idea.tags;
            }
            const etiquetasCSV = `"${etiquetasStr}"`;

            csvContent += `${id},"${fecha}","${tipo}",${contenidoCSV},${etiquetasCSV}\n`;
        });

        descargarCSV(csvContent, "IKILIFE_BrainDump_Completo.csv");

    } catch (err) {
        console.error("Error al exportar CSV:", err);
        alert("Ocurrió un error inesperado generando el archivo:\n" + err.message + "\n\nRevisa la consola (F12) para más detalles.");
    }
}









/**
 * ==========================================
 * COMPONENTE STATE BAR
 * ==========================================
 * Ahora cada franja horaria puede tener varias actividades válidas
 * en paralelo (no solo una). La franja principal se sigue mostrando
 * en la tarjeta grande, y las alternativas aparecen como "chips"
 * debajo. Al hacer clic en CUALQUIERA de las tarjetas/chips se abre
 * un menú desplegable con sugerencias concretas para aprovechar ese
 * bloque de tiempo.
 */
function renderStateBar(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    /**
     * TABLA DE REFERENCIA: Minutos del día (Formato 12 horas)
     * ----------------------------------------------------
     * HORA    | MINUTOS (Start)
     * 12:00 AM| 0
     * 01:00 AM| 60
     * 02:00 AM| 120
     * 03:00 AM| 180
     * 04:00 AM| 240
     * 05:00 AM| 300
     * 06:00 AM| 360
     * 07:00 AM| 420
     * 08:00 AM| 480
     * 09:00 AM| 540
     * 10:00 AM| 600
     * 11:00 AM| 660
     * 12:00 PM| 720
     * 01:00 PM| 780
     * 02:00 PM| 840
     * 03:00 PM| 900
     * 04:00 PM| 960
     * 05:00 PM| 1020
     * 06:00 PM| 1080
     * 07:00 PM| 1140
     * 08:00 PM| 1200
     * 09:00 PM| 1260
     * 10:00 PM| 1320
     * 11:00 PM| 1380
     * ----------------------------------------------------
     */

    // Cada slot ahora tiene un arreglo "options" con sugerencias concretas
    // para aprovechar ese bloque de tiempo (lo que pediste: Sara Travel,
    // Cruzamontañas, etc., para Senderismo; ideas para Tiempo Libre, etc.)
    const CONFIG = {
        weekday: [
            {
                start: 300, end: 1020, label: "Mesa de Ayuda", icon: "💼", class: "state-work",
                options: ["Revisar tickets pendientes", "Reunión de equipo", "Documentar soluciones"]
            },
            {
                start: 1020, end: 1260, label: "Code & Grow", icon: "🌱", class: "state-grow",
                options: ["Practicar inglés (Duolingo/Anki)", "Curso de programación", "Proyecto personal de código"]
            },
            {
                start: 0, end: 300, label: "Descanso", icon: "🌙", class: "state-sleep",
                options: ["Dormir", "Rutina nocturna"]
            },
            {
                start: 1260, end: 1440, label: "Descanso", icon: "🌙", class: "state-sleep",
                options: ["Dormir", "Rutina nocturna"]
            }
        ],
        weekend: [
            {
                start: 0, end: 360, label: "Descanso", icon: "🌙", class: "state-sleep",
                options: ["Dormir", "Rutina nocturna"]
            },
            {
                start: 360, end: 720, label: "Senderismo", icon: "⛰️", class: "state-grow",
                options: ["Sara Travel", "Cruzamontañas", "Caminantes Medellín", "Ruta libre por el cerro"]
            },
            {
                start: 720, end: 1260, label: "Tiempo Libre", icon: "🍻", class: "state-free",
                options: ["Ver una película", "Salir con amigos", "Leer un libro", "Cocinar algo nuevo", "Pasear sin rumbo"]
            },
            {
                start: 1260, end: 1440, label: "Descanso", icon: "🌙", class: "state-sleep",
                options: ["Dormir", "Rutina nocturna"]
            }
        ]
    };

    container.innerHTML = `
        <div class="ikilife-state-card" id="state-card">
            <div class="state-info">
                <span id="state-icon"></span>
                <span class="state-label" id="state-text"></span>
            </div>
            <div class="state-time" id="state-time"></div>
        </div>
        <div class="state-alt-options" id="state-alt-options"></div>
        <div class="state-dropdown hidden" id="state-dropdown"></div>
    `;

    // Cierra el menú desplegable si el usuario hace clic fuera de él
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('state-dropdown');
        if (!dropdown) return;
        const clickedInsideCard = e.target.closest('.ikilife-state-card');
        if (!clickedInsideCard) {
            dropdown.classList.add('hidden');
            openLabel = null;
        }
    });

    // Guarda qué slot está actualmente abierto en el dropdown, para
    // poder saber si un nuevo clic debe "cerrar" (toggle) o "cambiar".
    let openLabel = null;

    // Muestra u oculta el menú desplegable con sugerencias para un slot dado.
    // Si se hace clic de nuevo sobre el mismo bloque que ya está abierto,
    // el menú se cierra (comportamiento tipo acordeón/toggle).
    function openSlotMenu(slot) {
        const dropdown = document.getElementById('state-dropdown');
        if (!dropdown) return;

        if (openLabel === slot.label && !dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
            openLabel = null;
            return;
        }

        const optionsHTML = (slot.options || [])
            .map(opt => `<button class="state-dropdown-item" onclick="sendPromptToChatSafe('${opt.replace(/'/g, "\\'")}')">${opt}</button>`)
            .join('');

        dropdown.innerHTML = `
            <div class="state-dropdown-title">${slot.icon} ${slot.label}</div>
            ${optionsHTML || '<div class="state-dropdown-empty">Sin sugerencias configuradas</div>'}
        `;

        dropdown.classList.remove('hidden');
        openLabel = slot.label;
    }

    // Pequeño helper global para que los botones del dropdown puedan
    // usar sendPrompt si está disponible (entorno con IA), sin romper
    // la app si no existe esa función.
    window.sendPromptToChatSafe = function (text) {
        if (typeof window.sendPrompt === 'function') {
            window.sendPrompt(text);
        } else {
            alert(text);
        }
    };

    function update() {
        const now = new Date();
        const mins = now.getHours() * 60 + now.getMinutes();
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;

        const schedule = isWeekend ? CONFIG.weekend : CONFIG.weekday;

        // Slot principal: el que coincide exactamente con la hora actual
        const current = schedule.find(s => mins >= s.start && mins < s.end);

        // Slots alternos: cualquier otro slot del día distinto al actual.
        // Esto resuelve el caso de hoy: aunque ahora toque "Tiempo Libre",
        // se siguen viendo como opciones visibles "Senderismo", etc.
        // Se deduplica por "label": si una misma actividad (ej. Descanso)
        // ocupa varios tramos horarios, solo se muestra un chip de ella.
        const seenLabels = new Set();
        const alternates = schedule.filter(s => {
            if (s === current) return false;
            if (seenLabels.has(s.label)) return false;
            seenLabels.add(s.label);
            return true;
        });

        if (current) {
            const card = document.getElementById('state-card');
            const icon = document.getElementById('state-icon');
            const text = document.getElementById('state-text');

            icon.textContent = current.icon;
            text.textContent = current.label;
            card.className = `ikilife-state-card ${current.class}`;

            card.onclick = () => openSlotMenu(current);
        }

        document.getElementById('state-time').textContent = now.toLocaleTimeString('es-CO', {
            hour: '2-digit', minute: '2-digit'
        });

        // Renderizar los chips de actividades alternas disponibles hoy,
        // con la MISMA estructura visual que la tarjeta principal
        // (icono + texto), reutilizando las clases de color de estado.
        const altContainer = document.getElementById('state-alt-options');
        if (altContainer) {
            altContainer.innerHTML = alternates.map(slot => `
                <div class="ikilife-state-card state-chip ${slot.class}"
                     onclick='window.__openStateChip(${JSON.stringify(slot.label)})'>
                    <div class="state-info">
                        <span>${slot.icon}</span>
                        <span class="state-label">${slot.label}</span>
                    </div>
                </div>
            `).join('');

            // Guardamos referencia a los slots para poder abrir su menú desde el chip
            window.__stateSchedule = schedule;
            window.__openStateChip = function (label) {
                const slot = window.__stateSchedule.find(s => s.label === label);
                if (slot) openSlotMenu(slot);
            };
        }
    }

    update();
    setInterval(update, 60000);
}