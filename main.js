/**
 * IKILIFE - Configuración
 */
const SUPABASE_URL = "https://pgawswfurouzstkapwby.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnYXdzd2Z1cm91enN0a2Fwd2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Nzg0NzEsImV4cCI6MjA5MDU1NDQ3MX0.KciMvGBygkY2lTDtUIE_zztaODNX3XuWb_sEnpzkMHw";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Gestión del Tema (Dark/Light) con Persistencia
 */
function toggleTheme() {
    const body = document.body;
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    
    body.classList.toggle('dark-mode');
    
    // Guardar preferencia
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Actualizar iconos
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
 * Gestión de Hábitos
 */
async function loadHabits() {
    const { data: habits, error } = await _supabase
        .from('habit_logs')
        .select('*')
        .order('id', { ascending: true });

    if (error) return console.error("Error cargando hábitos:", error.message);

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
                <div class="item-name" title="${habit.habit_name}">${habit.habit_name}</div>
                ${circlesHTML}
            </li>
        `;
        listContainer.insertAdjacentHTML('beforeend', row);
    });
}

async function toggleHabit(habitName, diaColumna, currentState) {
    const updateData = {};
    updateData[diaColumna] = !currentState;

    const { error } = await _supabase
        .from('habit_logs')
        .update(updateData)
        .eq('habit_name', habitName);

    if (!error) loadHabits();
}

/**
 * UI &Tabs
 */
function switchTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('tab-active');
        b.classList.add('tab-inactive');
    });
    btn.classList.add('tab-active');
    btn.classList.remove('tab-inactive');

    const views = ['view-habits', 'view-money'];
    views.forEach(v => document.getElementById(v).classList.remove('active'));
    document.getElementById(`view-${tab}`).classList.add('active');
}

async function saveLearning() {
    const textEl = document.getElementById('daily-learning');
    if (!textEl.value.trim()) return;

    const { error } = await _supabase.from('journal_logs').insert([{ content: textEl.value }]);
    if (!error) {
        alert("Guardado");
        textEl.value = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    loadHabits();
    
    _supabase.channel('habit-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'habit_logs' }, () => loadHabits())
        .subscribe();
});





//modificar filas
/**
 * CRUD de Hábitos integrados en la interfaz
 */

// 1. CARGAR (Con eventos de edición y borrado)
async function loadHabits() {
    const { data: habits, error } = await _supabase
        .from('habit_logs')
        .select('*')
        .order('id', { ascending: true });

    if (error) return console.error(error.message);

    const listContainer = document.getElementById('list-habits');
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

        // Eventos: Clic para editar, Click Derecho (oncontextmenu) para eliminar
        const row = `
            <li class="habit-grid">
                <div class="item-name" 
                     onclick="editHabit('${habit.habit_name}')"
                     oncontextmenu="event.preventDefault(); deleteHabit('${habit.habit_name}')"
                     style="cursor: pointer;"
                     title="Clic: Editar | Click Derecho: Eliminar">
                    ${habit.habit_name}
                </div>
                ${circlesHTML}
            </li>
        `;
        listContainer.insertAdjacentHTML('beforeend', row);
    });
}

// 2. CREAR (Desde el '+' de la cabecera)
async function addHabit() {
    const name = prompt("Nuevo hábito:");
    if (!name || name.trim() === "") return;

    const { error } = await _supabase
        .from('habit_logs')
        .insert([{ habit_name: name.trim() }]);

    if (error) alert("Error al guardar: " + error.message);
    // loadHabits() se llamará automáticamente por el canal Realtime
}

// 3. EDITAR (Clic en el nombre)
async function editHabit(oldName) {
    const newName = prompt("Editar nombre:", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;

    const { error } = await _supabase
        .from('habit_logs')
        .update({ habit_name: newName.trim() })
        .eq('habit_name', oldName);

    if (error) alert("Error al editar");
}

// 4. ELIMINAR (Click derecho en el nombre)
async function deleteHabit(name) {
    const confirmDelete = confirm(`¿Deseas eliminar "${name}"?`);
    if (!confirmDelete) return;

    const { error } = await _supabase
        .from('habit_logs')
        .delete()
        .eq('habit_name', name);

    if (error) alert("Error al eliminar");
}