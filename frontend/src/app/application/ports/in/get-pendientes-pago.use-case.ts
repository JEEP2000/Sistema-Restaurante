import { Observable } from 'rxjs';
import { PedidoRepositoryPort } from '../out/pedido.repository.port.js';
import { Pedido } from '../../../domain/models/pedido.model.js';

export class GetPendientesPagoUseCase {
  constructor(private pedidoRepo: PedidoRepositoryPort) {}

  execute(sucursalId?: number): Observable<Pedido[]> {
    return this.pedidoRepo.getPedidosPendientesPago(sucursalId);
  }
}
