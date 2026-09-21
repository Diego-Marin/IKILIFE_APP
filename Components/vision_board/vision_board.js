/**
 * ==========================================
 * COMPONENTE: VISION BOARD (Metas)
 * ==========================================
 * Se abre desde el botón del header (junto al de Brain Dump), NO
 * vive dentro del bottom-nav: es una vista de pantalla completa,
 * igual que Auth Lock, que se superpone a toda la app.
 *
 * REDISEÑO: cada meta ahora es un TAB en la parte de arriba (en vez
 * de una tarjeta larga en una lista vertical). Al tocar un tab se
 * abre, debajo, un feed de imágenes estilo Pinterest (masonry, 2
 * columnas) con todas las fotos de inspiración de esa meta — se
 * siente como un feed de inspiración navegable, no como una lista de
 * fichas. Justo encima del feed sigue viviendo la info de siempre
 * (nombre editable, % de avance y el selector para conectar la meta
 * con una categoría de Hábitos).
 *
 * CONEXIÓN CON HÁBITOS (sin cambios en la lógica):
 * Cada meta se puede conectar a una categoría de Hábitos (las de
 * HABIT_CATEGORIES en main.js). Una vez conectada, se muestra una
 * barra de progreso con el % histórico REAL de cumplimiento de esa
 * categoría (mismo cálculo que ya usaba Metas y que usa "Espejo del
 * Alma" para Hábitos — días cumplidos / días posibles desde que
 * empezó cada hábito), así que avanza solo, automáticamente, cada
 * vez que registras esos hábitos.
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
    let _isOpen = false;

    // Estado en memoria: metas cargadas, imágenes por meta y tab activo.
    let _metas = [];
    let _imagesByMeta = {}; // { [metaId]: [{id, image_filename}, ...] }
    let _progresoPorTag = {};
    let _activeMetaId = null;

    function buildOverlaySkeleton() {
        const overlay = document.getElementById('vision-board-overlay');
        if (!overlay) return null;

        overlay.innerHTML = `
            <div class="vision-board-header">
                <div class="vision-board-title">
                    <svg class="vision-board-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="9"></circle>
                        <circle cx="12" cy="12" r="5"></circle>
                        <circle cx="12" cy="12" r="1"></circle>
                    </svg>
                    <span class="vision-board-title-text">Metas</span>
                </div>
                <div class="vision-board-header-actions">
                    <button type="button" class="icon-btn" id="vision-add-btn" aria-label="Agregar meta"
                        title="Agregar una nueva meta">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <button type="button" class="icon-btn" id="vision-close-btn" aria-label="Cerrar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="vision-tabs-bar">
                <div class="vision-tabs" id="vision-tabs"></div>
            </div>
            <div class="vision-feed" id="vision-feed"></div>
            <div class="vision-meta-detail" id="vision-meta-detail"></div>
        `;

        overlay.querySelector('#vision-add-btn').addEventListener('click', addVisionMeta);
        overlay.querySelector('#vision-close-btn').addEventListener('click', closeVisionBoard);

        return overlay;
    }

    /* ==========================================
       PROGRESO REAL POR CATEGORÍA DE HÁBITO
       ==========================================
       Sin cambios respecto a la versión anterior: mismo criterio que
       calcularBalanceHabitosHistorico() en mood_tracker.js (días
       cumplidos / días posibles desde el primer registro de cada
       hábito), calculado para un grupo de tags a la vez con UNA sola
       consulta a habit_logs.
    */
    async function computeTagProgressMap(tags) {
        const result = {};
        if (!tags || tags.size === 0) return result;

        const { data, error } = await _supabase
            .from('habit_logs')
            .select('habit_name, log_date, is_completed, project_tag');

        if (error) {
            console.error('Error cargando habit_logs para el progreso de metas:', error.message);
            return result;
        }

        const buckets = {};
        tags.forEach(t => { buckets[t] = { inicioPorHabito: {}, cumplidosSet: new Set() }; });

        (data || []).forEach(log => {
            // Misma fuente única de verdad que el resto de la app (ver
            // resolveHabitTag en main.js): evita que un hábito cuente a
            // la vez en dos categorías distintas cuando el nombre y el
            // campo project_tag no coinciden.
            const tag = (typeof resolveHabitTag === 'function')
                ? resolveHabitTag(log.habit_name, log.project_tag)
                : (log.project_tag || '').toUpperCase();
            if (!tags.has(tag)) return;

            const bucket = buckets[tag];
            const nombre = log.habit_name;
            if (!bucket.inicioPorHabito[nombre] || log.log_date < bucket.inicioPorHabito[nombre]) {
                bucket.inicioPorHabito[nombre] = log.log_date;
            }
            if (log.is_completed) bucket.cumplidosSet.add(`${nombre}|${log.log_date}`);
        });

        const hoyISO = (typeof getFechaHoyISO === 'function') ? getFechaHoyISO() : new Date().toISOString().slice(0, 10);

        tags.forEach(tag => {
            const bucket = buckets[tag];
            const nombres = Object.keys(bucket.inicioPorHabito);

            if (nombres.length === 0) {
                result[tag] = { pct: 0, totalDias: 0, cumplidos: 0, sinDatos: true };
                return;
            }

            let totalDiasPosibles = 0;
            nombres.forEach(nombre => {
                const inicio = bucket.inicioPorHabito[nombre];
                totalDiasPosibles += (typeof diasEntreFechasISO === 'function')
                    ? diasEntreFechasISO(inicio, hoyISO) + 1
                    : 1;
            });

            const cumplidos = bucket.cumplidosSet.size;
            const pct = totalDiasPosibles > 0 ? Math.round((cumplidos / totalDiasPosibles) * 100) : 0;
            result[tag] = { pct, totalDias: totalDiasPosibles, cumplidos, sinDatos: false };
        });

        return result;
    }

    function buildTagOptions(selectedTag) {
        let opts = `<option value="">🔗 Sin conectar a un hábito</option>`;
        if (typeof HABIT_CATEGORIES === 'object' && HABIT_CATEGORIES) {
            Object.values(HABIT_CATEGORIES).forEach(cat => {
                const selected = cat.tag === selectedTag ? ' selected' : '';
                opts += `<option value="${cat.tag}"${selected}>${cat.icon} ${cat.label}</option>`;
            });
        }
        return opts;
    }

    /* ==========================================
       CARGA PRINCIPAL: metas + TODAS sus imágenes + progreso
       ==========================================
       Se trae todo de una vez (metas, imágenes de TODAS las metas
       agrupadas por meta_id, y el progreso de hábitos) para que
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

        const tagsConectados = new Set(
            _metas.filter(m => m.linked_tag).map(m => (m.linked_tag || '').toUpperCase())
        );
        _progresoPorTag = await computeTagProgressMap(tagsConectados);

        // Mantiene el tab activo si sigue existiendo; si no, elige el
        // primero (o ninguno si ya no hay metas).
        if (!_activeMetaId || !_metas.some(m => m.id === _activeMetaId)) {
            _activeMetaId = _metas.length > 0 ? _metas[0].id : null;
        }

        renderTabs();
        renderMetaDetail();
        renderFeed();
    }

    function renderTabs() {
        const tabsEl = document.getElementById('vision-tabs');
        if (!tabsEl) return;

        if (_metas.length === 0) {
            tabsEl.innerHTML = `<div class="vision-tabs-empty">Aún no tienes metas. Toca "+" para crear la primera.</div>`;
            return;
        }

        tabsEl.innerHTML = '';
        _metas.forEach(meta => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'vision-tab-btn' + (meta.id === _activeMetaId ? ' vision-tab-active' : '');
            btn.dataset.metaId = meta.id;
            btn.textContent = meta.name;
            btn.addEventListener('click', () => switchVisionMetaTab(meta.id));
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                deleteVisionMeta(meta.id, meta.name);
            });
            tabsEl.appendChild(btn);
        });
    }

    window.switchVisionMetaTab = function (id) {
        if (_activeMetaId === id) return;
        _activeMetaId = id;
        document.querySelectorAll('.vision-tab-btn').forEach(b => {
            b.classList.toggle('vision-tab-active', Number(b.dataset.metaId) === id);
        });
        renderMetaDetail();
        renderFeed();
    };

    function renderMetaDetail() {
        const detailEl = document.getElementById('vision-meta-detail');
        if (!detailEl) return;

        const meta = _metas.find(m => m.id === _activeMetaId);
        if (!meta) {
            detailEl.innerHTML = '';
            return;
        }

        const linkedTag = meta.linked_tag ? meta.linked_tag.toUpperCase() : '';
        const progreso = linkedTag ? _progresoPorTag[linkedTag] : null;

        let pctPillHtml = '';
        let progresoHtml = '';
        if (progreso && !progreso.sinDatos) {
            pctPillHtml = `<span class="vision-meta-pct-pill">${progreso.pct}%</span>`;
            progresoHtml = `
                <div class="vision-meta-progress">
                    <div class="ik-bar-track">
                        <div class="ik-bar-fill ik-bar-fill--green" style="width:${progreso.pct}%;"></div>
                    </div>
                    <span class="vision-meta-progress-label">${progreso.cumplidos}/${progreso.totalDias} días cumplidos</span>
                </div>
            `;
        } else if (progreso && progreso.sinDatos) {
            progresoHtml = `<span class="vision-meta-progress-label">Sin hábitos registrados todavía en esta categoría.</span>`;
        }

        detailEl.innerHTML = `
            <div class="vision-meta-top">
                <span class="vision-meta-name" title="Clic para editar nombre">${meta.name}</span>
                ${pctPillHtml}
            </div>
            ${progresoHtml}
            <select class="vision-meta-tag-select" title="Conectar con una categoría de hábitos">
                ${buildTagOptions(linkedTag)}
            </select>
        `;

        detailEl.querySelector('.vision-meta-name').addEventListener('click', () => {
            editVisionMetaName(meta.id, meta.name);
        });

        detailEl.querySelector('.vision-meta-tag-select').addEventListener('change', (e) => {
            setVisionMetaLinkedTag(meta.id, e.target.value);
        });
    }

    /* ==========================================
       FEED ESTILO PINTEREST (masonry de 2 columnas)
       ==========================================
    */
    function renderFeed() {
        const feedEl = document.getElementById('vision-feed');
        if (!feedEl) return;

        if (!_activeMetaId) {
            feedEl.innerHTML = '';
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

    /* Conecta (o desconecta) la meta con una categoría de Hábitos —
       a partir de ahora su barra de progreso refleja el % real de
       cumplimiento histórico de esa categoría. */
    window.setVisionMetaLinkedTag = async function (id, tag) {
        const { error } = await _supabase
            .from('vision_metas')
            .update({ linked_tag: tag || null })
            .eq('id', id);

        if (error) {
            alert('Error al conectar la meta: ' + error.message);
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

    window.openVisionBoard = function () {
        const overlay = document.getElementById('vision-board-overlay');
        if (!overlay) {
            console.warn('vision_board: no existe #vision-board-overlay en el HTML.');
            return;
        }
        if (!_loaded) {
            buildOverlaySkeleton();
            _loaded = true;
        }
        overlay.classList.add('vision-board-active');
        document.body.style.overflow = 'hidden';
        _isOpen = true;
        loadVisionMetas();
    };

    window.closeVisionBoard = function () {
        const overlay = document.getElementById('vision-board-overlay');
        if (!overlay) return;
        overlay.classList.remove('vision-board-active');
        document.body.style.overflow = '';
        _isOpen = false;
    };

    /* Si la app registra/edita un hábito mientras Metas está
       abierto, refresca las barras de progreso al instante — así el
       avance se siente "en vivo" a medida que marcas hábitos. */
    try {
        if (typeof _supabase !== 'undefined') {
            _supabase.channel('vision-board-habit-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs' }, () => {
                    if (_isOpen) loadVisionMetas();
                })
                .subscribe();
        }
    } catch (e) {
        console.warn('vision_board: no se pudo suscribir a cambios en vivo de habit_logs.', e.message);
    }
})();