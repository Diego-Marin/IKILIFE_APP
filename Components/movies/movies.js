/**
 * ==========================================
 * COMPONENTE: PELÍCULAS (catálogo Pirateria TV dentro de IKILIFE)
 * ==========================================
 * Misma base de datos que la app React (tablas "movies" y "episodes"),
 * pero en otro proyecto de Supabase, por eso usa su propio cliente.
 *
 *   · Pestañas Películas / Series / Cursos + buscador
 *   · Series y cursos: ventana con módulos/temporadas y capítulos
 *   · Reproductor a pantalla completa: URL directa (R2) con subtítulos y
 *     reanudación, o iframe de Google Drive
 *
 * REQUIERE en index.html:
 *   <div id="view-movies" class="bottom-view"><div id="movies-root"></div></div>
 *   <link rel="stylesheet" href="./Components/movies/movies.css">
 *   <script defer src="./Components/movies/movies.js"></script>
 * y la pestaña en bottom_nav.js (llama a window.loadMovies()).
 * Usa el global "supabase" (CDN) y escapeHtml (main.js).
 */
(function () {
    'use strict';

    const MOVIES_URL = 'https://smxtpyleadfidoljixde.supabase.co';
    const MOVIES_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNteHRweWxlYWRmaWRvbGppeGRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNjA5NTUsImV4cCI6MjA5NTczNjk1NX0.peAxwgJERdx-yRSkcqTvuSS3zVYO_jn4vV9cvOkvuYU';

    const MOVIE_COLUMNS = 'id, title, description, category, year, cover_url, drive_file_id, video_url, subtitle_url, type';
    const EPISODE_COLUMNS = 'id, series_id, season, episode, title, drive_file_id, video_url, subtitle_url';
    const CATEGORIES = [
        { id: 'movie', label: 'Películas', empty: 'películas' },
        { id: 'series', label: 'Series', empty: 'series' },
        { id: 'course', label: 'Cursos', empty: 'cursos' },
    ];
    const CACHE_MS = 5 * 60 * 1000;
    const TYPE_LABELS = { series: 'Serie', course: 'Curso' };

    let _db = null;
    let _movies = [];
    let _loadedAt = 0;
    let _loading = false;
    let _cat = 'movie';
    let _query = '';
    const _episodes = {};

    let _series = null;
    let _season = null;
    let _seriesEl = null;
    let _playerEl = null;
    let _playerCleanup = null;
    let _locks = 0;
    let _prevOverflow = '';

    const rootEl = () => document.getElementById('movies-root');
    const gridEl = () => document.getElementById('mv-grid');
    const esc = t => (typeof escapeHtml === 'function' ? escapeHtml(t) : String(t == null ? '' : t));

    function db() {
        if (!_db) {
            _db = supabase.createClient(MOVIES_URL, MOVIES_KEY, {
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
            });
        }
        return _db;
    }

    /* ---------- Normalización (igual que movieService.js) ---------- */
    const clean = v => ((v || '').trim() || null);

    function driveId(value) {
        const text = value || '';
        const p = text.includes('/d/') ? text.split('/d/')[1] : text;
        return p.trim().split(/[/?]/)[0];
    }

    function coverUrl(value) {
        const url = (value || '').trim();
        if (!url) return null;
        if (url.includes('drive.google.com/thumbnail') || url.includes('googleusercontent.com')) return url;
        if (url.includes('drive.google.com/file/d/')) return `https://lh3.googleusercontent.com/d/${driveId(url)}=w600`;
        if (/^[\w-]{20,}$/.test(url)) return `https://lh3.googleusercontent.com/d/${url}=w600`;
        return url;
    }

    function mapMovie(r) {
        return {
            id: r.id, title: r.title, description: r.description, category: r.category, year: r.year,
            type: ['series', 'course'].includes(r.type) ? r.type : 'movie',
            coverUrl: coverUrl(r.cover_url),
            driveFileId: driveId(r.drive_file_id),
            videoUrl: clean(r.video_url),
            subtitleUrl: clean(r.subtitle_url),
        };
    }

    function mapEpisode(r) {
        return {
            id: r.id, season: r.season, episode: r.episode, title: r.title,
            driveFileId: driveId(r.drive_file_id),
            videoUrl: clean(r.video_url),
            subtitleUrl: clean(r.subtitle_url),
        };
    }

    function lockScroll() {
        if (_locks++ === 0) { _prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    }
    function unlockScroll() {
        if (--_locks <= 0) { _locks = 0; document.body.style.overflow = _prevOverflow; }
    }

    /* ==========================================
       CATÁLOGO
       ========================================== */
    function buildShell(root) {
        if (root.dataset.mvBuilt) return;
        root.dataset.mvBuilt = '1';

        root.innerHTML = `
            <div class="camino-tabs mv-tabs">
                ${CATEGORIES.map(c => `<button type="button" class="camino-tab-btn${c.id === _cat ? ' camino-tab-active' : ''}" data-mv-cat="${c.id}"><span class="camino-tab-label">${c.label}</span></button>`).join('')}
            </div>
            <input class="wt-input mv-search" type="search" placeholder="Buscar por título" aria-label="Buscar por título">
            <div id="mv-grid"></div>`;

        root.addEventListener('click', (e) => {
            const tab = e.target.closest('[data-mv-cat]');
            if (tab) {
                _cat = tab.dataset.mvCat;
                root.querySelectorAll('[data-mv-cat]').forEach(b => b.classList.toggle('camino-tab-active', b === tab));
                renderGrid();
                return;
            }
            const card = e.target.closest('[data-mv-id]');
            if (card) selectMovie(_movies.find(m => String(m.id) === card.dataset.mvId));
        });

        root.querySelector('.mv-search').addEventListener('input', (e) => {
            _query = e.target.value;
            renderGrid();
        });
    }

    function cardHtml(m) {
        const meta = [TYPE_LABELS[m.type], m.year, m.category].filter(Boolean).join(' · ');
        return `
        <button type="button" class="mv-card" data-mv-id="${esc(m.id)}" aria-label="${esc(m.title)}">
            <div class="mv-poster">
                <span class="mv-fallback">${esc(m.title)}</span>
                ${m.coverUrl ? `<img src="${esc(m.coverUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
            </div>
            <span class="mv-title">${esc(m.title)}</span>
            ${meta ? `<span class="mv-meta">${esc(meta)}</span>` : ''}
        </button>`;
    }

    function renderGrid() {
        const grid = gridEl();
        if (!grid) return;
        const q = _query.trim().toLowerCase();
        const list = _movies.filter(m => m.type === _cat &&
            (!q || `${m.title} ${m.category || ''} ${m.description || ''}`.toLowerCase().includes(q)));

        if (list.length === 0) {
            const label = CATEGORIES.find(c => c.id === _cat).empty;
            grid.innerHTML = `<div class="mv-msg">${q ? 'Sin resultados.' : `Aún no hay ${label}.`}</div>`;
            return;
        }
        grid.innerHTML = `<div class="mv-grid">${list.map(cardHtml).join('')}</div>`;
    }

    async function load(force) {
        const root = rootEl();
        if (!root) return;
        buildShell(root);

        if (!force && _movies.length && Date.now() - _loadedAt < CACHE_MS) { renderGrid(); return; }
        if (_loading) return;
        _loading = true;
        if (!_movies.length) gridEl().innerHTML = '<div class="mv-msg">Cargando catálogo…</div>';

        const { data, error } = await db().from('movies').select(MOVIE_COLUMNS).order('created_at', { ascending: false });
        _loading = false;

        if (error) {
            console.error('Error cargando películas:', error.message);
            if (!_movies.length) gridEl().innerHTML = `<div class="mv-msg">No se pudo cargar el catálogo.<br>${esc(error.message)}</div>`;
            return;
        }
        _movies = (data || []).map(mapMovie);
        _loadedAt = Date.now();
        renderGrid();
    }

    function selectMovie(m) {
        if (!m) return;
        if (m.type === 'series' || m.type === 'course') openSeries(m);
        else openPlayer({ title: m.title, driveFileId: m.driveFileId, videoUrl: m.videoUrl, subtitleUrl: m.subtitleUrl });
    }

    /* ==========================================
       SERIES / CURSOS
       ========================================== */
    async function openSeries(m) {
        closeSeries();
        _series = m;
        _season = null;

        const meta = [m.year, m.category].filter(Boolean).join(' · ');
        const el = document.createElement('div');
        el.className = 'mv-modal';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-label', m.title);
        el.innerHTML = `
            <div class="mv-panel">
                <header class="mv-head">
                    <div>
                        <h2 class="mv-head-title">${esc(m.title)}</h2>
                        ${meta ? `<p class="mv-meta">${esc(meta)}</p>` : ''}
                    </div>
                    <button type="button" class="mv-x" data-mv-act="close-series" aria-label="Cerrar">✕</button>
                </header>
                ${m.description ? `<p class="mv-desc">${esc(m.description)}</p>` : ''}
                <div class="mv-body"><div class="mv-msg">Cargando capítulos…</div></div>
            </div>`;

        el.addEventListener('click', (e) => {
            if (e.target === el || e.target.closest('[data-mv-act="close-series"]')) return closeSeries();
            const s = e.target.closest('[data-mv-season]');
            if (s) { _season = Number(s.dataset.mvSeason); return renderEpisodes(); }
            const ep = e.target.closest('[data-mv-ep]');
            if (ep) playEpisode(ep.dataset.mvEp);
        });

        document.body.appendChild(el);
        _seriesEl = el;
        lockScroll();

        if (!_episodes[m.id]) {
            const { data, error } = await db().from('episodes').select(EPISODE_COLUMNS)
                .eq('series_id', m.id)
                .order('season', { ascending: true })
                .order('episode', { ascending: true });
            if (_series !== m || !_seriesEl) return;
            if (error) {
                _seriesEl.querySelector('.mv-body').innerHTML = `<div class="mv-msg">No se pudieron cargar los capítulos.<br>${esc(error.message)}</div>`;
                return;
            }
            _episodes[m.id] = (data || []).map(mapEpisode);
        }
        renderEpisodes();
    }

    function renderEpisodes() {
        if (!_seriesEl || !_series) return;
        const body = _seriesEl.querySelector('.mv-body');
        const list = _episodes[_series.id] || [];
        const isCourse = _series.type === 'course';

        if (list.length === 0) {
            body.innerHTML = `<div class="mv-msg">${isCourse ? 'Aún no hay clases.' : 'Aún no hay capítulos.'}</div>`;
            return;
        }

        const seasons = [...new Set(list.map(e => e.season))].sort((a, b) => a - b);
        const current = _season != null && seasons.includes(_season) ? _season : seasons[0];
        const eps = list.filter(e => e.season === current);

        body.innerHTML = `
            <div class="mv-seasons">
                ${seasons.map(s => `<button type="button" class="mv-season${s === current ? ' mv-season--on' : ''}" data-mv-season="${s}">${isCourse ? 'Módulo' : 'Temporada'} ${s}</button>`).join('')}
            </div>
            <ul class="mv-eps">
                ${eps.map(e => `
                <li><button type="button" class="mv-ep" data-mv-ep="${esc(e.id)}">
                    <span class="mv-ep-num">${e.episode}</span>
                    <span class="mv-ep-title">${esc(e.title || `${isCourse ? 'Clase' : 'Capítulo'} ${e.episode}`)}</span>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                </button></li>`).join('')}
            </ul>`;
    }

    function playEpisode(id) {
        const list = _episodes[_series.id] || [];
        const ep = list.find(e => String(e.id) === String(id));
        if (!ep) return;
        const isCourse = _series.type === 'course';
        const code = `${isCourse ? 'M' : 'T'}${ep.season} ${isCourse ? 'C' : 'E'}${ep.episode}`;
        openPlayer({
            title: `${_series.title} · ${code}${ep.title ? ` · ${ep.title}` : ''}`,
            driveFileId: ep.driveFileId, videoUrl: ep.videoUrl, subtitleUrl: ep.subtitleUrl,
        });
    }

    function closeSeries() {
        if (!_seriesEl) return;
        _seriesEl.remove();
        _seriesEl = null;
        _series = null;
        unlockScroll();
    }

    /* ==========================================
       REPRODUCTOR
       ========================================== */
    async function openPlayer({ title, driveFileId, videoUrl, subtitleUrl }) {
        closePlayer();

        const el = document.createElement('div');
        el.className = 'mv-player';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-label', title);

        const bar = document.createElement('div');
        bar.className = 'mv-bar' + (videoUrl ? '' : ' mv-bar--plain');
        bar.innerHTML = `<button type="button" class="mv-x mv-x--dark" aria-label="Cerrar">✕</button>${videoUrl ? `<span class="mv-bar-title">${esc(title)}</span>` : ''}`;
        bar.querySelector('button').addEventListener('click', closePlayer);

        let cleanup = () => {};

        if (videoUrl) {
            const v = document.createElement('video');
            v.className = 'mv-video';
            v.controls = true;
            v.autoplay = true;
            v.playsInline = true;
            v.preload = 'auto';

            const withSubs = Boolean(subtitleUrl);
            if (withSubs) {
                v.crossOrigin = 'anonymous';
                const t = document.createElement('track');
                t.kind = 'subtitles';
                t.src = subtitleUrl;
                t.srclang = 'es';
                t.label = 'Subtítulos';
                t.default = true;
                v.appendChild(t);
            }
            v.src = videoUrl;

            // Avance guardado en este navegador, una entrada por video.
            const key = 'pirateria:progress:' + videoUrl;
            const save = () => {
                try {
                    const t = v.currentTime, d = v.duration;
                    if (!d) return;
                    if (t < 10 || d - t < 30) localStorage.removeItem(key);
                    else localStorage.setItem(key, JSON.stringify({ t: Math.floor(t) }));
                } catch (e) { /* sin almacenamiento */ }
            };
            let lastSaved = 0;
            v.addEventListener('loadedmetadata', () => {
                try {
                    const s = JSON.parse(localStorage.getItem(key) || 'null');
                    if (s && s.t > 10 && s.t < v.duration - 30) v.currentTime = s.t;
                } catch (e) { /* dato corrupto */ }
            });
            v.addEventListener('timeupdate', () => {
                if (v.currentTime > 0 && Date.now() - lastSaved > 5000) { lastSaved = Date.now(); save(); }
            });
            v.addEventListener('pause', save);
            v.addEventListener('ended', () => { try { localStorage.removeItem(key); } catch (e) { /* */ } });

            // Si el bucket no tiene CORS, reintenta sin subtítulos para que al menos se reproduzca.
            let retried = false;
            v.addEventListener('error', () => {
                if (withSubs && !retried) {
                    retried = true;
                    v.querySelectorAll('track').forEach(t => t.remove());
                    v.removeAttribute('crossorigin');
                    v.src = videoUrl;
                    v.load();
                    v.play().catch(() => {});
                } else {
                    const msg = document.createElement('div');
                    msg.className = 'mv-msg mv-player-msg';
                    msg.textContent = 'No se pudo reproducir este video.';
                    el.appendChild(msg);
                }
            });

            el.appendChild(v);
            cleanup = () => { save(); v.pause(); v.removeAttribute('src'); v.load(); };
        } else if (driveFileId) {
            const wrap = document.createElement('div');
            wrap.className = 'mv-drive';
            const f = document.createElement('iframe');
            f.src = `https://drive.google.com/file/d/${driveFileId}/preview`;
            f.title = title;
            f.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
            f.allowFullscreen = true;
            wrap.appendChild(f);
            const shield = document.createElement('div');
            shield.className = 'mv-shield';
            wrap.appendChild(shield);
            el.appendChild(wrap);

            // Drive rompe sus controles por debajo de ~888x483: se renderiza grande y se reduce.
            const measure = () => {
                const cw = wrap.clientWidth, ch = wrap.clientHeight;
                if (!cw || !ch) return;
                const s = Math.min(1, cw / 888, ch / 483);
                f.style.width = (cw / s) + 'px';
                f.style.height = (ch / s) + 'px';
                f.style.transform = `scale(${s})`;
            };
            const ro = new ResizeObserver(measure);
            ro.observe(wrap);
            cleanup = () => ro.disconnect();
        } else {
            const msg = document.createElement('div');
            msg.className = 'mv-msg mv-player-msg';
            msg.textContent = 'Este contenido todavía no tiene un video asociado.';
            el.appendChild(msg);
        }

        el.appendChild(bar);

        const onFs = () => { if (!document.fullscreenElement && _playerEl && videoUrl) closePlayer(); };
        document.addEventListener('fullscreenchange', onFs);

        document.body.appendChild(el);
        _playerEl = el;
        _playerCleanup = () => {
            cleanup();
            document.removeEventListener('fullscreenchange', onFs);
        };
        lockScroll();

        try {
            if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
            await screen.orientation?.lock?.('landscape');
        } catch (e) { /* iOS / sin soporte: queda a pantalla completa de la página */ }
    }

    function closePlayer() {
        if (!_playerEl) return;
        const el = _playerEl;
        _playerEl = null;
        if (_playerCleanup) { _playerCleanup(); _playerCleanup = null; }
        el.remove();
        unlockScroll();
        try { screen.orientation?.unlock?.(); } catch (e) { /* */ }
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (_playerEl) closePlayer();
        else if (_seriesEl) closeSeries();
    });

    window.loadMovies = load;
})();