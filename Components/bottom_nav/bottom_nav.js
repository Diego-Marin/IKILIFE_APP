/**
 * ==========================================
 * BOTTOM NAVIGATION (Pegado + SVG + Minimal)
 * ==========================================
 */
(function () {
    const TABS = [
        {
            id: 'home',
            label: 'Inicio',
            svg: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>'
        },
        {
            id: 'tracking',
            label: 'Hábitos',
            svg: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>'
        },
        {
            id: 'planes',
            label: 'Planes',
            svg: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>'
        },
        {
    id: 'money',
    label: 'Finanzas',
    svg: '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>'
},
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
                <svg class="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    ${tab.svg}
                </svg>
                <span class="nav-label">${tab.label}</span>
            `;
            btn.addEventListener('click', () => switchBottomTab(tab.id));
            inner.appendChild(btn);
        });

        return nav;
    }

    window.switchBottomTab = function (tabId) {
        currentTab = tabId;

        document.querySelectorAll('.bottom-nav-item').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tabId);
        });

        document.querySelectorAll('.bottom-view').forEach(v => v.classList.remove('active'));

        const target = document.getElementById('view-' + tabId);
        if (target) target.classList.add('active');

        if (tabId === 'home') {
            updateWeeklyProgress();
            if (typeof loadEspejoDelAlma === 'function') loadEspejoDelAlma();
            if (typeof renderYearWeeks === 'function') renderYearWeeks();
            if (typeof loadHomeUpcomingPlans === 'function') loadHomeUpcomingPlans();
        }

      if (tabId === 'tracking') {
    const activeBtn = document.querySelector('#view-tracking .camino-tab-active');
    const sub = activeBtn ? activeBtn.dataset.subtab : 'cabello';
    switchTrackingTab(sub, activeBtn);
}

        if (tabId === 'planes') {
            if (typeof loadPlanes === 'function') loadPlanes();
            if (typeof loadTareas === 'function') loadTareas();
            if (typeof loadIdeas === 'function') loadIdeas();
        }

        if (tabId === 'money') {
            if (typeof loadFinances === 'function') loadFinances();
            if (typeof loadCompras === 'function') loadCompras();
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