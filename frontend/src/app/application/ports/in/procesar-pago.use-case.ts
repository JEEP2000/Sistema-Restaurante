import { Observable } from 'rxjs';
import { PedidoRepositoryPort } from '../out/pedido.repository.port.js';

export class ProcesarPagoUseCase {
  constructor(private pedidoRepo: PedidoRepositoryPort) {}

  execute(pedidoId: number, metodo: string, monto: number, referenciaExterna?: string | null): Observable<boolean> {
    return this.pedidoRepo.procesarPago(pedidoId, metodo, monto, referenciaExterna);
  }
}
