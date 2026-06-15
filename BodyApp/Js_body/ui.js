function validarPasswordAdmin(event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
    const inputPass = document.getElementById('txt-modal-password');
    const passIntroducida = (inputPass?.value || '').toString().trim();
    const sesion = JSON.parse(localStorage.getItem('admintech_sesion')) || null;
    const passCorrecta = (sesion && sesion.pvpasword != null) ? sesion.pvpasword.toString().trim() : '';
    ocultarMensajeApp('modal-password-message');

    if (!sesion || passCorrecta === '') {
        mostrarMensajeApp('modal-password-message', 'No hay una contraseña privada configurada en tu sesión.', 'error');
        inputPass.value = '';
        return;
    }

    if (passIntroducida === passCorrecta) {
        sesionAdminActiva = true;
        closeModal('modal-password');
        inputPass.value = '';

        if (vistaPendientePorDesbloquear) {
            ejecutarCambioVista(vistaPendientePorDesbloquear);
            vistaPendientePorDesbloquear = '';
        }
    } else {
        mostrarMensajeApp('modal-password-message', '❌ Contraseña incorrecta.', 'error');
        inputPass.value = '';
        inputPass.focus();
    }
}

// ==========================================================================
// LÓGICA DE CONTROL: MÓDULO DE PRODUCTOS (FASE 4)
// ==========================================================================
function cargarSelectProductosDetalle() {
    const select = document.getElementById('prod-detalle-selector');
    const wrapper = document.getElementById('wrapper-metricas-producto');
    const vacio = document.getElementById('m-estado-vacio');
    
    if (!select) return;

    if (INVENTARIO.length === 0) {
        select.innerHTML = '<option value="">-- No hay productos registrados --</option>';
        if(wrapper) wrapper.style.display = 'none';
        if(vacio) vacio.style.display = 'block';
        return;
    }

    select.innerHTML = '<option value="">-- Selecciona un producto para inspeccionar --</option>' + 
        INVENTARIO.map(p => `<option value="${p.id}">${p.nombre} (${p.sku})</option>`).join('');
        
    if(wrapper) wrapper.style.display = 'none';
    if(vacio) vacio.style.display = 'block';
}

function cargarMétricasIndividuales() {
    const idSeleccionado = document.getElementById('prod-detalle-selector').value;
    const wrapper = document.getElementById('wrapper-metricas-producto');
    const vacio = document.getElementById('m-estado-vacio');

    if (!idSeleccionado) {
        if(wrapper) wrapper.style.display = 'none';
        if(vacio) vacio.style.display = 'block';
        return;
    }

    const p = INVENTARIO.find(prod => prod.id == idSeleccionado);
    if (!p) return;

    if(vacio) vacio.style.display = 'none';
    if(wrapper) wrapper.style.display = 'block';

    const unidadMedida = p.tVenta === "Granel" ? " kg" : " pzas";
    document.getElementById('m-stock-actual').innerText = p.stock + unidadMedida;
    
    const inversionTotal = p.stock * p.pCompra;
    document.getElementById('m-total-inversion').innerText = `$${inversionTotal.toFixed(2)}`;
    document.getElementById('m-rendimiento-estimado').innerText = p.margenCalculado.toFixed(2) + "%";

    document.getElementById('f-sku').innerText = p.sku;
    document.getElementById('f-tventa').innerText = p.tVenta;
    document.getElementById('f-categoria').innerText = p.categoria;
    document.getElementById('f-marca').innerText = p.marca;
    document.getElementById('f-proveedor').innerText = p.proveedor || "No asignado";
    document.getElementById('f-caducidad').innerText = p.fVencimiento || "Sin fecha (No perecedero)";
}

function buscarProductoDetalle() {
    const input = document.getElementById('txt-buscar-detalle');
    const dropdown = document.getElementById('detalle-resultados-busqueda');
    const query = input.value.trim().toLowerCase();

    if (!query) {
        dropdown.style.display = 'none';
        return;
    }

    const coincidencias = INVENTARIO.filter(p => 
        p.nombre.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)
    );

    if (coincidencias.length === 0) {
        dropdown.innerHTML = '<div style="padding:0.75rem; color:var(--text-muted); font-size:0.9rem;">No hay productos que coincidan...</div>';
        dropdown.style.display = 'block';
        return;
    }

    dropdown.innerHTML = coincidencias.map(p => `
        <div class="dropdown-item-row" onclick="seleccionarProductoDetalle(${p.id})" style="padding:0.6rem 0.8rem; cursor:pointer; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong style="color:#fff; font-size:0.9rem;">${p.nombre}</strong><br>
                <small style="color:var(--text-muted); font-size:0.75rem;">SKU: ${p.sku}</small>
            </div>
            <span class="badge-status" style="font-size:0.75rem; background-color:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">Stock: ${p.stock}</span>
        </div>
    `).join('');

    dropdown.style.display = 'block';
}

function seleccionarProductoDetalle(idProducto) {
    const p = INVENTARIO.find(prod => prod.id == idProducto);
    if (!p) return;

    document.getElementById('det-estado-inicial').style.display = 'none';
    document.getElementById('panel-kardex-producto').style.display = 'block';
    document.getElementById('detalle-resultados-busqueda').style.display = 'none';
    document.getElementById('txt-buscar-detalle').value = p.nombre;

    document.getElementById('det-header-sku').innerText = `SKU: ${p.sku}`;
    document.getElementById('det-header-nombre').innerText = p.nombre;
    document.getElementById('det-info-nombre').innerText = p.nombre;
    document.getElementById('det-info-desc').innerText = p.descripcion || "Sin descripción detallada registrada para este artículo.";
    document.getElementById('det-info-sku').innerText = p.sku;
    document.getElementById('det-info-categoria').innerText = p.categoria;
    document.getElementById('det-info-proveedor').innerText = p.proveedor || "Distribuidor No Asignado";

    document.getElementById('det-fin-compra').innerText = `$${parseFloat(p.pCompra).toFixed(2)}`;
    document.getElementById('det-fin-venta').innerText = `$${parseFloat(p.pVenta).toFixed(2)}`;
    document.getElementById('det-fin-margen').innerText = `${p.margenCalculado.toFixed(1)}%`;

    const lblFecha = document.getElementById('det-cad-fecha');
    const lblDias = document.getElementById('det-cad-dias');

    if (p.fVencimiento) {
        lblFecha.innerText = formatearFechaLegible(p.fVencimiento);
        
        const hoy = new Date();
        const fechaVenc = new Date(p.fVencimiento + 'T00:00:00');
        const diferenciaTiempo = fechaVenc - hoy;
        const diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));

        if (diasRestantes > 0) {
            lblDias.innerText = `${diasRestantes} días`;
            lblDias.style.color = diasRestantes <= 15 ? '#f59e0b' : '#22c55e';
        } else {
            lblDias.innerText = `⚠️ CADUCADO`;
            lblDias.style.color = '#ef4444';
        }
    } else {
        lblFecha.innerText = "No perecedero";
        lblDias.innerText = "N/A";
        lblDias.style.color = 'var(--text-muted)';
    }

    const contenedorAlertas = document.getElementById('det-contenedor-alertas');
    contenedorAlertas.innerHTML = '';
    
    if (p.stock <= p.stockMin) {
        contenedorAlertas.innerHTML += `
            <div class="alert-status-item danger">
                🚨 STOCK CRÍTICO: Quedan pocas unidades en inventario (Mínimo requerido: ${p.stockMin}).
            </div>`;
    }
    if (p.estado === "Advertencia" || p.estado === "Crítico") {
        contenedorAlertas.innerHTML += `
            <div class="alert-status-item warning">
                ⚠️ REVISIÓN SANITARIA: Este artículo está marcado como "${p.estado}" en piso de venta.
            </div>`;
    }
    if (contenedorAlertas.innerHTML === '') {
        contenedorAlertas.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">Ninguna anomalía detectada. El producto opera con normalidad.</div>';
    }

    const listaMovimientos = document.getElementById('det-lista-movimientos');
    const uMedida = p.tVenta === "Granel" ? "kg" : "unid.";
    
    listaMovimientos.innerHTML = `
        <div class="movimiento-row">
            <div>
                <strong style="color:var(--color-success);">⬇️ Entrada</strong><br>
                <small style="color:var(--text-muted);">Stock inicial de registro</small>
            </div>
            <strong style="color:var(--color-success);">+${p.stock} ${uMedida}</strong>
        </div>
    `;
}

function limpiarPantallaDetalle() {
    document.getElementById('txt-buscar-detalle').value = '';
    document.getElementById('panel-kardex-producto').style.display = 'none';
    document.getElementById('det-estado-inicial').style.display = 'block';
}

function formatearFechaLegible(fechaCadena) {
    if(!fechaCadena) return "-";
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const partes = fechaCadena.split('-');
    if(partes.length !== 3) return fechaCadena;
    return `${partes[2]} ${meses[parseInt(partes[1]) - 1]} ${partes[0]}`;
}

// ==========================================================================
// FASE 5: CONTROLADOR FINANCIERO Y RENDIMIENTO DE GANANCIAS (CHART.JS)
// ==========================================================================
function cargarModuloGanancias() {
    calcularTarjetasFinancieras();
    renderizarGraficaLineal();
    renderizarGraficaCircularCategorias();
}

function calcularTarjetasFinancieras() {
    let valorTotalInventario = 0;
    let perdidaCaducidad = 0;
    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    INVENTARIO.forEach(p => {
        const stockActual = parseFloat(p.stock) || 0;
        const pCompra = parseFloat(p.pCompra) || 0;
        
        valorTotalInventario += (stockActual * pCompra);

        if (p.fVencimiento) {
            const fechaVenc = new Date(p.fVencimiento + 'T00:00:00');
            if (fechaVenc <= hoy) {
                perdidaCaducidad += (stockActual * pCompra);
            }
        }
    });

    const vtLabel = document.getElementById('fin-vt');
    if(vtLabel) vtLabel.innerText = `$${valorTotalInventario.toFixed(2)}`;
    
    const pcLabel = document.getElementById('fin-pc');
    if(pcLabel) pcLabel.innerText = `$${perdidaCaducidad.toFixed(2)}`;

    let gananciaTotal = 0;
    let unidadesVendidasTotales = 0;
    INVENTARIO.forEach(p => {
        const vendidas = parseInt(p.unidadesVendidas || 0, 10);
        const pCompra = parseFloat(p.pCompra) || 0;
        const pVenta = parseFloat(p.pVenta) || 0;
        unidadesVendidasTotales += vendidas;
        gananciaTotal += vendidas * Math.max(0, pVenta - pCompra);
    });

    const gtLabel = document.getElementById('fin-ganancia-total');
    if (gtLabel) gtLabel.innerText = `$${gananciaTotal.toFixed(2)}`;

    const unidadesLabel = document.getElementById('fin-unidades-vendidas');
    if (unidadesLabel) unidadesLabel.innerText = `Total unidades vendidas: ${unidadesVendidasTotales}`;

    let productosOrdenados = [...INVENTARIO].sort((a, b) => (b.unidadesVendidas || 0) - (a.unidadesVendidas || 0));
    
    const pmLabel = document.getElementById('fin-pm');
    const pmUnidLabel = document.getElementById('fin-pm-unid');
    const pmvLabel = document.getElementById('fin-pmv');
    const pmvUnidLabel = document.getElementById('fin-pmv-unid');

    if (productosOrdenados.length > 0 && (productosOrdenados[0].unidadesVendidas || 0) > 0) {
        const maxP = productosOrdenados[0];
        const minP = productosOrdenados[productosOrdenados.length - 1];
        
        if(pmLabel) pmLabel.innerText = maxP.nombre;
        if(pmUnidLabel) pmUnidLabel.innerText = `${maxP.unidadesVendidas} unidades desplazadas`;
        
        if(pmvLabel) pmvLabel.innerText = minP.nombre;
        if(pmvUnidLabel) pmvUnidLabel.innerText = `${minP.unidadesVendidas || 0} unidades vendidas`;
    } else {
        if(pmLabel) pmLabel.innerText = "Sin ventas";
        if(pmvLabel) pmvLabel.innerText = "Sin ventas";
        if(pmUnidLabel) pmUnidLabel.innerText = "0 unidades";
        if(pmvUnidLabel) pmvUnidLabel.innerText = "0 unidades";
    }
}

function cambiarPeriodoGanancias(periodo) {
    periodoActualGanancias = periodo;
    
    ['semanal', 'mensual', 'anual'].forEach(p => {
        const btn = document.getElementById(`btn-p-${p}`);
        if(btn) btn.style.backgroundColor = p === periodo ? 'var(--color-primary)' : 'transparent';
    });

    renderizarGraficaLineal();
}

function renderizarGraficaLineal() {
    const canvasLineas = document.getElementById('chart-linea-ganancias');
    if (!canvasLineas) return;
    const ctx = canvasLineas.getContext('2d');
    
    if (miGraficaLinea) { miGraficaLinea.destroy(); }

    let labels = [];
    let datosPesos = [];

    let totalVendidoHoy = 0;
    INVENTARIO.forEach(p => {
        if(p.unidadesVendidas) {
            totalVendidoHoy += ((parseFloat(p.pVenta) - parseFloat(p.pCompra)) * p.unidadesVendidas);
        }
    });

    if (periodoActualGanancias === 'semanal') {
        labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        datosPesos = [450, 800, 320, 1100, 1500, 2100, totalVendidoHoy > 0 ? totalVendidoHoy : 150]; 
    } else if (periodoActualGanancias === 'mensual') {
        labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
        datosPesos = [3500, 4200, 3100, totalVendidoHoy > 0 ? (5000 + totalVendidoHoy) : 5000];
    } else if (periodoActualGanancias === 'anual') {
        labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
        datosPesos = [12000, 14000, 11000, 16000, 18000, totalVendidoHoy > 0 ? (20000 + totalVendidoHoy) : 20000];
    }

    miGraficaLinea = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ganancia ($)',
                data: datosPesos,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                borderWidth: 3,
                pointBackgroundColor: '#60a5fa',
                pointRadius: 4,
                tension: 0.35,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

function renderizarGraficaCircularCategorias() {
    const canvas = document.getElementById('chart-torta-categorias');
    if (!canvas) return; 

    const ctx = canvas.getContext('2d');
    
    if (miGraficaTorta !== null && miGraficaTorta !== undefined) {
        if (typeof miGraficaTorta.destroy === 'function') {
            miGraficaTorta.destroy();
        }
    }

    let conteoCategorias = {};
    
    if (typeof INVENTARIO !== 'undefined' && INVENTARIO.length > 0) {
        INVENTARIO.forEach(p => {
            if (p.categoria) {
                if (!conteoCategorias[p.categoria]) {
                    conteoCategorias[p.categoria] = 0;
                }
                conteoCategorias[p.categoria] += (parseFloat(p.stock || 0) * parseFloat(p.pCompra || 0));
            }
        });
    }

    let labelsCategorias = Object.keys(conteoCategorias);
    let valoresCategorias = Object.values(conteoCategorias);

    if (labelsCategorias.length === 0 || valoresCategorias.reduce((a,b)=>a+b, 0) === 0) {
        labelsCategorias = ['Lácteos', 'Botanas', 'Refrescos', 'Abarrotes'];
        valoresCategorias = [2500, 1400, 980, 3100]; 
    }

    miGraficaTorta = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labelsCategorias,
            datasets: [{
                data: valoresCategorias,
                backgroundColor: ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#cbd5e1'],
                borderWidth: 2,
                borderColor: '#161b22'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { size: 11 } }
                }
            },
            cutout: '70%'
        }
    });
}

function cerrarSesionModulos() {
    sesionAdminActiva = false; 
    mostrarMensajeApp('app-global-message', '🔒 Acceso cerrado. Los módulos administrativos se han bloqueado con éxito.', 'info');
    ejecutarCambioVista('view-ventas'); 
}

function bindModalPasswordForm() {
    const modalPasswordButton = document.getElementById('btn-modal-password-access');
    if (modalPasswordButton && typeof validarPasswordAdmin === 'function') {
        modalPasswordButton.addEventListener('click', validarPasswordAdmin);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindModalPasswordForm);
} else {
    bindModalPasswordForm();
}