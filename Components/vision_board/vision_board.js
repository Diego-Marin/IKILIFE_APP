/**
 * ==========================================
 * COMPONENTE: VISION BOARD (Metas) — LÓGICA
 * ==========================================
 * Un solo botón del header (#metas-header-btn) abre #view-vision-board,
 * que tiene dos etiquetas: "Reglas de vida" y "Cosas a eliminar".
 * Cada tablero tiene pestañas (una por regla/cosa) y debajo un feed
 * de imágenes estilo Pinterest.
 *
 *   · "+" en las pestañas: nueva regla/cosa
 *   · Doble clic / doble toque en una imagen: suma +1 a "la viví"
 *   · Clic en la insignia de contador: corregir el número
 *   · Clic en el nombre bajo la imagen: ponerle o cambiarle el nombre
 *   · Clic derecho o mantener presionada una imagen: eliminarla
 *   · Pestaña activa: botones Renombrar / Eliminar debajo de las pestañas
 *
 * TABLAS ESPERADAS EN SUPABASE (ajusta COLS / fk abajo si las tuyas
 * tienen otros nombres de columna):
 *
 *   CREATE TABLE IF NOT EXISTS vision_metas (
 *     id bigint generated always as identity PRIMARY KEY,
 *     name text NOT NULL,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   CREATE TABLE IF NOT EXISTS vision_meta_images (
 *     id bigint generated always as identity PRIMARY KEY,
 *     meta_id bigint REFERENCES vision_metas(id) ON DELETE CASCADE,
 *     image_filename text NOT NULL,
 *     count integer NOT NULL DEFAULT 0,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   -- y lo mismo para odio_metas / odio_meta_images
 *
 * Si las tablas ya existían sin la columna del contador:
 *   ALTER TABLE vision_meta_images ADD COLUMN IF NOT EXISTS count integer NOT NULL DEFAULT 0;
 *   ALTER TABLE odio_meta_images   ADD COLUMN IF NOT EXISTS count integer NOT NULL DEFAULT 0;
 *
 * Nombre de cada imagen (columna nueva, opcional hasta que le pongas nombre):
 *   ALTER TABLE vision_meta_images ADD COLUMN IF NOT EXISTS title text;
 *   ALTER TABLE odio_meta_images   ADD COLUMN IF NOT EXISTS title text;
 *
 * Usa _supabase, handleImgFallback, openHeaderView y closeHeaderView
 * (main.js): cargar este archivo después de main.js.
 */
(function () {
    'use strict';

    /* ---------- Configuración (si tus columnas se llaman distinto, cámbialas aquí) ---------- */
    const COLS = { name: 'name', image: 'image_filename', count: 'count', title: 'title' };

    const BOARDS = {
        vision: {
            rootId: 'vision-board-root',
            metasTable: 'vision_metas',
            imagesTable: 'vision_meta_images',
            fk: 'meta_id',
            promptMeta: 'Nombre de la nueva regla de vida:',
            emptyText: 'Aún no tienes reglas de vida. Toca “+” para crear la primera.',
        },
        odios: {
            rootId: 'odios-board-root',
            metasTable: 'odio_metas',
            imagesTable: 'odio_meta_images',
            fk: 'meta_id',
            promptMeta: 'Nombre de la cosa que quieres eliminar:',
            emptyText: 'Aún no tienes cosas a eliminar. Toca “+” para agregar la primera.',
        },
    };

    const state = {
        vision: { metas: [], images: [], active: null },
        odios: { metas: [], images: [], active: null },
    };

    let _hub = 'vision';
    const _pendingSaves = {};
    const DOBLE_MS = 320;
    const LONG_MS = 650;
    let _last = { id: 0, t: 0, x: 0, y: 0 };

    const HEART_SM = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
    const HEART_LG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
    const PLUS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';

    function esc(t) {
        return String(t == null ? '' : t)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    const rootOf = key => document.getElementById(BOARDS[key].rootId);
    const countOf = img => Number(img[COLS.count]) || 0;
    const activeKey = key => 'ikilife_metas_active_' + key;

    function saveActive(key) {
        try {
            const id = state[key].active;
            if (id == null) localStorage.removeItem(activeKey(key));
            else localStorage.setItem(activeKey(key), String(id));
        } catch (e) { /* sin almacenamiento: se ignora */ }
    }

    function savedActive(key) {
        try { return Number(localStorage.getItem(activeKey(key))) || null; } catch (e) { return null; }
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
            root.innerHTML = `<div class="vision-feed-empty">No se pudo cargar (${esc(err.message)}).<br>Revisa que existan las tablas <strong>${b.metasTable}</strong> y <strong>${b.imagesTable}</strong> (el SQL está al inicio de vision_board.js).</div>`;
            return;
        }

        s.metas = m.data || [];
        s.images = i.data || [];

        const ids = s.metas.map(x => x.id);
        if (!ids.includes(s.active)) {
            const saved = savedActive(key);
            s.active = ids.includes(saved) ? saved : (ids[0] != null ? ids[0] : null);
        }
        render(key);
    }

    /* ==========================================
       RENDER
       ========================================== */
    function render(key) {
        const b = BOARDS[key];
        const s = state[key];
        const root = rootOf(key);
        if (!root) return;

        const tabs = s.metas.map(m => `
            <button type="button" class="vision-tab-btn${m.id === s.active ? ' vision-tab-active' : ''}" data-act="tab" data-id="${m.id}" title="${esc(m[COLS.name])}">${esc(m[COLS.name])}</button>`).join('');

        const bar = `
            <div class="vision-tabs-bar">
                <div class="vision-tabs">
                    ${tabs}
                    <button type="button" class="vision-tab-add" data-act="add-meta" aria-label="Agregar" title="Agregar">${PLUS}</button>
                </div>
            </div>`;

        if (s.metas.length === 0) {
            root.innerHTML = bar + `<div class="vision-feed-empty">${esc(b.emptyText)}</div>`;
            return;
        }

        const imgs = s.images.filter(im => im[b.fk] === s.active);
        const items = imgs.map(im => {
            const n = countOf(im);
            const t = im[COLS.title] ? String(im[COLS.title]).trim() : '';
            return `
            <div class="vision-feed-item" data-id="${im.id}" tabindex="0" title="Doble clic: la viví · Clic derecho o mantener: eliminar">
                <div class="vision-feed-media">
                    <img class="vision-feed-img" src="assets/images/${esc(im[COLS.image])}" alt="${esc(t)}" draggable="false" loading="lazy" decoding="async" onerror="handleImgFallback(this)">
                    ${n > 0 ? `<button type="button" class="vision-feed-count" data-act="fix-count" title="Veces vivida (toca para corregir)">${HEART_SM}<span>${n}</span></button>` : ''}
                </div>
                <button type="button" class="vision-feed-title${t ? '' : ' vision-feed-title--empty'}" data-act="edit-title" title="Clic para ponerle nombre">${t ? esc(t) : 'Sin nombre'}</button>
            </div>`;
        }).join('');

        root.innerHTML = bar + `
            <div class="metas-actions" style="display:flex; gap:8px; padding:4px 0 0;">
                <button type="button" class="wt-btn" data-act="rename-meta">Renombrar</button>
                <button type="button" class="wt-btn wt-btn--danger" data-act="delete-meta" style="padding-left:14px;">Eliminar</button>
            </div>
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
                _last = { id: 0, t: 0, x: 0, y: 0 };
                sumar(key, id, item, e);
            } else {
                _last = { id, t: now, x: e.clientX, y: e.clientY };
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

        // Clic derecho sobre una imagen = eliminar (y se evita el menú del navegador)
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
                case 'tab':
                    state[key].active = Number(btn.dataset.id);
                    saveActive(key);
                    return render(key);
                case 'add-meta': return addMeta(key);
                case 'rename-meta': return renameMeta(key);
                case 'delete-meta': return deleteMeta(key);
                case 'add-image': return addImage(key);
                case 'fix-count': return item && fixCount(key, Number(item.dataset.id));
                case 'edit-title': return item && editTitle(key, Number(item.dataset.id));
            }
        });
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
       CRUD
       ========================================== */
    async function addMeta(key) {
        const b = BOARDS[key];
        const name = prompt(b.promptMeta);
        if (!name || name.trim() === '') return;
        const { data, error } = await _supabase.from(b.metasTable)
            .insert([{ [COLS.name]: name.trim() }]).select();
        if (error) { alert('Error al guardar: ' + error.message); return; }
        if (data && data[0]) {
            state[key].metas.push(data[0]);
            state[key].active = data[0].id;
            saveActive(key);
        }
        render(key);
    }

    async function renameMeta(key) {
        const b = BOARDS[key];
        const s = state[key];
        const meta = s.metas.find(m => m.id === s.active);
        if (!meta) return;
        const name = prompt('Editar nombre:', meta[COLS.name]);
        if (!name || name.trim() === '' || name.trim() === meta[COLS.name]) return;
        const { error } = await _supabase.from(b.metasTable)
            .update({ [COLS.name]: name.trim() }).eq('id', meta.id);
        if (error) { alert('Error al editar: ' + error.message); return; }
        meta[COLS.name] = name.trim();
        render(key);
    }

    async function deleteMeta(key) {
        const b = BOARDS[key];
        const s = state[key];
        const meta = s.metas.find(m => m.id === s.active);
        if (!meta) return;
        if (!confirm(`¿Eliminar "${meta[COLS.name]}" y todas sus imágenes?`)) return;

        // Por si la clave foránea no tiene ON DELETE CASCADE.
        await _supabase.from(b.imagesTable).delete().eq(b.fk, meta.id);
        const { error } = await _supabase.from(b.metasTable).delete().eq('id', meta.id);
        if (error) { alert('Error al eliminar: ' + error.message); return; }

        s.images = s.images.filter(im => im[b.fk] !== meta.id);
        s.metas = s.metas.filter(m => m.id !== meta.id);
        s.active = s.metas.length ? s.metas[0].id : null;
        saveActive(key);
        render(key);
    }

    async function addImage(key) {
        const b = BOARDS[key];
        const s = state[key];
        if (s.active == null) return;
        const file = prompt('Nombre del archivo de imagen (debe estar en assets/images/):');
        if (!file || file.trim() === '') return;
        const title = prompt('Nombre de la imagen (opcional):', '');
        if (title === null) return;
        const row = { [b.fk]: s.active, [COLS.image]: file.trim() };
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
       HUB: Reglas de vida | Cosas a eliminar
       ========================================== */
    window.switchMetasTab = function (which) {
        if (!BOARDS[which]) which = 'vision';
        _hub = which;

        document.querySelectorAll('#view-vision-board .metas-hub-tabs .camino-tab-btn').forEach(b => {
            b.classList.toggle('camino-tab-active', b.dataset.metasTab === which);
        });
        document.querySelectorAll('#view-vision-board .metas-pane').forEach(p => {
            p.classList.toggle('hidden', p.dataset.pane !== which);
        });
        load(which);
    };

    window.openMetasBoard = function () {
        openHeaderView('view-vision-board', () => window.switchMetasTab(_hub));
    };
})();