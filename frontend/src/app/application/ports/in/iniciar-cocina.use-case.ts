import { Observable } from 'rxjs';
import { KitchenRepositoryPort } from '../out/kitchen.repository.port.js';

export class IniciarCocinaUseCase {
  constructor(private kitchenRepository: KitchenRepositoryPort) {}

  execute(pedidoId: number, cocineroId?: number, cocineroNombre?: string): Observable<any> {
    return this.kitchenRepository.iniciarCocina(pedidoId, cocineroId, cocineroNombre);
  }
}
