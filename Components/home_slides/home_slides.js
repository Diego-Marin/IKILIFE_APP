/**
 * ==========================================
 * COMPONENTE: HOME SLIDES (imágenes motivacionales en Inicio)
 * ==========================================
 * Un carrusel al inicio de la pestaña Inicio que va rotando tus
 * imágenes motivacionales. Cada imagen ocupa TODO el ancho del
 * contenedor (recortada y centrada si su proporción es distinta).
 *
 * Comportamiento:
 *   - Rota solo cada SLIDE_INTERVAL_MS. Empieza en una imagen al azar.
 *   - No rota (para no perderte la imagen) si el mouse está encima, si
 *     estás tocando/deslizando, si la app está en segundo plano o si no
 *     estás viendo Inicio.
 *   - Navegación manual: deslizar con el dedo, puntos de abajo o
 *     flechas ← → del teclado (con el carrusel enfocado).
 *   - Con una sola imagen no rota ni muestra puntos.
 *
 * Gestión (botones arriba a la derecha de la imagen):
 *   agregar imagen · eliminar la imagen actual.
 * Igual que el resto de la app, solo se escribe el NOMBRE del archivo,
 * que debe existir en assets/images/.
 *
 * TABLA REQUERIDA EN SUPABASE:
 *   CREATE TABLE home_slides (
 *     id bigint generated always as identity PRIMARY KEY,
 *     image_filename text NOT NULL,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   (Si tu tabla ya tiene la columna "caption" de una versión anterior,
 *   ya no se usa: ALTER TABLE home_slides DROP COLUMN IF EXISTS caption;)
 *   (Si usas RLS en tus otras tablas, agrega la misma política aquí.)
 *
 * REQUIERE en index.html:
 *   <div id="home-slides-container"></div>   (dentro de #view-home)
 *   <link rel="stylesheet" href=".../home_slides.css">
 *   <script src=".../home_slides.js"></script>   (después de main.js)
 * Usa _supabase y handleImgFallback, definidos en main.js.
 */
(function () {
    const SLIDE_INTERVAL_MS = 6000;
    const SWIPE_MIN_PX = 40;

    let _slides = [];
    let _index = 0;
    let _timer = null;
    let _loaded = false;
    let _tablaDisponible = true;
    let _hovering = false;
    let _touching = false;

    function containerEl() {
        return document.getElementById('home-slides-container');
    }

    function esc(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /* ==========================================
       CARGA
       ========================================== */
    async function fetchSlides() {
        const { data, error } = await _supabase
            .from('home_slides')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error cargando home_slides:', error.message);
            _tablaDisponible = false;
            _slides = [];
            return;
        }

        _tablaDisponible = true;
        _slides = data || [];
    }

    // Se llama al arrancar y cada vez que vuelves a Inicio: la primera
    // vez carga los datos; las siguientes solo reanuda la rotación.
    window.loadHomeSlides = async function () {
        if (_loaded) {
            restartTimer();
            return;
        }
        _loaded = true;
        await fetchSlides();
        _index = _slides.length > 0 ? Math.floor(Math.random() * _slides.length) : 0;
        render();
        restartTimer();
    };

    /* ==========================================
       RENDER
       ========================================== */
    const ICON_ADD = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
    const ICON_TRASH = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>';

    function render() {
        const root = containerEl();
        if (!root) return;

        if (!_tablaDisponible) {
            root.innerHTML = `
                <div class="hs-message">Para las imágenes de Inicio falta crear la tabla <strong>home_slides</strong> en Supabase. El SQL está al inicio de home_slides.js.</div>`;
            return;
        }

        if (_slides.length === 0) {
            root.innerHTML = `
                <button type="button" class="hs-empty" data-action="add">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                        stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Agrega tu primera imagen motivacional</span>
                </button>`;
            bindRoot(root);
            return;
        }

        const slidesHtml = _slides.map((s, i) => `
            <figure class="hs-slide${i === _index ? ' hs-slide--active' : ''}" aria-hidden="${i === _index ? 'false' : 'true'}">
                <img src="assets/images/${esc(s.image_filename)}" alt="Imagen motivacional"
                    ${i === _index ? '' : 'loading="lazy"'} decoding="async" draggable="false" onerror="handleImgFallback(this)">
            </figure>`).join('');

        const dotsHtml = _slides.length > 1
            ? `<div class="hs-dots">${_slides.map((_, i) => `
                <button type="button" class="hs-dot${i === _index ? ' hs-dot--active' : ''}" data-action="goto" data-i="${i}"
                    aria-label="Ir a la imagen ${i + 1} de ${_slides.length}"></button>`).join('')}</div>`
            : '';

        root.innerHTML = `
            <section class="hs" role="region" aria-roledescription="carousel" aria-label="Imágenes motivacionales" tabindex="0">
                <div class="hs-viewport">
                    ${slidesHtml}
                    <div class="hs-controls">
                        <button type="button" class="hs-btn" data-action="add" aria-label="Agregar imagen" title="Agregar imagen">${ICON_ADD}</button>
                        <button type="button" class="hs-btn" data-action="delete" aria-label="Eliminar imagen actual" title="Eliminar esta imagen">${ICON_TRASH}</button>
                    </div>
                    ${dotsHtml}
                </div>
            </section>`;

        bindRoot(root);
        bindSection(root.querySelector('.hs'));
    }

    // Un solo listener de clic por contenedor (se reutiliza entre renders).
    function bindRoot(root) {
        if (root.dataset.hsBound) return;
        root.dataset.hsBound = '1';
        root.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            switch (btn.dataset.action) {
                case 'add': return addSlide();
                case 'delete': return deleteCurrentSlide();
                case 'goto': return goTo(Number(btn.dataset.i), true);
            }
        });
    }

    // Listeners del carrusel en sí (el elemento se recrea en cada render).
    function bindSection(sec) {
        if (!sec) return;

        sec.addEventListener('mouseenter', () => { _hovering = true; });
        sec.addEventListener('mouseleave', () => { _hovering = false; });

        let startX = 0;
        let startY = 0;
        sec.addEventListener('touchstart', (e) => {
            _touching = true;
            startX = e.changedTouches[0].clientX;
            startY = e.changedTouches[0].clientY;
        }, { passive: true });
        sec.addEventListener('touchend', (e) => {
            _touching = false;
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
                goTo(dx < 0 ? _index + 1 : _index - 1, true);
            }
        }, { passive: true });
        sec.addEventListener('touchcancel', () => { _touching = false; }, { passive: true });

        sec.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); goTo(_index + 1, true); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(_index - 1, true); }
        });
    }

    /* ==========================================
       NAVEGACIÓN Y ROTACIÓN
       ========================================== */
    // Solo cambia clases (sin volver a pintar) para que la transición
    // de desvanecido funcione.
    function goTo(i, fromUser) {
        if (_slides.length === 0) return;
        _index = ((i % _slides.length) + _slides.length) % _slides.length;

        const root = containerEl();
        if (!root) return;
        root.querySelectorAll('.hs-slide').forEach((el, n) => {
            el.classList.toggle('hs-slide--active', n === _index);
            el.setAttribute('aria-hidden', n === _index ? 'false' : 'true');
        });
        root.querySelectorAll('.hs-dot').forEach((el, n) => {
            el.classList.toggle('hs-dot--active', n === _index);
        });

        // Tras un cambio manual, la siguiente rotación espera el intervalo completo.
        if (fromUser) restartTimer();
    }

    function tick() {
        if (_slides.length < 2) return;
        if (_hovering || _touching || document.hidden) return;

        const home = document.getElementById('view-home');
        if (!home || !home.classList.contains('active')) return;

        goTo(_index + 1, false);
    }

    function restartTimer() {
        clearInterval(_timer);
        _timer = _slides.length > 1 ? setInterval(tick, SLIDE_INTERVAL_MS) : null;
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) restartTimer();
    });

    /* ==========================================
       AGREGAR / ELIMINAR
       ========================================== */
    async function addSlide() {
        const archivo = prompt('Nombre del archivo de imagen (debe estar en assets/images/):');
        if (!archivo || archivo.trim() === '') return;

        const { data, error } = await _supabase
            .from('home_slides')
            .insert([{ image_filename: archivo.trim() }])
            .select();

        if (error) {
            alert('Error al guardar la imagen: ' + error.message);
            return;
        }

        if (data && data[0]) {
            _slides.push(data[0]);
            _index = _slides.length - 1;   // muestra la recién agregada
        }
        render();
        restartTimer();
    }

    async function deleteCurrentSlide() {
        const slide = _slides[_index];
        if (!slide) return;
        if (!confirm('¿Eliminar esta imagen de Inicio?')) return;

        const { error } = await _supabase.from('home_slides').delete().eq('id', slide.id);
        if (error) {
            alert('Error al eliminar: ' + error.message);
            return;
        }

        _slides = _slides.filter(s => s.id !== slide.id);
        _index = Math.min(_index, Math.max(0, _slides.length - 1));
        render();
        restartTimer();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.loadHomeSlides());
    } else {
        window.loadHomeSlides();
    }
})();