// =====================================================
// IMPORTACIONES
// =====================================================

import { _supabase } from "./supabase.js";

import {
    initInversiones,
    renderInversiones,
    addInversion,
    editInversionName,
    deleteInversionFull,
    addCuota,
    editCuota,
    deleteCuota,
    toggleCuota
} from "./components/inversiones/inversiones.js";

import {
    renderStateBar
} from "./components/state_bar/state_bar.js";

import {
    loadLoves,
    addLove,
    incrementLove,
    editLove,
    deleteLove,
    loadBloques,
    addBloque,
    editBloque,
    deleteBloque,
    addBloqueTask,
    editBloqueTask,
    deleteBloqueTask,
    toggleBloqueTask,
    loadEscuelas,
    addEscuela,
    incrementEscuelaProgress,
    editEscuela,
    deleteEscuela,
    loadAgradecimientos,
    addAgradecimiento,
    editAgradecimiento,
    deleteAgradecimiento,
    showRandomVictory
} from "./components/loves/loves.js";

// ─────────────────────────────────────────────────────
// Descomenta los imports a medida que crees los módulos:
//
// import {
//     loadHabits, addHabit, toggleHabit, editHabit,
//     deleteHabit, changeWeek, exportHabitsCSV,
//     exportAllHistoryCSV, updateWeeklyProgress
// } from "./components/habits/habits.js";
//
// import {
//     loadIdeas, addIdea, editIdea, deleteIdea, exportIdeasCSV
// } from "./components/ideas/ideas.js";
//
// import {
//     loadTareas, addTarea, deleteTarea
// } from "./components/tareas/tareas.js";
//
// import {
//     loadCompras, addCompra, incrementCompra,
//     editCompra, deleteCompra
// } from "./components/compras/compras.js";
//
// import {
//     loadMetrics, generateInsights
// } from "./components/metrics/metrics.js";
//
// import {
//     loadFinance, addFinanceCategory, addFinanceItem,
//     addFinanceReal, editFinanceRealTotal,
//     editFinanceConcept, deleteFinanceItem
// } from "./components/finance/finance.js";
// ─────────────────────────────────────────────────────


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


// =====================================================
// EXPONER FUNCIONES AL SCOPE GLOBAL
// =====================================================

Object.assign(window, {
    // Journal
    saveLearning,

    // Loves / Pasiones
    addLove:                    (...a) => addLove?.(...a),
    incrementLove:              (...a) => incrementLove?.(...a),
    editLove:                   (...a) => editLove?.(...a),
    deleteLove:                 (...a) => deleteLove?.(...a),

    // Bloques
    addBloque:                  (...a) => addBloque?.(...a),
    editBloque:                 (...a) => editBloque?.(...a),
    deleteBloque:               (...a) => deleteBloque?.(...a),
    addBloqueTask:              (...a) => addBloqueTask?.(...a),
    editBloqueTask:             (...a) => editBloqueTask?.(...a),
    deleteBloqueTask:           (...a) => deleteBloqueTask?.(...a),
    toggleBloqueTask:           (...a) => toggleBloqueTask?.(...a),

    // Escuelas
    addEscuela:                 (...a) => addEscuela?.(...a),
    incrementEscuelaProgress:   (...a) => incrementEscuelaProgress?.(...a),
    editEscuela:                (...a) => editEscuela?.(...a),
    deleteEscuela:              (...a) => deleteEscuela?.(...a),

    // Agradecimientos
    addAgradecimiento:          (...a) => addAgradecimiento?.(...a),
    editAgradecimiento:         (...a) => editAgradecimiento?.(...a),
    deleteAgradecimiento:       (...a) => deleteAgradecimiento?.(...a),
    showRandomVictory:          (...a) => showRandomVictory?.(...a),

    // Inversiones / Deudas
    addInversion:               (...a) => addInversion?.(...a),
    editInversionName:          (...a) => editInversionName?.(...a),
    deleteInversionFull:        (...a) => deleteInversionFull?.(...a),
    addCuota:                   (...a) => addCuota?.(...a),
    editCuota:                  (...a) => editCuota?.(...a),
    deleteCuota:                (...a) => deleteCuota?.(...a),
    toggleCuota:                (...a) => toggleCuota?.(...a),

    // Habits (descomenta cuando importes el módulo)
    addHabit:                   (...a) => typeof addHabit !== 'undefined' ? addHabit(...a) : null,
    toggleHabit:                (...a) => typeof toggleHabit !== 'undefined' ? toggleHabit(...a) : null,
    editHabit:                  (...a) => typeof editHabit !== 'undefined' ? editHabit(...a) : null,
    deleteHabit:                (...a) => typeof deleteHabit !== 'undefined' ? deleteHabit(...a) : null,
    changeWeek:                 (...a) => typeof changeWeek !== 'undefined' ? changeWeek(...a) : null,
    exportHabitsCSV:            (...a) => typeof exportHabitsCSV !== 'undefined' ? exportHabitsCSV(...a) : null,
    exportAllHistoryCSV:        (...a) => typeof exportAllHistoryCSV !== 'undefined' ? exportAllHistoryCSV(...a) : null,

    // Ideas
    addIdea:                    (...a) => typeof addIdea !== 'undefined' ? addIdea(...a) : null,
    editIdea:                   (...a) => typeof editIdea !== 'undefined' ? editIdea(...a) : null,
    deleteIdea:                 (...a) => typeof deleteIdea !== 'undefined' ? deleteIdea(...a) : null,
    exportIdeasCSV:             (...a) => typeof exportIdeasCSV !== 'undefined' ? exportIdeasCSV(...a) : null,

    // Tareas
    addTarea:                   (...a) => typeof addTarea !== 'undefined' ? addTarea(...a) : null,
    deleteTarea:                (...a) => typeof deleteTarea !== 'undefined' ? deleteTarea(...a) : null,

    // Compras
    addCompra:                  (...a) => typeof addCompra !== 'undefined' ? addCompra(...a) : null,
    incrementCompra:            (...a) => typeof incrementCompra !== 'undefined' ? incrementCompra(...a) : null,
    editCompra:                 (...a) => typeof editCompra !== 'undefined' ? editCompra(...a) : null,
    deleteCompra:               (...a) => typeof deleteCompra !== 'undefined' ? deleteCompra(...a) : null,

    // Finance
    addFinanceCategory:         (...a) => typeof addFinanceCategory !== 'undefined' ? addFinanceCategory(...a) : null,
    addFinanceItem:             (...a) => typeof addFinanceItem !== 'undefined' ? addFinanceItem(...a) : null,
    addFinanceReal:             (...a) => typeof addFinanceReal !== 'undefined' ? addFinanceReal(...a) : null,
    editFinanceRealTotal:       (...a) => typeof editFinanceRealTotal !== 'undefined' ? editFinanceRealTotal(...a) : null,
    editFinanceConcept:         (...a) => typeof editFinanceConcept !== 'undefined' ? editFinanceConcept(...a) : null,
    deleteFinanceItem:          (...a) => typeof deleteFinanceItem !== 'undefined' ? deleteFinanceItem(...a) : null,

    // Metrics
    generateInsights:           (...a) => typeof generateInsights !== 'undefined' ? generateInsights(...a) : null,
});


// =====================================================
// INICIALIZACIÓN
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

    // Cerrar dropdown al hacer click fuera
    const dropdown   = document.getElementById("profile-dropdown");
    const profileBtn = document.querySelector(".profile-btn");
    if (dropdown && profileBtn) {
        document.addEventListener("click", (e) => {
            if (!dropdown.contains(e.target) && !profileBtn.contains(e.target)) {
                dropdown.classList.add("hidden");
            }
        });
    }

    try {
        renderStateBar("state-bar-container");

        await Promise.allSettled([
            loadEscuelas(),
            loadLoves(),
            loadBloques(),
            loadAgradecimientos(),
        ]);

        initInversiones(_supabase);
        await renderInversiones("inversiones-container");

        _supabase
            .channel("habit-changes")
            .on("postgres_changes",
                { event: "*", schema: "public", table: "habit_logs" },
                () => typeof loadHabits !== 'undefined' && loadHabits()
            )
            .subscribe();

    } catch (err) {
        console.error("Error durante la inicialización:", err);
    }
});