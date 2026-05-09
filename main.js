const SUPABASE_URL = "https://pgawswfurouzstkapwby.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnYXdzd2Z1cm91enN0a2Fwd2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Nzg0NzEsImV4cCI6MjA5MDU1NDQ3MX0.KciMvGBygkY2lTDtUIE_zztaODNX3XuWb_sEnpzkMHw";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

    const weekNumber = Math.ceil(today.getDate() / 7);
    const weekElement = document.getElementById('current-week-text');
    if (weekElement) {
        weekElement.textContent = `Avance Semana ${weekNumber}`;
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
                    ${habitName}
                </div>
                ${circlesHTML}
            </li>
        `;
        listContainer.insertAdjacentHTML('beforeend', row);
    });
}

async function addHabit() {
    const name = prompt("Crea un nuevo hábito:");
    if (!name || name.trim() === "") return;

    const habitName = name.trim();
    const todayStr = formatDateLocal(new Date());

    const { data, error } = await _supabase
        .from('habit_logs')
        .insert([{ habit_name: habitName, log_date: todayStr, is_completed: false }])
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
        const { error: insertError } = await _supabase
            .from('habit_logs')
            .insert([{ 
                habit_name: habitName, 
                log_date: dateStr, 
                is_completed: !currentState 
            }]);
            
        if (insertError) console.error("Error insertando:", insertError.message);
    }
    
    loadHabits();
    if (typeof loadMetrics === 'function') loadMetrics(); 
}

async function editHabit(oldName) {
    const newName = prompt("Editar nombre (afectará a todo su historial):", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;

    const { error } = await _supabase
        .from('habit_logs')
        .update({ habit_name: newName.trim() })
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

    const views = ['view-habits', 'view-metrics', 'view-tareas', 'view-money', 'view-ideas', 'view-loves'];
    views.forEach(v => {
        const viewEl = document.getElementById(v);
        if (viewEl) viewEl.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${tab}`);
    if (targetView) targetView.classList.add('active');
}

function switchMetricsSubTab(tab, btn) {
    const container = btn.closest('.sub-tabs-container');
    container.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.getElementById('subview-metrics-stats').classList.add('hidden');
    document.getElementById('subview-metrics-bloques').classList.add('hidden');
    
    document.getElementById(`subview-metrics-${tab}`).classList.remove('hidden');
}

function switchLovesSubTab(tab, btn) {
    const container = btn.closest('.sub-tabs-container');
    container.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.getElementById('subview-loves-agradecimientos').classList.add('hidden');
    document.getElementById('subview-loves-escuelas').classList.add('hidden');
    document.getElementById('subview-loves-pasiones').classList.add('hidden');
    
    document.getElementById(`subview-loves-${tab}`).classList.remove('hidden');
}

function switchTareasSubTab(tab, btn) {
    const container = btn.closest('.sub-tabs-container');
    if(container) {
        container.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
}

function switchFinanceSubTab(tab, btn) {
    const container = btn.closest('.finance-sub-tabs');
    container.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.getElementById('subview-finanzas').classList.add('hidden');
    document.getElementById('subview-compras').classList.add('hidden');
    document.getElementById('subview-inversiones').classList.add('hidden');
    
    document.getElementById(`subview-${tab}`).classList.remove('hidden');
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
 * PARSER DE ETIQUETAS (INSIGHT MINING)
 * ==========================================
 */
/**
 * Detecta categorías automáticamente basándose en palabras clave
 * sin necesidad de escribir hashtags.
 */
function parseContentAndTags(rawText) {
    const textLower = rawText.toLowerCase();
    const tags = new Set(); // Usamos Set para evitar etiquetas duplicadas

    // Define aquí tus reglas: "palabra clave": "Categoría"
    const reglas = {
        // Desarrollo y Tecnología
        "ikilife": "desarrollo",
        "app": "desarrollo",
        "tecnología": "desarrollo",
        "automatizar": "desarrollo",
        "supabase": "desarrollo",
        "spring": "desarrollo",

        // Aprendizaje
        "inglés": "aprendizaje",
        "estudiar": "aprendizaje",
        "aprender": "aprendizaje",
        "podcast": "aprendizaje",
        "libro": "aprendizaje",
        "kindle": "aprendizaje",
        "chatgpt": "aprendizaje",

        // Salud Mental y Emocional
        "ansiedad": "salud-mental",
        "terapia": "salud-mental",
        "dopamina": "salud-mental",
        "emociones": "salud-mental",
        "mente": "salud-mental",
        "miedo": "salud-mental",
        "soledad": "salud-mental",

        // Relaciones y Social
        "elisa": "relaciones",
        "mujer": "relaciones",
        "chica": "relaciones",
        "amigos": "relaciones",
        "personas": "relaciones",

        // Familia
        "papá": "familia",
        "mamá": "familia",
        "tía": "familia",

        // Trabajo y Profesional
        "mesa de ayuda": "profesional",
        "trabajo": "profesional",
        "empresa": "profesional",
        "compañeros": "profesional",

        // Finanzas
        "dinero": "finanzas",
        "finanzas": "finanzas",
        "plata": "finanzas",
        "comprar": "finanzas",
        "promociones": "finanzas",

        // Movilidad
        "moto": "transporte",
        "casco": "transporte",
        "transporte": "transporte",

        // Estilo de Vida y Hábitos
        "ropa": "estilo",
        "moda": "estilo",
        "gorras": "estilo",
        "naturaleza": "estilo-de-vida",
        "entrenamiento": "salud-física",
        "gimnasio": "salud-física",
        "café": "hábitos",
        "celular": "hábitos"
    };

    // 1. Automatización por palabras clave
    for (const [palabra, categoria] of Object.entries(reglas)) {
        if (textLower.includes(palabra)) {
            tags.add(categoria);
        }
    }

    // 2. Mantener soporte para hashtags manuales por si acaso
    const tagRegex = /#(\w+)/g;
    let match;
    while ((match = tagRegex.exec(rawText)) !== null) {
        tags.add(match[1].toLowerCase());
    }

    // Limpiar el texto de hashtags manuales para la base de datos
    const cleanContent = rawText.replace(tagRegex, '').trim();

    return { 
        content: cleanContent, 
        tags: Array.from(tags) 
    };
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
 * GESTIÓN DE AGRADECIMIENTOS Y SÍNDROME DEL IMPOSTOR
 * ==========================================
 */
async function loadAgradecimientos() {
    const { data: agradecimientos, error } = await _supabase
        .from('ideas_logs')
        .select('*')
        .eq('type', 'agradecimiento')
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) return console.error("Error cargando agradecimientos:", error.message);

    const listContainer = document.getElementById('list-agradecimientos');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    agradecimientos.forEach(item => {
        const dateObj = new Date(item.created_at);
        const dateString = dateObj.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
        const timeString = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

        const row = `
            <li class="idea-row">
                <div class="idea-content"
                     onclick="editAgradecimiento(${item.id}, '${item.content.replace(/'/g, "\\'")}')"
                     oncontextmenu="event.preventDefault(); deleteAgradecimiento(${item.id})"
                     title="Clic: Editar | Clic Derecho: Eliminar">
                    ${item.content}
                </div>
                <div class="idea-date">${dateString} - ${timeString}</div>
            </li>
        `;
        listContainer.insertAdjacentHTML('beforeend', row);
    });
}

async function addAgradecimiento() {
    const rawInput = prompt("Anota algo positivo (usa #etiquetas para categorizar):");
    if (!rawInput || rawInput.trim() === "") return;

    const { content, tags } = parseContentAndTags(rawInput);

    const { error } = await _supabase
        .from('ideas_logs')
        .insert([{ content: content, type: 'agradecimiento', tags: tags }]);

    if (error) alert("Error al guardar: " + error.message);
    else loadAgradecimientos();
}

async function editAgradecimiento(id, oldContent) {
    const newContent = prompt("Editar agradecimiento:", oldContent);
    if (!newContent || newContent.trim() === "" || newContent === oldContent) return;

    const { error } = await _supabase
        .from('ideas_logs')
        .update({ content: newContent.trim() })
        .eq('id', id);

    if (error) alert("Error al editar: " + error.message);
    else loadAgradecimientos();
}

async function deleteAgradecimiento(id) {
    if (!confirm("¿Deseas eliminar este agradecimiento?")) return;

    const { error } = await _supabase
        .from('ideas_logs')
        .delete()
        .eq('id', id);

    if (error) alert("Error al eliminar: " + error.message);
    else loadAgradecimientos();
}

// Función para extraer una victoria aleatoria (Puedes vincularla a un botón en tu HTML más adelante)
async function showRandomVictory() {
    const { data, error } = await _supabase
        .from('ideas_logs')
        .select('content, created_at, tags')
        .eq('type', 'agradecimiento');

    if (error || !data || data.length === 0) {
        alert("Aún no hay victorias o agradecimientos registrados para mostrar.");
        return;
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    const victory = data[randomIndex];
    const dateStr = new Date(victory.created_at).toLocaleDateString('es-CO');
    const tagsStr = victory.tags && victory.tags.length > 0 ? victory.tags.join(', ') : 'Sin etiquetas';
    
    alert(`🔥 Evidencia contra el Impostor:\n\n"${victory.content}"\n\n📅 Fecha: ${dateStr}\n🏷️ Etiquetas: ${tagsStr}`);
}

/**
 * ==========================================
 * GESTIÓN DE TAREAS (Única Lista)
 * ==========================================
 */
async function loadTareas() {
    const { data: tareas, error } = await _supabase.from('tareas_logs').select('*').order('id', { ascending: true });
    if (error) return console.error("Error cargando tareas:", error.message);

    const listDia = document.getElementById('list-tareas-dia');
    if (listDia) listDia.innerHTML = '';

    tareas.forEach(tarea => {
        const row = `
            <li class="tarea-row">
                <div class="tarea-content">${tarea.name}</div>
                <button class="delete-btn" onclick="deleteTarea(${tarea.id})" aria-label="Completar" title="Completar tarea">
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

async function deleteTarea(id) {
    const { error } = await _supabase.from('tareas_logs').delete().eq('id', id);
    if (error) console.error("Error al eliminar tarea:", error.message);
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
    for(let i = 1; i <= numCuotas; i++) {
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
    if(!confirm("¿Eliminar esta cuota?")) return;
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
 * GESTIÓN DE COSAS QUE AMO
 * ==========================================
 */
async function loadLoves() {
    const { data: loves, error } = await _supabase
        .from('loves_logs')
        .select('*')
        .order('count', { ascending: false });

    if (error) {
        console.error("Error cargando pasiones:", error.message);
        return;
    }

    const listContainer = document.getElementById('list-loves');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    loves.forEach(love => {
        const currentCount = love.count || 0;

        const row = `
            <li class="love-row">
                <div class="love-content"
                     onclick="editLove('${love.name}', ${love.id})"
                     oncontextmenu="event.preventDefault(); deleteLove('${love.name}', ${love.id})"
                     style="cursor: pointer;"
                     title="Clic: Editar | Clic Derecho: Eliminar">
                    ${love.name}
                </div>
                <button class="love-counter-btn" onclick="incrementLove(${love.id}, ${currentCount})" title="Sumar +1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    ${currentCount}
                </button>
            </li>
        `;
        listContainer.insertAdjacentHTML('beforeend', row);
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
 * GESTIÓN DE MÉTRICAS (CHART.JS - MINIMALISTA)
 * ==========================================
 */
let chartInstance = null;

async function loadMetrics() {
    const { data: allHabitsData, error: errHabits } = await _supabase.from('habit_logs').select('habit_name');
    if (errHabits) return console.error("Error obteniendo hábitos:", errHabits.message);
    const uniqueHabits = [...new Set(allHabitsData.map(h => h.habit_name))];
    const totalHabits = uniqueHabits.length > 0 ? uniqueHabits.length : 1;

    const { data: logs, error } = await _supabase
        .from('habit_logs')
        .select('*')
        .order('log_date', { ascending: true });

    if (error) return console.error("Error cargando métricas:", error.message);

    const todayStr = formatDateLocal(new Date());
    const dateStats = {};

    logs.forEach(log => {
        if (log.log_date > todayStr) return;

        if (!dateStats[log.log_date]) {
            dateStats[log.log_date] = { completed: 0 };
        }
        if (log.is_completed) {
            dateStats[log.log_date].completed += 1;
        }
    });

    const allLabels = Object.keys(dateStats).sort();
    const recentLabels = allLabels.slice(-7); 

    let sumPct = 0;
    let bestDayDate = "--";
    let bestDayPct = -1;

    const dataPoints = recentLabels.map(date => {
        const stat = dateStats[date];
        const pct = Math.round((stat.completed / totalHabits) * 100);

        sumPct += pct;
        if (pct > bestDayPct) {
            bestDayPct = pct;
            bestDayDate = date;
        }
        return pct;
    });

    const avgPct = recentLabels.length > 0 ? Math.round(sumPct / recentLabels.length) : 0;
    document.getElementById('kpi-avg').textContent = `${avgPct}%`;

    if (bestDayDate !== "--") {
        const dObj = new Date(bestDayDate + 'T00:00:00');
        const weekDayName = dObj.toLocaleDateString('es-CO', { weekday: 'long' });
        const dayNum = dObj.getDate();
        document.getElementById('kpi-best').textContent = weekDayName.charAt(0).toUpperCase() + weekDayName.slice(1) + ' ' + dayNum;
    }

    renderChart(recentLabels, dataPoints);
    renderMinimalList(recentLabels, dateStats, totalHabits);
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
 * Exportar TODO el historial de hábitos a CSV
 */
async function exportAllHistoryCSV() {
    const { data: allLogs, error } = await _supabase
        .from('habit_logs')
        .select('*')
        .order('log_date', { ascending: true });

    if (error) return alert("Error al conectar con la base de datos.");
    if (!allLogs || allLogs.length === 0) return alert("No hay datos históricos para exportar.");

    const uniqueHabits = [...new Set(allLogs.map(l => l.habit_name))].sort();

    const firstDateStr = allLogs[0].log_date;
    const firstDate = new Date(firstDateStr + 'T00:00:00'); 
    const today = new Date();
    
    const allDates = [];
    let currentDate = new Date(firstDate);
    
    while (currentDate <= today) {
        allDates.push(formatDateLocal(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    let csvContent = "\uFEFF"; 
    csvContent += "Hábito," + allDates.join(",") + ",Total Histórico\n";

    uniqueHabits.forEach(habitName => {
        let row = `"${habitName}"`;
        let totalCompletados = 0;

        allDates.forEach(dateStr => {
            const log = allLogs.find(l => l.habit_name === habitName && l.log_date === dateStr);
            const isDone = log ? log.is_completed : false;
            
            if (isDone) totalCompletados++;
            
            row += isDone ? ",Sí" : ",No"; 
        });
        
        row += `,${totalCompletados}`;
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `IKILIFE_Historial_Completo.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Exportar Hábitos de la Semana Actual a CSV
 */
async function exportHabitsCSV() {
    const today = new Date();
    let currentDay = today.getDay();
    currentDay = currentDay === 0 ? 7 : currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1);

    const datesOfWeek = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        datesOfWeek.push(formatDateLocal(d));
    }

    const { data: allHabitsData, error: err1 } = await _supabase.from('habit_logs').select('habit_name');
    if (err1) return alert("Error al obtener datos para exportar.");
    const uniqueHabits = [...new Set(allHabitsData.map(h => h.habit_name))].sort();

    const { data: weekLogs, error: err2 } = await _supabase
        .from('habit_logs')
        .select('*')
        .gte('log_date', datesOfWeek[0])
        .lte('log_date', datesOfWeek[6]);

    if (err2) return alert("Error al obtener registros de la semana.");

    let csvContent = "\uFEFF"; 
    csvContent += "Hábito," + datesOfWeek.join(",") + ",Total Completados\n";

    uniqueHabits.forEach(habitName => {
        let row = `"${habitName}"`;
        let totalCompletados = 0;

        datesOfWeek.forEach(dateStr => {
            const log = weekLogs.find(l => l.habit_name === habitName && l.log_date === dateStr);
            const isDone = log ? log.is_completed : false;

            if (isDone) totalCompletados++;

            row += isDone ? ",Sí" : ",No";
        });

        row += `,${totalCompletados}`;
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `IKILIFE_Habitos_${datesOfWeek[0]}_al_${datesOfWeek[6]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    document.getElementById('kpi-ingresos').textContent = formatCurrency(totalIngresosReal);
    if(document.getElementById('kpi-ingresos-detail')) document.getElementById('kpi-ingresos-detail').textContent = formatCurrency(totalIngresosReal);
    document.getElementById('kpi-gastos').textContent = formatCurrency(totalGastosReal);
    document.getElementById('kpi-ahorro').textContent = formatCurrency(totalAhorro);
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
 * GESTIÓN DE COMPRAS (VOTACIONES)
 * ==========================================
 */
async function loadCompras() {
    const { data: compras, error } = await _supabase.from('compras_logs').select('*').order('votes', { ascending: false });
    if (error) return console.error("Error cargando compras:", error.message);

    const listContainer = document.getElementById('list-compras');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    compras.forEach(compra => {
        const row = `
            <li class="love-row">
                <div class="love-content"
                     onclick="editCompra('${compra.name}', ${compra.id})"
                     oncontextmenu="event.preventDefault(); deleteCompra('${compra.name}', ${compra.id})"
                     style="cursor: pointer;" title="Clic: Editar | Clic Derecho: Eliminar">
                    ${compra.name}
                </div>
                <button class="love-counter-btn" onclick="incrementCompra(${compra.id}, ${compra.votes})" title="Sumar Prioridad" style="color: var(--primary-green); border-color: var(--primary-green);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                    ${compra.votes}
                </button>
            </li>
        `;
        listContainer.insertAdjacentHTML('beforeend', row);
    });
}

async function addCompra() {
    const name = prompt("Elemento que deseas comprar:");
    if (!name || name.trim() === "") return;
    const { error } = await _supabase.from('compras_logs').insert([{ name: name.trim(), votes: 0 }]);
    if (error) alert("Error: " + error.message);
    else loadCompras();
}

async function incrementCompra(id, currentVotes) {
    const { error } = await _supabase.from('compras_logs').update({ votes: currentVotes + 1 }).eq('id', id);
    if (!error) loadCompras();
}

async function editCompra(oldName, id) {
    const newName = prompt("Editar nombre:", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;
    const { error } = await _supabase.from('compras_logs').update({ name: newName.trim() }).eq('id', id);
    if (!error) loadCompras();
}

async function deleteCompra(name, id) {
    if (!confirm(`¿Deseas eliminar "${name}" de tu lista?`)) return;
    const { error } = await _supabase.from('compras_logs').delete().eq('id', id);
    if (!error) loadCompras();
}

/**
 * ==========================================
 * INICIALIZACIÓN
 * ==========================================
 */
document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    updateWeeklyProgress();
    loadHabits();
    loadEscuelas();
    loadIdeas();
    loadTareas();
    loadInversiones();
    loadLoves();
    loadBloques();
    loadMetrics();
    loadFinances();
    loadCompras();
    loadAgradecimientos();

    _supabase.channel('habit-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'habit_logs' }, () => loadHabits())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'habit_logs' }, () => loadHabits())
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'habit_logs' }, () => loadHabits())
        .subscribe();
});