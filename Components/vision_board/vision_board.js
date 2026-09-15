/**
 * ==========================================
 * COMPONENTE: VISION BOARD (Mi Propósito)
 * ==========================================
 * Se abre desde el botón 🎯 del header (junto al de Brain Dump), NO
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
 * TABLA REQUERIDA EN SUPABASE:
 *   CREATE TABLE vision_metas (
 *     id bigint generated always as identity PRIMARY KEY,
 *     name text NOT NULL,
 *     image_filename text NOT NULL DEFAULT 'default.jpg',
 *     created_at timestamptz DEFAULT now()
 *   );
 *
 * USO: cargar después de main.js (usa _supabase, igual que el resto
 * de componentes).
 */
(function () {
    let _loaded = false;

    function buildOverlaySkeleton() {
        const overlay = document.getElementById('vision-board-overlay');
        if (!overlay) return null;

        overlay.innerHTML = `
            <div class="vision-board-header">
                <span class="vision-board-title">🎯 Mi Propósito</span>
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
                    detrás de tus hábitos (ej: "Certificado B2 de Inglés", "Cuerpo sano").
                </div>
            `;
            return;
        }

        metas.forEach(meta => {
            const localImagePath = `assets/images/${meta.image_filename}`;

            const card = document.createElement('div');
            card.className = 'vision-meta-card';
            card.innerHTML = `
                <img src="${localImagePath}" class="vision-meta-img" onerror="this.src='assets/images/default.jpg'">
                <button type="button" class="vision-meta-photo-btn" title="Cambiar imagen">📷</button>
                <div class="vision-meta-caption">
                    <span class="vision-meta-name" title="Clic para editar nombre">${meta.name}</span>
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
        loadVisionMetas();
    };

    window.closeVisionBoard = function () {
        const overlay = document.getElementById('vision-board-overlay');
        if (!overlay) return;
        overlay.classList.remove('vision-board-active');
        document.body.style.overflow = '';
    };
})();
