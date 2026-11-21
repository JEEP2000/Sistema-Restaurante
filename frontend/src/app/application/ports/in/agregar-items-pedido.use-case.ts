import { Observable } from 'rxjs';
import { PedidoRepositoryPort } from '../out/pedido.repository.port.js';

export class AgregarItemsPedidoUseCase {
  constructor(private pedidoRepo: PedidoRepositoryPort) {}

  execute(pedidoId: number, items: { productoId: number; cantidad: number; modificacion?: string | null }[]): Observable<boolean> {
    return this.pedidoRepo.agregarItems(pedidoId, items);
  }
}
