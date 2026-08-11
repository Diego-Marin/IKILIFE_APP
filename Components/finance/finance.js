/**
 * ==========================================
 * COMPONENTE: FINANCE (Finanzas)
 * ==========================================
 * Componente independiente y autocontenido para la pestaña "Finance".
 * Incluye la lógica original (Ingresos / Gastos / Ahorro / Deudas,
 * dinámico vía finance_logs) MÁS las siguientes funcionalidades
 * nuevas:
 *
 *   1. PRESUPUESTO POR CATEGORÍA: cada categoría de gasto puede tener
 *      un límite mensual. Se muestra una barra de progreso (gastado
 *      vs presupuestado) y se resalta en rojo si se excede.
 *      Requiere en Supabase la tabla nueva "finance_budgets"
 *      (category text UNIQUE, monto numeric, created_at). Si la tabla
 *      no existe todavía, el componente lo detecta y simplemente
 *      oculta las barras de presupuesto sin romper el resto.
 *
 *   2. PATRIMONIO NETO: nueva tarjeta = (Ahorro/Capital) - Deudas,
 *      para ver de un vistazo el balance financiero real.
 *
 *   3. EXPORTAR HISTORIAL (SQL): igual que Loves/Ideas/Odios, permite
 *      descargar todo "finance_logs" como sentencias INSERT.
 *
 * Reutiliza sqlValue/buildSQLInsert/descargarArchivo (definidas en
 * main.js) para el exportador — están disponibles como funciones
 * globales al momento en que el usuario hace clic (main.js ya se
 * cargó por completo en ese punto).
 */

let _financeBudgetsDisponibles = true; // se pone en false si la tabla finance_budgets no existe aún

function formatCurrency(num) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num || 0);
}

function toggleFinanceView(viewId) {
    // Soporta 3 vistas: 'finance-main', 'finance-income' y
    // 'finance-debts'. El ahorro manual (tipo 'saving') se eliminó:
    // "Ahorro / Capital" ahora es solo informativo (Ingresos - Gastos).
    const views = ['finance-main', 'finance-income', 'finance-debts'];

    views.forEach(v => {
        const el = document.getElementById(v);
        if (!el) return;

        if (v === viewId) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
}

async function loadFinanceBudgets() {
    if (!_financeBudgetsDisponibles) return {};

    const { data, error } = await _supabase.from('finance_budgets').select('*');
    if (error) {
        // La tabla probablemente no existe todavía: se degrada con
        // gracia (sin presupuestos) en vez de romper la carga.
        _financeBudgetsDisponibles = false;
        return {};
    }

    const mapa = {};
    (data || []).forEach(b => { mapa[b.category] = b.monto; });
    return mapa;
}

/* Excluye la deuda "Curso de Inglés" del Patrimonio Neto (se pagará
   de otra forma), aunque sigue contando en la tarjeta "Deudas". */
function esCursoIngles(item) {
    const texto = `${item.concept || ''} ${item.category || ''}`
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    return texto.includes('ingles');
}

async function loadFinances() {
    const { data: finances, error } = await _supabase.from('finance_logs').select('*').order('id', { ascending: true });
    if (error) return console.error("Error cargando finanzas:", error.message);

    const listIncomes = document.getElementById('list-incomes');
    const listDebts = document.getElementById('list-debts');
    const expensesContainer = document.getElementById('dynamic-expense-categories');

    if (listIncomes) listIncomes.innerHTML = '';
    if (listDebts) listDebts.innerHTML = '';
    if (expensesContainer) expensesContainer.innerHTML = '';

    const budgets = await loadFinanceBudgets();

    // NUEVO: lo ya asignado a metas de ahorro en Compras se descuenta
    // del Ahorro/Capital disponible (ese dinero ya está "apartado").
    const { data: comprasData, error: errCompras } = await _supabase.from('compras_logs').select('ahorro');
    if (errCompras) console.warn('No se pudo leer compras_logs para el cálculo de ahorro:', errCompras.message);
    const ahorroAsignado = (comprasData || []).reduce((acc, c) => acc + (Number(c.ahorro) || 0), 0);

    let totalIngresosReal = 0;
    let totalGastosReal = 0;
    let totalDeudasReal = 0;
    let totalDeudasParaPatrimonio = 0; // excluye Curso de Inglés
    const expensesByCategory = {};
    const totalsByCategory = {};

    finances.forEach(item => {
        const isIncome = item.type === 'income';
        const isDebt = item.type === 'debt';
        // NOTA: el ahorro manual (type === 'saving') ya no tiene UI propia;
        // si quedan filas antiguas de ese tipo en finance_logs, se ignoran
        // aquí (no se suman a ningún total) para no romper nada existente.
        let textColorClass = 'text-expense';
        if (isIncome) textColorClass = 'text-income';
        if (isDebt) textColorClass = 'text-debt';

        const row = `
            <li class="finance-item" oncontextmenu="event.preventDefault(); deleteFinanceItem(${item.id}, '${item.concept}')">
                <div class="finance-item-name" style="cursor:pointer; overflow:hidden; text-overflow:ellipsis;" onclick="editFinanceConcept(${item.id}, '${item.concept}')" title="Clic para editar nombre | Clic Derecho para eliminar">
                    ${item.concept}
                </div>
                <div class="${textColorClass}" style="font-weight:bold; font-size: 0.95rem; text-align:right; cursor:pointer;" onclick="editFinanceRealTotal(${item.id}, ${item.real})" title="Total acumulado (Clic para corregir manualmente)">
                    ${formatCurrency(item.real)}
                </div>
                <div>
                    <input type="number" class="finance-input" onchange="addFinanceReal(${item.id}, ${item.real}, this.value)" placeholder="+ Sumar" title="Escribe un valor y presiona Enter">
                </div>
            </li>
        `;

        if (isIncome) {
            totalIngresosReal += Number(item.real);
            if (listIncomes) listIncomes.insertAdjacentHTML('beforeend', row);
        } else if (isDebt) {
            totalDeudasReal += Number(item.real);
            if (!esCursoIngles(item)) totalDeudasParaPatrimonio += Number(item.real);
            if (listDebts) listDebts.insertAdjacentHTML('beforeend', row);
        } else if (item.type !== 'saving') {
            totalGastosReal += Number(item.real);
            if (!expensesByCategory[item.category]) expensesByCategory[item.category] = [];
            expensesByCategory[item.category].push(row);
            totalsByCategory[item.category] = (totalsByCategory[item.category] || 0) + Number(item.real);
        }
    });

    for (const [category, itemsRows] of Object.entries(expensesByCategory)) {
        const budget = budgets[category];
        const spent = totalsByCategory[category] || 0;
        const budgetHTML = renderBudgetBar(category, spent, budget);

        const sectionHTML = `
            <section class="category">
                <div class="category-header" style="display:flex; justify-content:space-between; align-items:center;">
                    ${category}
                    <div style="display:flex; gap:4px;">
                        <button class="icon-btn" onclick="setFinanceBudget('${category}', ${budget !== undefined ? budget : 'null'})" title="Definir presupuesto de ${category}" style="padding: 2px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="6" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        </button>
                        <button class="icon-btn" onclick="addFinanceItem('expense', '${category}')" title="Agregar a ${category}" style="padding: 2px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    </div>
                </div>
                ${budgetHTML}
                <ul style="list-style:none;">
                    ${itemsRows.join('')}
                </ul>
            </section>
        `;
        expensesContainer.insertAdjacentHTML('beforeend', sectionHTML);
    }

    // Ahorro/Capital = Ingresos - Gastos - lo ya asignado a metas de
    // ahorro en Compras (ese dinero deja de estar "libre").
    const totalAhorro = totalIngresosReal - totalGastosReal - ahorroAsignado;
    // Patrimonio Neto excluye la deuda del Curso de Inglés (se pagará
    // de otra forma y no debe restar del patrimonio).
    const patrimonioNeto = totalAhorro - totalDeudasParaPatrimonio;

    if (document.getElementById('kpi-ingresos')) document.getElementById('kpi-ingresos').textContent = formatCurrency(totalIngresosReal);
    if (document.getElementById('kpi-ingresos-detail')) document.getElementById('kpi-ingresos-detail').textContent = formatCurrency(totalIngresosReal);
    if (document.getElementById('kpi-gastos')) document.getElementById('kpi-gastos').textContent = formatCurrency(totalGastosReal);
    if (document.getElementById('kpi-ahorro')) document.getElementById('kpi-ahorro').textContent = formatCurrency(totalAhorro);
    if (document.getElementById('kpi-deudas')) document.getElementById('kpi-deudas').textContent = formatCurrency(totalDeudasReal);

    const patrimonioEl = document.getElementById('kpi-patrimonio');
    if (patrimonioEl) {
        patrimonioEl.textContent = formatCurrency(patrimonioNeto);
        patrimonioEl.classList.toggle('text-debt', patrimonioNeto < 0);
        patrimonioEl.classList.toggle('text-savings', patrimonioNeto >= 0);
    }

    renderPatrimonioWidget(patrimonioNeto, totalGastosReal);
}

/* ==========================================
   PRESUPUESTO POR CATEGORÍA
   ========================================== */
function renderBudgetBar(category, spent, budget) {
    if (budget === undefined || budget === null) return '';

    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const exceeded = spent > budget;

        return `
        <div class="finance-budget-bar-wrap" title="${formatCurrency(spent)} de ${formatCurrency(budget)}">
            <div class="ik-bar-track">
                <div class="ik-bar-fill${exceeded ? ' ik-bar-fill--over' : ' ik-bar-fill--green'}" style="width:${pct}%;"></div>
            </div>
            <div class="finance-budget-bar-label${exceeded ? ' text-debt' : ''}">
                ${formatCurrency(spent)} / ${formatCurrency(budget)}${exceeded ? ' ⚠️ Excedido' : ''}
            </div>
        </div>
    `;
}

async function setFinanceBudget(category, currentBudget) {
    const input = prompt(`Presupuesto mensual para "${category}" (sin puntos, 0 para quitarlo):`, currentBudget || '');
    if (input === null) return;

    const monto = Number(input);
    if (isNaN(monto)) return;

    if (monto <= 0) {
        const { error } = await _supabase.from('finance_budgets').delete().eq('category', category);
        if (error && _financeBudgetsDisponibles) {
            alert('Error al quitar el presupuesto: ' + error.message);
        }
        loadFinances();
        return;
    }

    const { error } = await _supabase
        .from('finance_budgets')
        .upsert({ category, monto }, { onConflict: 'category' });

    if (error) {
        _financeBudgetsDisponibles = false;
        alert('No se pudo guardar el presupuesto. Es posible que falte crear la tabla "finance_budgets" en Supabase (category text UNIQUE, monto numeric, created_at timestamptz).');
        return;
    }

    _financeBudgetsDisponibles = true;
    loadFinances();
}

/* ==========================================
   CRUD DE MOVIMIENTOS
   ========================================== */
async function addFinanceCategory() {
    const categoryName = prompt("Nombre de la nueva categoría (Ej: Transporte, Suscripciones):");
    if (!categoryName || categoryName.trim() === "") return;

    addFinanceItem('expense', categoryName.trim());
}

async function addFinanceReal(id, currentReal, addedValue) {
    if (!addedValue) return;
    const newVal = Number(addedValue);
    if (isNaN(newVal)) return;

    const total = Number(currentReal) + newVal;
    const { error } = await _supabase.from('finance_logs').update({ real: total }).eq('id', id);

    if (error) console.error("Error al sumar cantidad:", error.message);
    else loadFinances();
}

async function editFinanceRealTotal(id, currentTotal) {
    const newValStr = prompt("Corregir total acumulado manualmente (Sin puntos):", currentTotal);
    if (newValStr === null) return;
    const newVal = Number(newValStr) || 0;
    const { error } = await _supabase.from('finance_logs').update({ real: newVal }).eq('id', id);
    if (!error) loadFinances();
}

async function addFinanceItem(type, category) {
    const concept = prompt(`Nuevo concepto en ${category}:`);
    if (!concept || concept.trim() === "") return;

    const { error } = await _supabase
        .from('finance_logs')
        .insert([{ type, category, concept: concept.trim(), projected: 0, real: 0 }]);

    if (error) alert("Error al guardar: " + error.message);
    else loadFinances();
}

async function editFinanceConcept(id, oldConcept) {
    const newConcept = prompt("Editar nombre del concepto:", oldConcept);
    if (!newConcept || newConcept.trim() === "" || newConcept === oldConcept) return;

    const { error } = await _supabase.from('finance_logs').update({ concept: newConcept.trim() }).eq('id', id);
    if (error) alert("Error al editar: " + error.message);
    else loadFinances();
}

async function deleteFinanceItem(id, concept) {
    if (!confirm(`¿Eliminar la fila "${concept}" permanentemente?`)) return;

    const { error } = await _supabase.from('finance_logs').delete().eq('id', id);
    if (error) alert("Error al eliminar: " + error.message);
    else loadFinances();
}

/* ==========================================
   EXPORTAR HISTORIAL (SQL)
   ========================================== */
async function exportFinanceSQL() {
    const { data, error } = await _supabase.from('finance_logs').select('*').order('id', { ascending: true });
    if (error) {
        alert('Error al exportar: ' + error.message);
        return;
    }

    const sql = buildSQLInsert('finance_logs', data);
    descargarArchivo(sql, `ikilife_finance_${getFechaHoyISO ? getFechaHoyISO() : Date.now()}.sql`, 'text/plain;charset=utf-8;');
}

/* ==========================================
   REINICIO MENSUAL DE FINANZAS
   ==========================================
   Guarda un snapshot del mes actual (totales + detalle completo de
   finance_logs) en "finance_month_history" para análisis posterior,
   y luego reinicia el campo "real" de todos los movimientos a 0 para
   arrancar el mes siguiente limpio (mantiene categorías/conceptos).

   Requiere en Supabase la tabla nueva "finance_month_history":
     CREATE TABLE finance_month_history (
       id bigint generated by default as identity primary key,
       mes text NOT NULL,
       total_ingresos numeric,
       total_gastos numeric,
       total_ahorro numeric,
       total_deudas numeric,
       patrimonio_neto numeric,
       detalle jsonb,
       created_at timestamptz DEFAULT now()
     );
   ========================================== */
async function resetFinanceMonth() {
    const confirmReset = confirm(
        'Esto guardará el resumen y el detalle del mes actual en el historial, y luego reiniciará a $0 los montos "real" de Ingresos, Gastos y Deudas para empezar el nuevo mes. ¿Continuar?'
    );
    if (!confirmReset) return;

    const { data: finances, error: errFin } = await _supabase
        .from('finance_logs')
        .select('*')
        .order('id', { ascending: true });
    if (errFin) {
        alert('Error al leer las finanzas: ' + errFin.message);
        return;
    }

    const { data: comprasData } = await _supabase.from('compras_logs').select('ahorro');
    const ahorroAsignado = (comprasData || []).reduce((acc, c) => acc + (Number(c.ahorro) || 0), 0);

    let totalIngresos = 0, totalGastos = 0, totalDeudas = 0, totalDeudasParaPatrimonio = 0;
    (finances || []).forEach(item => {
        if (item.type === 'income') totalIngresos += Number(item.real) || 0;
        else if (item.type === 'debt') {
            totalDeudas += Number(item.real) || 0;
            if (!esCursoIngles(item)) totalDeudasParaPatrimonio += Number(item.real) || 0;
        } else if (item.type !== 'saving') {
            totalGastos += Number(item.real) || 0;
        }
    });

    const totalAhorro = totalIngresos - totalGastos - ahorroAsignado;
    const patrimonioNeto = totalAhorro - totalDeudasParaPatrimonio;
    const mesActual = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    const { error: errHist } = await _supabase.from('finance_month_history').insert([{
        mes: mesActual,
        total_ingresos: totalIngresos,
        total_gastos: totalGastos,
        total_ahorro: totalAhorro,
        total_deudas: totalDeudas,
        patrimonio_neto: patrimonioNeto,
        detalle: finances,
    }]);

    if (errHist) {
        alert('No se pudo guardar el historial (¿existe la tabla "finance_month_history"?): ' + errHist.message);
        return;
    }

    const { error: errReset } = await _supabase
        .from('finance_logs')
        .update({ real: 0 })
        .not('id', 'is', null);

    if (errReset) {
        alert('El historial se guardó, pero hubo un error al reiniciar los montos: ' + errReset.message);
        return;
    }

    alert(`Mes ${mesActual} guardado en el historial. Finanzas reiniciadas para el nuevo mes.`);
    loadFinances(); loadFinanceHistory();
}


/* ==========================================
   PATRIMONIO NETO INTERACTIVO
   ========================================== */
function renderPatrimonioWidget(patrimonio, gastosMensuales) {
    const container = document.getElementById('finance-main');
    if (!container) return;

    const oldWidget = document.getElementById('patrimonio-widget');
    if (oldWidget) oldWidget.remove();

    const widget = document.createElement('div');
    widget.id = 'patrimonio-widget';
    widget.className = 'patrimonio-widget';

    var mensaje = '';
    var submensaje = '';
    var emoji = '';
    var claseColor = '';
    var barraPct = 50;

    if (patrimonio < 0) {
        emoji = '\uD83D\uDEA8';
        claseColor = 'patrimonio--rojo';
        var mesesSalir = gastosMensuales > 0 ? Math.abs(patrimonio) / gastosMensuales : 0;
        mensaje = 'Estás en zona de riesgo financiero';
        submensaje = 'Necesitas aproximadamente ' + mesesSalir.toFixed(1) + ' meses de ingresos para salir de rojo.';
        barraPct = Math.max(5, 50 - (mesesSalir / 3) * 50);
    } else if (patrimonio === 0 || (gastosMensuales > 0 && patrimonio < gastosMensuales)) {
        emoji = '\u2696\uFE0F';
        claseColor = 'patrimonio--amarillo';
        mensaje = 'En equilibrio frágil';
        submensaje = 'Cualquier imprevisto te sacaría de tu zona de confort. Intenta aumentar tu colchón.';
        barraPct = 55;
    } else {
        var meses = gastosMensuales > 0 ? patrimonio / gastosMensuales : 0;
        claseColor = 'patrimonio--verde';
        if (meses < 3) {
            emoji = '\uD83C\uDF31';
            mensaje = 'Tienes ' + meses.toFixed(1) + ' meses de ventaja de vida';
            submensaje = 'Buen comienzo. Sigue construyendo tu libertad financiera.';
            barraPct = 55 + (meses / 3) * 20;
        } else if (meses < 6) {
            emoji = '\uD83D\uDEE1\uFE0F';
            mensaje = 'Tienes ' + meses.toFixed(1) + ' meses de ventaja de vida';
            submensaje = 'Colchón financiero sólido. Puedes respirar tranquilo ante imprevistos.';
            barraPct = 75 + ((meses - 3) / 3) * 10;
        } else if (meses < 12) {
            emoji = '\uD83D\uDE80';
            mensaje = 'Tienes ' + meses.toFixed(1) + ' meses de ventaja de vida';
            submensaje = 'Libertad parcial alcanzada. Estás muy cerca de la independencia.';
            barraPct = 85 + ((meses - 6) / 6) * 10;
        } else {
            emoji = '\uD83C\uDFC6';
            mensaje = meses.toFixed(1) + ' meses de libertad financiera!';
            submensaje = 'Has alcanzado un nivel de seguridad envidiable. Tu dinero trabaja para ti.';
            barraPct = 95;
        }
    }

    widget.innerHTML =
        '<div class="patrimonio-header ' + claseColor + '">' +
            '<span class="patrimonio-emoji">' + emoji + '</span>' +
            '<div class="patrimonio-texts">' +
                '<div class="patrimonio-mensaje">' + mensaje + '</div>' +
                '<div class="patrimonio-submensaje">' + submensaje + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="patrimonio-bar-wrap">' +
            '<div class="patrimonio-bar-track">' +
                '<div class="patrimonio-bar-fill ' + claseColor + '" style="width:' + barraPct + '%;"></div>' +
                '<div class="patrimonio-bar-marker" style="left:' + barraPct + '%"></div>' +
            '</div>' +
            '<div class="patrimonio-bar-labels">' +
                '<span>Endeudado</span>' +
                '<span>Equilibrio</span>' +
                '<span>Libre</span>' +
            '</div>' +
        '</div>';

    var summaryGrid = container.querySelector('.summary-grid');
    if (summaryGrid && summaryGrid.nextSibling) {
        container.insertBefore(widget, summaryGrid.nextSibling);
    } else {
        container.appendChild(widget);
    }
}

/* ==========================================
   HISTORIAL DE MESES GUARDADOS
   ========================================== */
async function loadFinanceHistory() {
    const { data: historial, error } = await _supabase
        .from('finance_month_history')
        .select('*')
        .order('mes', { ascending: false });

    if (error) {
        alert('No se pudo cargar el historial (¿existe la tabla "finance_month_history"?): ' + error.message);
        return;
    }

    const container = document.getElementById('finance-history-list');
    const section = document.getElementById('finance-history-section');
    if (!container || !section) return;

    section.classList.remove('hidden');
    container.innerHTML = '';

    if (!historial || historial.length === 0) {
        container.innerHTML = '<div style="padding:12px; color:var(--text-muted); font-size:0.85rem;">Aún no hay meses guardados. Presiona "Reiniciar Mes" para guardar el primero.</div>';
        return;
    }

    historial.forEach(h => {
        const row = document.createElement('div');
        row.className = 'finance-history-row';
        row.innerHTML = `
            <div class="finance-history-mes">${h.mes}</div>
            <div class="finance-history-grid">
                <div><span class="finance-history-label">Ingresos</span><span class="text-income">${formatCurrency(h.total_ingresos)}</span></div>
                <div><span class="finance-history-label">Gastos</span><span class="text-expense">${formatCurrency(h.total_gastos)}</span></div>
                <div><span class="finance-history-label">Ahorro</span><span class="text-savings">${formatCurrency(h.total_ahorro)}</span></div>
                <div><span class="finance-history-label">Deudas</span><span class="text-debt">${formatCurrency(h.total_deudas)}</span></div>
                <div style="grid-column:1/-1;"><span class="finance-history-label">Patrimonio Neto</span><span class="${h.patrimonio_neto >= 0 ? 'text-savings' : 'text-debt'}" style="font-weight:800;">${formatCurrency(h.patrimonio_neto)}</span></div>
            </div>
        `;
        container.appendChild(row);
    });
}

function toggleFinanceHistory() {
    const section = document.getElementById('finance-history-section');
    if (section.classList.contains('hidden')) {
        loadFinanceHistory();
    } else {
        section.classList.add('hidden');
    }
}