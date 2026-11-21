import { Observable } from 'rxjs';
import { PedidoRepositoryPort } from '../out/pedido.repository.port.js';
import { EstadisticasAvanzadas } from '../../../domain/models/pedido.model.js';

export class GetEstadisticasAvanzadasUseCase {
  constructor(private pedidoRepo: PedidoRepositoryPort) {}

  execute(sucursalId?: number, fechaInicio?: string, fechaFin?: string): Observable<EstadisticasAvanzadas> {
    return this.pedidoRepo.getEstadisticasAvanzadas(sucursalId, fechaInicio, fechaFin);
  }
}
