import { Observable } from 'rxjs';
import { Sucursal } from '../../../domain/models/sucursal.model.js';

export interface SucursalRepositoryPort {
  getAll(): Observable<Sucursal[]>;
  getById(id: number): Observable<Sucursal>;
  create(sucursal: Omit<Sucursal, 'id'>): Observable<any>;
  update(id: number, data: Partial<Sucursal>): Observable<any>;
  delete(id: number): Observable<any>;
}
