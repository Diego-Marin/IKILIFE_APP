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
    // Soporta 4 vistas: 'finance-main', 'finance-income',
    // 'finance-savings' y 'finance-debts'. Se muestra únicamente la
    // solicitada y se ocultan las demás.
    const views = ['finance-main', 'finance-income', 'finance-savings', 'finance-debts'];

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

async function loadFinances() {
    const { data: finances, error } = await _supabase.from('finance_logs').select('*').order('id', { ascending: true });
    if (error) return console.error("Error cargando finanzas:", error.message);

    const listIncomes = document.getElementById('list-incomes');
    const listDebts = document.getElementById('list-debts');
    const listSavings = document.getElementById('list-savings');
    const expensesContainer = document.getElementById('dynamic-expense-categories');

    if (listIncomes) listIncomes.innerHTML = '';
    if (listDebts) listDebts.innerHTML = '';
    if (listSavings) listSavings.innerHTML = '';
    if (expensesContainer) expensesContainer.innerHTML = '';

    const budgets = await loadFinanceBudgets();

    let totalIngresosReal = 0;
    let totalGastosReal = 0;
    let totalDeudasReal = 0;
    let totalAhorroManual = 0;
    const expensesByCategory = {};
    const totalsByCategory = {};

    finances.forEach(item => {
        const isIncome = item.type === 'income';
        const isDebt = item.type === 'debt';
        const isSaving = item.type === 'saving';
        let textColorClass = 'text-expense';
        if (isIncome) textColorClass = 'text-income';
        if (isDebt) textColorClass = 'text-debt';
        if (isSaving) textColorClass = 'text-savings';

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
            if (listDebts) listDebts.insertAdjacentHTML('beforeend', row);
        } else if (isSaving) {
            totalAhorroManual += Number(item.real);
            if (listSavings) listSavings.insertAdjacentHTML('beforeend', row);
        } else {
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

    // La lógica original (Ahorro = Ingresos - Gastos) se mantiene intacta;
    // se le suma lo registrado manualmente como ahorro (tipo 'saving').
    const totalAhorro = (totalIngresosReal - totalGastosReal) + totalAhorroManual;
    const patrimonioNeto = totalAhorro - totalDeudasReal;

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
            <div class="finance-budget-bar-track">
                <div class="finance-budget-bar-fill${exceeded ? ' finance-budget-bar-fill--over' : ''}" style="width:${pct}%;"></div>
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
