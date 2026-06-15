-- Esquema de la base de datos para ADMINISTRATECH
-- Cada tabla de negocio se asocia a un usuario mediante usuario_id,
-- de modo que el inventario, ventas, categorias y marcas quedan
-- separados por cuenta.

CREATE DATABASE IF NOT EXISTS administratech
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE administratech;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    pvpasword VARCHAR(255) NOT NULL DEFAULT '',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(120) NOT NULL,
    marca VARCHAR(120) NOT NULL,
    pCompra DECIMAL(12,2) NOT NULL DEFAULT 0,
    pVenta DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    stockMin DECIMAL(12,2) NOT NULL DEFAULT 0,
    proveedor VARCHAR(200) DEFAULT '',
    tVenta VARCHAR(40) NOT NULL DEFAULT 'Unidad',
    fVencimiento DATE NULL,
    estado VARCHAR(40) NOT NULL DEFAULT 'Óptimo',
    unidadesVendidas INT NOT NULL DEFAULT 0,
    usuario_id INT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_productos_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY uq_producto_sku_usuario (usuario_id, sku)
);

CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    usuario_id INT NOT NULL,
    CONSTRAINT fk_categorias_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY uq_categoria_usuario (usuario_id, nombre)
);

CREATE TABLE IF NOT EXISTS marcas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    usuario_id INT NOT NULL,
    CONSTRAINT fk_marcas_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY uq_marca_usuario (usuario_id, nombre)
);

CREATE TABLE IF NOT EXISTS ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    detalles JSON NOT NULL,
    vendedor VARCHAR(150) DEFAULT 'Desconocido',
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_id INT NOT NULL,
    CONSTRAINT fk_ventas_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE
);
