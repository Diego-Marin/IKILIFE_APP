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
   UTILIDADES DE FECHA (usadas también por El Espejo del Alma en main.js)
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
        afterSave: () => { if (typeof loadEspejoDelAlma === 'function') loadEspejoDelAlma(); },
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

/**
 * Guarda el registro de hoy para TODOS los items de la sección.
 *
 * OPTIMIZADO (2026-08-16): la versión anterior hacía, por cada item,
 * un SELECT y luego un UPDATE o INSERT, uno detrás de otro (await
 * dentro de un for). Con N items eso son hasta 2N round-trips
 * SECUENCIALES a Supabase — con 15-20 items en Odios/Loves, varios
 * segundos de espera.
 *
 * Ahora se hace UN solo SELECT para traer de una vez los registros de
 * HOY de todos los items (en vez de uno por item), y luego todos los
 * UPDATE/INSERT que hagan falta se disparan EN PARALELO con
 * Promise.all en vez de esperarlos uno por uno. El tiempo total pasa
 * de "suma de todas las latencias" a, aproximadamente, "la latencia
 * de la petición más lenta".
 */
async function guardarRegistroSeccion(key) {
    const config = MOOD_CONFIGS[key];
    const seleccion = _moodSelection[key];
    const ids = Object.keys(seleccion);
    if (ids.length === 0) return;

    const nowIso = new Date().toISOString();
    const fechaHoy = getFechaHoyISO();

    // 1. Un solo SELECT: qué items ya tienen registro guardado hoy.
    const { data: existentesHoy, error: errSelect } = await _supabase
        .from(config.regTable)
        .select(`id, ${config.fkColumn}`)
        .eq('fecha', fechaHoy);

    if (errSelect) {
        console.error(`Error consultando ${config.regTable}:`, errSelect.message);
        alert('Error al guardar el registro: ' + errSelect.message);
        return;
    }

    const idExistentePorFk = {};
    (existentesHoy || []).forEach(row => {
        idExistentePorFk[row[config.fkColumn]] = row.id;
    });

    // 2. Todas las escrituras (update o insert) se lanzan a la vez.
    const escrituras = ids.map(id => {
        const fkValue = Number(id);
        const valor = seleccion[id];
        const idExistente = idExistentePorFk[fkValue];

        if (idExistente) {
            return _supabase
                .from(config.regTable)
                .update({ valor: valor, created_at: nowIso })
                .eq('id', idExistente);
        }
        return _supabase
            .from(config.regTable)
            .insert([{
                [config.fkColumn]: fkValue,
                fecha: fechaHoy,
                valor: valor,
                created_at: nowIso,
            }]);
    });

    const resultados = await Promise.all(escrituras);
    const conError = resultados.find(r => r && r.error);
    if (conError) {
        console.error(`Error guardando en ${config.regTable}:`, conError.error.message);
        alert('Error al guardar el registro: ' + conError.error.message);
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
   frase) con tres barras, todas basadas en HISTÓRICO COMPLETO (no
   solo el último registro ni solo el día de hoy):
   
   - Loves:   promedio de TODOS los valores registrados alguna vez
              (loves_registros.valor), escala 1-5.
   - Odios:   promedio de TODOS los valores registrados alguna vez
              (odios_registros.valor), escala 1-5.
   - Hábitos: balance histórico REAL de cada hábito — para cada
              hábito se reconstruye su calendario completo (desde su
              primer registro hasta hoy) y un día cuenta como
              CUMPLIDO solo si hay fila is_completed = true para esa
              fecha exacta; cualquier otro caso (sin fila, o fila en
              false) cuenta como NO cumplido. Es una sola barra "de
              balance" con un segmento verde (% cumplido) y uno rojo
              (% no cumplido) uno al lado del otro.
   
   (Antes Loves/Odios usaban solo el ÚLTIMO valor de cada item, y
   Hábitos solo miraba el día de hoy. Cambiado el 2026-08-16 a
   petición explícita: leer la tendencia histórica completa da una
   foto más real que un solo día. El cálculo de Hábitos se corrigió
   una segunda vez el mismo día porque la primera versión solo
   contaba filas EXISTENTES en habit_logs, y como una fila solo se
   crea al tocar el checkbox, los días simplemente ignorados no
   sumaban en contra e inflaban el % a favor. Una TERCERA vez el mismo
   día se agregó, arriba de las 3 barras, una frase de "Foco de
   atención" que dice directamente cuál de las dos dimensiones
   [balance emocional / hábitos] necesita más atención ahora mismo —
   ver calcularFocoAtencion() más abajo — porque leer y comparar 3
   barras sin más contexto no era suficientemente claro de un vistazo.)
*/

/**
 * Promedio histórico de TODOS los registros de una tabla tipo
 * "*_registros". Reutilizable para cualquier tracker de intensidad.
 */
async function calcularPromedioHistorico(tableName) {
    const { data, error } = await _supabase.from(tableName).select('valor');
    if (error) {
        console.error(`Error calculando promedio histórico de ${tableName}:`, error.message);
        return { avg: 0, total: 0 };
    }
    if (!data || data.length === 0) return { avg: 0, total: 0 };

    const suma = data.reduce((acc, r) => acc + (r.valor || 0), 0);
    return { avg: suma / data.length, total: data.length };
}

/**
 * Balance MENSUAL de Loves vs Odios (reinicia cada mes).
 * Suma los valores de loves_registros y odios_registros del mes
 * vigente y devuelve el % que representa cada uno del total.
 */
async function calcularBalanceMensualLovesOdios() {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const inicioMes = `${yyyy}-${mm}-01`;
    // Antes esto era un "31" fijo, lo cual genera una fecha inválida
    // (ej. 2026-09-31) en cualquier mes con menos de 31 días — Supabase
    // rechaza esa fecha y la consulta vuelve vacía en silencio, por lo
    // que los registros nuevos de ese mes (Positivos/Negativos) nunca
    // se contaban. Ahora se calcula el último día real del mes.
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const finMes = `${yyyy}-${mm}-${String(ultimoDiaMes).padStart(2, '0')}`;

    const [lovesRes, odiosRes] = await Promise.all([
        _supabase.from('loves_registros').select('valor').gte('fecha', inicioMes).lte('fecha', finMes),
        _supabase.from('odios_registros').select('valor').gte('fecha', inicioMes).lte('fecha', finMes)
    ]);

    if (lovesRes.error) console.error('Error leyendo loves_registros del mes:', lovesRes.error.message);
    if (odiosRes.error) console.error('Error leyendo odios_registros del mes:', odiosRes.error.message);

    const loves = lovesRes.data;
    const odios = odiosRes.data;

    const sumLoves = (loves || []).reduce((a, r) => a + (Number(r.valor) || 0), 0);
    const sumOdios = (odios || []).reduce((a, r) => a + (Number(r.valor) || 0), 0);
    const totalRegistros = (loves || []).length + (odios || []).length;
    const totalPuntos = sumLoves + sumOdios;

    if (totalPuntos === 0) {
        return { lovesPct: 0, odiosPct: 0, sumLoves: 0, sumOdios: 0, total: 0 };
    }

    const lovesPct = Math.round((sumLoves / totalPuntos) * 100);
    return { lovesPct, odiosPct: 100 - lovesPct, sumLoves, sumOdios, total: totalRegistros };
}

/**
 * Progreso de HÁBITOS del DÍA DE HOY.
 * Consulta TODOS los hábitos únicos de la app y verifica cuántos
 * están marcados como completados hoy (independientemente de si
 * tienen fila creada o no: sin fila = pendiente).
 */
async function calcularHabitosHoy() {
    const { data: allHabits, error: err1 } = await _supabase
        .from('habit_logs')
        .select('habit_name');

    if (err1) {
        console.error('Error cargando hábitos:', err1.message);
        return { pct: 0, total: 0, done: 0, pending: 0 };
    }

    const uniqueHabits = [...new Set((allHabits || []).map(h => h.habit_name))];
    const total = uniqueHabits.length;
    if (total === 0) return { pct: 0, total: 0, done: 0, pending: 0 };

    const hoy = getFechaHoyISO();
    const { data: todayLogs, error: err2 } = await _supabase
        .from('habit_logs')
        .select('habit_name, is_completed')
        .eq('log_date', hoy);

    if (err2) {
        console.error('Error cargando hábitos de hoy:', err2.message);
        return { pct: 0, total, done: 0, pending: total };
    }

    const doneMap = {};
    (todayLogs || []).forEach(l => { doneMap[l.habit_name] = l.is_completed; });

    let done = 0;
    uniqueHabits.forEach(name => { if (doneMap[name] === true) done++; });
    const pending = total - done;
    const pct = Math.round((done / total) * 100);

    return { pct, total, done, pending };
}

/**
 * Balance histórico REAL de hábitos (mantiene por si se usa en otro lado).
 */
async function calcularBalanceHabitosHistorico() {
    const { data, error } = await _supabase.from('habit_logs').select('habit_name, log_date, is_completed');
    if (error) {
        console.error('Error calculando balance histórico de hábitos:', error.message);
        return { pctCumplido: 0, pctNoCumplido: 0, total: 0, cumplidos: 0 };
    }
    if (!data || data.length === 0) return { pctCumplido: 0, pctNoCumplido: 0, total: 0, cumplidos: 0 };

    const inicioPorHabito = {};
    const cumplidosSet = new Set();

    data.forEach(log => {
        const nombre = log.habit_name;
        if (!inicioPorHabito[nombre] || log.log_date < inicioPorHabito[nombre]) {
            inicioPorHabito[nombre] = log.log_date;
        }
        if (log.is_completed) cumplidosSet.add(`${nombre}|${log.log_date}`);
    });

    const hoyISO = getFechaHoyISO();
    let totalDiasPosibles = 0;
    Object.values(inicioPorHabito).forEach(fechaInicio => {
        totalDiasPosibles += diasEntreFechasISO(fechaInicio, hoyISO) + 1;
    });

    const totalCumplidos = cumplidosSet.size;
    if (totalDiasPosibles === 0) return { pctCumplido: 0, pctNoCumplido: 0, total: 0, cumplidos: 0 };

    const pctCumplido = Math.round((totalCumplidos / totalDiasPosibles) * 100);
    return { pctCumplido, pctNoCumplido: 100 - pctCumplido, total: totalDiasPosibles, cumplidos: totalCumplidos };
}

/** Cantidad de días completos entre dos fechas "YYYY-MM-DD". */
function diasEntreFechasISO(fechaInicioISO, fechaFinISO) {
    const [y1, m1, d1] = fechaInicioISO.split('-').map(Number);
    const [y2, m2, d2] = fechaFinISO.split('-').map(Number);
    const inicio = new Date(y1, m1 - 1, d1);
    const fin = new Date(y2, m2 - 1, d2);
    const msPorDia = 24 * 60 * 60 * 1000;
    return Math.round((fin - inicio) / msPorDia);
}

/**
 * FOCO DE ATENCIÓN: compara Balance Emocional del mes vs Hábitos de hoy.
 */
function calcularFocoAtencion({ lovesPct, odiosPct, hayDatosEmocionales, habitos }) {
    const dimensiones = [];

    if (hayDatosEmocionales) {
        dimensiones.push({
            area: 'emocional',
            score: lovesPct,
            detalle: odiosPct > lovesPct
                ? `tus odios (${odiosPct}%) dominan el balance emocional de este mes`
                : `tus loves (${lovesPct}%) lideran el balance emocional de este mes`,
        });
    }

    if (habitos.total > 0) {
        dimensiones.push({
            area: 'habitos',
            score: habitos.pct,
            detalle: `completaste el ${habitos.pct}% de tus hábitos hoy`,
        });
    }

    if (dimensiones.length === 0) {
        return { nivel: 'sinDatos', area: null, icon: '📭', texto: 'Aún no hay suficientes registros de Loves, Odios o Hábitos para calcular tu foco de atención.' };
    }

    dimensiones.sort((a, b) => a.score - b.score);
    const peor = dimensiones[0];

    if (peor.score >= 65) {
        return { nivel: 'bien', area: null, icon: '✅', texto: 'Vas bien en todos los frentes que estamos midiendo — sigue así.' };
    }

    const nombreArea = peor.area === 'habitos' ? 'Hábitos' : 'Balance emocional';
    const nivel = peor.score < 35 ? 'urgente' : 'moderado';
    const icon = nivel === 'urgente' ? '🔴' : '🟡';
    const detalle = peor.detalle.charAt(0).toUpperCase() + peor.detalle.slice(1);

    return { nivel, area: peor.area, icon, texto: `Foco de hoy: ${nombreArea}. ${detalle}.` };
}

/**
 * ==========================================
 * EL ESPEJO DEL ALMA — RENDER
 * ==========================================
 * · Balance Mes: barra split ❤️ Loves (rosa) vs 💢 Odios (rojo)
 * · Hábitos Hoy: barra split ✅ Hechos (verde) vs ⬜ Pendientes (rojo)
 */
async function loadEspejoDelAlma() {
    const container = document.getElementById('espejo-alma-container');
    if (!container) return;

    const [balanceMes, habitosHoy] = await Promise.all([
        calcularBalanceMensualLovesOdios(),
        calcularHabitosHoy(),
    ]);

    const hPctDone = habitosHoy.pct;
    const hPctPending = 100 - habitosHoy.pct;

    // Anillo SVG para "Hábitos de hoy" (r=32 → circunferencia ≈ 201.06).
    const RADIO = 32;
    const CIRCUNFERENCIA = 2 * Math.PI * RADIO;
    const offsetHabitos = CIRCUNFERENCIA - (hPctDone / 100) * CIRCUNFERENCIA;

    container.innerHTML = `
        <div class="espejo-alma-card">
            <div class="espejo-emo-card">
                <div class="espejo-emo-icon">❤️</div>
                <div class="espejo-emo-body">
                    <div class="espejo-emo-top">
                        <span class="espejo-emo-label">Balance emocional del mes</span>
                        <span class="espejo-emo-pct">${balanceMes.lovesPct}%</span>
                    </div>
                    <div class="espejo-emo-bar-track">
                        <div class="espejo-emo-bar-fill" style="width:${balanceMes.lovesPct}%;"></div>
                    </div>
                    <div class="espejo-emo-stats">
                        ${balanceMes.total > 0
                            ? `<span class="espejo-emo-chip espejo-emo-chip--love">❤️ ${balanceMes.sumLoves} pts</span>
                               <span class="espejo-emo-chip espejo-emo-chip--odio">💢 ${balanceMes.sumOdios} pts</span>
                               <span class="espejo-emo-chip">${balanceMes.total} registros</span>`
                            : '<span class="espejo-emo-chip">Sin registros este mes</span>'}
                    </div>
                </div>
            </div>

            <div class="espejo-section espejo-section--habitos espejo-section--ring">
                <div class="espejo-habitos-texts">
                    <div class="espejo-habitos-title">Hábitos de hoy</div>
                    <div class="espejo-habitos-count">
                        <span class="espejo-habitos-count-done">${habitosHoy.done}</span>/${habitosHoy.total} completados
                    </div>
                    <div class="espejo-bar-track espejo-habitos-bar-track">
                        <div class="espejo-bar-fill espejo-bar-fill--habitos" style="width:${hPctDone}%;"></div>
                    </div>
                </div>
                <div class="espejo-ring-wrap">
                    <svg class="espejo-ring-svg" viewBox="0 0 72 72">
                        <circle class="espejo-ring-track" cx="36" cy="36" r="${RADIO}"></circle>
                        <circle class="espejo-ring-fill" cx="36" cy="36" r="${RADIO}"
                            stroke-dasharray="${CIRCUNFERENCIA}" stroke-dashoffset="${offsetHabitos}"></circle>
                    </svg>
                    <div class="espejo-ring-center">
                        <span class="espejo-ring-pct">${hPctDone}%</span>
                    </div>
                </div>
            </div>
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
   NOTA: las antiguas tabs internas "Loves / Odios" dentro de
   "Sentimientos" se eliminaron. Loves ahora vive en su propia pestaña
   principal de Camino (usa loadLoves() directamente); Sentimientos
   quedó dedicado solo a Odios (usa loadOdios() directamente).
   ========================================== */