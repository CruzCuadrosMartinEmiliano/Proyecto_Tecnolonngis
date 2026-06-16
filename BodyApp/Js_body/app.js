// ==========================================================================
// CONTROLADOR PRINCIPAL DE LA APLICACION (ADMINISTRATECH)
// --------------------------------------------------------------------------
// Toda la informacion (inventario, categorias, marcas y ventas) se obtiene
// y se guarda en la base de datos por medio de las APIs protegidas por sesion,
// de modo que cada cuenta solo ve y modifica sus propios datos.
// ==========================================================================

// Estado en memoria (se sincroniza siempre desde el backend del usuario activo)
let INVENTARIO = [];
let CATEGORIAS = [];
let MARCAS = [];
let carritoVenta = [];

// Estado de los modulos protegidos y de las graficas (lo usa ui.js)
let sesionAdminActiva = false;
let vistaPendientePorDesbloquear = '';
let periodoActualGanancias = 'semanal';
let miGraficaLinea = null;
let miGraficaTorta = null;

// Vistas que requieren la contrasena privada (solo si el usuario configuro una)
const VISTAS_PROTEGIDAS = ['view-productos', 'view-ganancias'];

// --------------------------------------------------------------------------
// HELPERS DE API
// --------------------------------------------------------------------------
async function apiRequest(url, options = {}) {
    const config = Object.assign({ credentials: 'include' }, options);
    if (config.body && typeof config.body !== 'string') {
        config.headers = Object.assign({ 'Content-Type': 'application/json' }, config.headers || {});
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);

    if (response.status === 401) {
        // La sesion del servidor expiro: limpiamos y mandamos al login
        localStorage.removeItem('admintech_sesion');
        window.location.href = '../Inicio_Sesion/inicio_sesion.html';
        throw new Error('Sesión no activa.');
    }

    let data = null;
    try { data = await response.json(); } catch (e) { data = null; }

    if (!response.ok) {
        const mensaje = (data && data.message) ? data.message : 'Error en la petición.';
        throw new Error(mensaje);
    }
    return data;
}

// --------------------------------------------------------------------------
// MENSAJES Y MODALES (usados por el HTML y por ui.js)
// --------------------------------------------------------------------------
function mostrarMensajeApp(id, texto, tipo = 'error') {
    const elemento = document.getElementById(id);
    if (!elemento) return;
    elemento.innerText = texto;
    elemento.classList.remove('error', 'success', 'info');
    elemento.classList.add('form-message', tipo);
    elemento.style.display = 'block';
}

function ocultarMensajeApp(id) {
    const elemento = document.getElementById(id);
    if (!elemento) return;
    elemento.innerText = '';
    elemento.style.display = 'none';
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('show');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
}

// --------------------------------------------------------------------------
// CAMBIO DE VISTAS / SECCIONES
// --------------------------------------------------------------------------
function obtenerPasswordPrivada() {
    const sesion = JSON.parse(localStorage.getItem('admintech_sesion')) || null;
    return (sesion && sesion.pvpasword != null) ? sesion.pvpasword.toString().trim() : '';
}

function solicitarAccesoVista(vista) {
    const requierePassword = VISTAS_PROTEGIDAS.includes(vista) &&
        obtenerPasswordPrivada() !== '' &&
        !sesionAdminActiva;

    if (requierePassword) {
        vistaPendientePorDesbloquear = vista;
        openModal('modal-password');
        return;
    }

    ejecutarCambioVista(vista);
}

function ejecutarCambioVista(vista) {
    document.querySelectorAll('.app-view').forEach(seccion => {
        seccion.classList.remove('active');
    });
    const seccionDestino = document.getElementById(vista);
    if (seccionDestino) seccionDestino.classList.add('active');

    // Resaltamos el enlace activo del menu lateral
    document.querySelectorAll('.sidebar-menu a').forEach(link => link.classList.remove('active'));
    const idLink = 'lnk-' + vista.replace('view-', '');
    const linkActivo = document.getElementById(idLink);
    if (linkActivo) linkActivo.classList.add('active');

    // Cargamos la informacion propia de cada vista
    if (vista === 'view-inventario') {
        renderizarTablaInventario();
    } else if (vista === 'view-productos') {
        if (typeof cargarSelectProductosDetalle === 'function') cargarSelectProductosDetalle();
    } else if (vista === 'view-ganancias') {
        if (typeof cargarModuloGanancias === 'function') cargarModuloGanancias();
    } else if (vista === 'view-configuracion') {
        if (typeof actualizarSesionUI === 'function') actualizarSesionUI();
    }
}

// --------------------------------------------------------------------------
// CARGA INICIAL DE DATOS DESDE EL BACKEND (POR USUARIO)
// --------------------------------------------------------------------------
function calcularMargen(pCompra, pVenta) {
    const compra = parseFloat(pCompra) || 0;
    const venta = parseFloat(pVenta) || 0;
    if (venta <= 0) return 0;
    const ventaSinIVA = venta / 1.16; // descontamos el IVA del 16%
    if (ventaSinIVA <= 0) return 0;
    return ((ventaSinIVA - compra) / ventaSinIVA) * 100;
}

function normalizarProducto(p) {
    return Object.assign({}, p, {
        pCompra: parseFloat(p.pCompra) || 0,
        pVenta: parseFloat(p.pVenta) || 0,
        stock: parseFloat(p.stock) || 0,
        stockMin: parseFloat(p.stockMin) || 0,
        unidadesVendidas: parseInt(p.unidadesVendidas || 0, 10),
        margenCalculado: calcularMargen(p.pCompra, p.pVenta)
    });
}

async function cargarInventario() {
    const data = await apiRequest('/api/productos');
    INVENTARIO = (data.data || []).map(normalizarProducto);
}

async function cargarCatalogos() {
    const [cat, mar] = await Promise.all([
        apiRequest('/api/categorias'),
        apiRequest('/api/marcas')
    ]);
    CATEGORIAS = cat.data || [];
    MARCAS = mar.data || [];
    cargarSelectsCatalogos();
}

async function recargarDatos() {
    await cargarInventario();
    renderizarTablaInventario();
    if (typeof actualizarAlertasSistema === 'function') {
        actualizarAlertasSistema();
    }
    const vistaActiva = document.querySelector('.app-view.active');
    if (vistaActiva && vistaActiva.id === 'view-productos' && typeof cargarSelectProductosDetalle === 'function') {
        cargarSelectProductosDetalle();
    }
    if (vistaActiva && vistaActiva.id === 'view-ganancias' && typeof cargarModuloGanancias === 'function') {
        cargarModuloGanancias();
    }
}

// --------------------------------------------------------------------------
// INVENTARIO: TABLA Y BUSQUEDA
// --------------------------------------------------------------------------
function badgeEstado(estado) {
    const clase = estado === 'Crítico' ? 'critico' : (estado === 'Advertencia' ? 'advertencia' : 'optimo');
    return `<span class="status-chip ${clase}">${estado}</span>`;
}

function renderizarTablaInventario(lista) {
    const tbody = document.getElementById('lista-productos-tabla');
    const contador = document.getElementById('total-count-label');
    const datos = lista || INVENTARIO;

    if (contador) contador.innerText = INVENTARIO.length;
    if (!tbody) return;

    if (datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No hay productos registrados todavía.</td></tr>';
        return;
    }

    tbody.innerHTML = datos.map(p => {
        const unidad = p.tVenta === 'Granel' ? 'kg' : 'pzas';
        const alerta = p.stock <= p.stockMin ? ' style="color:#ef4444; font-weight:700;"' : '';
    let estadoReal = 'Óptimo';
        if (p.stock === 0) {
            estadoReal = 'Crítico';
        } else if (p.stock <= p.stockMin) {
            estadoReal = 'Advertencia';
        }

        return `
        <tr>
            <td>${p.sku}</td>
            <td>${p.nombre}</td>
            <td>${p.categoria}</td>
            <td${alerta}>${p.stock} ${unidad}</td>
            <td>$${p.pCompra.toFixed(2)}</td>
            <td>$${p.pVenta.toFixed(2)}</td>
            <td>${badgeEstado(estadoReal)}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editarProducto(${p.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="eliminarProductoDeInventario(${p.id})">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

function filtrarProductos() {
    const input = document.getElementById('txt-buscar');
    const query = (input ? input.value : '').trim().toLowerCase();
    if (!query) {
        renderizarTablaInventario();
        return;
    }
    const filtrados = INVENTARIO.filter(p =>
        p.nombre.toLowerCase().includes(query) || (p.sku || '').toLowerCase().includes(query)
    );
    renderizarTablaInventario(filtrados);
}

// --------------------------------------------------------------------------
// CATALOGOS (CATEGORIAS Y MARCAS) EN EL FORMULARIO DE PRODUCTO
// --------------------------------------------------------------------------
function cargarSelectsCatalogos() {
    const selCat = document.getElementById('prod-categoria');
    const selMar = document.getElementById('prod-marca');

    if (selCat) {
        selCat.innerHTML = CATEGORIAS.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('') +
            '<option value="__nueva__">➕ Nueva categoría...</option>';
    }
    if (selMar) {
        selMar.innerHTML = MARCAS.map(m => `<option value="${m.nombre}">${m.nombre}</option>`).join('') +
            '<option value="__nueva__">➕ Nueva marca...</option>';
    }
}

function verificarNuevoRegistro(tipo) {
    const select = document.getElementById(tipo === 'categoria' ? 'prod-categoria' : 'prod-marca');
    const input = document.getElementById(tipo === 'categoria' ? 'nuevo-nombre-categoria' : 'nuevo-nombre-marca');
    if (!select || !input) return;
    input.style.display = select.value === '__nueva__' ? 'block' : 'none';
}

function calcularMargenGanancia() {
    const pCompra = parseFloat(document.getElementById('prod-pcompra').value) || 0;
    const pVenta = parseFloat(document.getElementById('prod-pventa').value) || 0;
    const lbl = document.getElementById('lbl-margen-calculado');
    if (lbl) lbl.innerText = calcularMargen(pCompra, pVenta).toFixed(2) + '%';
}

async function resolverCatalogo(tipo) {
    // Devuelve el nombre final de la categoria/marca, creandola si es nueva
    const select = document.getElementById(tipo === 'categoria' ? 'prod-categoria' : 'prod-marca');
    const input = document.getElementById(tipo === 'categoria' ? 'nuevo-nombre-categoria' : 'nuevo-nombre-marca');
    if (!select) return '';

    if (select.value === '__nueva__') {
        const nombre = (input ? input.value : '').trim();
        if (!nombre) throw new Error(`Escribe el nombre de la nueva ${tipo}.`);
        await apiRequest(tipo === 'categoria' ? '/api/categorias' : '/api/marcas', {
            method: 'POST',
            body: { nombre }
        });
        return nombre;
    }
    return select.value;
}

// --------------------------------------------------------------------------
// PRODUCTOS: CREAR / EDITAR / ELIMINAR
// --------------------------------------------------------------------------
function abrirModalNuevoProducto() {
    document.getElementById('form-producto').reset();
    document.getElementById('form-id').value = '';
    document.getElementById('modal-titulo').innerText = 'Registrar Nuevo Producto';
    cargarSelectsCatalogos();
    verificarNuevoRegistro('categoria');
    verificarNuevoRegistro('marca');
    calcularMargenGanancia();
    ocultarMensajeApp('prod-form-message');
    openModal('modal-producto');
}

async function guardarProducto(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    ocultarMensajeApp('prod-form-message');

    try {
        const categoria = await resolverCatalogo('categoria');
        const marca = await resolverCatalogo('marca');

        // Captura y limpieza de valores
        const sku = document.getElementById('prod-sku').value.trim();
        const nombre = document.getElementById('prod-nombre').value.trim();
        const descripcion = document.getElementById('prod-descripcion').value.trim();
        const pCompra = parseFloat(document.getElementById('prod-pcompra').value) || 0;
        const pVenta = parseFloat(document.getElementById('prod-pventa').value) || 0;
        const stock = parseFloat(document.getElementById('prod-stock').value) || 0;
        const stockMin = parseFloat(document.getElementById('prod-stock-min').value) || 0;
        const proveedor = document.getElementById('prod-proveedor').value.trim();
        const tVenta = document.getElementById('prod-tventa').value;
        const fVencimiento = document.getElementById('prod-fvencimiento').value || null;
        const estado = document.getElementById('prod-estado').value;

        // 1. Validaciones de campos obligatorios
        if (!sku || !nombre || !categoria || !marca) {
            mostrarMensajeApp('prod-form-message', 'SKU, nombre, categoría y marca son obligatorios.', 'error');
            return;
        }

        // 2. Validaciones numéricas (Valores negativos)
        if (pCompra < 0 || pVenta < 0 || stock < 0 || stockMin < 0) {
            mostrarMensajeApp('prod-form-message', 'Los precios y cantidades de stock no pueden ser negativos.', 'error');
            return;
        }

        // 3. Validación de Margen de Ganancia
        if (pVenta <= pCompra) {
            mostrarMensajeApp('prod-form-message', 'El precio de venta debe ser mayor al precio de compra para generar ganancias.', 'error');
            return;
        }

        // 4. Validación lógica de Stock Mínimo
        if (stockMin > stock) {
            mostrarMensajeApp('prod-form-message', 'El stock mínimo no puede ser mayor que el stock actual del producto.', 'error');
            return;
        }

        // 5. Validación de fecha de vencimiento
        if (fVencimiento) {
            const fechaSeleccionada = new Date(fVencimiento);
            const fechaActual = new Date();
            // Normalizar horas para comparar solo año-mes-día
            fechaActual.setHours(0, 0, 0, 0);
            fechaSeleccionada.setHours(0, 0, 0, 0);

            if (fechaSeleccionada < fechaActual) {
                mostrarMensajeApp('prod-form-message', 'La fecha de vencimiento no puede ser una fecha pasada.', 'error');
                return;
            }
        }

        // Construcción del Payload validado
        const payload = {
            sku, nombre, descripcion, categoria, marca,
            pCompra, pVenta, stock, stockMin,
            proveedor, tVenta, fVencimiento, estado
        };

        const id = document.getElementById('form-id').value;
        if (id) {
            await apiRequest(`/api/productos/${id}`, { method: 'PUT', body: payload });
        } else {
            await apiRequest('/api/productos', { method: 'POST', body: payload });
        }

        await cargarCatalogos();
        await recargarDatos();
        closeModal('modal-producto');
        mostrarMensajeApp('app-global-message', 'Producto guardado correctamente.', 'success');
    } catch (error) {
        mostrarMensajeApp('prod-form-message', error.message, 'error');
    }
}

function editarProducto(id) {
    const p = INVENTARIO.find(prod => prod.id == id);
    if (!p) return;

    cargarSelectsCatalogos();
    document.getElementById('form-id').value = p.id;
    document.getElementById('modal-titulo').innerText = 'Editar Producto';
    document.getElementById('prod-tventa').value = p.tVenta || 'Unidad';
    document.getElementById('prod-sku').value = p.sku || '';
    document.getElementById('prod-nombre').value = p.nombre || '';
    document.getElementById('prod-categoria').value = p.categoria || '';
    document.getElementById('prod-marca').value = p.marca || '';
    document.getElementById('prod-pcompra').value = p.pCompra;
    document.getElementById('prod-pventa').value = p.pVenta;
    document.getElementById('prod-stock').value = p.stock;
    document.getElementById('prod-stock-min').value = p.stockMin;
    document.getElementById('prod-proveedor').value = p.proveedor || '';
    document.getElementById('prod-fvencimiento').value = p.fVencimiento ? String(p.fVencimiento).substring(0, 10) : '';
    document.getElementById('prod-estado').value = p.estado || 'Óptimo';
    document.getElementById('prod-descripcion').value = p.descripcion || '';
    verificarNuevoRegistro('categoria');
    verificarNuevoRegistro('marca');
    calcularMargenGanancia();
    ocultarMensajeApp('prod-form-message');
    openModal('modal-producto');
}

async function eliminarProductoDeInventario(id) {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
    try {
        await apiRequest(`/api/productos/${id}`, { method: 'DELETE' });
        await recargarDatos();
        mostrarMensajeApp('app-global-message', 'Producto eliminado correctamente.', 'info');
    } catch (error) {
        mostrarMensajeApp('app-global-message', error.message, 'error');
    }
}

// --------------------------------------------------------------------------
// PUNTO DE VENTA (CARRITO)
// --------------------------------------------------------------------------
function buscarProductoVenta() {
    const input = document.getElementById('venta-buscar-producto');
    const dropdown = document.getElementById('venta-resultados-busqueda');
    const query = (input ? input.value : '').trim().toLowerCase();

    if (!query) {
        dropdown.style.display = 'none';
        return;
    }

    const coincidencias = INVENTARIO.filter(p =>
        p.nombre.toLowerCase().includes(query) || (p.sku || '').toLowerCase().includes(query)
    );

    if (coincidencias.length === 0) {
        dropdown.innerHTML = '<div style="padding:0.75rem; color:var(--text-muted); font-size:0.9rem;">Sin coincidencias...</div>';
        dropdown.style.display = 'block';
        return;
    }

    dropdown.innerHTML = coincidencias.map(p => `
        <div class="dropdown-item-row" onclick="seleccionarProductoVenta(${p.id})" style="padding:0.6rem 0.8rem; cursor:pointer; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between;">
            <span style="color:#fff;">${p.nombre} <small style="color:var(--text-muted);">(${p.sku})</small></span>
            <span style="color:var(--text-muted);">Stock: ${p.stock}</span>
        </div>`).join('');
    dropdown.style.display = 'block';
}

function seleccionarProductoVenta(id) {
    const p = INVENTARIO.find(prod => prod.id == id);
    if (!p) return;
    document.getElementById('venta-id-seleccionado').value = p.id;
    document.getElementById('venta-buscar-producto').value = `${p.nombre} (${p.sku})`;
    document.getElementById('venta-resultados-busqueda').style.display = 'none';
}

function agregarAlCarrito() {
    const id = document.getElementById('venta-id-seleccionado').value;
    const cantidad = parseFloat(document.getElementById('venta-cantidad').value) || 0;
    ocultarMensajeApp('venta-form-message');

    if (!id) {
        mostrarMensajeApp('venta-form-message', 'Selecciona un producto primero.', 'error');
        return;
    }
    if (cantidad <= 0) {
        mostrarMensajeApp('venta-form-message', 'La cantidad debe ser mayor a cero.', 'error');
        return;
    }

    const p = INVENTARIO.find(prod => prod.id == id);
    if (!p) return;

    const enCarrito = carritoVenta.find(item => item.id == id);
    const cantidadPrevia = enCarrito ? enCarrito.cantidad : 0;
    if (cantidad + cantidadPrevia > p.stock) {
        mostrarMensajeApp('venta-form-message', `Stock insuficiente. Disponible: ${p.stock}.`, 'error');
        return;
    }

    if (enCarrito) {
        enCarrito.cantidad += cantidad;
    } else {
        carritoVenta.push({ id: p.id, nombre: p.nombre, sku: p.sku, pVenta: p.pVenta, cantidad });
    }

    document.getElementById('venta-buscar-producto').value = '';
    document.getElementById('venta-id-seleccionado').value = '';
    document.getElementById('venta-cantidad').value = 1;
    renderCarrito();
}

function renderCarrito() {
    const tbody = document.getElementById('cuerpo-tabla-carrito-ventas');
    const totalLabel = document.getElementById('venta-total-pago');
    if (!tbody) return;

    if (carritoVenta.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:1.2rem;">Carrito vacío.</td></tr>';
        if (totalLabel) totalLabel.innerText = '$0.00';
        return;
    }

    let total = 0;
    tbody.innerHTML = carritoVenta.map((item, idx) => {
        const subtotal = item.pVenta * item.cantidad;
        total += subtotal;
        return `
        <tr>
            <td>${item.nombre} <small style="color:var(--text-muted);">(${item.sku})</small></td>
            <td>$${item.pVenta.toFixed(2)}</td>
            <td>${item.cantidad}</td>
            <td>$${subtotal.toFixed(2)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="quitarDelCarrito(${idx})">✖</button></td>
        </tr>`;
    }).join('');

    if (totalLabel) totalLabel.innerText = `$${total.toFixed(2)}`;
}

function quitarDelCarrito(idx) {
    carritoVenta.splice(idx, 1);
    renderCarrito();
}

function cancelarVentaActual() {
    carritoVenta = [];
    renderCarrito();
    ocultarMensajeApp('venta-form-message');
}

async function procesarVentaFinal() {
    ocultarMensajeApp('venta-form-message');
    if (carritoVenta.length === 0) {
        mostrarMensajeApp('venta-form-message', 'El carrito está vacío.', 'error');
        return;
    }

    const total = carritoVenta.reduce((acc, item) => acc + item.pVenta * item.cantidad, 0);
    const sesion = JSON.parse(localStorage.getItem('admintech_sesion')) || {};

    try {
        await apiRequest('/api/ventas', {
            method: 'POST',
            body: {
                total,
                detalles: carritoVenta,
                vendedor: sesion.username || sesion.email || 'Desconocido',
                fecha: new Date().toISOString().slice(0, 19).replace('T', ' ')
            }
        });

        // Actualizamos stock y unidades vendidas de cada producto del carrito
        for (const item of carritoVenta) {
            const p = INVENTARIO.find(prod => prod.id == item.id);
            if (!p) continue;
            await apiRequest(`/api/productos/${item.id}`, {
                method: 'PUT',
                body: {
                    stock: p.stock - item.cantidad,
                    unidadesVendidas: (p.unidadesVendidas || 0) + item.cantidad
                }
            });
        }

        carritoVenta = [];
        renderCarrito();
        await recargarDatos();
        mostrarMensajeApp('venta-form-message', `Venta cobrada por $${total.toFixed(2)}.`, 'success');
    } catch (error) {
        mostrarMensajeApp('venta-form-message', error.message, 'error');
    }
}

// --------------------------------------------------------------------------
// INICIALIZACION
// --------------------------------------------------------------------------
async function iniciarAplicacion() {
    try {
        // Validamos la sesion real contra el servidor (fuente de verdad)
        const data = await apiRequest('/api/auth/me');
        if (data && data.usuario) {
            localStorage.setItem('admintech_sesion', JSON.stringify(data.usuario));
            if (typeof actualizarSesionUI === 'function') actualizarSesionUI();
        }

        await cargarCatalogos();
        await cargarInventario();
        renderizarTablaInventario();
        renderCarrito();
        if (typeof actualizarAlertasSistema === 'function') {
            actualizarAlertasSistema();
        }
    } catch (error) {
        // apiRequest ya redirige al login en caso de 401
        console.error('No se pudo inicializar la aplicación:', error.message);
    }
}

document.addEventListener('DOMContentLoaded', iniciarAplicacion);

// Ejecutar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Bloquear la letra 'e', 'E', '+' y '-' en los campos numéricos de productos
    const inputsNumericos = ['prod-pcompra', 'prod-pventa', 'prod-stock', 'prod-stock-min'];
    
    inputsNumericos.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keydown', (event) => {
                // Si presionan 'e', 'E', '+' o '-', cancelamos la acción
                if (['e', 'E', '+', '-'].includes(event.key)) {
                    event.preventDefault();
                }
            });
        }
    });

    // 2. Alerta visual o control de límite de SKU en el frontend (Opcional)
    const skuInput = document.getElementById('prod-sku');
    if (skuInput) {
        // Le asignamos un límite físico en el formulario por si tu BD solo aguanta 15
        skuInput.setAttribute('maxlength', '15'); 
    }
});
