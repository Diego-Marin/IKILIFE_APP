/**
 * ==========================================
 * COMPONENTE: TABLEROS DE IMÁGENES (Metas + Odios)
 * ==========================================
 * Un mismo motor ("createMetaBoard") alimenta dos tableros del header:
 *
 *   · METAS  (botón corazón)  → lo que amas y deseas.
 *   · ODIOS  (botón pulgar)   → lo que NO quieres en tu vida.
 *
 * Cada tablero se abre como SUBVISTA dentro de la app (el header sigue
 * visible). Cada meta/odio es un TAB arriba; el "+" va al final de la
 * fila. Al tocar un tab se ve debajo un feed estilo Pinterest (masonry,
 * 2 columnas) con sus imágenes. Doble clic (o doble toque) sobre una
 * imagen suma 1 a su contador; tocar la insignia permite corregirlo;
 * clic derecho elimina la imagen. Doble clic en un tab = renombrar;
 * clic derecho = eliminar. Para salir: barra inferior o tecla Esc.
 *
 * TABLAS REQUERIDAS EN SUPABASE:
 *
 *   -- METAS (ya existentes)
 *   CREATE TABLE vision_metas (
 *     id bigint generated always as identity PRIMARY KEY,
 *     name text NOT NULL,
 *     linked_tag text,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   CREATE TABLE vision_meta_images (
 *     id bigint generated always as identity PRIMARY KEY,
 *     meta_id bigint REFERENCES vision_metas(id) ON DELETE CASCADE,
 *     image_filename text NOT NULL,
 *     veces integer NOT NULL DEFAULT 0,
 *     created_at timestamptz DEFAULT now()
 *   );
 *
 *   -- ODIOS (NUEVAS)
 *   CREATE TABLE odio_metas (
 *     id bigint generated always as identity PRIMARY KEY,
 *     name text NOT NULL,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   CREATE TABLE odio_meta_images (
 *     id bigint generated always as identity PRIMARY KEY,
 *     meta_id bigint REFERENCES odio_metas(id) ON DELETE CASCADE,
 *     image_filename text NOT NULL,
 *     veces integer NOT NULL DEFAULT 0,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   (Si usas RLS en tus otras tablas, agrega la misma política aquí.)
 *
 * USO: cargar después de main.js (usa _supabase y handleImgFallback).
 */
(function () {
    const HEART_ICON = '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>';
    const BOLT_ICON = '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>';
    const DOBLE_CLIC_MS = 320;

    function esc(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function createMetaBoard(cfg) {
        const ids = { tabs: cfg.key + '-tabs', feed: cfg.key + '-feed', add: cfg.key + '-add-btn' };

        let _loaded = false;
        let _metas = [];
        let _imagesByMeta = {};
        let _activeMetaId = null;
        let _previousViewId = null;
        const _pendingSaves = {};

        function viewEl() { return document.getElementById(cfg.viewId); }
        function isOpen() { const v = viewEl(); return !!(v && v.classList.contains('active')); }

        function buildSkeleton() {
            const root = document.getElementById(cfg.rootId);
            if (!root) return null;
            root.innerHTML = `
                <div class="vision-tabs-bar">
                    <div class="vision-tabs" id="${ids.tabs}"></div>
                </div>
                <div class="vision-feed" id="${ids.feed}"></div>
            `;
            return root;
        }

        /* ---------- Carga: metas + TODAS sus imágenes (tabs instantáneos) ---------- */
        async function loadMetas() {
            if (!document.getElementById(ids.tabs)) return;

            const { data: metas, error } = await _supabase
                .from(cfg.metasTable).select('*').order('created_at', { ascending: true });
            if (error) return console.error(`Error cargando ${cfg.metasTable}:`, error.message);

            _metas = metas || [];
            const metaIds = _metas.map(m => m.id);
            let images = [];
            if (metaIds.length > 0) {
                const { data: imagesData, error: errImg } = await _supabase
                    .from(cfg.imagesTable).select('*').in('meta_id', metaIds)
                    .order('created_at', { ascending: false });
                if (errImg) console.error(`Error cargando ${cfg.imagesTable}:`, errImg.message);
                images = imagesData || [];
            }

            _imagesByMeta = {};
            metaIds.forEach(id => { _imagesByMeta[id] = []; });
            images.forEach(img => {
                if (!_imagesByMeta[img.meta_id]) _imagesByMeta[img.meta_id] = [];
                _imagesByMeta[img.meta_id].push(img);
            });

            if (!_activeMetaId || !_metas.some(m => m.id === _activeMetaId)) {
                _activeMetaId = _metas.length > 0 ? _metas[0].id : null;
            }
            renderTabs();
            renderFeed();
        }

        function renderTabs() {
            const tabsEl = document.getElementById(ids.tabs);
            if (!tabsEl) return;
            tabsEl.innerHTML = '';

            _metas.forEach(meta => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'vision-tab-btn' + (meta.id === _activeMetaId ? ' vision-tab-active' : '');
                btn.dataset.metaId = meta.id;
                btn.textContent = meta.name;
                btn.addEventListener('click', () => switchMetaTab(meta.id));
                btn.addEventListener('dblclick', () => editMetaName(meta.id, meta.name));
                btn.addEventListener('contextmenu', (e) => { e.preventDefault(); deleteMeta(meta.id, meta.name); });
                tabsEl.appendChild(btn);
            });

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.id = ids.add;
            addBtn.className = 'vision-tab-add';
            addBtn.setAttribute('aria-label', cfg.addMetaLabel);
            addBtn.title = cfg.addMetaLabel;
            addBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>`;
            addBtn.addEventListener('click', addMeta);
            tabsEl.appendChild(addBtn);
        }

        function switchMetaTab(id) {
            if (_activeMetaId === id) return;
            _activeMetaId = id;
            const tabsEl = document.getElementById(ids.tabs);
            if (tabsEl) tabsEl.querySelectorAll('.vision-tab-btn').forEach(b => {
                b.classList.toggle('vision-tab-active', Number(b.dataset.metaId) === id);
            });
            renderFeed();
        }

        /* ---------- Feed masonry ---------- */
        function renderFeed() {
            const feedEl = document.getElementById(ids.feed);
            if (!feedEl) return;

            if (!_activeMetaId) {
                feedEl.innerHTML = `<div class="vision-feed-empty">${esc(cfg.emptyMetas)}</div>`;
                return;
            }

            const imagenes = _imagesByMeta[_activeMetaId] || [];
            feedEl.innerHTML = '';

            if (imagenes.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'vision-feed-empty';
                empty.textContent = cfg.emptyFeed;
                feedEl.appendChild(empty);
            } else {
                imagenes.forEach(img => {
                    const tile = document.createElement('div');
                    tile.className = 'vision-feed-item';
                    tile.tabIndex = 0;
                    tile.setAttribute('role', 'button');
                    tile.title = cfg.counterHint;
                    tile.innerHTML = `<img src="assets/images/${esc(img.image_filename)}" class="vision-feed-img" alt="" draggable="false" onerror="handleImgFallback(this)">`;

                    actualizarContador(tile, img, false);
                    activarDobleClic(tile, img);

                    tile.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        deleteImage(img.id, _activeMetaId);
                    });
                    feedEl.appendChild(tile);
                });
            }

            const addTile = document.createElement('button');
            addTile.type = 'button';
            addTile.className = 'vision-feed-add';
            addTile.title = cfg.addImageLabel;
            addTile.innerHTML = `
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Agregar imagen</span>`;
            addTile.addEventListener('click', () => addImage(_activeMetaId));
            feedEl.appendChild(addTile);
        }

        /* ---------- Contador de cada imagen ---------- */
        function iconSvg(size) {
            return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${cfg.iconInner}</svg>`;
        }

        function actualizarContador(tile, img, animar) {
            const n = Number(img.veces) || 0;
            let badge = tile.querySelector('.vision-feed-count');

            if (n <= 0) {
                if (badge) badge.remove();
            } else {
                if (!badge) {
                    badge = document.createElement('button');
                    badge.type = 'button';
                    badge.className = 'vision-feed-count';
                    badge.addEventListener('click', (e) => { e.stopPropagation(); corregirVeces(tile, img); });
                    tile.appendChild(badge);
                }
                badge.innerHTML = `${iconSvg(13)}<span>${n}</span>`;
                badge.title = cfg.counterTitle;
                badge.setAttribute('aria-label', `${n} ${n === 1 ? 'vez' : 'veces'}. Toca para corregir`);

                if (animar) {
                    badge.classList.remove('vision-feed-count--bump');
                    void badge.offsetWidth;
                    badge.classList.add('vision-feed-count--bump');
                }
            }
            tile.setAttribute('aria-label', `Imagen${n > 0 ? `, contador ${n}` : ''}. Doble clic o Enter para sumar una vez.`);
        }

        function activarDobleClic(tile, img) {
            let ultimo = 0, ux = 0, uy = 0;

            tile.addEventListener('pointerup', (e) => {
                if (e.target.closest('.vision-feed-count')) return;
                if (e.pointerType === 'mouse' && e.button !== 0) return;

                const ahora = Date.now();
                const cerca = Math.hypot(e.clientX - ux, e.clientY - uy) < 40;
                if (ahora - ultimo < DOBLE_CLIC_MS && cerca) {
                    ultimo = 0;
                    sumarVez(tile, img, e);
                } else {
                    ultimo = ahora; ux = e.clientX; uy = e.clientY;
                }
            });

            tile.addEventListener('keydown', (e) => {
                if (e.target !== tile) return;
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sumarVez(tile, img, null); }
            });
        }

        function lanzarIcono(tile, evt) {
            const rect = tile.getBoundingClientRect();
            const x = evt && evt.clientX != null ? evt.clientX - rect.left : rect.width / 2;
            const y = evt && evt.clientY != null ? evt.clientY - rect.top : rect.height / 2;
            const el = document.createElement('span');
            el.className = 'vision-heart-burst';
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            el.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${cfg.iconInner}</svg>`;
            tile.appendChild(el);
            setTimeout(() => el.remove(), 800);
        }

        function sumarVez(tile, img, evt) {
            img.veces = (Number(img.veces) || 0) + 1;
            actualizarContador(tile, img, true);
            lanzarIcono(tile, evt);
            if (navigator.vibrate) navigator.vibrate(15);
            guardarVeces(img);
        }

        function corregirVeces(tile, img) {
            const txt = prompt(cfg.counterPrompt, String(Number(img.veces) || 0));
            if (txt === null) return;
            const n = parseInt(txt, 10);
            if (!Number.isFinite(n) || n < 0) { alert('Escribe un número entero (0 o mayor).'); return; }
            img.veces = n;
            actualizarContador(tile, img, false);
            guardarVeces(img);
        }

        // Escrituras encadenadas por imagen: el último valor siempre queda guardado.
        function guardarVeces(img) {
            const previa = _pendingSaves[img.id] || Promise.resolve();
            _pendingSaves[img.id] = previa.then(async () => {
                const { error } = await _supabase
                    .from(cfg.imagesTable).update({ veces: Number(img.veces) || 0 }).eq('id', img.id);
                if (error) {
                    console.error('Error guardando el contador:', error.message);
                    alert('No se pudo guardar el contador: ' + error.message + '\n\nRevisa que la tabla "' + cfg.imagesTable + '" tenga la columna "veces". El SQL está al inicio de vision_board.js.');
                }
            });
        }

        /* ---------- CRUD ---------- */
        async function addMeta() {
            const name = prompt(cfg.promptMeta);
            if (!name || name.trim() === '') return;
            const { data, error } = await _supabase.from(cfg.metasTable).insert([{ name: name.trim() }]).select();
            if (error) { alert('Error al guardar: ' + error.message); return; }
            if (data && data[0]) _activeMetaId = data[0].id;
            loadMetas();
        }

        async function editMetaName(id, oldName) {
            const newName = prompt(cfg.promptEdit, oldName);
            if (!newName || newName.trim() === '' || newName === oldName) return;
            const { error } = await _supabase.from(cfg.metasTable).update({ name: newName.trim() }).eq('id', id);
            if (error) alert('Error al editar: ' + error.message);
            else loadMetas();
        }

        async function deleteMeta(id, name) {
            if (!confirm(cfg.confirmDelete(name))) return;
            await _supabase.from(cfg.imagesTable).delete().eq('meta_id', id);
            const { error } = await _supabase.from(cfg.metasTable).delete().eq('id', id);
            if (error) { alert('Error al eliminar: ' + error.message); return; }
            if (_activeMetaId === id) _activeMetaId = null;
            loadMetas();
        }

        async function addImage(metaId) {
            const input = prompt('Nombre del archivo de imagen para el feed (debe estar en assets/images/):', 'default.jpg');
            if (input === null || input.trim() === '') return;
            const { data, error } = await _supabase
                .from(cfg.imagesTable).insert([{ meta_id: metaId, image_filename: input.trim() }]).select();
            if (error) { alert('Error al guardar la imagen: ' + error.message); return; }
            if (!_imagesByMeta[metaId]) _imagesByMeta[metaId] = [];
            if (data && data[0]) _imagesByMeta[metaId].unshift(data[0]);
            if (metaId === _activeMetaId) renderFeed();
        }

        async function deleteImage(imageId, metaId) {
            if (!confirm('¿Eliminar esta imagen del feed?')) return;
            const { error } = await _supabase.from(cfg.imagesTable).delete().eq('id', imageId);
            if (error) { alert('Error al eliminar la imagen: ' + error.message); return; }
            if (_imagesByMeta[metaId]) _imagesByMeta[metaId] = _imagesByMeta[metaId].filter(i => i.id !== imageId);
            if (metaId === _activeMetaId) renderFeed();
        }

        /* ---------- Abrir / cerrar la subvista ---------- */
        function handleKeydown(e) {
            if (e.key === 'Escape' && isOpen()) close();
        }

        function open() {
            const view = viewEl();
            if (!view) { console.warn(`${cfg.key}: no existe #${cfg.viewId} en el HTML.`); return; }
            if (!_loaded) {
                buildSkeleton();
                document.addEventListener('keydown', handleKeydown);
                _loaded = true;
            }
            if (!isOpen()) {
                const activeView = document.querySelector('.bottom-view.active');
                _previousViewId = activeView ? activeView.id : 'view-home';
            }
            document.querySelectorAll('.bottom-view').forEach(v => v.classList.remove('active'));
            view.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loadMetas();
        }

        function close() {
            const view = viewEl();
            if (view) view.classList.remove('active');
            const target = document.getElementById(_previousViewId || 'view-home');
            if (target) target.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        return { open, close };
    }

    /* ==========================================
       INSTANCIAS
       ========================================== */
    const metas = createMetaBoard({
        key: 'vision',
        rootId: 'vision-board-root',
        viewId: 'view-vision-board',
        metasTable: 'vision_metas',
        imagesTable: 'vision_meta_images',
        iconInner: HEART_ICON,
        addMetaLabel: 'Agregar una nueva meta',
        addImageLabel: 'Agregar imagen a esta meta',
        promptMeta: '¿Cuál es la meta o propósito? (ej: "Certificado B2 de Inglés")',
        promptEdit: 'Editar nombre de la meta:',
        confirmDelete: (name) => `¿Eliminar la meta "${name}", y sus imágenes?`,
        emptyMetas: 'Aún no tienes metas. Toca "+" para crear la primera.',
        emptyFeed: 'Todavía no hay imágenes en el feed de esta meta. Agrega fotos que te inspiren.',
        counterHint: 'Doble clic: la viví',
        counterTitle: 'Veces vivida (toca para corregir)',
        counterPrompt: '¿Cuántas veces has vivido esto? (0 quita el contador)',
    });
    window.openVisionBoard = metas.open;
    window.closeVisionBoard = metas.close;

    const odios = createMetaBoard({
        key: 'odios',
        rootId: 'odios-board-root',
        viewId: 'view-odios-board',
        metasTable: 'odio_metas',
        imagesTable: 'odio_meta_images',
        iconInner: BOLT_ICON,
        addMetaLabel: 'Agregar un nuevo odio',
        addImageLabel: 'Agregar imagen a este odio',
        promptMeta: '¿Qué es lo que NO quieres en tu vida? (ej: "Procrastinar")',
        promptEdit: 'Editar nombre del odio:',
        confirmDelete: (name) => `¿Eliminar "${name}", y sus imágenes?`,
        emptyMetas: 'Aún no tienes odios. Toca "+" para agregar el primero.',
        emptyFeed: 'Todavía no hay imágenes aquí. Agrega fotos que te recuerden por qué lo evitas.',
        counterHint: 'Doble clic: me volvió a pasar',
        counterTitle: 'Veces que ocurrió (toca para corregir)',
        counterPrompt: '¿Cuántas veces te ha pasado esto? (0 quita el contador)',
    });
    window.openOdiosBoard = odios.open;
    window.closeOdiosBoard = odios.close;
})();