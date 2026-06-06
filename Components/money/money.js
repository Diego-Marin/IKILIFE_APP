// En cualquier componente (ej: components/metrics/metrics.js)
import { _supabase } from "../../supabase.js";
// CORREGIDO: Sube un nivel y entra a la carpeta
import { initInversiones } from "../inversiones/inversiones.js";

/**
 * ==========================================
 * GESTIÓN DE INVERSIONES Y DEUDAS
 * ==========================================
 */
let inversionesState = {};

export async function loadInversiones() {
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

export async function addInversion() {
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

export async function editInversionName(id) {
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

export async function deleteInversionFull(id, name) {
    if (!confirm(`¿Eliminar la deuda "${name}" y todo su historial de cuotas?`)) return;

    const { error } = await _supabase
        .from('inversiones_logs')
        .delete()
        .eq('id', id);

    if (error) alert("Error: " + error.message);
    else loadInversiones();
}

export async function updateCuotasDB(id, newCuotasArray) {
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

export function addCuota(id) {
    const text = prompt("Detalle de la cuota (Ej: Cuota 2 - $50.000):");
    if (!text || text.trim() === "") return;

    const cuotas = inversionesState[id].cuotas || [];
    cuotas.push({ text: text.trim(), done: false });

    updateCuotasDB(id, cuotas);
}

export function editCuota(id, cuotaIndex) {
    const cuotas = inversionesState[id].cuotas;
    const newText = prompt("Editar cuota:", cuotas[cuotaIndex].text);

    if (!newText || newText.trim() === "" || newText === cuotas[cuotaIndex].text) return;

    cuotas[cuotaIndex].text = newText.trim();
    updateCuotasDB(id, cuotas);
}

export function deleteCuota(id, cuotaIndex) {
    if (!confirm("¿Eliminar esta cuota?")) return;
    const cuotas = inversionesState[id].cuotas;
    cuotas.splice(cuotaIndex, 1);
    updateCuotasDB(id, cuotas);
}

export function toggleCuota(id, cuotaIndex) {
    const cuotas = inversionesState[id].cuotas;
    cuotas[cuotaIndex].done = !cuotas[cuotaIndex].done;
    updateCuotasDB(id, cuotas);
}

// Función auxiliar necesaria para inicializar el módulo si se requiere
export function initInversiones(supabaseClient) {
    // Si necesitas usar el cliente pasado por parámetro, puedes asignarlo aquí
    // o simplemente ignorarlo si ya importaste _supabase arriba.
    loadInversiones();
}