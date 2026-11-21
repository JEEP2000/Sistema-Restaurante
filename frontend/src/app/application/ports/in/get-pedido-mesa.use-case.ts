import { Observable } from 'rxjs';
import { PedidoRepositoryPort } from '../out/pedido.repository.port.js';
import { Pedido } from '../../../domain/models/pedido.model.js';

export class GetPedidoMesaUseCase {
  constructor(private pedidoRepo: PedidoRepositoryPort) {}

  execute(mesaId: number): Observable<Pedido | null> {
    return this.pedidoRepo.getPedidoPorMesa(mesaId);
  }
}
