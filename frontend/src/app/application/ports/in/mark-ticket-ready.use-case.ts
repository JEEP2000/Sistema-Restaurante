import { Observable } from 'rxjs';
import { KitchenRepositoryPort } from '../out/kitchen.repository.port.js';

export class MarkTicketReadyUseCase {
    constructor(private kitchenRepository: KitchenRepositoryPort) { }

    execute(pedidoId: number, cocineroId?: number): Observable<any> {
        return this.kitchenRepository.markTicketReady(pedidoId, cocineroId);
    }
}

