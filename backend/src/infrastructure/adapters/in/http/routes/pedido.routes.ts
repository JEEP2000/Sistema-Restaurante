import { Router } from 'express';
import { pedidoController } from '../../../../container.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/pedidos/kitchen-tickets (Protegido, Cocina y Administración)
router.get(
    '/kitchen-tickets', 
    authenticateToken, 
    authorizeRoles('Cocinero', 'Administrador', 'Administrador General', 'Dueño', 'SuperAdmin'), 
    pedidoController.getActiveKitchenTickets.bind(pedidoController)
);

// PATCH /api/pedidos/:id/iniciar-cocina (Iniciar preparación y empezar a contar tiempo con cocinero)
router.patch(
    '/:id/iniciar-cocina',
    authenticateToken,
    authorizeRoles('Cocinero', 'Administrador', 'Administrador General', 'Dueño', 'SuperAdmin'),
    pedidoController.iniciarCocina.bind(pedidoController)
);

// PATCH /api/pedidos/:id/kitchen-ready (Marcar toda la comanda como lista)
router.patch(
    '/:id/kitchen-ready', 
    authenticateToken, 
    authorizeRoles('Cocinero', 'Administrador', 'Administrador General', 'Dueño', 'SuperAdmin'), 
    pedidoController.markAsReady.bind(pedidoController)
);

// PATCH /api/pedidos/detalle/:detalleId/cocina-toggle (Marcar/desmarcar plato individual en cocina)
router.patch(
    '/detalle/:detalleId/cocina-toggle',
    authenticateToken,
    authorizeRoles('Cocinero', 'Administrador', 'Administrador General', 'Dueño', 'SuperAdmin'),
    pedidoController.toggleItemCocina.bind(pedidoController)
);

// GET /api/pedidos/stats (Protegido, solo Administrador y Dueño)
router.get(
    '/stats',
    authenticateToken,
    authorizeRoles('Administrador', 'Dueño'),
    pedidoController.getStats.bind(pedidoController)
);

// POST /api/pedidos (Toma de comanda - Mesero, Administrador, Dueño)
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Mesero', 'Administrador', 'Dueño'),
    pedidoController.crearPedido.bind(pedidoController)
);

// GET /api/pedidos/mesa/:mesaId (Ver comanda activa de mesa)
router.get(
    '/mesa/:mesaId',
    authenticateToken,
    pedidoController.getPedidoPorMesa.bind(pedidoController)
);

// GET /api/pedidos/pendientes-pago (Bandeja de cobro del Cajero)
router.get(
    '/pendientes-pago',
    authenticateToken,
    authorizeRoles('Cajero', 'Administrador', 'Administrador General', 'Dueño'),
    pedidoController.getPedidosPendientesPago.bind(pedidoController)
);

// GET /api/pedidos/historial-ventas (Historial de ventas y reportes de cobro)
router.get(
    '/historial-ventas',
    authenticateToken,
    authorizeRoles('Mesero', 'Cocinero', 'Cajero', 'Administrador', 'Administrador General', 'Dueño', 'SuperAdmin'),
    pedidoController.getHistorialVentas.bind(pedidoController)
);

// GET /api/pedidos/analytics (Estadísticas y gráficos avanzados)
router.get(
    '/analytics',
    authenticateToken,
    authorizeRoles('Administrador', 'Administrador General', 'Dueño', 'SuperAdmin'),
    pedidoController.getEstadisticasAvanzadas.bind(pedidoController)
);

// POST /api/pedidos/:id/pagar (Cajero liquida pago y libera mesa)
router.post(
    '/:id/pagar',
    authenticateToken,
    authorizeRoles('Cajero', 'Administrador', 'Administrador General', 'Dueño'),
    pedidoController.procesarPago.bind(pedidoController)
);

// PATCH /api/pedidos/detalle/:detalleId/bebida-entregada o /servir (Marcar como servido a la mesa)
router.patch(
    '/detalle/:detalleId/bebida-entregada',
    authenticateToken,
    authorizeRoles('Mesero', 'Cajero', 'Administrador', 'Administrador General', 'Dueño'),
    pedidoController.marcarBebidaEntregada.bind(pedidoController)
);
router.patch(
    '/detalle/:detalleId/servir',
    authenticateToken,
    authorizeRoles('Mesero', 'Cajero', 'Administrador', 'Administrador General', 'Dueño'),
    pedidoController.marcarBebidaEntregada.bind(pedidoController)
);

// PATCH /api/pedidos/mesa/:mesaId/solicitar-cuenta (Mesa a EnPago)
router.patch(
    '/mesa/:mesaId/solicitar-cuenta',
    authenticateToken,
    authorizeRoles('Mesero', 'Administrador', 'Administrador General', 'Dueño'),
    pedidoController.solicitarCuenta.bind(pedidoController)
);

// POST /api/pedidos/:id/items (Agregar más ítems a la cuenta)
router.post(
    '/:id/items',
    authenticateToken,
    authorizeRoles('Mesero', 'Administrador', 'Administrador General', 'Dueño'),
    pedidoController.agregarItems.bind(pedidoController)
);

// POST /api/pedidos/:id/cancelar (Anular comanda activa y liberar mesa)
router.post(
    '/:id/cancelar',
    authenticateToken,
    authorizeRoles('Mesero', 'Cajero', 'Administrador', 'Administrador General', 'Dueño', 'SuperAdmin'),
    pedidoController.cancelarPedido.bind(pedidoController)
);

// PATCH /api/pedidos/:id/servir-todo (Marcar toda la comanda como servida a la mesa)
router.patch(
    '/:id/servir-todo',
    authenticateToken,
    authorizeRoles('Mesero', 'Cajero', 'Administrador', 'Administrador General', 'Dueño', 'SuperAdmin'),
    pedidoController.marcarTodoServido.bind(pedidoController)
);

export default router;
