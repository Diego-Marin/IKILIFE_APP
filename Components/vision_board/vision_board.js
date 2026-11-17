/**
 * ==========================================
 * COMPONENTE: VISION BOARD (Metas) — LÓGICA
 * ==========================================
 * #metas-header-btn abre #view-vision-board (pide el código de acceso).
 * Arriba hay pestañas (.metas-hub-tabs): "Reglas de vida", "Cosas a
 * eliminar" y las que tú crees con el botón "+". Cada pestaña es UN solo
 * feed de imágenes estilo Pinterest (ya no hay sub-pestañas por regla).
 *
 *   · "+" en las pestañas: nueva pestaña
 *   · Pestañas propias: botones Renombrar / Eliminar bajo las pestañas
 *   · Un clic / un toque en una imagen: la amplía (clic o Esc para cerrar)
 *   · Doble clic / doble toque en una imagen: suma +1 a "la viví"
 *   · Clic en la insignia de contador: corregir el número
 *   · Clic en el nombre bajo la imagen: ponerle o cambiarle el nombre
 *   · Clic derecho o mantener presionada una imagen: eliminarla
 *
 * "Reglas de vida" y "Cosas a eliminar" siguen usando sus tablas actuales
 * (vision_metas/vision_meta_images y odio_metas/odio_meta_images): se
 * muestran TODAS las imágenes que ya tenías juntas en un solo feed, y las
 * nuevas se guardan en la primera "meta" (si no existe, se crea "General").
 *
 * TABLAS NUEVAS (solo para las pestañas propias):
 *   CREATE TABLE IF NOT EXISTS metas_tabs (
 *     id bigint generated always as identity PRIMARY KEY,
 *     name text NOT NULL,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   CREATE TABLE IF NOT EXISTS metas_tab_images (
 *     id bigint generated always as identity PRIMARY KEY,
 *     tab_id bigint REFERENCES metas_tabs(id) ON DELETE CASCADE,
 *     image_filename text NOT NULL,
 *     count integer NOT NULL DEFAULT 0,
 *     title text,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   (Si usas RLS en tus otras tablas, agrega la misma política aquí.)
 *
 * Si las tablas de imágenes antiguas no tienen estas columnas:
 *   ALTER TABLE vision_meta_images ADD COLUMN IF NOT EXISTS count integer NOT NULL DEFAULT 0;
 *   ALTER TABLE odio_meta_images   ADD COLUMN IF NOT EXISTS count integer NOT NULL DEFAULT 0;
 *   ALTER TABLE vision_meta_images ADD COLUMN IF NOT EXISTS title text;
 *   ALTER TABLE odio_meta_images   ADD COLUMN IF NOT EXISTS title text;
 *
 * Usa _supabase, handleImgFallback, openHeaderView (main.js) y
 * requireAuth (auth_lock.js): cargar después de ellos.
 */
(function () {
    'use strict';

    const COLS = { name: 'name', image: 'image_filename', count: 'count', title: 'title' };

    const BOARDS = {
        vision: {
            rootId: 'vision-board-root',
            metasTable: 'vision_metas',
            imagesTable: 'vision_meta_images',
            fk: 'meta_id',
        },
        odios: {
            rootId: 'odios-board-root',
            metasTable: 'odio_metas',
            imagesTable: 'odio_meta_images',
            fk: 'meta_id',
        },
        custom: {
            rootId: 'custom-board-root',
            metasTable: 'metas_tabs',
            imagesTable: 'metas_tab_images',
            fk: 'tab_id',
            custom: true,
        },
    };

    const state = {
        vision: { metas: [], images: [], active: null },
        odios: { metas: [], images: [], active: null },
        custom: { metas: [], images: [], active: null },   // metas = pestañas propias
    };

    let _hub = 'vision';            // 'vision' | 'odios' | 'c<id>'
    const _pendingSaves = {};
    const DOBLE_MS = 320;
    const LONG_MS = 650;
    let _last = { id: 0, t: 0, x: 0, y: 0 };
    let _openTimer = null;
    let _viewer = null;

    const HEART_SM = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
    const HEART_LG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
    const PLUS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';

    const SQL_CUSTOM =
        'CREATE TABLE IF NOT EXISTS metas_tabs (id bigint generated always as identity PRIMARY KEY, name text NOT NULL, created_at timestamptz DEFAULT now());\n' +
        'CREATE TABLE IF NOT EXISTS metas_tab_images (id bigint generated always as identity PRIMARY KEY, tab_id bigint REFERENCES metas_tabs(id) ON DELETE CASCADE, image_filename text NOT NULL, count integer NOT NULL DEFAULT 0, title text, created_at timestamptz DEFAULT now());';

    function esc(t) {
        return String(t == null ? '' : t)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    const rootOf = key => document.getElementById(BOARDS[key].rootId);
    const countOf = img => Number(img[COLS.count]) || 0;
    const ACTIVE_KEY = 'ikilife_metas_active_custom';
    const isCustomHub = h => /^c\d+$/.test(h);

    function saveActive() {
        try {
            const id = state.custom.active;
            if (id == null) localStorage.removeItem(ACTIVE_KEY);
            else localStorage.setItem(ACTIVE_KEY, String(id));
        } catch (e) { /* sin almacenamiento: se ignora */ }
    }
    function savedActive() {
        try { return Number(localStorage.getItem(ACTIVE_KEY)) || null; } catch (e) { return null; }
    }

    /* ==========================================
       HUB DE PESTAÑAS (arriba)
       ========================================== */
    const hubEl = () => document.querySelector('#view-vision-board .metas-hub-tabs');

    // Crea el panel de pestañas propias y engancha los clics del hub (una sola vez).
    function ensureHub() {
        const view = document.getElementById('view-vision-board');
        if (!view) return;

        if (!document.getElementById('custom-board-root')) {
            const pane = document.createElement('div');
            pane.className = 'metas-pane hidden';
            pane.dataset.pane = 'custom';
            pane.innerHTML = '<div id="custom-board-root"></div>';
            view.appendChild(pane);
        }

        const hub = hubEl();
        if (hub && !hub.dataset.vbBound) {
            hub.dataset.vbBound = '1';
            hub.addEventListener('click', (e) => {
                if (e.target.closest('[data-act="add-tab"]')) return addTab();
                const t = e.target.closest('[data-custom-tab]');
                if (t) window.switchMetasTab(t.dataset.metasTab);
            });
        }
    }

    function renderHubTabs() {
        const hub = hubEl();
        if (!hub) return;
        hub.querySelectorAll('[data-custom-tab], [data-act="add-tab"]').forEach(n => n.remove());

        state.custom.metas.forEach(t => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'camino-tab-btn' + (_hub === 'c' + t.id ? ' camino-tab-active' : '');
            btn.dataset.metasTab = 'c' + t.id;
            btn.dataset.customTab = '1';
            btn.title = t[COLS.name];
            const label = document.createElement('span');
            label.className = 'camino-tab-label';
            label.textContent = t[COLS.name];
            btn.appendChild(label);
            hub.appendChild(btn);
        });

        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'camino-tab-btn camino-tab-btn--add';
        add.dataset.act = 'add-tab';
        add.title = 'Nueva pestaña';
        add.setAttribute('aria-label', 'Nueva pestaña');
        add.innerHTML = '<span class="camino-tab-label">Nueva</span>';
        hub.appendChild(add);
    }

    /* ==========================================
       CARGA
       ========================================== */
    async function load(key) {
        const b = BOARDS[key];
        const s = state[key];
        const root = rootOf(key);
        if (!root) return;
        bind(key, root);

        const [m, i] = await Promise.all([
            _supabase.from(b.metasTable).select('*').order('id', { ascending: true }),
            _supabase.from(b.imagesTable).select('*').order('id', { ascending: true }),
        ]);

        const err = m.error || i.error;
        if (err) {
            console.error('Error cargando ' + key + ':', err.message);
            s.metas = [];
            s.images = [];
            if (b.custom) renderHubTabs();
            root.innerHTML = `<div class="vision-feed-empty">No se pudo cargar (${esc(err.message)}).<br>Revisa que existan las tablas <strong>${b.metasTable}</strong> y <strong>${b.imagesTable}</strong> (el SQL está al inicio de vision_board.js).</div>`;
            return;
        }

        s.metas = m.data || [];
        s.images = i.data || [];

        if (b.custom) {
            const ids = s.metas.map(x => x.id);
            if (!ids.includes(s.active)) {
                const saved = savedActive();
                s.active = ids.includes(saved) ? saved : (ids[0] != null ? ids[0] : null);
            }
            renderHubTabs();
        }
        render(key);
    }

    /* ==========================================
       RENDER (un solo feed por pestaña)
       ========================================== */
    function render(key) {
        const b = BOARDS[key];
        const s = state[key];
        const root = rootOf(key);
        if (!root) return;

        if (b.custom && s.active == null) {
            root.innerHTML = '<div class="vision-feed-empty">Toca “+” arriba para crear una pestaña nueva.</div>';
            return;
        }

        const imgs = b.custom ? s.images.filter(im => im[b.fk] === s.active) : s.images;
        const items = imgs.map(im => {
            const n = countOf(im);
            const t = im[COLS.title] ? String(im[COLS.title]).trim() : '';
            return `
            <div class="vision-feed-item" data-id="${im.id}" tabindex="0" title="Clic: ampliar · Doble clic: la viví · Clic derecho o mantener: eliminar">
                <div class="vision-feed-media">
                    <img class="vision-feed-img" src="assets/images/${esc(im[COLS.image])}" alt="${esc(t)}" draggable="false" loading="lazy" decoding="async" onerror="handleImgFallback(this)">
                    ${n > 0 ? `<button type="button" class="vision-feed-count" data-act="fix-count" title="Veces vivida (toca para corregir)">${HEART_SM}<span>${n}</span></button>` : ''}
                </div>
                <button type="button" class="vision-feed-title${t ? '' : ' vision-feed-title--empty'}" data-act="edit-title" title="Clic para ponerle nombre">${t ? esc(t) : 'Sin nombre'}</button>
            </div>`;
        }).join('');

        const actions = b.custom ? `
            <div class="metas-actions" style="display:flex; gap:8px; padding:4px 0 0;">
                <button type="button" class="wt-btn" data-act="rename-meta">Renombrar</button>
                <button type="button" class="wt-btn wt-btn--danger" data-act="delete-meta" style="padding-left:14px;">Eliminar pestaña</button>
            </div>` : '';

        root.innerHTML = actions + `
            <div class="vision-feed">
                ${items}
                <button type="button" class="vision-feed-add" data-act="add-image">${PLUS}<span>Agregar imagen</span></button>
            </div>`;
    }

    /* Actualiza solo el contador de una imagen, sin repintar el feed. */
    function updateCountUI(key, id, bump) {
        const root = rootOf(key);
        if (!root) return;
        const item = root.querySelector(`.vision-feed-item[data-id="${id}"]`);
        const im = state[key].images.find(x => x.id === id);
        if (!item || !im) return;
        const n = countOf(im);
        let badge = item.querySelector('.vision-feed-count');
        if (n <= 0) { if (badge) badge.remove(); return; }
        if (!badge) {
            badge = document.createElement('button');
            badge.type = 'button';
            badge.className = 'vision-feed-count';
            badge.dataset.act = 'fix-count';
            badge.title = 'Veces vivida (toca para corregir)';
            badge.innerHTML = HEART_SM + '<span></span>';
            (item.querySelector('.vision-feed-media') || item).appendChild(badge);
        }
        badge.querySelector('span').textContent = n;
        if (bump) {
            badge.classList.remove('vision-feed-count--bump');
            void badge.offsetWidth;
            badge.classList.add('vision-feed-count--bump');
        }
    }

    function burst(item, evt) {
        const rect = item.getBoundingClientRect();
        const x = evt && evt.clientX != null ? evt.clientX - rect.left : rect.width / 2;
        const y = evt && evt.clientY != null ? evt.clientY - rect.top : rect.height / 2;
        const el = document.createElement('span');
        el.className = 'vision-heart-burst';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.innerHTML = HEART_LG;
        item.appendChild(el);
        setTimeout(() => el.remove(), 800);
    }

    /* ==========================================
       EVENTOS
       ========================================== */
    function bind(key, root) {
        if (root.dataset.vbBound) return;
        root.dataset.vbBound = '1';

        let pressTimer = null;
        let pressStart = { x: 0, y: 0 };
        let suppressUntil = 0;

        const cancelPress = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };

        root.addEventListener('pointerdown', (e) => {
            const item = e.target.closest('.vision-feed-item');
            if (!item || e.target.closest('button')) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            pressStart = { x: e.clientX, y: e.clientY };
            cancelPress();
            pressTimer = setTimeout(() => {
                pressTimer = null;
                suppressUntil = Date.now() + 800;
                deleteImage(key, Number(item.dataset.id));
            }, LONG_MS);
        });
        root.addEventListener('pointermove', (e) => {
            if (pressTimer && Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > 10) cancelPress();
        });
        root.addEventListener('pointercancel', cancelPress);

        // Doble toque / doble clic = +1 (más fiable que "dblclick" en móvil)
        root.addEventListener('pointerup', (e) => {
            cancelPress();
            if (Date.now() < suppressUntil) return;
            if (e.target.closest('button')) return;
            const item = e.target.closest('.vision-feed-item');
            if (!item) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;

            const id = Number(item.dataset.id);
            const now = Date.now();
            const cerca = Math.hypot(e.clientX - _last.x, e.clientY - _last.y) < 40;
            if (_last.id === id && now - _last.t < DOBLE_MS && cerca) {
                clearTimeout(_openTimer);
                _last = { id: 0, t: 0, x: 0, y: 0 };
                sumar(key, id, item, e);
            } else {
                clearTimeout(_openTimer);
                _last = { id, t: now, x: e.clientX, y: e.clientY };
                _openTimer = setTimeout(() => openViewer(key, id), DOBLE_MS);
            }
        });

        root.addEventListener('keydown', (e) => {
            const item = e.target.closest && e.target.closest('.vision-feed-item');
            if (!item || e.target !== item) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                sumar(key, Number(item.dataset.id), item, null);
            }
        });

        root.addEventListener('contextmenu', (e) => {
            const item = e.target.closest('.vision-feed-item');
            if (!item) return;
            e.preventDefault();
            if (Date.now() < suppressUntil) return;
            deleteImage(key, Number(item.dataset.id));
        });

        root.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            const item = btn.closest('.vision-feed-item');
            switch (btn.dataset.act) {
                case 'rename-meta': return renameTab();
                case 'delete-meta': return deleteTab();
                case 'add-image': return addImage(key);
                case 'fix-count': return item && fixCount(key, Number(item.dataset.id));
                case 'edit-title': return item && editTitle(key, Number(item.dataset.id));
            }
        });
    }

    /* ==========================================
       VISOR: ampliar la imagen
       ========================================== */
    function closeViewer() {
        if (!_viewer) return;
        _viewer.remove();
        _viewer = null;
        document.removeEventListener('keydown', onViewerKey);
    }

    function onViewerKey(e) { if (e.key === 'Escape') closeViewer(); }

    function openViewer(key, id) {
        const im = state[key].images.find(x => x.id === id);
        if (!im) return;
        closeViewer();

        const title = im[COLS.title] ? String(im[COLS.title]).trim() : '';
        const n = countOf(im);

        _viewer = document.createElement('div');
        _viewer.className = 'img-viewer';
        _viewer.setAttribute('role', 'dialog');
        _viewer.setAttribute('aria-label', 'Imagen ampliada');

        const big = document.createElement('img');
        big.className = 'img-viewer-img';
        big.src = 'assets/images/' + im[COLS.image];
        big.alt = title;
        big.draggable = false;
        big.onerror = function () { handleImgFallback(big); };
        _viewer.appendChild(big);

        const caption = [title, n > 0 ? '♥ ' + n : ''].filter(Boolean).join('  ·  ');
        if (caption) {
            const cap = document.createElement('div');
            cap.className = 'img-viewer-caption';
            cap.textContent = caption;
            _viewer.appendChild(cap);
        }

        _viewer.addEventListener('click', closeViewer);
        _viewer.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('keydown', onViewerKey);
        document.body.appendChild(_viewer);
    }

    /* ==========================================
       CONTADOR "LA VIVÍ"
       ========================================== */
    function sumar(key, id, item, evt) {
        const im = state[key].images.find(x => x.id === id);
        if (!im) return;
        im[COLS.count] = countOf(im) + 1;
        updateCountUI(key, id, true);
        burst(item, evt);
        if (navigator.vibrate) navigator.vibrate(15);
        guardarCount(key, im);
    }

    // Escrituras encadenadas por imagen: el último valor siempre queda guardado.
    function guardarCount(key, im) {
        const b = BOARDS[key];
        const previa = _pendingSaves[key + im.id] || Promise.resolve();
        _pendingSaves[key + im.id] = previa.then(async () => {
            const { error } = await _supabase.from(b.imagesTable)
                .update({ [COLS.count]: countOf(im) }).eq('id', im.id);
            if (error) {
                console.error('Error guardando el contador:', error.message);
                alert('No se pudo guardar el contador: ' + error.message +
                    '\n\nAgrega la columna en Supabase:\nALTER TABLE ' + b.imagesTable +
                    ' ADD COLUMN IF NOT EXISTS ' + COLS.count + ' integer NOT NULL DEFAULT 0;');
            }
        });
    }

    function fixCount(key, id) {
        const im = state[key].images.find(x => x.id === id);
        if (!im) return;
        const txt = prompt('¿Cuántas veces la has vivido?', String(countOf(im)));
        if (txt === null) return;
        const n = parseInt(txt, 10);
        if (!Number.isFinite(n) || n < 0) { alert('Escribe un número entero (0 o mayor).'); return; }
        im[COLS.count] = n;
        updateCountUI(key, id, false);
        guardarCount(key, im);
    }

    /* ==========================================
       PESTAÑAS PROPIAS (crear / renombrar / eliminar)
       ========================================== */
    async function addTab() {
        const name = prompt('Nombre de la nueva pestaña:');
        if (!name || name.trim() === '') return;
        const { data, error } = await _supabase.from(BOARDS.custom.metasTable)
            .insert([{ [COLS.name]: name.trim() }]).select();
        if (error) {
            alert('Error al crear la pestaña: ' + error.message +
                '\n\nCrea las tablas en Supabase:\n' + SQL_CUSTOM);
            return;
        }
        if (data && data[0]) {
            state.custom.metas.push(data[0]);
            window.switchMetasTab('c' + data[0].id);
        }
    }

    async function renameTab() {
        const s = state.custom;
        const tab = s.metas.find(m => m.id === s.active);
        if (!tab) return;
        const name = prompt('Editar nombre:', tab[COLS.name]);
        if (!name || name.trim() === '' || name.trim() === tab[COLS.name]) return;
        const { error } = await _supabase.from(BOARDS.custom.metasTable)
            .update({ [COLS.name]: name.trim() }).eq('id', tab.id);
        if (error) { alert('Error al editar: ' + error.message); return; }
        tab[COLS.name] = name.trim();
        renderHubTabs();
    }

    async function deleteTab() {
        const b = BOARDS.custom;
        const s = state.custom;
        const tab = s.metas.find(m => m.id === s.active);
        if (!tab) return;
        if (!confirm(`¿Eliminar la pestaña "${tab[COLS.name]}" y todas sus imágenes?`)) return;

        // Por si la clave foránea no tiene ON DELETE CASCADE.
        await _supabase.from(b.imagesTable).delete().eq(b.fk, tab.id);
        const { error } = await _supabase.from(b.metasTable).delete().eq('id', tab.id);
        if (error) { alert('Error al eliminar: ' + error.message); return; }

        s.images = s.images.filter(im => im[b.fk] !== tab.id);
        s.metas = s.metas.filter(m => m.id !== tab.id);
        s.active = null;
        saveActive();
        window.switchMetasTab('vision');
    }

    /* ==========================================
       IMÁGENES
       ========================================== */
    // En "Reglas de vida" / "Cosas a eliminar" las imágenes nuevas se guardan en
    // la primera meta existente (o en una llamada "General" que se crea sola).
    async function ownerFor(key) {
        const b = BOARDS[key];
        const s = state[key];
        if (b.custom) return s.active;
        if (s.metas.length) return s.metas[0].id;
        const { data, error } = await _supabase.from(b.metasTable)
            .insert([{ [COLS.name]: 'General' }]).select();
        if (error || !data || !data[0]) {
            alert('Error al preparar el tablero: ' + (error ? error.message : 'sin datos'));
            return null;
        }
        s.metas.push(data[0]);
        return data[0].id;
    }

    async function addImage(key) {
        const b = BOARDS[key];
        const s = state[key];
        const file = prompt('Nombre del archivo de imagen (debe estar en assets/images/):');
        if (!file || file.trim() === '') return;
        const title = prompt('Nombre de la imagen (opcional):', '');
        if (title === null) return;

        const owner = await ownerFor(key);
        if (owner == null) return;

        const row = { [b.fk]: owner, [COLS.image]: file.trim() };
        if (title.trim() !== '') row[COLS.title] = title.trim();
        const { data, error } = await _supabase.from(b.imagesTable).insert([row]).select();
        if (error) { alert('Error al guardar la imagen: ' + error.message); return; }
        if (data && data[0]) s.images.push(data[0]);
        render(key);
    }

    async function editTitle(key, id) {
        const b = BOARDS[key];
        const im = state[key].images.find(x => x.id === id);
        if (!im) return;
        const actual = im[COLS.title] ? String(im[COLS.title]) : '';
        const input = prompt('Nombre de esta imagen (vacío para quitarlo):', actual);
        if (input === null) return;
        const nuevo = input.trim();
        if (nuevo === actual.trim()) return;

        const { error } = await _supabase.from(b.imagesTable)
            .update({ [COLS.title]: nuevo === '' ? null : nuevo }).eq('id', id);
        if (error) {
            alert('Error al guardar el nombre: ' + error.message +
                '\n\nAgrega la columna en Supabase:\nALTER TABLE ' + b.imagesTable +
                ' ADD COLUMN IF NOT EXISTS ' + COLS.title + ' text;');
            return;
        }
        im[COLS.title] = nuevo === '' ? null : nuevo;

        const btn = rootOf(key).querySelector(`.vision-feed-item[data-id="${id}"] .vision-feed-title`);
        if (btn) {
            btn.textContent = nuevo || 'Sin nombre';
            btn.classList.toggle('vision-feed-title--empty', nuevo === '');
        }
    }

    async function deleteImage(key, id) {
        const b = BOARDS[key];
        if (!confirm('¿Eliminar esta imagen?')) return;
        const { error } = await _supabase.from(b.imagesTable).delete().eq('id', id);
        if (error) { alert('Error al eliminar: ' + error.message); return; }
        state[key].images = state[key].images.filter(im => im.id !== id);
        render(key);
    }

    /* ==========================================
       HUB: cambiar de pestaña / abrir Metas
       ========================================== */
    window.switchMetasTab = function (which) {
        ensureHub();
        const custom = isCustomHub(which);
        if (!custom && !BOARDS[which]) which = 'vision';
        if (custom) {
            state.custom.active = Number(which.slice(1));
            saveActive();
        }
        _hub = which;
        const paneKey = custom ? 'custom' : which;

        document.querySelectorAll('#view-vision-board .metas-hub-tabs .camino-tab-btn[data-metas-tab]').forEach(b => {
            b.classList.toggle('camino-tab-active', b.dataset.metasTab === which);
        });
        document.querySelectorAll('#view-vision-board .metas-pane').forEach(p => {
            p.classList.toggle('hidden', p.dataset.pane !== paneKey);
        });
        load(paneKey);
    };

    // Abrir Metas pide el código de acceso cada vez (requireAuth, auth_lock.js).
    window.openMetasBoard = function () {
        const open = () => {
            ensureHub();
            openHeaderView('view-vision-board', async () => {
                await load('custom');   // trae las pestañas propias y las dibuja
                if (isCustomHub(_hub) && !state.custom.metas.some(t => 'c' + t.id === _hub)) _hub = 'vision';
                window.switchMetasTab(_hub);
            });
        };
        if (typeof window.requireAuth === 'function') window.requireAuth(open);
        else open();
    };
})();