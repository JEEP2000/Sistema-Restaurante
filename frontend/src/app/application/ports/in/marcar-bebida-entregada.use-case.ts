import { Observable } from 'rxjs';
import { PedidoRepositoryPort } from '../out/pedido.repository.port.js';

export class MarcarBebidaEntregadaUseCase {
  constructor(private pedidoRepo: PedidoRepositoryPort) {}

  execute(detalleId: number): Observable<boolean> {
    return this.pedidoRepo.marcarBebidaEntregada(detalleId);
  }
}
