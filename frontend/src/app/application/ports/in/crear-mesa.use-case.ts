import { Observable } from 'rxjs';
import { MesaRepositoryPort } from '../out/mesa.repository.port.js';
import { Mesa } from '../../../domain/models/mesa.model.js';

export class CrearMesaUseCase {
  constructor(private mesaRepository: MesaRepositoryPort) {}

  execute(mesa: { sucursalId: number; numero: number; capacidad: number; posX?: number | null; posY?: number | null }): Observable<{ success: boolean; message?: string; data: Mesa }> {
    return this.mesaRepository.crearMesa(mesa);
  }
}
