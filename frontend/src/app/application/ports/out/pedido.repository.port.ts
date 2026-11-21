import { Observable } from 'rxjs';
import { Pedido, CrearPedidoDTO, HistorialVentasResumen, EstadisticasAvanzadas } from '../../../domain/models/pedido.model.js';

export interface PedidoRepositoryPort {
  crearPedido(dto: CrearPedidoDTO): Observable<Pedido>;
  getPedidoPorMesa(mesaId: number): Observable<Pedido | null>;
  marcarBebidaEntregada(detalleId: number): Observable<boolean>;
  solicitarCuenta(mesaId: number): Observable<boolean>;
  agregarItems(pedidoId: number, items: { productoId: number; cantidad: number; modificacion?: string | null }[]): Observable<boolean>;
  getPedidosPendientesPago(sucursalId?: number): Observable<Pedido[]>;
  procesarPago(pedidoId: number, metodo: string, monto: number, referenciaExterna?: string | null): Observable<boolean>;
  cancelarPedido(pedidoId: number, motivo: string, detalleAdicional?: string | null): Observable<{ success: boolean; message: string }>;
  marcarTodoServido(pedidoId: number, servido: boolean): Observable<boolean>;
  getHistorialVentas(sucursalId?: number, fechaInicio?: string, fechaFin?: string, metodoPago?: string, estado?: string): Observable<HistorialVentasResumen>;
  getEstadisticasAvanzadas(sucursalId?: number, fechaInicio?: string, fechaFin?: string): Observable<EstadisticasAvanzadas>;
}

