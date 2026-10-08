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
 * HÁBITOS → PUNTOS Y RANKING
 * Cada meta (tab) puede tener hábitos vinculados (botón "Vincular
 * hábitos" en el panel de la meta). Cada día que cumples un hábito
 * vinculado suma PTS_POR_CUMPLIDO puntos a esa meta. Los puntos NO se
 * guardan: se calculan siempre desde habit_logs (días completados), así
 * que nunca se desfasan y marcar/desmarcar un hábito los ajusta solo.
 * Incluye todo el historial del hábito, no solo desde que se vinculó.
 *   - Nivel: sube con los puntos (nivel n desde 50·n·(n−1) pts).
 *   - Racha: días seguidos con al menos un hábito vinculado cumplido.
 *   - Ranking: todas tus metas ordenadas por puntos.
 * Al marcar un hábito vinculado en Hábitos aparece un aviso "+10 pts".
 * Un hábito puede vincularse a varias metas (suma en cada una).
 *
 * Hooks que llama main.js (todos opcionales):
 *   visionOnHabitToggled(nombre, completado)  → aviso de puntos
 *   visionOnHabitRenamed(viejo, nuevo)        → conserva el vínculo
 *   visionOnHabitDeleted(nombre)              → borra el vínculo
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
 *   -- NUEVA: hábitos vinculados a cada meta (puntos y ranking).
 *   CREATE TABLE vision_habit_links (
 *     id bigint generated always as identity PRIMARY KEY,
 *     meta_id bigint NOT NULL REFERENCES vision_metas(id) ON DELETE CASCADE,
 *     habit_name text NOT NULL,
 *     created_at timestamptz DEFAULT now(),
 *     UNIQUE (meta_id, habit_name)
 *   );
 *   (Si usas RLS en tus otras tablas, agrega la misma política aquí.)
 *
 * Si la tabla vision_metas ya existía de antes con "image_filename"
 * (versión de una sola imagen por meta), esa columna se puede dejar
 * como está (ya no se usa) o eliminarse — no rompe nada:
 *   ALTER TABLE vision_metas DROP COLUMN IF EXISTS image_filename;
 *
 * USO: cargar después de main.js y de mood_tracker.js (usa _supabase,
 * HABIT_CATEGORIES, resolveHabitTag, fetchAllRows, cleanHabitName y
 * getFechaHoyISO — todas ya definidas por esos componentes).
 */
(function () {
    let _loaded = false;

    // Estado en memoria: metas cargadas, imágenes por meta y tab activo.
    let _metas = [];
    let _imagesByMeta = {}; // { [metaId]: [{id, image_filename}, ...] }
    let _activeMetaId = null;

    // Hábitos vinculados, puntos y ranking.
    const PTS_POR_CUMPLIDO = 10;
    const NIVELES = ['Semilla', 'Brote', 'Raíz', 'Tallo', 'Hoja', 'Rama', 'Árbol', 'Bosque'];
    let _links = [];                 // [{ id, meta_id, habit_name }]
    let _linksDisponibles = true;    // false si falta la tabla vision_habit_links
    let _stats = {};                 // { [metaId]: { puntos, semana, hoy, racha, nivel..., habitos: [] } }
    let _pickerOpen = false;
    let _allHabits = [];             // [{ name, tag }] para el selector
    let _toastTimer = null;

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
            <div class="vision-ranking" id="vision-ranking"></div>
            <div class="vision-feed" id="vision-feed"></div>
        `;

        root.querySelector('#vision-meta-panel').addEventListener('click', onPanelClick);
        root.querySelector('#vision-ranking').addEventListener('click', (e) => {
            const row = e.target.closest('.vision-rank-row');
            if (row) switchVisionMetaTab(Number(row.dataset.metaId));
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

        await loadHabitStats();
        renderPanel();
        renderRanking();
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
        _pickerOpen = false;
        renderPanel();
        renderRanking();
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
       HÁBITOS VINCULADOS: DATOS Y CÁLCULO DE PUNTOS
       ========================================== */
    function toISO(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function hoyISO() {
        return (typeof getFechaHoyISO === 'function') ? getFechaHoyISO() : toISO(new Date());
    }

    function addDias(iso, n) {
        const [y, m, d] = iso.split('-').map(Number);
        return toISO(new Date(y, m - 1, d + n));
    }

    function lunesDeEstaSemanaISO() {
        const d = new Date();
        const dia = d.getDay() === 0 ? 7 : d.getDay();
        d.setDate(d.getDate() - dia + 1);
        return toISO(d);
    }

    // Días seguidos con actividad. Si hoy aún no se cumple nada, la
    // racha no se rompe: se cuenta desde ayer.
    function calcRacha(fechas, hoy) {
        let cursor = fechas.has(hoy) ? hoy : addDias(hoy, -1);
        let n = 0;
        while (fechas.has(cursor)) {
            n++;
            cursor = addDias(cursor, -1);
        }
        return n;
    }

    // Nivel n empieza en 50·n·(n−1) puntos: 0, 100, 300, 600, 1000...
    function calcNivel(puntos) {
        const n = Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * puntos) / 50)) / 2));
        const base = 50 * n * (n - 1);
        const siguiente = 50 * (n + 1) * n;
        return {
            nivel: n,
            nombre: NIVELES[Math.min(n - 1, NIVELES.length - 1)],
            pct: Math.round(((puntos - base) / (siguiente - base)) * 100),
            faltan: siguiente - puntos,
        };
    }

    async function fetchCompletedLogs(nombres) {
        const PAGE = 1000;
        const filas = [];
        for (let from = 0; ; from += PAGE) {
            const { data, error } = await _supabase
                .from('habit_logs')
                .select('habit_name, log_date')
                .eq('is_completed', true)
                .in('habit_name', nombres)
                .order('id', { ascending: true })
                .range(from, from + PAGE - 1);
            if (error) {
                console.error('Error cargando habit_logs para los puntos de Metas:', error.message);
                break;
            }
            filas.push(...(data || []));
            if (!data || data.length < PAGE) break;
        }
        return filas;
    }

    async function loadHabitStats() {
        const { data, error } = await _supabase.from('vision_habit_links').select('*');
        if (error) {
            _linksDisponibles = false;
            _links = [];
            _stats = {};
            return;
        }
        _linksDisponibles = true;
        _links = data || [];

        const nombres = [...new Set(_links.map(l => l.habit_name))];
        const logs = nombres.length > 0 ? await fetchCompletedLogs(nombres) : [];

        // Un día cumplido cuenta una sola vez aunque haya filas duplicadas.
        const fechasPorHabito = {};
        logs.forEach(l => {
            if (!fechasPorHabito[l.habit_name]) fechasPorHabito[l.habit_name] = new Set();
            fechasPorHabito[l.habit_name].add(l.log_date);
        });

        const hoy = hoyISO();
        const lunes = lunesDeEstaSemanaISO();
        _stats = {};

        _metas.forEach(meta => {
            const habitos = _links
                .filter(l => l.meta_id === meta.id)
                .map(l => {
                    const fechas = fechasPorHabito[l.habit_name] || new Set();
                    let semana = 0;
                    fechas.forEach(f => { if (f >= lunes && f <= hoy) semana++; });
                    return { name: l.habit_name, dias: fechas.size, puntos: fechas.size * PTS_POR_CUMPLIDO, semana, hoy: fechas.has(hoy) };
                })
                .sort((a, b) => b.puntos - a.puntos || a.name.localeCompare(b.name));

            const union = new Set();
            habitos.forEach(h => (fechasPorHabito[h.name] || []).forEach(f => union.add(f)));

            const puntos = habitos.reduce((acc, h) => acc + h.puntos, 0);
            _stats[meta.id] = {
                puntos,
                semana: habitos.reduce((acc, h) => acc + h.semana, 0) * PTS_POR_CUMPLIDO,
                hoy: habitos.filter(h => h.hoy).length,
                racha: calcRacha(union, hoy),
                habitos,
                ...calcNivel(puntos),
            };
        });
    }

    /* ==========================================
       PANEL DE LA META ACTIVA
       ========================================== */
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

        if (!_linksDisponibles) {
            el.innerHTML = `<div class="vision-panel-empty">Para vincular hábitos falta crear la tabla <strong>vision_habit_links</strong> en Supabase. El SQL está al inicio de vision_board.js.</div>`;
            return;
        }

        const st = _stats[meta.id] || { puntos: 0, semana: 0, hoy: 0, racha: 0, habitos: [], nivel: 1, nombre: NIVELES[0], pct: 0, faltan: 100 };

        const orden = rankingOrdenado();
        const posicion = orden.findIndex(m => m.id === meta.id) + 1;
        const rankHtml = (_metas.length > 1 && st.habitos.length > 0)
            ? `<span class="vision-panel-rank" title="Posición en el ranking de tus metas">#${posicion} de ${_metas.length}</span>`
            : '';

        const filas = st.habitos.map(h => `
            <li class="vision-habit-row">
                <span class="vision-habit-name">${esc(cleanName(h.name))}</span>
                ${h.hoy ? '<span class="vision-habit-today" title="Cumplido hoy">hoy ✓</span>' : ''}
                <span class="vision-habit-days">${h.dias} ${h.dias === 1 ? 'día' : 'días'}</span>
                <span class="vision-habit-pts">${h.puntos}</span>
                <button type="button" class="vision-habit-unlink" data-action="unlink" data-habit="${esc(h.name)}"
                    aria-label="Quitar vínculo" title="Quitar vínculo">×</button>
            </li>
        `).join('');

        el.innerHTML = `
            <div class="vision-panel-top">
                <div>
                    <div class="vision-panel-level">Nivel ${st.nivel}: ${st.nombre}</div>
                    <div class="vision-panel-points">${st.puntos}<span class="vision-panel-points-unit"> pts</span></div>
                </div>
                ${rankHtml}
            </div>
            <div class="ik-bar-track vision-panel-bar">
                <div class="ik-bar-fill ik-bar-fill--green" style="width:${st.pct}%;"></div>
            </div>
            <div class="vision-panel-sub">Faltan ${st.faltan} pts para el nivel ${st.nivel + 1}</div>

            <div class="vision-panel-stats">
                <div class="vision-stat"><span class="vision-stat-value">${st.hoy}</span><span class="vision-stat-label">hábitos hoy</span></div>
                <div class="vision-stat"><span class="vision-stat-value">${st.semana}</span><span class="vision-stat-label">pts esta semana</span></div>
                <div class="vision-stat"><span class="vision-stat-value">${st.racha}</span><span class="vision-stat-label">${st.racha === 1 ? 'día de racha' : 'días de racha'}</span></div>
            </div>

            <div class="vision-panel-head">
                <span class="vision-panel-head-label">Hábitos vinculados</span>
                <button type="button" class="vision-link-toggle" data-action="toggle-picker">${_pickerOpen ? 'Listo' : 'Vincular hábitos'}</button>
            </div>
            ${st.habitos.length > 0
                ? `<ul class="vision-habit-list">${filas}</ul>`
                : `<div class="vision-panel-empty">Vincula hábitos a esta meta: cada día que los cumplas suma ${PTS_POR_CUMPLIDO} pts.</div>`}
            ${_pickerOpen ? renderPicker(meta.id) : ''}
        `;
    }

    function cleanName(name) {
        return (typeof cleanHabitName === 'function') ? cleanHabitName(name) : name;
    }

    function renderPicker(metaId) {
        if (_allHabits.length === 0) {
            return `<div class="vision-panel-empty">Aún no tienes hábitos. Créalos en la pestaña Hábitos.</div>`;
        }

        const vinculados = new Set(_links.filter(l => l.meta_id === metaId).map(l => l.habit_name));

        // Orden: categorías conocidas primero, luego el resto.
        const categorias = (typeof HABIT_CATEGORIES !== 'undefined') ? Object.values(HABIT_CATEGORIES) : [];
        const porTag = {};
        _allHabits.forEach(h => {
            if (!porTag[h.tag]) porTag[h.tag] = [];
            porTag[h.tag].push(h);
        });
        const tags = [
            ...categorias.map(c => c.tag).filter(t => porTag[t]),
            ...Object.keys(porTag).filter(t => !categorias.some(c => c.tag === t)).sort(),
        ];

        const grupos = tags.map(tag => {
            const cat = categorias.find(c => c.tag === tag);
            const titulo = cat ? `${cat.icon} ${cat.label}` : tag;
            const chips = porTag[tag]
                .sort((a, b) => cleanName(a.name).localeCompare(cleanName(b.name)))
                .map(h => `<button type="button" class="vision-picker-chip${vinculados.has(h.name) ? ' on' : ''}"
                    data-action="toggle-link" data-habit="${esc(h.name)}" aria-pressed="${vinculados.has(h.name)}">${esc(cleanName(h.name))}</button>`)
                .join('');
            return `<div class="vision-picker-group">
                <div class="vision-picker-group-title">${esc(titulo)}</div>
                <div class="vision-picker-chips">${chips}</div>
            </div>`;
        }).join('');

        return `<div class="vision-picker">${grupos}</div>`;
    }

    async function loadAllHabits() {
        if (typeof fetchAllRows !== 'function') return [];
        const { data, error } = await fetchAllRows('habit_logs', 'habit_name, project_tag');
        if (error) {
            console.error('Error cargando hábitos para vincular:', error.message);
            return [];
        }
        const mapa = new Map();
        (data || []).forEach(r => {
            if (!r.habit_name || mapa.has(r.habit_name)) return;
            const tag = (typeof resolveHabitTag === 'function' ? resolveHabitTag(r.habit_name, r.project_tag) : r.project_tag) || 'OTROS';
            mapa.set(r.habit_name, tag);
        });
        return [...mapa].map(([name, tag]) => ({ name, tag }));
    }

    async function onPanelClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn || !_activeMetaId) return;
        const action = btn.dataset.action;

        if (action === 'toggle-picker') {
            _pickerOpen = !_pickerOpen;
            if (_pickerOpen) _allHabits = await loadAllHabits();
            renderPanel();
            return;
        }

        if (action === 'toggle-link' || action === 'unlink') {
            const habit = btn.dataset.habit;
            const existente = _links.find(l => l.meta_id === _activeMetaId && l.habit_name === habit);
            let error = null;

            if (existente && (action === 'unlink' || action === 'toggle-link')) {
                ({ error } = await _supabase.from('vision_habit_links').delete().eq('id', existente.id));
            } else if (!existente && action === 'toggle-link') {
                ({ error } = await _supabase.from('vision_habit_links').insert([{ meta_id: _activeMetaId, habit_name: habit }]));
            }

            if (error) {
                alert('Error al actualizar el vínculo: ' + error.message);
                return;
            }

            await loadHabitStats();
            renderPanel();
            renderRanking();
        }
    }

    /* ==========================================
       RANKING DE METAS
       ========================================== */
    function rankingOrdenado() {
        return [..._metas].sort((a, b) => {
            const pa = (_stats[a.id] || {}).puntos || 0;
            const pb = (_stats[b.id] || {}).puntos || 0;
            return pb - pa || a.name.localeCompare(b.name);
        });
    }

    function renderRanking() {
        const el = document.getElementById('vision-ranking');
        if (!el) return;

        const hayPuntos = _linksDisponibles && _links.length > 0;
        if (_metas.length < 2 || !hayPuntos) {
            el.innerHTML = '';
            el.style.display = 'none';
            return;
        }
        el.style.display = '';

        const orden = rankingOrdenado();
        const maximo = Math.max(1, ...orden.map(m => (_stats[m.id] || {}).puntos || 0));

        el.innerHTML = `
            <div class="vision-ranking-title">Ranking de metas</div>
            ${orden.map((m, i) => {
                const st = _stats[m.id] || { puntos: 0, nivel: 1 };
                const pct = Math.round((st.puntos / maximo) * 100);
                return `
                <div class="vision-rank-row${m.id === _activeMetaId ? ' vision-rank-row--active' : ''}" data-meta-id="${m.id}">
                    <span class="vision-rank-pos${i === 0 && st.puntos > 0 ? ' vision-rank-pos--first' : ''}">${i + 1}</span>
                    <span class="vision-rank-body">
                        <span class="vision-rank-name">${esc(m.name)}</span>
                        <span class="vision-rank-bar"><span class="vision-rank-bar-fill" style="width:${pct}%;"></span></span>
                    </span>
                    <span class="vision-rank-pts">${st.puntos}</span>
                </div>`;
            }).join('')}
        `;
    }

    /* ==========================================
       AVISO "+10 PTS" AL CUMPLIR UN HÁBITO VINCULADO
       ========================================== */
    function showToast(texto) {
        let el = document.getElementById('vision-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'vision-toast';
            el.className = 'vision-toast';
            el.setAttribute('role', 'status');
            document.body.appendChild(el);
        }
        el.textContent = texto;
        el.classList.add('vision-toast--show');
        clearTimeout(_toastTimer);
        _toastTimer = setTimeout(() => el.classList.remove('vision-toast--show'), 2600);
    }

    window.visionOnHabitToggled = async function (habitName, completado) {
        if (!completado) return;
        try {
            const { data, error } = await _supabase
                .from('vision_habit_links')
                .select('meta_id, vision_metas(name)')
                .eq('habit_name', habitName);
            if (error || !data || data.length === 0) return;

            const nombres = data.map(r => r.vision_metas && r.vision_metas.name).filter(Boolean);
            if (nombres.length === 0) return;
            showToast(`+${PTS_POR_CUMPLIDO} pts para ${nombres.join(', ')}`);
        } catch (e) {
            console.warn('vision_board: no se pudo calcular el aviso de puntos.', e.message);
        }
    };

    window.visionOnHabitRenamed = async function (viejo, nuevo) {
        try {
            await _supabase.from('vision_habit_links').update({ habit_name: nuevo }).eq('habit_name', viejo);
        } catch (e) { /* tabla aún no creada */ }
    };

    window.visionOnHabitDeleted = async function (nombre) {
        try {
            await _supabase.from('vision_habit_links').delete().eq('habit_name', nombre);
        } catch (e) { /* tabla aún no creada */ }
    };

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
        const ok = confirm(`¿Eliminar la meta "${name}", sus imágenes y sus hábitos vinculados?`);
        if (!ok) return;

        await _supabase.from('vision_meta_images').delete().eq('meta_id', id);
        await _supabase.from('vision_habit_links').delete().eq('meta_id', id);
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