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