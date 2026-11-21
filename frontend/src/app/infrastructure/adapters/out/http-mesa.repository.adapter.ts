import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MesaRepositoryPort } from '../../../application/ports/out/mesa.repository.port.js';
import { Mesa } from '../../../domain/models/mesa.model.js';

@Injectable()
export class HttpMesaRepositoryAdapter implements MesaRepositoryPort {
  private apiUrl = 'http://localhost:3000/api/mesas';

  constructor(private http: HttpClient) {}

  getMesas(sucursalId?: number): Observable<Mesa[]> {
    let url = this.apiUrl;
    if (sucursalId) {
      url += `?sucursalId=${sucursalId}`;
    }
    return this.http.get<{ success: boolean; data: Mesa[] }>(url).pipe(
      map(response => response.data)
    );
  }

  crearMesa(mesa: { sucursalId: number; numero: number; capacidad: number; posX?: number | null; posY?: number | null }): Observable<{ success: boolean; message?: string; data: Mesa }> {
    return this.http.post<{ success: boolean; message?: string; data: Mesa }>(this.apiUrl, mesa);
  }
}
