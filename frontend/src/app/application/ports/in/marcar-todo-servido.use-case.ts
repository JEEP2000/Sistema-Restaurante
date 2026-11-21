import { Observable } from 'rxjs';
import { PedidoRepositoryPort } from '../out/pedido.repository.port.js';

export class MarcarTodoServidoUseCase {
  constructor(private pedidoRepo: PedidoRepositoryPort) {}

  execute(pedidoId: number, servido: boolean): Observable<boolean> {
    return this.pedidoRepo.marcarTodoServido(pedidoId, servido);
  }
}
