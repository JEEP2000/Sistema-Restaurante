import { Observable } from 'rxjs';
import { PedidoRepositoryPort } from '../out/pedido.repository.port.js';

export class CancelarPedidoUseCase {
  constructor(private pedidoRepository: PedidoRepositoryPort) {}

  execute(pedidoId: number, motivo: string, detalleAdicional?: string | null): Observable<{ success: boolean; message: string }> {
    return this.pedidoRepository.cancelarPedido(pedidoId, motivo, detalleAdicional);
  }
}
