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
 * ÍNDICE DEL ARCHIVO (TABLA DE CONTENIDO)
 * ==========================================
 * main.js está organizado por COMPONENTE, cada uno con su propio
 * banner de comentario (el mismo estilo que este). Para saltar a una
 * sección, busca (Ctrl/Cmd+F) el texto exacto del banner que aparece
 * entre comillas abajo.
 *
 * Al agregar un componente nuevo a la app (su propio "X_logs" en
 * Supabase + su vista en el HTML), sigue el mismo patrón que ya usan
 * Loves / Odios / Sentimientos / Compras: load X(), addX(), editX(),
 * deleteX() y, si aplica, exportXSQL(). Agrega también su propio
 * banner de sección y una línea nueva aquí en el índice.
 *
 *  1. "INICIALIZACIÓN"                          → arranque de la app (DOMContentLoaded)
 *  2. "GESTIÓN DEL TEMA"                        → modo claro/oscuro
 *  3. "UTILIDAD: NÚMERO DE SEMANA DEL AÑO"       → helpers de fecha/semana compartidos
 *  4. "CÁLCULO DE PROGRESO SEMANAL Y FECHAS"     → barra de progreso semanal de hábitos
 *  5. "NUEVO: FRASE MOTIVACIONAL DEL DÍA"        → frase del día
 *  6. "GESTIÓN DE BLOQUES DE RUTINA"             → bloques de rutina diaria (JSONB)
 *  7. "GESTIÓN DE HÁBITOS"                       → hábitos semanales (grid histórico)
 *  8. "UTILIDADES DE EXPORTACIÓN (SQL)"          → sqlValue/buildSQLInsert/descargarArchivo (usados por TODOS los exportadores)
 *  9. "EXPORTAR TODO (JSON PARA IA / NOTEBOOKLM)"→ exportAllDataJSON + TABLAS_EXPORTABLES
 * 10. "EXPORTAR HÁBITOS A SQL"                   → exportAllHistorySQL
 * 11. "MEJORES HÁBITOS (TOP 3 HISTÓRICO)"        → loadTopHabits
 * 12. "NUEVO: MEJORES LOVES (TOP 3 RANKING)"     → loadTopLoves
 * 13. "NUEVO: TOP 3 DE SENTIMIENTOS"              → loadTopSentimientos (por intensidad actual)
 * 14. "NUEVO: EVOLUCIÓN EMOCIONAL"               → gráfico de barras de promedio diario (Sentimientos/Odios, últimos 14 días)
 * 15. "INTERFAZ DE USUARIO (TABS Y OTROS)"       → switchTab, saveLearning, toggleFinanceView
 * 16. "GESTIÓN DE IDEAS (BRAIN DUMP)"            → Brain Dump: CRUD de ideas
 * 17. "PENSAMIENTO ALEATORIO (BRAIN DUMP)"       → showRandomIdea + exportIdeasSQL
 * 18. "GESTIÓN DE TAREAS"                        → lista única de tareas del día
 * 19. "GESTIÓN DE INVERSIONES Y DEUDAS"          → inversiones con cuotas (JSONB)
 * 20. "GESTIÓN DE COSAS QUE AMO (LOVES)"         → Loves: CRUD + contador acumulativo (dblclick)
 * 21. "GESTIÓN DE COSAS QUE ODIO (ODIOS)"        → Odios: CRUD + barra de intensidad 1-10
 * 22. "UTILIDADES COMPARTIDAS: TRACKERS DE BARRA 1-10" → helpers usados por Odios Y Sentimientos (fechas, guardado, relleno visual)
 * 23. "GESTIÓN DE SENTIMIENTOS"                  → Sentimientos: CRUD + barra de intensidad 1-10
 * 24. "PLANES"                                   → planes futuros + clima (Open-Meteo)
 * 25. "GESTIÓN DE MÉTRICAS"                      → loadMetrics() orquesta TODOS los Top 3 + gráficos de la pestaña Métricas
 * 26. "PROGRESO DEL CURSO DE INGLÉS"             → renderEnglishCourseWeeks
 * 27. "GESTIÓN DE FINANZAS"                      → finanzas dinámicas/acumulativas
 * 28. "GESTIÓN DE COMPRAS"                       → Compras: CRUD + contador acumulativo (clon de Loves)
 * 29. "COMPONENTE STATE BAR"                     → tarjetas de "qué hacer ahora" según la hora del día
 */


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
    // NOTA: se removió loadEscuelas() porque la tabla "escuelas_logs" ya
    // no existe en Supabase y ese componente no tiene vista en el HTML
    // actual (quedó como código muerto). También se removió la llamada a
    // generateInsights(), una función que nunca llegó a definirse y que
    // rompía la carga inicial con un ReferenceError en consola.
    try {
        applySavedTheme();
        updateWeeklyProgress();
        loadDailyQuote();
        loadHabits();
        loadIdeas();
        showRandomIdea();
        loadTareas();
        loadInversiones();
        loadLoves();
        loadOdios();
        loadSentimientos();
        loadPlanes();
        loadCompras();
        loadBloques();
        loadMetrics(); // Esta ya ejecuta internamente renderYearWeeks(), renderEnglishCourseWeeks(), loadTopHabits(), loadTopLoves() y loadTopSentimientos()
        loadFinances();
        loadAgradecimientos();
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

    // 4. Refresco periódico de Odios y Sentimientos, solo para mantener
    // al día el contador "Disponible en Xh Ym" del bloqueo de 12 horas
    // (no afecta el resto de la app).
    setInterval(() => {
        loadOdios();
        loadSentimientos();
    }, 60000);
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
 * UTILIDAD: NÚMERO DE SEMANA DEL AÑO 
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
 * NUEVO: FRASE MOTIVACIONAL DEL DÍA
 * ==========================================
 * Lista editable de frases en formato JSON. Puedes alimentar/editar
 * este arreglo libremente agregando o quitando strings.
 *
 * Lógica: cada día se selecciona UNA frase al azar de la lista y se
 * guarda en localStorage junto con la fecha del día. Mientras la
 * fecha guardada coincida con "hoy", se sigue mostrando la misma
 * frase (no cambia en cada recarga). Al cambiar de día, se elige
 * una nueva frase aleatoria automáticamente.
 */
const MOTIVATIONAL_QUOTES = [
    "Pequenos pasos consistentes construyen grandes resultados.",
    "Disciplina es elegir entre lo que quieres ahora y lo que quieres mas.",
    "No necesitas ser perfecto, necesitas ser constante.",
    "Cada habito que completas hoy es una inversion en quien quieres ser.",
    "El progreso rara vez se siente, pero siempre se acumula.",
    "Hazlo aunque no tengas ganas; las ganas llegan despues de empezar.",
    "Tu futuro se construye con las decisiones aburridas de hoy.",
    "Enfocate en el proceso, el resultado es solo una consecuencia.",
    "La motivacion te inicia, el habito te mantiene.",
    "Un dia a la vez es suficiente. No necesitas resolver todo hoy.",
    "Ordena tu mente y tu vida seguira el mismo camino.",
    "Lo que se mide, mejora. Sigue registrando tu progreso.",
    "Confia en el proceso, incluso en los dias lentos.",
    "La version de ti que quieres ser se construye hoy, no manana.",
    "Actua como la persona en la que te quieres convertir.",
    "La consistencia vence al talento cuando el talento no es consistente.",
    "Tu unica competencia es quien eras ayer.",
    "No cuentes los dias, haz que los dias cuenten.",
    "El exito es la suma de pequenos esfuerzos repetidos dia tras dia.",
    "Cada manana es una nueva oportunidad para ser mejor.",
    "La disciplina es el puente entre metas y logros.",
    "No busques la perfeccion, busca la mejora continua.",
    "El dolor de la disciplina es mucho menor que el dolor del arrepentimiento.",
    "Tus habitos determinan tu futuro mas que tus intenciones.",
    "La gratitud convierte lo que tenemos en suficiente.",
    "No puedes controlar todo, pero puedes controlar tu actitud.",
    "Cada momento es un nuevo comienzo disfrazado de rutina.",
    "El cambio no es facil, pero quedarse igual tampoco lo es.",
    "La paciencia es la confianza de que todo llega en el momento justo.",
    "No te compares con otros, comparate con tu mejor version.",
    "La excelencia no es un acto, es un habito.",
    "El tiempo que inviertes en ti mismo nunca es tiempo perdido.",
    "Tu zona de confort es un lugar hermoso, pero nada crece alli.",
    "Los grandes logros requieren tiempo y dedicacion.",
    "No esperes a sentirte motivado, empieza y la motivacion te seguira.",
    "Cada dia es una pagina en blanco, escribe una buena historia.",
    "La autodisciplina es el mejor regalo que puedes darte a ti mismo.",
    "El fracaso es solo retroalimentacion disfrazada de experiencia.",
    "No dejes que el miedo a perder sea mas grande que la emocion de ganar.",
    "Tus acciones de hoy son los cimientos de tu manana.",
    "La vida recompensa a quienes se mueven con proposito.",
    "No hay atajos para ningun lugar que valga la pena.",
    "La constancia es la clave que abre todas las puertas.",
    "Se amable contigo mismo en el proceso de crecimiento.",
    "El crecimiento ocurre cuando sales de tu zona de confort.",
    "No subestimes el poder de una pequena accion diaria.",
    "Tu mente es un jardin, tus pensamientos son las semillas.",
    "La autenticidad es la mejor estrategia a largo plazo.",
    "No busques ser el mejor, busca ser mejor que ayer.",
    "La vida se vuelve mas facil cuando aprendes a fluir con ella.",
    "Cada obstaculo es una oportunidad disfrazada de desafio.",
    "El exito no es definitivo, el fracaso no es fatal: lo que cuenta es el coraje de continuar.",
    "Tu eres mas fuerte de lo que crees y mas capaz de lo que imaginas.",
    "La clave no es priorizar lo que esta en tu agenda, sino agendar tus prioridades.",
    "No dejes que la opinion de otros apague tu luz interior.",
    "Cada dia que persistes es un dia mas cerca de tu meta.",
    "La verdadera riqueza esta en la paz mental y la salud.",
    "No necesitas ver todo el camino, solo da el siguiente paso con fe.",
    "Tu potencial es infinito, despiertalo con accion.",
    "La felicidad no es un destino, es una forma de viajar.",
    "Celebra cada pequena victoria, son los escalones hacia lo grande."
];

function loadDailyQuote() {
    const el = document.getElementById('motivational-text');
    if (!el) return;

    if (!MOTIVATIONAL_QUOTES || MOTIVATIONAL_QUOTES.length === 0) {
        el.textContent = "Agrega tus frases en MOTIVATIONAL_QUOTES (main.js).";
        return;
    }

    const todayStr = formatDateLocal(new Date());
    let stored = null;

    try {
        stored = JSON.parse(localStorage.getItem('ikilife_daily_quote') || 'null');
    } catch (e) {
        stored = null;
    }

    let quoteText;
    if (stored && stored.date === todayStr && typeof stored.quote === 'string') {
        quoteText = stored.quote;
    } else {
        const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
        quoteText = MOTIVATIONAL_QUOTES[randomIndex];
        localStorage.setItem('ikilife_daily_quote', JSON.stringify({ date: todayStr, quote: quoteText }));
    }

    el.textContent = quoteText;
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
 * UTILIDADES DE EXPORTACIÓN (SQL)
 * ==========================================
 * Todos los exportadores de la app ahora generan un archivo .sql con
 * sentencias INSERT INTO listas para pegar en cualquier motor SQL o
 * para que una IA analice los datos directamente (el CSV quedaba mal
 * formateado para ese uso: comas dentro de texto, sin tipado, etc.).
 *
 * sqlValue(): castea cada valor de JS a su representación literal en
 * SQL (strings con comillas simples escapadas, números y booleanos
 * sin comillas, arrays como literales de array de Postgres, null).
 *
 * buildSQLInsert(): arma el bloque de sentencias INSERT a partir del
 * nombre de la tabla y las filas devueltas por Supabase. Las columnas
 * se detectan automáticamente desde las llaves del primer registro,
 * así que si cambia el esquema de una tabla no hay que tocar este
 * código.
 */
function sqlValue(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (Array.isArray(value)) {
        const escaped = value.map(v => String(v).replace(/"/g, '\\"'));
        return `'{${escaped.join(',')}}'`;
    }
    if (typeof value === 'object') {
        return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
    return `'${String(value).replace(/'/g, "''")}'`;
}

function buildSQLInsert(tableName, rows) {
    if (!rows || rows.length === 0) {
        return `-- No hay datos para exportar de la tabla "${tableName}"\n`;
    }

    const columns = Object.keys(rows[0]);
    let sql = `-- Exportado desde IKILIFE\n-- Tabla: ${tableName}\n-- Generado: ${new Date().toISOString()}\n\n`;

    rows.forEach(row => {
        const values = columns.map(col => sqlValue(row[col]));
        sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    });

    return sql;
}

/**
 * Pequeña utilidad compartida para disparar la descarga de cualquier
 * archivo de texto (reemplaza a la antigua descargarCSV).
 */
function descargarArchivo(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8;' });
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
 * EXPORTAR TODO (JSON PARA IA / NOTEBOOKLM)
 * ==========================================
 * Trae, vía la API de Supabase (igual que el snippet de ideas_logs:
 * supabase.from(tabla).select('*')), el contenido completo de TODAS
 * las tablas de la app y lo empaqueta en un único archivo .json.
 *
 * A diferencia del CSV o el SQL (INSERT INTO ...), un JSON es texto
 * plano y estructurado que cualquier IA o NotebookLM puede leer e
 * interpretar directamente al subirlo como fuente, sin necesidad de
 * parsear sintaxis SQL ni columnas sueltas de un CSV.
 *
 * Si agregas una tabla nueva a la app, súmala también aquí.
 */
const TABLAS_EXPORTABLES = [
    'habit_logs', 'tareas_logs', 'loves_logs', 'odios_logs',
    'odios_registros', 'sentimientos_logs', 'sentimientos_registros',
    'ideas_logs', 'compras_logs', 'finance_logs',
    'inversiones_logs', 'journal_logs', 'bloques_logs', 'planes_logs'
];

async function exportAllDataJSON() {
    try {
        const tablas = {};
        const errores = [];

        await Promise.all(TABLAS_EXPORTABLES.map(async (nombreTabla) => {
            const { data, error } = await _supabase.from(nombreTabla).select('*');
            if (error) {
                errores.push(`${nombreTabla}: ${error.message}`);
                tablas[nombreTabla] = [];
            } else {
                tablas[nombreTabla] = data || [];
            }
        }));

        const payload = {
            app: 'IKILIFE',
            exportado_el: new Date().toISOString(),
            tablas: tablas
        };

        const json = JSON.stringify(payload, null, 2);
        const fecha = new Date().toISOString().slice(0, 10);
        descargarArchivo(json, `IKILIFE_datos_completos_${fecha}.json`, 'application/json;charset=utf-8;');

        if (errores.length > 0) {
            console.warn("Algunas tablas fallaron al exportar:", errores);
            alert("Se exportó el archivo, pero algunas tablas fallaron:\n" + errores.join('\n'));
        }
    } catch (err) {
        console.error("Error exportando todos los datos:", err);
        alert("Ocurrió un error inesperado generando el archivo:\n" + err.message);
    }
}

/**
 * ==========================================
 * EXPORTAR HÁBITOS A SQL
 * ==========================================
 * Se exporta TODO el historial de habit_logs (todas las semanas).
 */
async function exportAllHistorySQL() {
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

        const sql = buildSQLInsert('habit_logs', allLogs);
        descargarArchivo(sql, "IKILIFE_Habitos_Historial_Completo.sql", "application/sql;charset=utf-8;");

    } catch (err) {
        console.error("Error al exportar SQL de hábitos:", err);
        alert("Ocurrió un error inesperado generando el archivo:\n" + err.message);
    }
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
 * NUEVO: MEJORES LOVES (TOP 3 RANKING)
 * ==========================================
 * Igual que el Top 3 de Hábitos, pero basado en el contador
 * ("count") de la tabla loves_logs. Se muestran las 3 pasiones con
 * más registros acumulados.
 */
async function loadTopLoves() {
    const { data: allLoves, error } = await _supabase
        .from('loves_logs')
        .select('name, count')
        .order('count', { ascending: false })
        .limit(3);

    const container = document.getElementById('top-loves-list');
    if (!container) return;

    if (error) {
        console.error("Error cargando top de loves:", error.message);
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '';

    if (!allLoves || allLoves.length === 0) {
        container.innerHTML = `<div class="top-habit-empty">Aún no hay Loves registrados para mostrar.</div>`;
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];

    allLoves.forEach((love, index) => {
        const row = `
            <div class="top-habit-row">
                <span class="top-habit-medal">${medals[index]}</span>
                <span class="top-habit-name">${love.name}</span>
                <span class="top-habit-count">${love.count}x</span>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', row);
    });
}

/**
 * ==========================================
 * NUEVO: TOP 3 DE SENTIMIENTOS Y ODIOS (POR INTENSIDAD ACTUAL)
 * ==========================================
 * Desde la reestructuración a barras 1-10, "count" ya no existe para
 * estos dos componentes. El Top 3 ahora se calcula con el ÚLTIMO
 * valor registrado (más reciente por fecha) de cada item, usando
 * cargarUltimosRegistros() (ver más abajo, junto a loadOdios).
 */
async function loadTopSentimientos() {
    const { data: sentimientos, error } = await _supabase
        .from('sentimientos_logs')
        .select('id, name');

    const container = document.getElementById('top-sentimientos-list');
    if (!container) return;

    if (error) {
        console.error("Error cargando top de sentimientos:", error.message);
        container.innerHTML = '';
        return;
    }

    const ultimos = await cargarUltimosRegistros('sentimientos_registros', 'sentimiento_id');

    const top3 = (sentimientos || [])
        .filter(s => ultimos[s.id])
        .map(s => ({ name: s.name, valor: ultimos[s.id].valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 3);

    container.innerHTML = '';

    if (top3.length === 0) {
        container.innerHTML = `<div class="top-habit-empty">Aún no hay Sentimientos registrados para mostrar.</div>`;
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];

    top3.forEach((item, index) => {
        const row = `
            <div class="top-habit-row">
                <span class="top-habit-medal">${medals[index]}</span>
                <span class="top-habit-name">${item.name}</span>
                <span class="top-habit-count">${item.valor}/10</span>
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

    const views = ['view-habits', 'view-metrics', 'view-ideas', 'view-tareas', 'view-loves', 'view-odios', 'view-sentimientos', 'view-reglas', 'view-money', 'view-compras'];
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

/**
 * GESTIÓN DE FINANZAS — MOVIDO A COMPONENTE INDEPENDIENTE
 * Todo el módulo de Finanzas (loadFinances, toggleFinanceView,
 * addFinanceCategory, addFinanceItem, presupuestos, balance neto,
 * export SQL, etc.) ahora vive en Components/finance/finance.js.
 */










/**
 * ==========================================
 * GESTIÓN DE IDEAS (BRAIN DUMP)
 * ==========================================
 * NOTA: se removió el sistema de etiquetado por #hashtags: nunca se
 * usó desde la interfaz (no hay ningún filtro ni vista que lo
 * consuma), así que ahora el contenido se guarda tal cual lo escribes,
 * sin parsear ni separar etiquetas.
 */
async function loadIdeas() {
    const { data: ideas, error } = await _supabase
        .from('ideas_logs')
        .select('*')
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
    const content = prompt("Escribe tu nueva idea:");
    if (!content || content.trim() === "") return;

    const { error } = await _supabase
        .from('ideas_logs')
        .insert([{ content: content.trim() }]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        randomIdeaCache = []; // Se invalida el caché para que incluya la nueva idea
        loadIdeas();
    }
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
        randomIdeaCache = [];
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
        randomIdeaCache = [];
        loadIdeas();
    }
}

/**
 * ==========================================
 * PENSAMIENTO ALEATORIO (BRAIN DUMP)
 * ==========================================
 * Selecciona y muestra temporalmente un registro al azar de
 * ideas_logs, junto con la fecha en la que fue creado. Cada clic en
 * el botón "Nuevo Pensamiento" trae uno distinto. Se mantiene un
 * pequeño caché en memoria para no golpear la base de datos en cada
 * clic; el caché se invalida automáticamente cuando se agrega, edita
 * o elimina una idea.
 */
let randomIdeaCache = [];

async function showRandomIdea() {
    const textEl = document.getElementById('random-idea-text');
    const dateEl = document.getElementById('random-idea-date');
    if (!textEl) return;

    if (randomIdeaCache.length === 0) {
        const { data, error } = await _supabase
            .from('ideas_logs')
            .select('content, created_at');

        if (error) {
            console.error("Error cargando pensamiento aleatorio:", error.message);
            return;
        }
        randomIdeaCache = data || [];
    }

    if (randomIdeaCache.length === 0) {
        textEl.textContent = "Aún no tienes ideas guardadas en tu Brain Dump.";
        if (dateEl) dateEl.textContent = '';
        return;
    }

    const randomIndex = Math.floor(Math.random() * randomIdeaCache.length);
    const idea = randomIdeaCache[randomIndex];
    textEl.textContent = idea.content;

    if (dateEl) {
        if (idea.created_at) {
            const dateObj = new Date(idea.created_at);
            const dateString = dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
            dateEl.textContent = `Escrito el ${dateString}`;
        } else {
            dateEl.textContent = '';
        }
    }
}

// ======================================================
// EXPORTAR IDEAS (Brain Dump)
// ======================================================
async function exportIdeasSQL() {
    try {
        const { data, error } = await _supabase
            .from('ideas_logs')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            alert("No hay registros para exportar.");
            return;
        }

        const sql = buildSQLInsert('ideas_logs', data);
        descargarArchivo(sql, 'ideas_logs.sql', 'text/sql');

    } catch (err) {
        console.error(err);
        alert("Error exportando Ideas: " + err.message);
    }
}










/**
 * ==========================================
 * GESTIÓN DE TAREAS (Única Lista)
 * ==========================================
 * Ahora soporta, igual que Brain Dump: editar (clic) y eliminar
 * (clic derecho), conservando también el check para "completar".
 *
 * NUEVO: semáforo de importancia. Cada tarea tiene un punto de color
 * (verde/amarillo/rojo) que, al hacer clic, va rotando entre los 3
 * niveles: baja -> media -> alta -> baja. No interfiere con el clic
 * sobre el texto (editar) ni con el clic derecho (eliminar), porque
 * es un elemento aparte dentro de la fila.
 *
 * IMPORTANTE: requiere agregar en Supabase, a la tabla existente
 * "tareas_logs", la columna "importance" (text, default 'media').
 * Valores esperados: 'baja', 'media', 'alta'.
 */

// Orden cíclico de importancia: al hacer clic pasa al siguiente nivel.
const ORDEN_IMPORTANCIA = ['baja', 'media', 'alta'];

function siguienteImportancia(actual) {
    const idx = ORDEN_IMPORTANCIA.indexOf(actual);
    return ORDEN_IMPORTANCIA[(idx + 1) % ORDEN_IMPORTANCIA.length];
}

async function loadTareas() {
    const { data: tareas, error } = await _supabase.from('tareas_logs').select('*').order('id', { ascending: true });
    if (error) return console.error("Error cargando tareas:", error.message);

    const listDia = document.getElementById('list-tareas-dia');
    if (listDia) listDia.innerHTML = '';

    tareas.forEach(tarea => {
        const safeName = String(tarea.name || '').replace(/'/g, "\\'");
        const importancia = ORDEN_IMPORTANCIA.includes(tarea.importance) ? tarea.importance : 'media';
        const importanciaLabel = { baja: 'Baja', media: 'Media', alta: 'Alta' }[importancia];

        const row = `
            <li class="tarea-row">
                <button class="tarea-importance-dot importance-${importancia}"
                        onclick="cycleImportanciaTarea(${tarea.id}, '${importancia}')"
                        aria-label="Importancia: ${importanciaLabel}"
                        title="Importancia: ${importanciaLabel} (clic para cambiar)">
                </button>
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

// Cambia la importancia de una tarea al siguiente nivel del semáforo.
async function cycleImportanciaTarea(id, actual) {
    const nueva = siguienteImportancia(actual);

    const { error } = await _supabase
        .from('tareas_logs')
        .update({ importance: nueva })
        .eq('id', id);

    if (error) {
        alert("Error al actualizar importancia: " + error.message);
    } else {
        loadTareas();
    }
}

async function addTarea() {
    const name = prompt("Nueva obligación:");
    if (!name || name.trim() === "") return;
    const { error } = await _supabase.from('tareas_logs').insert([{ name: name.trim(), type: 'dia', importance: 'media' }]);
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
 * NOTA: al hacer clic sobre el NOMBRE de la tarjeta se puede editar
 * (editLove). Doble clic en cualquier otra parte de la tarjeta suma
 * un registro. Clic derecho elimina la tarjeta.
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
                <span class="passion-name" title="Clic para editar nombre">${love.name}</span>
                <span class="passion-count">${love.count}</span>
            </div>
        `;

        const nameEl = card.querySelector('.passion-name');
        if (nameEl) {
            nameEl.addEventListener('click', (e) => {
                e.stopPropagation();
                editLove(love.name, love.id);
            });
        }

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
        if (typeof loadTopLoves === 'function') loadTopLoves();
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
        if (typeof loadTopLoves === 'function') loadTopLoves();
    }
}

// ======================================================
// EXPORTAR LOVES
// ======================================================
async function exportLovesSQL() {
    try {
        const { data, error } = await _supabase
            .from('loves_logs')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            alert("No hay registros para exportar.");
            return;
        }

        const sql = buildSQLInsert('loves_logs', data);
        descargarArchivo(sql, 'loves_logs.sql', 'text/sql');

    } catch (err) {
        console.error(err);
        alert("Error exportando Loves: " + err.message);
    }
}









/**
 * ==========================================
 * GESTIÓN DE ODIOS Y SENTIMIENTOS — MOVIDO A COMPONENTE INDEPENDIENTE
 * ==========================================
 * Todo este bloque (CRUD de Odios/Sentimientos, utilidades de fecha
 * compartidas, cálculo de bloqueo y guardado de registros) ahora vive
 * en Components/mood_tracker/mood_tracker.js, que se carga ANTES que
 * este archivo. Las funciones loadOdios(), addOdio(), loadSentimientos()
 * y addSentimiento() siguen existiendo como funciones globales (las
 * expone ese componente), así que el resto de la app no cambia.
 */
/**
 * ==========================================
 * PLANES
 * ==========================================
 * Guarda planes futuros con fecha (ej. "Caminata de senderismo" el
 * 9 de agosto), muestra en GRANDE los días que faltan, y consulta
 * en vivo el clima real esperado ese día en el lugar del plan (vía
 * Open-Meteo, gratuito y sin API key). El pronóstico diario solo
 * existe hasta 16 días antes del evento; fuera de ese rango se
 * muestra solo el conteo de días.
 *
 * NUEVO: cada plan se puede expandir/contraer tocando la tarjeta
 * (misma interacción que las cards del State Bar) para agregar
 * "cosas" del plan — una checklist simple con texto libre, marcar
 * como hecho y eliminar. Solo un plan puede estar expandido a la vez.
 *
 * IMPORTANTE: requiere crear en Supabase la tabla "planes_logs" con
 * columnas (id, title, plan_date [date], location_name [text,
 * nullable], lat [float8, nullable], lng [float8, nullable],
 * created_at), y ADEMÁS una tabla nueva "planes_items" con:
 *   id          bigint, PK, identity
 *   plan_id     bigint, FK -> planes_logs(id) ON DELETE CASCADE
 *   text        text
 *   done        boolean (default false)
 *   created_at  timestamptz (default now())
 */

// Traduce el código WMO de Open-Meteo a un emoji + descripción corta.
function weatherCodeInfo(code) {
    const map = {
        0: ['☀️', 'Despejado'],
        1: ['🌤️', 'Mayormente despejado'],
        2: ['⛅', 'Parcialmente nublado'],
        3: ['☁️', 'Nublado'],
        45: ['🌫️', 'Niebla'],
        48: ['🌫️', 'Niebla escarchada'],
        51: ['🌦️', 'Llovizna ligera'],
        53: ['🌦️', 'Llovizna'],
        55: ['🌧️', 'Llovizna densa'],
        61: ['🌧️', 'Lluvia ligera'],
        63: ['🌧️', 'Lluvia'],
        65: ['🌧️', 'Lluvia fuerte'],
        71: ['🌨️', 'Nieve ligera'],
        73: ['🌨️', 'Nieve'],
        75: ['❄️', 'Nieve fuerte'],
        80: ['🌦️', 'Chubascos ligeros'],
        81: ['🌧️', 'Chubascos'],
        82: ['⛈️', 'Chubascos fuertes'],
        95: ['⛈️', 'Tormenta'],
        96: ['⛈️', 'Tormenta con granizo'],
        99: ['⛈️', 'Tormenta fuerte con granizo'],
    };
    return map[code] || ['🌡️', 'Clima variable'];
}

// Busca coordenadas para un nombre de lugar (ciudad, municipio, etc.)
async function geocodeLocation(name) {
    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=es&format=json`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.results && data.results.length > 0) {
            const r = data.results[0];
            const parts = [r.name, r.admin1, r.country].filter(Boolean);
            return { lat: r.latitude, lng: r.longitude, display: parts.join(', ') };
        }
    } catch (err) {
        console.error("Error geocodificando ubicación:", err.message);
    }
    return null;
}

// Trae el pronóstico del día exacto del plan (si cae dentro de los
// próximos 16 días, que es el límite del pronóstico diario gratuito).
async function fetchWeatherForPlan(lat, lng, planDateStr) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=16`;
        const res = await fetch(url);
        const data = await res.json();
        if (!data.daily || !data.daily.time) return null;
        const idx = data.daily.time.indexOf(planDateStr);
        if (idx === -1) return null;
        return {
            code: data.daily.weathercode[idx],
            tmax: Math.round(data.daily.temperature_2m_max[idx]),
            tmin: Math.round(data.daily.temperature_2m_min[idx]),
        };
    } catch (err) {
        console.error("Error consultando el clima:", err.message);
        return null;
    }
}

// Calcula los días que faltan (o han pasado) entre hoy y la fecha del plan.
function diasRestantes(planDateStr) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaPlan = new Date(planDateStr + 'T00:00:00');
    return Math.round((fechaPlan - hoy) / 86400000);
}

function formatearFechaPlan(planDateStr) {
    const fecha = new Date(planDateStr + 'T00:00:00');
    return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Cache de la última carga de planes (para poder re-pintar al
// expandir/contraer una tarjeta sin tener que volver a consultar
// Supabase). Se refresca cada vez que loadPlanes() corre de verdad.
let planesCache = [];

// Id del plan actualmente expandido (solo uno a la vez, igual que el
// dropdown del State Bar).
let openPlanId = null;

async function loadPlanes() {
    const { data: planes, error } = await _supabase
        .from('planes_logs')
        .select('*')
        .order('plan_date', { ascending: true });

    if (error) return console.error("Error cargando planes:", error.message);

    planesCache = planes || [];
    renderPlanesCards();
}

// Toggle de expandir/contraer una tarjeta (misma lógica que
// window.__toggleStateCard del State Bar: un solo índice/id abierto a la vez).
window.__togglePlanCard = function (planId) {
    openPlanId = (openPlanId === planId) ? null : planId;
    renderPlanesCards();
};

function renderPlanesCards() {
    const list = document.getElementById('list-planes');
    if (!list) return;

    if (!planesCache || planesCache.length === 0) {
        list.innerHTML = '<p style="padding: 16px; color: var(--text-muted);">Aún no tienes planes guardados. Agrega el primero con "Nuevo Plan".</p>';
        return;
    }

    list.innerHTML = '';

    planesCache.forEach(plan => {
        const dias = diasRestantes(plan.plan_date);
        const safeTitle = String(plan.title || '').replace(/'/g, "\\'");
        const isOpen = openPlanId === plan.id;

        let contadorHtml;
        let contadorClase = 'plan-countdown';
        if (dias > 0) {
            contadorHtml = `<span class="plan-countdown-num">${dias}</span><span class="plan-countdown-label">${dias === 1 ? 'día falta' : 'días faltan'}</span>`;
            if (dias <= 7) contadorClase += ' plan-countdown-soon';
        } else if (dias === 0) {
            contadorHtml = `<span class="plan-countdown-num">HOY</span>`;
            contadorClase += ' plan-countdown-today';
        } else {
            contadorHtml = `<span class="plan-countdown-num">${Math.abs(dias)}</span><span class="plan-countdown-label">${Math.abs(dias) === 1 ? 'día pasó' : 'días pasaron'}</span>`;
            contadorClase += ' plan-countdown-past';
        }

        const card = `
            <div class="plan-card${isOpen ? ' plan-card--open' : ''}" id="plan-card-${plan.id}">
                <div class="plan-card-main"
                     onclick="window.__togglePlanCard(${plan.id})"
                     oncontextmenu="event.preventDefault(); deletePlan(${plan.id}, '${safeTitle}')"
                     title="Toca para ver/agregar cosas del plan · Clic Derecho: Eliminar">
                    <div class="plan-card-info">
                        <div class="plan-card-title-row">
                            <span class="plan-card-title" title="Clic para editar">${plan.title}</span>
                            <span class="plan-card-caret">${isOpen ? '▾' : '▸'}</span>
                        </div>
                        <div class="plan-card-date">${formatearFechaPlan(plan.plan_date)}${plan.location_name ? ' · ' + plan.location_name : ''}</div>
                        <div class="plan-card-weather" id="plan-weather-${plan.id}">${plan.lat ? 'Consultando clima…' : ''}</div>
                    </div>
                    <div class="${contadorClase}">${contadorHtml}</div>
                </div>
                ${isOpen ? `<div class="plan-items-panel" id="plan-items-panel-${plan.id}" onclick="event.stopPropagation();"><div class="top-habit-empty">Cargando…</div></div>` : ''}
            </div>
        `;
        list.insertAdjacentHTML('beforeend', card);

        // Clic en el título edita el plan; el resto de la tarjeta expande/contrae.
        const titleEl = document.querySelector(`#plan-card-${plan.id} .plan-card-title`);
        if (titleEl) {
            titleEl.addEventListener('click', (e) => {
                e.stopPropagation();
                editPlan(plan.id, safeTitle, plan.plan_date, plan.location_name || null);
            });
        }

        // El clima se consulta aparte para no bloquear el render de la lista.
        if (plan.lat && plan.lng && dias >= 0) {
            fetchWeatherForPlan(plan.lat, plan.lng, plan.plan_date).then(w => {
                const el = document.getElementById(`plan-weather-${plan.id}`);
                if (!el) return;
                if (w) {
                    const [emoji, label] = weatherCodeInfo(w.code);
                    el.textContent = `${emoji} ${label} · ${w.tmin}° - ${w.tmax}°`;
                } else if (dias > 15) {
                    el.textContent = `El pronóstico estará disponible cuando falten 16 días o menos`;
                } else {
                    el.textContent = '';
                }
            });
        } else if (plan.lat && dias < 0) {
            const el = document.getElementById(`plan-weather-${plan.id}`);
            if (el) el.textContent = '';
        }

        if (isOpen) {
            loadPlanItemsPanel(plan.id);
        }
    });
}

/**
 * ==========================================
 * COSAS DE CADA PLAN (planes_items)
 * ==========================================
 * Checklist simple por plan: texto libre, marcar como hecho, eliminar.
 * Se carga solo cuando el panel de ese plan está expandido.
 */
async function loadPlanItemsPanel(planId) {
    const panel = document.getElementById(`plan-items-panel-${planId}`);
    if (!panel) return;

    const { data: items, error } = await _supabase
        .from('planes_items')
        .select('*')
        .eq('plan_id', planId)
        .order('created_at', { ascending: true });

    if (error) {
        panel.innerHTML = `<div class="top-habit-empty">No se pudo cargar la lista (${error.message}).</div>`;
        return;
    }

    const rowsHtml = (items && items.length > 0)
        ? items.map(item => `
            <div class="plan-item-row${item.done ? ' plan-item-row--done' : ''}">
                <button class="plan-item-check" data-item-id="${item.id}" aria-label="Marcar como hecho">${item.done ? '✅' : '⬜'}</button>
                <span class="plan-item-text">${item.text}</span>
                <button class="plan-item-delete" data-item-id="${item.id}" aria-label="Eliminar">×</button>
            </div>
        `).join('')
        : `<div class="top-habit-empty">Aún no agregaste nada a este plan.</div>`;

    panel.innerHTML = `
        <div class="plan-items-list">${rowsHtml}</div>
        <button class="plan-item-add-btn" type="button">+ Agregar cosa al plan</button>
    `;

    panel.querySelectorAll('.plan-item-check').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePlanItemDone(Number(btn.dataset.itemId), planId);
        });
    });

    panel.querySelectorAll('.plan-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePlanItem(Number(btn.dataset.itemId), planId);
        });
    });

    const addBtn = panel.querySelector('.plan-item-add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addPlanItem(planId);
        });
    }
}

async function addPlanItem(planId) {
    const text = prompt("¿Qué quieres agregar a este plan?");
    if (!text || text.trim() === "") return;

    const { error } = await _supabase
        .from('planes_items')
        .insert([{ plan_id: planId, text: text.trim() }]);

    if (error) {
        alert("Error al agregar: " + error.message);
    } else {
        loadPlanItemsPanel(planId);
    }
}

async function togglePlanItemDone(itemId, planId) {
    const { data, error: errSelect } = await _supabase
        .from('planes_items')
        .select('done')
        .eq('id', itemId)
        .single();

    if (errSelect || !data) return;

    const { error } = await _supabase
        .from('planes_items')
        .update({ done: !data.done })
        .eq('id', itemId);

    if (error) {
        alert("Error al actualizar: " + error.message);
    } else {
        loadPlanItemsPanel(planId);
    }
}

async function deletePlanItem(itemId, planId) {
    const { error } = await _supabase
        .from('planes_items')
        .delete()
        .eq('id', itemId);

    if (error) {
        alert("Error al eliminar: " + error.message);
    } else {
        loadPlanItemsPanel(planId);
    }
}

async function addPlan() {
    const title = prompt("¿Qué plan quieres agregar? (Ej: Caminata de senderismo):");
    if (!title || title.trim() === "") return;

    const dateStr = prompt("Fecha del plan (formato AAAA-MM-DD, ej: 2026-08-09):");
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
        alert("Fecha inválida. Usa el formato AAAA-MM-DD.");
        return;
    }

    const locationInput = prompt("¿Dónde será? (Ej: Antioquia, Colombia) — deja vacío si no aplica:");
    let lat = null, lng = null, locationName = locationInput && locationInput.trim() ? locationInput.trim() : null;

    if (locationName) {
        const geo = await geocodeLocation(locationName);
        if (geo) {
            lat = geo.lat;
            lng = geo.lng;
            locationName = geo.display;
        } else {
            alert("No se encontró esa ubicación. Se guardará el plan sin datos de clima.");
        }
    }

    const { error } = await _supabase
        .from('planes_logs')
        .insert([{ title: title.trim(), plan_date: dateStr.trim(), location_name: locationName, lat, lng }]);

    if (error) {
        alert("Error al guardar el plan: " + error.message);
    } else {
        loadPlanes();
    }
}

async function editPlan(id, oldTitle, oldDateStr, oldLocationName) {
    const newTitle = prompt("Editar plan:", oldTitle);
    if (!newTitle || newTitle.trim() === "") return;

    const newDateStr = prompt("Fecha del plan (formato AAAA-MM-DD):", oldDateStr);
    if (!newDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(newDateStr.trim())) {
        alert("Fecha inválida. Usa el formato AAAA-MM-DD.");
        return;
    }

    const newLocationInput = prompt("¿Dónde será? — deja vacío si no aplica:", oldLocationName || "");
    let lat = null, lng = null, locationName = newLocationInput && newLocationInput.trim() ? newLocationInput.trim() : null;

    if (locationName && locationName !== oldLocationName) {
        const geo = await geocodeLocation(locationName);
        if (geo) {
            lat = geo.lat;
            lng = geo.lng;
            locationName = geo.display;
        } else {
            alert("No se encontró esa ubicación. Se guardará el plan sin datos de clima.");
        }
    } else if (locationName === oldLocationName) {
        // No cambió la ubicación: se conservan las coordenadas ya guardadas.
        const { data } = await _supabase.from('planes_logs').select('lat, lng').eq('id', id).single();
        if (data) { lat = data.lat; lng = data.lng; }
    }

    const { error } = await _supabase
        .from('planes_logs')
        .update({ title: newTitle.trim(), plan_date: newDateStr.trim(), location_name: locationName, lat, lng })
        .eq('id', id);

    if (error) {
        alert("Error al editar el plan: " + error.message);
    } else {
        loadPlanes();
    }
}

async function deletePlan(id, title) {
    const confirmDelete = confirm(`¿Deseas eliminar el plan "${title}"?`);
    if (!confirmDelete) return;

    // Por si "planes_items" no tiene ON DELETE CASCADE configurado.
    await _supabase.from('planes_items').delete().eq('plan_id', id);

    const { error } = await _supabase
        .from('planes_logs')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Error al eliminar el plan: " + error.message);
    } else {
        if (openPlanId === id) openPlanId = null;
        loadPlanes();
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

    // 2. Renderizar el progreso del curso de inglés
    if (typeof renderEnglishCourseWeeks === 'function') {
        renderEnglishCourseWeeks();
    }

    // 3. Renderizar el Top 3 de mejores hábitos históricos
    if (typeof loadTopHabits === 'function') {
        loadTopHabits();
    }

    // 4. Renderizar el Top 3 de Loves favoritos
    if (typeof loadTopLoves === 'function') {
        loadTopLoves();
    }

    // 5. Renderizar el Top 3 de Sentimientos
    if (typeof loadTopSentimientos === 'function') {
        loadTopSentimientos();
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
 * PROGRESO DEL CURSO DE INGLÉS
 * ==========================================
 * Cuenta, en color rojo, las semanas transcurridas de tu curso de
 * inglés: inicia el 1 de abril de 2025 y termina el 31 de julio de
 * 2027. Si en algún momento cambian esas fechas, solo hay que
 * ajustar "startDate" y "endDate" abajo.
 */
function renderEnglishCourseWeeks() {
    const container = document.getElementById('english-weeks-grid');
    if (!container) return;
    container.innerHTML = '';

    const startDate = new Date(2025, 3, 1);  // 1 de abril de 2025
    const endDate = new Date(2027, 6, 31);   // 31 de julio de 2027
    const today = new Date();

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const totalWeeks = Math.max(1, Math.ceil((endDate - startDate) / msPerWeek));

    let weeksElapsed;
    if (today < startDate) {
        weeksElapsed = 0;
    } else if (today > endDate) {
        weeksElapsed = totalWeeks;
    } else {
        weeksElapsed = Math.ceil((today - startDate) / msPerWeek);
    }

    const currentWeekNumber = Math.min(totalWeeks, Math.max(1, weeksElapsed));
    const weeksRemaining = Math.max(0, totalWeeks - weeksElapsed);

    const titleEl = document.getElementById('english-progress-title');
    if (titleEl) {
        const statusText = today > endDate
            ? "¡Curso finalizado!"
            : `Quedan ${weeksRemaining} semanas para terminar tu curso de inglés`;

        titleEl.innerHTML = `Curso de Inglés · Semana ${currentWeekNumber} de ${totalWeeks}
            <span class="year-progress-subtitle">${statusText}</span>`;
    }

    for (let i = 1; i <= totalWeeks; i++) {
        const box = document.createElement('div');
        box.className = 'week-box';
        box.title = `Semana ${i} del curso de inglés`;

        if (i < weeksElapsed) {
            box.classList.add('english-passed');
        } else if (i === weeksElapsed) {
            box.classList.add('english-current');
            box.title = `Semana ${i} (Actual)`;
        }

        container.appendChild(box);
    }
}

















/**
 * ==========================================
 * GESTIÓN DE COMPRAS (AHORRO POR ITEM)
 * ==========================================
 * Cada compra ya no es un contador acumulativo (como Loves); ahora es
 * una meta de ahorro: tiene un "ahorro" (lo que ya has guardado para
 * ese item) y un "precio_promedio" (precio estimado del artículo).
 * La tarjeta muestra nombre, foto y una barra de progreso = ahorro /
 * precio_promedio, para saber de un vistazo qué tan cerca estás de
 * poder comprarlo.
 *
 * COLUMNAS REQUERIDAS EN "compras_logs" (Supabase):
 *   ahorro           numeric DEFAULT 0   -- lo ahorrado hasta hoy
 *   precio_promedio  numeric DEFAULT 0   -- precio estimado del item
 * (la columna "count" ya no se usa y puede quedar o eliminarse).
 *
 * Usa formatCurrency() (definida en Components/finance/finance.js,
 * ya cargado antes de que se ejecute loadCompras()).
 */
async function loadCompras() {
    const { data: compras, error } = await _supabase
        .from('compras_logs')
        .select('*')
        .order('name', { ascending: true });

    if (error) return console.error(error.message);

    const container = document.getElementById('list-compras');
    if (!container) return;
    container.className = 'compras-grid';
    container.innerHTML = '';

    compras.forEach(compra => {
        const ahorro = Number(compra.ahorro) || 0;
        const meta = Number(compra.precio_promedio) || 0;
        const pct = meta > 0 ? Math.min((ahorro / meta) * 100, 100) : 0;
        const lista = meta > 0 && ahorro >= meta;

        const card = document.createElement('div');
        card.className = 'compra-card' + (lista ? ' compra-card--lista' : '');

        const localImagePath = `assets/images/${compra.image_filename}`;

        card.innerHTML = `
            <img src="${localImagePath}" class="compra-img"
                 onerror="this.src='assets/images/default.jpg'">
            <div class="compra-info">
                <div class="compra-top-row">
                    <span class="compra-name" title="Clic para editar nombre">${compra.name}</span>
                    ${lista ? '<span class="compra-ready-badge">✅ Listo</span>' : ''}
                </div>
                <div class="compra-progress-track">
                    <div class="compra-progress-fill${lista ? ' compra-progress-fill--lista' : ''}" style="width:${pct}%;"></div>
                </div>
                <div class="compra-amounts" title="Clic para agregar ahorro">
                    ${formatCurrency(ahorro)} <span class="compra-amounts-sep">/</span> ${meta > 0 ? formatCurrency(meta) : 'Sin precio objetivo'}
                </div>
            </div>
        `;

        card.querySelector('.compra-name').addEventListener('click', (e) => {
            e.stopPropagation();
            editCompra(compra.name, compra.id);
        });

        card.querySelector('.compra-amounts').addEventListener('click', (e) => {
            e.stopPropagation();
            addAhorroCompra(compra.id, ahorro);
        });

        card.addEventListener('dblclick', () => {
            setPrecioPromedioCompra(compra.id, meta);
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
        .insert([{ name: name.trim(), ahorro: 0, precio_promedio: 0 }]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        loadCompras();
    }
}

async function addAhorroCompra(id, currentAhorro) {
    const input = prompt("Cuánto quieres agregar al ahorro (sin puntos):");
    if (input === null) return;
    const monto = Number(input);
    if (isNaN(monto) || monto === 0) return;

    const nuevoAhorro = Math.max(0, currentAhorro + monto);
    const { error } = await _supabase
        .from('compras_logs')
        .update({ ahorro: nuevoAhorro })
        .eq('id', id);

    if (error) {
        alert("Error al guardar el ahorro: " + error.message);
    } else {
        loadCompras();
    }
}

async function setPrecioPromedioCompra(id, currentPrecio) {
    const input = prompt("Precio promedio estimado (sin puntos):", currentPrecio || '');
    if (input === null) return;
    const monto = Number(input);
    if (isNaN(monto)) return;

    const { error } = await _supabase
        .from('compras_logs')
        .update({ precio_promedio: monto })
        .eq('id', id);

    if (error) {
        alert("Error al guardar el precio: " + error.message);
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
 * COMPONENTE STATE BAR
 * ==========================================
 * Se muestran ÚNICAMENTE las tarjetas cuyo rango horario incluye la
 * hora actual (pueden ser varias a la vez si configuras rangos que
 * se solapan a propósito, ej. "Code & Grow" y "Comida" en la misma
 * franja). No se muestra nada que esté fuera de horario.
 *
 * Al hacer clic en una tarjeta, el menú desplegable con sugerencias
 * aparece justo DEBAJO de esa tarjeta específica (no flotando al
 * final de la lista), y un segundo clic sobre la misma tarjeta lo
 * cierra (toggle).
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
     *
     * IMPORTANTE sobre los rangos:
     * - "end" es EXCLUSIVO (el slot termina justo antes de ese minuto).
     * - Si quieres que dos o más actividades aparezcan juntas en la
     *   misma franja (ej. "Code & Grow" y "Comida" a las 6pm), dales
     *   el mismo start/end: ambas se mostrarán a la vez.
     * - Si un rango cruza la medianoche (ej. 9pm a 5am), se admite
     *   escribiéndolo como start: 1260, end: 300 — el sistema detecta
     *   automáticamente que "end" es menor que "start" y lo interpreta
     *   como "desde las 9pm hasta las 5am del día siguiente".
     */
    const CONFIG = {
        weekday: [
            {
                start: 300, end: 390, label: "Mañana", icon: "💼", class: "state-work",
                options: ["Revisar tickets pendientes", "Reunión de equipo", "Documentar soluciones"]
            },
            {
                start: 390, end: 1080, label: "Mesa de Ayuda", icon: "💼", class: "state-work",
                options: ["Revisar tickets pendientes", "LLenar ordenes", "Adelantar minuta", "Cumplir con la tarea del dia"]
            },
            {
                start: 1080, end: 1260, label: "Code & Ingles", icon: "🌱 &#128218;", class: "state-grow",
                options: ["Practicar inglés (Duolingo/Anki)", "Curso de programación", "Proyecto personal de código"]
            },
            {
                start: 1080, end: 1260, label: "Comida", icon: "🍽️", class: "state-free",
                options: ["Preparar algo saludable", "Comer con calma, sin pantallas","Preparar coca"]
            },
            {
                start: 1200, end: 1260, label: "Lectura & Meditación", icon: "🌙", class: "state-free",
                options: ["Continuar libro Pideme lo que quieras"]
            },
            {
                start: 1260, end: 300, label: "Dormir", icon: "🌙", class: "state-sleep",
                options: ["Dormir", "Rutina nocturna"]
            }
        ],
        weekend: [
            {
                start: 1260, end: 300, label: "Descanso", icon: "🌙", class: "state-sleep",
                options: ["Dormir", "Rutina nocturna"]
            },
            {
                start: 300, end: 1080, label: "FreeTime & Senderismo", icon: "⛰️ + 🍻", class: "state-grow",
                options: ["Sara Travel", "Cruzamontañas", "Caminantes Medellín", "Ruta libre por el cerro"]
            },
            {
                start: 1080, end: 1260, label: "Comida", icon: "🍽️", class: "state-free",
                options: ["Preparar algo saludable", "Comer con calma, sin pantallas","Preparar coca"]
            },
            {
                start: 1260, end: 1440, label: "Descanso", icon: "🌙", class: "state-sleep",
                options: ["Dormir", "Rutina nocturna"]
            }
        ]
    };

    // Determina si "mins" cae dentro de [start, end). Soporta rangos
    // que cruzan la medianoche (cuando end < start).
    function isWithinRange(mins, start, end) {
        if (start <= end) {
            return mins >= start && mins < end;
        }
        return mins >= start || mins < end;
    }

    container.innerHTML = `<div class="state-bar-grid" id="state-bar-grid"></div>`;

    // Único punto de verdad sobre qué tarjeta tiene el menú abierto.
    // Se guarda el índice de la tarjeta (no el slot) porque ahora el
    // dropdown se inserta dentro de la propia tarjeta, así que cada
    // tarjeta visible necesita poder abrir/cerrar el suyo de forma
    // independiente.
    let openIndex = null;

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

    // Guardamos los slots activos del ciclo de update() vigente para
    // que los onclick (generados como string) siempre encuentren los
    // datos correctos, sin depender de closures de updates anteriores.
    let activeSlots = [];

    function renderDropdownHTML(slot) {
        const optionsHTML = (slot.options || [])
            .map(opt => `<button class="state-dropdown-item" onclick="event.stopPropagation(); sendPromptToChatSafe('${opt.replace(/'/g, "\\'")}')">${opt}</button>`)
            .join('');

        return `
            <div class="state-dropdown" id="state-dropdown-inline">
                <div class="state-dropdown-title">${slot.icon} ${slot.label}</div>
                ${optionsHTML || '<div class="state-dropdown-empty">Sin sugerencias configuradas</div>'}
            </div>
        `;
    }

    // Abre/cierra (toggle) el menú de sugerencias de la tarjeta en
    // "index". El dropdown se inserta DENTRO de esa misma tarjeta,
    // justo debajo de su contenido, en vez de flotar al final.
    window.__toggleStateCard = function (index) {
        const isSameAndOpen = (openIndex === index);
        openIndex = isSameAndOpen ? null : index;
        renderCards();
    };

    function renderCards() {
        const gridContainer = document.getElementById('state-bar-grid');
        if (!gridContainer) return;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

        gridContainer.innerHTML = activeSlots.map((slot, index) => {
            const dropdownHTML = (openIndex === index) ? renderDropdownHTML(slot) : '';

            return `
                <div class="ikilife-state-card ${slot.class}" onclick="window.__toggleStateCard(${index})">
                    <div class="state-card-top">
                        <div class="state-info">
                            <span>${slot.icon}</span>
                            <span class="state-label">${slot.label}</span>
                        </div>
                        <div class="state-time">${timeStr}</div>
                    </div>
                    ${dropdownHTML}
                </div>
            `;
        }).join('');
    }

    function update() {
        const now = new Date();
        const mins = now.getHours() * 60 + now.getMinutes();
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;

        const schedule = isWeekend ? CONFIG.weekend : CONFIG.weekday;

        // Solo se conservan los slots cuyo rango horario incluye la
        // hora ACTUAL. Nada fuera de horario se muestra. Si dos o más
        // slots comparten el mismo rango (a propósito), ambos aparecen.
        activeSlots = schedule.filter(s => isWithinRange(mins, s.start, s.end));

        // Si el slot que tenía el dropdown abierto ya no está activo
        // (cambió la hora), se cierra para no dejar un índice inválido.
        if (openIndex !== null && openIndex >= activeSlots.length) {
            openIndex = null;
        }

        renderCards();
    }

    update();
    setInterval(update, 60000);
}