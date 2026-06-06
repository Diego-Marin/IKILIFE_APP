/**
 * ==========================================
 * GESTIÓN DE HÁBITOS (HISTÓRICO Y DINÁMICO)
 * ==========================================
 */
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

let currentWeekOffset = 0;

function changeWeek(delta) {
    currentWeekOffset += delta;
    if (currentWeekOffset > 0) currentWeekOffset = 0;
    loadHabits();
}

async function loadHabits() {
    const today = new Date();
    let currentDay = today.getDay();
    currentDay = currentDay === 0 ? 7 : currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1 + (currentWeekOffset * 7));

    const datesOfWeek = [];
    let sunday;

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        datesOfWeek.push(formatDateLocal(d));

        if (i === 6) sunday = d;

        const labelEl = document.getElementById(`day-label-${i + 1}`);
        if (labelEl) {
            labelEl.textContent = String(d.getDate()).padStart(2, '0');
        }
    }

    const monthStart = monday.toLocaleDateString('es-CO', { month: 'long' });
    const monthEnd = sunday.toLocaleDateString('es-CO', { month: 'long' });
    const dayStart = monday.getDate();
    const dayEnd = sunday.getDate();

    let weekTitleStr = "";
    if (monthStart === monthEnd) {
        weekTitleStr = `Semana del ${dayStart} al ${dayEnd} de ${monthStart}`;
    } else {
        weekTitleStr = `Semana del ${dayStart} de ${monthStart} al ${dayEnd} de ${monthEnd}`;
    }

    const weekLabel = document.getElementById('habit-week-label');
    const nextBtn = document.getElementById('btn-next-week');
    if (weekLabel && nextBtn) {
        if (currentWeekOffset === 0) {
            weekLabel.textContent = "Semana Actual";
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.3';
            nextBtn.style.cursor = 'default';
        } else {
            weekLabel.textContent = weekTitleStr;
            nextBtn.disabled = false;
            nextBtn.style.opacity = '1';
            nextBtn.style.cursor = 'pointer';
        }
    }

    const { data: allHabitsData, error: err1 } = await _supabase.from('habit_logs').select('habit_name');
    if (err1) return console.error("Error obteniendo nombres:", err1.message);
    const uniqueHabits = [...new Set(allHabitsData.map(h => h.habit_name))].sort();

    const { data: weekLogs, error: err2 } = await _supabase
        .from('habit_logs')
        .select('*')
        .gte('log_date', datesOfWeek[0])
        .lte('log_date', datesOfWeek[6]);

    if (err2) return console.error("Error cargando logs semanales:", err2.message);

    const listContainer = document.getElementById('list-habits');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    uniqueHabits.forEach(habitName => {
        let circlesHTML = '';

        datesOfWeek.forEach(dateStr => {
            const log = weekLogs.find(l => l.habit_name === habitName && l.log_date === dateStr);
            const isDone = log ? log.is_completed : false;

            circlesHTML += `
                <div class="status-circle" 
                     style="background-color: ${isDone ? 'var(--primary-green)' : 'transparent'}; 
                            border-color: ${isDone ? 'var(--primary-green)' : '#999'}"
                     onclick="toggleHabit('${habitName}', '${dateStr}', ${isDone})">
                </div>`;
        });

        const row = `
            <li class="habit-grid">
                <div class="item-name" 
                     onclick="editHabit('${habitName}')"
                     oncontextmenu="event.preventDefault(); deleteHabit('${habitName}')"
                     style="cursor: pointer;"
                     title="Clic: Editar | Clic Derecho: Eliminar todo su historial">
                    ${habitName}
                </div>
                ${circlesHTML}
            </li>
        `;
        listContainer.insertAdjacentHTML('beforeend', row);
    });
}

async function addHabit() {
    const name = prompt("Crea un nuevo hábito:");
    if (!name || name.trim() === "") return;

    const habitName = name.trim();
    const todayStr = formatDateLocal(new Date());

    const { data, error } = await _supabase
        .from('habit_logs')
        .insert([{ habit_name: habitName, log_date: todayStr, is_completed: false }])
        .select();

    if (error) {
        alert("Fallo al guardar. Revisa la Consola (F12). Error: " + error.message);
    } else {
        loadHabits();
    }
}

async function toggleHabit(habitName, dateStr, currentState) {
    const { data, error: fetchError } = await _supabase
        .from('habit_logs')
        .select('id')
        .eq('habit_name', habitName)
        .eq('log_date', dateStr)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error buscando registro:", fetchError.message);
        return;
    }

    if (data) {
        const { error: updateError } = await _supabase
            .from('habit_logs')
            .update({ is_completed: !currentState })
            .eq('id', data.id);

        if (updateError) console.error("Error actualizando:", updateError.message);
    } else {
        const { error: insertError } = await _supabase
            .from('habit_logs')
            .insert([{
                habit_name: habitName,
                log_date: dateStr,
                is_completed: !currentState
            }]);

        if (insertError) console.error("Error insertando:", insertError.message);
    }

    loadHabits();
    if (typeof loadMetrics === 'function') loadMetrics();
}

async function editHabit(oldName) {
    const newName = prompt("Editar nombre (afectará a todo su historial):", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;

    const { error } = await _supabase
        .from('habit_logs')
        .update({ habit_name: newName.trim() })
        .eq('habit_name', oldName);

    if (error) alert("Error al editar: " + error.message);
    else loadHabits();
}

async function deleteHabit(name) {
    const confirmDelete = confirm(`¿Deseas eliminar "${name}" y TODO su registro histórico?`);
    if (!confirmDelete) return;

    const { error } = await _supabase
        .from('habit_logs')
        .delete()
        .eq('habit_name', name);

    if (error) alert("Error al eliminar: " + error.message);
    else loadHabits();
}


/**
 * Exportar TODO el historial de hábitos a CSV
 */
async function exportAllHistoryCSV() {
    const { data: allLogs, error } = await _supabase
        .from('habit_logs')
        .select('*')
        .order('log_date', { ascending: true });

    if (error) return alert("Error al conectar con la base de datos.");
    if (!allLogs || allLogs.length === 0) return alert("No hay datos históricos para exportar.");

    const uniqueHabits = [...new Set(allLogs.map(l => l.habit_name))].sort();

    const firstDateStr = allLogs[0].log_date;
    const firstDate = new Date(firstDateStr + 'T00:00:00');
    const today = new Date();

    const allDates = [];
    let currentDate = new Date(firstDate);

    while (currentDate <= today) {
        allDates.push(formatDateLocal(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    let csvContent = "\uFEFF";
    csvContent += "Hábito," + allDates.join(",") + ",Total Histórico\n";

    uniqueHabits.forEach(habitName => {
        let row = `"${habitName}"`;
        let totalCompletados = 0;

        allDates.forEach(dateStr => {
            const log = allLogs.find(l => l.habit_name === habitName && l.log_date === dateStr);
            const isDone = log ? log.is_completed : false;

            if (isDone) totalCompletados++;

            row += isDone ? ",Sí" : ",No";
        });

        row += `,${totalCompletados}`;
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `IKILIFE_Historial_Completo.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Exportar Hábitos de la Semana Actual a CSV
 */
async function exportHabitsCSV() {
    const today = new Date();
    let currentDay = today.getDay();
    currentDay = currentDay === 0 ? 7 : currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1);

    const datesOfWeek = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        datesOfWeek.push(formatDateLocal(d));
    }

    const { data: allHabitsData, error: err1 } = await _supabase.from('habit_logs').select('habit_name');
    if (err1) return alert("Error al obtener datos para exportar.");
    const uniqueHabits = [...new Set(allHabitsData.map(h => h.habit_name))].sort();

    const { data: weekLogs, error: err2 } = await _supabase
        .from('habit_logs')
        .select('*')
        .gte('log_date', datesOfWeek[0])
        .lte('log_date', datesOfWeek[6]);

    if (err2) return alert("Error al obtener registros de la semana.");

    let csvContent = "\uFEFF";
    csvContent += "Hábito," + datesOfWeek.join(",") + ",Total Completados\n";

    uniqueHabits.forEach(habitName => {
        let row = `"${habitName}"`;
        let totalCompletados = 0;

        datesOfWeek.forEach(dateStr => {
            const log = weekLogs.find(l => l.habit_name === habitName && l.log_date === dateStr);
            const isDone = log ? log.is_completed : false;

            if (isDone) totalCompletados++;

            row += isDone ? ",Sí" : ",No";
        });

        row += `,${totalCompletados}`;
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `IKILIFE_Habitos_${datesOfWeek[0]}_al_${datesOfWeek[6]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}



/**
 * Exportar TODO el historial de hábitos a CSV
 */
async function exportAllHistoryCSV() {
    const { data: allLogs, error } = await _supabase
        .from('habit_logs')
        .select('*')
        .order('log_date', { ascending: true });

    if (error) return alert("Error al conectar con la base de datos.");
    if (!allLogs || allLogs.length === 0) return alert("No hay datos históricos para exportar.");

    const uniqueHabits = [...new Set(allLogs.map(l => l.habit_name))].sort();

    const firstDateStr = allLogs[0].log_date;
    const firstDate = new Date(firstDateStr + 'T00:00:00');
    const today = new Date();

    const allDates = [];
    let currentDate = new Date(firstDate);

    while (currentDate <= today) {
        allDates.push(formatDateLocal(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    let csvContent = "\uFEFF";
    csvContent += "Hábito," + allDates.join(",") + ",Total Histórico\n";

    uniqueHabits.forEach(habitName => {
        let row = `"${habitName}"`;
        let totalCompletados = 0;

        allDates.forEach(dateStr => {
            const log = allLogs.find(l => l.habit_name === habitName && l.log_date === dateStr);
            const isDone = log ? log.is_completed : false;

            if (isDone) totalCompletados++;

            row += isDone ? ",Sí" : ",No";
        });

        row += `,${totalCompletados}`;
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `IKILIFE_Historial_Completo.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Exportar Hábitos de la Semana Actual a CSV
 */
async function exportHabitsCSV() {
    const today = new Date();
    let currentDay = today.getDay();
    currentDay = currentDay === 0 ? 7 : currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1);

    const datesOfWeek = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        datesOfWeek.push(formatDateLocal(d));
    }

    const { data: allHabitsData, error: err1 } = await _supabase.from('habit_logs').select('habit_name');
    if (err1) return alert("Error al obtener datos para exportar.");
    const uniqueHabits = [...new Set(allHabitsData.map(h => h.habit_name))].sort();

    const { data: weekLogs, error: err2 } = await _supabase
        .from('habit_logs')
        .select('*')
        .gte('log_date', datesOfWeek[0])
        .lte('log_date', datesOfWeek[6]);

    if (err2) return alert("Error al obtener registros de la semana.");

    let csvContent = "\uFEFF";
    csvContent += "Hábito," + datesOfWeek.join(",") + ",Total Completados\n";

    uniqueHabits.forEach(habitName => {
        let row = `"${habitName}"`;
        let totalCompletados = 0;

        datesOfWeek.forEach(dateStr => {
            const log = weekLogs.find(l => l.habit_name === habitName && l.log_date === dateStr);
            const isDone = log ? log.is_completed : false;

            if (isDone) totalCompletados++;

            row += isDone ? ",Sí" : ",No";
        });

        row += `,${totalCompletados}`;
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `IKILIFE_Habitos_${datesOfWeek[0]}_al_${datesOfWeek[6]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// Al final de habits.js
window.addHabit = addHabit;
window.exportHabitsCSV = exportHabitsCSV;
window.exportAllHistoryCSV = exportAllHistoryCSV;