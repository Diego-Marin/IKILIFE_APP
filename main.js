/**
 * IKILIFE - Configuración
 */
const SUPABASE_URL = "https://pgawswfurouzstkapwby.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnYXdzd2Z1cm91enN0a2Fwd2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Nzg0NzEsImV4cCI6MjA5MDU1NDQ3MX0.KciMvGBygkY2lTDtUIE_zztaODNX3XuWb_sEnpzkMHw";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Gestión de Hábitos (Modelo Horizontal)
 */
async function loadHabits() {
    // 1. Traer todos los hábitos ordenados por ID
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

    // Definición de las columnas de la tabla SQL
    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

    habits.forEach(habit => {
        let circlesHTML = '';

        diasSemana.forEach(dia => {
            // El valor viene directamente de la columna booleana de la fila
            const isDone = habit[dia]; 

            circlesHTML += `
                <div class="status-circle" 
                     style="background-color: ${isDone ? 'var(--primary-green)' : 'transparent'}; 
                            border-color: ${isDone ? 'var(--primary-green)' : '#999'}"
                     onclick="toggleHabit('${habit.habit_name}', '${dia}', ${isDone})">
                </div>`;
        });

        const row = `
            <li class="item habit-grid">
                <div class="item-name" title="${habit.habit_name}">${habit.habit_name}</div>
                ${circlesHTML}
            </li>
        `;
        listContainer.insertAdjacentHTML('beforeend', row);
    });
}

async function toggleHabit(habitName, diaColumna, currentState) {
    // Creamos el objeto de actualización dinámico para la columna clicada
    const updateData = {};
    updateData[diaColumna] = !currentState;

    const { error } = await _supabase
        .from('habit_logs')
        .update(updateData)
        .eq('habit_name', habitName);

    if (!error) {
        loadHabits(); 
    } else {
        console.error("Error al actualizar hábito:", error.message);
    }
}

/**
 * Registro de Aprendizaje
 */
async function saveLearning() {
    const textEl = document.getElementById('daily-learning');
    if (!textEl.value.trim()) return alert("Escribe algo.");

    const { error } = await _supabase.from('journal_logs').insert([
        { content: textEl.value }
    ]);

    if (error) alert("Error al sincronizar.");
    else { 
        alert("Reflexión guardada."); 
        textEl.value = ''; 
    }
}

/**
 * Utilidades de Interfaz
 */
function switchTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('tab-active');
        b.classList.add('tab-inactive');
    });
    btn.classList.add('tab-active');
    btn.classList.remove('tab-inactive');

    if (tab === 'habits') {
        document.getElementById('view-habits').classList.add('active');
        document.getElementById('view-money').classList.remove('active');
    } else {
        document.getElementById('view-habits').classList.remove('active');
        document.getElementById('view-money').classList.add('active');
    }
}

function toggleTheme() {
    const body = document.body;
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    
    body.classList.toggle('dark-mode');
    sunIcon.classList.toggle('hidden');
    moonIcon.classList.toggle('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    loadHabits();
    
    // Escuchar cambios en tiempo real para la tabla horizontal
    _supabase.channel('habit-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'habit_logs' }, () => loadHabits())
        .subscribe();
});