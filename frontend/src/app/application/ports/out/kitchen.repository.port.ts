import { Observable } from 'rxjs';
import { KitchenTicket } from '../../../domain/models/kitchen.model.js';

export interface KitchenRepositoryPort {
  getActiveTickets(): Observable<KitchenTicket[]>;
  iniciarCocina(pedidoId: number, cocineroId?: number, cocineroNombre?: string): Observable<any>;
  markTicketReady(pedidoId: number, cocineroId?: number): Observable<any>;
  toggleItemReady(detalleId: number, cantidadLista?: number, cocineroId?: number): Observable<{ success: boolean; checkCocina: boolean; cantidadLista: number; cantidad: number; detalleId: number; fechaCheckCocina?: string | null; segundosDemorados?: number | null }>;
}
