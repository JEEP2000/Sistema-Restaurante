import { Observable } from 'rxjs';
import { KitchenRepositoryPort } from '../out/kitchen.repository.port.js';

export class ToggleItemReadyUseCase {
  constructor(private kitchenRepository: KitchenRepositoryPort) { }

  execute(detalleId: number, cantidadLista?: number, cocineroId?: number): Observable<{ success: boolean; checkCocina: boolean; cantidadLista: number; cantidad: number; detalleId: number; fechaCheckCocina?: string | null; segundosDemorados?: number | null }> {
    return this.kitchenRepository.toggleItemReady(detalleId, cantidadLista, cocineroId);
  }
}

