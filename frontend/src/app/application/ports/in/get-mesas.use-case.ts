import { Observable } from 'rxjs';
import { MesaRepositoryPort } from '../out/mesa.repository.port.js';
import { Mesa } from '../../../domain/models/mesa.model.js';

export class GetMesasUseCase {
  constructor(private mesaRepository: MesaRepositoryPort) {}

  execute(sucursalId?: number): Observable<Mesa[]> {
    return this.mesaRepository.getMesas(sucursalId);
  }
}
