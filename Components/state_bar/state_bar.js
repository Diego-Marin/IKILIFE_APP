export function renderStateBar(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Inyección de la estructura HTML
    container.innerHTML = `
        <div class="ikilife-state-card" id="state-card">
            <div class="state-info">
                <span class="state-title">Foco Actual</span>
                <div class="state-block">
                    <span id="state-icon">⌛</span>
                    <span id="state-text">Calculando...</span>
                </div>
            </div>
            <div class="state-time-box" id="state-time">
                --:--
            </div>
        </div>
    `;

    // Función que evalúa la hora y actualiza la tarjeta
    function updateState() {
        const now = new Date();
        const day = now.getDay();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeInMinutes = (hours * 60) + minutes;

        // Formatear hora (Ej: 02:30 PM)
        const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
        document.getElementById('state-time').textContent = timeStr;

        let icon = "⚡";
        let text = "Activo";
        let modeClass = "state-mode-grow";

        const isWeekday = day >= 1 && day <= 5; // Lunes a Viernes

        // LÓGICA DE BLOQUES DE TIEMPO
        if (isWeekday) {
            if (timeInMinutes >= 300 && timeInMinutes < 1020) { 
                // 05:00 AM - 05:00 PM
                icon = "💼"; 
                text = "Mesa de Ayuda / Trabajo"; 
                modeClass = "state-mode-work";
            } else if (timeInMinutes >= 1020 && timeInMinutes < 1260) { 
                // 05:00 PM - 09:00 PM
                icon = "🌱"; 
                text = "Inglés, Code & Crecimiento"; 
                modeClass = "state-mode-grow";
            } else { 
                // 09:00 PM - 05:00 AM
                icon = "🌙"; 
                text = "Descanso / Recuperación"; 
                modeClass = "state-mode-sleep";
            }
        } else { // Fines de semana (Sábado y Domingo)
            if (timeInMinutes >= 360 && timeInMinutes < 720) { 
                // 06:00 AM - 12:00 PM
                icon = "⛰️"; 
                text = "Mañana Activa / Senderismo"; 
                modeClass = "state-mode-grow";
            } else if (timeInMinutes >= 720 && timeInMinutes < 1320) { 
                // 12:00 PM - 10:00 PM
                icon = "🍻"; 
                text = "Tiempo Libre & Recarga"; 
                modeClass = "state-mode-free";
            } else { 
                // 10:00 PM - 06:00 AM
                icon = "🌙"; 
                text = "Descanso / Recuperación"; 
                modeClass = "state-mode-sleep";
            }
        }

        // Actualizar el DOM
        document.getElementById('state-icon').textContent = icon;
        document.getElementById('state-text').textContent = text;
        
        const card = document.getElementById('state-card');
        card.className = `ikilife-state-card ${modeClass}`;
    }

    // Ejecutar inmediatamente al cargar y luego cada 60 segundos
    updateState();
    setInterval(updateState, 60000);
}