/**
 * ==========================================
 * GESTIÓN DE IDEAS
 * ==========================================
 */
async function loadIdeas() {
    const { data: ideas, error } = await _supabase
        .from('ideas_logs')
        .select('*')
        .or('type.eq.idea,type.is.null')
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) return console.error("Error cargando ideas:", error.message);

    const listContainer = document.getElementById('list-ideas');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    ideas.forEach(idea => {
        const dateObj = new Date(idea.created_at);
        const dateString = dateObj.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
        const timeString = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

        const row = `
            <li class="idea-row">
                <div class="idea-content"
                     onclick="editIdea(${idea.id}, '${idea.content.replace(/'/g, "\\'")}')"
                     oncontextmenu="event.preventDefault(); deleteIdea(${idea.id})"
                     title="Clic: Editar | Clic Derecho: Eliminar">
                    ${idea.content}
                </div>
                <div class="idea-date">${dateString} - ${timeString}</div>
            </li>
        `;
        listContainer.insertAdjacentHTML('beforeend', row);
    });
}

async function addIdea() {
    const rawInput = prompt("Escribe tu nueva idea (usa #etiquetas para categorizar):");
    if (!rawInput || rawInput.trim() === "") return;

    const { content, tags } = parseContentAndTags(rawInput);

    const { error } = await _supabase
        .from('ideas_logs')
        .insert([{ content: content, type: 'idea', tags: tags }]);

    if (error) alert("Error al guardar: " + error.message);
    else loadIdeas();
}

async function editIdea(id, oldContent) {
    const newContent = prompt("Editar idea:", oldContent);
    if (!newContent || newContent.trim() === "" || newContent === oldContent) return;

    const { error } = await _supabase
        .from('ideas_logs')
        .update({ content: newContent.trim() })
        .eq('id', id);

    if (error) {
        alert("Error al editar: " + error.message);
    } else {
        loadIdeas();
    }
}

async function deleteIdea(id) {
    const confirmDelete = confirm("¿Deseas eliminar esta idea?");
    if (!confirmDelete) return;

    const { error } = await _supabase
        .from('ideas_logs')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Error al eliminar: " + error.message);
    } else {
        loadIdeas();
    }
}




/**
 * ==========================================
 * EXPORTAR HISTORIAL DE IDEAS A CSV
 * ==========================================
 */
async function exportIdeasCSV() {
    try {
        const { data: allIdeas, error } = await _supabase
            .from('ideas_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            alert("Error al conectar con la base de datos: " + error.message);
            return;
        }
        
        if (!allIdeas || allIdeas.length === 0) {
            alert("No hay datos históricos para exportar.");
            return;
        }

        let csvContent = "\uFEFF"; 
        csvContent += "ID,Fecha,Tipo,Contenido,Etiquetas\n";

        allIdeas.forEach(idea => {
            const id = idea.id || "";
            
            let fecha = "";
            if (idea.created_at) {
                fecha = new Date(idea.created_at).toLocaleString('es-CO');
            }

            const tipo = idea.type || "idea";
            
            // Forzamos a que sea un string para evitar que .replace() falle si hay números o nulls
            const rawContent = idea.content ? String(idea.content) : "";
            const contenidoLimpio = rawContent.replace(/"/g, '""');
            const contenidoCSV = `"${contenidoLimpio}"`;
            
            // Manejo hiper-seguro de las etiquetas por si la base de datos devuelve texto en lugar de un array
            let etiquetasStr = "";
            if (Array.isArray(idea.tags)) {
                etiquetasStr = idea.tags.join(', ');
            } else if (typeof idea.tags === 'string') {
                etiquetasStr = idea.tags; // Si por error se guardó como string
            }
            const etiquetasCSV = `"${etiquetasStr}"`;

            csvContent += `${id},"${fecha}","${tipo}",${contenidoCSV},${etiquetasCSV}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute("download", `IKILIFE_BrainDump_Completo.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (err) {
        console.error("Error al exportar CSV:", err);
        alert("Ocurrió un error inesperado generando el archivo:\n" + err.message + "\n\nRevisa la consola (F12) para más detalles.");
    }
}


// =====================================================
// JOURNAL
// =====================================================

async function saveLearning() {
    const input = document.getElementById("daily-learning");
    const content = input?.value.trim();
    if (!content) return;

    const { error } = await _supabase
        .from("journal_logs")
        .insert([{ content }]);

    if (error) {
        console.error(error);
        alert("No fue posible guardar el aprendizaje");
    } else {
        alert("Aprendizaje guardado");
        input.value = "";
    }
}