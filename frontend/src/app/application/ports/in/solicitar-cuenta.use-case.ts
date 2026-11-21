import { Observable } from 'rxjs';
import { PedidoRepositoryPort } from '../out/pedido.repository.port.js';

export class SolicitarCuentaUseCase {
  constructor(private pedidoRepo: PedidoRepositoryPort) {}

  execute(mesaId: number): Observable<boolean> {
    return this.pedidoRepo.solicitarCuenta(mesaId);
  }
}
