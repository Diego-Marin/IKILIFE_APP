/**
 * ==========================================
 * CONFIGURACIÓN DE SUPABASE
 * ==========================================
 */
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
 * GESTIÓN DE HÁBITOS (CRUD)
 * ==========================================
 */

async function loadHabits() {
    const { data: habits, error } = await _supabase
        .from('habit_logs')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error("Error cargando hábitos:", error.message);
        return;
    }

    const listContainer = document.getElementById('list-habits');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

    habits.forEach(habit => {
        let circlesHTML = '';
        
        diasSemana.forEach(dia => {
            const isDone = habit[dia];
            circlesHTML += `
                <div class="status-circle" 
                     style="background-color: ${isDone ? 'var(--primary-green)' : 'transparent'}; 
                            border-color: ${isDone ? 'var(--primary-green)' : '#999'}"
                     onclick="toggleHabit('${habit.habit_name}', '${dia}', ${isDone})">
                </div>`;
        });

        const row = `
            <li class="habit-grid">
                <div class="item-name" 
                     onclick="editHabit('${habit.habit_name}')"
                     oncontextmenu="event.preventDefault(); deleteHabit('${habit.habit_name}')"
                     style="cursor: pointer;"
                     title="Clic: Editar | Clic Derecho: Eliminar">
                    ${habit.habit_name}
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

    const { error } = await _supabase
        .from('habit_logs')
        .insert([{ habit_name: name.trim() }]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        window.location.reload();
    }
}

async function toggleHabit(habitName, diaColumna, currentState) {
    const updateData = {};
    updateData[diaColumna] = !currentState;

    const { error } = await _supabase
        .from('habit_logs')
        .update(updateData)
        .eq('habit_name', habitName);

    if (error) {
        console.error("Error actualizando hábito:", error.message);
    } else {
        loadHabits(); 
    }
}

async function editHabit(oldName) {
    const newName = prompt("Editar nombre:", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;

    const { error } = await _supabase
        .from('habit_logs')
        .update({ habit_name: newName.trim() })
        .eq('habit_name', oldName);

    if (error) {
        alert("Error al editar: " + error.message);
    } else {
        window.location.reload();
    }
}

async function deleteHabit(name) {
    const confirmDelete = confirm(`¿Deseas eliminar "${name}"?`);
    if (!confirmDelete) return;

    const { error } = await _supabase
        .from('habit_logs')
        .delete()
        .eq('habit_name', name);

    if (error) {
        alert("Error al eliminar: " + error.message);
    } else {
        window.location.reload();
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

    const views = ['view-habits', 'view-money', 'view-ideas', 'view-escuelas', 'view-tareas', 'view-loves' ];
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
    
    _supabase.channel('habit-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'habit_logs' }, () => loadHabits())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'habit_logs' }, () => loadHabits())
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'habit_logs' }, () => loadHabits())
        .subscribe();
});



