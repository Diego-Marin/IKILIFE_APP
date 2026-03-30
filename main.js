function switchTab(tabName, btn) {
    // 1. Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('tab-active');
        b.classList.add('tab-inactive');
    });
    btn.classList.remove('tab-inactive');
    btn.classList.add('tab-active');

    // 2. Cambiar vistas
    document.querySelectorAll('.view-content').forEach(v => v.classList.remove('active'));

    if (tabName === 'habits') {
        document.getElementById('view-habits').classList.add('active');
        
    } else {
        document.getElementById('view-money').classList.add('active');
      
    }
}


// Nueva función para navegar entre el resumen de dinero y el detalle de ingresos
                function toggleFinanceView(view) {
                    const mainFinance = document.getElementById('finance-main-view');
                    const incomeDetail = document.getElementById('income-view');

                    if (view === 'income-view') {
                        mainFinance.classList.add('hidden');
                        incomeDetail.classList.remove('hidden');
                    } else {
                        mainFinance.classList.remove('hidden');
                        incomeDetail.classList.add('hidden');
                    }
                }

                function toggleTheme() {
                    const body = document.body;
                    const sunIcon = document.querySelector('.sun-icon');
                    const moonIcon = document.querySelector('.moon-icon');

                    body.classList.toggle('dark-mode');

                    if (body.classList.contains('dark-mode')) {
                        sunIcon.classList.add('hidden');
                        moonIcon.classList.remove('hidden');
                    } else {
                        sunIcon.classList.remove('hidden');
                        moonIcon.classList.add('hidden');
                    }
                }


                function saveLearning() {
    const text = document.getElementById('daily-learning').value;
    if(text.trim() === '') {
        alert("Escribe algo antes de guardar.");
    } else {
        alert("Reflexión guardada correctamente.");
        document.getElementById('daily-learning').value = ''; // Limpia el campo
    }
}



// Calcular y mostrar el costo de vida proyectado
function calcularCostoDeVida() {
    let totalProyectado = 0;
    
    // Seleccionar todos los elementos con la clase .item-projected que tengan el atributo data-value
    const projectedItems = document.querySelectorAll('.item-projected[data-value]');
    
    projectedItems.forEach(item => {
        const valor = parseInt(item.getAttribute('data-value')) || 0;
        totalProyectado += valor;
    });

    // Formatear a moneda colombiana sin decimales
    const totalFormateado = '$' + totalProyectado.toLocaleString('es-CO');
    
    // Insertar en la tarjeta correspondiente
    document.getElementById('costo-vida-total').innerText = totalFormateado;
}

// Ejecutar la función cuando el documento cargue
document.addEventListener('DOMContentLoaded', calcularCostoDeVida);




function toggleStatus(element) {
    if (element.style.backgroundColor === 'var(--primary-green)') {
        element.style.backgroundColor = 'transparent';
        element.style.borderColor = '#999';
    } else {
        element.style.backgroundColor = 'var(--primary-green)';
        element.style.borderColor = 'var(--primary-green)';
    }
}