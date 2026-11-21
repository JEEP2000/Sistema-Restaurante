import { Observable } from 'rxjs';
import { KitchenRepositoryPort } from '../out/kitchen.repository.port.js';
import { KitchenTicket } from '../../../domain/models/kitchen.model.js';

export class GetActiveTicketsUseCase {
  constructor(private kitchenRepository: KitchenRepositoryPort) {}

  execute(): Observable<KitchenTicket[]> {
    return this.kitchenRepository.getActiveTickets();
  }
}
