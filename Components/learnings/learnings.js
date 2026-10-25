/**
 * ==========================================
 * COMPONENTE: APRENDIZAJES (botón del header)
 * ==========================================
 * Antes "Learnings" era una lista de hábitos más dentro de Hábitos, con
 * chips de días. Ahora es un componente independiente (botón en el
 * header) y se mide distinto:
 *
 *   · Cada aprendizaje (hábito con project_tag = 'LEARNINGS') tiene sus
 *     REGLAS: las imágenes con título que ya usabas como micro reglas.
 *   · DOBLE CLIC (o doble toque / Enter) sobre la imagen de una regla =
 *     "la apliqué" y suma +1 a su contador.
 *   · Cada regla avanza hacia una META de aplicaciones (por defecto 10,
 *     se cambia con el ⚙️). Su avance = veces / meta, con tope de 100%.
 *   · La barra de cada aprendizaje es el PROMEDIO del avance de sus
 *     reglas, y la tarjeta de arriba es el promedio de todos.
 *
 * Los aprendizajes ya no aparecen en la barra de pestañas de Hábitos ni
 * cuentan en "Hábitos de hoy" del Espejo del Alma (ver LEARNINGS_TAG en
 * main.js).
 *
 * REQUIERE UNA COLUMNA NUEVA en la tabla de reglas:
 *   ALTER TABLE habit_rule_images ADD COLUMN IF NOT EXISTS veces integer NOT NULL DEFAULT 0;
 *
 * Usa _supabase, handleImgFallback, openHeaderView y closeHeaderView
 * (definidos en main.js): cargar este archivo después de main.js.
 */
(function () {
    const TAG = 'LEARNINGS';
    const META_KEY = 'ikilife_learning_meta';
    const META_DEFAULT = 10;
    const DOBLE_CLIC_MS = 320;
    const SQL_HINT = 'ALTER TABLE habit_rule_images ADD COLUMN IF NOT EXISTS veces integer NOT NULL DEFAULT 0;';

    let _habits = [];
    let _rulesByHabit = {};
    let _rulesById = {};
    let _last = { id: 0, t: 0, x: 0, y: 0 };
    const _pendingSaves = {};

    function rootEl() { return document.getElementById('learnings-root'); }

    function esc(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function cleanName(name) {
        return typeof cleanHabitName === 'function' ? cleanHabitName(name) : name;
    }

    function getMeta() {
        const saved = parseInt(localStorage.getItem(META_KEY), 10);
        return Number.isFinite(saved) && saved > 0 ? saved : META_DEFAULT;
    }

    /* ---------- Cálculos ---------- */
    const veces = r => Number(r.veces) || 0;
    const ruleFrac = (r, meta) => Math.min(1, veces(r) / meta);
    const avgFrac = (rules, meta) =>
        rules.length ? rules.reduce((a, r) => a + ruleFrac(r, meta), 0) / rules.length : 0;
    const pct = f => Math.round(f * 100);

    /* ---------- Carga ---------- */
    async function load() {
        const root = rootEl();
        if (!root) return;

        const [habRes, ruleRes] = await Promise.all([
            _supabase.from('habit_logs').select('habit_name').eq('project_tag', TAG),
            _supabase.from('habit_rule_images').select('*')
                .order('sort_order', { ascending: true }).order('id', { ascending: true }),
        ]);

        if (habRes.error) {
            console.error('Error cargando aprendizajes:', habRes.error.message);
            root.innerHTML = `<div class="lr-empty">No se pudieron cargar los aprendizajes (${esc(habRes.error.message)}).</div>`;
            return;
        }
        if (ruleRes.error) console.error('Error cargando reglas:', ruleRes.error.message);

        _habits = [...new Set((habRes.data || []).map(h => h.habit_name))]
            .sort((a, b) => a.localeCompare(b));
        const valid = new Set(_habits);

        _rulesByHabit = {};
        _rulesById = {};
        (ruleRes.data || []).forEach(r => {
            if (!valid.has(r.habit_name)) return;
            if (!_rulesByHabit[r.habit_name]) _rulesByHabit[r.habit_name] = [];
            _rulesByHabit[r.habit_name].push(r);
            _rulesById[r.id] = r;
        });

        render();
    }

    /* ---------- Render ---------- */
    function ruleTileHtml(r, meta) {
        const n = veces(r);
        return `
        <div class="lr-rule" data-rule-id="${r.id}">
            <div class="lr-rule-media" tabindex="0" role="button" title="Doble clic: apliqué esta regla">
                <img class="lr-rule-img" src="assets/images/${esc(r.image_filename)}" alt="" draggable="false" loading="lazy" decoding="async" onerror="handleImgFallback(this)">
                <button type="button" class="lr-rule-btn lr-rule-btn--edit" data-act="rule-image" aria-label="Cambiar imagen" title="Cambiar imagen">✎</button>
                <button type="button" class="lr-rule-btn lr-rule-btn--del" data-act="rule-del" aria-label="Quitar regla" title="Quitar regla">×</button>
                <button type="button" class="lr-rule-count" data-act="rule-count" title="Veces aplicada (toca para corregir)">${n}/${meta}</button>
            </div>
            <div class="ik-bar-track lr-rule-bar"><div class="ik-bar-fill ik-bar-fill--green" style="width:${pct(ruleFrac(r, meta))}%;"></div></div>
            <span class="lr-rule-title${r.title ? '' : ' lr-rule-title--empty'}" data-act="rule-title" title="Clic para editar el título">${r.title ? esc(r.title) : 'Sin título'}</span>
        </div>`;
    }

    function habitCardHtml(name, meta) {
        const rules = _rulesByHabit[name] || [];
        const f = avgFrac(rules, meta);
        const sum = rules.reduce((a, r) => a + Math.min(veces(r), meta), 0);

        return `
        <article class="lr-card" data-habit="${esc(name)}">
            <div class="lr-card-head">
                <span class="lr-card-name">${esc(cleanName(name))}</span>
                <span class="lr-card-pct">${pct(f)}%</span>
                <button type="button" class="lr-icon" data-act="habit-edit" aria-label="Renombrar" title="Renombrar">✎</button>
                <button type="button" class="lr-icon lr-icon--del" data-act="habit-del" aria-label="Eliminar aprendizaje" title="Eliminar aprendizaje">🗑</button>
            </div>
            <div class="ik-bar-track lr-card-bar"><div class="ik-bar-fill ik-bar-fill--green" style="width:${pct(f)}%;"></div></div>
            <div class="lr-card-sub">${rules.length ? `${rules.length} ${rules.length === 1 ? 'regla' : 'reglas'} · ${sum}/${rules.length * meta} aplicaciones` : 'Agrega las reglas (imágenes) de este aprendizaje'}</div>
            <div class="lr-rules">
                ${rules.map(r => ruleTileHtml(r, meta)).join('')}
                <button type="button" class="lr-rule-add" data-act="rule-add" aria-label="Agregar regla" title="Agregar regla">+</button>
            </div>
        </article>`;
    }

    function render() {
        const root = rootEl();
        if (!root) return;
        bind(root);

        const meta = getMeta();
        const allRules = _habits.flatMap(h => _rulesByHabit[h] || []);
        const overall = pct(avgFrac(allRules, meta));
        const total = allRules.reduce((a, r) => a + veces(r), 0);

        root.innerHTML = `
        <section class="lr-summary">
            <div class="lr-summary-top">
                <span class="lr-summary-title">Progreso de aprendizaje</span>
                <button type="button" class="lr-icon" data-act="meta" aria-label="Cambiar meta" title="Meta de aplicaciones por regla">⚙️</button>
            </div>
            <div class="lr-summary-main">
                <span class="lr-summary-pct">${overall}<small>%</small></span>
                <span class="lr-summary-count">${total} aplicaciones · meta ${meta} por regla</span>
            </div>
            <div class="ik-bar-track"><div class="ik-bar-fill ik-bar-fill--green" style="width:${overall}%;"></div></div>
        </section>

        <div class="lr-toolbar">
            <button type="button" class="add-habit-btn" data-act="habit-add">+ Nuevo aprendizaje</button>
        </div>

        ${_habits.length === 0
            ? '<div class="lr-empty">Aún no tienes aprendizajes. Crea el primero y agrégale reglas con imágenes.</div>'
            : _habits.map(h => habitCardHtml(h, meta)).join('')}
        `;
    }

    /* Actualiza barras y números sin reconstruir el DOM (así el doble clic
       seguido y la animación no se interrumpen). */
    function updateProgressUI() {
        const root = rootEl();
        if (!root) return;
        const meta = getMeta();

        root.querySelectorAll('.lr-rule').forEach(el => {
            const r = _rulesById[Number(el.dataset.ruleId)];
            if (!r) return;
            el.querySelector('.lr-rule-count').textContent = `${veces(r)}/${meta}`;
            el.querySelector('.lr-rule-bar .ik-bar-fill').style.width = pct(ruleFrac(r, meta)) + '%';
        });

        root.querySelectorAll('.lr-card').forEach(el => {
            const rules = _rulesByHabit[el.dataset.habit] || [];
            const f = avgFrac(rules, meta);
            const sum = rules.reduce((a, r) => a + Math.min(veces(r), meta), 0);
            el.querySelector('.lr-card-pct').textContent = pct(f) + '%';
            el.querySelector('.lr-card-bar .ik-bar-fill').style.width = pct(f) + '%';
            el.querySelector('.lr-card-sub').textContent =
                `${rules.length} ${rules.length === 1 ? 'regla' : 'reglas'} · ${sum}/${rules.length * meta} aplicaciones`;
        });

        const allRules = _habits.flatMap(h => _rulesByHabit[h] || []);
        const overall = pct(avgFrac(allRules, meta));
        const total = allRules.reduce((a, r) => a + veces(r), 0);
        const pctEl = root.querySelector('.lr-summary-pct');
        if (pctEl) pctEl.innerHTML = `${overall}<small>%</small>`;
        const cntEl = root.querySelector('.lr-summary-count');
        if (cntEl) cntEl.textContent = `${total} aplicaciones · meta ${meta} por regla`;
        const barEl = root.querySelector('.lr-summary .ik-bar-fill');
        if (barEl) barEl.style.width = overall + '%';
    }

    /* ---------- Doble clic = +1 ---------- */
    function burst(media, evt) {
        const rect = media.getBoundingClientRect();
        const x = evt && evt.clientX != null ? evt.clientX - rect.left : rect.width / 2;
        const y = evt && evt.clientY != null ? evt.clientY - rect.top : rect.height / 2;
        const el = document.createElement('span');
        el.className = 'lr-burst';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4.5 12.5 9.5 17.5 19.5 6.5"></polyline></svg>';
        media.appendChild(el);
        setTimeout(() => el.remove(), 800);
    }

    function sumar(id, media, evt) {
        const r = _rulesById[id];
        if (!r) return;
        r.veces = veces(r) + 1;
        updateProgressUI();
        burst(media, evt);
        if (navigator.vibrate) navigator.vibrate(15);
        guardarVeces(r);
    }

    // Escrituras encadenadas por regla: el último valor siempre queda guardado.
    function guardarVeces(r) {
        const previa = _pendingSaves[r.id] || Promise.resolve();
        _pendingSaves[r.id] = previa.then(async () => {
            const { error } = await _supabase
                .from('habit_rule_images').update({ veces: veces(r) }).eq('id', r.id);
            if (error) {
                console.error('Error guardando el contador:', error.message);
                alert('No se pudo guardar el contador: ' + error.message +
                    '\n\nAgrega la columna en Supabase:\n' + SQL_HINT);
            }
        });
    }

    /* ---------- Eventos ---------- */
    function bind(root) {
        if (root.dataset.lrBound) return;
        root.dataset.lrBound = '1';

        root.addEventListener('pointerup', (e) => {
            if (e.target.closest('button')) return;
            const media = e.target.closest('.lr-rule-media');
            if (!media) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;

            const id = Number(media.closest('.lr-rule').dataset.ruleId);
            const now = Date.now();
            const cerca = Math.hypot(e.clientX - _last.x, e.clientY - _last.y) < 40;
            if (_last.id === id && now - _last.t < DOBLE_CLIC_MS && cerca) {
                _last = { id: 0, t: 0, x: 0, y: 0 };
                sumar(id, media, e);
            } else {
                _last = { id, t: now, x: e.clientX, y: e.clientY };
            }
        });

        root.addEventListener('keydown', (e) => {
            const media = e.target.closest && e.target.closest('.lr-rule-media');
            if (!media || e.target !== media) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                sumar(Number(media.closest('.lr-rule').dataset.ruleId), media, null);
            }
        });

        root.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            const card = btn.closest('.lr-card');
            const habit = card ? card.dataset.habit : null;
            const ruleEl = btn.closest('.lr-rule');
            const ruleId = ruleEl ? Number(ruleEl.dataset.ruleId) : null;

            switch (btn.dataset.act) {
                case 'meta': return setMeta();
                case 'habit-add': return addHabit();
                case 'habit-edit': return editHabit(habit);
                case 'habit-del': return deleteHabit(habit);
                case 'rule-add': return addRule(habit);
                case 'rule-image': return editRuleImage(ruleId);
                case 'rule-title': return editRuleTitle(ruleId);
                case 'rule-count': return fixCount(ruleId);
                case 'rule-del': return deleteRule(ruleId);
            }
        });
    }

    /* ---------- CRUD ---------- */
    function refreshOthers() {
        if (typeof invalidateHabitsCache === 'function') invalidateHabitsCache();
    }

    function setMeta() {
        const input = prompt('¿Cuántas aplicaciones por regla cuentan como aprendizaje logrado? (meta)', String(getMeta()));
        if (input === null) return;
        const n = parseInt(input, 10);
        if (!Number.isFinite(n) || n <= 0) { alert('Ingresa un número válido mayor a 0.'); return; }
        localStorage.setItem(META_KEY, String(n));
        render();
    }

    async function addHabit() {
        const name = prompt('¿Qué quieres aprender?');
        if (!name || name.trim() === '') return;
        const { error } = await _supabase.from('habit_logs').insert([{
            habit_name: name.trim(),
            log_date: formatDateLocal(new Date()),
            is_completed: false,
            project_tag: TAG,
        }]);
        if (error) { alert('Error al guardar: ' + error.message); return; }
        refreshOthers();
        load();
    }

    async function editHabit(oldName) {
        if (!oldName) return;
        const newName = prompt('Editar nombre:', cleanName(oldName));
        if (!newName || newName.trim() === '' || newName.trim() === oldName) return;
        const updated = newName.trim();

        const { error } = await _supabase.from('habit_logs')
            .update({ habit_name: updated }).eq('habit_name', oldName).eq('project_tag', TAG);
        if (error) { alert('Error al editar: ' + error.message); return; }
        await _supabase.from('habit_rule_images').update({ habit_name: updated }).eq('habit_name', oldName);
        refreshOthers();
        load();
    }

    async function deleteHabit(name) {
        if (!name) return;
        if (!confirm(`¿Eliminar "${cleanName(name)}", sus reglas y todo su progreso?`)) return;
        const { error } = await _supabase.from('habit_logs')
            .delete().eq('habit_name', name).eq('project_tag', TAG);
        if (error) { alert('Error al eliminar: ' + error.message); return; }
        await _supabase.from('habit_rule_images').delete().eq('habit_name', name);
        refreshOthers();
        load();
    }

    async function addRule(habit) {
        if (!habit) return;
        const file = prompt('Nombre del archivo de imagen (debe estar en assets/images/):');
        if (file === null || file.trim() === '') return;
        const title = prompt('Título corto de la regla (opcional):', '');
        if (title === null) return;

        const nextOrder = (_rulesByHabit[habit] || []).reduce((mx, r) => Math.max(mx, r.sort_order || 0), 0) + 1;
        const { error } = await _supabase.from('habit_rule_images').insert([{
            habit_name: habit, image_filename: file.trim(), title: title.trim(), sort_order: nextOrder,
        }]);
        if (error) { alert('Error al guardar: ' + error.message); return; }
        load();
    }

    async function editRuleImage(id) {
        const r = _rulesById[id];
        if (!r) return;
        const file = prompt('Nombre del archivo de imagen (debe estar en assets/images/):', r.image_filename);
        if (file === null || file.trim() === '' || file.trim() === r.image_filename) return;
        const { error } = await _supabase.from('habit_rule_images').update({ image_filename: file.trim() }).eq('id', id);
        if (error) alert('Error al guardar la imagen: ' + error.message);
        else load();
    }

    async function editRuleTitle(id) {
        const r = _rulesById[id];
        if (!r) return;
        const title = prompt('Título corto de esta regla:', r.title || '');
        if (title === null || title.trim() === (r.title || '')) return;
        const { error } = await _supabase.from('habit_rule_images').update({ title: title.trim() }).eq('id', id);
        if (error) alert('Error al guardar el título: ' + error.message);
        else load();
    }

    function fixCount(id) {
        const r = _rulesById[id];
        if (!r) return;
        const txt = prompt('¿Cuántas veces has aplicado esta regla?', String(veces(r)));
        if (txt === null) return;
        const n = parseInt(txt, 10);
        if (!Number.isFinite(n) || n < 0) { alert('Escribe un número entero (0 o mayor).'); return; }
        r.veces = n;
        updateProgressUI();
        guardarVeces(r);
    }

    async function deleteRule(id) {
        if (!_rulesById[id]) return;
        if (!confirm('¿Quitar esta regla y su contador?')) return;
        const { error } = await _supabase.from('habit_rule_images').delete().eq('id', id);
        if (error) alert('Error al eliminar: ' + error.message);
        else load();
    }

    window.openLearnings = function () { openHeaderView('view-learnings', load); };
    window.loadLearnings = load;
})();