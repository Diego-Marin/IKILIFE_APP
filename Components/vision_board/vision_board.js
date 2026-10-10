/**
 * ==========================================
 * COMPONENTE: VISION BOARD (Metas)
 * ==========================================
 * Se abre desde el botón del header (junto al de Brain Dump) como una
 * SUBVISTA dentro de la app (igual que Export Center): el header de
 * la app sigue visible y hay un botón de volver, sin overlay.
 *
 * Cada meta es un TAB en la parte de arriba; el botón "+" va al final
 * de la fila de tabs. Al tocar un tab se abre, debajo, un feed de
 * imágenes estilo Pinterest (masonry, 2 columnas) con las fotos de
 * inspiración de esa meta.
 *
 * Para volver atrás se usa la barra inferior o la tecla Esc. Doble clic
 * en un tab = renombrar; clic derecho = eliminar.
 *
 * PASOS Y NIVEL DE CADA META
 * Bajo los tabs hay una línea discreta con el nivel de la meta; al
 * tocarla se despliegan sus pasos (por defecto está cerrada para que
 * las imágenes sean lo primero que ves). Hay tres tipos de paso, cada
 * uno se mide a su manera:
 *   - Una vez (ej. sacar papeles): se chulea y queda hecho = 1 logro.
 *   - Se repite (todos los días o N veces por semana): se chulea por
 *     día (L M M J V S D). Cada SEMANA en que cumples la frecuencia
 *     = 1 logro.
 *   - Cantidad (ej. juntar $5.000.000): fijas la meta y vas sumando
 *     aportes. Cada 25% alcanzado = 1 logro (4 por paso).
 * Los logros de todos los pasos suben el NIVEL de la meta: el nivel n
 * empieza en (n-1)² logros (1, 4, 9, 16...). Al subir de nivel el
 * indicador te lo celebra un momento. "Editar" muestra los botones
 * para renombrar/eliminar pasos y corregir el total de una cantidad.
 *
 * TABLAS REQUERIDAS EN SUPABASE:
 *   CREATE TABLE vision_metas (
 *     id bigint generated always as identity PRIMARY KEY,
 *     name text NOT NULL,
 *     linked_tag text,
 *     created_at timestamptz DEFAULT now()
 *   );
 *
 *   -- NUEVA: una meta ahora puede tener VARIAS imágenes (el feed
 *   -- tipo Pinterest), no solo una.
 *   CREATE TABLE vision_meta_images (
 *     id bigint generated always as identity PRIMARY KEY,
 *     meta_id bigint REFERENCES vision_metas(id) ON DELETE CASCADE,
 *     image_filename text NOT NULL,
 *     created_at timestamptz DEFAULT now()
 *   );
 *
 *   -- NUEVAS: pasos de cada meta y su registro diario.
 *   CREATE TABLE vision_tareas (
 *     id bigint generated always as identity PRIMARY KEY,
 *     meta_id bigint NOT NULL REFERENCES vision_metas(id) ON DELETE CASCADE,
 *     title text NOT NULL,
 *     tipo text NOT NULL DEFAULT 'unica',   -- 'unica' | 'repetida' | 'cantidad'
 *     veces_semana int,                     -- repetida: 7 = diaria, 1-6 = N por semana
 *     done_at timestamptz,                  -- unica: cuándo se completó
 *     meta_cantidad numeric,                -- cantidad: lo que quieres alcanzar
 *     actual numeric DEFAULT 0,             -- cantidad: lo que llevas
 *     unidad text,                          -- cantidad: '$', 'km', 'páginas'...
 *     created_at timestamptz DEFAULT now()
 *   );
 *
 *   CREATE TABLE vision_tarea_logs (
 *     id bigint generated always as identity PRIMARY KEY,
 *     tarea_id bigint NOT NULL REFERENCES vision_tareas(id) ON DELETE CASCADE,
 *     fecha date NOT NULL,
 *     created_at timestamptz DEFAULT now(),
 *     UNIQUE (tarea_id, fecha)
 *   );
 *   (Si usas RLS en tus otras tablas, agrega la misma política aquí.)
 *
 *   -- Si vision_tareas ya existía (sin los pasos de tipo cantidad):
 *   ALTER TABLE vision_tareas
 *     ADD COLUMN IF NOT EXISTS meta_cantidad numeric,
 *     ADD COLUMN IF NOT EXISTS actual numeric DEFAULT 0,
 *     ADD COLUMN IF NOT EXISTS unidad text;
 *
 *   -- Ya no se usa (vínculo hábito ↔ meta, versión anterior):
 *   --   DROP TABLE IF EXISTS vision_habit_links;
 *
 * Si la tabla vision_metas ya existía de antes con "image_filename"
 * (versión de una sola imagen por meta), esa columna se puede dejar
 * como está (ya no se usa) o eliminarse — no rompe nada:
 *   ALTER TABLE vision_metas DROP COLUMN IF EXISTS image_filename;
 *
 * USO: cargar después de main.js y de mood_tracker.js (usa _supabase,
 * getFechaHoyISO — definida en mood_tracker.js).
 */
(function () {
    let _loaded = false;

    // Estado en memoria: metas cargadas, imágenes por meta y tab activo.
    let _metas = [];
    let _imagesByMeta = {}; // { [metaId]: [{id, image_filename}, ...] }
    let _activeMetaId = null;

    // Pasos de cada meta.
    const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const NIVELES = ['Semilla', 'Brote', 'Raíz', 'Tallo', 'Hoja', 'Rama', 'Árbol', 'Bosque'];
    let _tareas = [];                // filas de vision_tareas (todas las metas)
    let _logs = {};                  // { [tareaId]: Set('YYYY-MM-DD') } solo repetidas
    let _tareasDisponibles = true;   // false si faltan las tablas
    let _open = false;               // panel de pasos desplegado
    let _editMode = false;           // muestra renombrar / eliminar
    let _formOpen = false;
    let _draft = { title: '', freq: 'unica', meta: '', unidad: '$' };
    let _levelUp = null;             // { metaId, text } aviso temporal de nivel
    let _levelUpTimer = null;

    function esc(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function buildSkeleton() {
        const root = document.getElementById('vision-board-root');
        if (!root) return null;

        root.innerHTML = `
            <div class="vision-tabs-bar">
                <div class="vision-tabs" id="vision-tabs"></div>
            </div>
            <div class="vision-panel" id="vision-meta-panel"></div>
            <div class="vision-feed" id="vision-feed"></div>
        `;

        const panel = root.querySelector('#vision-meta-panel');
        panel.addEventListener('click', onPanelClick);
        panel.addEventListener('input', onPanelInput);
        panel.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.id === 'vision-add-title') {
                e.preventDefault();
                submitNuevoPaso();
            }
        });

        return root;
    }

    /* ==========================================
       CARGA PRINCIPAL: metas + TODAS sus imágenes
       ==========================================
       Se trae todo de una vez (metas e imágenes de TODAS las metas
       agrupadas por meta_id) para que
       cambiar de tab sea instantáneo (sin ir a la red cada vez que
       se toca un tab distinto).
    */
    async function loadVisionMetas() {
        const tabsEl = document.getElementById('vision-tabs');
        if (!tabsEl) return;

        const { data: metas, error } = await _supabase
            .from('vision_metas')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) return console.error('Error cargando vision_metas:', error.message);

        _metas = metas || [];

        const metaIds = _metas.map(m => m.id);
        let images = [];
        if (metaIds.length > 0) {
            const { data: imagesData, error: errImg } = await _supabase
                .from('vision_meta_images')
                .select('*')
                .in('meta_id', metaIds)
                .order('created_at', { ascending: false });
            if (errImg) console.error('Error cargando vision_meta_images:', errImg.message);
            images = imagesData || [];
        }

        _imagesByMeta = {};
        metaIds.forEach(id => { _imagesByMeta[id] = []; });
        images.forEach(img => {
            if (!_imagesByMeta[img.meta_id]) _imagesByMeta[img.meta_id] = [];
            _imagesByMeta[img.meta_id].push(img);
        });

        // Mantiene el tab activo si sigue existiendo; si no, elige el
        // primero (o ninguno si ya no hay metas).
        if (!_activeMetaId || !_metas.some(m => m.id === _activeMetaId)) {
            _activeMetaId = _metas.length > 0 ? _metas[0].id : null;
        }

        renderTabs();
        renderFeed();
        renderPanel();   // primero lo que ya se sabe, para que no se vea vacío

        await loadTareas();
        renderPanel();
    }

    function renderTabs() {
        const tabsEl = document.getElementById('vision-tabs');
        if (!tabsEl) return;

        tabsEl.innerHTML = '';

        _metas.forEach(meta => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'vision-tab-btn' + (meta.id === _activeMetaId ? ' vision-tab-active' : '');
            btn.dataset.metaId = meta.id;
            btn.textContent = meta.name;
            btn.addEventListener('click', () => switchVisionMetaTab(meta.id));
            btn.addEventListener('dblclick', () => editVisionMetaName(meta.id, meta.name));
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                deleteVisionMeta(meta.id, meta.name);
            });
            tabsEl.appendChild(btn);
        });

        // Botón "+" al final de la fila de tabs.
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.id = 'vision-add-btn';
        addBtn.className = 'vision-tab-add';
        addBtn.setAttribute('aria-label', 'Agregar meta');
        addBtn.title = 'Agregar una nueva meta';
        addBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        `;
        addBtn.addEventListener('click', addVisionMeta);
        tabsEl.appendChild(addBtn);
    }

    window.switchVisionMetaTab = function (id) {
        if (_activeMetaId === id) return;
        _activeMetaId = id;
        document.querySelectorAll('.vision-tab-btn').forEach(b => {
            b.classList.toggle('vision-tab-active', Number(b.dataset.metaId) === id);
        });
        _formOpen = false;
        _editMode = false;
        renderPanel();
        renderFeed();
    };

    /* ==========================================
       FEED ESTILO PINTEREST (masonry de 2 columnas)
       ==========================================
    */
    function renderFeed() {
        const feedEl = document.getElementById('vision-feed');
        if (!feedEl) return;

        if (!_activeMetaId) {
            feedEl.innerHTML = '<div class="vision-feed-empty">Aún no tienes metas. Toca "+" para crear la primera.</div>';
            return;
        }

        const imagenes = _imagesByMeta[_activeMetaId] || [];
        feedEl.innerHTML = '';

        if (imagenes.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'vision-feed-empty';
            empty.textContent = 'Todavía no hay imágenes en el feed de esta meta. Agrega fotos que te inspiren.';
            feedEl.appendChild(empty);
        } else {
            imagenes.forEach(img => {
                const localImagePath = `assets/images/${img.image_filename}`;
                const tile = document.createElement('div');
                tile.className = 'vision-feed-item';
                tile.innerHTML = `<img src="${localImagePath}" class="vision-feed-img" onerror="handleImgFallback(this)">`;
                tile.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    deleteVisionImage(img.id, _activeMetaId);
                });
                feedEl.appendChild(tile);
            });
        }

        // El tile "Agregar imagen" va AL FINAL del feed (como el
        // clásico botón "+" al final de un tablero Pinterest), no
        // antes de las fotos ya guardadas.
        const addTile = document.createElement('button');
        addTile.type = 'button';
        addTile.className = 'vision-feed-add';
        addTile.title = 'Agregar imagen a esta meta';
        addTile.innerHTML = `
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Agregar imagen</span>
        `;
        addTile.addEventListener('click', () => addVisionImage(_activeMetaId));
        feedEl.appendChild(addTile);
    }

    /* ==========================================
       PASOS Y NIVEL DE LA META
       ========================================== */
    function toISO(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function hoyISO() {
        return (typeof getFechaHoyISO === 'function') ? getFechaHoyISO() : toISO(new Date());
    }

    // Lunes de la semana a la que pertenece una fecha 'YYYY-MM-DD'.
    function lunesDe(iso) {
        const [y, m, d] = iso.split('-').map(Number);
        const fecha = new Date(y, m - 1, d);
        const dia = fecha.getDay() === 0 ? 7 : fecha.getDay();
        fecha.setDate(fecha.getDate() - dia + 1);
        return toISO(fecha);
    }

    // Lunes a domingo de la semana actual.
    function fechasDeLaSemana() {
        const fechas = [];
        const d = new Date(lunesDe(hoyISO()) + 'T00:00:00');
        for (let i = 0; i < 7; i++) {
            fechas.push(toISO(d));
            d.setDate(d.getDate() + 1);
        }
        return fechas;
    }

    // Acepta "1.200.000", "1,5", "1500"... (en es-CO el punto separa miles).
    function parseNumero(texto) {
        let t = String(texto == null ? '' : texto).replace(/[^\d.,-]/g, '');
        if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
        else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
        return parseFloat(t);
    }

    function fmtCantidad(n, unidad) {
        const txt = (Number(n) || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });
        if (unidad === '$') return `$${txt}`;
        return unidad ? `${txt} ${unidad}` : txt;
    }

    async function loadTareas() {
        const { data, error } = await _supabase
            .from('vision_tareas')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            _tareasDisponibles = false;
            _tareas = [];
            _logs = {};
            return;
        }

        _tareasDisponibles = true;
        _tareas = data || [];
        _logs = {};

        const ids = _tareas.filter(t => t.tipo === 'repetida').map(t => t.id);
        ids.forEach(id => { _logs[id] = new Set(); });
        if (ids.length === 0) return;

        const PAGE = 1000;
        for (let from = 0; ; from += PAGE) {
            const { data: logs, error: errLogs } = await _supabase
                .from('vision_tarea_logs')
                .select('tarea_id, fecha')
                .in('tarea_id', ids)
                .order('id', { ascending: true })
                .range(from, from + PAGE - 1);
            if (errLogs) {
                console.error('Error cargando vision_tarea_logs:', errLogs.message);
                break;
            }
            (logs || []).forEach(l => {
                if (!_logs[l.tarea_id]) _logs[l.tarea_id] = new Set();
                _logs[l.tarea_id].add(l.fecha);
            });
            if (!logs || logs.length < PAGE) break;
        }
    }

    /* ---------- Logros y nivel ---------- */
    // Semanas (lunes a domingo) en las que se cumplió la frecuencia.
    function semanasCumplidas(t) {
        const set = _logs[t.id];
        if (!set || set.size === 0) return 0;
        const veces = t.veces_semana || 7;
        const porSemana = {};
        set.forEach(f => {
            const k = lunesDe(f);
            porSemana[k] = (porSemana[k] || 0) + 1;
        });
        return Object.values(porSemana).filter(n => n >= veces).length;
    }

    function logrosDe(t) {
        if (t.tipo === 'repetida') return semanasCumplidas(t);
        if (t.tipo === 'cantidad') {
            const meta = Number(t.meta_cantidad) || 0;
            if (meta <= 0) return 0;
            return Math.min(4, Math.floor(((Number(t.actual) || 0) / meta) * 4 + 1e-9));
        }
        return t.done_at ? 1 : 0;
    }

    function pasoCompleto(t) {
        if (t.tipo === 'repetida') return false;   // nunca "termina"
        if (t.tipo === 'cantidad') return (Number(t.meta_cantidad) || 0) > 0 && (Number(t.actual) || 0) >= Number(t.meta_cantidad);
        return !!t.done_at;
    }

    // El nivel n empieza en (n-1)² logros: 0, 1, 4, 9, 16...
    function calcNivel(logros) {
        const n = Math.floor(Math.sqrt(logros)) + 1;
        const base = (n - 1) ** 2;
        const siguiente = n ** 2;
        return {
            nivel: n,
            nombre: NIVELES[Math.min(n - 1, NIVELES.length - 1)],
            pct: Math.round(((logros - base) / (siguiente - base)) * 100),
            faltan: siguiente - logros,
        };
    }

    function infoMeta(metaId) {
        const mias = _tareas.filter(t => t.meta_id === metaId);
        const logros = mias.reduce((acc, t) => acc + logrosDe(t), 0);
        const finitos = mias.filter(t => t.tipo !== 'repetida');
        return {
            mias,
            logros,
            completa: finitos.length > 0 && finitos.every(pasoCompleto),
            ...calcNivel(logros),
        };
    }

    // Si tras un cambio la meta subió de nivel, lo celebra un momento.
    function avisarSiSubio(metaId, nivelAntes) {
        const ahora = infoMeta(metaId);
        if (ahora.nivel > nivelAntes) {
            _levelUp = { metaId, text: `¡Nivel ${ahora.nivel}: ${ahora.nombre}!` };
            clearTimeout(_levelUpTimer);
            _levelUpTimer = setTimeout(() => {
                _levelUp = null;
                renderPanel();
            }, 3500);
        }
    }

    /* ==========================================
       PANEL DE LA META ACTIVA
       ========================================== */
    function frecuenciaTexto(veces) {
        if (veces >= 7) return 'Todos los días';
        return veces === 1 ? '1 vez por semana' : `${veces} veces por semana`;
    }

    function tituloHtml(t) {
        return _editMode
            ? `<span class="vision-step-title vision-step-title--editable" data-action="edit" data-id="${t.id}" title="Editar">${esc(t.title)}</span>`
            : `<span class="vision-step-title">${esc(t.title)}</span>`;
    }

    function borrarHtml(t) {
        return _editMode
            ? `<button type="button" class="vision-step-del" data-action="delete" data-id="${t.id}" aria-label="Eliminar paso" title="Eliminar">×</button>`
            : '';
    }

    function renderPaso(t) {
        const hecho = !!t.done_at;
        return `
            <li class="vision-step${hecho ? ' vision-step--done' : ''}">
                <button type="button" class="vision-check${hecho ? ' on' : ''}" data-action="toggle-unica" data-id="${t.id}"
                    aria-pressed="${hecho}" aria-label="${hecho ? 'Desmarcar' : 'Marcar'} paso">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"
                        stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
                ${tituloHtml(t)}
                ${borrarHtml(t)}
            </li>`;
    }

    function renderRepetido(t) {
        const set = _logs[t.id] || new Set();
        const semana = fechasDeLaSemana();
        const hoy = hoyISO();
        const veces = t.veces_semana || 7;
        const estaSemana = semana.filter(f => f <= hoy && set.has(f)).length;

        const chips = semana.map((fecha, i) => {
            const futuro = fecha > hoy;
            const clases = 'vision-day-chip'
                + (set.has(fecha) ? ' on' : '')
                + (fecha === hoy ? ' today' : '')
                + (futuro ? ' future' : '');
            return `<button type="button" class="${clases}" data-action="toggle-dia" data-id="${t.id}" data-fecha="${fecha}"
                ${futuro ? 'disabled' : ''} aria-pressed="${set.has(fecha)}">${DIAS[i]}</button>`;
        }).join('');

        return `
            <li class="vision-rep">
                <div class="vision-row-top">
                    ${tituloHtml(t)}
                    <span class="vision-row-side${estaSemana >= veces ? ' vision-row-side--ok' : ''}" title="${frecuenciaTexto(veces)}">${estaSemana}/${veces}</span>
                    ${borrarHtml(t)}
                </div>
                <div class="vision-rep-days">${chips}</div>
            </li>`;
    }

    function renderCantidad(t) {
        const meta = Number(t.meta_cantidad) || 0;
        const actual = Number(t.actual) || 0;
        const pct = meta > 0 ? Math.min(100, Math.round((actual / meta) * 100)) : 0;
        const u = t.unidad || '';

        return `
            <li class="vision-qty">
                <div class="vision-row-top">
                    ${tituloHtml(t)}
                    ${borrarHtml(t)}
                </div>
                <div class="vision-qty-line">
                    <span class="vision-qty-amount">${esc(fmtCantidad(actual, u))} <span class="vision-qty-of">de ${esc(fmtCantidad(meta, u))}</span></span>
                    ${_editMode
                        ? `<button type="button" class="vision-link-btn" data-action="set-total" data-id="${t.id}">Corregir total</button>`
                        : `<button type="button" class="vision-link-btn vision-link-btn--accent" data-action="aportar" data-id="${t.id}">+ Aportar</button>`}
                </div>
                <div class="ik-bar-track vision-qty-bar"><div class="ik-bar-fill ik-bar-fill--green" style="width:${pct}%;"></div></div>
            </li>`;
    }

    function renderForm() {
        const opciones = [
            ['unica', 'Una sola vez'],
            ['7', 'Todos los días'],
            ['1', '1 vez por semana'],
            ['2', '2 veces por semana'],
            ['3', '3 veces por semana'],
            ['4', '4 veces por semana'],
            ['5', '5 veces por semana'],
            ['6', '6 veces por semana'],
            ['cantidad', 'Alcanzar una cantidad'],
        ].map(([v, txt]) => `<option value="${v}"${_draft.freq === v ? ' selected' : ''}>${txt}</option>`).join('');

        const extra = _draft.freq === 'cantidad' ? `
            <div class="vision-add-extra">
                <input type="text" id="vision-add-meta" class="vision-add-input" inputmode="decimal" autocomplete="off"
                    placeholder="Meta, ej. 5.000.000" value="${esc(_draft.meta)}" aria-label="Cantidad que quieres alcanzar">
                <input type="text" id="vision-add-unidad" class="vision-add-input vision-add-unit" maxlength="12" autocomplete="off"
                    placeholder="Unidad" value="${esc(_draft.unidad)}" aria-label="Unidad (por ejemplo $ o km)">
            </div>` : '';

        return `
            <div class="vision-add-form">
                <input type="text" id="vision-add-title" class="vision-add-input" maxlength="120"
                    placeholder="Ej. Sacar los papeles" value="${esc(_draft.title)}" autocomplete="off">
                <select id="vision-add-freq" class="vision-add-select" aria-label="Tipo de paso">${opciones}</select>
                ${extra}
                <div class="vision-add-actions">
                    <button type="button" class="vision-add-submit" data-action="add-submit">Agregar</button>
                    <button type="button" class="vision-add-cancel" data-action="add-cancel">Listo</button>
                </div>
            </div>`;
    }

    function renderPanel() {
        const el = document.getElementById('vision-meta-panel');
        if (!el) return;

        const meta = _metas.find(m => m.id === _activeMetaId);
        if (!meta) {
            el.innerHTML = '';
            el.style.display = 'none';
            return;
        }
        el.style.display = '';

        if (!_tareasDisponibles) {
            el.innerHTML = `<div class="vision-panel-note">Para agregar pasos falta crear las tablas <strong>vision_tareas</strong> y <strong>vision_tarea_logs</strong> en Supabase. El SQL está al inicio de vision_board.js.</div>`;
            return;
        }

        const info = infoMeta(meta.id);
        const subio = _levelUp && _levelUp.metaId === meta.id;

        const etiqueta = subio
            ? `<span class="vision-panel-level vision-panel-level--up">${esc(_levelUp.text)}</span>`
            : `<span class="vision-panel-level">Nivel ${info.nivel}<span class="vision-panel-level-name">${info.nombre}</span></span>`;

        const cabecera = `
            <button type="button" class="vision-panel-head" data-action="toggle-panel" aria-expanded="${_open}">
                ${etiqueta}
                <span class="ik-bar-track vision-panel-bar"><span class="ik-bar-fill ik-bar-fill--green" style="width:${info.pct}%;"></span></span>
                <svg class="vision-panel-chev${_open ? ' open' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>`;

        if (!_open) {
            el.innerHTML = cabecera;
            return;
        }

        const nota = info.mias.length === 0
            ? 'Agrega pasos: cosas que haces una vez, que repites cada semana o una cantidad por juntar.'
            : `${info.logros} ${info.logros === 1 ? 'logro' : 'logros'}, faltan ${info.faltan} para el nivel ${info.nivel + 1}.${info.completa ? ' Todos los pasos listos.' : ''}`;

        const orden = [...info.mias.filter(t => !pasoCompleto(t)), ...info.mias.filter(pasoCompleto)];
        const lista = orden.length > 0
            ? `<ul class="vision-list">${orden.map(t =>
                t.tipo === 'repetida' ? renderRepetido(t) : t.tipo === 'cantidad' ? renderCantidad(t) : renderPaso(t)
            ).join('')}</ul>`
            : '';

        const acciones = _formOpen ? renderForm() : `
            <div class="vision-actions">
                <button type="button" class="vision-link-btn vision-link-btn--accent" data-action="show-form">+ Agregar paso</button>
                ${info.mias.length > 0
                    ? `<button type="button" class="vision-link-btn" data-action="toggle-edit">${_editMode ? 'Listo' : 'Editar'}</button>`
                    : ''}
            </div>`;

        el.innerHTML = `
            ${cabecera}
            <div class="vision-panel-body">
                <div class="vision-panel-note">${nota}</div>
                ${lista}
                ${acciones}
            </div>`;
    }

    function onPanelInput(e) {
        switch (e.target.id) {
            case 'vision-add-title': _draft.title = e.target.value; break;
            case 'vision-add-meta': _draft.meta = e.target.value; break;
            case 'vision-add-unidad': _draft.unidad = e.target.value; break;
            case 'vision-add-freq':
                _draft.freq = e.target.value;
                renderPanel();   // muestra u oculta los campos de cantidad
                break;
        }
    }

    async function onPanelClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = btn.dataset.id ? Number(btn.dataset.id) : null;

        switch (btn.dataset.action) {
            case 'toggle-panel':
                _open = !_open;
                if (!_open) { _formOpen = false; _editMode = false; }
                return renderPanel();
            case 'toggle-edit':
                _editMode = !_editMode;
                return renderPanel();
            case 'toggle-unica': return toggleUnica(id);
            case 'toggle-dia': return toggleDia(id, btn.dataset.fecha);
            case 'aportar': return aportar(id);
            case 'set-total': return corregirTotal(id);
            case 'edit': return editarPaso(id);
            case 'delete': return eliminarPaso(id);
            case 'show-form':
                _formOpen = true;
                renderPanel();
                return document.getElementById('vision-add-title')?.focus();
            case 'add-cancel':
                _formOpen = false;
                return renderPanel();
            case 'add-submit':
                return submitNuevoPaso();
        }
    }

    async function submitNuevoPaso() {
        const title = (_draft.title || '').trim();
        if (!title || !_activeMetaId) return;

        const nivelAntes = infoMeta(_activeMetaId).nivel;
        const fila = { meta_id: _activeMetaId, title };

        if (_draft.freq === 'cantidad') {
            const meta = parseNumero(_draft.meta);
            if (!(meta > 0)) {
                alert('Escribe la cantidad que quieres alcanzar (un número mayor a 0).');
                return;
            }
            fila.tipo = 'cantidad';
            fila.meta_cantidad = meta;
            fila.actual = 0;
            fila.unidad = (_draft.unidad || '').trim() || null;
        } else if (_draft.freq === 'unica') {
            fila.tipo = 'unica';
            fila.veces_semana = null;
        } else {
            fila.tipo = 'repetida';
            fila.veces_semana = Number(_draft.freq);
        }

        const { data, error } = await _supabase.from('vision_tareas').insert([fila]).select();
        if (error) {
            alert('Error al guardar el paso: ' + error.message);
            return;
        }

        if (data && data[0]) {
            _tareas.push(data[0]);
            if (fila.tipo === 'repetida') _logs[data[0].id] = new Set();
        }

        // Se queda abierto para agregar varios pasos seguidos.
        _draft.title = '';
        _draft.meta = '';
        avisarSiSubio(_activeMetaId, nivelAntes);
        renderPanel();
        document.getElementById('vision-add-title')?.focus();
    }

    async function toggleUnica(id) {
        const t = _tareas.find(x => x.id === id);
        if (!t) return;

        const nivelAntes = infoMeta(t.meta_id).nivel;
        const anterior = t.done_at;
        t.done_at = anterior ? null : new Date().toISOString();
        avisarSiSubio(t.meta_id, nivelAntes);
        renderPanel();

        const { error } = await _supabase.from('vision_tareas').update({ done_at: t.done_at }).eq('id', id);
        if (error) {
            t.done_at = anterior;
            _levelUp = null;
            renderPanel();
            alert('Error al actualizar el paso: ' + error.message);
        }
    }

    async function toggleDia(id, fecha) {
        const t = _tareas.find(x => x.id === id);
        if (!t) return;

        if (!_logs[id]) _logs[id] = new Set();
        const set = _logs[id];
        const estaba = set.has(fecha);

        const nivelAntes = infoMeta(t.meta_id).nivel;
        if (estaba) set.delete(fecha); else set.add(fecha);
        avisarSiSubio(t.meta_id, nivelAntes);
        renderPanel();

        const consulta = estaba
            ? _supabase.from('vision_tarea_logs').delete().eq('tarea_id', id).eq('fecha', fecha)
            : _supabase.from('vision_tarea_logs').insert([{ tarea_id: id, fecha }]);
        const { error } = await consulta;

        if (error) {
            if (estaba) set.add(fecha); else set.delete(fecha);
            _levelUp = null;
            renderPanel();
            alert('Error al registrar el día: ' + error.message);
        }
    }

    async function setActual(t, valor) {
        const nivelAntes = infoMeta(t.meta_id).nivel;
        const anterior = t.actual;
        t.actual = valor;
        avisarSiSubio(t.meta_id, nivelAntes);
        renderPanel();

        const { error } = await _supabase.from('vision_tareas').update({ actual: valor }).eq('id', t.id);
        if (error) {
            t.actual = anterior;
            _levelUp = null;
            renderPanel();
            alert('Error al guardar la cantidad: ' + error.message);
        }
    }

    async function aportar(id) {
        const t = _tareas.find(x => x.id === id);
        if (!t) return;

        const txt = prompt(`¿Cuánto sumas a "${t.title}"? (con un número negativo se resta)`, '');
        if (txt === null) return;

        const n = parseNumero(txt);
        if (!Number.isFinite(n) || n === 0) {
            if (txt.trim() !== '') alert('Escribe un número válido.');
            return;
        }
        await setActual(t, Math.max(0, (Number(t.actual) || 0) + n));
    }

    async function corregirTotal(id) {
        const t = _tareas.find(x => x.id === id);
        if (!t) return;

        const txt = prompt(`Total acumulado de "${t.title}":`, String(Number(t.actual) || 0));
        if (txt === null) return;

        const n = parseNumero(txt);
        if (!Number.isFinite(n) || n < 0) {
            alert('Escribe un número válido (0 o mayor).');
            return;
        }
        await setActual(t, n);
    }

    async function editarPaso(id) {
        const t = _tareas.find(x => x.id === id);
        if (!t) return;

        const nuevo = prompt('Editar paso:', t.title);
        if (nuevo === null || nuevo.trim() === '' || nuevo.trim() === t.title) return;

        const { error } = await _supabase.from('vision_tareas').update({ title: nuevo.trim() }).eq('id', id);
        if (error) {
            alert('Error al editar: ' + error.message);
            return;
        }
        t.title = nuevo.trim();
        renderPanel();
    }

    async function eliminarPaso(id) {
        const t = _tareas.find(x => x.id === id);
        if (!t) return;
        if (!confirm(`¿Eliminar el paso "${t.title}"${t.tipo !== 'unica' ? ' y todo su registro' : ''}?`)) return;

        const { error } = await _supabase.from('vision_tareas').delete().eq('id', id);
        if (error) {
            alert('Error al eliminar: ' + error.message);
            return;
        }
        _tareas = _tareas.filter(x => x.id !== id);
        delete _logs[id];
        renderPanel();
    }

    window.addVisionMeta = async function () {
        const name = prompt('¿Cuál es la meta o propósito? (ej: "Certificado B2 de Inglés")');
        if (!name || name.trim() === '') return;

        const { data, error } = await _supabase
            .from('vision_metas')
            .insert([{ name: name.trim() }])
            .select();

        if (error) {
            alert('Error al guardar: ' + error.message);
        } else {
            if (data && data[0]) _activeMetaId = data[0].id;
            loadVisionMetas();
        }
    };

    window.editVisionMetaName = async function (id, oldName) {
        const newName = prompt('Editar nombre de la meta:', oldName);
        if (!newName || newName.trim() === '' || newName === oldName) return;

        const { error } = await _supabase
            .from('vision_metas')
            .update({ name: newName.trim() })
            .eq('id', id);

        if (error) {
            alert('Error al editar: ' + error.message);
        } else {
            loadVisionMetas();
        }
    };

    window.deleteVisionMeta = async function (id, name) {
        const ok = confirm(`¿Eliminar la meta "${name}", sus imágenes y sus pasos?`);
        if (!ok) return;

        await _supabase.from('vision_meta_images').delete().eq('meta_id', id);
        await _supabase.from('vision_tareas').delete().eq('meta_id', id);
        const { error } = await _supabase.from('vision_metas').delete().eq('id', id);
        if (error) {
            alert('Error al eliminar: ' + error.message);
        } else {
            if (_activeMetaId === id) _activeMetaId = null;
            loadVisionMetas();
        }
    };

    /* Agrega una imagen nueva al feed tipo Pinterest de la meta
       activa. Igual que el resto de la app, solo pide el nombre del
       archivo (debe existir en assets/images/). */
    window.addVisionImage = async function (metaId) {
        const input = prompt('Nombre del archivo de imagen para el feed (debe estar en assets/images/):', 'default.jpg');
        if (input === null || input.trim() === '') return;

        const { data, error } = await _supabase
            .from('vision_meta_images')
            .insert([{ meta_id: metaId, image_filename: input.trim() }])
            .select();

        if (error) {
            alert('Error al guardar la imagen: ' + error.message);
            return;
        }

        if (!_imagesByMeta[metaId]) _imagesByMeta[metaId] = [];
        if (data && data[0]) _imagesByMeta[metaId].unshift(data[0]);
        if (metaId === _activeMetaId) renderFeed();
    };

    window.deleteVisionImage = async function (imageId, metaId) {
        const ok = confirm('¿Eliminar esta imagen del feed?');
        if (!ok) return;

        const { error } = await _supabase.from('vision_meta_images').delete().eq('id', imageId);
        if (error) {
            alert('Error al eliminar la imagen: ' + error.message);
            return;
        }

        if (_imagesByMeta[metaId]) {
            _imagesByMeta[metaId] = _imagesByMeta[metaId].filter(img => img.id !== imageId);
        }
        if (metaId === _activeMetaId) renderFeed();
    };

    /* Igual que Export Center / Brain Dump: Metas es una subvista
       dentro de la app (el header con los botones sigue visible), no
       un overlay que tapa todo. Se recuerda la vista anterior para
       volver exactamente ahí. */
    let _previousViewId = null;

    function visionViewEl() {
        return document.getElementById('view-vision-board');
    }

    function isVisionOpen() {
        const v = visionViewEl();
        return !!(v && v.classList.contains('active'));
    }

    function handleVisionBoardKeydown(e) {
        if (e.key === 'Escape' && isVisionOpen()) closeVisionBoard();
    }

    window.openVisionBoard = function () {
        const view = visionViewEl();
        if (!view) {
            console.warn('vision_board: no existe #view-vision-board en el HTML.');
            return;
        }
        if (!_loaded) {
            buildSkeleton();
            document.addEventListener('keydown', handleVisionBoardKeydown);
            _loaded = true;
        }

        if (!isVisionOpen()) {
            const activeView = document.querySelector('.bottom-view.active');
            _previousViewId = activeView ? activeView.id : 'view-home';
        }
        document.querySelectorAll('.bottom-view').forEach(v => v.classList.remove('active'));
        view.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        loadVisionMetas();
    };

    window.closeVisionBoard = function () {
        const view = visionViewEl();
        if (view) view.classList.remove('active');
        const target = document.getElementById(_previousViewId || 'view-home');
        if (target) target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

})();