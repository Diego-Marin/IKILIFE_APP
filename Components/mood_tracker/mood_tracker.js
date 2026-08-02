/**
 * ==========================================
 * COMPONENTE: MOOD TRACKER (Odios + Sentimientos)
 * ==========================================
 * Lógica compartida para "Odios" y "Sentimientos": ambos son listas
 * de items con una intensidad de 1 a 10 que se registra una vez al
 * día. Antes cada item se bloqueaba 12h apenas se soltaba su propio
 * control; ahora el bloqueo es POR SECCIÓN: puedes reajustar todos
 * los valores libremente (incluso volver a marcar el mismo valor de
 * ayer, algo que antes no se podía porque dependía del evento
 * "change" del slider) y solo al presionar "Guardar registro de hoy"
 * se guardan todos de una vez y la sección completa queda bloqueada
 * por 12 horas.
 *
 * La marcación ya no usa <input type="range"> (por eso no se podía
 * volver a seleccionar el mismo valor: el evento "change" no se
 * dispara si el valor no cambia). Ahora es una fila de 10 chips
 * numerados — un clic siempre registra la selección, sin importar
 * si es igual al valor anterior.
 *
 * Tablas de Supabase requeridas (sin cambios respecto a antes):
 *   odios_logs / sentimientos_logs        (id, name, image_filename)
 *   odios_registros / sentimientos_registros
 *       (id, <fk>_id, valor 1-10, fecha, created_at,
 *        UNIQUE(<fk>_id, fecha))
 *
 * El bloqueo por sección se guarda en localStorage (no requiere tabla
 * nueva): "ikilife_lock_odios" / "ikilife_lock_sentimientos" con la
 * fecha/hora ISO del último "Guardar registro de hoy".
 */

const HORAS_BLOQUEO_REGISTRO = 12;

/* ==========================================
   UTILIDADES DE FECHA (usadas también por loadTopSentimientos en main.js)
   ========================================== */
function getFechaHoyISO() {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function formatFechaRelativa(fechaStr) {
    if (!fechaStr) return 'Sin registrar';

    const hoyISO = getFechaHoyISO();
    if (fechaStr === hoyISO) return 'Hoy';

    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const ayerISO = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;
    if (fechaStr === ayerISO) return 'Ayer';

    const [y, m, d] = fechaStr.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

async function cargarUltimosRegistros(tableName, fkColumn) {
    const { data, error } = await _supabase
        .from(tableName)
        .select(`${fkColumn}, valor, fecha, created_at`)
        .order('fecha', { ascending: false });

    if (error) {
        console.error(`Error cargando ${tableName}:`, error.message);
        return {};
    }

    const mapa = {};
    (data || []).forEach(registro => {
        const id = registro[fkColumn];
        if (!(id in mapa)) {
            mapa[id] = { valor: registro.valor, fecha: registro.fecha, created_at: registro.created_at };
        }
    });
    return mapa;
}

function formatTiempoRestante(ms) {
    const totalMin = Math.ceil(ms / 60000);
    const horas = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    if (horas <= 0) return `${min}m`;
    return `${horas}h ${min}m`;
}

/* ==========================================
   BLOQUEO POR SECCIÓN (no por item)
   ========================================== */
function calcularBloqueoSeccion(lockKey) {
    const savedAt = localStorage.getItem(lockKey);
    if (!savedAt) return { locked: false, restanteMs: 0 };

    const transcurridoMs = Date.now() - new Date(savedAt).getTime();
    const ventanaMs = HORAS_BLOQUEO_REGISTRO * 60 * 60 * 1000;
    const restanteMs = ventanaMs - transcurridoMs;

    return { locked: restanteMs > 0, restanteMs: Math.max(restanteMs, 0) };
}

/* ==========================================
   MOTOR GENÉRICO (usado por Odios y Sentimientos)
   ========================================== */
const MOOD_CONFIGS = {
    odios: {
        logsTable: 'odios_logs',
        regTable: 'odios_registros',
        fkColumn: 'odio_id',
        containerId: 'list-odios',
        lockKey: 'ikilife_lock_odios',
        colorVar: '#e74c3c',
        cssClass: 'mood-card--odio',
        promptNew: 'Qué situación, cosa o hábito no te gusta:',
        afterSave: null,
    },
    sentimientos: {
        logsTable: 'sentimientos_logs',
        regTable: 'sentimientos_registros',
        fkColumn: 'sentimiento_id',
        containerId: 'list-sentimientos',
        lockKey: 'ikilife_lock_sentimientos',
        colorVar: 'var(--primary-green)',
        cssClass: 'mood-card--sentimiento',
        promptNew: 'Nuevo sentimiento a registrar:',
        afterSave: () => { if (typeof loadTopSentimientos === 'function') loadTopSentimientos(); },
    },
};

// Estado en memoria de la selección actual (aún no guardada) por sección: { odios: {id: valor}, sentimientos: {id: valor} }
const _moodSelection = { odios: {}, sentimientos: {} };

async function loadMoodSection(key) {
    const config = MOOD_CONFIGS[key];
    const { data: items, error } = await _supabase
        .from(config.logsTable)
        .select('*')
        .order('name', { ascending: true });

    if (error) return console.error(error.message);

    const container = document.getElementById(config.containerId);
    if (!container) return;

    const wrapper = container.closest('[id^="subview-"]') || container.parentElement;
    let toolbar = wrapper.querySelector('.mood-toolbar');
    if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.className = 'mood-toolbar';
        wrapper.insertBefore(toolbar, container);
    }

    const ultimos = await cargarUltimosRegistros(config.regTable, config.fkColumn);
    const bloqueo = calcularBloqueoSeccion(config.lockKey);

    // Inicializa la selección en memoria con el último valor guardado (o 5 por defecto),
    // solo si aún no hay nada seleccionado para ese item en esta sesión.
    items.forEach(item => {
        if (!(item.id in _moodSelection[key])) {
            _moodSelection[key][item.id] = ultimos[item.id] ? ultimos[item.id].valor : 5;
        }
    });

    renderMoodToolbar(toolbar, key, config, bloqueo);

    container.className = 'mood-grid';
    container.innerHTML = '';

    items.forEach(item => {
        const registro = ultimos[item.id];
        const fechaLabel = registro ? formatFechaRelativa(registro.fecha) : 'Sin registrar';
        const valorSeleccionado = _moodSelection[key][item.id];
        const localImagePath = `assets/images/${item.image_filename}`;

        const card = document.createElement('div');
        card.className = 'mood-card ' + config.cssClass + (bloqueo.locked ? ' mood-card--locked' : '');

        card.innerHTML = `
            <img src="${localImagePath}" class="mood-img" onerror="this.src='assets/images/default.jpg'">
            <div class="mood-info">
                <div class="mood-top-row">
                    <span class="mood-name" title="Clic para editar nombre">${item.name}</span>
                    <span class="mood-value">${valorSeleccionado}</span>
                </div>
                <div class="mood-chip-row" data-item-id="${item.id}"></div>
                <span class="mood-date${bloqueo.locked ? ' mood-date--locked' : ''}">${bloqueo.locked ? `🔒 Disponible en ${formatTiempoRestante(bloqueo.restanteMs)}` : `Último: ${fechaLabel}`}</span>
            </div>
        `;

        const nameEl = card.querySelector('.mood-name');
        nameEl.addEventListener('click', (e) => {
            e.stopPropagation();
            editMoodItem(key, item.name, item.id);
        });

        const chipRow = card.querySelector('.mood-chip-row');
        const valueEl = card.querySelector('.mood-value');

        for (let n = 1; n <= 10; n++) {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'mood-chip' + (n === valorSeleccionado ? ' mood-chip--active' : '');
            chip.textContent = n;
            chip.disabled = bloqueo.locked;
            chip.style.setProperty('--chip-color', config.colorVar);
            chip.addEventListener('click', () => {
                _moodSelection[key][item.id] = n;
                chipRow.querySelectorAll('.mood-chip').forEach(c => c.classList.remove('mood-chip--active'));
                chip.classList.add('mood-chip--active');
                valueEl.textContent = n;
            });
            chipRow.appendChild(chip);
        }

        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            deleteMoodItem(key, item.name, item.id);
        });

        container.appendChild(card);
    });
}

function renderMoodToolbar(toolbar, key, config, bloqueo) {
    if (bloqueo.locked) {
        toolbar.innerHTML = `
            <div class="mood-lock-banner">
                🔒 Registro de hoy guardado. Disponible de nuevo en ${formatTiempoRestante(bloqueo.restanteMs)}.
            </div>
        `;
        return;
    }

    toolbar.innerHTML = `
        <button type="button" class="add-habit-btn mood-save-btn">💾 Guardar registro de hoy</button>
    `;

    toolbar.querySelector('.mood-save-btn').addEventListener('click', () => guardarRegistroSeccion(key));
}

async function guardarRegistroSeccion(key) {
    const config = MOOD_CONFIGS[key];
    const seleccion = _moodSelection[key];
    const ids = Object.keys(seleccion);
    if (ids.length === 0) return;

    const nowIso = new Date().toISOString();
    const fechaHoy = getFechaHoyISO();

    const rows = ids.map(id => ({
        [config.fkColumn]: Number(id),
        fecha: fechaHoy,
        valor: seleccion[id],
        created_at: nowIso,
    }));

    const { error } = await _supabase
        .from(config.regTable)
        .upsert(rows, { onConflict: `${config.fkColumn},fecha` });

    if (error) {
        console.error(`Error guardando ${config.regTable}:`, error.message);
        alert('Error al guardar el registro: ' + error.message);
        return;
    }

    localStorage.setItem(config.lockKey, nowIso);
    if (typeof config.afterSave === 'function') config.afterSave();
    loadMoodSection(key);
}

async function addMoodItem(key) {
    const config = MOOD_CONFIGS[key];
    const name = prompt(config.promptNew);
    if (!name || name.trim() === '') return;

    const { error } = await _supabase
        .from(config.logsTable)
        .insert([{ name: name.trim(), count: 0 }]);

    if (error) {
        alert('Error al guardar: ' + error.message);
    } else {
        loadMoodSection(key);
    }
}

async function editMoodItem(key, oldName, id) {
    const config = MOOD_CONFIGS[key];
    const newName = prompt('Editar nombre:', oldName);
    if (!newName || newName.trim() === '' || newName === oldName) return;

    const { error } = await _supabase
        .from(config.logsTable)
        .update({ name: newName.trim() })
        .eq('id', id);

    if (error) {
        alert('Error al editar: ' + error.message);
    } else {
        loadMoodSection(key);
    }
}

async function deleteMoodItem(key, name, id) {
    const config = MOOD_CONFIGS[key];
    const confirmDelete = confirm(`¿Deseas eliminar "${name}" y todo su historial de registros?`);
    if (!confirmDelete) return;

    await _supabase.from(config.regTable).delete().eq(config.fkColumn, id);

    const { error } = await _supabase
        .from(config.logsTable)
        .delete()
        .eq('id', id);

    if (error) {
        alert('Error al eliminar: ' + error.message);
    } else {
        delete _moodSelection[key][id];
        loadMoodSection(key);
    }
}

/* ==========================================
   WRAPPERS: mantienen los mismos nombres de función que usa el
   resto de la app (index.html con onclick="addOdio()", etc. y
   main.js con loadOdios()/loadSentimientos()).
   ========================================== */
function loadOdios() { return loadMoodSection('odios'); }
function addOdio() { return addMoodItem('odios'); }

function loadSentimientos() { return loadMoodSection('sentimientos'); }
function addSentimiento() { return addMoodItem('sentimientos'); }
