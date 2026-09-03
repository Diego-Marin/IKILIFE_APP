/**
 * ==========================================
 * BOTTOM NAVIGATION
 * ==========================================
 */
(function () {
    const TABS = [
        { id: 'home', label: 'Inicio', icon: '🏠' },
        { id: 'tracking', label: 'Seguimiento', icon: '📊' },
        { id: 'camino', label: 'Camino', icon: '🌱' },
        { id: 'planes', label: 'Planes', icon: '📅' },
        { id: 'perfil', label: 'Perfil', icon: '👤' },
    ];

    let currentTab = 'home';

    function buildBottomNav() {
        const nav = document.createElement('nav');
        nav.className = 'bottom-nav';
        nav.innerHTML = '<div class="bottom-nav-inner" id="bottom-nav-inner"></div>';

        const inner = nav.querySelector('#bottom-nav-inner');
        TABS.forEach(tab => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'bottom-nav-item' + (tab.id === 'home' ? ' active' : '');
            btn.dataset.tab = tab.id;
            btn.innerHTML = `
                <span style="font-size:1.1rem; line-height:1;">${tab.icon}</span>
                <span>${tab.label}</span>
            `;
            btn.addEventListener('click', () => switchBottomTab(tab.id));
            inner.appendChild(btn);
        });

        return nav;
    }

    window.switchBottomTab = function (tabId) {
        currentTab = tabId;

        // UI: activar botón
        document.querySelectorAll('.bottom-nav-item').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tabId);
        });

        // Ocultar todas las vistas
        document.querySelectorAll('.bottom-view').forEach(v => v.classList.remove('active'));

        // Mostrar la vista destino
        const target = document.getElementById('view-' + tabId);
        if (target) target.classList.add('active');

        // Refrescos específicos por pestaña
        if (tabId === 'home') {
            updateWeeklyProgress();
            if (typeof loadEspejoDelAlma === 'function') loadEspejoDelAlma();
        }
        if (tabId === 'tracking') {
            loadHabits();
            loadTareas();
            loadIdeas();
        }
        if (tabId === 'planes') {
            loadPlanes();
        }
        if (tabId === 'perfil') {
            loadMetrics();
            if (typeof renderEnglishCourseWeeks === 'function') renderEnglishCourseWeeks();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function initBottomNav() {
        const container = document.querySelector('.container');
        if (!container) return;
        container.appendChild(buildBottomNav());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBottomNav);
    } else {
        initBottomNav();
    }
})();