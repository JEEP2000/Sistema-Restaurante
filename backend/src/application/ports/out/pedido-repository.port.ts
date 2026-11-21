import type { KitchenTicket, DashboardStats, Pedido, CrearPedidoDTO, ProcesarPagoDTO, HistorialVentasResumen, EstadisticasAvanzadas } from '../../../domain/models/pedido.model.js';

export interface PedidoRepositoryPort {
    getActiveKitchenTickets(sucursalId?: number): Promise<KitchenTicket[]>;
    iniciarCocina(pedidoId: number, cocineroId?: number, cocineroNombre?: string): Promise<boolean>;
    markAsReady(pedidoId: number, cocineroId?: number): Promise<boolean>;
    toggleItemCocina(detalleId: number, cocineroId?: number, cantidadLista?: number): Promise<{ success: boolean; checkCocina: boolean; cantidadLista: number; cantidad: number; detalleId: number; fechaCheckCocina?: string | null; segundosDemorados?: number | null }>;
    getDashboardStats(sucursalId?: number): Promise<DashboardStats>;
    crearPedido(dto: CrearPedidoDTO): Promise<Pedido>;
    getPedidoActivoPorMesa(mesaId: number): Promise<Pedido | null>;
    marcarBebidaEntregada(detalleId: number): Promise<boolean>;
    solicitarCuenta(mesaId: number): Promise<boolean>;
    agregarItems(pedidoId: number, items: { productoId: number; cantidad: number; modificacion?: string | null }[]): Promise<boolean>;
    getPedidosPendientesPago(sucursalId?: number): Promise<Pedido[]>;
    procesarPago(dto: ProcesarPagoDTO): Promise<boolean>;
    cancelarPedido(pedidoId: number, usuarioId: number, motivo: string, detalleAdicional?: string | null): Promise<boolean>;
    marcarTodoServido(pedidoId: number, servido: boolean): Promise<boolean>;
    getHistorialVentas(sucursalId?: number, fechaInicio?: string, fechaFin?: string, metodoPago?: string, estado?: string): Promise<HistorialVentasResumen>;
    getEstadisticasAvanzadas(sucursalId?: number, fechaInicio?: string, fechaFin?: string): Promise<EstadisticasAvanzadas>;
}

