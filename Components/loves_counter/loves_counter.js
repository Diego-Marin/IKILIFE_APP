/**
 * ==========================================
 * COMPONENTE: LOVES COUNTER (Mapa de lo que Amo)
 * ==========================================
 * Antes, la pestaña "LOVES" dentro de Camino era un ranking de
 * intensidad 1-5 por pasión (igual que Odios/Sentimientos). Ese
 * ranking se movió a Sentimientos › Positivos (ver mood_tracker.js,
 * MOOD_CONFIGS.loves) para vivir junto a Negativos.
 *
 * Como resultado, la pestaña LOVES quedó vacía. Este componente le da
 * una dinámica nueva: en vez de calificar qué tanto amas algo, aquí
 * registras CADA VEZ que efectivamente haces algo que amas. Es un
 * "mapa" — un contador total + una barra de progreso mensual — para
 * ver qué tanto estás viviendo lo que amas, no solo qué tanto lo
 * amas en teoría.
 *
 * TABLAS REQUERIDAS EN SUPABASE:
 *   CREATE TABLE loves_actividades (
 *     id bigint generated always as identity PRIMARY KEY,
 *     name text NOT NULL,
 *     created_at timestamptz DEFAULT now()
 *   );
 *
 *   CREATE TABLE loves_actividades_logs (
 *     id bigint generated always as identity PRIMARY KEY,
 *     actividad_id bigint REFERENCES loves_actividades(id) ON DELETE CASCADE,
 *     fecha date NOT NULL,
 *     created_at timestamptz DEFAULT now(),
 *     UNIQUE(actividad_id, fecha)
 *   );
 *
 * La meta mensual (barra de progreso) se guarda en localStorage
 * ("ikilife_loves_meta_mensual", por defecto 20) — es una preferencia
 * personal, no necesita tabla propia.
 */

const LOVES_META_KEY = 'ikilife_loves_meta_mensual';
const LOVES_META_DEFAULT = 20;

function getLovesMetaMensual() {
    const saved = parseInt(localStorage.getItem(LOVES_META_KEY), 10);
    return Number.isFinite(saved) && saved > 0 ? saved : LOVES_META_DEFAULT;
}

function getInicioFinMes() {
    const hoy = new Date();
    const inicio = formatDateLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    const fin = formatDateLocal(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
    return { inicio, fin };
}

async function loadLovesCounter() {
    const container = document.getElementById('loves-counter-container');
    if (!container) return;

    const { data: actividades, error: errAct } = await _supabase
        .from('loves_actividades')
        .select('*')
        .order('name', { ascending: true });
    if (errAct) return console.error('Error cargando loves_actividades:', errAct.message);

    const { data: logs, error: errLogs } = await _supabase
        .from('loves_actividades_logs')
        .select('actividad_id, fecha');
    if (errLogs) return console.error('Error cargando loves_actividades_logs:', errLogs.message);

    const { inicio, fin } = getInicioFinMes();
    const hoyISO = getFechaHoyISO();
    const todosLosLogs = logs || [];

    const totalAllTime = todosLosLogs.length;
    const countMonth = todosLosLogs.filter(l => l.fecha >= inicio && l.fecha <= fin).length;
    const meta = getLovesMetaMensual();
    const pct = meta > 0 ? Math.min(100, Math.round((countMonth / meta) * 100)) : 0;

    container.innerHTML = `
        <div class="loves-counter-card">
            <div class="loves-counter-header">
                <span class="loves-counter-title">🗺️ Mapa de lo que Amo</span>
                <button type="button" class="icon-btn loves-counter-goal-btn" id="loves-goal-btn"
                    title="Definir meta mensual">⚙️</button>
            </div>

            <div class="loves-counter-total">
                <span class="loves-counter-total-value">${totalAllTime}</span>
                <span class="loves-counter-total-label">veces has hecho algo que amas</span>
            </div>

            <div class="loves-counter-progress">
                <div class="loves-counter-progress-header">
                    <span>Este mes</span>
                    <span>${countMonth} / ${meta}</span>
                </div>
                <div class="ik-bar-track loves-counter-bar-track">
                    <div class="ik-bar-fill loves-counter-bar-fill" style="width:${pct}%;"></div>
                </div>
            </div>
        </div>

        <div class="loves-actividades-header">
            <span class="loves-actividades-header-label">Tus pasiones</span>
            <button type="button" class="icon-btn" id="loves-add-actividad-btn" aria-label="Agregar actividad"
                title="Agregar una pasión o actividad">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
        </div>
        <div id="loves-actividades-grid" class="loves-actividades-grid"></div>
    `;

    document.getElementById('loves-goal-btn').addEventListener('click', setLovesMetaMensual);
    document.getElementById('loves-add-actividad-btn').addEventListener('click', addLovesActividad);

    const grid = document.getElementById('loves-actividades-grid');

    if (!actividades || actividades.length === 0) {
        grid.innerHTML = `<div class="loves-actividades-empty">Aún no agregas ninguna pasión. Toca "+" para empezar tu mapa.</div>`;
        return;
    }

    actividades.forEach(actividad => {
        const logsDeEsta = todosLosLogs.filter(l => l.actividad_id === actividad.id);
        const totalActividad = logsDeEsta.length;
        const hechoHoy = logsDeEsta.some(l => l.fecha === hoyISO);

        const card = document.createElement('div');
        card.className = 'loves-actividad-card' + (hechoHoy ? ' loves-actividad-card--done' : '');
        card.innerHTML = `
            <div class="loves-actividad-top">
                <span class="loves-actividad-name" title="Clic para editar nombre">${actividad.name}</span>
                <span class="loves-actividad-count">${totalActividad}x</span>
            </div>
            <button type="button" class="loves-actividad-btn${hechoHoy ? ' loves-actividad-btn--done' : ''}">
                ${hechoHoy ? '✅ Hecho hoy' : '🤍 Lo hice hoy'}
            </button>
        `;

        card.querySelector('.loves-actividad-name').addEventListener('click', (e) => {
            e.stopPropagation();
            editLovesActividad(actividad.id, actividad.name);
        });

        card.querySelector('.loves-actividad-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLovesActividadHoy(actividad.id, hechoHoy);
        });

        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            deleteLovesActividad(actividad.id, actividad.name);
        });

        grid.appendChild(card);
    });
}

async function addLovesActividad() {
    const name = prompt('Nueva pasión o actividad que amas hacer:');
    if (!name || name.trim() === '') return;

    const { error } = await _supabase.from('loves_actividades').insert([{ name: name.trim() }]);
    if (error) {
        alert('Error al guardar: ' + error.message);
    } else {
        loadLovesCounter();
    }
}

async function editLovesActividad(id, oldName) {
    const newName = prompt('Editar nombre:', oldName);
    if (!newName || newName.trim() === '' || newName === oldName) return;

    const { error } = await _supabase
        .from('loves_actividades')
        .update({ name: newName.trim() })
        .eq('id', id);

    if (error) {
        alert('Error al editar: ' + error.message);
    } else {
        loadLovesCounter();
    }
}

async function deleteLovesActividad(id, name) {
    const ok = confirm(`¿Eliminar "${name}" y todo su historial de veces hecho?`);
    if (!ok) return;

    const { error } = await _supabase.from('loves_actividades').delete().eq('id', id);
    if (error) {
        alert('Error al eliminar: ' + error.message);
    } else {
        loadLovesCounter();
    }
}

/**
 * Marca (o desmarca) que hoy hiciste esta actividad. Un clic = +1 al
 * contador de hoy; volver a tocarlo lo deshace (por si fue un toque
 * accidental). Al ser UNIQUE(actividad_id, fecha), solo cuenta una
 * vez por día sin importar cuántas veces se marque.
 */
async function toggleLovesActividadHoy(id, yaHecho) {
    const hoyISO = getFechaHoyISO();

    if (yaHecho) {
        const { error } = await _supabase
            .from('loves_actividades_logs')
            .delete()
            .eq('actividad_id', id)
            .eq('fecha', hoyISO);
        if (error) return alert('Error al desmarcar: ' + error.message);
    } else {
        const { error } = await _supabase
            .from('loves_actividades_logs')
            .insert([{ actividad_id: id, fecha: hoyISO }]);
        if (error) return alert('Error al guardar: ' + error.message);
    }

    loadLovesCounter();
    if (typeof loadEspejoDelAlma === 'function') loadEspejoDelAlma();
}

function setLovesMetaMensual() {
    const actual = getLovesMetaMensual();
    const input = prompt('¿Cuántas veces al mes quieres hacer algo que amas? (tu meta)', String(actual));
    if (input === null) return;

    const nueva = parseInt(input, 10);
    if (!Number.isFinite(nueva) || nueva <= 0) {
        alert('Ingresa un número válido mayor a 0.');
        return;
    }

    localStorage.setItem(LOVES_META_KEY, String(nueva));
    loadLovesCounter();
}