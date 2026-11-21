import { Observable } from 'rxjs';
import { PedidoRepositoryPort } from '../out/pedido.repository.port.js';
import { Pedido, CrearPedidoDTO } from '../../../domain/models/pedido.model.js';

export class CrearPedidoUseCase {
  constructor(private pedidoRepo: PedidoRepositoryPort) {}

  execute(dto: CrearPedidoDTO): Observable<Pedido> {
    return this.pedidoRepo.crearPedido(dto);
  }
}
