// === BASE DE DATOS SIMULADA LOCAL ===
let INVENTARIO = JSON.parse(localStorage.getItem('admintech_db')) || [];
let CONTEXTO_FINANCIERO = JSON.parse(localStorage.getItem('admintech_finance')) || { perdidas_caducidad: 0 };

// Variable global para controlar la instancia de las gráficas
let miGraficaLinea = null;
let miGraficaTorta = null;
let periodoActualGanancias = 'semanal';

// Catálogos dinámicos base corregidos (Lácteos con 'á')
let CATEGORIAS_PREDEFINIDAS = JSON.parse(localStorage.getItem('cat_categorias')) || [
    "Abarrotes", "Bebidas", "Botanas", "Lácteos", "Cremería", "Limpieza", "Panadería", "Frutas y Verduras"
];
let MARCAS_PREDEFINIDAS = JSON.parse(localStorage.getItem('cat_marcas')) || [
    "Sabritas", "Coca-Cola", "Alpura", "Bimbo", "La Costeña", "Gamesa", "Nestlé", "Generico"
];

// Carrito transaccional temporal
let CARRITO_ACTUAL = [];

document.addEventListener("DOMContentLoaded", () => {
    inicializarCatalogos();
    configurarBloqueoCaracteres();
    revisarCaducidadesAutomaticas();
    renderTablaInventario();

    // Escuchar el cambio de tipo de venta (Unidad vs Granel)
    const selectVenta = document.getElementById('prod-tventa');
    if (selectVenta) {
        selectVenta.addEventListener('change', adaptarFormularioGranel);
    }
});

function inicializarCatalogos() {
    const selectCat = document.getElementById('prod-categoria');
    const selectMarca = document.getElementById('prod-marca');
    
    if(selectCat && selectMarca) {
        selectCat.innerHTML = CATEGORIAS_PREDEFINIDAS.map(c => `<option value="${c}">${c}</option>`).join('') + `<option value="Nueva">+ Registrar Nueva Categoría</option>`;
        selectMarca.innerHTML = MARCAS_PREDEFINIDAS.map(m => `<option value="${m}">${m}</option>`).join('') + `<option value="Nueva">+ Registrar Nueva Marca</option>`;
    }
}

function verificarNuevoRegistro(tipo) {
    if (tipo === 'categoria') {
        const select = document.getElementById('prod-categoria');
        const inputNuevo = document.getElementById('nuevo-nombre-categoria');
        if (select && inputNuevo) {
            if (select.value === "Nueva") { inputNuevo.style.display = "block"; inputNuevo.required = true; inputNuevo.focus(); } 
            else { inputNuevo.style.display = "none"; inputNuevo.required = false; inputNuevo.value = ""; }
        }
    } else if (tipo === 'marca') {
        const select = document.getElementById('prod-marca');
        const inputNuevo = document.getElementById('nuevo-nombre-marca');
        if (select && inputNuevo) {
            if (select.value === "Nueva") { inputNuevo.style.display = "block"; inputNuevo.required = true; inputNuevo.focus(); } 
            else { inputNuevo.style.display = "none"; inputNuevo.required = false; inputNuevo.value = ""; }
        }
    }
}

function configurarBloqueoCaracteres() {
    const inputsNumericos = ['prod-pcompra', 'prod-pventa', 'prod-stock', 'prod-stock-min'];
    inputsNumericos.forEach(id => {
        const input = document.getElementById(id);
        if(!input) return;
        input.addEventListener('keydown', (e) => {
            if (['e', 'E', '-', '+'].includes(e.key)) e.preventDefault();
        });
        input.addEventListener('input', () => { if(input.value < 0) input.value = 0; });
    });
    
    const sku = document.getElementById('prod-sku');
    if (sku) sku.maxLength = 15;
    const nombre = document.getElementById('prod-nombre');
    if (nombre) nombre.maxLength = 50;
    const desc = document.getElementById('prod-descripcion');
    if (desc) desc.maxLength = 150;
    const prov = document.getElementById('prod-proveedor');
    if (prov) prov.maxLength = 100;
}

function adaptarFormularioGranel() {
    const tVenta = document.getElementById('prod-tventa').value;
    const sku = document.getElementById('prod-sku');
    const marca = document.getElementById('prod-marca');
    const fVenc = document.getElementById('prod-fvencimiento');
    const stock = document.getElementById('prod-stock');
    const stockMin = document.getElementById('prod-stock-min');

    if (!tVenta || !sku || !marca || !fVenc || !stock || !stockMin) return;

    if (tVenta === "Granel") {
        sku.value = "A GRANEL"; sku.disabled = true;
        marca.value = "Generico"; marca.disabled = true;
        fVenc.value = ""; fVenc.disabled = true;
        stock.step = "0.001"; stockMin.step = "0.001";
        stock.placeholder = "Ej. 1.500 (Kilos)"; stock.min = "0.001";
    } else {
        sku.value = ""; sku.disabled = false; marca.disabled = false; fVenc.disabled = false;
        stock.step = "1"; stockMin.step = "1"; stock.placeholder = "0"; stock.min = "1";
    }
}

function calcularMargenGanancia() {
    const pCompra = parseFloat(document.getElementById('prod-pcompra').value) || 0;
    const pVenta = parseFloat(document.getElementById('prod-pventa').value) || 0;
    const lbl = document.getElementById('lbl-margen-calculado');
    if (pCompra <= 0 || pVenta <= 0) { if(lbl) lbl.innerText = "0.00%"; return 0; }
    const porcentaje = ((pVenta / 1.16 - pCompra) / pCompra) * 100;
    if(lbl) lbl.innerText = porcentaje.toFixed(2) + "%";
    return porcentaje;
}

function guardarProducto(event) {
    event.preventDefault();
    const id = document.getElementById('form-id').value;
    const tVenta = document.getElementById('prod-tventa').value;
    const pCompra = parseFloat(document.getElementById('prod-pcompra').value) || 0;
    const pVenta = parseFloat(document.getElementById('prod-pventa').value) || 0;
    const stock = parseFloat(document.getElementById('prod-stock').value) || 0;
    const stockMin = parseFloat(document.getElementById('prod-stock-min').value) || 0;

    if (pVenta < pCompra) { alert("❌ El precio de venta no puede ser menor al de compra."); return; }
    if (pCompra > 99999.99 || pVenta > 99999.99) { alert("❌ El precio tope es de $99,999.99"); return; }
    if (tVenta === "Unidad") {
        if (stock < 1) { alert("❌ El stock mínimo inicial por unidades es 1."); return; }
        if (!Number.isInteger(stock) || !Number.isInteger(stockMin)) { alert("❌ No se permiten decimales en piezas."); return; }
    } else if (stock <= 0) { alert("❌ El stock inicial a granel debe superar los 0 kilos."); return; }
    if (stock > 9999) { alert("❌ Máximo stock permitido: 9,999."); return; }

    const fVencimientoInput = document.getElementById('prod-fvencimiento').value;
    if (tVenta === "Unidad" && fVencimientoInput) {
        if (fVencimientoInput <= new Date().toISOString().split('T')[0]) { alert("❌ La caducidad debe ser posterior a hoy."); return; }
    }

    let categoria = document.getElementById('prod-categoria').value;
    if (categoria === "Nueva") {
        const txt = document.getElementById('nuevo-nombre-categoria').value.trim();
        if (!txt || CATEGORIAS_PREDEFINIDAS.map(c => c.toLowerCase()).includes(txt.toLowerCase())) { alert("❌ Categoría inválida o duplicada."); return; }
        categoria = txt; CATEGORIAS_PREDEFINIDAS.push(categoria);
        localStorage.setItem('cat_categorias', JSON.stringify(CATEGORIAS_PREDEFINIDAS));
    }

    let marca = document.getElementById('prod-marca').value;
    if (marca === "Nueva") {
        const txt = document.getElementById('nuevo-nombre-marca').value.trim();
        if (!txt || MARCAS_PREDEFINIDAS.map(m => m.toLowerCase()).includes(txt.toLowerCase())) { alert("❌ Marca inválida o duplicada."); return; }
        marca = txt; MARCAS_PREDEFINIDAS.push(marca);
        localStorage.setItem('cat_marcas', JSON.stringify(MARCAS_PREDEFINIDAS));
    }

    const sku = document.getElementById('prod-sku').value.trim();
    const nombre = document.getElementById('prod-nombre').value.trim();
    const descripcion = document.getElementById('prod-descripcion').value.trim();
    const proveedor = document.getElementById('prod-proveedor').value.trim();
    const fVencimiento = document.getElementById('prod-fvencimiento').value;
    const estado = document.getElementById('prod-estado').value;
    const margenCalculado = calcularMargenGanancia();

    if(id) {
        const idx = INVENTARIO.findIndex(p => p.id == id);
        if(idx !== -1) INVENTARIO[idx] = { id: parseInt(id), sku, nombre, descripcion, categoria, marca, pCompra, pVenta, margenCalculado, stock, stockMin, proveedor, tVenta, fVencimiento, estado, unidadesVendidas: INVENTARIO[idx].unidadesVendidas || 0 };
    } else {
        INVENTARIO.push({ id: Date.now(), sku, nombre, descripcion, categoria, marca, pCompra, pVenta, margenCalculado, stock, stockMin, proveedor, tVenta, fVencimiento, estado, unidadesVendidas: 0 });
    }

    localStorage.setItem('admintech_db', JSON.stringify(INVENTARIO));
    closeModal('modal-producto');
    inicializarCatalogos();
    revisarCaducidadesAutomaticas();
    renderTablaInventario();
}

function renderTablaInventario() {
    const tbody = document.getElementById('lista-productos-tabla');
    if (!tbody) return;
    tbody.innerHTML = "";
    if(INVENTARIO.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No hay productos registrados.</td></tr>`;
        const countLabel = document.getElementById('total-count-label');
        if(countLabel) countLabel.innerText = 0; 
        return;
    }
    INVENTARIO.forEach(p => {
        let cls = p.estado.toLowerCase() === 'óptimo' ? 'optimo' : (p.estado.toLowerCase() === 'advertencia' ? 'advertencia' : 'critico');
        tbody.innerHTML += `
            <tr>
                <td><strong>${p.sku}</strong></td>
                <td>${p.nombre}</td>
                <td>${p.categoria}</td>
                <td>${p.stock}${p.tVenta === "Granel" ? " kg" : " pzas"}</td>
                <td>$${p.pCompra.toFixed(2)}</td>
                <td>$${p.pVenta.toFixed(2)}</td>
                <td><span class="status-chip ${cls}">${p.estado}</span></td>
                <td>
                    <button class="btn btn-secondary btn-action-tbl" onclick="prepararEdicion(${p.id})">✏️</button>
                    <button class="btn btn-action-tbl" style="background-color:rgba(239,68,68,0.1); color:var(--color-error);" onclick="eliminarProducto(${p.id})">🗑️</button>
                </td>
            </tr>
        `;
    });
    const countLabel = document.getElementById('total-count-label');
    if(countLabel) countLabel.innerText = INVENTARIO.length;
}

// ==========================================================================
// 🔍 SISTEMA DE BÚSQUEDA INTERACTIVA (PUNTO DE VENTA)
// ==========================================================================
function buscarProductoVenta() {
    const query = document.getElementById('venta-buscar-producto').value.toLowerCase().trim();
    const contenedor = document.getElementById('venta-resultados-busqueda');
    
    if (query.length === 0) { contenedor.style.display = 'none'; contenedor.innerHTML = ''; document.getElementById('venta-id-seleccionado').value = ''; return; }

    const coincidencias = INVENTARIO.filter(p => 
        (p.sku.toLowerCase().includes(query) || p.nombre.toLowerCase().includes(query)) && p.estado.toLowerCase() !== 'crítico'
    );

    if (coincidencias.length === 0) { contenedor.innerHTML = `<div class="resultado-item-vacio">No se encontraron productos</div>`; contenedor.style.display = 'block'; return; }

    contenedor.innerHTML = coincidencias.map(p => `
        <div class="resultado-item" onclick="seleccionarProductoParaVenta(${p.id}, '${p.nombre.replace(/'/g, "\\'")}', '${p.sku}')">
            <span class="res-nombre">${p.nombre}</span>
            <span class="res-meta">SKU: ${p.sku} | Stock: ${p.stock}${p.tVenta === "Granel" ? "kg" : "pzas"} | <strong>$${p.pVenta.toFixed(2)}</strong></span>
        </div>
    `).join('');
    contenedor.style.display = 'block';
}

function seleccionarProductoParaVenta(id, nombre, sku) {
    document.getElementById('venta-id-seleccionado').value = id;
    document.getElementById('venta-buscar-producto').value = `${nombre} (${sku})`;
    document.getElementById('venta-resultados-busqueda').style.display = 'none';
    document.getElementById('venta-cantidad').focus();
}

document.addEventListener('click', (e) => {
    const box = document.getElementById('venta-resultados-busqueda');
    if (box && e.target !== document.getElementById('venta-buscar-producto') && !box.contains(e.target)) box.style.display = 'none';
});

// ==========================================================================
// OPERATORIA DEL CARRITO Y COBROS (UNIFICADO CON EL HTML)
// ==========================================================================
function agregarAlCarrito() {
    const idProd = document.getElementById('venta-id-seleccionado').value;
    const inputCant = document.getElementById('venta-cantidad');
    const cantidad = parseFloat(inputCant.value) || 0;

    if (!idProd) { alert("❌ Selecciona un producto usando el buscador."); return; }
    if (cantidad <= 0) { alert("❌ Ingresa una cantidad válida."); return; }

    const producto = INVENTARIO.find(p => p.id == idProd);
    if (!producto) return;

    if (cantidad > producto.stock) { alert(`❌ Stock insuficiente. Solo quedan ${producto.stock} disponibles.`); return; }
    if (producto.tVenta === "Unidad" && !Number.isInteger(cantidad)) { alert("❌ No se permiten decimales para piezas."); return; }

    const item = CARRITO_ACTUAL.find(i => i.id == idProd);
    if (item) {
        if ((item.cantidad + cantidad) > producto.stock) { alert(`❌ Supera el stock.`); return; }
        item.cantidad += cantidad; item.subtotal = item.cantidad * producto.pVenta;
    } else {
        CARRITO_ACTUAL.push({ id: producto.id, nombre: producto.nombre, precio: producto.pVenta, cantidad: cantidad, subtotal: cantidad * producto.pVenta, tVenta: producto.tVenta });
    }

    inputCant.value = "1";
    document.getElementById('venta-buscar-producto').value = "";
    document.getElementById('venta-id-seleccionado').value = "";
    renderCarritoVentas();
}

function renderCarritoVentas() {
    // CORREGIDO: Buscamos el ID exacto de tu appfinal.html
    const tbody = document.getElementById('cuerpo-tabla-carrito-ventas');
    const lblTotal = document.getElementById('venta-total-pago');
    if (!tbody || !lblTotal) return;
    tbody.innerHTML = "";
    let total = 0;

    if (CARRITO_ACTUAL.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">El carrito está vacío.</td></tr>`; 
        lblTotal.innerText = "$0.00"; 
        return; 
    }
    CARRITO_ACTUAL.forEach((item, idx) => {
        total += item.subtotal;
        tbody.innerHTML += `<tr><td><strong>${item.nombre}</strong></td><td>$${item.precio.toFixed(2)}</td><td>${item.cantidad}${item.tVenta === "Granel" ? " kg" : " pzas"}</td><td>$${item.subtotal.toFixed(2)}</td><td><button class="btn-delete-cart" onclick="eliminarDelCarrito(${idx})">🗑️</button></td></tr>`;
    });
    lblTotal.innerText = `$${total.toFixed(2)}`;
}

function eliminarDelCarrito(idx) { CARRITO_ACTUAL.splice(idx, 1); renderCarritoVentas(); }
function cancelarVentaActual() { if(CARRITO_ACTUAL.length > 0 && confirm("¿Vaciar carrito?")) { CARRITO_ACTUAL = []; renderCarritoVentas(); } }

function procesarVentaFinal() {
    if (CARRITO_ACTUAL.length === 0) return;
    
    CARRITO_ACTUAL.forEach(item => {
        const prod = INVENTARIO.find(p => p.id == item.id);
        if (prod) {
            prod.stock = parseFloat((prod.stock - item.cantidad).toFixed(3));
            
            if (!prod.unidadesVendidas) {
                prod.unidadesVendidas = 0;
            }
            prod.unidadesVendidas += item.cantidad;

            if (prod.stock === 0) prod.estado = "Crítico";
            else if (prod.stock <= prod.stockMin) prod.estado = "Advertencia";
        }
    });

    localStorage.setItem('admintech_db', JSON.stringify(INVENTARIO));

    try {
        if (typeof cargarModuloGanancias === "function") {
            cargarModuloGanancias();
        }
    } catch (error) {
        console.warn("Llamado analítico en espera:", error);
    }

    alert("💵 ¡Venta procesada con éxito!");

    CARRITO_ACTUAL = []; 
    renderCarritoVentas(); // Esto limpia de forma 100% segura la tabla del carrito
    renderTablaInventario(); // Refresca las unidades en Almacén
}

// MODALES OPERACIONES 
function openModal(id) {
    const m = document.getElementById(id); if (!m) return; m.classList.add('show');
    if(id === 'modal-producto') {
        const inputF = document.getElementById('prod-fvencimiento');
        if (inputF) { const h = new Date(); h.setDate(h.getDate() + 1); inputF.min = h.toISOString().split('T')[0]; }
        if(!document.getElementById('form-id').value) { document.getElementById('modal-titulo').innerText = "Registrar Nuevo Producto"; document.getElementById('form-producto').reset(); document.getElementById('lbl-margen-calculado').innerText = "0.00%"; adaptarFormularioGranel(); }
    }
}
function closeModal(id) { const m = document.getElementById(id); if (!m) return; m.classList.remove('show'); document.getElementById('form-producto').reset(); document.getElementById('form-id').value = ""; if(document.getElementById('nuevo-nombre-categoria')) document.getElementById('nuevo-nombre-categoria').style.display = "none"; if(document.getElementById('nuevo-nombre-marca')) document.getElementById('nuevo-nombre-marca').style.display = "none"; }

function prepararEdicion(id) {
    const p = INVENTARIO.find(prod => prod.id == id); if(!p) return;
    document.getElementById('form-id').value = p.id;
    document.getElementById('prod-tventa').value = p.tVenta;
    adaptarFormularioGranel();
    document.getElementById('prod-sku').value = p.sku; document.getElementById('prod-nombre').value = p.nombre; document.getElementById('prod-descripcion').value = p.descripcion;
    document.getElementById('prod-categoria').value = p.categoria; document.getElementById('prod-marca').value = p.marca; document.getElementById('prod-pcompra').value = p.pCompra;
    document.getElementById('prod-pventa').value = p.pVenta; document.getElementById('prod-stock').value = p.stock; document.getElementById('prod-stock-min').value = p.stockMin; document.getElementById('prod-proveedor').value = p.proveedor;
    if(p.fVencimiento) { document.getElementById('prod-fvencimiento').min = p.fVencimiento; document.getElementById('prod-fvencimiento').value = p.fVencimiento; }
    document.getElementById('prod-estado').value = p.estado; calcularMargenGanancia();
    document.getElementById('modal-titulo').innerText = "Modificar Producto"; openModal('modal-producto');
}

function eliminarProducto(id) { if(confirm("¿Deseas eliminar este artículo?")) { INVENTARIO = INVENTARIO.filter(p => p.id != id); localStorage.setItem('admintech_db', JSON.stringify(INVENTARIO)); renderTablaInventario(); } }
function filtrarProductos() { const q = document.getElementById('txt-buscar').value.toLowerCase(); document.querySelectorAll('#lista-productos-tabla tr').forEach(f => { const s = f.children[0]?.innerText.toLowerCase() || ""; const n = f.children[1]?.innerText.toLowerCase() || ""; f.style.display = (s.includes(q) || n.includes(q)) ? "" : "none"; }); }

function revisarCaducidadesAutomaticas() {
    const hoy = new Date().toISOString().split('T')[0]; let chg = false;
    const lst = document.getElementById('notif-list'); if (!lst) return; lst.innerHTML = "";
    INVENTARIO.forEach(p => {
        if(p.tVenta !== "Granel" && p.fVencimiento && p.fVencimiento <= hoy && p.stock > 0) {
            const loss = p.stock * p.pCompra; CONTEXTO_FINANCIERO.perdidas_caducidad += loss;
            lst.innerHTML += `<div class="notif-item critical"><div><strong>❌ Caducado: ${p.nombre}</strong><p>Purga automática: ${p.stock} pzas. Pérdida: $${loss.toFixed(2)}</p></div><button class="close-notif" onclick="removeNotification(this)">×</button></div>`;
            p.stock = 0; p.estado = "Crítico"; chg = true;
        } else if (p.stock <= p.stockMin && p.stock > 0) {
            lst.innerHTML += `<div class="notif-item warning"><div><strong>⚠️ Stock Bajo: ${p.nombre}</strong><p>Quedan ${p.stock} disp. (Mín: ${p.stockMin})</p></div><button class="close-notif" onclick="removeNotification(this)">×</button></div>`;
        }
    });
    if(chg) { localStorage.setItem('admintech_db', JSON.stringify(INVENTARIO)); localStorage.setItem('admintech_finance', JSON.stringify(CONTEXTO_FINANCIERO)); }
    const tot = lst.children.length; const b = document.getElementById('notif-badge'); if(b) { b.innerText = tot; b.style.display = tot > 0 ? 'block' : 'none'; }
}

// ==========================================================================
// FASE 3: SISTEMA DE AUTENTICACIÓN LOCAL
// ==========================================================================
if (!localStorage.getItem('user_session_password')) {
    localStorage.setItem('user_session_password', '1234');
}

let sesionAdminActiva = false;
let vistaPendientePorDesbloquear = '';

function solicitarAccesoVista(idVista) {
    const vistasProtegidas = ['view-ganancias', 'view-productos'];

    if (vistasProtegidas.includes(idVista) && !sesionAdminActiva) {
        vistaPendientePorDesbloquear = idVista;
        openModal('modal-password');
        
        setTimeout(() => {
            const inputPass = document.getElementById('txt-modal-password');
            if(inputPass) inputPass.focus();
        }, 50);
    } else {
        ejecutarCambioVista(idVista);
    }
    const barraNotificaciones = document.querySelector('.notification-bar');
if (barraNotificaciones) {
    if (idVista === 'view-inventario') {
        // Si entras a inventario, se muestra exactamente en su posición original
        barraNotificaciones.style.display = 'block'; 
    } else {
        // Si cambias a cualquier otro módulo, se oculta por completo sin romper el CSS
        barraNotificaciones.style.display = 'none'; 
    }
}
}

function ejecutarCambioVista(idVista) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    
    const vista = document.getElementById(idVista);
    if(vista) vista.classList.add('active');
    
    let linkId = 'lnk-inventario';
    if(idVista === 'view-ventas') linkId = 'lnk-ventas';
    if(idVista === 'view-productos') linkId = 'lnk-productos';
    if(idVista === 'view-ganancias') linkId = 'lnk-ganancias';
    if(idVista === 'view-configuracion') linkId = 'lnk-configuracion';
    
    const enlace = document.getElementById(linkId);
    if(enlace) enlace.classList.add('active');

    const panel = document.getElementById('notif-panel');
    if(panel) panel.classList.remove('show');
    
    if(idVista === 'view-productos') {
        cargarSelectProductosDetalle();
    }
    
    // 🚨 CORRECCIÓN LOGÍSTICA PARA LAS GRÁFICAS:
    // Esperamos 100ms a que el CSS renderice la vista en pantalla antes de activar Chart.js
    if (idVista === 'view-ganancias') {
        setTimeout(() => {
            cargarModuloGanancias();
        }, 100);
    }
}
function validarPasswordAdmin(event) {
    event.preventDefault();
    const inputPass = document.getElementById('txt-modal-password');
    const passIntroducida = inputPass.value;
    const passCorrecta = localStorage.getItem('user_session_password');

    if (passIntroducida === passCorrecta) {
        sesionAdminActiva = true; 
        closeModal('modal-password');
        inputPass.value = ''; 
        
        if (vistaPendientePorDesbloquear) {
            ejecutarCambioVista(vistaPendientePorDesbloquear);
            vistaPendientePorDesbloquear = '';
        }
    } else {
        alert("❌ Contraseña incorrecta. (Usa '1234' para desarrollo)");
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
    alert("🔒 Acceso cerrado. Los módulos administrativos se han bloqueado con éxito.");
    ejecutarCambioVista('view-ventas'); 
}