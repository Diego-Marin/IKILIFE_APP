/**
 * ==========================================
 * COMPONENTE: NAV MENU
 * ==========================================
 */
(function () {
    const TABS = [
        { id: 'habits', label: 'Habits', icon: '✅' },
        { id: 'ideas', label: 'Brain Dump', icon: '💡' },
        { id: 'tareas', label: 'Tareas', icon: '📝' },
        { id: 'sentimientos', label: 'Sentimientos', icon: '❤️' },
        { id: 'reglas', label: 'Planes', icon: '📅' },
        { id: 'money', label: 'Finance', icon: '💰' },
        { id: 'compras', label: 'Compras', icon: '🛒' },
        { id: 'english', label: 'Inglés', icon: '🇬🇧' },
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