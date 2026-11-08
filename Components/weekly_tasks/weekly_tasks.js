/**
 * ==========================================
 * COMPONENTE: TAREAS SEMANALES (Pendientes › Semanales + Inicio)
 * ==========================================
 * Reglas:
 *  - Cada tarea elige días de la semana (L-D) y una frecuencia:
 *    cada 1 semana (semanal), cada 2 (quincenal), 3 o 4.
 *  - Cada día elegido es una "ocurrencia". Aparece en Inicio ese día y
 *    se queda hasta marcarla; al marcarla desaparece de Inicio.
 *  - La semana empieza el lunes: lo pendiente de semanas anteriores se
 *    descarta y las tareas vuelven nuevas. El DOMINGO ya aparece lo del
 *    lunes siguiente, para arrancar la semana con ellas.
 *
 * TABLAS REQUERIDAS EN SUPABASE:
 *   CREATE TABLE tareas_semanales (
 *     id bigint generated always as identity PRIMARY KEY,
 *     title text NOT NULL,
 *     dias smallint[] NOT NULL DEFAULT '{1}',   -- 1=Lun ... 7=Dom
 *     cada_semanas smallint NOT NULL DEFAULT 1, -- 1=semanal, 2=quincenal...
 *     inicio date NOT NULL,                     -- lunes de la semana base
 *     created_at timestamptz DEFAULT now()
 *   );
 *   CREATE TABLE tareas_semanales_logs (
 *     id bigint generated always as identity PRIMARY KEY,
 *     tarea_id bigint REFERENCES tareas_semanales(id) ON DELETE CASCADE,
 *     fecha date NOT NULL,
 *     created_at timestamptz DEFAULT now(),
 *     UNIQUE(tarea_id, fecha)
 *   );
 *   (Si usas RLS en tus otras tablas, agrega la misma política aquí.)
 *
 * Usa _supabase, formatDateLocal y escapeHtml (main.js): cargar después de main.js.
 */
(function () {
    var DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    var DIAS_LARGO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    var _tasks = [];
    var _editing = null;          // null | 'new' | id
    var _formDias = new Set();
    var _formN = 1;

    /* ---------- Fechas ---------- */
    function ymd(d) { return formatDateLocal(d); }
    function parse(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
    function isoDay(d) { return (d.getDay() + 6) % 7 + 1; }               // 1=Lun ... 7=Dom
    function weekIdx(d) {                                                 // semanas desde un lunes fijo
        return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1970, 0, 5)) / 604800000);
    }
    function mondayOf(d) {
        var m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        m.setDate(m.getDate() - (isoDay(m) - 1));
        return m;
    }
    function windowDates() {
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var end = new Date(today);
        if (today.getDay() === 0) end.setDate(end.getDate() + 1);        // domingo: incluye el lunes siguiente
        return { start: mondayOf(today), end: end };
    }

    function occursOn(t, d) {
        if (!(t.dias || []).includes(isoDay(d))) return false;
        var n = t.cada_semanas || 1;
        var diff = weekIdx(d) - weekIdx(parse(t.inicio));
        return diff >= 0 && diff % n === 0;
    }

    function pendingDates(t, done) {
        var w = windowDates(), out = [];
        for (var d = new Date(w.start); d <= w.end; d.setDate(d.getDate() + 1)) {
            if (occursOn(t, d)) {
                var k = ymd(d);
                if (!done.has(t.id + '|' + k)) out.push(k);
            }
        }
        return out;
    }

    /* ---------- Datos ---------- */
    async function fetchData() {
        var w = windowDates();
        var res = await Promise.all([
            _supabase.from('tareas_semanales').select('*').order('created_at', { ascending: true }),
            _supabase.from('tareas_semanales_logs').select('tarea_id, fecha')
                .gte('fecha', ymd(w.start)).lte('fecha', ymd(w.end))
        ]);
        if (res[0].error || res[1].error) {
            console.error('Tareas semanales:', (res[0].error || res[1].error).message,
                '— ¿creaste las tablas tareas_semanales y tareas_semanales_logs?');
            return null;
        }
        return { tasks: res[0].data || [], logs: res[1].data || [] };
    }

    function doneSet(logs) {
        var s = new Set();
        logs.forEach(function (l) { s.add(l.tarea_id + '|' + l.fecha); });
        return s;
    }

    /* ==========================================
       INICIO: tareas pendientes de la semana
       ========================================== */
    async function loadHome() {
        var el = document.getElementById('home-weekly-tasks');
        if (!el) return;
        var data = await fetchData();
        if (!data) { el.innerHTML = ''; return; }

        var done = doneSet(data.logs);
        var pend = data.tasks
            .map(function (t) { return { t: t, dates: pendingDates(t, done) }; })
            .filter(function (x) { return x.dates.length > 0; });

        if (pend.length === 0) { el.innerHTML = ''; return; }

        el.innerHTML = '<div class="wt-home"><div class="wt-home-title">Semanales</div>' +
            pend.map(function (x) {
                return '<button type="button" class="wt-home-item" data-id="' + x.t.id + '" data-dates="' + x.dates.join(',') + '">' +
                    '<span class="wt-check"></span>' +
                    '<span class="wt-home-text">' + escapeHtml(x.t.title) + '</span></button>';
            }).join('') + '</div>';
    }

    async function completeTask(btn) {
        if (btn.classList.contains('wt-home-item--done')) return;
        btn.classList.add('wt-home-item--done');

        var id = Number(btn.dataset.id);
        var rows = btn.dataset.dates.split(',').map(function (f) { return { tarea_id: id, fecha: f }; });
        var r = await _supabase.from('tareas_semanales_logs').upsert(rows, { onConflict: 'tarea_id,fecha' });
        if (r.error) {
            alert('No se pudo guardar: ' + r.error.message);
            btn.classList.remove('wt-home-item--done');
            return;
        }
        setTimeout(loadHome, 350);
    }

    /* ==========================================
       PENDIENTES › SEMANALES (gestión)
       ========================================== */
    function freqLabel(n) {
        return n === 1 ? 'Cada semana' : n === 2 ? 'Quincenal' : 'Cada ' + n + ' semanas';
    }

    function diasLabel(dias) {
        return (dias || []).slice().sort(function (a, b) { return a - b; })
            .map(function (d) { return DIAS[d - 1]; }).join(' · ');
    }

    async function loadManager() {
        var root = document.getElementById('weekly-tasks-root');
        if (!root) return;
        bind(root);
        var data = await fetchData();
        if (!data) {
            root.innerHTML = '<div class="wt-empty">No se pudieron cargar las tareas. Revisa que existan las tablas <strong>tareas_semanales</strong> y <strong>tareas_semanales_logs</strong>.</div>';
            return;
        }
        _tasks = data.tasks;
        renderManager();
    }

    function formHtml() {
        var isNew = _editing === 'new';
        var t = isNew ? null : _tasks.find(function (x) { return x.id === _editing; });
        return '<div class="wt-form">' +
            '<input class="wt-input" id="wt-title" maxlength="80" placeholder="Ej: Lavar ropa de trabajo" value="' + escapeHtml(t ? t.title : '') + '">' +
            '<div class="wt-label">Días</div>' +
            '<div class="wt-days">' + DIAS.map(function (l, i) {
                return '<button type="button" class="wt-day' + (_formDias.has(i + 1) ? ' wt-day--on' : '') + '" data-act="day" data-d="' + (i + 1) + '" title="' + DIAS_LARGO[i] + '">' + l + '</button>';
            }).join('') + '</div>' +
            '<div class="wt-label">Frecuencia</div>' +
            '<div class="wt-freq">' + [1, 2, 3, 4].map(function (n) {
                return '<button type="button" class="wt-chip' + (_formN === n ? ' wt-chip--on' : '') + '" data-act="freq" data-n="' + n + '">' + freqLabel(n) + '</button>';
            }).join('') + '</div>' +
            '<div class="wt-actions">' +
                (isNew ? '' : '<button type="button" class="wt-btn wt-btn--danger" data-act="delete">Eliminar</button>') +
                '<span class="wt-spacer"></span>' +
                '<button type="button" class="wt-btn" data-act="cancel">Cancelar</button>' +
                '<button type="button" class="wt-btn wt-btn--primary" data-act="save">Guardar</button>' +
            '</div></div>';
    }

    function renderManager() {
        var root = document.getElementById('weekly-tasks-root');
        if (!root) return;

        var list = _tasks.length === 0
            ? (_editing === 'new' ? '' : '<div class="wt-empty">Aún no tienes tareas semanales. Crea la primera: aparecerá en Inicio los días que elijas.</div>')
            : _tasks.map(function (t) {
                if (_editing === t.id) return formHtml();
                return '<button type="button" class="wt-item" data-act="edit" data-id="' + t.id + '">' +
                    '<span class="wt-item-title">' + escapeHtml(t.title) + '</span>' +
                    '<span class="wt-item-sub">' + diasLabel(t.dias) + ' · ' + freqLabel(t.cada_semanas || 1) + '</span></button>';
            }).join('');

        root.innerHTML =
            '<div class="wt-toolbar"><button type="button" class="add-habit-btn" data-act="new">+ Nueva tarea</button></div>' +
            (_editing === 'new' ? formHtml() : '') + list;

        var inp = document.getElementById('wt-title');
        if (inp && _editing === 'new') inp.focus();
    }

    function startEdit(id) {
        _editing = id;
        if (id === 'new') { _formDias = new Set([1]); _formN = 1; }
        else {
            var t = _tasks.find(function (x) { return x.id === id; });
            _formDias = new Set((t && t.dias) || [1]);
            _formN = (t && t.cada_semanas) || 1;
        }
        renderManager();
    }

    async function save() {
        var title = (document.getElementById('wt-title').value || '').trim();
        if (!title) { alert('Escribe el nombre de la tarea.'); return; }
        if (_formDias.size === 0) { alert('Elige al menos un día.'); return; }

        var dias = Array.from(_formDias).sort(function (a, b) { return a - b; });
        var res;
        if (_editing === 'new') {
            res = await _supabase.from('tareas_semanales').insert([{
                title: title, dias: dias, cada_semanas: _formN, inicio: ymd(mondayOf(new Date()))
            }]);
        } else {
            var t = _tasks.find(function (x) { return x.id === _editing; });
            var upd = { title: title, dias: dias, cada_semanas: _formN };
            if (t && (t.cada_semanas || 1) !== _formN) upd.inicio = ymd(mondayOf(new Date())); // nueva frecuencia: cuenta desde esta semana
            res = await _supabase.from('tareas_semanales').update(upd).eq('id', _editing);
        }
        if (res.error) { alert('Error al guardar: ' + res.error.message); return; }
        _editing = null;
        await loadManager();
        loadHome();
    }

    async function remove() {
        var t = _tasks.find(function (x) { return x.id === _editing; });
        if (!t || !confirm('¿Eliminar "' + t.title + '"?')) return;
        var res = await _supabase.from('tareas_semanales').delete().eq('id', t.id);
        if (res.error) { alert('Error al eliminar: ' + res.error.message); return; }
        _editing = null;
        await loadManager();
        loadHome();
    }

    function bind(root) {
        if (root.dataset.wtBound) return;
        root.dataset.wtBound = '1';
        root.addEventListener('click', function (e) {
            var b = e.target.closest('[data-act]');
            if (!b) return;
            switch (b.dataset.act) {
                case 'new': return startEdit('new');
                case 'edit': return startEdit(Number(b.dataset.id));
                case 'cancel': _editing = null; return renderManager();
                case 'save': return save();
                case 'delete': return remove();
                case 'day': {
                    var d = Number(b.dataset.d);
                    if (_formDias.has(d)) _formDias.delete(d); else _formDias.add(d);
                    b.classList.toggle('wt-day--on', _formDias.has(d));
                    return;
                }
                case 'freq':
                    _formN = Number(b.dataset.n);
                    root.querySelectorAll('.wt-chip').forEach(function (c) {
                        c.classList.toggle('wt-chip--on', Number(c.dataset.n) === _formN);
                    });
                    return;
            }
        });
    }

    /* ==========================================
       Pestañas internas de Pendientes (Planes | Semanales)
       ========================================== */
    window.switchPendientesTab = function (which, btn) {
        document.querySelectorAll('#view-planes .camino-tab-btn').forEach(function (b) {
            b.classList.remove('camino-tab-active');
        });
        if (btn) btn.classList.add('camino-tab-active');
        document.querySelectorAll('#view-planes .sent-subview').forEach(function (v) { v.classList.add('hidden'); });
        var target = document.getElementById('pend-' + which);
        if (target) target.classList.remove('hidden');

        if (which === 'semanales') { _editing = null; loadManager(); }
    };

    /* ---------- Arranque ---------- */
    window.loadHomeWeeklyTasks = loadHome;

    document.addEventListener('click', function (e) {
        var b = e.target.closest('.wt-home-item');
        if (b) completeTask(b);
    });

    // Al volver a la app (p. ej. al pasar la medianoche) se recalcula.
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) loadHome();
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadHome);
    else loadHome();
})();
