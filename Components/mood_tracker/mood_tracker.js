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

const HORAS_BLOQUEO_REGISTRO = 5;

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
        maxValue: 5,
        afterSave: () => { if (typeof loadEspejoDelAlma === 'function') loadEspejoDelAlma(); },
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
        maxValue: 10,
        afterSave: () => { if (typeof loadTopSentimientos === 'function') loadTopSentimientos(); },
    },
    loves: {
        logsTable: 'loves_logs',
        regTable: 'loves_registros',
        fkColumn: 'love_id',
        containerId: 'list-loves',
        lockKey: 'ikilife_lock_loves',
        colorVar: '#e0479e',
        cssClass: 'mood-card--love',
        promptNew: 'Nueva pasión o actividad que amas:',
        maxValue: 5,
        afterSave: () => {
            if (typeof loadTopLoves === 'function') loadTopLoves();
            if (typeof loadEspejoDelAlma === 'function') loadEspejoDelAlma();
        },
    },
};

// Estado en memoria de la selección actual (aún no guardada) por sección: { odios: {id: valor}, sentimientos: {id: valor}, loves: {id: valor} }
const _moodSelection = { odios: {}, sentimientos: {}, loves: {} };

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
    // El botón "Guardar registro de hoy" vive DENTRO de la misma fila
    // que "Add Pasión/Odio" (y el Historial SQL en Loves), en un slot
    // dedicado — ver [data-save-slot] en index.html — para que todo
    // quede organizado en una sola fila.
    const toolbar = wrapper.querySelector(`[data-save-slot="${key}"]`);
    if (!toolbar) return console.warn(`No existe el slot de guardado ([data-save-slot="${key}"]) para "${key}".`);

    const ultimos = await cargarUltimosRegistros(config.regTable, config.fkColumn);
    const bloqueo = calcularBloqueoSeccion(config.lockKey);

    // Inicializa la selección en memoria con el último valor guardado (o el
    // punto medio de la escala por defecto), solo si aún no hay nada
    // seleccionado para ese item en esta sesión.
    items.forEach(item => {
        if (!(item.id in _moodSelection[key])) {
            _moodSelection[key][item.id] = ultimos[item.id] ? ultimos[item.id].valor : Math.ceil(config.maxValue / 2);
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

        for (let n = 1; n <= config.maxValue; n++) {
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
            <div class="mood-lock-banner" title="Registro de hoy guardado. Disponible de nuevo en ${formatTiempoRestante(bloqueo.restanteMs)}.">
                🔒 Disponible en ${formatTiempoRestante(bloqueo.restanteMs)}
            </div>
        `;
        return;
    }

    toolbar.innerHTML = `
        <button type="button" class="add-habit-btn mood-save-btn" title="Guardar registro de hoy">💾 Guardar</button>
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

    // Upsert manual fila por fila para evitar el error de ON CONFLICT
    // cuando la tabla no tiene constraint UNIQUE exacto.
    for (const id of ids) {
        const fkValue = Number(id);
        const valor = seleccion[id];

        // 1. Intentar encontrar registro existente
        const { data: existente } = await _supabase
            .from(config.regTable)
            .select('id')
            .eq(config.fkColumn, fkValue)
            .eq('fecha', fechaHoy)
            .maybeSingle();

        if (existente) {
            // UPDATE
            const { error } = await _supabase
                .from(config.regTable)
                .update({ valor: valor, created_at: nowIso })
                .eq('id', existente.id);
            if (error) {
                console.error(`Error actualizando ${config.regTable}:`, error.message);
                alert('Error al guardar el registro: ' + error.message);
                return;
            }
        } else {
            // INSERT
            const { error } = await _supabase
                .from(config.regTable)
                .insert([{
                    [config.fkColumn]: fkValue,
                    fecha: fechaHoy,
                    valor: valor,
                    created_at: nowIso,
                }]);
            if (error) {
                console.error(`Error insertando en ${config.regTable}:`, error.message);
                alert('Error al guardar el registro: ' + error.message);
                return;
            }
        }
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

// Loves ahora usa el mismo motor que Odios/Sentimientos (barra de
// intensidad 1-5 registrada por día) en vez del contador acumulativo
// anterior. Requiere en Supabase la tabla nueva "loves_registros"
// (id, love_id, valor 1-5, fecha, created_at, UNIQUE(love_id, fecha)).
function loadLoves() { return loadMoodSection('loves'); }
function addLove() { return addMoodItem('loves'); }

/* ==========================================
   EL ESPEJO DEL ALMA
   ==========================================
   Componente del feed (debajo de la tarjeta de Hoy: state bar +
   frase) con dos barras: el promedio del ÚLTIMO valor registrado de
   cada item de Loves y de Odios (escala 1-5 cada una). Da una lectura
   rápida de cómo va el día / cómo terminó el último registro.
*/
function mensajeEspejoDelAlma(avgLove, avgOdio, hayDatos) {
    if (!hayDatos) return 'Aún no hay registros de Loves ni Odios para mostrar.';

    const diff = avgLove - avgOdio;
    if (diff >= 2) return '🌞 Vas muy bien — hoy pesan más tus amores que tus odios.';
    if (diff <= -2) return '🌧️ Día pesado — tus odios están pesando más de lo normal.';
    return '🙂 Día equilibrado entre lo que amas y lo que te incomoda.';
}

async function loadEspejoDelAlma() {
    const container = document.getElementById('espejo-alma-container');
    if (!container) return;

    const [ultimosLoves, ultimosOdios] = await Promise.all([
        cargarUltimosRegistros('loves_registros', 'love_id'),
        cargarUltimosRegistros('odios_registros', 'odio_id'),
    ]);

    const valoresLove = Object.values(ultimosLoves).map(r => r.valor);
    const valoresOdio = Object.values(ultimosOdios).map(r => r.valor);

    const avgLove = valoresLove.length ? valoresLove.reduce((a, b) => a + b, 0) / valoresLove.length : 0;
    const avgOdio = valoresOdio.length ? valoresOdio.reduce((a, b) => a + b, 0) / valoresOdio.length : 0;
    const hayDatos = valoresLove.length > 0 || valoresOdio.length > 0;

    const maxEscala = 5;
    const pctLove = Math.min((avgLove / maxEscala) * 100, 100);
    const pctOdio = Math.min((avgOdio / maxEscala) * 100, 100);

          container.innerHTML = `
        <div class="espejo-alma-card">
            <div class="espejo-alma-row">
                <div class="espejo-alma-label">❤️ Loves</div>
                <div class="ik-bar-track">
                    <div class="ik-bar-fill ik-bar-fill--love" style="width:${pctLove}%;"></div>
                </div>
                <div class="espejo-alma-value">${avgLove.toFixed(1)}</div>
            </div>
            <div class="espejo-alma-row">
                <div class="espejo-alma-label">💢 Odios</div>
                <div class="ik-bar-track">
                    <div class="ik-bar-fill ik-bar-fill--odio" style="width:${pctOdio}%;"></div>
                </div>
                <div class="espejo-alma-value">${avgOdio.toFixed(1)}</div>
            </div>
            <div class="espejo-alma-msg">${mensajeEspejoDelAlma(avgLove, avgOdio, hayDatos)}</div>
        </div>
    `;
}

/* ==========================================
   MIGRACIÓN OPCIONAL: copiar items de Sentimientos como cards
   iniciales en Loves (misma imagen/nombre, sin registros aún).
   No se ejecuta sola — llámala una vez desde la consola del
   navegador (migrarSentimientosALoves()) si quieres precargar Loves
   con los items que ya tienes en Sentimientos.
   ========================================== */
async function migrarSentimientosALoves() {
    const { data: sentimientos, error: errSent } = await _supabase
        .from('sentimientos_logs')
        .select('name, image_filename');
    if (errSent) return console.error('Error leyendo sentimientos_logs:', errSent.message);

    const { data: lovesExistentes, error: errLoves } = await _supabase
        .from('loves_logs')
        .select('name');
    if (errLoves) return console.error('Error leyendo loves_logs:', errLoves.message);

    const nombresExistentes = new Set((lovesExistentes || []).map(l => l.name.toLowerCase()));
    const nuevos = (sentimientos || [])
        .filter(s => !nombresExistentes.has(s.name.toLowerCase()))
        .map(s => ({ name: s.name, image_filename: s.image_filename }));

    if (nuevos.length === 0) {
        console.log('Nada que migrar: Loves ya tiene todos esos nombres.');
        return;
    }

    const { error } = await _supabase.from('loves_logs').insert(nuevos);
    if (error) {
        console.error('Error migrando a loves_logs:', error.message);
    } else {
        console.log(`Se copiaron ${nuevos.length} items de Sentimientos a Loves.`);
        if (typeof loadLoves === 'function') loadLoves();
    }
}

/* ==========================================
   TABS: LOVES / ODIOS DENTRO DE "SENTIMIENTOS"
   ==========================================
   Se unificaron las 3 vistas antiguas (Loves, Odios, Sentimientos)
   en una sola pantalla con 2 tabs para liberar espacio en el menú.
   Los items que antes vivían en "Sentimientos" ahora se gestionan
   como Loves (ver migrarSentimientosALoves() arriba).
   ========================================== */
const SENTIMIENTOS_SUBTAB_KEY = 'ikilife_sentimientos_subtab';

function switchSentimientosTab(sub, btn) {
    document.querySelectorAll('.sent-tab-btn').forEach(b => b.classList.remove('sent-tab-active'));
    const targetBtn = btn || document.querySelector(`.sent-tab-btn[data-sub="${sub}"]`);
    if (targetBtn) targetBtn.classList.add('sent-tab-active');

    const loveEl = document.getElementById('subview-loves-pasiones');
    const odioEl = document.getElementById('subview-odios-pasiones');
    if (loveEl) loveEl.classList.toggle('hidden', sub !== 'loves');
    if (odioEl) odioEl.classList.toggle('hidden', sub !== 'odios');

    localStorage.setItem(SENTIMIENTOS_SUBTAB_KEY, sub);
    if (sub === 'loves') loadLoves(); else loadOdios();
}

function initSentimientosTabs() {
    const saved = localStorage.getItem(SENTIMIENTOS_SUBTAB_KEY) === 'odios' ? 'odios' : 'loves';
    switchSentimientosTab(saved);
}