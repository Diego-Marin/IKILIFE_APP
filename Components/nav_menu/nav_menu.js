/**
 * ==========================================
 * COMPONENTE: NAV MENU (Barra de tabs fija en el header)
 * ==========================================
 * Genera la barra de tabs original (todas visibles, con emoji),
 * usando las clases .tabs / .tab-btn / .tab-active / .tab-inactive
 * ya definidas en styles.css. Reutiliza tal cual la función global
 * switchTab(tab, btn) de main.js.
 *
 * Requiere en el HTML un contenedor vacío, por ejemplo:
 *   <div id="nav-menu-container"></div>
 * colocado donde antes estaba el <nav class="tabs">.
 */
(function () {
   const TABS = [
    { id: 'habits', label: 'Habits', icon: '✅' },
    { id: 'ideas', label: 'Brain Dump', icon: '💡' },
    { id: 'tareas', label: 'Tareas', icon: '📝' },
    { id: 'loves', label: 'Loves', icon: '❤️' },
    { id: 'odios', label: 'Odios', icon: '💢' },
    { id: 'sentimientos', label: 'Sentimientos', icon: '🌊' },
    { id: 'reglas', label: 'Planes', icon: '📅' },
    { id: 'money', label: 'Finance', icon: '💰' },
    { id: 'compras', label: 'Compras', icon: '🛒' },
];

    function buildTabsBar() {
        const nav = document.createElement('nav');
        nav.className = 'tabs';

        TABS.forEach((tab, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tab-btn' + (index === 0 ? ' tab-active' : ' tab-inactive');
            btn.dataset.tab = tab.id;
            btn.textContent = `${tab.icon} ${tab.label}`;
            btn.addEventListener('click', () => switchTab(tab.id, btn));
            nav.appendChild(btn);
        });

        return nav;
    }

    function initNavMenu() {
        const container = document.getElementById('nav-menu-container');
        if (!container) {
            console.warn('nav_menu: no existe #nav-menu-container en el HTML.');
            return;
        }
        container.appendChild(buildTabsBar());
    }

    document.addEventListener('DOMContentLoaded', initNavMenu);
})();