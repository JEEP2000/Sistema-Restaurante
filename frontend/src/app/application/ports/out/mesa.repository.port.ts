import { Observable } from 'rxjs';
import { Mesa } from '../../../domain/models/mesa.model.js';

export interface MesaRepositoryPort {
  getMesas(sucursalId?: number): Observable<Mesa[]>;
  crearMesa(mesa: { sucursalId: number; numero: number; capacidad: number; posX?: number | null; posY?: number | null }): Observable<{ success: boolean; message?: string; data: Mesa }>;
}
