import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SucursalRepositoryPort } from '../../../application/ports/out/sucursal.repository.port.js';
import { Sucursal } from '../../../domain/models/sucursal.model.js';

@Injectable()
export class HttpSucursalRepositoryAdapter implements SucursalRepositoryPort {
  private apiUrl = 'http://localhost:3000/api/sucursales';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Sucursal[]> {
    return this.http.get<{ success: boolean; data: Sucursal[] }>(this.apiUrl).pipe(
      map(res => res.data)
    );
  }

  getById(id: number): Observable<Sucursal> {
    return this.http.get<{ success: boolean; data: Sucursal }>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

  create(sucursal: Omit<Sucursal, 'id'>): Observable<any> {
    return this.http.post<any>(this.apiUrl, sucursal);
  }

  update(id: number, data: Partial<Sucursal>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
