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
 * CÁLCULO DE PROGRESO SEMANAL
 * ==========================================
 */
function updateWeeklyProgress() {
    const today = new Date();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    // Asignar mes
    document.getElementById('current-month-text').textContent = monthNames[today.getMonth()];

    // Calcular semana del mes actual
    // Usa lógica estándar donde el día 1 al 7 es semana 1, 8 al 14 semana 2, etc.
    const weekNumber = Math.ceil(today.getDate() / 7);
    document.getElementById('current-week-text').textContent = `Semana ${weekNumber}`;

    // Identificar día actual (Ajustando ISO: Lunes = 1, Domingo = 7)
    let currentDay = today.getDay();
    currentDay = currentDay === 0 ? 7 : currentDay;

    // Actualizar barra de progreso
    const segments = document.querySelectorAll('.day-segment');
    segments.forEach((segment, index) => {
        const segmentDay = index + 1;
        segment.classList.remove('past', 'today', 'future');
        
        if (segmentDay < currentDay) {
            segment.classList.add('past');
        } else if (segmentDay === currentDay) {
            segment.classList.add('today');
        } else {
            segment.classList.add('future');
        }
    });
}


/**
 * ==========================================
 * GESTIÓN DE HÁBITOS (CRUD)
 * ==========================================
 */

// 1. LEER: Cargar hábitos desde Supabase
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
        
        // Generar los círculos de estado para cada día
        diasSemana.forEach(dia => {
            const isDone = habit[dia];
            circlesHTML += `
                <div class="status-circle" 
                     style="background-color: ${isDone ? 'var(--primary-green)' : 'transparent'}; 
                            border-color: ${isDone ? 'var(--primary-green)' : '#999'}"
                     onclick="toggleHabit('${habit.habit_name}', '${dia}', ${isDone})">
                </div>`;
        });

        // Crear la fila del hábito (Clic para editar, Clic derecho para eliminar)
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

// 2. CREAR: Añadir un nuevo hábito
async function addHabit() {
    const name = prompt("Nuevo hábito:");
    if (!name || name.trim() === "") return;

    const { error } = await _supabase
        .from('habit_logs')
        .insert([{ habit_name: name.trim() }]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        // Recarga la página tras hacer clic en OK y guardar con éxito
        window.location.reload();
    }
}

// 3. ACTUALIZAR (Estado del día): Alternar estado de un día específico
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
        // Aquí NO recargamos la página completa para evitar una mala experiencia al usuario.
        // Solo repintamos la lista.
        loadHabits(); 
    }
}

// 4. ACTUALIZAR (Nombre): Editar el nombre de un hábito existente
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
        // Recarga la página tras hacer clic en OK y actualizar con éxito
        window.location.reload();
    }
}

// 5. ELIMINAR: Borrar un hábito
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
        // Recarga la página tras confirmar la eliminación
        window.location.reload();
    }
}


/**
 * ==========================================
 * INTERFAZ DE USUARIO (TABS Y OTROS)
 * ==========================================
 */
function switchTab(tab, btn) {
    // Actualizar estilos de los botones
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('tab-active');
        b.classList.add('tab-inactive');
    });
    btn.classList.add('tab-active');
    btn.classList.remove('tab-inactive');

    // Cambiar la vista visible
    const views = ['view-habits', 'view-money'];
    views.forEach(v => {
        const viewEl = document.getElementById(v);
        if (viewEl) viewEl.classList.remove('active');
    });
    
    const targetView = document.getElementById(`view-${tab}`);
    if (targetView) targetView.classList.add('active');
}

// Nota: Esta función requiere un elemento con id 'daily-learning' en el HTML
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
 * INICIALIZACIÓN
 * ==========================================
 */
document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    updateWeeklyProgress(); // Inicializar el componente de progreso semanal
    loadHabits();
    
    // Suscripción en tiempo real a cambios en la tabla habit_logs
    _supabase.channel('habit-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'habit_logs' }, () => loadHabits())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'habit_logs' }, () => loadHabits())
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'habit_logs' }, () => loadHabits())
        .subscribe();
});