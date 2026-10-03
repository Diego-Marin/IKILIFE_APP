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
 * NOTA: se quitaron la cabecera de Metas (botón volver, título y resumen),
 * el bloque de detalle (#vision-meta-detail, con % de avance y enlace
 * a Hábitos) y el cálculo de progreso desde habit_logs. Se volverán a
 * agregar con las nuevas funcionalidades. Para volver atrás se usa la
 * barra inferior o la tecla Esc. Doble clic en un tab = renombrar;
 * clic derecho = eliminar.
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
 * Si la tabla vision_metas ya existía de antes con "image_filename"
 * (versión de una sola imagen por meta), esa columna se puede dejar
 * como está (ya no se usa) o eliminarse — no rompe nada:
 *   ALTER TABLE vision_metas DROP COLUMN IF EXISTS image_filename;
 *
 * USO: cargar después de main.js y de mood_tracker.js (usa _supabase,
 * HABIT_CATEGORIES, getProjectFromHabitName, getFechaHoyISO y
 * diasEntreFechasISO — todas ya definidas por esos componentes).
 */
(function () {
    let _loaded = false;

    // Estado en memoria: metas cargadas, imágenes por meta y tab activo.
    let _metas = [];
    let _imagesByMeta = {}; // { [metaId]: [{id, image_filename}, ...] }
    let _activeMetaId = null;

    function buildSkeleton() {
        const root = document.getElementById('vision-board-root');
        if (!root) return null;

        root.innerHTML = `
            <div class="vision-tabs-bar">
                <div class="vision-tabs" id="vision-tabs"></div>
            </div>
            <div class="vision-feed" id="vision-feed"></div>
        `;

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
        const ok = confirm(`¿Eliminar la meta "${name}" y todas sus imágenes del feed?`);
        if (!ok) return;

        await _supabase.from('vision_meta_images').delete().eq('meta_id', id);
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