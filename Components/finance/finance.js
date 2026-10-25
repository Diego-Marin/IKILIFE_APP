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
    // 'finance-debts'. "Ahorro / Capital" es solo informativo (tarjeta
    // estática, sin vista propia).
    const views = ['finance-main', 'finance-income', 'finance-debts', 'finance-fixed'];

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

/* Cambia el color de una tarjeta KPI: 'income' (verde marca), 'savings'
   (verde), 'expense' (naranja), 'debt' (rojo) o 'neutral' (gris).
   Reglas:
   · Ingresos: verde si hay ingresos.
   · Gastos obligatorios: verde hasta 50% de tus ingresos, naranja hasta
     80%, rojo por encima (o si no hay ingresos).
   · Ahorro / Capital y Patrimonio Neto: verde positivo, rojo negativo.
   · Deudas: verde sin deudas, naranja si valen hasta un mes de ingresos,
     rojo si es más. */
function setKpiTone(id, tone) {
    const el = document.getElementById(id);
    if (!el) return;
    ['text-income', 'text-expense', 'text-savings', 'text-debt', 'text-neutral'].forEach(cls => el.classList.remove(cls));
    el.classList.add('text-' + tone);
}

async function loadFinances() {
    await autoRegisterFinanceMonthIfNeeded();

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
            <section class="fin-cat-block">
                <div class="fin-cat-head">
                    <span>${category}</span>
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
                <ul class="fin-list">
                    ${itemsRows.join('')}
                </ul>
            </section>
        `;
        expensesContainer.insertAdjacentHTML('beforeend', sectionHTML);
    }

    // Gastos obligatorios = suma de todos los gastos listados (costo de tu vida).
    const obligatorios = totalGastosReal;

    // Ahorro/Capital = Ingresos - Gastos obligatorios - lo ya asignado a
    // metas de ahorro en Compras (ese dinero deja de estar "libre").
    const totalAhorro = totalIngresosReal - totalGastosReal - ahorroAsignado;
    // Patrimonio Neto excluye la deuda del Curso de Inglés (se pagará
    // de otra forma y no debe restar del patrimonio).
    const patrimonioNeto = totalAhorro - totalDeudasParaPatrimonio;

    if (document.getElementById('kpi-ingresos')) document.getElementById('kpi-ingresos').textContent = formatCurrency(totalIngresosReal);
    if (document.getElementById('kpi-ingresos-detail')) document.getElementById('kpi-ingresos-detail').textContent = formatCurrency(totalIngresosReal);
    if (document.getElementById('kpi-obligatorios')) document.getElementById('kpi-obligatorios').textContent = formatCurrency(obligatorios);
    if (document.getElementById('kpi-obligatorios-detail')) document.getElementById('kpi-obligatorios-detail').textContent = formatCurrency(obligatorios);
    if (document.getElementById('kpi-ahorro')) document.getElementById('kpi-ahorro').textContent = formatCurrency(totalAhorro);
    if (document.getElementById('kpi-deudas')) document.getElementById('kpi-deudas').textContent = formatCurrency(totalDeudasReal);

    if (document.getElementById('kpi-patrimonio')) document.getElementById('kpi-patrimonio').textContent = formatCurrency(patrimonioNeto);

    // Color de cada tarjeta según tu estado económico.
    setKpiTone('kpi-ingresos', totalIngresosReal > 0 ? 'income' : 'neutral');

    let toneOblig = 'neutral';
    if (obligatorios > 0) {
        const ratio = totalIngresosReal > 0 ? obligatorios / totalIngresosReal : Infinity;
        toneOblig = ratio <= 0.5 ? 'savings' : ratio <= 0.8 ? 'expense' : 'debt';
    }
    setKpiTone('kpi-obligatorios', toneOblig);

    setKpiTone('kpi-ahorro', totalAhorro > 0 ? 'savings' : totalAhorro < 0 ? 'debt' : 'neutral');

    let toneDeudas = 'savings';
    if (totalDeudasReal > 0) {
        toneDeudas = (totalIngresosReal > 0 && totalDeudasReal <= totalIngresosReal) ? 'expense' : 'debt';
    }
    setKpiTone('kpi-deudas', toneDeudas);

    setKpiTone('kpi-patrimonio', patrimonioNeto > 0 ? 'savings' : patrimonioNeto < 0 ? 'debt' : 'neutral');

    renderPatrimonioWidget({ ingresos: totalIngresosReal, obligatorios, deudas: totalDeudasParaPatrimonio, apartado: ahorroAsignado });
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

/* NOTA: se eliminó exportFinanceSQL() — era el botón "💾 Exportar SQL"
   al final de Finanzas, ya no existe en el HTML. */

/* ==========================================
   REGISTRO MENSUAL AUTOMÁTICO DE FINANZAS
   ==========================================
   Antes esto requería presionar manualmente "🔄 Reiniciar Mes" (y
   revisar el resultado con el botón "📊 Historial"). Ahora sucede
   solo, sin ningún botón: loadFinances() llama esto primero en cada
   carga, comparando el mes actual con el último mes registrado
   (guardado en localStorage, mismo patrón que el resto de la app usa
   para acciones "una vez por periodo" — ver seedDefaultHabitsOnce en
   main.js). Si cambió de mes desde la última vez que se abrió la
   app, se guarda automáticamente el snapshot del mes que acaba de
   terminar en "finance_month_history" y se reinician a $0 los montos
   "real" para arrancar el mes nuevo limpio — sigue registrando el
   histórico mensual en la base de datos exactamente igual que antes,
   solo que ya no depende de que el usuario se acuerde de presionar
   el botón.

   Requiere la misma tabla que ya existía:
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
const FINANCE_MONTH_KEY = 'ikilife_finance_current_month';

/* Mes actual en HORA LOCAL ('YYYY-MM'). Antes se usaba
   new Date().toISOString(), que es UTC: en Colombia (UTC-5), desde las
   7:00 p.m. del último día del mes el "mes UTC" ya es el siguiente, así
   que el cierre y el reinicio a $0 se disparaban la noche anterior. */
function getMesLocalYYYYMM() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* Candado en memoria: loadFinances() se llama desde varios sitios a la
   vez (pestaña Finanzas, sub-tab, Compras...). Sin esto, dos llamadas
   simultáneas veían "cambió el mes" antes de que ninguna terminara y
   ambas cerraban/reiniciaban el mes (la segunda guardaba un historial
   con todo en $0). */
let _financeMonthCheckPromise = null;

function autoRegisterFinanceMonthIfNeeded() {
    if (!_financeMonthCheckPromise) {
        _financeMonthCheckPromise = _autoRegisterFinanceMonth()
            .catch(e => console.error('Error en el registro mensual de finanzas:', e))
            .finally(() => { _financeMonthCheckPromise = null; });
    }
    return _financeMonthCheckPromise;
}

async function _autoRegisterFinanceMonth() {
    const mesActual = getMesLocalYYYYMM();
    const mesGuardado = localStorage.getItem(FINANCE_MONTH_KEY);

    if (!mesGuardado) {
        // Primera vez en este dispositivo: solo fija el punto de partida.
        localStorage.setItem(FINANCE_MONTH_KEY, mesActual);
        return;
    }

    // Solo se cierra un mes cuando el guardado es ANTERIOR al actual.
    // (Con "!==" un dispositivo cuyo mes guardado estuviera adelantado
    // también reiniciaba.)
    if (mesGuardado >= mesActual) return;

    // Protección multi-dispositivo: el mes guardado vive en localStorage
    // (uno por navegador). Si OTRO dispositivo ya cerró ese mes, existe
    // su fila en finance_month_history y los montos ya se reiniciaron;
    // volver a reiniciar borraría lo que ya registraste en el mes nuevo.
    const { data: yaCerrado, error: errCheck } = await _supabase
        .from('finance_month_history')
        .select('id')
        .eq('mes', mesGuardado)
        .limit(1);

    if (errCheck) {
        console.error('No se pudo verificar el historial mensual (¿existe "finance_month_history"?):', errCheck.message);
        return; // ante la duda NO se reinicia nada
    }

    if (yaCerrado && yaCerrado.length > 0) {
        localStorage.setItem(FINANCE_MONTH_KEY, mesActual);
        return;
    }

    const { data: finances, error: errFin } = await _supabase
        .from('finance_logs')
        .select('*')
        .order('id', { ascending: true });
    if (errFin) {
        console.error('Error leyendo finanzas para el registro mensual automático:', errFin.message);
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

    const { data: insertado, error: errHist } = await _supabase
        .from('finance_month_history')
        .insert([{
            mes: mesGuardado,
            total_ingresos: totalIngresos,
            total_gastos: totalGastos,
            total_ahorro: totalAhorro,
            total_deudas: totalDeudas,
            patrimonio_neto: patrimonioNeto,
            detalle: finances,
        }])
        .select('id');

    if (errHist) {
        console.error('No se pudo guardar el registro mensual automático:', errHist.message);
        return; // no reinicia nada: se reintentará la próxima vez
    }

    const { error: errReset } = await _supabase
        .from('finance_logs')
        .update({ real: 0 })
        .in('type', ['income', 'debt', 'saving']); // los gastos obligatorios se conservan

    if (errReset) {
        console.error('El registro mensual se guardó, pero falló el reinicio de montos:', errReset.message);
        // Se deshace el historial para que el reintento no lo tome
        // como "mes ya cerrado" y se quede sin reiniciar.
        if (insertado && insertado[0]) {
            await _supabase.from('finance_month_history').delete().eq('id', insertado[0].id);
        }
        return;
    }

    localStorage.setItem(FINANCE_MONTH_KEY, mesActual);
}


/* ==========================================
   FORMATOS Y ESTADO FINANCIERO (widget #patrimonio-widget)
   ========================================== */
function fmtMesesLargo(n) {
    if (!isFinite(n)) return 'Sin margen';
    if (n >= 100) return '+99 meses';
    const txt = n.toFixed(1).replace('.0', '').replace('.', ',');
    return `${txt} ${Number(txt.replace(',', '.')) === 1 ? 'mes' : 'meses'}`;
}

/* Color continuo: 0 = rojo, 50 = amarillo, 100 = verde */
function colorSalud(score) {
    const s = Math.max(0, Math.min(100, score));
    return `hsl(${Math.round(s * 1.2)}, 72%, 46%)`;
}

/* ==========================================
   ESTADO FINANCIERO (widget #patrimonio-widget)
   ==========================================
   La cadena de cálculo es la misma de las tarjetas de Finanzas:
     Ahorro / Capital = Ingresos − Gastos obligatorios − Apartado en Compras
     Patrimonio Neto  = Ahorro / Capital − Deudas
   (las deudas excluyen el Curso de Inglés, igual que el Patrimonio).

   El puntaje 0-100 (barra de rojo a verde) mide dos cosas:
   · Margen (60%): (ingresos − obligatorios) sobre ingresos.
     30% o más = puntaje completo; 0% o menos = 0.
   · Deudas (40%): deudas vs ingresos mensuales. Sin deudas = completo;
     6 meses de ingresos o más = 0.
   Si los obligatorios superan los ingresos, el puntaje se limita a 30. */
function calcularRealidadFinanciera({ ingresos, obligatorios, deudas, apartado }) {
    const margen = ingresos - obligatorios;
    const capital = margen - apartado;
    const patrimonio = capital - deudas;
    const mesesDeudaIngreso = ingresos > 0 ? deudas / ingresos : Infinity;
    const base = { margen, capital, patrimonio, score: null };

    if (ingresos <= 0 && obligatorios <= 0) {
        return { ...base, texto: 'Sin datos', msg: 'Registra tus ingresos y tus gastos obligatorios para ver tu estado financiero.' };
    }
    if (obligatorios <= 0) {
        return { ...base, texto: 'Incompleto', msg: 'Agrega tus gastos obligatorios (tarjeta "Gastos obligatorios") para saber cuánto te queda cada mes.' };
    }
    if (ingresos <= 0) {
        return { ...base, score: 0, texto: 'Sin ingresos', msg: `Tus gastos obligatorios suman ${formatCurrency(obligatorios)} y aún no hay ingresos registrados.` };
    }

    const clamp01 = v => Math.max(0, Math.min(1, v));
    const sMargen = clamp01((margen / ingresos) / 0.30) * 100;
    const sDeuda = deudas <= 0 ? 100 : clamp01(1 - mesesDeudaIngreso / 6) * 100;
    let score = Math.round(sMargen * 0.6 + sDeuda * 0.4);
    if (margen < 0) score = Math.min(score, 30);

    const texto = score < 35 ? 'Crítica' : score < 60 ? 'Ajustada' : score < 80 ? 'Buena' : 'Saludable';

    let msg;
    if (margen < 0) {
        msg = `Tus gastos obligatorios (${formatCurrency(obligatorios)}) superan tus ingresos por ${formatCurrency(-margen)}.`;
    } else {
        const pct = Math.round((margen / ingresos) * 100);
        msg = `Tras tus obligatorios te quedan ${formatCurrency(margen)} (${pct}% de tus ingresos).`;
        if (deudas > 0) msg += ` Tus deudas equivalen a ${fmtMesesLargo(mesesDeudaIngreso)} de ingresos.`;
    }

    return { ...base, score, texto, msg };
}

function renderPatrimonioWidget({ ingresos, obligatorios, deudas, apartado }) {
    const container = document.getElementById('finance-main');
    if (!container) return;

    const oldWidget = document.getElementById('patrimonio-widget');
    if (oldWidget) oldWidget.remove();

    const e = calcularRealidadFinanciera({ ingresos, obligatorios, deudas, apartado });
    const tieneScore = e.score !== null;
    const score = tieneScore ? e.score : 0;
    const color = tieneScore ? colorSalud(score) : 'var(--text-muted)';

    // Reparto gráfico de los ingresos: obligatorios, deudas, apartado y lo que queda.
    const libre = ingresos - obligatorios - deudas - apartado;
    const total = Math.max(ingresos, obligatorios + deudas + apartado);
    const w = v => (total > 0 ? ((Math.max(v, 0) / total) * 100).toFixed(2) : 0);
    const segmentos = [
        { cls: 'oblig', label: 'Gastos obligatorios', valor: obligatorios },
        { cls: 'deuda', label: 'Deudas', valor: deudas },
        ...(apartado > 0 ? [{ cls: 'apartado', label: 'Apartado en Compras', valor: apartado }] : []),
        { cls: 'libre', label: 'Patrimonio neto', valor: libre },
    ];
    const hayReparto = total > 0;

    const widget = document.createElement('div');
    widget.id = 'patrimonio-widget';
    widget.className = 'estado-widget';
    widget.innerHTML = `
        <div class="estado-top">
            <span class="estado-label">Estado financiero</span>
            <span class="estado-pill" style="color:${color}">${e.texto}</span>
        </div>

        <div class="estado-score-row">
            <span class="estado-score" style="color:${color}">${tieneScore ? score : '—'}<small>/100</small></span>
            <span class="estado-msg">${e.msg}</span>
        </div>

        <div>
            <div class="salud-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}" aria-label="Salud financiera">
                <div class="salud-bar-fill" style="clip-path: inset(0 ${100 - score}% 0 0 round 999px);"></div>
                ${tieneScore ? `<div class="salud-bar-knob" style="left:${score}%; background:${color};"></div>` : ''}
            </div>
            <div class="salud-bar-scale"><span>Crítica</span><span>Ajustada</span><span>Saludable</span></div>
        </div>

        ${hayReparto ? `
        <div class="estado-split">
            <span class="estado-label">¿En qué se va tu ingreso?</span>
            <div class="estado-split-bar" role="img" aria-label="Reparto de ingresos">
                ${segmentos.map(s => `<div class="estado-seg estado-seg--${s.cls}" style="width:${w(s.valor)}%;"></div>`).join('')}
            </div>
            <div class="estado-split-legend">
                ${segmentos.map(s => `
                <div class="estado-split-row">
                    <span class="estado-split-name"><i class="estado-dot estado-seg--${s.cls}"></i>${s.label}</span>
                    <span class="estado-split-value${s.valor < 0 ? ' text-debt' : ''}">${formatCurrency(s.valor)}</span>
                </div>`).join('')}
            </div>
        </div>` : ''}
    `;

    const summaryGrid = container.querySelector('.summary-grid');
    if (summaryGrid && summaryGrid.nextSibling) {
        container.insertBefore(widget, summaryGrid.nextSibling);
    } else {
        container.appendChild(widget);
    }
}