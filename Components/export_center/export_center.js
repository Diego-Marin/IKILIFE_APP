/**
 * ==========================================
 * COMPONENTE: EXPORT CENTER (Selector de exportación JSON)
 * ==========================================
 * ANTES, el botón "export-json-btn" del header descargaba de una vez
 * un único .json gigante con TODAS las tablas de la app
 * (exportAllDataJSON en main.js), y luego (segunda versión) se abría
 * en una ventana flotante tipo modal con fondo oscuro.
 *
 * AHORA sigue este mismo patrón: al tocarlo se abre una SUBVISTA de
 * pantalla completa dentro del flujo normal de la app (igual que
 * Brain Dump / "view-planes" → "planes-ideas"), con un botón de
 * "volver" en vez de un botón de cerrar flotando sobre un fondo
 * oscuro. Ya no es una ventana flotante: es una vista más de la app.
 *
 * La lógica de traer los datos de Supabase y armar/descargar el
 * .json vive en main.js (exportSupabaseTablesJSON / exportAllDataJSON
 * / fetchAllRows / descargarArchivo) — este archivo solo construye la
 * interfaz del selector y decide qué tablas corresponden a cada
 * categoría.
 *
 * REQUIERE en index.html:
 *   <div id="view-export-center" class="bottom-view">
 *     ...botón volver...
 *     <section class="category" id="export-center-content"></section>
 *   </div>
 *   <link rel="stylesheet" href=".../export_center.css">
 *   <script src=".../export_center.js"></script>  (después de main.js)
 * Y que el botón del header llame a openExportCenter() en vez de
 * exportAllDataJSON() directamente.
 */
(function () {
    // Debe reflejar las tablas reales de cada sección (ver
    // TABLAS_EXPORTABLES en main.js). Si agregas una tabla nueva a la
    // app, súmala aquí también en la categoría que corresponda.
    const EXPORT_CATEGORIES = [
        { key: 'habitos', label: 'Hábitos', icon: '✅', tables: ['habit_logs'] },
        { key: 'finanzas', label: 'Finanzas', icon: '💰', tables: ['finance_logs', 'inversiones_logs'] },
        { key: 'ideas', label: 'Brain Dump / Ideas', icon: '💡', tables: ['ideas_logs'] },
        {
            key: 'sentimientos', label: 'Sentimientos (Loves / Odios)', icon: '❤️',
            tables: ['loves_logs', 'odios_logs', 'odios_registros', 'sentimientos_logs', 'sentimientos_registros']
        },
        { key: 'compras', label: 'Compras', icon: '🛒', tables: ['compras_logs'] },
        { key: 'planes', label: 'Planes', icon: '📅', tables: ['planes_logs'] },
        { key: 'ingles', label: 'Inglés', icon: '🇬🇧', tables: ['english_classes'] },
    ];

    let _busy = false;
    // Recuerda qué vista estaba activa antes de abrir el export
    // center, para volver exactamente ahí al presionar "volver"
    // (mismo criterio que closeIdeasView -> showPlanesMain()).
    let _previousViewId = null;

    function contentEl() {
        return document.getElementById('export-center-content');
    }

    function render() {
        const content = contentEl();
        if (!content) return;

        const optionsHTML = EXPORT_CATEGORIES.map(cat => `
            <button type="button" class="export-center-option" data-key="${cat.key}">
                <span class="export-center-option-icon">${cat.icon}</span>
                <span class="export-center-option-label">${cat.label}</span>
                <span class="export-center-option-arrow">↓</span>
            </button>
        `).join('');

        content.innerHTML = `
            <div class="item-list-header export-center-intro">
                <span class="export-center-title">📤 Exportar datos</span>
                <span class="export-center-subtitle">
                    Elige qué quieres descargar. Cada archivo es un .json listo para
                    analizar con una IA.
                </span>
            </div>
            <div class="export-center-options" id="export-center-options">
                ${optionsHTML}
            </div>
            <button type="button" class="add-habit-btn export-center-all-btn" id="export-center-all-btn">
                ⬇️ Descargar TODO en un solo archivo
            </button>
            <div class="export-center-status" id="export-center-status"></div>
        `;

        content.querySelectorAll('.export-center-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const cat = EXPORT_CATEGORIES.find(c => c.key === btn.dataset.key);
                if (cat) runExport(() => exportSupabaseTablesJSON(cat.tables, cat.label), btn);
            });
        });

        const allBtn = content.querySelector('#export-center-all-btn');
        allBtn.addEventListener('click', () => runExport(() => exportAllDataJSON(), allBtn));
    }

    /**
     * Evita doble clic mientras se está generando un archivo (las
     * tablas grandes como habit_logs pueden tardar unos segundos en
     * paginarse por completo — ver fetchAllRows en main.js) y muestra
     * un estado simple de "Generando...".
     */
    async function runExport(fn, triggerBtn) {
        if (_busy) return;
        _busy = true;

        const status = document.getElementById('export-center-status');
        const buttons = document.querySelectorAll('.export-center-option, .export-center-all-btn');
        buttons.forEach(b => b.disabled = true);
        if (status) status.textContent = 'Generando archivo...';

        try {
            await fn();
            if (status) status.textContent = '✓ Descarga lista.';
        } catch (e) {
            if (status) status.textContent = 'Ocurrió un error, revisa la consola.';
        } finally {
            buttons.forEach(b => b.disabled = false);
            _busy = false;
        }
    }

    window.openExportCenter = function () {
        const exportView = document.getElementById('view-export-center');
        if (!exportView) {
            console.warn('export_center: no existe #view-export-center en el HTML.');
            return;
        }

        const activeView = document.querySelector('.bottom-view.active');
        _previousViewId = activeView ? activeView.id : 'view-home';

        document.querySelectorAll('.bottom-view').forEach(v => v.classList.remove('active'));
        render();
        exportView.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.closeExportCenter = function () {
        const exportView = document.getElementById('view-export-center');
        if (exportView) exportView.classList.remove('active');

        const target = document.getElementById(_previousViewId || 'view-home');
        if (target) target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
})();