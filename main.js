function switchTab(tabName, btn) {
    // 1. Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('tab-active');
        b.classList.add('tab-inactive');
    });
    btn.classList.remove('tab-inactive');
    btn.classList.add('tab-active');

    // 2. Cambiar vistas
    document.querySelectorAll('.view-content').forEach(v => v.classList.remove('active'));

    if (tabName === 'habits') {
        document.getElementById('view-habits').classList.add('active');
        
    } else {
        document.getElementById('view-money').classList.add('active');
      
    }
}


// Nueva función para navegar entre el resumen de dinero y el detalle de ingresos
                function toggleFinanceView(view) {
                    const mainFinance = document.getElementById('finance-main-view');
                    const incomeDetail = document.getElementById('income-view');

                    if (view === 'income-view') {
                        mainFinance.classList.add('hidden');
                        incomeDetail.classList.remove('hidden');
                    } else {
                        mainFinance.classList.remove('hidden');
                        incomeDetail.classList.add('hidden');
                    }
                }

                function toggleTheme() {
                    const body = document.body;
                    const sunIcon = document.querySelector('.sun-icon');
                    const moonIcon = document.querySelector('.moon-icon');

                    body.classList.toggle('dark-mode');

                    if (body.classList.contains('dark-mode')) {
                        sunIcon.classList.add('hidden');
                        moonIcon.classList.remove('hidden');
                    } else {
                        sunIcon.classList.remove('hidden');
                        moonIcon.classList.add('hidden');
                    }
                }


                function saveLearning() {
    const text = document.getElementById('daily-learning').value;
    if(text.trim() === '') {
        alert("Escribe algo antes de guardar.");
    } else {
        alert("Reflexión guardada correctamente.");
        document.getElementById('daily-learning').value = ''; // Limpia el campo
    }
}



// Calcular y mostrar el costo de vida proyectado
function calcularCostoDeVida() {
    let totalProyectado = 0;
    
    // Seleccionar todos los elementos con la clase .item-projected que tengan el atributo data-value
    const projectedItems = document.querySelectorAll('.item-projected[data-value]');
    
    projectedItems.forEach(item => {
        const valor = parseInt(item.getAttribute('data-value')) || 0;
        totalProyectado += valor;
    });

    // Formatear a moneda colombiana sin decimales
    const totalFormateado = '$' + totalProyectado.toLocaleString('es-CO');
    
    // Insertar en la tarjeta correspondiente
    document.getElementById('costo-vida-total').innerText = totalFormateado;
}

// Ejecutar la función cuando el documento cargue
document.addEventListener('DOMContentLoaded', calcularCostoDeVida);




function toggleStatus(element) {
    if (element.style.backgroundColor === 'var(--primary-green)') {
        element.style.backgroundColor = 'transparent';
        element.style.borderColor = '#999';
    } else {
        element.style.backgroundColor = 'var(--primary-green)';
        element.style.borderColor = 'var(--primary-green)';
    }
}



// 1. Configuración de conexión supabase
// 1. Configuración (Usa tus llaves confirmadas)
const SUPABASE_URL = "https://pgawswfurouzstkapwby.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnYXdzd2Z1cm91enN0a2Fwd2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Nzg0NzEsImV4cCI6MjA5MDU1NDQ3MX0.KciMvGBygkY2lTDtUIE_zztaODNX3XuWb_sEnpzkMHw";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Función para cargar y mostrar los hábitos al iniciar
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
    listContainer.innerHTML = ''; // Limpiar lo que haya

    habits.forEach(habit => {
        const row = `
            <li class="item habit-grid">
                <div class="item-name">${habit.habit_name}</div>
                <div class="status-circle" 
                     style="background-color: ${habit.is_completed ? 'var(--primary-green)' : 'transparent'}"
                     onclick="updateHabit(${habit.id}, ${!habit.is_completed})">
                </div>
            </li>
        `;
        listContainer.insertAdjacentHTML('beforeend', row);
    });
}

// 3. Función para actualizar un hábito (Sincronización real)
async function updateHabit(id, newState) {
    const { error } = await _supabase
        .from('habit_logs')
        .update({ is_completed: newState })
        .eq('id', id);

    if (!error) loadHabits(); // Recargar para mostrar el cambio
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', loadHabits);