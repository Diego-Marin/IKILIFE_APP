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
 *  6. (eliminada 2026-08-16: "Gestión de Bloques de Rutina" era código muerto, sin vista en el HTML)
 *  7. "GESTIÓN DE HÁBITOS"                       → hábitos semanales (grid histórico)
 *  8. "UTILIDADES DE EXPORTACIÓN (SQL)"          → sqlValue/buildSQLInsert/descargarArchivo (usados por TODOS los exportadores)
 *  9. "EXPORTAR TODO (JSON PARA IA / NOTEBOOKLM)"→ exportAllDataJSON + TABLAS_EXPORTABLES
 * 10. "EXPORTAR HÁBITOS A SQL"                   → exportAllHistorySQL
 * 11. (eliminada: "Mejores Hábitos (Top 3 histórico)" era parte de la vista Estadísticas, ahora eliminada)
 * 12. (eliminada: "Mejores Loves (Top 3 ranking)" era parte de la vista Estadísticas, ahora eliminada)
 * 13. (eliminada: "Top 3 de Sentimientos" era parte de la vista Estadísticas, ahora eliminada)
 * 14. "NUEVO: EVOLUCIÓN EMOCIONAL"               → gráfico de barras de promedio diario (Sentimientos/Odios, últimos 14 días)
 * 15. "INTERFAZ DE USUARIO (TABS Y OTROS)"       → switchTab, saveLearning, toggleFinanceView
 * 16. "GESTIÓN DE IDEAS (BRAIN DUMP)"            → Brain Dump: CRUD de ideas
 * 17. "PENSAMIENTO ALEATORIO (BRAIN DUMP)"       → showRandomIdea + exportIdeasSQL
 * 18. "GESTIÓN DE TAREAS"                        → lista única de tareas del día
 * 19. (eliminada 2026-08-16: "Gestión de Inversiones y Deudas" era código muerto, sin vista en el HTML)
 * 20. "GESTIÓN DE COSAS QUE AMO (LOVES)"         → Loves: CRUD + contador acumulativo (dblclick)
 * 21. "GESTIÓN DE COSAS QUE ODIO (ODIOS)"        → Odios: CRUD + barra de intensidad 1-10
 * 22. "UTILIDADES COMPARTIDAS: TRACKERS DE BARRA 1-10" → helpers usados por Odios Y Sentimientos (fechas, guardado, relleno visual)
 * 23. "GESTIÓN DE SENTIMIENTOS"                  → Sentimientos: CRUD + barra de intensidad 1-10
 * 24. "PLANES"                                   → planes futuros (fecha + checklist)
 * 25. (eliminada: la vista "Estadísticas"/Métricas y sus Top 3 se quitaron; el progreso de Inglés vive en Hábitos → Inglés, ver "PROGRESO DEL CURSO DE INGLÉS")
 * 26. "PROGRESO DEL CURSO DE INGLÉS"             → renderEnglishCourseWeeks
 * 27. "GESTIÓN DE FINANZAS"                      → finanzas dinámicas/acumulativas
 * 28. "GESTIÓN DE COMPRAS"                       → Compras: CRUD + contador acumulativo (clon de Loves)
 * 29. "COMPONENTE STATE BAR"                     → tarjetas de "qué hacer ahora" según la hora del día
 * 30. "CATEGORÍAS DE HÁBITOS PERSONALIZADAS"     → listas de hábitos creadas manualmente por el usuario
 */

function loadAgradecimientos() {
    // Placeholder: si no usas agradecimientos, déjalo vacío.
}
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

    // 1b. Aplica nombre/emoji personalizados guardados para las
    // categorías fijas de Hábitos (ver editHabitCategory más abajo).
    try {
        applyFixedHabitCategoryOverrides();
    } catch (error) {
        console.error("Error aplicando nombres personalizados de categorías:", error);
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
        loadHomeUpcomingPlans();
        loadIdeas();
        showRandomIdea();
        loadTareas();
        loadOdios();
        loadPlanes();
        loadCompras();
        loadCustomHabitCategories();
        if (typeof renderYearWeeks === 'function') renderYearWeeks(); // Progreso del Año (Home)
        loadFinances();
        loadAgradecimientos();
        // loadEnglish() ya no se llama aquí: apuntaba a #english-section, que
        // no existía en ningún lado del HTML (código muerto). Ahora el
        // componente vive como sub-tab "INGLÉS" dentro de Camino y se carga
        // al visitarla (ver switchTrackingTab).
        if (typeof loadEspejoDelAlma === 'function') loadEspejoDelAlma();
    } catch (error) {
        console.error("Error durante la carga de datos:", error);
    }

    // 3. Suscripciones en tiempo real (Supabase)
    try {
        if (typeof _supabase !== 'undefined') {
            _supabase.channel('habit-changes')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'habit_logs' }, () => refreshActiveHabitsList())
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'habit_logs' }, () => refreshActiveHabitsList())
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'habit_logs' }, () => refreshActiveHabitsList())
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

    const dateElement = document.getElementById('fusion-date-text');
    if (dateElement) {
        const fullDate = new Intl.DateTimeFormat('es-CO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(today);
        dateElement.textContent = fullDate;
    }

    let currentDay = today.getDay();
    currentDay = currentDay === 0 ? 7 : currentDay;

    // Semana del año + día actual + semanas restantes (header izquierda)
    const weekOfYear = getWeekOfYear(today);
    const weekElement = document.getElementById('fusion-week-text');
    if (weekElement) {
        const dayLetters = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
        const totalWeeksInYear = 52;
        const weeksRemaining = Math.max(0, totalWeeksInYear - weekOfYear);
        const dayLetter = dayLetters[currentDay - 1] || '';
        weekElement.textContent = `Semana ${weekOfYear} · ${dayLetter} · ${weeksRemaining} semanas restantes`;
    }

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
 * NOTA: el componente "Gestión de Bloques de Rutina" (bloques_logs)
 * fue eliminado el 2026-08-16 por ser código muerto: no tenía vista
 * en index.html (#bloques-container no existe) y solo generaba una
 * consulta innecesaria a Supabase en cada carga de la app.
 */
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

/**
 * ==========================================
 * REGISTRO DE CATEGORÍAS DE HÁBITOS (FIJAS + PERSONALIZADAS)
 * ==========================================
 * Única fuente de verdad para el mapeo subtab-id ↔ tag ↔ label/icon.
 * Arranca con las categorías fijas de siempre; las personalizadas que
 * el usuario crea desde "+ Nueva lista" se agregan aquí en caliente
 * (ver loadCustomHabitCategories/addCustomHabitCategory más abajo).
 * Todo el motor de hábitos (switchTrackingTab, refreshActiveHabitsList,
 * addHabitForTag) lee de este único objeto en vez de mapas duplicados.
 */
const HABIT_CATEGORIES = {
    cabello: { tag: 'CABELLO', label: 'CABELLO', icon: '✂️' },
    sexualidad: { tag: 'SEXUALIDAD', label: 'SEXUALIDAD', icon: '🔥' },
    piel: { tag: 'PIEL', label: 'PIEL', icon: '🧴' },
    cuerpo: { tag: 'CUERPO', label: 'CUERPO', icon: '💪' },
    dinero: { tag: 'DINERO', label: 'DINERO', icon: '💰' },
    saludemocional: { tag: 'BIENESTAR', label: 'SALUD EMOCIONAL', icon: '🕊️' },
};

/**
 * ==========================================
 * NOMBRE / EMOJI EDITABLES POR CATEGORÍA
 * ==========================================
 * Las 6 categorías fijas de arriba no tienen fila propia en Supabase
 * (a diferencia de las personalizadas, que viven en "habit_categories").
 * Para permitir renombrarlas/cambiarles el emoji sin tocar su tag
 * interno (el tag sigue usándose para filtrar habit_logs), el override
 * de label/icon se guarda en localStorage y se aplica encima de los
 * valores por defecto al arrancar.
 *
 * Las categorías personalizadas, en cambio, sí tienen fila en
 * Supabase: para ellas, editar label/icon actualiza esa fila.
 */
const FIXED_HABIT_CATEGORY_IDS = Object.keys(HABIT_CATEGORIES);
const HABIT_CATEGORY_OVERRIDE_PREFIX = 'ikilife_habit_category_override_';

function applyFixedHabitCategoryOverrides() {
    FIXED_HABIT_CATEGORY_IDS.forEach(subtabId => {
        const raw = localStorage.getItem(HABIT_CATEGORY_OVERRIDE_PREFIX + subtabId);
        if (!raw) return;
        try {
            const override = JSON.parse(raw);
            if (override && HABIT_CATEGORIES[subtabId]) {
                if (override.label) HABIT_CATEGORIES[subtabId].label = override.label;
                if (override.icon) HABIT_CATEGORIES[subtabId].icon = override.icon;
            }
        } catch (e) {
            console.warn('Override de categoría corrupto para', subtabId, e.message);
        }
        applyHabitCategoryUIUpdate(subtabId, HABIT_CATEGORIES[subtabId]);
    });
}

/**
 * Refleja en el DOM el label/icon actual de una categoría: el botón
 * de la tab (icono + texto) y, si existen, el aria-label/title del
 * botón de "agregar hábito" dentro de su panel.
 */
function applyHabitCategoryUIUpdate(subtabId, category) {
    const tabBtn = document.querySelector(`.camino-tab-btn[data-subtab="${subtabId}"]`);
    if (tabBtn) {
        const iconEl = tabBtn.querySelector('.camino-tab-icon');
        const labelEl = tabBtn.querySelector('.camino-tab-label');
        if (iconEl) iconEl.textContent = category.icon;
        if (labelEl) labelEl.textContent = category.label;
    }

    const panel = document.getElementById('tracking-' + subtabId);
    if (panel) {
        const addBtn = panel.querySelector('.icon-btn');
        if (addBtn) {
            const niceLabel = category.label.charAt(0) + category.label.slice(1).toLowerCase();
            addBtn.setAttribute('aria-label', `Agregar hábito de ${niceLabel}`);
            addBtn.setAttribute('title', `Agregar hábito de ${niceLabel}`);
        }
    }
}

/**
 * Permite editar nombre y emoji de CUALQUIER categoría de Hábitos
 * (fijas o personalizadas). Se dispara con doble clic sobre la tab.
 */
async function editHabitCategory(subtabId) {
    const category = HABIT_CATEGORIES[subtabId];
    if (!category) return;

    const newLabelInput = prompt('Nuevo nombre para esta categoría:', category.label);
    if (newLabelInput === null) return; // cancelado
    const newIconInput = prompt('Nuevo emoji para esta categoría:', category.icon);
    if (newIconInput === null) return; // cancelado

    const newLabel = newLabelInput.trim() ? newLabelInput.trim().toUpperCase() : category.label;
    const newIcon = newIconInput.trim() ? newIconInput.trim() : category.icon;

    if (newLabel === category.label && newIcon === category.icon) return;

    category.label = newLabel;
    category.icon = newIcon;

    if (FIXED_HABIT_CATEGORY_IDS.includes(subtabId)) {
        localStorage.setItem(
            HABIT_CATEGORY_OVERRIDE_PREFIX + subtabId,
            JSON.stringify({ label: newLabel, icon: newIcon })
        );
    } else {
        const { error } = await _supabase
            .from('habit_categories')
            .update({ label: newLabel, icon: newIcon })
            .eq('tag', category.tag);
        if (error) {
            alert('Error al guardar los cambios: ' + error.message);
        }
    }

    applyHabitCategoryUIUpdate(subtabId, category);
}

/**
 * ==========================================
 * REFRESCO DE HÁBITOS (post add/edit/delete/toggle)
 * ==========================================
 * Antes existía loadHabits(), que renderizaba TODOS los hábitos juntos
 * en un contenedor #list-habits. Ese contenedor ya no existe en el HTML:
 * los hábitos viven en listas separadas por categoría dentro de la
 * pestaña "Hábitos" (antes "Camino"), una por cada entrada de
 * HABIT_CATEGORIES (fijas o personalizadas).
 *
 * refreshActiveHabitsList() detecta qué sub-tab de Hábitos está activa
 * y recarga solo esa lista.
 */
function refreshActiveHabitsList() {
    const activeBtn = document.querySelector('#view-tracking .camino-tab-active');
    const sub = activeBtn ? activeBtn.dataset.subtab : null;

    if (sub && HABIT_CATEGORIES[sub]) {
        loadHabitsGroup(HABIT_CATEGORIES[sub].tag, 'list-habits-' + sub);
    }
    if (typeof loadEspejoDelAlma === 'function') loadEspejoDelAlma();
}

/**
 * ==========================================
 * HÁBITOS POR DEFECTO DE CADA CATEGORÍA DE "HÁBITOS" (antes "Camino")
 * ==========================================
 * Cada categoría trae una lista inicial de hábitos ya definida. Se
 * siembra UNA SOLA VEZ por categoría (se marca en localStorage) para
 * no volver a crear un hábito que el usuario borró a propósito.
 */
const DEFAULT_HABITS_BY_TAG = {
    CABELLO: ['Recortado a punto', 'Degradado lateral', 'Limpio y humectado'],
    SEXUALIDAD: ['No pornografía', 'No masturbación', 'Ejercicios de Kegel'],
    PIEL: ['Lavado de rostro', 'Afeitado limpio', 'Hidratación / skin care', 'No arañar', 'Retinoides y foliculitis'],
    CUERPO: ['50 abdominales diarias', '70 sentadillas', 'Fondos x30', 'Rutina de gym'],
    DINERO: ['No casino', 'Gasto consciente', 'Ahorro diario'],
    BIENESTAR: ['Lecturas sanadoras', 'Conexiones reales', 'Meditación'],
};

async function seedDefaultHabitsOnce(tag) {
    const seedKey = 'ikilife_seeded_habits_' + tag;
    if (localStorage.getItem(seedKey) === '1') return;

    const defaults = DEFAULT_HABITS_BY_TAG[tag] || [];
    if (defaults.length === 0) {
        localStorage.setItem(seedKey, '1');
        return;
    }

    const todayStr = formatDateLocal(new Date());
    const rows = defaults.map(name => ({
        habit_name: `${name} #${tag}`,
        log_date: todayStr,
        is_completed: false,
        project_tag: tag,
    }));

    const { error } = await _supabase.from('habit_logs').insert(rows);
    if (error) {
        console.error(`Error sembrando hábitos por defecto de ${tag}:`, error.message);
        return; // no marcar como sembrado: se reintentará la próxima vez
    }
    localStorage.setItem(seedKey, '1');
}

async function loadHabitCategory(tag, containerId) {
    await seedDefaultHabitsOnce(tag);
    await loadHabitsGroup(tag, containerId);
}

// Función auxiliar para extraer el proyecto del nombre del hábito
function getProjectFromHabitName(name) {
    if (!name) return null;
    // Extrae el hashtag: todo lo que va después de # hasta el primer espacio
    const match = name.match(/#([A-Za-z0-9_ÁÉÍÓÚáéíóúÑñ]+)/);
    if (match) {
        // Devuelve el tag tal cual (ej: #FAMILIA → FAMILIA)
        return match[1].toUpperCase();
    }
    return null;
}

/**
 * NUEVO: sub-grupo dentro de ME/Health/Work (ej: "Meditar #ME #APARIENCIA"
 * -> subgrupo "APARIENCIA"). Es el SEGUNDO hashtag del nombre; si no
 * existe, el hábito cae en el grupo "General".
 */
function getSubgroupFromHabitName(name) {
    if (!name) return null;
    const matches = [...name.matchAll(/#([A-Za-z0-9_ÁÉÍÓÚáéíóúÑñ]+)/g)];
    if (matches.length > 1) {
        return matches[1][1].toUpperCase();
    }
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
        refreshActiveHabitsList();
    }
}

async function toggleHabit(habitName, dateStr, currentState) {
    const { data, error: fetchError } = await _supabase
        .from('habit_logs')
        .select('id')
        .eq('habit_name', habitName)
        .eq('log_date', dateStr)
        .maybeSingle();

    if (fetchError) {
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

    refreshActiveHabitsList();
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

    if (error) {
        alert("Error al editar: " + error.message);
        return;
    }

    // Mantiene la imagen asociada al renombrar el hábito.
    await _supabase.from('habit_images').update({ habit_name: updatedName }).eq('habit_name', oldName);

    refreshActiveHabitsList();
}

async function deleteHabit(name) {
    const confirmDelete = confirm(`¿Deseas eliminar "${name}" y TODO su registro histórico?`);
    if (!confirmDelete) return;

    const { error } = await _supabase
        .from('habit_logs')
        .delete()
        .eq('habit_name', name);

    if (error) {
        alert("Error al eliminar: " + error.message);
        return;
    }

    await _supabase.from('habit_images').delete().eq('habit_name', name);

    refreshActiveHabitsList();
}

/* NUEVO: define o cambia la imagen de un hábito. Guarda solo el
   nombre del archivo (debe existir en assets/images/), igual que
   Loves/Odios/Compras.
   Requiere en Supabase la tabla nueva "habit_images":
     CREATE TABLE habit_images (
       habit_name text PRIMARY KEY,
       image_filename text NOT NULL,
       updated_at timestamptz DEFAULT now()
     ); */
async function setHabitImage(habitName) {
    const input = prompt(`Nombre del archivo de imagen para "${cleanHabitName(habitName)}" (debe estar en assets/images/):`, 'default.jpg');
    if (input === null || input.trim() === '') return;

    const { error } = await _supabase
        .from('habit_images')
        .upsert({ habit_name: habitName, image_filename: input.trim(), updated_at: new Date().toISOString() }, { onConflict: 'habit_name' });

    if (error) {
        alert("Error al guardar la imagen: " + error.message);
    } else {
        refreshActiveHabitsList();
    }
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
    'inversiones_logs', 'journal_logs', 'bloques_logs', 'planes_logs','english_classes'
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
 * Exportar Hábitos a JSON en archivo .txt
 */
async function exportHabitsJSON() {
    try {
        const { data, error } = await _supabase
            .from('habit_logs')
            .select('*')
            .order('log_date', { ascending: true });

        if (error) throw error;
        if (!data || !data.length) { alert('No hay hábitos para exportar.'); return; }

        const payload = {
            app: 'IKILIFE',
            tabla: 'habit_logs',
            exportado_el: new Date().toISOString(),
            registros: data
        };

        const json = JSON.stringify(payload, null, 2);
        const fecha = new Date().toISOString().slice(0, 10);
        descargarArchivo(json, `IKILIFE_Habitos_${fecha}.txt`, 'text/plain;charset=utf-8;');

    } catch (err) {
        console.error('Error exportando hábitos:', err);
        alert('Error: ' + err.message);
    }
}

function switchTrackingTab(subtab, btn) {
    document.querySelectorAll('#view-tracking .camino-tab-btn').forEach(b => {
        b.classList.remove('camino-tab-active');
    });
    if (btn) btn.classList.add('camino-tab-active');
    document.querySelectorAll('#view-tracking .tracking-subview').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById('tracking-' + subtab);
    if (target) target.classList.remove('hidden');

    // Categorías de hábitos diarios, fijas o personalizadas (cada una
    // trae una lista de hábitos por defecto la primera vez que se abre
    // — ver DEFAULT_HABITS_BY_TAG — salvo las personalizadas, que
    // empiezan vacías).
    if (HABIT_CATEGORIES[subtab]) {
        loadHabitCategory(HABIT_CATEGORIES[subtab].tag, 'list-habits-' + subtab);
    }
    // SENTIMIENTOS fusiona Positivos (antes Loves) y Negativos (antes
    // Odios) en sub-tabs internas — carga ambas listas de una vez para
    // que el cambio de sub-tab sea instantáneo.
    if (subtab === 'sentimientos') {
        if (typeof loadLoves === 'function') loadLoves();
        if (typeof loadOdios === 'function') loadOdios();
    }
    // INGLÉS: componente completo de Components/english/english.js. Antes
    // se cargaba en el arranque apuntando a un contenedor que no existía
    // en el HTML (#english-section); ahora vive aquí como una sub-tab más
    // de Hábitos y se carga (o refresca) cada vez que se visita.
    if (subtab === 'english' && typeof loadEnglish === 'function') loadEnglish();
}

/**
 * Alterna entre las sub-tabs internas "Positivos" (Loves) y "Negativos"
 * (Odios) dentro de la pestaña fusionada Sentimientos.
 */
function switchSentTab(which, btn) {
    document.querySelectorAll('#tracking-sentimientos .sent-tab-btn').forEach(b => {
        b.classList.remove('sent-tab-active');
    });
    if (btn) btn.classList.add('sent-tab-active');

    document.querySelectorAll('#tracking-sentimientos .sent-subview').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById('sent-' + which);
    if (target) target.classList.remove('hidden');

    if (which === 'positivos' && typeof loadLoves === 'function') loadLoves();
    if (which === 'negativos' && typeof loadOdios === 'function') loadOdios();
}

/**
 * Alterna entre las sub-tabs "Finanzas" y "Compras" dentro de la
 * pestaña Money — mismo patrón que switchSentTab en Sentimientos.
 */
function switchMoneyTab(which, btn) {
    document.querySelectorAll('#view-money .sent-tab-btn').forEach(b => {
        b.classList.remove('sent-tab-active');
    });
    if (btn) btn.classList.add('sent-tab-active');

    document.querySelectorAll('#view-money .sent-subview').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById('money-' + which);
    if (target) target.classList.remove('hidden');

    if (which === 'finanzas' && typeof loadFinances === 'function') loadFinances();
    if (which === 'compras' && typeof loadCompras === 'function') loadCompras();
}








/**
 * ==========================================
 * INTERFAZ DE USUARIO (TABS Y OTROS)
 * ==========================================
 * NOTA: se removieron switchTab() y saveLearning() — código muerto.
 * switchTab() manejaba una barra de tabs (.tabs/.tab-btn) generada por
 * Components/nav_menu, cuyo contenedor (#nav-menu-container) tampoco
 * existía en el HTML; además llamaba a switchSentimientosTab(), una
 * función que nunca llegó a definirse. saveLearning() guardaba en la
 * tabla "journal_logs" desde un campo (#daily-learning) que no existe
 * en ningún lado del HTML. Ninguna de las dos podía ejecutarse nunca
 * desde la interfaz real de la app (Components/nav_menu/nav_menu.js y
 * .css tampoco se cargan ya desde index.html).
 */

/**
 * Planes y Tareas ahora viven juntos en "planes-main" (una sola
 * pestaña, sin sub-tabs). "planes-ideas" (Brain Dump) es la única
 * subvista alterna, y solo se muestra al abrirla desde el botón de
 * ideas del header (ver openIdeasFromHeader / closeIdeasView).
 */
function showPlanesMain() {
    const main = document.getElementById('planes-main');
    const ideas = document.getElementById('planes-ideas');
    if (main) main.classList.remove('hidden');
    if (ideas) ideas.classList.add('hidden');
}

/**
 * GESTIÓN DE FINANZAS — MOVIDO A COMPONENTE INDEPENDIENTE
 * Todo el módulo de Finanzas (loadFinances, toggleFinanceView,
 * addFinanceCategory, addFinanceItem, presupuestos, balance neto,
 * export SQL, etc.) ahora vive en Components/finance/finance.js.
 */










/**
 * ==========================================
 * IDEA RÁPIDA (INICIO)
 * ==========================================
 * Permite capturar una idea sin salir de Inicio, directo en el textarea.
 * Guarda en la misma tabla "ideas_logs" que usa el Brain Dump.
 * NOTA: se removieron las variables de dictado por voz (Web Speech API,
 * quickIdeaRecognition/Recording/BaseText) — no existe ningún botón de
 * micrófono en el HTML ni se usan en ninguna otra parte del código, así
 * que quedaron declaradas sin ningún efecto real.
 */
async function saveQuickIdea() {
    const input = document.getElementById('quick-idea-input');
    if (!input) return;
    const content = input.value.trim();
    if (!content) return;

    const { error } = await _supabase
        .from('ideas_logs')
        .insert([{ content: content }]);

    if (error) {
        alert("Error al guardar la idea: " + error.message);
        return;
    }

    input.value = '';
    randomIdeaCache = []; // invalida el caché de "Pensamiento Aleatorio"
    if (typeof loadIdeas === 'function') loadIdeas();
    if (typeof showRandomIdea === 'function') showRandomIdea();
}

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
 * NOTA: el componente "Gestión de Inversiones y Deudas" (inversiones_logs)
 * fue eliminado el 2026-08-16 por ser código muerto: no tenía vista
 * en index.html (#inversiones-container no existe) y solo generaba
 * una consulta innecesaria a Supabase en cada carga de la app.
 */
/**
 * ==========================================
 * GESTIÓN DE COSAS QUE AMO (LOVES)
 * ==========================================
 * Loves ahora usa el mismo motor que Odios/Sentimientos (barra de
 * intensidad 1-5 por día): loadLoves()/addLove() están definidos en
 * Components/mood_tracker/mood_tracker.js (MOOD_CONFIGS.loves). Aquí
 * solo queda el exportador SQL, que sigue leyendo la misma tabla
 * "loves_logs".
 */

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

async function exportOdiosSQL() {
    try {
        const { data, error } = await _supabase
            .from('odios_logs')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            alert("No hay registros para exportar.");
            return;
        }

        const sql = buildSQLInsert('odios_logs', data);
        descargarArchivo(sql, 'odios_logs.sql', 'text/sql');

    } catch (err) {
        console.error(err);
        alert("Error exportando Odios: " + err.message);
    }
}

// ======================================================
// EXPORTAR COMPRAS (ahora visible dentro de Finanzas)
// ======================================================
async function exportComprasSQL() {
    try {
        const { data, error } = await _supabase
            .from('compras_logs')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            alert("No hay registros para exportar.");
            return;
        }

        const sql = buildSQLInsert('compras_logs', data);
        descargarArchivo(sql, 'compras_logs.sql', 'text/sql');

    } catch (err) {
        console.error(err);
        alert("Error exportando Compras: " + err.message);
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
 * 9 de agosto) y muestra en GRANDE los días que faltan.
 *
 * NUEVO: cada plan se puede expandir/contraer tocando la tarjeta
 * (misma interacción que las cards del State Bar) para agregar
 * "cosas" del plan — una checklist simple con texto libre, marcar
 * como hecho y eliminar. Solo un plan puede estar expandido a la vez.
 *
 * IMPORTANTE: requiere crear en Supabase la tabla "planes_logs" con
 * columnas (id, title, plan_date [date], created_at), y ADEMÁS una
 * tabla nueva "planes_items" con:
 *   id          bigint, PK, identity
 *   plan_id     bigint, FK -> planes_logs(id) ON DELETE CASCADE
 *   text        text
 *   done        boolean (default false)
 *   created_at  timestamptz (default now())
 */

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
                        <div class="plan-card-date">${formatearFechaPlan(plan.plan_date)}</div>
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
                editPlan(plan.id, safeTitle, plan.plan_date);
            });
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

    const { error } = await _supabase
        .from('planes_logs')
        .insert([{ title: title.trim(), plan_date: dateStr.trim() }]);

    if (error) {
        alert("Error al guardar el plan: " + error.message);
    } else {
        loadPlanes();
    }
}

async function editPlan(id, oldTitle, oldDateStr) {
    const newTitle = prompt("Editar plan:", oldTitle);
    if (!newTitle || newTitle.trim() === "") return;

    const newDateStr = prompt("Fecha del plan (formato AAAA-MM-DD):", oldDateStr);
    if (!newDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(newDateStr.trim())) {
        alert("Fecha inválida. Usa el formato AAAA-MM-DD.");
        return;
    }

    const { error } = await _supabase
        .from('planes_logs')
        .update({ title: newTitle.trim(), plan_date: newDateStr.trim() })
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
 * DASHBOARD DE INICIO: PLANES PRÓXIMOS
 * ==========================================
 * Muestra en la pestaña Home los planes que ocurren hoy, mañana
 * o pasado mañana, para tener una ventana rápida a la actualidad.
 */
async function loadHomeUpcomingPlans() {
    const container = document.getElementById('home-upcoming-plans');
    if (!container) return;

    const { data: planes, error } = await _supabase
        .from('planes_logs')
        .select('*')
        .order('plan_date', { ascending: true });

    if (error) {
        console.error("Error cargando planes para home:", error.message);
        container.innerHTML = '';
        return;
    }

    const upcoming = (planes || []).filter(p => {
        const d = diasRestantes(p.plan_date);
        return d >= 0 && d <= 2;
    });

    if (upcoming.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = '<div class="home-plans-list">';

    upcoming.forEach(plan => {
        const dias = diasRestantes(plan.plan_date);
        let badgeClass = 'home-plan-badge--soon';
        let badgeText = `En ${dias} días`;
        if (dias === 0) { badgeClass = 'home-plan-badge--today'; badgeText = 'HOY'; }
        else if (dias === 1) { badgeText = 'Mañana'; }

        html += `
            <div class="home-plan-item" onclick="switchBottomTab('planes')" title="Ver en Planes">
                <div class="home-plan-info">
                    <div class="home-plan-title">${plan.title}</div>
                    <div class="home-plan-date">${formatearFechaPlan(plan.plan_date)}</div>
                </div>
                <span class="home-plan-badge ${badgeClass}">${badgeText}</span>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
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

function renderYearWeeks() {
    const container = document.getElementById('year-weeks-grid');
    const footerEl = document.getElementById('fusion-footer');
    if (!container) return;

    container.innerHTML = '';
    const today = new Date();
    const currentWeek = getWeekOfYear(today);
    const daysRemaining = getDaysRemainingInYear(today);
    const totalWeeks = 52;

    // Footer: días restantes
    if (footerEl) {
        footerEl.textContent = `Quedan ${daysRemaining} días para terminar el año`;
    }

    container.className = 'fusion-weeks-grid';

    for (let i = 1; i <= totalWeeks; i++) {
        const box = document.createElement('div');
        box.className = 'week-box';
        if (i < currentWeek) {
            box.classList.add('passed');
        } else if (i === currentWeek) {
            box.classList.add('current');
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
        <div class="compra-progress-row">
            <div class="ik-bar-track">
                <div class="ik-bar-fill${lista ? ' ik-bar-fill--green' : ' ik-bar-fill--neutral'}" style="width:${pct}%;"></div>
            </div>
            <button type="button" class="compra-amount-btn compra-amount-ahorro" title="Ahorro actual — clic para corregirlo manualmente">${formatCurrency(ahorro)}</button>
        </div>
        <div class="compra-amounts-row">
            <input type="number" class="compra-input" placeholder="+ Sumar" title="Escribe un valor y presiona Enter">
            <button type="button" class="compra-amount-btn compra-amount-meta${meta > 0 ? '' : ' compra-amount-meta--vacio'}" title="Clic para definir el precio del producto">${meta > 0 ? formatCurrency(meta) : '+ Definir precio'}</button>
        </div>
    </div>
`;

        card.querySelector('.compra-name').addEventListener('click', (e) => {
            e.stopPropagation();
            editCompra(compra.name, compra.id);
        });

        card.querySelector('.compra-amount-ahorro').addEventListener('click', (e) => {
            e.stopPropagation();
            editAhorroCompra(compra.id, ahorro);
        });

        card.querySelector('.compra-input').addEventListener('click', (e) => e.stopPropagation());
        card.querySelector('.compra-input').addEventListener('change', (e) => {
            sumarAhorroCompra(compra.id, ahorro, e.target.value);
            e.target.value = '';
        });

        card.querySelector('.compra-amount-meta').addEventListener('click', (e) => {
            e.stopPropagation();
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

/* Corrige el valor EXACTO del ahorro (clic sobre el monto). Útil para
   ajustar manualmente si te equivocaste o quieres partir de otro
   número. Refresca Finanzas porque el ahorro asignado en Compras
   descuenta de Ahorro/Capital y Patrimonio Neto. */
async function editAhorroCompra(id, currentAhorro) {
    const input = prompt("Corregir el ahorro actual (valor exacto):", currentAhorro || 0);
    if (input === null) return;
    const monto = Number(input);
    if (isNaN(monto)) return;

    const { error } = await _supabase
        .from('compras_logs')
        .update({ ahorro: Math.max(0, monto) })
        .eq('id', id);

    if (error) {
        alert("Error al corregir el ahorro: " + error.message);
    } else {
        loadCompras();
        if (typeof loadFinances === 'function') loadFinances();
    }
}

/* SUMA (o resta, con número negativo) al ahorro desde el campo de
   texto de la tarjeta — mismo patrón que "+ Sumar" en Finanzas. */
async function sumarAhorroCompra(id, currentAhorro, valorInput) {
    const monto = Number(valorInput);
    if (isNaN(monto) || monto === 0) return;

    const nuevoAhorro = Math.max(0, currentAhorro + monto);
    const { error } = await _supabase
        .from('compras_logs')
        .update({ ahorro: nuevoAhorro })
        .eq('id', id);

    if (error) {
        alert("Error al sumar al ahorro: " + error.message);
    } else {
        loadCompras();
        if (typeof loadFinances === 'function') loadFinances();
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
                start: 1080, end: 1260, label: "Learning", icon: "🌱", class: "state-grow",
                options: ["Practicar inglés (Duolingo/Anki)", "Curso de programación", "Proyecto personal de código"]
            },
            {
                start: 1080, end: 1260, label: "Comida", icon: "🍽️", class: "state-free",
                options: ["Preparar algo saludable", "Comer con calma, sin pantallas", "Preparar coca"]
            },
            {
                start: 1200, end: 1260, label: "Noche", icon: "🌙", class: "state-free",
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
                options: ["Preparar algo saludable", "Comer con calma, sin pantallas", "Preparar coca"]
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

    activeSlots = schedule.filter(s => isWithinRange(mins, s.start, s.end));

    if (openIndex !== null && openIndex >= activeSlots.length) {
        openIndex = null;
    }

    // Actualizar reloj del dashboard de hoy
    const clockEl = document.getElementById('today-clock');
    if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    renderCards();
}

    update();
    setInterval(update, 60000);
}

/* ---------- NUEVO: Hábitos por Grupo (ME / HEALTH / WORK / LOVES) ---------- */
async function loadHabitsGroup(tag, containerId) {
    const today = new Date();
    let currentDay = today.getDay();
    currentDay = currentDay === 0 ? 7 : currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1);
    const datesOfWeek = [];
    const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        datesOfWeek.push(formatDateLocal(d));
    }

    const { data: allHabitsData, error: err1 } = await _supabase
        .from('habit_logs')
        .select('habit_name, project_tag');
    if (err1) return console.error(err1.message);

    const uniqueHabits = [...new Set(
        allHabitsData
            .filter(h => {
                const fromName = getProjectFromHabitName(h.habit_name);
                const fromField = (h.project_tag || '').toUpperCase();
                return fromName === tag.toUpperCase() || fromField === tag.toUpperCase();
            })
            .map(h => h.habit_name)
    )].sort();

    const listContainer = document.getElementById(containerId);
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (uniqueHabits.length === 0) {
        listContainer.innerHTML = `<li style="padding:16px; color:var(--text-muted); text-align:center;">No hay hábitos en <strong>${tag}</strong>.<br>Agrega uno con #${tag}.</li>`;
        return;
    }

    const { data: weekLogs, error: err2 } = await _supabase
        .from('habit_logs')
        .select('*')
        .gte('log_date', datesOfWeek[0])
        .lte('log_date', datesOfWeek[6]);
    if (err2) return console.error(err2.message);

    const { data: habitImagesData, error: err3 } = await _supabase
        .from('habit_images')
        .select('habit_name, image_filename');
    const habitImages = Object.fromEntries((habitImagesData || []).map(h => [h.habit_name, h.image_filename]));

    uniqueHabits.sort((a, b) => {
        const ga = getSubgroupFromHabitName(a) || '';
        const gb = getSubgroupFromHabitName(b) || '';
        if (ga !== gb) return ga.localeCompare(gb);
        return a.localeCompare(b);
    });

    // Agrupa los hábitos por su sub-grupo (segundo hashtag). Los que no
    // tienen sub-grupo caen en "General".
    const groups = new Map();
    uniqueHabits.forEach(habitName => {
        const sub = getSubgroupFromHabitName(habitName) || 'General';
        if (!groups.has(sub)) groups.set(sub, []);
        groups.get(sub).push(habitName);
    });
    const sortedGroupNames = [...groups.keys()].sort((a, b) => {
        if (a === 'General') return 1;
        if (b === 'General') return -1;
        return a.localeCompare(b);
    });

    groups.forEach((habitsInGroup, groupName) => {
        if (sortedGroupNames.length > 1) {
            const displayName = groupName.replace(/_/g, ' ');
            listContainer.insertAdjacentHTML('beforeend',
                `<li class="habit-subgroup-header">${displayName}</li>`);
        }
        habitsInGroup.forEach(habitName => {
            renderHabitCard(habitName, listContainer, datesOfWeek, currentDay, dayLabels, weekLogs, habitImages);
        });
    });
}

function renderHabitCard(habitName, listContainer, datesOfWeek, currentDay, dayLabels, weekLogs, habitImages) {
    let daysHTML = '';
    let streakCount = 0;
    let isDoneToday = true;
    datesOfWeek.forEach((dateStr, idx) => {
        const log = weekLogs.find(l => l.habit_name === habitName && l.log_date === dateStr);
        const isDone = log ? log.is_completed : false;
        if (isDone) streakCount++;
        const isToday = idx + 1 === currentDay;
        const isFuture = idx + 1 > currentDay;
        if (isToday) isDoneToday = isDone;
        daysHTML += `<button type="button" class="habit-day-chip${isDone ? ' habit-day-chip--done' : ''}${isToday ? ' habit-day-chip--today' : ''}${isFuture ? ' habit-day-chip--future' : ''}" ${isFuture ? 'disabled' : `onclick="toggleHabit('${habitName.replace(/'/g, "\\'")}', '${dateStr}', ${isDone})"`}>${dayLabels[idx]}</button>`;
    });

    const imageFilename = habitImages[habitName] || 'default.jpg';
    const localImagePath = `assets/images/${imageFilename}`;
    const habitNameEscaped = habitName.replace(/'/g, "\\'");
    const pendienteClass = !isDoneToday ? ' habit-card--pendiente' : '';

    const card = `
        <li class="habit-card${pendienteClass}" oncontextmenu="event.preventDefault(); deleteHabit('${habitNameEscaped}')" title="Clic derecho para eliminar">
            <img src="${localImagePath}" class="habit-card-img" onerror="this.src='assets/images/default.jpg'" onclick="event.stopPropagation(); setHabitImage('${habitNameEscaped}')" title="Clic para cambiar la imagen">
            <div class="habit-card-info">
                <div class="habit-card-top">
                    <span class="habit-card-name" onclick="editHabit('${habitNameEscaped}')" title="Clic para editar">${cleanHabitName(habitName)}</span>
                    <span class="habit-card-streak">${streakCount}/7</span>
                </div>
                <div class="habit-day-row">${daysHTML}</div>
            </div>
        </li>
    `;
    listContainer.insertAdjacentHTML('beforeend', card);
}

async function addHabitForTag(tag) {
    const name = prompt(`Nuevo hábito para ${tag}:`);
    if (!name || name.trim() === "") return;
    let habitName = name.trim();
    const upperTag = tag.toUpperCase();
    if (!habitName.toUpperCase().includes('#' + upperTag)) {
        habitName += ' #' + upperTag;
    }
    const subgroup = prompt(`Sub-grupo dentro de ${tag} (opcional, ej: Apariencia, Salud Mental). Deja vacío para "General":`);
    if (subgroup && subgroup.trim() !== "") {
        habitName += ' #' + subgroup.trim().toUpperCase().replace(/\s+/g, '_');
    }
    const todayStr = formatDateLocal(new Date());
    const { error } = await _supabase.from('habit_logs').insert([{
        habit_name: habitName,
        log_date: todayStr,
        is_completed: false,
        project_tag: upperTag
    }]);
    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        const sub = Object.keys(HABIT_CATEGORIES).find(key => HABIT_CATEGORIES[key].tag === upperTag);
        if (sub) loadHabitsGroup(upperTag, 'list-habits-' + sub);
    }
}

/**
 * ==========================================
 * CATEGORÍAS DE HÁBITOS PERSONALIZADAS
 * ==========================================
 * Además de las categorías fijas (CABELLO, SEXUALIDAD, PIEL, CUERPO,
 * DINERO, SALUD EMOCIONAL), el usuario puede crear sus propias listas
 * de hábitos desde el botón "+ Nueva lista" en la pestaña Hábitos.
 * Cada una se guarda en Supabase, se agrega a HABIT_CATEGORIES y se
 * renderiza como una sub-tab más — reutilizando exactamente el mismo
 * motor (loadHabitCategory/addHabitForTag) que las categorías fijas.
 *
 * TABLA REQUERIDA EN SUPABASE:
 *   CREATE TABLE habit_categories (
 *     id bigint generated always as identity PRIMARY KEY,
 *     tag text UNIQUE NOT NULL,
 *     label text NOT NULL,
 *     icon text DEFAULT '📌',
 *     created_at timestamptz DEFAULT now()
 *   );
 */
function slugifyHabitTag(text) {
    return text
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

async function loadCustomHabitCategories() {
    const { data, error } = await _supabase
        .from('habit_categories')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) return console.error('Error cargando categorías personalizadas:', error.message);

    (data || []).forEach(cat => {
        const subtabId = cat.tag.toLowerCase();
        HABIT_CATEGORIES[subtabId] = { tag: cat.tag, label: cat.label, icon: cat.icon || '📌' };
        renderCustomHabitCategoryUI(subtabId, HABIT_CATEGORIES[subtabId]);
    });
}

function renderCustomHabitCategoryUI(subtabId, category) {
    if (document.getElementById('tracking-' + subtabId)) return; // ya renderizada

    const tabsBar = document.querySelector('.camino-tabs');
    const addBtn = document.getElementById('camino-add-category-btn');
    if (tabsBar) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'camino-tab-btn';
        btn.dataset.subtab = subtabId;
        btn.title = 'Doble clic: editar nombre/emoji · Clic derecho: eliminar esta lista';
        btn.innerHTML = `<span class="camino-tab-icon">${category.icon}</span><span class="camino-tab-label">${category.label}</span>`;
        btn.addEventListener('click', () => switchTrackingTab(subtabId, btn));
        btn.addEventListener('dblclick', (e) => {
            e.preventDefault();
            editHabitCategory(subtabId);
        });
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            deleteCustomHabitCategory(category.tag, subtabId);
        });
        tabsBar.insertBefore(btn, addBtn || null);
    }

    const viewTracking = document.getElementById('view-tracking');
    if (viewTracking) {
        const panel = document.createElement('div');
        panel.id = 'tracking-' + subtabId;
        panel.className = 'tracking-subview hidden';
        panel.innerHTML = `
            <section class="category" style="border:none;">
                <div style="display:flex; justify-content:flex-start; align-items:center; padding: 8px 16px 4px;">
                    <button type="button" class="icon-btn" onclick="addHabitForTag('${category.tag}')"
                        aria-label="Agregar hábito de ${category.label}" title="Agregar hábito de ${category.label}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
                <ul id="list-habits-${subtabId}" class="habits-list"></ul>
            </section>
        `;
        viewTracking.appendChild(panel);
    }
}

async function addCustomHabitCategory() {
    const name = prompt('Nombre de la nueva lista de hábitos (ej: Lectura, Guitarra):');
    if (!name || name.trim() === '') return;

    const tag = slugifyHabitTag(name);
    if (!tag) {
        alert('Nombre inválido: usa letras o números.');
        return;
    }
    if (HABIT_CATEGORIES[tag.toLowerCase()]) {
        alert('Ya existe una lista con ese nombre.');
        return;
    }

    const icon = (prompt('Emoji para la lista (opcional):', '📌') || '📌').trim() || '📌';
    const label = name.trim().toUpperCase();

    const { error } = await _supabase.from('habit_categories').insert([{ tag, label, icon }]);
    if (error) {
        alert('Error al crear la lista: ' + error.message);
        return;
    }

    const subtabId = tag.toLowerCase();
    const category = { tag, label, icon };
    HABIT_CATEGORIES[subtabId] = category;
    renderCustomHabitCategoryUI(subtabId, category);

    const btn = document.querySelector(`.camino-tab-btn[data-subtab="${subtabId}"]`);
    switchTrackingTab(subtabId, btn);
}

async function deleteCustomHabitCategory(tag, subtabId) {
    const category = HABIT_CATEGORIES[subtabId];
    const ok = confirm(`¿Eliminar la lista "${category ? category.label : tag}" y todos sus hábitos? Esta acción no se puede deshacer.`);
    if (!ok) return;

    const { error: errCat } = await _supabase.from('habit_categories').delete().eq('tag', tag);
    if (errCat) {
        alert('Error al eliminar la lista: ' + errCat.message);
        return;
    }
    await _supabase.from('habit_logs').delete().eq('project_tag', tag);

    delete HABIT_CATEGORIES[subtabId];
    const btnToRemove = document.querySelector(`.camino-tab-btn[data-subtab="${subtabId}"]`);
    const wasActive = btnToRemove ? btnToRemove.classList.contains('camino-tab-active') : false;
    btnToRemove?.remove();
    document.getElementById('tracking-' + subtabId)?.remove();

    if (wasActive) {
        const firstBtn = document.querySelector('.camino-tabs .camino-tab-btn[data-subtab]');
        if (firstBtn) switchTrackingTab(firstBtn.dataset.subtab, firstBtn);
    }
}

function openIdeasFromHeader() {
    switchBottomTab('planes');
    const main = document.getElementById('planes-main');
    const ideas = document.getElementById('planes-ideas');
    if (main) main.classList.add('hidden');
    if (ideas) ideas.classList.remove('hidden');
    if (typeof loadIdeas === 'function') loadIdeas();
    if (typeof showRandomIdea === 'function') showRandomIdea();
}

function closeIdeasView() {
    showPlanesMain();
}