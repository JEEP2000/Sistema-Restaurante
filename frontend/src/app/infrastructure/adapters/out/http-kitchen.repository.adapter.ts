import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { KitchenRepositoryPort } from '../../../application/ports/out/kitchen.repository.port.js';
import { KitchenTicket } from '../../../domain/models/kitchen.model.js';

@Injectable()
export class HttpKitchenRepositoryAdapter implements KitchenRepositoryPort {
  private apiUrl = 'http://localhost:3000/api/pedidos/kitchen-tickets';

  constructor(private http: HttpClient) { }

  getActiveTickets(): Observable<KitchenTicket[]> {
    return this.http.get<{ success: boolean; data: KitchenTicket[] }>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  iniciarCocina(pedidoId: number, cocineroId?: number, cocineroNombre?: string): Observable<any> {
    return this.http.patch<{ success: boolean; message: string }>(
      `http://localhost:3000/api/pedidos/${pedidoId}/iniciar-cocina`,
      { cocineroId, cocineroNombre }
    );
  }

  markTicketReady(pedidoId: number, cocineroId?: number): Observable<any> {
    return this.http.patch<{ success: boolean; message: string }>(
      `http://localhost:3000/api/pedidos/${pedidoId}/kitchen-ready`,
      cocineroId ? { cocineroId } : {}
    );
  }

  toggleItemReady(detalleId: number, cantidadLista?: number, cocineroId?: number): Observable<{ success: boolean; checkCocina: boolean; cantidadLista: number; cantidad: number; detalleId: number; fechaCheckCocina?: string | null; segundosDemorados?: number | null }> {
    const body: any = {};
    if (cantidadLista !== undefined) body.cantidadLista = cantidadLista;
    if (cocineroId !== undefined) body.cocineroId = cocineroId;
    return this.http.patch<{ success: boolean; checkCocina: boolean; cantidadLista: number; cantidad: number; detalleId: number; fechaCheckCocina?: string | null; segundosDemorados?: number | null }>(
      `http://localhost:3000/api/pedidos/detalle/${detalleId}/cocina-toggle`,
      body
    );
  }
}
