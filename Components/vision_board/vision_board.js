/**
 * ==========================================
 * COMPONENTE: VISION BOARD (Metas)
 * ==========================================
 * Se abre desde el botón del header (junto al de Brain Dump), NO
 * vive dentro del bottom-nav: es una vista de pantalla completa,
 * igual que Auth Lock, que se superpone a toda la app.
 *
 * Es el "resultado final" de cada área de la app: cada tarjeta es una
 * meta/propósito (ej: "Certificado B2 de inglés", "Cuerpo sano") con
 * un nombre editable y UNA foto grande que inspire. Por rendimiento
 * en mobile, cada meta muestra una sola imagen (no un carrusel) —
 * mismo criterio que Compras/Loves/Hábitos, que también usan una
 * sola imagen por tarjeta desde assets/images/.
 *
 * CONEXIÓN CON HÁBITOS (NUEVO):
 * Cada meta se puede conectar a una categoría de Hábitos (las de
 * HABIT_CATEGORIES en main.js: Cabello, Sexualidad, Piel, Cuerpo,
 * Dinero, Salud Emocional, o cualquier personalizada que el usuario
 * haya creado). Una vez conectada, la tarjeta muestra una barra de
 * progreso con el % histórico REAL de cumplimiento de esa categoría
 * (mismo cálculo que usa "Espejo del Alma" para Hábitos — días
 * cumplidos / días posibles desde que empezó cada hábito), así que
 * avanza solo, automáticamente, cada vez que registras esos hábitos.
 *
 * TABLA REQUERIDA EN SUPABASE:
 *   CREATE TABLE vision_metas (
 *     id bigint generated always as identity PRIMARY KEY,
 *     name text NOT NULL,
 *     image_filename text NOT NULL DEFAULT 'default.jpg',
 *     linked_tag text,
 *     created_at timestamptz DEFAULT now()
 *   );
 *
 * Si la tabla ya existía de antes (sin conexión a hábitos), solo
 * hace falta agregar la columna nueva:
 *   ALTER TABLE vision_metas ADD COLUMN linked_tag text;
 *
 * USO: cargar después de main.js y de mood_tracker.js (usa _supabase,
 * HABIT_CATEGORIES, getProjectFromHabitName, getFechaHoyISO y
 * diasEntreFechasISO — todas ya definidas por esos componentes).
 */
(function () {
    let _loaded = false;
    let _isOpen = false;

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
            <div class="vision-board-list" id="vision-board-list"></div>
        `;

        overlay.querySelector('#vision-add-btn').addEventListener('click', addVisionMeta);
        overlay.querySelector('#vision-close-btn').addEventListener('click', closeVisionBoard);

        return overlay;
    }

    /* ==========================================
       PROGRESO REAL POR CATEGORÍA DE HÁBITO
       ==========================================
       Mismo criterio que calcularBalanceHabitosHistorico() en
       mood_tracker.js (días cumplidos / días posibles desde el primer
       registro de cada hábito), pero calculado para un grupo de tags
       a la vez con UNA sola consulta a habit_logs (en vez de una
       consulta por meta), igual de eficiente que el resto de la app.
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
            const fromField = (log.project_tag || '').toUpperCase();
            const fromName = (typeof getProjectFromHabitName === 'function')
                ? getProjectFromHabitName(log.habit_name)
                : null;
            const tag = tags.has(fromField) ? fromField : (tags.has(fromName) ? fromName : null);
            if (!tag) return;

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

    async function loadVisionMetas() {
        const list = document.getElementById('vision-board-list');
        if (!list) return;

        const { data: metas, error } = await _supabase
            .from('vision_metas')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) return console.error('Error cargando vision_metas:', error.message);

        list.innerHTML = '';

        if (!metas || metas.length === 0) {
            list.innerHTML = `
                <div class="vision-board-empty">
                    Aún no agregas ninguna meta. Toca "+" para definir el propósito
                    detrás de tus hábitos (ej: "Certificado B2 de Inglés", "Cuerpo sano")
                    y conéctala con una categoría para ver su avance real.
                </div>
            `;
            return;
        }

        const tagsConectados = new Set(
            metas.filter(m => m.linked_tag).map(m => (m.linked_tag || '').toUpperCase())
        );
        const progresoPorTag = await computeTagProgressMap(tagsConectados);

        metas.forEach(meta => {
            const localImagePath = `assets/images/${meta.image_filename}`;
            const linkedTag = meta.linked_tag ? meta.linked_tag.toUpperCase() : '';
            const progreso = linkedTag ? progresoPorTag[linkedTag] : null;

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

            const card = document.createElement('div');
            card.className = 'vision-meta-card';
            card.innerHTML = `
                <div class="vision-meta-media">
                    <img src="${localImagePath}" class="vision-meta-img" onerror="this.src='assets/images/default.jpg'">
                    <button type="button" class="vision-meta-photo-btn" title="Cambiar imagen" aria-label="Cambiar imagen">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                    </button>
                </div>
                <div class="vision-meta-body">
                    <div class="vision-meta-top">
                        <span class="vision-meta-name" title="Clic para editar nombre">${meta.name}</span>
                        ${pctPillHtml}
                    </div>
                    ${progresoHtml}
                    <select class="vision-meta-tag-select" title="Conectar con una categoría de hábitos">
                        ${buildTagOptions(linkedTag)}
                    </select>
                </div>
            `;

            card.querySelector('.vision-meta-name').addEventListener('click', (e) => {
                e.stopPropagation();
                editVisionMetaName(meta.id, meta.name);
            });

            card.querySelector('.vision-meta-photo-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                setVisionMetaImage(meta.id);
            });

            card.querySelector('.vision-meta-tag-select').addEventListener('click', (e) => {
                e.stopPropagation();
            });

            card.querySelector('.vision-meta-tag-select').addEventListener('change', (e) => {
                e.stopPropagation();
                setVisionMetaLinkedTag(meta.id, e.target.value);
            });

            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                deleteVisionMeta(meta.id, meta.name);
            });

            list.appendChild(card);
        });
    }

    window.addVisionMeta = async function () {
        const name = prompt('¿Cuál es la meta o propósito? (ej: "Certificado B2 de Inglés")');
        if (!name || name.trim() === '') return;

        const image = prompt('Nombre del archivo de imagen que te inspire (debe estar en assets/images/):', 'default.jpg');
        if (image === null) return;

        const { error } = await _supabase
            .from('vision_metas')
            .insert([{ name: name.trim(), image_filename: image.trim() || 'default.jpg' }]);

        if (error) {
            alert('Error al guardar: ' + error.message);
        } else {
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

    window.setVisionMetaImage = async function (id) {
        const input = prompt('Nombre del archivo de imagen (debe estar en assets/images/):', 'default.jpg');
        if (input === null || input.trim() === '') return;

        const { error } = await _supabase
            .from('vision_metas')
            .update({ image_filename: input.trim() })
            .eq('id', id);

        if (error) {
            alert('Error al guardar la imagen: ' + error.message);
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
        const ok = confirm(`¿Eliminar la meta "${name}"?`);
        if (!ok) return;

        const { error } = await _supabase.from('vision_metas').delete().eq('id', id);
        if (error) {
            alert('Error al eliminar: ' + error.message);
        } else {
            loadVisionMetas();
        }
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