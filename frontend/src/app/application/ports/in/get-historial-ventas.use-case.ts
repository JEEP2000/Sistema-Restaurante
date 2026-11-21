import { Observable } from 'rxjs';
import { PedidoRepositoryPort } from '../out/pedido.repository.port.js';
import { HistorialVentasResumen } from '../../../domain/models/pedido.model.js';

export class GetHistorialVentasUseCase {
  constructor(private pedidoRepo: PedidoRepositoryPort) {}

  execute(sucursalId?: number, fechaInicio?: string, fechaFin?: string, metodoPago?: string, estado?: string): Observable<HistorialVentasResumen> {
    return this.pedidoRepo.getHistorialVentas(sucursalId, fechaInicio, fechaFin, metodoPago, estado);
  }
}
