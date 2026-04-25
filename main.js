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

    // Guardar preferencia en localStorage
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    // Actualizar visibilidad de los iconos
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

    // Asignar fecha completa
    const dateElement = document.getElementById('current-month-text');
    if (dateElement) {
        const fullDate = new Intl.DateTimeFormat('es-CO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(today);
        dateElement.textContent = fullDate;
    }

    // Calcular semana del mes actual
    const weekNumber = Math.ceil(today.getDate() / 7);
    const weekElement = document.getElementById('current-week-text');
    if (weekElement) {
        weekElement.textContent = `Avance Semana ${weekNumber}`;
    }

    // Identificar día actual (Ajustando ISO: Lunes = 1, Domingo = 7)
    let currentDay = today.getDay();
    currentDay = currentDay === 0 ? 7 : currentDay;

    // Inyectar las fechas de la semana en la cabecera (01, 02...)
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1);

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        // Formatea el número a dos dígitos (ej. 1 -> 01)
        const dayString = String(dayDate.getDate()).padStart(2, '0');

        // Aplica el número al elemento HTML correspondiente
        const labelEl = document.getElementById(`day-label-${i + 1}`);
        if (labelEl) {
            labelEl.textContent = dayString;
        }
    }

    // Actualizar barra de progreso visual (Con inyección directa de estilos)
    const segments = document.querySelectorAll('.day-segment');
    segments.forEach((segment, index) => {
        const segmentDay = index + 1;
        segment.classList.remove('past', 'today', 'future');

        if (segmentDay <= currentDay) {
            // Días transcurridos y el actual en verde
            segment.classList.add(segmentDay === currentDay ? 'today' : 'past');
            segment.style.backgroundColor = 'var(--primary-green)';
            segment.style.opacity = '1';
        } else {
            // Días futuros en gris
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

// Utilidad para obtener formato de fecha local correcto (YYYY-MM-DD) sin desfase de zona horaria
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function loadHabits() {
    const today = new Date();
    let currentDay = today.getDay();
    currentDay = currentDay === 0 ? 7 : currentDay;

    // Calcular el Lunes de la semana actual
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1);

    // Generar el array con las 7 fechas de esta semana
    const datesOfWeek = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        datesOfWeek.push(formatDateLocal(d));
    }

    // 1. Obtener la lista completa de hábitos existentes para mostrarlos todos en la vista
    const { data: allHabitsData, error: err1 } = await _supabase.from('habit_logs').select('habit_name');
    if (err1) return console.error("Error obteniendo nombres:", err1.message);
    const uniqueHabits = [...new Set(allHabitsData.map(h => h.habit_name))].sort();

    // 2. Obtener los registros específicos de esta semana para pintar los círculos
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

    // Al crear un hábito, insertamos un registro "falso" hoy para que quede registrado en la base de datos
    const todayStr = formatDateLocal(new Date());

    const { error } = await _supabase
        .from('habit_logs')
        .insert([{ habit_name: name.trim(), log_date: todayStr, is_completed: false }]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        loadHabits();
    }
}

async function toggleHabit(habitName, dateStr, currentState) {
    // Upsert usando la restricción de fecha y nombre para no crear duplicados en el mismo día
    const { error } = await _supabase
        .from('habit_logs')
        .upsert({
            habit_name: habitName,
            log_date: dateStr,
            is_completed: !currentState
        }, { onConflict: 'habit_name, log_date' });

    if (error) {
        console.error("Error actualizando hábito:", error.message);
    } else {
        loadHabits();
    }
}

async function editHabit(oldName) {
    const newName = prompt("Editar nombre (afectará a todo su historial):", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;

    // Actualiza el nombre del hábito en todos sus registros históricos
    const { error } = await _supabase
        .from('habit_logs')
        .update({ habit_name: newName.trim() })
        .eq('habit_name', oldName);

    if (error) {
        alert("Error al editar: " + error.message);
    } else {
        loadHabits();
    }
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
    } else {
        loadHabits();
    }
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

    const views = ['view-habits', 'view-money', 'view-ideas', 'view-escuelas', 'view-tareas', 'view-loves', 'view-bloques', 'view-metrics'];
    views.forEach(v => {
        const viewEl = document.getElementById(v);
        if (viewEl) viewEl.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${tab}`);
    if (targetView) targetView.classList.add('active');
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
 * Alternar entre la vista principal de finanzas y el detalle de ingresos
 */
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
        loadEscuelas(); // Se llama a loadEscuelas en lugar de recargar la página entera
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
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) {
        console.error("Error cargando ideas:", error.message);
        return;
    }

    const listContainer = document.getElementById('list-ideas');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    ideas.forEach(idea => {
        // Formatear fecha (Ej: 2 abr, 14:30)
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
 * GESTIÓN DE TAREAS
 * ==========================================
 */

async function loadTareas() {
    const { data: tareas, error } = await _supabase
        .from('tareas_logs')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error("Error cargando tareas:", error.message);
        return;
    }

    const listContainer = document.getElementById('list-tareas');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    tareas.forEach(tarea => {
        const row = `
            <li class="tarea-row">
                <div class="tarea-content">${tarea.name}</div>
                <button class="delete-btn" onclick="deleteTarea(${tarea.id})" aria-label="Completar" title="Completar tarea">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </button>
            </li>
        `;
        listContainer.insertAdjacentHTML('beforeend', row);
    });
}

async function addTarea() {
    const name = prompt("Nueva obligación:");
    if (!name || name.trim() === "") return;

    const { error } = await _supabase
        .from('tareas_logs')
        .insert([{ name: name.trim() }]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        loadTareas();
    }
}

async function deleteTarea(id) {
    const { error } = await _supabase
        .from('tareas_logs')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Error al eliminar tarea:", error.message);
    } else {
        loadTareas();
    }
}


/**
 * ==========================================
 * GESTIÓN DE COSAS QUE AMO
 * ==========================================
 */

async function loadLoves() {
    // Ordena de mayor a menor frecuencia
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
    bloquesState = {}; // Reset state

    bloques.forEach(bloque => {
        bloquesState[bloque.id] = bloque; // Guardar en memoria
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

// -- CRUD del Bloque Principal --

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

// -- CRUD de las Subtareas (JSONB) --

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
    // 1. Conocer el total absoluto de hábitos creados para usar como base del 100%
    const { data: allHabitsData, error: errHabits } = await _supabase.from('habit_logs').select('habit_name');
    if (errHabits) return console.error("Error obteniendo hábitos:", errHabits.message);
    const uniqueHabits = [...new Set(allHabitsData.map(h => h.habit_name))];
    const totalHabits = uniqueHabits.length > 0 ? uniqueHabits.length : 1;

    // 2. Traer registros de completado
    const { data: logs, error } = await _supabase
        .from('habit_logs')
        .select('*')
        .order('log_date', { ascending: true });

    if (error) return console.error("Error cargando métricas:", error.message);

    // 3. Agrupar y filtrar (Ignorar días futuros para no alterar promedios)
    const todayStr = formatDateLocal(new Date());
    const dateStats = {};

    logs.forEach(log => {
        if (log.log_date > todayStr) return; // Cortar filtro en el día de hoy

        if (!dateStats[log.log_date]) {
            dateStats[log.log_date] = { completed: 0 };
        }
        if (log.is_completed) {
            dateStats[log.log_date].completed += 1;
        }
    });

    const allLabels = Object.keys(dateStats).sort();
    const recentLabels = allLabels.slice(-7); // Máximo últimos 7 días registrados

    let sumPct = 0;
    let bestDayDate = "--";
    let bestDayPct = -1;

    // 4. Calcular sobre la base estricta de total de hábitos
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

    // KPI Promedio (Solo divide por los días que han pasado)
    const avgPct = recentLabels.length > 0 ? Math.round(sumPct / recentLabels.length) : 0;
    document.getElementById('kpi-avg').textContent = `${avgPct}%`;

    // KPI Mejor Día (Mismo formato: "Domingo 26")
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
                    max: 110, // ESPACIO EXTRA para que el 100% no se corte
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

        // Formato "Domingo 26"
        const dObj = new Date(date + 'T00:00:00');
        const weekDayName = dObj.toLocaleDateString('es-CO', { weekday: 'long' });
        const dayNum = dObj.getDate();
        const displayDate = weekDayName.charAt(0).toUpperCase() + weekDayName.slice(1) + ' ' + dayNum;

        // Inyectando fracción debajo del porcentaje
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
    // 1. Obtener todos los registros históricos ordenados por fecha
    const { data: allLogs, error } = await _supabase
        .from('habit_logs')
        .select('*')
        .order('log_date', { ascending: true });

    if (error) return alert("Error al conectar con la base de datos.");
    if (!allLogs || allLogs.length === 0) return alert("No hay datos históricos para exportar.");

    // 2. Extraer la lista de todos los hábitos únicos creados
    const uniqueHabits = [...new Set(allLogs.map(l => l.habit_name))].sort();

    // 3. Determinar el rango de fechas continuo (desde el primer registro hasta hoy)
    const firstDateStr = allLogs[0].log_date;
    const firstDate = new Date(firstDateStr + 'T00:00:00'); // Evitar desfase horario
    const today = new Date();
    
    const allDates = [];
    let currentDate = new Date(firstDate);
    
    // Rellenar array con TODOS los días intermedios
    while (currentDate <= today) {
        allDates.push(formatDateLocal(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // 4. Construir el archivo CSV
    let csvContent = "\uFEFF"; // BOM para acentos en Excel
    csvContent += "Hábito," + allDates.join(",") + ",Total Histórico\n";

    uniqueHabits.forEach(habitName => {
        let row = `"${habitName}"`;
        let totalCompletados = 0;

        // Validar día por día
        allDates.forEach(dateStr => {
            const log = allLogs.find(l => l.habit_name === habitName && l.log_date === dateStr);
            const isDone = log ? log.is_completed : false;
            
            if (isDone) totalCompletados++;
            
            row += isDone ? ",Sí" : ",No"; // Rellena con 'No' si el dato no existe en DB
        });
        
        row += `,${totalCompletados}`;
        csvContent += row + "\n";
    });

    // 5. Crear el archivo y forzar la descarga
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

    // Calcular el Lunes de la semana actual
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1);

    const datesOfWeek = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        datesOfWeek.push(formatDateLocal(d));
    }

    // Traer todos los nombres de hábitos
    const { data: allHabitsData, error: err1 } = await _supabase.from('habit_logs').select('habit_name');
    if (err1) return alert("Error al obtener datos para exportar.");
    const uniqueHabits = [...new Set(allHabitsData.map(h => h.habit_name))].sort();

    // Traer los registros de esta semana
    const { data: weekLogs, error: err2 } = await _supabase
        .from('habit_logs')
        .select('*')
        .gte('log_date', datesOfWeek[0])
        .lte('log_date', datesOfWeek[6]);

    if (err2) return alert("Error al obtener registros de la semana.");

    // Construir el archivo CSV
    let csvContent = "\uFEFF"; // BOM para que Excel lea los acentos (UTF-8)
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

    // Crear el archivo y forzar la descarga en el navegador
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
    loadLoves();
    loadBloques();
    loadMetrics();

    _supabase.channel('habit-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'habit_logs' }, () => loadHabits())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'habit_logs' }, () => loadHabits())
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'habit_logs' }, () => loadHabits())
        .subscribe();
});