import { Router } from 'express';
import { productoController } from '../../../../container.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();
const adminRoles = authorizeRoles('Administrador', 'Administrador General', 'Dueño', 'SuperAdmin');

// ============================================================================
// 1. CATEGORÍAS (TIPOS DE PLATO)
// ============================================================================
// GET /api/productos/categorias
router.get('/categorias', authenticateToken, productoController.getCategorias.bind(productoController));

// POST /api/productos/categorias (Crear tipo de plato / categoría)
router.post('/categorias', authenticateToken, adminRoles, productoController.crearCategoria.bind(productoController));

// PUT /api/productos/categorias/:id (Actualizar categoría)
router.put('/categorias/:id', authenticateToken, adminRoles, productoController.actualizarCategoria.bind(productoController));

// PATCH /api/productos/categorias/:id/toggle-activo (Ocultar/Mostrar categoría)
router.patch('/categorias/:id/toggle-activo', authenticateToken, adminRoles, productoController.toggleActivoCategoria.bind(productoController));


// ============================================================================
// 2. PROMOCIONES Y COMBOS
// ============================================================================
// GET /api/productos/promociones
router.get('/promociones', authenticateToken, productoController.getPromociones.bind(productoController));

// GET /api/productos/promociones/:id
router.get('/promociones/:id', authenticateToken, productoController.getPromocionById.bind(productoController));

// POST /api/productos/promociones (Crear promoción)
router.post('/promociones', authenticateToken, adminRoles, productoController.crearPromocion.bind(productoController));

// PUT /api/productos/promociones/:id (Actualizar promoción)
router.put('/promociones/:id', authenticateToken, adminRoles, productoController.actualizarPromocion.bind(productoController));

// PATCH /api/productos/promociones/:id/toggle-activo (Ocultar/Mostrar promoción)
router.patch('/promociones/:id/toggle-activo', authenticateToken, adminRoles, productoController.toggleActivoPromocion.bind(productoController));

// DELETE /api/productos/promociones/:id (Eliminar promoción)
router.delete('/promociones/:id', authenticateToken, adminRoles, productoController.eliminarPromocion.bind(productoController));


// ============================================================================
// 3. INSUMOS / INGREDIENTES
// ============================================================================
// GET /api/productos/insumos
router.get('/insumos', authenticateToken, productoController.getInsumos.bind(productoController));

// POST /api/productos/insumos
router.post('/insumos', authenticateToken, adminRoles, productoController.crearInsumo.bind(productoController));

// PUT /api/productos/insumos/:id
router.put('/insumos/:id', authenticateToken, adminRoles, productoController.actualizarInsumo.bind(productoController));

// PATCH /api/productos/insumos/:id/toggle-activo
router.patch('/insumos/:id/toggle-activo', authenticateToken, adminRoles, productoController.toggleActivoInsumo.bind(productoController));


// ============================================================================
// 4. PRODUCTOS / PLATOS / MENÚ DEL DÍA
// ============================================================================
// GET /api/productos
router.get('/', authenticateToken, productoController.getProductos.bind(productoController));

// GET /api/productos/:id
router.get('/:id', authenticateToken, productoController.getProductoById.bind(productoController));

// POST /api/productos (Crear plato en la carta)
router.post('/', authenticateToken, adminRoles, productoController.crearProducto.bind(productoController));

// PUT /api/productos/:id (Actualizar plato)
router.put('/:id', authenticateToken, adminRoles, productoController.actualizarProducto.bind(productoController));

// PATCH /api/productos/:id/toggle-activo (Ocultar/Mostrar plato de la carta)
router.patch('/:id/toggle-activo', authenticateToken, adminRoles, productoController.toggleActivoProducto.bind(productoController));

// PATCH /api/productos/:id/toggle-menu-del-dia (Ocultar/Mostrar en Menú del Día)
router.patch('/:id/toggle-menu-del-dia', authenticateToken, adminRoles, productoController.toggleMenuDelDia.bind(productoController));

// DELETE /api/productos/:id (Eliminar / dar de baja plato)
router.delete('/:id', authenticateToken, adminRoles, productoController.eliminarProducto.bind(productoController));

export default router;
