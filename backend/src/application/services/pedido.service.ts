import type { PedidoRepositoryPort } from '../ports/out/pedido-repository.port.js';
import type { PedidoUseCase } from '../ports/in/pedido.use-case.js';

export class PedidoService implements PedidoUseCase {
    constructor(private pedidoRepository: PedidoRepositoryPort) {}

    async getActiveKitchenTickets(sucursalId?: number) {
        return await this.pedidoRepository.getActiveKitchenTickets(sucursalId);
    }

    async iniciarCocina(pedidoId: number, cocineroId?: number, cocineroNombre?: string) {
        return await this.pedidoRepository.iniciarCocina(pedidoId, cocineroId, cocineroNombre);
    }

    async markAsReady(pedidoId: number, cocineroId?: number) {
        return await this.pedidoRepository.markAsReady(pedidoId, cocineroId);
    }

    async toggleItemCocina(detalleId: number, cocineroId?: number, cantidadLista?: number) {
        return await this.pedidoRepository.toggleItemCocina(detalleId, cocineroId, cantidadLista);
    }

    async getDashboardStats(sucursalId?: number) {
        return await this.pedidoRepository.getDashboardStats(sucursalId);
    }

    async crearPedido(dto: any) {
        return await this.pedidoRepository.crearPedido(dto);
    }

    async getPedidoActivoPorMesa(mesaId: number) {
        return await this.pedidoRepository.getPedidoActivoPorMesa(mesaId);
    }

    async marcarBebidaEntregada(detalleId: number) {
        return await this.pedidoRepository.marcarBebidaEntregada(detalleId);
    }

    async solicitarCuenta(mesaId: number) {
        return await this.pedidoRepository.solicitarCuenta(mesaId);
    }

    async agregarItems(pedidoId: number, items: { productoId: number; cantidad: number; modificacion?: string | null }[]) {
        return await this.pedidoRepository.agregarItems(pedidoId, items);
    }

    async getPedidosPendientesPago(sucursalId?: number) {
        return await this.pedidoRepository.getPedidosPendientesPago(sucursalId);
    }

    async procesarPago(dto: any) {
        return await this.pedidoRepository.procesarPago(dto);
    }

    async cancelarPedido(pedidoId: number, usuarioId: number, motivo: string, detalleAdicional?: string | null) {
        return await this.pedidoRepository.cancelarPedido(pedidoId, usuarioId, motivo, detalleAdicional);
    }

    async marcarTodoServido(pedidoId: number, servido: boolean) {
        return await this.pedidoRepository.marcarTodoServido(pedidoId, servido);
    }

    async getHistorialVentas(sucursalId?: number, fechaInicio?: string, fechaFin?: string, metodoPago?: string, estado?: string) {
        return await this.pedidoRepository.getHistorialVentas(sucursalId, fechaInicio, fechaFin, metodoPago, estado);
    }

    async getEstadisticasAvanzadas(sucursalId?: number, fechaInicio?: string, fechaFin?: string) {
        return await this.pedidoRepository.getEstadisticasAvanzadas(sucursalId, fechaInicio, fechaFin);
    }
}


