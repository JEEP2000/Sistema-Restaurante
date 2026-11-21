import type { Request, Response } from 'express';
import type { PedidoUseCase } from '../../../../../application/ports/in/pedido.use-case.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

export class PedidoController {
    constructor(private pedidoService: PedidoUseCase) {}

    async getActiveKitchenTickets(req: AuthRequest, res: Response): Promise<void> {
        try {
            const isSuper = req.user?.rolNombre === 'Dueño' || req.user?.rolNombre === 'SuperAdmin';
            const sucursalId = isSuper
                ? (req.query['sucursalId'] ? Number(req.query['sucursalId']) : undefined)
                : req.user?.sucursalId;

            const tickets = await this.pedidoService.getActiveKitchenTickets(sucursalId);
            res.json({
                success: true,
                data: tickets
            });
        } catch (error) {
            console.error('Error en PedidoController.getActiveKitchenTickets:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener las comandas de cocina'
            });
        }
    }

    async iniciarCocina(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, message: 'ID del pedido es requerido' });
                return;
            }
            const { cocineroId, cocineroNombre } = req.body;
            const finalCocineroId = cocineroId || req.user?.id;
            const finalCocineroNombre = cocineroNombre || req.user?.nombre;

            await this.pedidoService.iniciarCocina(Number(id), finalCocineroId, finalCocineroNombre);
            res.json({
                success: true,
                message: 'Preparación iniciada exitosamente en cocina',
                fechaInicioCocina: new Date().toISOString(),
                cocineroNombre: finalCocineroNombre
            });
        } catch (error) {
            console.error('Error en PedidoController.iniciarCocina:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno al iniciar preparación'
            });
        }
    }

    async markAsReady(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, message: 'ID del pedido es requerido' });
                return;
            }
            const cocineroId = req.user?.id;
            const success = await this.pedidoService.markAsReady(Number(id), cocineroId);
            if (success) {
                res.json({ success: true, message: 'Pedido marcado como listo' });
            } else {
                res.status(404).json({ success: false, message: 'No se encontraron platos en este pedido' });
            }
        } catch (error) {
            console.error('Error en PedidoController.markAsReady:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno al procesar el pedido'
            });
        }
    }

    async toggleItemCocina(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { detalleId } = req.params;
            if (!detalleId) {
                res.status(400).json({ success: false, message: 'ID del detalle es requerido' });
                return;
            }
            const { cantidadLista } = req.body || {};
            const cocineroId = req.user?.id;
            const targetCantidad = cantidadLista !== undefined && cantidadLista !== null ? Number(cantidadLista) : undefined;
            const result = await this.pedidoService.toggleItemCocina(Number(detalleId), cocineroId, targetCantidad);
            if (result.success) {
                res.json({
                    success: true,
                    checkCocina: result.checkCocina,
                    cantidadLista: result.cantidadLista,
                    cantidad: result.cantidad,
                    detalleId: result.detalleId,
                    fechaCheckCocina: result.fechaCheckCocina,
                    segundosDemorados: result.segundosDemorados,
                    message: result.checkCocina 
                        ? 'Plato(s) marcado(s) como preparado(s)' 
                        : `Progreso: ${result.cantidadLista} de ${result.cantidad} listos`
                });
            } else {
                res.status(404).json({ success: false, message: 'No se encontró el ítem especificado' });
            }
        } catch (error) {
            console.error('Error en PedidoController.toggleItemCocina:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno al cambiar estado del plato'
            });
        }
    }

    async getStats(req: AuthRequest, res: Response): Promise<void> {
        try {
            const isSuper = req.user?.rolNombre === 'Dueño' || req.user?.rolNombre === 'SuperAdmin';
            const sucursalId = isSuper
                ? (req.query.sucursalId ? Number(req.query.sucursalId) : undefined)
                : req.user?.sucursalId;

            const stats = await this.pedidoService.getDashboardStats(sucursalId);
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error en PedidoController.getStats:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno al obtener estadísticas'
            });
        }
    }

    async crearPedido(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { mesaId, clienteNombre, items } = req.body;
            if (!mesaId || !clienteNombre || !items || !items.length) {
                res.status(400).json({
                    success: false,
                    message: 'Mesa, nombre de cliente y al menos un ítem son obligatorios'
                });
                return;
            }

            const sucursalId = req.user?.sucursalId || 1;
            const usuarioMeseroId = req.user?.id || 1;

            const pedido = await this.pedidoService.crearPedido({
                sucursalId,
                mesaId: Number(mesaId),
                usuarioMeseroId,
                clienteNombre: clienteNombre.trim(),
                items
            });

            res.status(201).json({
                success: true,
                message: 'Pedido enviado exitosamente',
                data: pedido
            });
        } catch (error: any) {
            console.error('Error en PedidoController.crearPedido:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error interno al crear el pedido'
            });
        }
    }

    async getPedidoPorMesa(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { mesaId } = req.params;
            if (!mesaId) {
                res.status(400).json({ success: false, message: 'ID de la mesa es requerido' });
                return;
            }

            const pedido = await this.pedidoService.getPedidoActivoPorMesa(Number(mesaId));
            res.json({
                success: true,
                data: pedido
            });
        } catch (error) {
            console.error('Error en PedidoController.getPedidoPorMesa:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la comanda de la mesa'
            });
        }
    }

    async marcarBebidaEntregada(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { detalleId } = req.params;
            if (!detalleId) {
                res.status(400).json({ success: false, message: 'ID del detalle es requerido' });
                return;
            }

            const success = await this.pedidoService.marcarBebidaEntregada(Number(detalleId));
            res.json({
                success,
                message: success ? 'Bebida marcada como entregada' : 'No se pudo actualizar el estado de la bebida'
            });
        } catch (error) {
            console.error('Error en PedidoController.marcarBebidaEntregada:', error);
            res.status(500).json({
                success: false,
                message: 'Error al marcar bebida como entregada'
            });
        }
    }

    async solicitarCuenta(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { mesaId } = req.params;
            if (!mesaId) {
                res.status(400).json({ success: false, message: 'ID de la mesa es requerido' });
                return;
            }

            await this.pedidoService.solicitarCuenta(Number(mesaId));
            res.json({
                success: true,
                message: 'Mesa pasada a estado En Pago para cobro en caja'
            });
        } catch (error) {
            console.error('Error en PedidoController.solicitarCuenta:', error);
            res.status(500).json({
                success: false,
                message: 'Error al solicitar la cuenta de la mesa'
            });
        }
    }

    async agregarItems(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { items } = req.body;
            if (!id || !items || !items.length) {
                res.status(400).json({ success: false, message: 'ID de pedido e ítems requeridos' });
                return;
            }

            await this.pedidoService.agregarItems(Number(id), items);
            res.json({
                success: true,
                message: 'Nuevos ítems agregados a la comanda'
            });
        } catch (error: any) {
            console.error('Error en PedidoController.agregarItems:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Error al agregar ítems al pedido'
            });
        }
    }

    async getPedidosPendientesPago(req: AuthRequest, res: Response): Promise<void> {
        try {
            const sucursalId = req.query.sucursalId ? Number(req.query.sucursalId) : req.user?.sucursalId;
            const pedidos = await this.pedidoService.getPedidosPendientesPago(sucursalId);
            res.json({
                success: true,
                data: pedidos
            });
        } catch (error: any) {
            console.error('Error en PedidoController.getPedidosPendientesPago:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Error al obtener pedidos pendientes de pago'
            });
        }
    }

    async procesarPago(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { metodo, monto, referenciaExterna } = req.body;

            if (id === undefined || id === null || id === '' || !metodo || monto === undefined) {
                res.status(400).json({ success: false, message: 'Datos incompletos para procesar el pago' });
                return;
            }

            await this.pedidoService.procesarPago({
                pedidoId: Number(id),
                metodo,
                monto: Number(monto),
                referenciaExterna: referenciaExterna || null
            });

            res.json({
                success: true,
                message: 'Pago procesado exitosamente y mesa liberada'
            });
        } catch (error: any) {
            console.error('Error en PedidoController.procesarPago:', error);
            res.status(400).json({
                success: false,
                message: error?.message || 'Error al procesar el pago'
            });
        }
    }

    async cancelarPedido(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { motivo, detalleAdicional } = req.body;

            if (id === undefined || id === null || id === '') {
                res.status(400).json({ success: false, message: 'ID del pedido es requerido' });
                return;
            }

            const usuarioId = req.user?.id;
            if (!usuarioId) {
                res.status(401).json({ success: false, message: 'Usuario no autenticado' });
                return;
            }

            const motivoFinal = (motivo && String(motivo).trim()) || 'Cliente canceló / se retiró';

            const success = await this.pedidoService.cancelarPedido(
                Number(id),
                usuarioId,
                motivoFinal,
                detalleAdicional ? String(detalleAdicional).trim() : null
            );

            if (success) {
                res.json({
                    success: true,
                    message: 'Comanda anulada exitosamente y mesa liberada'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'El pedido no existe o ya se encontraba pagado o anulado'
                });
            }
        } catch (error: any) {
            console.error('Error en PedidoController.cancelarPedido:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Error interno al anular la comanda'
            });
        }
    }

    async marcarTodoServido(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { servido } = req.body;
            if (!id) {
                res.status(400).json({ success: false, message: 'ID del pedido es requerido' });
                return;
            }

            const isServido = servido !== undefined ? Boolean(servido) : true;
            const success = await this.pedidoService.marcarTodoServido(Number(id), isServido);
            res.json({
                success,
                message: isServido ? 'Toda la comanda ha sido marcada como servida a la mesa' : 'Comanda desmarcada como servida'
            });
        } catch (error: any) {
            console.error('Error en PedidoController.marcarTodoServido:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error al actualizar estado de entrega de la comanda'
            });
        }
    }

    async getHistorialVentas(req: AuthRequest, res: Response): Promise<void> {
        try {
            const sucursalId = req.query.sucursalId ? Number(req.query.sucursalId) : undefined;
            const fechaInicio = req.query.fechaInicio ? String(req.query.fechaInicio) : undefined;
            const fechaFin = req.query.fechaFin ? String(req.query.fechaFin) : undefined;
            const metodoPago = req.query.metodoPago ? String(req.query.metodoPago) : undefined;
            const estado = req.query.estado ? String(req.query.estado) : undefined;

            const data = await this.pedidoService.getHistorialVentas(sucursalId, fechaInicio, fechaFin, metodoPago, estado);
            res.json({
                success: true,
                data
            });
        } catch (error: any) {
            console.error('Error en PedidoController.getHistorialVentas:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener el historial de ventas'
            });
        }
    }

    async getEstadisticasAvanzadas(req: AuthRequest, res: Response): Promise<void> {
        try {
            const sucursalId = req.query.sucursalId ? Number(req.query.sucursalId) : undefined;
            const fechaInicio = req.query.fechaInicio ? String(req.query.fechaInicio) : undefined;
            const fechaFin = req.query.fechaFin ? String(req.query.fechaFin) : undefined;

            const data = await this.pedidoService.getEstadisticasAvanzadas(sucursalId, fechaInicio, fechaFin);
            res.json({
                success: true,
                data
            });
        } catch (error: any) {
            console.error('Error en PedidoController.getEstadisticasAvanzadas:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener estadísticas analíticas'
            });
        }
    }
}

