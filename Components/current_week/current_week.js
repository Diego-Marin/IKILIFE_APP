/**
 * ==========================================
 * CÁLCULO DE PROGRESO SEMANAL Y FECHAS
 * ==========================================
 */
function updateWeeklyProgress() {
    const today = new Date();

    const dateElement = document.getElementById('current-month-text');
    if (dateElement) {
        const fullDate = new Intl.DateTimeFormat('es-CO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(today);
        dateElement.textContent = fullDate;
    }

    const weekNumber = Math.ceil(today.getDate() / 7);
    const weekElement = document.getElementById('current-week-text');
    if (weekElement) {
        weekElement.textContent = `Avance Semana ${weekNumber}`;
    }

    let currentDay = today.getDay();
    currentDay = currentDay === 0 ? 7 : currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1);

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        const dayString = String(dayDate.getDate()).padStart(2, '0');

        const labelEl = document.getElementById(`day-label-${i + 1}`);
        if (labelEl) {
            labelEl.textContent = dayString;
        }
    }

    const segments = document.querySelectorAll('.day-segment');
    segments.forEach((segment, index) => {
        const segmentDay = index + 1;
        segment.classList.remove('past', 'today', 'future');

        if (segmentDay <= currentDay) {
            segment.classList.add(segmentDay === currentDay ? 'today' : 'past');
            segment.style.backgroundColor = 'var(--primary-green)';
            segment.style.opacity = '1';
        } else {
            segment.classList.add('future');
            segment.style.backgroundColor = 'var(--border-color)';
            segment.style.opacity = '1';
        }
    });
}