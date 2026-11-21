import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PedidoRepositoryPort } from '../../../application/ports/out/pedido.repository.port.js';
import { Pedido, CrearPedidoDTO, HistorialVentasResumen, EstadisticasAvanzadas } from '../../../domain/models/pedido.model.js';

@Injectable()
export class HttpPedidoRepositoryAdapter implements PedidoRepositoryPort {
  private apiUrl = 'http://localhost:3000/api/pedidos';

  constructor(private http: HttpClient) {}

  crearPedido(dto: CrearPedidoDTO): Observable<Pedido> {
    return this.http.post<{ success: boolean; data: Pedido }>(this.apiUrl, dto).pipe(
      map(res => res.data)
    );
  }

  getPedidoPorMesa(mesaId: number): Observable<Pedido | null> {
    return this.http.get<{ success: boolean; data: Pedido | null }>(`${this.apiUrl}/mesa/${mesaId}`).pipe(
      map(res => res.data)
    );
  }

  marcarBebidaEntregada(detalleId: number): Observable<boolean> {
    return this.http.patch<{ success: boolean }>(`${this.apiUrl}/detalle/${detalleId}/bebida-entregada`, {}).pipe(
      map(res => res.success)
    );
  }

  solicitarCuenta(mesaId: number): Observable<boolean> {
    return this.http.patch<{ success: boolean }>(`${this.apiUrl}/mesa/${mesaId}/solicitar-cuenta`, {}).pipe(
      map(res => res.success)
    );
  }

  agregarItems(pedidoId: number, items: { productoId: number; cantidad: number; modificacion?: string | null }[]): Observable<boolean> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/${pedidoId}/items`, { items }).pipe(
      map(res => res.success)
    );
  }

  getPedidosPendientesPago(sucursalId?: number): Observable<Pedido[]> {
    const url = sucursalId ? `${this.apiUrl}/pendientes-pago?sucursalId=${sucursalId}` : `${this.apiUrl}/pendientes-pago`;
    return this.http.get<{ success: boolean; data: Pedido[] }>(url).pipe(
      map(res => res.data || [])
    );
  }

  procesarPago(pedidoId: number, metodo: string, monto: number, referenciaExterna?: string | null): Observable<boolean> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/${pedidoId}/pagar`, {
      metodo,
      monto,
      referenciaExterna
    }).pipe(
      map(res => res.success)
    );
  }

  cancelarPedido(pedidoId: number, motivo: string, detalleAdicional?: string | null): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${pedidoId}/cancelar`, {
      motivo,
      detalleAdicional
    });
  }

  marcarTodoServido(pedidoId: number, servido: boolean): Observable<boolean> {
    return this.http.patch<{ success: boolean }>(`${this.apiUrl}/${pedidoId}/servir-todo`, { servido }).pipe(
      map(res => res.success)
    );
  }

  getHistorialVentas(sucursalId?: number, fechaInicio?: string, fechaFin?: string, metodoPago?: string, estado?: string): Observable<HistorialVentasResumen> {
    let params: any = {};
    if (sucursalId !== undefined && !isNaN(sucursalId)) params.sucursalId = sucursalId.toString();
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    if (metodoPago && metodoPago !== 'TODOS') params.metodoPago = metodoPago;
    if (estado && estado !== 'TODOS') params.estado = estado;

    return this.http.get<{ success: boolean; data: HistorialVentasResumen }>(`${this.apiUrl}/historial-ventas`, { params }).pipe(
      map(res => res.data)
    );
  }

  getEstadisticasAvanzadas(sucursalId?: number, fechaInicio?: string, fechaFin?: string): Observable<EstadisticasAvanzadas> {
    let params: any = {};
    if (sucursalId !== undefined && !isNaN(sucursalId)) params.sucursalId = sucursalId.toString();
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;

    return this.http.get<{ success: boolean; data: EstadisticasAvanzadas }>(`${this.apiUrl}/analytics`, { params }).pipe(
      map(res => res.data)
    );
  }
}
